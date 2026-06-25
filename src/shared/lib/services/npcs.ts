/**
 * Service Firestore pour `campaigns/{cid}/npcs/{npcId}` — couche d'écriture et
 * de lecture des PNJ récurrents (plan 28, data layer only).
 *
 * Pattern aligné sur `handouts.ts` / `sessions.ts` :
 *   - écritures single-doc wrappées par `trackPendingWrite` (bannière offline) ;
 *   - lectures one-shot triées CLIENT-SIDE (volume bas — une campagne a quelques
 *     dizaines de PNJ sur sa vie), donc AUCUN index composite supplémentaire ;
 *   - pas de validation Zod à l'écriture (caller UI typé strict + rules) ; parse
 *     Zod défensif à la lecture (un doc legacy invalide est ignoré, pas fatal) ;
 *   - Firestore refuse `undefined` → on n'écrit dans `combatStats` que les clés
 *     réellement renseignées (cf. `buildCombatStats`).
 *
 * Rules consommées (cf. `firestore.rules` — bloc `campaigns/{cid}/npcs`) :
 *   - read   : le MJ lit TOUT ; un joueur (membre) ne lit que `visibility ==
 *              'all'`. Un PNJ `'dm'` est invisible des joueurs au niveau rule.
 *   - create/update/delete : `isDMOf`.
 *
 * Note de confidentialité : Firestore ne sait pas filtrer par CHAMP. Un PNJ
 * `'all'` est donc lisible INTÉGRALEMENT par un joueur (y compris `dmNotes` /
 * `combatStats`). Le masquage de ces sections secrètes est CLIENT (cf.
 * `NpcDetailScreen`). Un secret qui ne doit jamais fuir → PNJ `visibility: 'dm'`.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { getDb } from '@/shared/lib/firebase';
import { trackPendingWrite } from '@/shared/lib/track-pending-write';
import {
  NpcSchema,
  npcTimestampMillis,
  type Npc,
  type NpcAttitude,
  type NpcCombatStats,
  type NpcPortrait,
  type NpcRelationship,
  type NpcRole,
  type NpcVisibility,
} from '@/shared/types/npc';

function npcsCol(campaignId: string) {
  return collection(getDb(), 'campaigns', campaignId, 'npcs');
}

function npcRef(campaignId: string, npcId: string) {
  return doc(getDb(), 'campaigns', campaignId, 'npcs', npcId);
}

// ─────────────────────────────────────────────────────────────────────
// Entrée d'écriture partagée création / édition
// ─────────────────────────────────────────────────────────────────────

export interface NpcWriteInput {
  name: string;
  role: NpcRole;
  location: string;
  shortDescription: string;
  /** Markdown FR visible des joueurs. */
  publicDescription: string;
  /** Markdown FR — secret MJ (masqué client pour les joueurs). */
  dmNotes: string;
  portrait: NpcPortrait;
  combatStats: NpcCombatStats | null;
  relationships: NpcRelationship[];
  tags: string[];
  visibility: NpcVisibility;
}

/**
 * Construit le bloc `combatStats` persistable : `null` reste `null` ; sinon on
 * ne pose que les clés DÉFINIES (Firestore refuse `undefined`). Un bloc vide
 * (toutes clés absentes) est conservé comme `{}` — sémantiquement « combattant,
 * stats à préciser » ; le caller passe `null` pour un non-combattant.
 */
function buildCombatStats(stats: NpcCombatStats | null): NpcCombatStats | null {
  if (stats === null) return null;
  const out: NpcCombatStats = {};
  if (stats.monsterContentId !== undefined) out.monsterContentId = stats.monsterContentId;
  if (stats.cr !== undefined) out.cr = stats.cr;
  if (stats.ac !== undefined) out.ac = stats.ac;
  if (stats.hp !== undefined) out.hp = stats.hp;
  if (stats.notes !== undefined) out.notes = stats.notes;
  return out;
}

/** Champs « contenu » communs à la création et à l'édition. */
function writeData(input: NpcWriteInput): Record<string, unknown> {
  return {
    name: input.name,
    role: input.role,
    location: input.location,
    shortDescription: input.shortDescription,
    publicDescription: input.publicDescription,
    dmNotes: input.dmNotes,
    portrait: input.portrait,
    combatStats: buildCombatStats(input.combatStats),
    relationships: input.relationships,
    tags: input.tags,
    visibility: input.visibility,
  };
}

// ─────────────────────────────────────────────────────────────────────
// createNpc / updateNpc / deleteNpc
// ─────────────────────────────────────────────────────────────────────

/**
 * Crée un PNJ. `createdBy` vient de l'appelant (l'écran MJ a `user.uid`).
 * `createdAt`/`updatedAt` = `serverTimestamp()`. Renvoie l'id du doc créé.
 */
export async function createNpc(
  campaignId: string,
  createdByUid: string,
  input: NpcWriteInput,
): Promise<string> {
  const ref = doc(npcsCol(campaignId));
  const id = ref.id;
  await trackPendingWrite(
    getDb(),
    setDoc(ref, {
      id,
      ...writeData(input),
      createdBy: createdByUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  return id;
}

/**
 * Met à jour le contenu d'un PNJ (édition complète depuis la modale). Pose
 * `updatedAt = serverTimestamp()`. Ne touche jamais `createdBy`/`createdAt`.
 */
export async function updateNpc(
  campaignId: string,
  npcId: string,
  input: NpcWriteInput,
): Promise<void> {
  await trackPendingWrite(
    getDb(),
    updateDoc(npcRef(campaignId, npcId), {
      ...writeData(input),
      updatedAt: serverTimestamp(),
    }),
  );
}

/** Supprime définitivement un PNJ (MJ only). */
export async function deleteNpc(campaignId: string, npcId: string): Promise<void> {
  await trackPendingWrite(getDb(), deleteDoc(npcRef(campaignId, npcId)));
}

/**
 * Upsert d'une relation PNJ↔PJ (plan 28 step 12). Remplace l'attitude si une
 * relation existe déjà pour ce personnage, sinon l'ajoute. `currentRelationships`
 * vient du doc déjà chargé. Pose `updatedAt`. Renvoie les relations résultantes
 * (pour le caller : journalisation `before → after` + refresh optimiste).
 */
export async function setNpcAttitude(
  campaignId: string,
  npcId: string,
  characterId: string,
  attitude: NpcAttitude,
  currentRelationships: NpcRelationship[],
): Promise<NpcRelationship[]> {
  const exists = currentRelationships.some((r) => r.characterId === characterId);
  const next = exists
    ? currentRelationships.map((r) =>
        r.characterId === characterId ? { ...r, attitude } : r,
      )
    : [...currentRelationships, { characterId, attitude }];
  await trackPendingWrite(
    getDb(),
    updateDoc(npcRef(campaignId, npcId), {
      relationships: next,
      updatedAt: serverTimestamp(),
    }),
  );
  return next;
}

// ─────────────────────────────────────────────────────────────────────
// Lectures
// ─────────────────────────────────────────────────────────────────────

function parseNpcs(
  docs: { id: string; data: () => Record<string, unknown> }[],
): Npc[] {
  const byId = new Map<string, Npc>();
  for (const d of docs) {
    const result = NpcSchema.safeParse({ ...d.data(), id: d.id });
    if (result.success) {
      byId.set(result.data.id, result.data);
    } else {
      console.warn(
        `[npcs] doc Firestore invalide ignoré (${d.id}): ${
          result.error.errors[0]?.message ?? 'parse error'
        }`,
      );
    }
  }
  return [...byId.values()].sort(
    (a, b) => npcTimestampMillis(a.createdAt) - npcTimestampMillis(b.createdAt),
  );
}

/**
 * MJ : lit TOUS les PNJ de la campagne (la rule `isDMOf` l'y autorise), triés du
 * plus ancien au plus récent (ordre d'introduction stable dans l'annuaire).
 */
export async function listAllNpcs(campaignId: string): Promise<Npc[]> {
  const snap = await getDocs(npcsCol(campaignId));
  return parseNpcs(snap.docs);
}

/**
 * Joueur : ne lit que les PNJ `visibility == 'all'`. La query est BORNÉE à ce
 * filtre — la rule rejette toute query qui pourrait toucher un PNJ `'dm'`. Pas
 * d'`orderBy` (sinon index composite requis) ; tri en mémoire.
 */
export async function listVisibleNpcs(campaignId: string): Promise<Npc[]> {
  const snap = await getDocs(query(npcsCol(campaignId), where('visibility', '==', 'all')));
  return parseNpcs(snap.docs);
}

/** Lecture d'un PNJ unique (détail). `null` si absent ou doc invalide. */
export async function getNpc(campaignId: string, npcId: string): Promise<Npc | null> {
  const snap = await getDoc(npcRef(campaignId, npcId));
  if (!snap.exists()) return null;
  const result = NpcSchema.safeParse({ ...snap.data(), id: snap.id });
  return result.success ? result.data : null;
}
