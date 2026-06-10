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
  orderBy,
  query,
  serverTimestamp,
  setDoc,
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
