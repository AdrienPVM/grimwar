import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

/**
 * Rules-unit-testing pour firestore.rules.
 *
 * Origine : UAT plan 05 (2026-05-16) — `firestore.rules` corrigé en local pour
 * le multi-class mais oublié côté `firebase deploy --only firestore:rules`,
 * ce qui a fait planter la création de personnage en prod avec
 * "Missing or insufficient permissions". CLAUDE.md + DEBT.md tracent
 * désormais la règle "tout changement de rules suivi du deploy".
 *
 * Ces tests vérifient deux invariants :
 *  1. Le payload réel produit par le wizard (schéma multi-class) est ACCEPTÉ.
 *  2. Un payload de l'ancien schéma (`level` + `classId` top-level) est REFUSÉ.
 *
 * Exécution : `pnpm test:rules` (wrappé par `firebase emulators:exec`).
 * En l'absence d'émulateur ou de Java, ces tests sont skippés avec un log
 * explicite — la triple gate `pnpm test` ne casse pas, mais on les exige avant
 * tout `firebase deploy --only firestore:rules`.
 */

const PROJECT_ID = 'demo-grimwar-rules-test';
const UID = 'alice';
const OTHER_UID = 'bob';
const RULES_PATH = resolve(__dirname, '..', 'firestore.rules');

const emulatorAvailable = !!process.env.FIRESTORE_EMULATOR_HOST;

if (!emulatorAvailable) {
  // Log clair pour Adrien : la suite est skippée, pas silencieusement absente.
  console.warn(
    '⚠️  firestore-rules.test.ts skipped — FIRESTORE_EMULATOR_HOST non défini. Lance `pnpm test:rules` pour exécuter avec l\'émulateur.',
  );
}

const describeIfEmulator = emulatorAvailable ? describe : describe.skip;

// Payload "happy path" : forme multi-class telle que produite par
// `buildCharacterFromWizard` (src/features/wizard/submit-from-wizard.ts).
function makeMulticlassPayload(): Record<string, unknown> {
  return {
    name: 'Sigrid',
    status: 'alive',
    classes: [{ classId: 'fighter', subclassId: null, level: 1 }],
    totalLevel: 1,
    primaryClassId: 'fighter',
    ancestryId: 'human',
    subancestryId: null,
    backgroundId: 'soldier',
    experience: 0,
    alignment: 'LN',
    abilities: { for: 15, dex: 12, con: 14, int: 10, sag: 13, cha: 8 },
    saves: {},
    skills: {},
    hp: { current: 10, max: 10, temp: 0 },
    ac: 11,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'fighter', current: 1, max: 1, die: 10 }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: {},
    knownSpells: {},
    spellcastingAbility: {},
    inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 } },
    personality: { trait: '', ideal: '', bond: '', flaw: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'S' },
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: UID,
  };
}

// Payload v2 (plan 13.7 §0.3 option b). Mêmes invariants structurels que v1,
// avec en plus le sous-objet `ancestrySubChoices` groupé + les 7 sous-choix
// SRD portés par chaque entrée `classes[]`. La rule shape-only DOIT l'accepter
// — l'enforcement « si Drakéide alors dragonAncestry » est côté Zod + wizard.
function makeMulticlassPayloadV2(): Record<string, unknown> {
  return {
    ...makeMulticlassPayload(),
    schemaVersion: 2,
    classes: [
      {
        classId: 'fighter',
        subclassId: null,
        level: 1,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    ancestrySubChoices: {
      dragonAncestry: null,
      tieflingLegacy: null,
      elfLineage: null,
      gnomeLineage: null,
      goliathAncestry: null,
      ancestryCastingAbility: null,
      ancestryExtraSkill: null,
      ancestrySize: null,
    },
    extraLanguages: [],
  };
}

// Payload de l'ancien schéma — mono-classe avec `level` + `classId` au top
// niveau. C'est ce que le wizard PRODUISAIT avant le verrou multi-class, et
// c'est ce que les vieilles `firestore.rules` exigeaient via `hasAll`. Les
// rules courantes (multi-class) DOIVENT le REFUSER.
function makeLegacyMonoClassPayload(): Record<string, unknown> {
  return {
    name: 'Olaf',
    status: 'alive',
    level: 1,
    classId: 'fighter',
    ancestryId: 'human',
    backgroundId: 'soldier',
    abilities: { for: 15, dex: 12, con: 14, int: 10, sag: 13, cha: 8 },
    hp: { current: 10, max: 10, temp: 0 },
    schemaVersion: 1,
    // Pas de `totalLevel`, pas de `classes`, pas de `primaryClassId`.
  };
}

let env: RulesTestEnvironment | null = null;

describeIfEmulator('firestore.rules — caractères (multi-class)', () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf-8'),
      },
    });
  });

  afterAll(async () => {
    if (env) await env.cleanup();
    env = null;
  });

  beforeEach(async () => {
    if (env) await env.clearFirestore();
  });

  it("ACCEPTE le payload multi-class produit par le wizard (auth.uid = owner)", async () => {
    if (!env) throw new Error('env not initialized');
    const ctx = env.authenticatedContext(UID);
    const db = ctx.firestore();
    const ref = doc(db, 'users', UID, 'characters', 'char-001');
    await assertSucceeds(setDoc(ref, makeMulticlassPayload()));
  });

  it("REFUSE le payload ancien schéma (level + classId top-level)", async () => {
    if (!env) throw new Error('env not initialized');
    const ctx = env.authenticatedContext(UID);
    const db = ctx.firestore();
    const ref = doc(db, 'users', UID, 'characters', 'char-002');
    await assertFails(setDoc(ref, makeLegacyMonoClassPayload()));
  });

  it("REFUSE un payload multi-class auquel il manque totalLevel", async () => {
    if (!env) throw new Error('env not initialized');
    const ctx = env.authenticatedContext(UID);
    const db = ctx.firestore();
    const payload = makeMulticlassPayload();
    delete (payload as Record<string, unknown>).totalLevel;
    const ref = doc(db, 'users', UID, 'characters', 'char-003');
    await assertFails(setDoc(ref, payload));
  });

  it("REFUSE un payload multi-class auquel il manque primaryClassId", async () => {
    if (!env) throw new Error('env not initialized');
    const ctx = env.authenticatedContext(UID);
    const db = ctx.firestore();
    const payload = makeMulticlassPayload();
    delete (payload as Record<string, unknown>).primaryClassId;
    const ref = doc(db, 'users', UID, 'characters', 'char-004');
    await assertFails(setDoc(ref, payload));
  });

  it("REFUSE un payload avec un classes vide", async () => {
    if (!env) throw new Error('env not initialized');
    const ctx = env.authenticatedContext(UID);
    const db = ctx.firestore();
    const payload = makeMulticlassPayload();
    payload.classes = [];
    const ref = doc(db, 'users', UID, 'characters', 'char-005');
    await assertFails(setDoc(ref, payload));
  });

  it("REFUSE qu'un user écrive un personnage dans le chemin d'un AUTRE user", async () => {
    if (!env) throw new Error('env not initialized');
    const ctx = env.authenticatedContext(UID);
    const db = ctx.firestore();
    const ref = doc(db, 'users', OTHER_UID, 'characters', 'char-006');
    await assertFails(setDoc(ref, makeMulticlassPayload()));
  });

  it("REFUSE un accès non authentifié", async () => {
    if (!env) throw new Error('env not initialized');
    const ctx = env.unauthenticatedContext();
    const db = ctx.firestore();
    const ref = doc(db, 'users', UID, 'characters', 'char-007');
    await assertFails(setDoc(ref, makeMulticlassPayload()));
  });

  // Plan 13.7 §0.3 — option (b) tolérante. La rule shape-only doit accepter
  // les deux versions de schéma : v1 (anciennes fiches type Lyralei) et v2
  // (nouvelles fiches enrichies). L'enforcement des sous-choix SRD requis est
  // côté wizard 13.8/13.9, pas dans `characterShapeOK`.
  it("ACCEPTE un payload v2 (avec ancestrySubChoices + sous-choix de classe)", async () => {
    if (!env) throw new Error('env not initialized');
    const ctx = env.authenticatedContext(UID);
    const db = ctx.firestore();
    const ref = doc(db, 'users', UID, 'characters', 'char-v2-001');
    await assertSucceeds(setDoc(ref, makeMulticlassPayloadV2()));
  });

  it("ACCEPTE un payload v1 (rétro-compat avant migration runtime)", async () => {
    if (!env) throw new Error('env not initialized');
    const ctx = env.authenticatedContext(UID);
    const db = ctx.firestore();
    const ref = doc(db, 'users', UID, 'characters', 'char-v1-001');
    // makeMulticlassPayload() émet schemaVersion: 1 sans les sous-objets v2.
    await assertSucceeds(setDoc(ref, makeMulticlassPayload()));
  });
});

/**
 * JALON 4A.1 — Lecture MJ d'une fiche de joueur (Voie A2, rule « live »).
 *
 * Autorisation approuvée par Adrien : le MJ d'une campagne peut lire la fiche
 * d'un de ses membres SSI cette fiche est ACTUELLEMENT liée à la membership du
 * joueur dans la campagne d'attache (`homeCampaignId`) du personnage.
 *
 * La vérification est 100 % « live » (aucune estampille figée d'accès) — donc
 * l'accès se révoque tout seul dès que l'une des conditions tombe :
 *   - le MJ n'est plus dans `campaigns/{home}.gmIds` ;
 *   - le joueur a quitté / a été kické (doc `members/{owner}` supprimé) ;
 *   - la fiche est déliée (`members/{owner}.characterId` ≠ cette fiche).
 *
 * `homeCampaignId` n'est qu'un POINTEUR de routage (quelle campagne interroger),
 * jamais une autorisation en soi : un pointeur périmé fait au pire échouer un
 * des trois checks → deny. Aucun chemin de sur-exposition.
 *
 * Ces tests doivent être ROUGES contre le stub `requestUserSharesACampaignWith`
 * (qui renvoyait `false`) et VERTS une fois la rule A2 implémentée.
 */
const OWNER_UID = UID; // alice = propriétaire de la fiche (le joueur)
const GM_UID = OTHER_UID; // bob = MJ de la campagne d'attache
const STRANGER_UID = 'mallory'; // signed-in sans lien avec la campagne
const HOME_CID = 'camp-home';
const PJ_ID = 'char-pj-001';

describeIfEmulator('firestore.rules — lecture MJ d\'une fiche liée (JALON 4A.1, A2)', () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf-8') },
    });
  });

  afterAll(async () => {
    if (env) await env.cleanup();
    env = null;
  });

  beforeEach(async () => {
    if (env) await env.clearFirestore();
  });

  // Seed admin (rules désactivées) : campagne + member + fiche, avec overrides.
  async function seed(opts: {
    gmIds?: string[];
    memberCharacterId?: string | null;
    memberExists?: boolean;
    homeCampaignId?: string | null;
  }): Promise<void> {
    if (!env) throw new Error('env not initialized');
    const {
      gmIds = [GM_UID],
      memberCharacterId = PJ_ID,
      memberExists = true,
      homeCampaignId = HOME_CID,
    } = opts;
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'campaigns', HOME_CID), {
        id: HOME_CID,
        name: 'Home',
        gmIds,
        createdBy: GM_UID,
        status: 'active',
        schemaVersion: 1,
      });
      if (memberExists) {
        await setDoc(doc(adminDb, 'campaigns', HOME_CID, 'members', OWNER_UID), {
          userId: OWNER_UID,
          role: 'member',
          characterId: memberCharacterId,
          schemaVersion: 1,
        });
      }
      await setDoc(doc(adminDb, 'users', OWNER_UID, 'characters', PJ_ID), {
        ...makeMulticlassPayloadV2(),
        homeCampaignId,
        updatedBy: OWNER_UID,
      });
    });
  }

  function readPj(uid: string) {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(uid).firestore();
    return getDoc(doc(db, 'users', OWNER_UID, 'characters', PJ_ID));
  }

  it('ACCEPTE que le MJ lise la fiche liée d\'un de ses membres', async () => {
    await seed({});
    await assertSucceeds(readPj(GM_UID));
  });

  it('ACCEPTE toujours le propriétaire de la fiche (régression)', async () => {
    await seed({});
    await assertSucceeds(readPj(OWNER_UID));
  });

  it('REFUSE un signed-in qui n\'est MJ d\'aucune campagne du joueur', async () => {
    await seed({});
    await assertFails(readPj(STRANGER_UID));
  });

  it('REFUSE le MJ si la fiche est DÉLIÉE (members.characterId = null)', async () => {
    await seed({ memberCharacterId: null });
    await assertFails(readPj(GM_UID));
  });

  it('REFUSE le MJ si une AUTRE fiche est liée (characterId ≠ cette fiche)', async () => {
    await seed({ memberCharacterId: 'char-autre' });
    await assertFails(readPj(GM_UID));
  });

  it('REFUSE le MJ si le joueur a quitté / été kické (doc members absent)', async () => {
    await seed({ memberExists: false });
    await assertFails(readPj(GM_UID));
  });

  it('REFUSE un ex-MJ retiré de gmIds', async () => {
    await seed({ gmIds: ['someone-else'] });
    await assertFails(readPj(GM_UID));
  });

  it('REFUSE le MJ si la fiche n\'est rattachée à aucune campagne (homeCampaignId = null)', async () => {
    await seed({ homeCampaignId: null });
    await assertFails(readPj(GM_UID));
  });
});

/**
 * Plan 26 — ÉCRITURE MJ (omni-edit) d'une fiche liée, Voie B « rules-only »
 * (SUPERSEDE plan 16 « via Cloud Function »). La rule `allow update` autorise le
 * MJ via la MÊME autorité live que la lecture A2 (`gmCanReadLinkedCharacter`),
 * AVEC immuabilité des champs réservés au propriétaire (`name`, `personality`,
 * `homeCampaignId`).
 *
 * Doivent être ROUGES contre l'ancienne rule `allow update: if isOwner(userId)`
 * et VERTES une fois la Voie B en place.
 */
describeIfEmulator('firestore.rules — écriture MJ omni-edit d\'une fiche liée (plan 26)', () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf-8') },
    });
  });

  afterAll(async () => {
    if (env) await env.cleanup();
    env = null;
  });

  beforeEach(async () => {
    if (env) await env.clearFirestore();
  });

  // Même seed que la lecture A2 : campagne + member + fiche valide (shape-OK).
  async function seed(opts: {
    gmIds?: string[];
    memberCharacterId?: string | null;
    memberExists?: boolean;
  } = {}): Promise<void> {
    if (!env) throw new Error('env not initialized');
    const { gmIds = [GM_UID], memberCharacterId = PJ_ID, memberExists = true } = opts;
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'campaigns', HOME_CID), {
        id: HOME_CID,
        name: 'Home',
        gmIds,
        createdBy: GM_UID,
        status: 'active',
        schemaVersion: 1,
      });
      if (memberExists) {
        await setDoc(doc(adminDb, 'campaigns', HOME_CID, 'members', OWNER_UID), {
          userId: OWNER_UID,
          role: 'member',
          characterId: memberCharacterId,
          schemaVersion: 1,
        });
      }
      await setDoc(doc(adminDb, 'users', OWNER_UID, 'characters', PJ_ID), {
        ...makeMulticlassPayloadV2(),
        homeCampaignId: HOME_CID,
        updatedBy: OWNER_UID,
      });
    });
  }

  function updatePj(uid: string, patch: Record<string, unknown>) {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(uid).firestore();
    return updateDoc(doc(db, 'users', OWNER_UID, 'characters', PJ_ID), patch);
  }

  it('ACCEPTE que le MJ édite un champ non réservé (états) d\'un membre lié', async () => {
    await seed();
    await assertSucceeds(updatePj(GM_UID, { conditions: ['poisoned'] }));
  });

  it('REFUSE au MJ de changer le NOM (réservé au propriétaire)', async () => {
    await seed();
    await assertFails(updatePj(GM_UID, { name: 'Renommé par le MJ' }));
  });

  it('REFUSE au MJ de changer la PERSONNALITÉ (réservée au propriétaire)', async () => {
    await seed();
    await assertFails(
      updatePj(GM_UID, {
        personality: { trait: 'x', ideal: 'y', bond: 'z', flaw: 'w', backstory: 'b' },
      }),
    );
  });

  it('REFUSE au MJ de relier la fiche à une autre campagne (homeCampaignId immuable)', async () => {
    await seed();
    await assertFails(updatePj(GM_UID, { homeCampaignId: 'camp-autre' }));
  });

  it('REFUSE un non-MJ (étranger) d\'éditer la fiche', async () => {
    await seed();
    await assertFails(updatePj(STRANGER_UID, { conditions: ['poisoned'] }));
  });

  it('REFUSE un ex-MJ retiré de gmIds', async () => {
    await seed({ gmIds: ['someone-else'] });
    await assertFails(updatePj(GM_UID, { conditions: ['poisoned'] }));
  });

  it('REFUSE le MJ si la fiche est DÉLIÉE (members.characterId ≠ cette fiche)', async () => {
    await seed({ memberCharacterId: 'char-autre' });
    await assertFails(updatePj(GM_UID, { conditions: ['poisoned'] }));
  });

  it('ACCEPTE toujours le propriétaire, y compris sur son propre nom (régression)', async () => {
    await seed();
    await assertSucceeds(updatePj(OWNER_UID, { name: 'Renommé par moi' }));
  });
});

/**
 * JALON 3B.3 — Custom content packs user-scoped (option γ plan 13.11).
 *
 * Une rule unique `match /users/{userId}/customContentPacks/{packId}` qui
 * autorise read+write au propriétaire et rien d'autre. Pas de shape-check
 * côté rules (le validateur 3B.1 garantit la forme côté client avant write).
 *
 * Invariants vérifiés :
 *   1. Le propriétaire peut écrire et lire son pack.
 *   2. Un autre utilisateur authentifié ne peut ni lire ni écrire.
 *   3. Un anonyme non authentifié ne peut rien.
 *   4. delete owner-only.
 */
describeIfEmulator('firestore.rules — customContentPacks (JALON 3B.3)', () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf-8'),
      },
    });
  });

  afterAll(async () => {
    if (env) await env.cleanup();
    env = null;
  });

  beforeEach(async () => {
    if (env) await env.clearFirestore();
  });

  const PACK_ID = 'pack-homebrew-test';

  function makePackDoc(): Record<string, unknown> {
    return {
      meta: {
        id: PACK_ID,
        name: { fr: 'Pack test', en: 'Test pack' },
        version: '1.0.0',
        author: 'MJ',
        createdAt: '2026-05-31T12:00:00Z',
      },
      entities: {
        spells: [],
      },
      importedAt: serverTimestamp(),
    };
  }

  it('ACCEPTE write du propriétaire sur users/{uid}/customContentPacks/{pid}', async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(UID).firestore();
    const ref = doc(db, 'users', UID, 'customContentPacks', PACK_ID);
    await assertSucceeds(setDoc(ref, makePackDoc()));
  });

  it('ACCEPTE read du propriétaire sur son propre pack', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(
        doc(adminDb, 'users', UID, 'customContentPacks', PACK_ID),
        makePackDoc(),
      );
    });
    const db = env.authenticatedContext(UID).firestore();
    const ref = doc(db, 'users', UID, 'customContentPacks', PACK_ID);
    await assertSucceeds(getDoc(ref));
  });

  it("REFUSE qu'un autre user lise le pack", async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(
        doc(adminDb, 'users', UID, 'customContentPacks', PACK_ID),
        makePackDoc(),
      );
    });
    const otherDb = env.authenticatedContext(OTHER_UID).firestore();
    const ref = doc(otherDb, 'users', UID, 'customContentPacks', PACK_ID);
    await assertFails(getDoc(ref));
  });

  it("REFUSE qu'un autre user écrive dans le path du propriétaire", async () => {
    if (!env) throw new Error('env not initialized');
    const otherDb = env.authenticatedContext(OTHER_UID).firestore();
    const ref = doc(otherDb, 'users', UID, 'customContentPacks', PACK_ID);
    await assertFails(setDoc(ref, makePackDoc()));
  });

  it('REFUSE un accès non authentifié (lecture)', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users', UID, 'customContentPacks', PACK_ID),
        makePackDoc(),
      );
    });
    const db = env.unauthenticatedContext().firestore();
    const ref = doc(db, 'users', UID, 'customContentPacks', PACK_ID);
    await assertFails(getDoc(ref));
  });

  it('REFUSE un accès non authentifié (écriture)', async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.unauthenticatedContext().firestore();
    const ref = doc(db, 'users', UID, 'customContentPacks', PACK_ID);
    await assertFails(setDoc(ref, makePackDoc()));
  });

  it('ACCEPTE delete du propriétaire', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users', UID, 'customContentPacks', PACK_ID),
        makePackDoc(),
      );
    });
    const db = env.authenticatedContext(UID).firestore();
    const ref = doc(db, 'users', UID, 'customContentPacks', PACK_ID);
    await assertSucceeds(deleteDoc(ref));
  });

  it("REFUSE delete d'un autre user", async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users', UID, 'customContentPacks', PACK_ID),
        makePackDoc(),
      );
    });
    const otherDb = env.authenticatedContext(OTHER_UID).firestore();
    const ref = doc(otherDb, 'users', UID, 'customContentPacks', PACK_ID);
    await assertFails(deleteDoc(ref));
  });
});

/**
 * CHANTIER D nuit 3 — Mode Carte phase 2 : invariants Firestore Rules pour
 * `campaigns/{cid}/maps/{mid}` + sous-collection `tokens/{tid}`.
 *
 * Invariants vérifiés :
 *   1. DM peut créer/lire/modifier/supprimer une map dans sa campagne.
 *   2. Membre non-DM peut LIRE la map mais pas l'écrire.
 *   3. Étranger (non-membre) ne peut ni lire ni écrire.
 *   4. Mêmes règles s'appliquent à la sous-collection `tokens/`.
 */
const CAMPAIGN_ID = 'camp-001';
const MAP_ID = 'map-001';
const TOKEN_ID = 'token-001';
const DM_UID = 'dm-alice';
const MEMBER_UID = 'player-bob';
const OUTSIDER_UID = 'outsider-charlie';

function makeCampaignDoc(dmUid: string): Record<string, unknown> {
  // JALON 4.0.2 — `dmUserId` (singleton) → `gmIds: string[]`, et la rule de
  // create exige aussi `createdBy`. Pour les rules existantes (maps/tokens),
  // un seul UID dans gmIds suffit à exercer le chemin DM.
  return {
    name: 'Campagne test',
    gmIds: [dmUid],
    createdBy: dmUid,
    status: 'active',
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function makeMapDoc(): Record<string, unknown> {
  return {
    id: MAP_ID,
    name: 'Donjon n°1',
    imageUrl: null,
    gridSize: 70,
    feetPerSquare: 5,
    showGrid: true,
    fogEnabled: true,
    lightingEnabled: false,
    fogPolygons: [],
    lightSources: [],
    aoeTemplates: [],
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: DM_UID,
  };
}

function makeTokenDoc(): Record<string, unknown> {
  return {
    id: TOKEN_ID,
    kind: 'pj',
    label: 'Sigrid',
    position: { x: 100, y: 200 },
    color: '#f3c44a',
    updatedAt: serverTimestamp(),
    updatedBy: DM_UID,
  };
}

describeIfEmulator('firestore.rules — maps + tokens (CHANTIER D nuit 3)', () => {
  // Re-init systématique : le describe précédent a posé un env dans une variable
  // module-scoped puis l'a `cleanup()` dans son `afterAll`, mais la référence
  // reste non-null — d'où une réutilisation d'env zombie qui plante
  // `clearFirestore()`. On nettoie défensivement avant de reposer.
  beforeAll(async () => {
    if (env) {
      try {
        await env.cleanup();
      } catch {
        // déjà cleaned up — pas grave
      }
      env = null;
    }
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf-8') },
    });
  });

  afterAll(async () => {
    if (env) await env.cleanup();
    env = null;
  });

  beforeEach(async () => {
    if (env) await env.clearFirestore();
    if (env) {
      // Seed : campagne + membership joueur pour les tests downstream.
      await env.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'campaigns', CAMPAIGN_ID), makeCampaignDoc(DM_UID));
        // JALON 4.0.2 — sous-collection `memberships/` → `members/`. Le MJ N'A
        // PLUS de doc member (sa membership MJ est sous-entendue par gmIds[]).
        // Seul le joueur a un doc member.
        await setDoc(
          doc(adminDb, 'campaigns', CAMPAIGN_ID, 'members', MEMBER_UID),
          {
            userId: MEMBER_UID,
            role: 'member',
            characterId: null,
            joinedAt: serverTimestamp(),
            schemaVersion: 1,
          },
        );
      });
    }
  });

  it('DM CRÉE une map dans sa campagne', async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(DM_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'campaigns', CAMPAIGN_ID, 'maps', MAP_ID), makeMapDoc()),
    );
  });

  it("MEMBRE non-DM ne peut PAS créer une map", async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(MEMBER_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'campaigns', CAMPAIGN_ID, 'maps', MAP_ID), makeMapDoc()),
    );
  });

  it("ÉTRANGER (non-membre) ne peut ni lire ni écrire une map", async () => {
    if (!env) throw new Error('env not initialized');
    // Seed la map en tant qu'admin.
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_ID, 'maps', MAP_ID),
        makeMapDoc(),
      );
    });
    const db = env.authenticatedContext(OUTSIDER_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'campaigns', CAMPAIGN_ID, 'maps', MAP_ID), makeMapDoc()),
    );
  });

  it('DM peut créer un token dans la sous-collection tokens/', async () => {
    if (!env) throw new Error('env not initialized');
    // Seed la map.
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_ID, 'maps', MAP_ID),
        makeMapDoc(),
      );
    });
    const db = env.authenticatedContext(DM_UID).firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'campaigns', CAMPAIGN_ID, 'maps', MAP_ID, 'tokens', TOKEN_ID),
        makeTokenDoc(),
      ),
    );
  });

  it("MEMBRE non-DM ne peut PAS créer/déplacer un token (V1 — DM only)", async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_ID, 'maps', MAP_ID),
        makeMapDoc(),
      );
    });
    const db = env.authenticatedContext(MEMBER_UID).firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', CAMPAIGN_ID, 'maps', MAP_ID, 'tokens', TOKEN_ID),
        makeTokenDoc(),
      ),
    );
  });

  it("DM sans membership peut lire ses propres maps (CHANTIER D phase 2 D.6 fix)", async () => {
    // Cas concret du marathon : un user qui crée sa campagne via
    // `ensureCampaignExists` n'a PAS de doc `memberships/{uid}` à ce stade
    // (la membership DM est sous-entendue par `dmUserId` sur le doc parent).
    // Avant le fix : la rule de read sur maps exigeait `isMemberOf` seul,
    // donc le DM lui-même ne pouvait pas lister ses cartes — bug bloquant
    // pour `useMapsList`.
    if (!env) throw new Error('env not initialized');
    // Setup spécial : campagne sans membership DM.
    const DM_ONLY = 'dm-only-uid';
    const DM_ONLY_CAMPAIGN = 'dm-only-camp';
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'campaigns', DM_ONLY_CAMPAIGN), {
        ...makeCampaignDoc(DM_ONLY),
      });
      await setDoc(
        doc(adminDb, 'campaigns', DM_ONLY_CAMPAIGN, 'maps', MAP_ID),
        makeMapDoc(),
      );
    });
    const db = env.authenticatedContext(DM_ONLY).firestore();
    // Le DM doit pouvoir lire ses cartes même sans membership.
    await assertSucceeds(
      getDoc(doc(db, 'campaigns', DM_ONLY_CAMPAIGN, 'maps', MAP_ID)),
    );
  });
});

/**
 * JALON 4.0.2 — Invariants Firestore Rules pour le nouveau schéma campagne :
 *   - `gmIds: string[]` (et plus `dmUserId` singleton),
 *   - sous-collection `members/` (et plus `memberships/`),
 *   - rôles `gm|member`,
 *   - `inviteCodes/{code}` doit matcher le path,
 *   - et anti-spoof : createdBy doit être l'utilisateur courant.
 *
 * Source de vérité côté types : `src/shared/types/campaign.ts` (4.0.1).
 */
const CAMPAIGN_4_0_2_ID = 'camp-4-0-2';
const ALT_CAMPAIGN_4_0_2_ID = 'camp-4-0-2-alt';

function makeCampaignDocV4(creatorUid: string, gmIds?: string[]): Record<string, unknown> {
  return {
    name: 'Campagne 4.0.2',
    description: '',
    gmIds: gmIds ?? [creatorUid],
    createdBy: creatorUid,
    inviteCode: 'ABCD23',
    settings: {
      language: 'fr',
      diceMode: 'digital',
      variants: {
        featAtLevel1: false,
        flanking: false,
        slowHealing: false,
        grittyRealism: false,
      },
    },
    status: 'active',
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function makeMemberDocV4(userUid: string, role: 'gm' | 'member'): Record<string, unknown> {
  return {
    userId: userUid,
    role,
    characterId: null,
    joinedAt: serverTimestamp(),
    schemaVersion: 1,
  };
}

describeIfEmulator('firestore.rules — campaigns + members (JALON 4.0.2)', () => {
  beforeAll(async () => {
    if (env) {
      try {
        await env.cleanup();
      } catch {
        // déjà cleaned up
      }
      env = null;
    }
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf-8') },
    });
  });

  afterAll(async () => {
    if (env) await env.cleanup();
    env = null;
  });

  beforeEach(async () => {
    if (env) await env.clearFirestore();
  });

  // ── CREATE campaign ───────────────────────────────────────────
  it('ACCEPTE create campagne quand auth.uid ∈ gmIds && createdBy == auth.uid', async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(DM_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'campaigns', CAMPAIGN_4_0_2_ID), makeCampaignDocV4(DM_UID)),
    );
  });

  it("REFUSE create si l'auth.uid n'apparaît PAS dans gmIds (anti-spoof)", async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(DM_UID).firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID, ['someone-else']),
      ),
    );
  });

  it('REFUSE create si createdBy ≠ auth.uid (anti-spoof)', async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(DM_UID).firestore();
    const payload = makeCampaignDocV4(DM_UID);
    payload.createdBy = 'someone-else';
    await assertFails(setDoc(doc(db, 'campaigns', CAMPAIGN_4_0_2_ID), payload));
  });

  it('REFUSE create non-authentifié', async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, 'campaigns', CAMPAIGN_4_0_2_ID), makeCampaignDocV4(DM_UID)),
    );
  });

  // ── UPDATE campaign ───────────────────────────────────────────
  it("ACCEPTE update par un MJ (ajout d'un co-MJ via arrayUnion-like)", async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
    });
    const db = env.authenticatedContext(DM_UID).firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID, [DM_UID, 'co-gm-uid']),
      ),
    );
  });

  it('REFUSE update qui vide gmIds (invariant ≥ 1 MJ)', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
    });
    const db = env.authenticatedContext(DM_UID).firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID, []),
      ),
    );
  });

  it('REFUSE update par un non-MJ', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
    });
    const db = env.authenticatedContext(OUTSIDER_UID).firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      ),
    );
  });

  it('REFUSE update qui change createdBy', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
    });
    const db = env.authenticatedContext(DM_UID).firestore();
    const payload = makeCampaignDocV4(DM_UID);
    payload.createdBy = 'someone-else';
    await assertFails(
      setDoc(doc(db, 'campaigns', CAMPAIGN_4_0_2_ID), payload),
    );
  });

  // ── members/ subcollection ────────────────────────────────────
  it('ACCEPTE self-create d\'un membre via invite (userId == auth.uid, role member)', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
    });
    const db = env.authenticatedContext(MEMBER_UID).firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'campaigns', CAMPAIGN_4_0_2_ID, 'members', MEMBER_UID),
        makeMemberDocV4(MEMBER_UID, 'member'),
      ),
    );
  });

  it("REFUSE create d'un membre si userId du payload ≠ doc ID (anti-spoof)", async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
    });
    const db = env.authenticatedContext(MEMBER_UID).firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', CAMPAIGN_4_0_2_ID, 'members', MEMBER_UID),
        makeMemberDocV4('someone-else', 'member'),
      ),
    );
  });

  it('REFUSE create avec role inconnu (ex. legacy "player")', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
    });
    const db = env.authenticatedContext(MEMBER_UID).firestore();
    const payload = makeMemberDocV4(MEMBER_UID, 'member');
    payload.role = 'player';
    await assertFails(
      setDoc(
        doc(db, 'campaigns', CAMPAIGN_4_0_2_ID, 'members', MEMBER_UID),
        payload,
      ),
    );
  });

  it("REFUSE qu'un membre self-promote son role (member → gm)", async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(
        doc(adminDb, 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
      await setDoc(
        doc(adminDb, 'campaigns', CAMPAIGN_4_0_2_ID, 'members', MEMBER_UID),
        makeMemberDocV4(MEMBER_UID, 'member'),
      );
    });
    const db = env.authenticatedContext(MEMBER_UID).firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', CAMPAIGN_4_0_2_ID, 'members', MEMBER_UID),
        makeMemberDocV4(MEMBER_UID, 'gm'),
      ),
    );
  });

  it('ACCEPTE qu\'un MJ promeut un membre (member → gm)', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(
        doc(adminDb, 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
      await setDoc(
        doc(adminDb, 'campaigns', CAMPAIGN_4_0_2_ID, 'members', MEMBER_UID),
        makeMemberDocV4(MEMBER_UID, 'member'),
      );
    });
    const db = env.authenticatedContext(DM_UID).firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'campaigns', CAMPAIGN_4_0_2_ID, 'members', MEMBER_UID),
        makeMemberDocV4(MEMBER_UID, 'gm'),
      ),
    );
  });

  it("REFUSE self-create d'un member dans une campagne inexistante (JALON 4.0.6 — code orphelin)", async () => {
    // La rule `members.create` exige `exists(/campaigns/{cid})`. Un code
    // orphelin (campagne supprimée mais doc inviteCodes encore là) ne doit
    // PAS permettre d'écrire un member dans une sous-collection fantôme.
    // Le service `joinByCode` traduit ce permission-denied en
    // `CampaignServiceError('campaign-not-found')`.
    if (!env) throw new Error('env not initialized');
    // Pas de seed : la campagne CAMPAIGN_4_0_2_ID n'existe PAS.
    const db = env.authenticatedContext(MEMBER_UID).firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', CAMPAIGN_4_0_2_ID, 'members', MEMBER_UID),
        makeMemberDocV4(MEMBER_UID, 'member'),
      ),
    );
  });

  it('ACCEPTE self-delete (leave) par un membre sur son propre doc', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(
        doc(adminDb, 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
      await setDoc(
        doc(adminDb, 'campaigns', CAMPAIGN_4_0_2_ID, 'members', MEMBER_UID),
        makeMemberDocV4(MEMBER_UID, 'member'),
      );
    });
    const db = env.authenticatedContext(MEMBER_UID).firestore();
    await assertSucceeds(
      deleteDoc(doc(db, 'campaigns', CAMPAIGN_4_0_2_ID, 'members', MEMBER_UID)),
    );
  });

  // ── inviteCodes ───────────────────────────────────────────────
  it("ACCEPTE create d'un inviteCode par le MJ avec code == doc ID", async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
    });
    const db = env.authenticatedContext(DM_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'inviteCodes', 'XYZ234'), {
        code: 'XYZ234',
        campaignId: CAMPAIGN_4_0_2_ID,
        createdBy: DM_UID,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("REFUSE create d'un inviteCode dont le payload code ≠ doc ID (anti-spoof)", async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
    });
    const db = env.authenticatedContext(DM_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'inviteCodes', 'XYZ234'), {
        code: 'OTHER1', // ne correspond pas au path
        campaignId: CAMPAIGN_4_0_2_ID,
        createdBy: DM_UID,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("REFUSE create d'un inviteCode par un non-MJ de la campagne référencée", async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
    });
    const db = env.authenticatedContext(MEMBER_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'inviteCodes', 'XYZ234'), {
        code: 'XYZ234',
        campaignId: CAMPAIGN_4_0_2_ID,
        createdBy: MEMBER_UID,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('ACCEPTE read inviteCode par tout signed-in (lookup post-saisie du code)', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(
        doc(adminDb, 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
      await setDoc(doc(adminDb, 'inviteCodes', 'XYZ234'), {
        code: 'XYZ234',
        campaignId: CAMPAIGN_4_0_2_ID,
        createdBy: DM_UID,
        createdAt: serverTimestamp(),
      });
    });
    const db = env.authenticatedContext(OUTSIDER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'inviteCodes', 'XYZ234')));
  });

  it('REFUSE read inviteCode non-authentifié', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'inviteCodes', 'XYZ234'), {
        code: 'XYZ234',
        campaignId: CAMPAIGN_4_0_2_ID,
        createdBy: DM_UID,
        createdAt: serverTimestamp(),
      });
    });
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'inviteCodes', 'XYZ234')));
  });

  // ── Read campaign / members ──────────────────────────────────
  it("ACCEPTE read campaign par un MJ (via gmIds)", async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
    });
    const db = env.authenticatedContext(DM_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'campaigns', CAMPAIGN_4_0_2_ID)));
  });

  it("REFUSE read campaign par un étranger (ni MJ ni member)", async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', ALT_CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
    });
    const db = env.authenticatedContext(OUTSIDER_UID).firestore();
    await assertFails(getDoc(doc(db, 'campaigns', ALT_CAMPAIGN_4_0_2_ID)));
  });

  // ── listMyCampaigns queries (JALON 4.0.4) ──────────────────
  //
  // Régression : avant 4.0.4, le rule de read sur `campaigns` utilisait
  // `isDMOf(campaignId)` qui faisait un `get()` sur le doc en cours
  // d'évaluation. Firestore Rules ne supportent pas ce pattern en `list`
  // → "Null value error" → toute query `where gmIds array-contains uid`
  // échouait en runtime (cf. PR 4.0.4 — bug détecté en UAT spec).
  //
  // Régression : avant 4.0.4, aucune rule top-level ne couvrait les
  // collectionGroup queries sur `members`. La rule path-bound L201+ ne
  // s'applique PAS aux collectionGroup → la query Q2 de listMyCampaigns
  // tombait dans le default-deny. La rule top-level `match
  // /{path=**}/members/{userId}` autorise UNIQUEMENT le self-read par
  // collectionGroup (resource.data.userId == auth.uid).

  it('ACCEPTE query campaigns where gmIds array-contains auth.uid (Q1 listMyCampaigns)', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4(DM_UID),
      );
    });
    const db = env.authenticatedContext(DM_UID).firestore();
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'campaigns'),
          where('gmIds', 'array-contains', DM_UID),
          orderBy('updatedAt', 'desc'),
        ),
      ),
    );
  });

  it("REFUSE query campaigns where gmIds array-contains <autre-uid> (anti-leak)", async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(OUTSIDER_UID).firestore();
    // Le query restrictif rejette la rule (anti-leak via gmIds construit
    // avec un autre uid que le sien). resource.data.gmIds ne contient pas
    // l'auth.uid → rule fails → query refusée.
    await assertFails(
      getDocs(
        query(
          collection(db, 'campaigns'),
          where('gmIds', 'array-contains', DM_UID),
          orderBy('updatedAt', 'desc'),
        ),
      ),
    );
  });

  it('ACCEPTE collectionGroup query members where userId == auth.uid (Q2 listMyCampaigns)', async () => {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      // Seed une campagne + un member doc pour ce user.
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4('owner-uid'),
      );
      await setDoc(
        doc(
          context.firestore(),
          'campaigns',
          CAMPAIGN_4_0_2_ID,
          'members',
          MEMBER_UID,
        ),
        {
          userId: MEMBER_UID,
          role: 'member',
          characterId: null,
          joinedAt: serverTimestamp(),
          schemaVersion: 1,
        },
      );
    });
    const db = env.authenticatedContext(MEMBER_UID).firestore();
    await assertSucceeds(
      getDocs(
        query(
          collectionGroup(db, 'members'),
          where('userId', '==', MEMBER_UID),
          orderBy('joinedAt', 'desc'),
        ),
      ),
    );
  });

  it("REFUSE collectionGroup query members where userId == <autre-uid> (anti-leak)", async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(OUTSIDER_UID).firestore();
    await assertFails(
      getDocs(
        query(
          collectionGroup(db, 'members'),
          where('userId', '==', MEMBER_UID),
          orderBy('joinedAt', 'desc'),
        ),
      ),
    );
  });

  it('ACCEPTE create campaign + inviteCode dans le MÊME batch (createCampaign 4.0.3)', async () => {
    // Régression JALON 4.0.4 : avant le fix `getAfter`, l'inviteCode était
    // refusé parce que `isDMOf` lisait l'état pré-batch (le campaign
    // n'existait pas encore) → createCampaign crashait toujours. La rule
    // post-fix accepte la branche `getAfter`.
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(DM_UID).firestore();
    const batch = writeBatch(db);
    const campaignRef = doc(db, 'campaigns', CAMPAIGN_4_0_2_ID);
    batch.set(campaignRef, makeCampaignDocV4(DM_UID));
    batch.set(doc(db, 'inviteCodes', 'BATCH1'), {
      code: 'BATCH1',
      campaignId: CAMPAIGN_4_0_2_ID,
      createdBy: DM_UID,
      createdAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it('ACCEPTE get campaign par un membre (path /campaigns/{cid} via Q2 follow-up)', async () => {
    // Q2 de listMyCampaigns appelle getDoc(campaignRef) pour chaque doc
    // member retourné. Le user n'étant pas dans gmIds, on dépend de la
    // branche `exists(members/{auth.uid})` du nouveau rule read.
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', CAMPAIGN_4_0_2_ID),
        makeCampaignDocV4('owner-uid'),
      );
      await setDoc(
        doc(
          context.firestore(),
          'campaigns',
          CAMPAIGN_4_0_2_ID,
          'members',
          MEMBER_UID,
        ),
        {
          userId: MEMBER_UID,
          role: 'member',
          characterId: null,
          joinedAt: serverTimestamp(),
          schemaVersion: 1,
        },
      );
    });
    const db = env.authenticatedContext(MEMBER_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'campaigns', CAMPAIGN_4_0_2_ID)));
  });
});

/**
 * Plan 22 (JALON 22.1) — Journal d'événements `campaigns/{cid}/events/{eid}`.
 *
 * Les rules `events` existaient (firestore.rules L248-270) mais n'avaient AUCUN
 * test (constat scout 22.1). Ce bloc les couvre :
 *   - CREATE : membre uniquement, `actorUserId == auth.uid` (anti-spoof),
 *     `createdAt == request.time` (⇒ `serverTimestamp()` obligatoire),
 *   - immutabilité : `update` toujours refusé,
 *   - lecture filtrée par visibilité (`all` / `self` / `dm`) pour un membre,
 *   - DELETE : MJ uniquement (purge).
 *
 * GAP RÉSOLU (JALON 22.3) : la rule de READ exigeait `isMemberOf(campaignId)`,
 * or un MJ n'a PAS de doc `members/` (sa membership est sous-entendue par
 * `gmIds[]`) → un MJ ne pouvait PAS lire le flux de sa campagne. 22.3 élargit
 * le prédicat de base à `isMemberOf || isDMOf` (le filtrage par visibilité
 * reste per-doc). Les tests « lecture MJ heureuse » + la QUERY contrainte du
 * feed MJ (`where visibility in ['all','dm']`) sont désormais couverts ci-dessous.
 */
const EV_CID = 'camp-events';
const EV_PLAYER = 'ev-player-alice';
const EV_PLAYER2 = 'ev-player-carol';
const EV_GM = 'ev-gm-bob';
const EV_PJ = 'ev-char-alice';
const EV_PJ2 = 'ev-char-carol';

function makeEventDoc(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: 'roll',
    actorUserId: EV_PLAYER,
    actorCharacterId: EV_PJ,
    targetCharacterId: null,
    sessionId: null,
    encounterId: null,
    payload: { label: 'Épée longue', total: 18 },
    visibility: 'all',
    createdAt: serverTimestamp(),
    ...over,
  };
}

describeIfEmulator('firestore.rules — events (plan 22 / JALON 22.1)', () => {
  beforeAll(async () => {
    if (env) {
      try {
        await env.cleanup();
      } catch {
        // déjà cleaned up
      }
      env = null;
    }
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf-8') },
    });
  });

  afterAll(async () => {
    if (env) await env.cleanup();
    env = null;
  });

  beforeEach(async () => {
    if (!env) throw new Error('env not initialized');
    await env.clearFirestore();
    // Seed : campagne (gmIds = bob) + 2 joueurs membres (alice, carol). Le MJ
    // n'a PAS de doc member (membership MJ sous-entendue par gmIds).
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'campaigns', EV_CID), {
        id: EV_CID,
        name: 'Events camp',
        gmIds: [EV_GM],
        createdBy: EV_GM,
        status: 'active',
        schemaVersion: 1,
      });
      await setDoc(doc(adminDb, 'campaigns', EV_CID, 'members', EV_PLAYER), {
        userId: EV_PLAYER,
        role: 'member',
        characterId: EV_PJ,
        schemaVersion: 1,
      });
      await setDoc(doc(adminDb, 'campaigns', EV_CID, 'members', EV_PLAYER2), {
        userId: EV_PLAYER2,
        role: 'member',
        characterId: EV_PJ2,
        schemaVersion: 1,
      });
    });
  });

  function seedEvent(over: Record<string, unknown> = {}, eid = 'evt-seed'): Promise<void> {
    if (!env) throw new Error('env not initialized');
    return env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'campaigns', EV_CID, 'events', eid), makeEventDoc(over));
    });
  }

  // ── CREATE ────────────────────────────────────────────────────
  it('ACCEPTE create par un membre (actorUserId == auth.uid, createdAt == request.time)', async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(EV_PLAYER).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'campaigns', EV_CID, 'events', 'evt-1'), makeEventDoc()),
    );
  });

  it("REFUSE create si actorUserId ≠ auth.uid (anti-spoof)", async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(EV_PLAYER).firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', EV_CID, 'events', 'evt-2'),
        makeEventDoc({ actorUserId: EV_PLAYER2 }),
      ),
    );
  });

  it('REFUSE create par un non-membre', async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext('outsider-zzz').firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', EV_CID, 'events', 'evt-3'),
        makeEventDoc({ actorUserId: 'outsider-zzz' }),
      ),
    );
  });

  // GAP 23.4 (rouge-avant-vert) : un MJ PUR (gmIds, sans doc members/) doit
  // pouvoir journaliser SES events — c'est le chemin session-start/session-end.
  // `isMemberOf` seul le bloquait ; élargi à `isMemberOf || isDMOf`.
  it('ACCEPTE create par un MJ pur (session-start, sans doc members/)', async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(EV_GM).firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'campaigns', EV_CID, 'events', 'evt-gm-start'),
        makeEventDoc({
          kind: 'session-start',
          actorUserId: EV_GM,
          actorCharacterId: null,
          sessionId: 'sess-1',
          payload: { sessionNumber: 1, title: 'Ouverture' },
        }),
      ),
    );
  });

  it("REFUSE create avec un createdAt client (≠ request.time)", async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(EV_PLAYER).firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', EV_CID, 'events', 'evt-4'),
        makeEventDoc({ createdAt: new Date(0) }),
      ),
    );
  });

  // ── Immutabilité ──────────────────────────────────────────────
  it('REFUSE update (events immuables — allow update: false)', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEvent({}, 'evt-immut');
    const db = env.authenticatedContext(EV_PLAYER).firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', EV_CID, 'events', 'evt-immut'),
        makeEventDoc({ payload: { label: 'falsifié', total: 99 } }),
      ),
    );
  });

  // ── Lecture filtrée par visibilité (acteur = membre) ──────────
  it('ACCEPTE read d\'un event visibility "all" par un autre membre', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEvent({ visibility: 'all' }, 'evt-all');
    const db = env.authenticatedContext(EV_PLAYER2).firestore();
    await assertSucceeds(getDoc(doc(db, 'campaigns', EV_CID, 'events', 'evt-all')));
  });

  it('ACCEPTE read d\'un event "self" par le propriétaire du perso acteur', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEvent({ visibility: 'self' }, 'evt-self');
    const db = env.authenticatedContext(EV_PLAYER).firestore();
    await assertSucceeds(getDoc(doc(db, 'campaigns', EV_CID, 'events', 'evt-self')));
  });

  it('REFUSE read d\'un event "self" d\'un autre joueur', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEvent({ visibility: 'self' }, 'evt-self2');
    const db = env.authenticatedContext(EV_PLAYER2).firestore();
    await assertFails(getDoc(doc(db, 'campaigns', EV_CID, 'events', 'evt-self2')));
  });

  it('REFUSE read d\'un event "dm" par un membre non-MJ', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEvent({ visibility: 'dm' }, 'evt-dm');
    const db = env.authenticatedContext(EV_PLAYER2).firestore();
    await assertFails(getDoc(doc(db, 'campaigns', EV_CID, 'events', 'evt-dm')));
  });

  // ── Lecture MJ du flux (JALON 22.3 — prédicat `isMemberOf || isDMOf`) ──
  // Le MJ n'a PAS de doc `members/` → il lit via la branche `isDMOf`. Rouge
  // avant 22.3 (le prédicat de base était `isMemberOf` seul).
  it('ACCEPTE read d\'un event "all" par le MJ (sans doc members/)', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEvent({ visibility: 'all' }, 'evt-gm-all');
    const db = env.authenticatedContext(EV_GM).firestore();
    await assertSucceeds(getDoc(doc(db, 'campaigns', EV_CID, 'events', 'evt-gm-all')));
  });

  it('ACCEPTE read d\'un event "dm" par le MJ', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEvent({ visibility: 'dm' }, 'evt-gm-dm');
    const db = env.authenticatedContext(EV_GM).firestore();
    await assertSucceeds(getDoc(doc(db, 'campaigns', EV_CID, 'events', 'evt-gm-dm')));
  });

  it('REFUSE read d\'un event "self" d\'un joueur par le MJ (MJ ≠ acteur)', async () => {
    // La visibilité `self` reste privée au joueur : élargir la lecture au MJ
    // n'ouvre QUE `all` + `dm`. Un `self` dont le MJ n'est ni acteur ni
    // propriétaire du perso reste deny.
    if (!env) throw new Error('env not initialized');
    await seedEvent({ visibility: 'self' }, 'evt-gm-self');
    const db = env.authenticatedContext(EV_GM).firestore();
    await assertFails(getDoc(doc(db, 'campaigns', EV_CID, 'events', 'evt-gm-self')));
  });

  it('REFUSE read d\'un event "all" par un non-membre / non-MJ', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEvent({ visibility: 'all' }, 'evt-out-all');
    const db = env.authenticatedContext('outsider-zzz').firestore();
    await assertFails(getDoc(doc(db, 'campaigns', EV_CID, 'events', 'evt-out-all')));
  });

  // ── QUERY du feed MJ — forme RÉELLE consommée par useCampaignEvents ────
  // Une query NON contrainte échoue (la rule peut deny un `self` d'un autre
  // joueur → Firestore rejette la query entière). Le feed MJ doit donc
  // contraindre à `visibility in ['all','dm']`, sous-ensemble que le MJ
  // « provably-read ». Cette paire de tests fige l'invariant (même classe de
  // bug que 4.0.4 : getDoc vert ≠ query verte).
  it('ACCEPTE la query feed MJ contrainte (visibility in [all,dm], orderBy createdAt)', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEvent({ visibility: 'all' }, 'evt-q-all');
    await seedEvent({ visibility: 'dm' }, 'evt-q-dm');
    const db = env.authenticatedContext(EV_GM).firestore();
    await assertSucceeds(
      getDocs(
        query(
          collection(db, 'campaigns', EV_CID, 'events'),
          where('visibility', 'in', ['all', 'dm']),
          orderBy('createdAt', 'desc'),
          limit(20),
        ),
      ),
    );
  });

  it('REFUSE la query NON contrainte du flux par le MJ (justifie la contrainte)', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEvent({ visibility: 'all' }, 'evt-q2-all');
    const db = env.authenticatedContext(EV_GM).firestore();
    await assertFails(
      getDocs(
        query(
          collection(db, 'campaigns', EV_CID, 'events'),
          orderBy('createdAt', 'desc'),
          limit(20),
        ),
      ),
    );
  });

  // ── DELETE ────────────────────────────────────────────────────
  it('ACCEPTE delete par le MJ (purge)', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEvent({}, 'evt-del');
    const db = env.authenticatedContext(EV_GM).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'campaigns', EV_CID, 'events', 'evt-del')));
  });

  it('REFUSE delete par un membre joueur', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEvent({}, 'evt-del2');
    const db = env.authenticatedContext(EV_PLAYER).firestore();
    await assertFails(deleteDoc(doc(db, 'campaigns', EV_CID, 'events', 'evt-del2')));
  });
});

/**
 * Plan 23 (JALON 23.1) — Sessions `campaigns/{cid}/sessions/{sid}`.
 *
 * Les rules `sessions` existaient (firestore.rules) mais n'avaient AUCUN test, et
 * la lecture était `isMemberOf(campaignId)` seul. GAP RÉSOLU (23.1, même classe
 * que events 22.3) : un MJ pur n'a PAS de doc `members/` → il ne pouvait pas
 * lire SA PROPRE liste de sessions. 23.1 élargit le prédicat à
 * `isMemberOf || isDMOf`. Ce bloc couvre :
 *   - READ : membre OK, MJ (sans doc members/) OK, non-membre refusé,
 *   - la QUERY de liste (`orderBy number`) par le MJ et par un membre,
 *   - CREATE/UPDATE/DELETE : MJ uniquement (joueur refusé).
 */
const SES_CID = 'camp-sessions';
const SES_GM = 'ses-gm-bob';
const SES_PLAYER = 'ses-player-alice';
const SES_OUTSIDER = 'ses-outsider-zzz';

function makeSessionDoc(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'ses-seed',
    number: 1,
    title: 'Séance 1',
    plannedDate: null,
    startedAt: null,
    endedAt: null,
    status: 'planned',
    attendance: [],
    notes: '',
    journalCompiled: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...over,
  };
}

describeIfEmulator('firestore.rules — sessions (plan 23 / JALON 23.1)', () => {
  beforeAll(async () => {
    if (env) {
      try {
        await env.cleanup();
      } catch {
        // déjà cleaned up
      }
      env = null;
    }
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf-8') },
    });
  });

  afterAll(async () => {
    if (env) await env.cleanup();
    env = null;
  });

  beforeEach(async () => {
    if (!env) throw new Error('env not initialized');
    await env.clearFirestore();
    // Seed : campagne (gmIds = bob) + 1 joueur membre (alice). Le MJ n'a PAS de
    // doc member (membership MJ sous-entendue par gmIds).
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'campaigns', SES_CID), {
        id: SES_CID,
        name: 'Sessions camp',
        gmIds: [SES_GM],
        createdBy: SES_GM,
        status: 'active',
        schemaVersion: 1,
      });
      await setDoc(doc(adminDb, 'campaigns', SES_CID, 'members', SES_PLAYER), {
        userId: SES_PLAYER,
        role: 'member',
        characterId: null,
        schemaVersion: 1,
      });
    });
  });

  function seedSession(over: Record<string, unknown> = {}, sid = 'ses-seed'): Promise<void> {
    if (!env) throw new Error('env not initialized');
    return env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'campaigns', SES_CID, 'sessions', sid), makeSessionDoc(over));
    });
  }

  // ── READ ──────────────────────────────────────────────────────
  it('ACCEPTE read par un membre joueur', async () => {
    if (!env) throw new Error('env not initialized');
    await seedSession({}, 'ses-r1');
    const db = env.authenticatedContext(SES_PLAYER).firestore();
    await assertSucceeds(getDoc(doc(db, 'campaigns', SES_CID, 'sessions', 'ses-r1')));
  });

  // GAP 23.1 — rouge avant l'élargissement `|| isDMOf`. Le MJ n'a pas de doc
  // members/ → lecture refusée par le prédicat `isMemberOf` seul d'origine.
  it('ACCEPTE read par le MJ (sans doc members/)', async () => {
    if (!env) throw new Error('env not initialized');
    await seedSession({}, 'ses-r2');
    const db = env.authenticatedContext(SES_GM).firestore();
    await assertSucceeds(getDoc(doc(db, 'campaigns', SES_CID, 'sessions', 'ses-r2')));
  });

  it('REFUSE read par un non-membre / non-MJ', async () => {
    if (!env) throw new Error('env not initialized');
    await seedSession({}, 'ses-r3');
    const db = env.authenticatedContext(SES_OUTSIDER).firestore();
    await assertFails(getDoc(doc(db, 'campaigns', SES_CID, 'sessions', 'ses-r3')));
  });

  // ── QUERY de liste (forme réelle consommée par listSessions) ──
  it('ACCEPTE la query liste (orderBy number desc) par le MJ', async () => {
    if (!env) throw new Error('env not initialized');
    await seedSession({ number: 1 }, 'ses-q1');
    await seedSession({ number: 2 }, 'ses-q2');
    const db = env.authenticatedContext(SES_GM).firestore();
    await assertSucceeds(
      getDocs(
        query(collection(db, 'campaigns', SES_CID, 'sessions'), orderBy('number', 'desc')),
      ),
    );
  });

  it('ACCEPTE la query liste par un membre joueur', async () => {
    if (!env) throw new Error('env not initialized');
    await seedSession({ number: 1 }, 'ses-q3');
    const db = env.authenticatedContext(SES_PLAYER).firestore();
    await assertSucceeds(
      getDocs(
        query(collection(db, 'campaigns', SES_CID, 'sessions'), orderBy('number', 'desc')),
      ),
    );
  });

  // ── CREATE ────────────────────────────────────────────────────
  it('ACCEPTE create par le MJ', async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(SES_GM).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'campaigns', SES_CID, 'sessions', 'ses-c1'), makeSessionDoc({ id: 'ses-c1' })),
    );
  });

  it('REFUSE create par un membre joueur', async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(SES_PLAYER).firestore();
    await assertFails(
      setDoc(doc(db, 'campaigns', SES_CID, 'sessions', 'ses-c2'), makeSessionDoc({ id: 'ses-c2' })),
    );
  });

  // ── UPDATE ────────────────────────────────────────────────────
  it('ACCEPTE update par le MJ (notes / statut)', async () => {
    if (!env) throw new Error('env not initialized');
    await seedSession({}, 'ses-u1');
    const db = env.authenticatedContext(SES_GM).firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'campaigns', SES_CID, 'sessions', 'ses-u1'),
        makeSessionDoc({ notes: 'Compte-rendu', status: 'active' }),
      ),
    );
  });

  it('REFUSE update par un membre joueur', async () => {
    if (!env) throw new Error('env not initialized');
    await seedSession({}, 'ses-u2');
    const db = env.authenticatedContext(SES_PLAYER).firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', SES_CID, 'sessions', 'ses-u2'),
        makeSessionDoc({ notes: 'falsifié' }),
      ),
    );
  });

  // ── DELETE ────────────────────────────────────────────────────
  it('ACCEPTE delete par le MJ', async () => {
    if (!env) throw new Error('env not initialized');
    await seedSession({}, 'ses-d1');
    const db = env.authenticatedContext(SES_GM).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'campaigns', SES_CID, 'sessions', 'ses-d1')));
  });

  it('REFUSE delete par un membre joueur', async () => {
    if (!env) throw new Error('env not initialized');
    await seedSession({}, 'ses-d2');
    const db = env.authenticatedContext(SES_PLAYER).firestore();
    await assertFails(deleteDoc(doc(db, 'campaigns', SES_CID, 'sessions', 'ses-d2')));
  });
});

/**
 * Plan 24 (JALON 24.1) — Encounters `campaigns/{cid}/encounters/{eid}`.
 *
 * Le bloc `encounters` existait (firestore.rules) avec une lecture `isMemberOf`
 * seul. MÊME GAP que sessions 23.1 / events 22.3 : un MJ pur n'a pas de doc
 * `members/` → il ne pouvait pas lire SES PROPRES rencontres. 24.1 élargit à
 * `isMemberOf || isDMOf`. Ce bloc couvre :
 *   - READ : membre OK, MJ (sans doc members/) OK (rouge avant 24.1), non-membre refusé,
 *   - la QUERY de liste (`orderBy createdAt`) par le MJ et par un membre,
 *   - CREATE/UPDATE/DELETE : MJ uniquement (joueur refusé).
 */
const ENC_CID = 'camp-encounters';
const ENC_GM = 'enc-gm-bob';
const ENC_PLAYER = 'enc-player-alice';
const ENC_OUTSIDER = 'enc-outsider-zzz';

function makeEncounterDoc(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'enc-seed',
    name: 'Rencontre 1',
    sessionId: null,
    status: 'planned',
    round: 0,
    turnIndex: 0,
    participants: [],
    mapId: null,
    fogState: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    startedAt: null,
    endedAt: null,
    ...over,
  };
}

describeIfEmulator('firestore.rules — encounters (plan 24 / JALON 24.1)', () => {
  beforeAll(async () => {
    if (env) {
      try {
        await env.cleanup();
      } catch {
        // déjà cleaned up
      }
      env = null;
    }
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf-8') },
    });
  });

  afterAll(async () => {
    if (env) await env.cleanup();
    env = null;
  });

  beforeEach(async () => {
    if (!env) throw new Error('env not initialized');
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'campaigns', ENC_CID), {
        id: ENC_CID,
        name: 'Encounters camp',
        gmIds: [ENC_GM],
        createdBy: ENC_GM,
        status: 'active',
        schemaVersion: 1,
      });
      await setDoc(doc(adminDb, 'campaigns', ENC_CID, 'members', ENC_PLAYER), {
        userId: ENC_PLAYER,
        role: 'member',
        characterId: null,
        schemaVersion: 1,
      });
    });
  });

  function seedEncounter(over: Record<string, unknown> = {}, eid = 'enc-seed'): Promise<void> {
    if (!env) throw new Error('env not initialized');
    return env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', ENC_CID, 'encounters', eid),
        makeEncounterDoc(over),
      );
    });
  }

  // ── READ ──────────────────────────────────────────────────────
  it('ACCEPTE read par un membre joueur (party view, step 8)', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEncounter({}, 'enc-r1');
    const db = env.authenticatedContext(ENC_PLAYER).firestore();
    await assertSucceeds(getDoc(doc(db, 'campaigns', ENC_CID, 'encounters', 'enc-r1')));
  });

  // GAP 24.1 — rouge avant l'élargissement `|| isDMOf`. Le MJ pur n'a pas de
  // doc members/ → lecture refusée par le prédicat `isMemberOf` seul d'origine.
  it('ACCEPTE read par le MJ (sans doc members/)', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEncounter({}, 'enc-r2');
    const db = env.authenticatedContext(ENC_GM).firestore();
    await assertSucceeds(getDoc(doc(db, 'campaigns', ENC_CID, 'encounters', 'enc-r2')));
  });

  it('REFUSE read par un non-membre / non-MJ', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEncounter({}, 'enc-r3');
    const db = env.authenticatedContext(ENC_OUTSIDER).firestore();
    await assertFails(getDoc(doc(db, 'campaigns', ENC_CID, 'encounters', 'enc-r3')));
  });

  // ── QUERY de liste (forme réelle consommée par listEncounters) ──
  it('ACCEPTE la query liste (orderBy createdAt desc) par le MJ', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEncounter({}, 'enc-q1');
    await seedEncounter({}, 'enc-q2');
    const db = env.authenticatedContext(ENC_GM).firestore();
    await assertSucceeds(
      getDocs(
        query(collection(db, 'campaigns', ENC_CID, 'encounters'), orderBy('createdAt', 'desc')),
      ),
    );
  });

  it('ACCEPTE la query liste par un membre joueur', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEncounter({}, 'enc-q3');
    const db = env.authenticatedContext(ENC_PLAYER).firestore();
    await assertSucceeds(
      getDocs(
        query(collection(db, 'campaigns', ENC_CID, 'encounters'), orderBy('createdAt', 'desc')),
      ),
    );
  });

  // ── CREATE / UPDATE / DELETE : MJ-only ────────────────────────
  it('ACCEPTE create par le MJ', async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(ENC_GM).firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'campaigns', ENC_CID, 'encounters', 'enc-c1'),
        makeEncounterDoc({ id: 'enc-c1' }),
      ),
    );
  });

  it('REFUSE create par un membre joueur', async () => {
    if (!env) throw new Error('env not initialized');
    const db = env.authenticatedContext(ENC_PLAYER).firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', ENC_CID, 'encounters', 'enc-c2'),
        makeEncounterDoc({ id: 'enc-c2' }),
      ),
    );
  });

  it('ACCEPTE update par le MJ (statut / PV participant)', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEncounter({}, 'enc-u1');
    const db = env.authenticatedContext(ENC_GM).firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'campaigns', ENC_CID, 'encounters', 'enc-u1'),
        makeEncounterDoc({ status: 'active', round: 1 }),
      ),
    );
  });

  it('REFUSE update par un membre joueur', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEncounter({}, 'enc-u2');
    const db = env.authenticatedContext(ENC_PLAYER).firestore();
    await assertFails(
      setDoc(
        doc(db, 'campaigns', ENC_CID, 'encounters', 'enc-u2'),
        makeEncounterDoc({ status: 'active' }),
      ),
    );
  });

  it('ACCEPTE delete par le MJ', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEncounter({}, 'enc-d1');
    const db = env.authenticatedContext(ENC_GM).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'campaigns', ENC_CID, 'encounters', 'enc-d1')));
  });

  it('REFUSE delete par un membre joueur', async () => {
    if (!env) throw new Error('env not initialized');
    await seedEncounter({}, 'enc-d2');
    const db = env.authenticatedContext(ENC_PLAYER).firestore();
    await assertFails(deleteDoc(doc(db, 'campaigns', ENC_CID, 'encounters', 'enc-d2')));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Handouts — `campaigns/{cid}/handouts/{hid}` (plan 27)
// ═══════════════════════════════════════════════════════════════════════

const HD_CID = 'camp-handouts';
const HD_GM = 'dm-handouts';
const HD_PLAYER = 'player-handouts';
const HD_OTHER = 'player-other';

function makeHandoutDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'hd-x',
    title: 'La lettre scellée',
    type: 'text',
    content: { text: '## Un indice' },
    recipients: 'all',
    revealedTo: [],
    visibility: 'sent',
    createdBy: HD_GM,
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

describeIfEmulator('firestore.rules — handouts (plan 27)', () => {
  beforeAll(async () => {
    if (env) {
      try {
        await env.cleanup();
      } catch {
        // déjà cleaned up
      }
      env = null;
    }
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf-8') },
    });
  });

  afterAll(async () => {
    if (env) await env.cleanup();
    env = null;
  });

  beforeEach(async () => {
    if (!env) return;
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'campaigns', HD_CID), makeCampaignDoc(HD_GM));
      // Deux joueurs membres ; le MJ pur n'a PAS de doc members/.
      for (const uid of [HD_PLAYER, HD_OTHER]) {
        await setDoc(doc(adminDb, 'campaigns', HD_CID, 'members', uid), {
          userId: uid,
          role: 'member',
          characterId: null,
          joinedAt: serverTimestamp(),
          schemaVersion: 1,
        });
      }
    });
  });

  async function seed(handoutId: string, overrides: Record<string, unknown>): Promise<void> {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', HD_CID, 'handouts', handoutId),
        makeHandoutDoc({ id: handoutId, ...overrides }),
      );
    });
  }

  function hRef(uid: string, handoutId: string) {
    return doc(env!.authenticatedContext(uid).firestore(), 'campaigns', HD_CID, 'handouts', handoutId);
  }

  // ── Création / suppression (MJ only) ──────────────────────────────
  it('MJ crée un handout', async () => {
    await assertSucceeds(setDoc(hRef(HD_GM, 'hd-1'), makeHandoutDoc({ id: 'hd-1' })));
  });

  it('Joueur ne peut PAS créer un handout', async () => {
    await assertFails(setDoc(hRef(HD_PLAYER, 'hd-2'), makeHandoutDoc({ id: 'hd-2' })));
  });

  it('MJ supprime un handout ; un joueur ne peut pas', async () => {
    await seed('hd-del', { recipients: 'all' });
    await assertSucceeds(deleteDoc(hRef(HD_GM, 'hd-del')));
    await seed('hd-del2', { recipients: 'all' });
    await assertFails(deleteDoc(hRef(HD_PLAYER, 'hd-del2')));
  });

  // ── Lecture (filtrage destinataire) ───────────────────────────────
  it("MJ pur (sans doc members/) lit un handout — fix du gating isMemberOf", async () => {
    await seed('hd-r', { recipients: [HD_PLAYER] });
    await assertSucceeds(getDoc(hRef(HD_GM, 'hd-r')));
  });

  it('Joueur destinataire explicite lit son handout', async () => {
    await seed('hd-r', { recipients: [HD_PLAYER] });
    await assertSucceeds(getDoc(hRef(HD_PLAYER, 'hd-r')));
  });

  it('Joueur NON destinataire ne peut PAS lire un handout ciblé', async () => {
    await seed('hd-r', { recipients: [HD_PLAYER] });
    await assertFails(getDoc(hRef(HD_OTHER, 'hd-r')));
  });

  it("Tout joueur lit un handout diffusé à 'all'", async () => {
    await seed('hd-all', { recipients: 'all' });
    await assertSucceeds(getDoc(hRef(HD_OTHER, 'hd-all')));
  });

  // ── Self-reveal (update borné) ────────────────────────────────────
  it("Destinataire s'ajoute à revealedTo (seul champ, seul son UID)", async () => {
    await seed('hd-rev', { recipients: [HD_PLAYER], revealedTo: [] });
    await assertSucceeds(updateDoc(hRef(HD_PLAYER, 'hd-rev'), { revealedTo: [HD_PLAYER] }));
  });

  it('Destinataire ne peut PAS modifier un autre champ (titre)', async () => {
    await seed('hd-rev', { recipients: [HD_PLAYER] });
    await assertFails(updateDoc(hRef(HD_PLAYER, 'hd-rev'), { title: 'Piraté' }));
  });

  it('Destinataire ne peut PAS révéler quelqu’un d’autre', async () => {
    await seed('hd-rev', { recipients: [HD_PLAYER], revealedTo: [] });
    await assertFails(updateDoc(hRef(HD_PLAYER, 'hd-rev'), { revealedTo: [HD_OTHER] }));
  });

  it('Non-destinataire ne peut PAS se révéler sur un handout ciblé', async () => {
    await seed('hd-rev', { recipients: [HD_PLAYER], revealedTo: [] });
    await assertFails(updateDoc(hRef(HD_OTHER, 'hd-rev'), { revealedTo: [HD_OTHER] }));
  });

  // ── Archivage (MJ) ────────────────────────────────────────────────
  it("MJ archive (visibility → 'archived')", async () => {
    await seed('hd-arch', { recipients: 'all' });
    await assertSucceeds(updateDoc(hRef(HD_GM, 'hd-arch'), { visibility: 'archived' }));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// NPCs — `campaigns/{cid}/npcs/{npcId}` (plan 28)
// ═══════════════════════════════════════════════════════════════════════

const NP_CID = 'camp-npcs';
const NP_GM = 'dm-npcs';
const NP_PLAYER = 'player-npcs';

function makeNpcDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'npc-x',
    name: 'Aldric le marchand',
    role: 'merchant',
    location: 'Valombre',
    shortDescription: 'Un marchand bourru.',
    publicDescription: 'Tient une échoppe.',
    dmNotes: 'Informateur secret.',
    portrait: { type: 'letter', value: 'A' },
    combatStats: null,
    relationships: [],
    tags: [],
    visibility: 'all',
    createdBy: NP_GM,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

describeIfEmulator('firestore.rules — npcs (plan 28)', () => {
  beforeAll(async () => {
    if (env) {
      try {
        await env.cleanup();
      } catch {
        // déjà cleaned up
      }
      env = null;
    }
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, 'utf-8') },
    });
  });

  afterAll(async () => {
    if (env) await env.cleanup();
    env = null;
  });

  beforeEach(async () => {
    if (!env) return;
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'campaigns', NP_CID), makeCampaignDoc(NP_GM));
      // Joueur membre ; le MJ pur n'a PAS de doc members/.
      await setDoc(doc(adminDb, 'campaigns', NP_CID, 'members', NP_PLAYER), {
        userId: NP_PLAYER,
        role: 'member',
        characterId: null,
        joinedAt: serverTimestamp(),
        schemaVersion: 1,
      });
    });
  });

  async function seed(npcId: string, overrides: Record<string, unknown>): Promise<void> {
    if (!env) throw new Error('env not initialized');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'campaigns', NP_CID, 'npcs', npcId),
        makeNpcDoc({ id: npcId, ...overrides }),
      );
    });
  }

  function nRef(uid: string, npcId: string) {
    return doc(env!.authenticatedContext(uid).firestore(), 'campaigns', NP_CID, 'npcs', npcId);
  }

  function npcsCol(uid: string) {
    return collection(env!.authenticatedContext(uid).firestore(), 'campaigns', NP_CID, 'npcs');
  }

  // ── Création / édition / suppression (MJ only) ────────────────────
  it('MJ crée un PNJ', async () => {
    await assertSucceeds(setDoc(nRef(NP_GM, 'npc-1'), makeNpcDoc({ id: 'npc-1' })));
  });

  it('Joueur ne peut PAS créer un PNJ', async () => {
    await assertFails(setDoc(nRef(NP_PLAYER, 'npc-2'), makeNpcDoc({ id: 'npc-2' })));
  });

  it('MJ édite un PNJ ; un joueur ne peut pas', async () => {
    await seed('npc-e', { visibility: 'all' });
    await assertSucceeds(updateDoc(nRef(NP_GM, 'npc-e'), { name: 'Aldric II' }));
    await assertFails(updateDoc(nRef(NP_PLAYER, 'npc-e'), { name: 'Piraté' }));
  });

  it('MJ supprime un PNJ ; un joueur ne peut pas', async () => {
    await seed('npc-del', { visibility: 'all' });
    await assertFails(deleteDoc(nRef(NP_PLAYER, 'npc-del')));
    await assertSucceeds(deleteDoc(nRef(NP_GM, 'npc-del')));
  });

  // ── Lecture (filtrage par visibilité) ─────────────────────────────
  it("MJ pur (sans doc members/) lit un PNJ secret", async () => {
    await seed('npc-secret', { visibility: 'dm' });
    await assertSucceeds(getDoc(nRef(NP_GM, 'npc-secret')));
  });

  it("Joueur lit un PNJ visible ('all')", async () => {
    await seed('npc-pub', { visibility: 'all' });
    await assertSucceeds(getDoc(nRef(NP_PLAYER, 'npc-pub')));
  });

  it("Joueur ne peut PAS lire un PNJ secret ('dm')", async () => {
    await seed('npc-secret', { visibility: 'dm' });
    await assertFails(getDoc(nRef(NP_PLAYER, 'npc-secret')));
  });

  // ── Query bornée (le joueur ne liste que les 'all') ───────────────
  it("Joueur liste les PNJ 'all' (query bornée visibility == 'all')", async () => {
    await seed('npc-pub', { visibility: 'all' });
    await assertSucceeds(getDocs(query(npcsCol(NP_PLAYER), where('visibility', '==', 'all'))));
  });

  it('Joueur ne peut PAS lister TOUTE la collection (touche des PNJ secrets)', async () => {
    await seed('npc-pub', { visibility: 'all' });
    await seed('npc-secret', { visibility: 'dm' });
    await assertFails(getDocs(npcsCol(NP_PLAYER)));
  });

  it('MJ liste toute la collection (secrets inclus)', async () => {
    await seed('npc-pub', { visibility: 'all' });
    await seed('npc-secret', { visibility: 'dm' });
    await assertSucceeds(getDocs(npcsCol(NP_GM)));
  });
});
