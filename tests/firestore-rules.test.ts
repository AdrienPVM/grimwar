import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
});
