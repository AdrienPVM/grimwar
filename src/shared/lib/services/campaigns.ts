/**
 * Service Firestore pour `campaigns/{cid}` — couche d'écriture côté MJ et
 * joueur (création, lecture, jointure par code, leave, promotion co-MJ).
 *
 * JALON 4.0.3 — refactor complet du service après l'adaptation minimale 4.0.2.
 * Toutes les écritures côté campagne passent par ce module ; les lectures par
 * snapshot temps-réel sont câblées dans les hooks consommateurs (4.0.4+).
 *
 * Pattern :
 *   - Écriture multi-doc atomique = `writeBatch` (createCampaign, leaveCampaign
 *     dernier-MJ-non-touché, promoteToGm).
 *   - Écriture single-doc = `setDoc` / `updateDoc` / `deleteDoc` direct.
 *   - Toutes les écritures user-initiated sont wrappées par `trackPendingWrite`
 *     pour la bannière OfflineBanner (JALON 1D.3).
 *   - Pas de validation Zod côté service : la responsabilité est aux appelants
 *     (composants UI 4.0.4+ typés strict). Les rules Firestore + les tests
 *     `tests/firestore-rules.test.ts` font le 2ᵉ niveau de défense.
 *
 * Rules consommées (cf. `firestore.rules` après 4.0.2) :
 *   - `campaigns/{cid}` create : `auth.uid in gmIds && createdBy == auth.uid`.
 *   - `campaigns/{cid}` update : `isDMOf && gmIds.size() >= 1 && createdBy ==`.
 *   - `campaigns/{cid}/members/{uid}` create : self (uid == userId) OU isDMOf.
 *   - `inviteCodes/{code}` create : `code == doc ID && createdBy == auth.uid &&`
 *     `isDMOf(campaignId)`.
 */
import { FirebaseError } from 'firebase/app';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { getDb } from '@/shared/lib/firebase';
import { trackPendingWrite } from '@/shared/lib/track-pending-write';
import {
  DEFAULT_CAMPAIGN_SETTINGS,
  type Campaign,
  type CampaignSettings,
  type CampaignVariants,
  type Membership,
} from '@/shared/types/campaign';

/**
 * Patch d'entrée pour les settings campagne — `variants` est lui-même partiel
 * pour qu'un consommateur puisse n'overrider qu'un seul toggle sans avoir à
 * répéter les 4 défauts (cf. `createCampaign({ settings: { variants:
 * { flanking: true } } })`). Le merge se fait dans le service via spread.
 */
export type CampaignSettingsPatch = Partial<Omit<CampaignSettings, 'variants'>> & {
  variants?: Partial<CampaignVariants>;
};

// ─────────────────────────────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────────────────────────────

/**
 * Génère un code 6 caractères depuis l'alphabet anti-confusion
 * `[A-Z2-9] \ {I, O}` (cf. `INVITE_CODE_REGEX` dans types/campaign.ts).
 * Préfère `crypto.getRandomValues` pour la sécurité, fallback `Math.random`
 * pour les environnements de test qui n'exposeraient pas crypto (jsdom OK
 * en pratique).
 */
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateInviteCode(): string {
  const len = 6;
  const out: string[] = [];
  const cryptoApi =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { crypto?: Crypto }).crypto?.getRandomValues === 'function'
      ? (globalThis as { crypto: Crypto }).crypto
      : null;
  if (cryptoApi) {
    const buf = new Uint8Array(len);
    cryptoApi.getRandomValues(buf);
    for (let i = 0; i < len; i++) {
      out.push(INVITE_CODE_ALPHABET[buf[i]! % INVITE_CODE_ALPHABET.length]!);
    }
  } else {
    for (let i = 0; i < len; i++) {
      const idx = Math.floor(Math.random() * INVITE_CODE_ALPHABET.length);
      out.push(INVITE_CODE_ALPHABET[idx]!);
    }
  }
  return out.join('');
}

/**
 * Erreurs typées remontées par le service. Le code `kind` permet à l'UI de
 * brancher des messages i18n explicites (cf. 4.0.5 invite/join screens).
 */
export class CampaignServiceError extends Error {
  readonly kind:
    | 'invite-code-collision-exhausted'
    | 'invite-code-not-found'
    | 'campaign-not-found'
    | 'last-gm-cannot-leave';
  constructor(
    kind:
      | 'invite-code-collision-exhausted'
      | 'invite-code-not-found'
      | 'campaign-not-found'
      | 'last-gm-cannot-leave',
    message: string,
  ) {
    super(message);
    this.name = 'CampaignServiceError';
    this.kind = kind;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Public API — createCampaign
// ─────────────────────────────────────────────────────────────────────

export interface CreateCampaignInput {
  name: string;
  description?: string;
  settings?: CampaignSettingsPatch;
}

export interface CreateCampaignResult {
  campaignId: string;
  inviteCode: string;
}

/**
 * Crée une nouvelle campagne dont l'utilisateur courant devient l'unique MJ.
 *
 * Atomicité : 2 docs écrits dans un même `writeBatch` (campaign + inviteCodes
 * lookup). L'inviteCode est généré côté client puis testé en lecture jusqu'à
 * MAX_TRIES essais — la course condition est infinitésimale (32^6 ≈ 1 milliard
 * de codes) mais le retry évite le hard-fail. Au-delà du seuil, on lève
 * `CampaignServiceError('invite-code-collision-exhausted')`.
 *
 * Le doc campaign reçoit un `id` aléatoire (campagne créée via addDoc-like).
 * Le doc inviteCodes utilise `code` comme ID pour permettre le lookup direct.
 *
 * NB : on ne pose PAS de doc `members/{uid}` pour le MJ. Sa membership est
 * sous-entendue par `gmIds[uid]` — `isDMOf` côté rules suffit. Cf. décision
 * JALON-4.0 et fix 4.0.2.
 */
const MAX_INVITE_CODE_TRIES = 5;

export async function createCampaign(
  input: CreateCampaignInput,
  uid: string,
): Promise<CreateCampaignResult> {
  const firestore = getDb();

  // Génère un campaignId aléatoire (style Firestore auto-ID). On ne réutilise
  // pas `doc(collection(...))` parce qu'on a besoin de l'ID avant le batch
  // pour le mettre dans le payload (`id` est dénormalisé sur le doc).
  const campaignRef = doc(collection(firestore, 'campaigns'));
  const campaignId = campaignRef.id;

  // Génère un inviteCode en retry-loop (collision improbable mais possible).
  let inviteCode = '';
  let lastErr: unknown = null;
  for (let tries = 0; tries < MAX_INVITE_CODE_TRIES; tries++) {
    const candidate = generateInviteCode();
    const codeRef = doc(firestore, 'inviteCodes', candidate);
    try {
      const snap = await getDoc(codeRef);
      if (snap.exists()) continue;
    } catch (err: unknown) {
      // permission-denied sur un get inviteCodes/{code} ne peut pas se
      // produire en pratique (les rules autorisent read à tout signed-in),
      // mais on garde le filet au cas où.
      lastErr = err;
      if (!(err instanceof FirebaseError) || err.code !== 'permission-denied') {
        throw err;
      }
    }
    inviteCode = candidate;
    break;
  }
  if (!inviteCode) {
    throw new CampaignServiceError(
      'invite-code-collision-exhausted',
      `Failed to find a free invite code after ${MAX_INVITE_CODE_TRIES} tries (${
        lastErr instanceof Error ? lastErr.message : 'no specific error'
      })`,
    );
  }

  // Construit le payload campagne. settings hérite des défauts ; les overrides
  // user ne touchent que les champs explicitement passés.
  const settings: CampaignSettings = {
    ...DEFAULT_CAMPAIGN_SETTINGS,
    ...input.settings,
    variants: {
      ...DEFAULT_CAMPAIGN_SETTINGS.variants,
      ...(input.settings?.variants ?? {}),
    },
  };

  const campaignPayload: Omit<Campaign, 'createdAt' | 'updatedAt'> & {
    createdAt: unknown;
    updatedAt: unknown;
  } = {
    id: campaignId,
    name: input.name,
    description: input.description ?? '',
    gmIds: [uid],
    createdBy: uid,
    inviteCode,
    settings,
    status: 'active',
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Atomicité campaign + inviteCodes lookup. Si l'un fail (rules), le batch
  // entier est rejeté → pas de doc orphelin.
  const batch = writeBatch(firestore);
  batch.set(campaignRef, campaignPayload);
  batch.set(doc(firestore, 'inviteCodes', inviteCode), {
    code: inviteCode,
    campaignId,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });

  await trackPendingWrite(firestore, batch.commit());

  return { campaignId, inviteCode };
}

// ─────────────────────────────────────────────────────────────────────
// Public API — listMyCampaigns
// ─────────────────────────────────────────────────────────────────────

/**
 * Liste toutes les campagnes auxquelles l'utilisateur participe — en tant que
 * MJ (gmIds array-contains) OU en tant que membre joueur (members collection
 * group, userId == uid).
 *
 * Stratégie 2-queries puis merge :
 *   Q1 : `campaigns where gmIds array-contains uid orderBy updatedAt desc`
 *   Q2 : `collectionGroup('members') where userId == uid orderBy joinedAt desc`
 *        → pour chaque doc retourné, lit le parent campaign
 *
 * La déduplication par `campaignId` traite le cas marginal où un user serait
 * à la fois dans gmIds ET dans members (un doc member orphelin laissé après
 * promotion en co-MJ — improbable mais permis par les rules). Priorité
 * arbitraire : Q1 gagne (MJ écrase joueur).
 *
 * Retour trié `updatedAt desc` — la fusion garantit l'ordre stable en
 * faisant une seconde passe locale par updatedAt (le serverTimestamp est
 * un objet Timestamp côté lecture).
 *
 * Index requis : `campaigns.gmIds(CONTAINS) + updatedAt(DESC)` (déclaré 4.0.2)
 * + `members(COLLECTION_GROUP).userId(ASC) + joinedAt(DESC)` (4.0.2).
 */
export async function listMyCampaigns(uid: string): Promise<Campaign[]> {
  const firestore = getDb();

  // Q1 — campagnes où je suis MJ.
  const gmQuery = query(
    collection(firestore, 'campaigns'),
    where('gmIds', 'array-contains', uid),
    orderBy('updatedAt', 'desc'),
  );
  const gmSnap = await getDocs(gmQuery);

  // Q2 — campagnes où je suis membre joueur. La query renvoie des docs
  // `members` ; il faut remonter au parent campaign pour récupérer le
  // payload typed.
  const memberQuery = query(
    collectionGroup(firestore, 'members'),
    where('userId', '==', uid),
    orderBy('joinedAt', 'desc'),
  );
  const memberSnap = await getDocs(memberQuery);

  // Map<campaignId, Campaign> pour dédupe.
  const byId = new Map<string, Campaign>();

  for (const docSnap of gmSnap.docs) {
    const data = docSnap.data() as Campaign;
    byId.set(docSnap.id, data);
  }

  // Pour chaque member doc, fetch le parent campaign s'il n'est pas déjà connu.
  await Promise.all(
    memberSnap.docs.map(async (memberDoc: QueryDocumentSnapshot) => {
      const campaignRef = memberDoc.ref.parent.parent;
      if (!campaignRef || byId.has(campaignRef.id)) return;
      const snap = await getDoc(campaignRef);
      if (snap.exists()) {
        byId.set(campaignRef.id, snap.data() as Campaign);
      }
    }),
  );

  // Tri local par updatedAt desc — Timestamp.seconds est numérique stable.
  return Array.from(byId.values()).sort((a, b) => {
    const aTs = (a.updatedAt as { seconds?: number } | undefined)?.seconds ?? 0;
    const bTs = (b.updatedAt as { seconds?: number } | undefined)?.seconds ?? 0;
    return bTs - aTs;
  });
}

// ─────────────────────────────────────────────────────────────────────
// Public API — getCampaign / listCampaignMembers (JALON 4.0.5)
// ─────────────────────────────────────────────────────────────────────

/**
 * Lit le doc `campaigns/{cid}` et renvoie le payload typé. Lève
 * `CampaignServiceError('campaign-not-found')` si le doc n'existe pas — la
 * rule `campaigns/{cid}/read` filtre déjà les non-membres en `permission-
 * denied`, qui propage tel quel (le hook de l'écran 4.0.5 affichera une vue
 * « accès interdit »).
 *
 * Utilisé par `useCampaign(cid)` pour l'écran de détail (route
 * `/campaigns/:cid`) — l'écran peut être ouvert par lien direct, donc on ne
 * peut pas supposer que le campaign est déjà en cache mémoire.
 */
export async function getCampaign(campaignId: string): Promise<Campaign> {
  const firestore = getDb();
  const snap = await getDoc(doc(firestore, 'campaigns', campaignId));
  if (!snap.exists()) {
    throw new CampaignServiceError(
      'campaign-not-found',
      `Campaign ${campaignId} not found`,
    );
  }
  return snap.data() as Campaign;
}

/**
 * Liste tous les membres (joueurs) d'une campagne — c.-à-d. les docs
 * `campaigns/{cid}/members/{uid}`. Les MJ ne sont PAS retournés ici (leur
 * appartenance est portée par `campaigns/{cid}.gmIds`) — l'écran 4.0.5
 * dérive la liste des MJ depuis `Campaign.gmIds` et la fusionne avec ce
 * retour pour afficher le roster complet.
 *
 * Rule consommée : `match /campaigns/{cid}/members/{uid}` allow read si
 * `isMemberOf(campaignId) || isDMOf(campaignId)`. Un non-membre tape donc en
 * permission-denied — propage tel quel.
 */
export async function listCampaignMembers(
  campaignId: string,
): Promise<Membership[]> {
  const firestore = getDb();
  const snap = await getDocs(
    collection(firestore, 'campaigns', campaignId, 'members'),
  );
  return snap.docs.map((d) => d.data() as Membership);
}

// ─────────────────────────────────────────────────────────────────────
// Public API — joinByCode
// ─────────────────────────────────────────────────────────────────────

export interface JoinByCodeResult {
  campaignId: string;
  campaign: Campaign;
}

/**
 * Joins a campaign via its 6-char invite code.
 *
 * Flow :
 *   1. Lookup `inviteCodes/{code}` → obtient le campaignId.
 *   2. Read `campaigns/{campaignId}` (vérifie l'existence — peut avoir été
 *      supprimée entre-temps malgré le code orphelin).
 *   3. Write `campaigns/{campaignId}/members/{uid}` avec role 'member'.
 *
 * Idempotence : si le user est déjà membre, la rule update auto-passe (uid ==
 * userId, role inchangé). Donc rejoindre 2 fois = no-op côté service.
 *
 * Cas d'erreur :
 *   - Code inconnu → `CampaignServiceError('invite-code-not-found')`.
 *   - Campagne supprimée → `CampaignServiceError('campaign-not-found')`.
 *
 * On NE modifie PAS `characterId` ici — le link entre le user et sa fiche se
 * fait dans 4.0.5 (UI campaign-detail) via `linkCharacterToMembership`.
 */
export async function joinByCode(
  code: string,
  uid: string,
): Promise<JoinByCodeResult> {
  const firestore = getDb();

  const codeSnap = await getDoc(doc(firestore, 'inviteCodes', code));
  if (!codeSnap.exists()) {
    throw new CampaignServiceError(
      'invite-code-not-found',
      `Invite code ${code} not found`,
    );
  }
  const { campaignId } = codeSnap.data() as { campaignId: string };

  const campaignSnap = await getDoc(doc(firestore, 'campaigns', campaignId));
  if (!campaignSnap.exists()) {
    throw new CampaignServiceError(
      'campaign-not-found',
      `Campaign ${campaignId} referenced by code ${code} no longer exists`,
    );
  }
  const campaign = campaignSnap.data() as Campaign;

  // Si déjà MJ : ne pas créer de doc member redondant (la membership MJ est
  // sous-entendue par gmIds). Acceptable de retourner le campaign tel quel.
  if (campaign.gmIds.includes(uid)) {
    return { campaignId, campaign };
  }

  const memberRef = doc(firestore, 'campaigns', campaignId, 'members', uid);
  await trackPendingWrite(
    firestore,
    setDoc(memberRef, {
      userId: uid,
      role: 'member',
      characterId: null,
      joinedAt: serverTimestamp(),
      schemaVersion: 1,
    }),
  );

  return { campaignId, campaign };
}

// ─────────────────────────────────────────────────────────────────────
// Public API — leaveCampaign
// ─────────────────────────────────────────────────────────────────────

/**
 * Quitte une campagne. Sémantique :
 *   - Si l'utilisateur est membre joueur → delete `members/{uid}`.
 *   - Si l'utilisateur est MJ ET il reste au moins 1 autre MJ → retire son uid
 *     de gmIds.
 *   - Si l'utilisateur est le DERNIER MJ → throw `last-gm-cannot-leave`. La
 *     campagne doit être archivée/supprimée explicitement, ou un autre user
 *     promu co-MJ d'abord.
 *
 * Atomicité : un MJ qui est aussi membre player (cas marginal) déclencherait
 * 2 writes — un seul `writeBatch` les regroupe.
 */
export async function leaveCampaign(
  campaignId: string,
  uid: string,
): Promise<void> {
  const firestore = getDb();
  const campaignRef = doc(firestore, 'campaigns', campaignId);
  const campaignSnap = await getDoc(campaignRef);
  if (!campaignSnap.exists()) {
    throw new CampaignServiceError(
      'campaign-not-found',
      `Campaign ${campaignId} not found`,
    );
  }
  const campaign = campaignSnap.data() as Campaign;

  const isGm = campaign.gmIds.includes(uid);
  if (isGm && campaign.gmIds.length === 1) {
    throw new CampaignServiceError(
      'last-gm-cannot-leave',
      `User ${uid} is the last GM of campaign ${campaignId}`,
    );
  }

  const batch = writeBatch(firestore);

  if (isGm) {
    batch.update(campaignRef, {
      gmIds: campaign.gmIds.filter((id) => id !== uid),
      updatedAt: serverTimestamp(),
    });
  }

  // Delete member doc s'il existe. Pas de read préalable — Firestore tolère
  // delete d'un doc absent (no-op). La rule autorise self-delete + DM-delete.
  batch.delete(doc(firestore, 'campaigns', campaignId, 'members', uid));

  await trackPendingWrite(firestore, batch.commit());
}

// ─────────────────────────────────────────────────────────────────────
// Public API — promoteToGm
// ─────────────────────────────────────────────────────────────────────

/**
 * Promeut un membre en co-MJ. Le caller doit déjà être MJ (vérifié par les
 * rules — l'erreur permission-denied propage si ce n'est pas le cas).
 *
 * Atomicité : `writeBatch` campagne (arrayUnion gmIds) + member (role := gm).
 * Si la cible n'a pas (encore) de doc member, on crée un doc minimal pour
 * symétrie avec le restant des écritures — la rule autorise create si le
 * caller est MJ.
 */
export async function promoteToGm(
  campaignId: string,
  targetUid: string,
): Promise<void> {
  const firestore = getDb();
  const campaignRef = doc(firestore, 'campaigns', campaignId);
  const campaignSnap = await getDoc(campaignRef);
  if (!campaignSnap.exists()) {
    throw new CampaignServiceError(
      'campaign-not-found',
      `Campaign ${campaignId} not found`,
    );
  }
  const campaign = campaignSnap.data() as Campaign;

  if (campaign.gmIds.includes(targetUid)) {
    // No-op idempotent.
    return;
  }

  const batch = writeBatch(firestore);
  batch.update(campaignRef, {
    gmIds: [...campaign.gmIds, targetUid],
    updatedAt: serverTimestamp(),
  });

  const memberRef = doc(firestore, 'campaigns', campaignId, 'members', targetUid);
  const memberSnap = await getDoc(memberRef);
  if (memberSnap.exists()) {
    batch.update(memberRef, { role: 'gm' });
  } else {
    // Cas où on promeut un user qui n'a pas de doc member (DM directement
    // ajouté en gmIds sans passer par invite-code). Crée un doc member
    // minimal cohérent avec MembershipSchema.
    batch.set(memberRef, {
      userId: targetUid,
      role: 'gm',
      characterId: null,
      joinedAt: serverTimestamp(),
      schemaVersion: 1,
    });
  }

  await trackPendingWrite(firestore, batch.commit());
}

// ─────────────────────────────────────────────────────────────────────
// Legacy helper — ensureCampaignExists (proto map /map-proto/cloud/:cid)
// ─────────────────────────────────────────────────────────────────────

/**
 * Crée le doc `campaigns/{cid}` si absent, avec l'utilisateur courant
 * comme MJ. No-op si le doc existe déjà ET que l'utilisateur est DM.
 *
 * Conservé pour le proto map `/map-proto/cloud/:cid` (CHANTIER D phase 2,
 * tracer D.3) qui s'appuie sur un cid arbitraire passé en URL au lieu d'un
 * selector. Le vrai parcours utilisateur V1 passe par `createCampaign` +
 * `listMyCampaigns` + `joinByCode` — `ensureCampaignExists` est marqué pour
 * disparaître quand le proto map sera intégré au selector de campagne.
 *
 * Subtilité Firestore rules : `campaigns/{cid}` n'autorise la `read` qu'aux
 * MJ et membres. Un signed-in qui veut juste tester l'existence d'une
 * campagne pour un cid arbitraire reçoit `permission-denied` au `getDoc`
 * — c'est attendu, ça protège le doc des non-membres. Stratégie :
 *   1. On tente `getDoc` — si ça passe (snap.exists()), on est déjà MJ ou
 *      membre, no-op.
 *   2. Si `permission-denied`, le doc existe peut-être mais on n'est pas
 *      autorisé, OU il n'existe pas et le get a évalué une rule qui
 *      référence un doc absent. On tente alors `setDoc` create.
 *   3. Si setDoc passe, la campagne n'existait pas → on en est MJ. Si
 *      setDoc échoue à son tour avec permission-denied, le doc existe avec
 *      un autre MJ → on propage l'erreur.
 *
 * Retourne `true` si le doc a été créé, `false` s'il existait déjà.
 */
export async function ensureCampaignExists(
  campaignId: string,
  uid: string,
): Promise<boolean> {
  const firestore = getDb();
  const ref = doc(firestore, 'campaigns', campaignId);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return false;
  } catch (err: unknown) {
    if (!(err instanceof FirebaseError) || err.code !== 'permission-denied') {
      throw err;
    }
  }
  await trackPendingWrite(
    firestore,
    setDoc(ref, {
      name: campaignId,
      gmIds: [uid],
      createdBy: uid,
      status: 'active',
      schemaVersion: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  return true;
}

/**
 * Met à jour le nom / description / settings d'une campagne. La rule update
 * exige que le caller soit MJ et que createdBy + gmIds.size() ≥ 1 soient
 * préservés ; on n'écrit pas ces champs ici.
 */
export interface UpdateCampaignPatch {
  name?: string;
  description?: string;
  settings?: CampaignSettingsPatch;
  status?: 'active' | 'paused' | 'archived';
}

export async function updateCampaign(
  campaignId: string,
  patch: UpdateCampaignPatch,
): Promise<void> {
  const firestore = getDb();
  const ref = doc(firestore, 'campaigns', campaignId);

  // Si on touche `settings`, on doit lire l'état courant pour merger les
  // sous-champs (Firestore update n'a pas de deep-merge natif).
  let mergedSettings: CampaignSettings | undefined;
  if (patch.settings) {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new CampaignServiceError(
        'campaign-not-found',
        `Campaign ${campaignId} not found`,
      );
    }
    const current = (snap.data() as Campaign).settings;
    mergedSettings = {
      ...current,
      ...patch.settings,
      variants: {
        ...current.variants,
        ...(patch.settings.variants ?? {}),
      },
    };
  }

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.status !== undefined) payload.status = patch.status;
  if (mergedSettings) payload.settings = mergedSettings;

  await trackPendingWrite(firestore, updateDoc(ref, payload));
}

/**
 * Lie une fiche personnage à la membership de l'utilisateur courant. Écrit
 * directement le `characterId` dans le doc `members/{uid}` sans toucher au
 * rôle (la rule update autorise self-update sur tous champs sauf role).
 *
 * Appelé par l'UI campaign-detail (4.0.5) quand le user sélectionne une
 * fiche dans le picker « lier un personnage ».
 */
export async function linkCharacterToMembership(
  campaignId: string,
  uid: string,
  characterId: string | null,
): Promise<void> {
  const firestore = getDb();
  const memberRef = doc(firestore, 'campaigns', campaignId, 'members', uid);
  await trackPendingWrite(
    firestore,
    updateDoc(memberRef, { characterId }),
  );
}

/**
 * Supprime un membre (kick par le MJ). Différent de `leaveCampaign` qui
 * couvre le self-leave et le MJ-stepping-down.
 */
export async function kickMember(
  campaignId: string,
  memberUid: string,
): Promise<void> {
  const firestore = getDb();
  await trackPendingWrite(
    firestore,
    deleteDoc(doc(firestore, 'campaigns', campaignId, 'members', memberUid)),
  );
}
