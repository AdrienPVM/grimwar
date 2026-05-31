import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  return {
    name: 'Campagne test',
    dmUserId: dmUid,
    status: 'active',
    schemaVersion: 1,
    createdAt: serverTimestamp(),
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
        // Le DM est aussi un membre (pour passer isMemberOf le cas échéant).
        await setDoc(
          doc(adminDb, 'campaigns', CAMPAIGN_ID, 'memberships', DM_UID),
          { userId: DM_UID, role: 'dm', status: 'active' },
        );
        await setDoc(
          doc(adminDb, 'campaigns', CAMPAIGN_ID, 'memberships', MEMBER_UID),
          { userId: MEMBER_UID, role: 'player', status: 'active' },
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
