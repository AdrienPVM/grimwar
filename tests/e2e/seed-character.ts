/**
 * Fixture `seedCharacter` — plan 13.5 complément.
 *
 * **Pourquoi un fixture** : la dette e2e S1 (combat, magie, dice physique,
 * etc.) est bloquée tant qu'on n'a pas un moyen de pré-poser un personnage
 * dans Firestore SANS rejouer le wizard complet par spec. Sans seed, chaque
 * spec aurait dû traverser les 11 étapes du wizard avant de tester sa
 * feature — runtime e2e quadratique + duplication. Ce fixture débloque la
 * purge.
 *
 * **Stratégie** :
 *   1. La page se charge → l'auth-provider sign-in anonymement → un UID
 *      anon est attribué côté émulateur Auth → l'auth-provider expose ce UID
 *      sur `window.__e2eAuthUid` (gated par `useFirebaseEmulator`).
 *   2. Le fixture lit ce UID côté Playwright via `page.evaluate`.
 *   3. L'Admin SDK (bypass des security rules) écrit le doc character à
 *      `users/{uid}/characters/{charId}`.
 *   4. La spec navigue ensuite vers `/character/{charId}` ; le `onSnapshot`
 *      du client SDK voit l'écriture immédiatement.
 *
 * **Isolation** : `workers: 1` dans `playwright.config.ts` + chaque spec
 * obtient un UID anon frais via `signInAnonymously()` (l'émulateur génère
 * un nouvel UID à chaque appel, pas de leak inter-tests).
 *
 * **Pré-requis** : `pnpm e2e:emulators` actif (Firestore + Auth). Sans
 * Java/JRE, l'émulateur ne démarre pas et les specs qui appellent
 * `seedCharacter` skippent via `requireEmulator()` côté caller — pas de
 * faux-vert silencieux.
 */

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────
// Admin SDK setup
// ─────────────────────────────────────────────────────────────────────────

/**
 * Project ID utilisé par l'émulateur (cf. `pnpm e2e:emulators --project demo-grimwar`).
 * L'émulateur Firestore est en `singleProjectMode: true` côté `firebase.json`,
 * donc n'importe quel project-id côté Admin SDK fonctionne tant qu'il est
 * cohérent avec le démarrage de l'émulateur.
 */
const PROJECT_ID = 'demo-grimwar';
const ADMIN_APP_NAME = 'e2e-seed-admin';

/**
 * Init Admin SDK une fois. Les env vars `FIRESTORE_EMULATOR_HOST` +
 * `FIREBASE_AUTH_EMULATOR_HOST` redirigent automatiquement vers l'émulateur
 * — l'Admin SDK ne tentera JAMAIS de joindre la base prod tant qu'ils sont
 * positionnés. On les force ici pour ne pas dépendre d'un setup d'env
 * Playwright (qui n'a pas accès à `.env.local`).
 *
 * Le `credential: cert({ projectId })` est requis par firebase-admin même
 * en mode émulateur (sinon il échoue à l'init faute de credentials). Le
 * `clientEmail` / `privateKey` sont dummy — jamais utilisés en émulateur.
 */
function getAdmin(): { app: App; db: Firestore } {
  process.env.FIRESTORE_EMULATOR_HOST =
    process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST =
    process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';

  const existing = getApps().find((a) => a.name === ADMIN_APP_NAME);
  if (existing) {
    return { app: existing, db: getFirestore(existing) };
  }
  const app = initializeApp(
    {
      projectId: PROJECT_ID,
      credential: cert({
        projectId: PROJECT_ID,
        clientEmail: 'e2e@seed.local',
        // Clé dummy PEM — jamais utilisée par l'émulateur, mais le format est
        // validé par firebase-admin. Pas de risque, le projet est local.
        privateKey:
          '-----BEGIN PRIVATE KEY-----\nMIIBVQIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEAv\n-----END PRIVATE KEY-----\n',
      }),
    },
    ADMIN_APP_NAME,
  );
  return { app, db: getFirestore(app) };
}

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export type AbilityCode = 'for' | 'dex' | 'con' | 'int' | 'sag' | 'cha';
export type DiceMode = 'digital' | 'physical';

/**
 * Sous-choix d'ascendance niveau 1 SRD 5.2.1 (plan 13.7 §0.1 + 13.8).
 * Tous nullable — la fiche tolère les sentinelles via la migration v1→v2.
 */
export interface SeedAncestrySubChoices {
  dragonAncestry?: string;
  tieflingLegacy?: string;
  elfLineage?: string;
  gnomeLineage?: string;
  goliathAncestry?: string;
  ancestryCastingAbility?: 'int' | 'sag' | 'cha';
  ancestryExtraSkill?: string;
  ancestrySize?: 'small' | 'medium';
}

export interface SeedPreset {
  /** Nom affiché en hero card. */
  name: string;
  /** Multi-class supporté ; un seul élément en S1 standard. */
  classes: { classId: string; subclassId: string | null; level: number }[];
  primaryClassId: string;
  ancestryId: string;
  /**
   * Si défini → le doc est écrit en schemaVersion: 2 avec ces sous-choix
   * (et `classes[]` étendu avec les sub-choice sentinels). Si absent → doc
   * v1 legacy (cas des presets fighterL3 / wizardL3 d'origine).
   */
  ancestrySubChoices?: SeedAncestrySubChoices;
  backgroundId: string;
  abilities: Record<AbilityCode, number>;
  hp: { current: number; max: number; temp?: number };
  ac: number;
  speed?: number;
  initiative?: number;
  hitDice?: { classId: string; current: number; max: number; die: 'd6' | 'd8' | 'd10' | 'd12' }[];
  saves?: Partial<Record<AbilityCode, boolean>>;
  /** Sorts connus par classe lanceuse. Inclut cantrips ET sorts niv 1+. */
  knownSpells?: Record<string, string[]>;
  preparedSpells?: Record<string, string[]>;
  spellcastingAbility?: Record<string, AbilityCode>;
  /** Skills pré-maîtrisés (slug, valeur = 1). */
  skills?: Record<string, 1 | 2>;
  /** Items pré-équipés (slug items.json) — utile pour tester les attaques. */
  inventory?: { items: { contentId: string; equipped: boolean; qty?: number }[] };
}

export interface SeededCharacter {
  uid: string;
  charId: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Presets
// ─────────────────────────────────────────────────────────────────────────

/**
 * Guerrier niv. 3, épée courte équipée. Cas de test du Combat mode + dice
 * physique (l'épée courte a `damage.dice = "1d6"` + finesse, donc bonus
 * d'attaque DEX ou FOR).
 */
export const fighterL3: SeedPreset = {
  name: 'Sigrid la Vigile',
  classes: [{ classId: 'fighter', subclassId: null, level: 3 }],
  primaryClassId: 'fighter',
  ancestryId: 'human',
  backgroundId: 'soldier',
  abilities: { for: 16, dex: 14, con: 14, int: 10, sag: 12, cha: 8 },
  hp: { current: 28, max: 28 },
  ac: 13,
  hitDice: [{ classId: 'fighter', current: 3, max: 3, die: 'd10' }],
  saves: { for: true, con: true },
  inventory: {
    items: [
      { contentId: 'dagger', equipped: true, qty: 1 },
      { contentId: 'club', equipped: false, qty: 1 },
    ],
  },
};

/**
 * Drakéide Rouge niv. 1 (plan 13.8). Cas de test du Souffle draconique
 * en mode Combat : carte breath-weapon visible, type Feu, DC = 12.
 */
export const dragonbornL1Red: SeedPreset = {
  name: 'Pyrra de la Forge',
  classes: [{ classId: 'fighter', subclassId: null, level: 1 }],
  primaryClassId: 'fighter',
  ancestryId: 'dragonborn',
  ancestrySubChoices: { dragonAncestry: 'red' },
  backgroundId: 'soldier',
  abilities: { for: 16, dex: 12, con: 14, int: 10, sag: 10, cha: 12 },
  hp: { current: 12, max: 12 },
  ac: 14,
  hitDice: [{ classId: 'fighter', current: 1, max: 1, die: 'd10' }],
  saves: { for: true, con: true },
};

/**
 * Tieffelin Infernal niv. 1 (plan 13.8). Cas de test des Sorts d'héritage
 * en mode Magie : `Trait de feu` visible dans la liste ancestry-spells.
 */
export const tieflingL1Infernal: SeedPreset = {
  name: 'Maelstrom Skye',
  classes: [{ classId: 'rogue', subclassId: null, level: 1 }],
  primaryClassId: 'rogue',
  ancestryId: 'tiefling',
  ancestrySubChoices: {
    tieflingLegacy: 'infernal',
    ancestryCastingAbility: 'cha',
    ancestrySize: 'medium',
  },
  backgroundId: 'criminal',
  abilities: { for: 10, dex: 16, con: 12, int: 12, sag: 10, cha: 14 },
  hp: { current: 9, max: 9 },
  ac: 13,
  hitDice: [{ classId: 'rogue', current: 1, max: 1, die: 'd8' }],
  saves: { dex: true, int: true },
  knownSpells: { ancestry: ['fire-bolt', 'hellish-rebuke', 'darkness'] },
  spellcastingAbility: { ancestry: 'cha' },
};

/**
 * Elfe Drow niv. 1 (plan 13.8). Cas de test des Sorts de lignage en mode
 * Magie : `Danses lumineuses` visible.
 */
export const elfL1Drow: SeedPreset = {
  name: 'Vaelarie Nightveil',
  classes: [{ classId: 'ranger', subclassId: null, level: 1 }],
  primaryClassId: 'ranger',
  ancestryId: 'elf',
  ancestrySubChoices: {
    elfLineage: 'drow',
    ancestryCastingAbility: 'int',
    ancestryExtraSkill: 'perception',
  },
  backgroundId: 'outlander',
  abilities: { for: 12, dex: 16, con: 13, int: 12, sag: 14, cha: 10 },
  hp: { current: 11, max: 11 },
  ac: 13,
  hitDice: [{ classId: 'ranger', current: 1, max: 1, die: 'd10' }],
  saves: { for: true, dex: true },
  knownSpells: { ancestry: ['dancing-lights', 'faerie-fire', 'darkness'] },
  spellcastingAbility: { ancestry: 'int' },
};

/**
 * Gnome des forêts niv. 1 (plan 13.8). Cas de test : `Illusion mineure`
 * visible en mode Magie.
 */
export const gnomeL1Forest: SeedPreset = {
  name: 'Pip Tweedleblossom',
  classes: [{ classId: 'rogue', subclassId: null, level: 1 }],
  primaryClassId: 'rogue',
  ancestryId: 'gnome',
  ancestrySubChoices: {
    gnomeLineage: 'forest',
    ancestryCastingAbility: 'int',
  },
  backgroundId: 'guild-artisan',
  abilities: { for: 8, dex: 16, con: 12, int: 14, sag: 10, cha: 12 },
  hp: { current: 9, max: 9 },
  ac: 13,
  hitDice: [{ classId: 'rogue', current: 1, max: 1, die: 'd8' }],
  saves: { dex: true, int: true },
  knownSpells: { ancestry: ['minor-illusion'] },
  spellcastingAbility: { ancestry: 'int' },
};

/**
 * Goliath Storm niv. 1 (plan 13.8). Cas de test : carte Ascendance gigante
 * visible en mode Combat avec l'effet Tonnerre.
 */
export const goliathL1Storm: SeedPreset = {
  name: 'Bjorn Tonnerre-Lointain',
  classes: [{ classId: 'barbarian', subclassId: null, level: 1 }],
  primaryClassId: 'barbarian',
  ancestryId: 'goliath',
  ancestrySubChoices: { goliathAncestry: 'storm' },
  backgroundId: 'outlander',
  abilities: { for: 16, dex: 12, con: 16, int: 8, sag: 12, cha: 10 },
  hp: { current: 15, max: 15 },
  ac: 13,
  hitDice: [{ classId: 'barbarian', current: 1, max: 1, die: 'd12' }],
  saves: { for: true, con: true },
};

/**
 * Humain Skillful niv. 1 (plan 13.8). Cas de test : skill Perception en
 * plus apparaît dans essence-mode.
 */
export const humanL1Skillful: SeedPreset = {
  name: 'Tara Stormwatch',
  classes: [{ classId: 'fighter', subclassId: null, level: 1 }],
  primaryClassId: 'fighter',
  ancestryId: 'human',
  ancestrySubChoices: {
    ancestrySize: 'medium',
    ancestryExtraSkill: 'perception',
  },
  backgroundId: 'soldier',
  abilities: { for: 14, dex: 14, con: 14, int: 10, sag: 12, cha: 10 },
  hp: { current: 12, max: 12 },
  ac: 13,
  hitDice: [{ classId: 'fighter', current: 1, max: 1, die: 'd10' }],
  saves: { for: true, con: true },
  skills: { perception: 1 },
};

/**
 * Magicien niv. 3, 2 cantrips + 2 sorts niv 1 connus. Cas de test du Magie
 * mode : un caster avec slots débloqués (niv 1 + 2 via la table unifiée) et
 * des sorts effectivement visibles dans la liste.
 */
export const wizardL3: SeedPreset = {
  name: 'Vex le Trame-Songe',
  classes: [{ classId: 'wizard', subclassId: null, level: 3 }],
  primaryClassId: 'wizard',
  ancestryId: 'human',
  backgroundId: 'acolyte',
  abilities: { for: 8, dex: 14, con: 12, int: 16, sag: 13, cha: 10 },
  hp: { current: 18, max: 18 },
  ac: 12,
  hitDice: [{ classId: 'wizard', current: 3, max: 3, die: 'd6' }],
  saves: { int: true, sag: true },
  // IDs vérifiés contre `public/data/spells.json` (les noms FR sont
  // « Amis » / « Aspersion d'acide » / « Alarme » / « Armure de mage »).
  knownSpells: {
    wizard: ['amis', 'aspersion-d-acide', 'alarme', 'armure-de-mage'],
  },
  preparedSpells: {
    wizard: ['alarme', 'armure-de-mage'],
  },
  spellcastingAbility: { wizard: 'int' },
};

// ─────────────────────────────────────────────────────────────────────────
// Build & seed
// ─────────────────────────────────────────────────────────────────────────

/**
 * Construit un payload Character minimal-mais-valide à partir d'un preset.
 * Comble les champs requis par `CharacterSchema` (Zod côté client) ET par
 * `characterShapeOK` (Firestore rules). Conserve une marge sur des fields
 * structurels (skills/spellSlots vides → la fiche les calcule au runtime).
 */
function buildCharacterDoc(preset: SeedPreset, charId: string, uid: string): Record<string, unknown> {
  const totalLevel = preset.classes.reduce((s, c) => s + c.level, 0);
  const initial = preset.name.trim()[0] ?? '?';
  const writeV2 = preset.ancestrySubChoices !== undefined;

  // Classes : v2 ajoute les 7 sentinelles de sous-choix par entrée.
  const classes = writeV2
    ? preset.classes.map((c) => ({
        ...c,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      }))
    : preset.classes;

  const ancestrySubChoices = writeV2
    ? {
        dragonAncestry: preset.ancestrySubChoices?.dragonAncestry ?? null,
        tieflingLegacy: preset.ancestrySubChoices?.tieflingLegacy ?? null,
        elfLineage: preset.ancestrySubChoices?.elfLineage ?? null,
        gnomeLineage: preset.ancestrySubChoices?.gnomeLineage ?? null,
        goliathAncestry: preset.ancestrySubChoices?.goliathAncestry ?? null,
        ancestryCastingAbility:
          preset.ancestrySubChoices?.ancestryCastingAbility ?? null,
        ancestryExtraSkill: preset.ancestrySubChoices?.ancestryExtraSkill ?? null,
        ancestrySize: preset.ancestrySubChoices?.ancestrySize ?? null,
      }
    : undefined;

  const base: Record<string, unknown> = {
    id: charId,
    name: preset.name,
    status: 'alive',
    classes,
    totalLevel,
    primaryClassId: preset.primaryClassId,
    ancestryId: preset.ancestryId,
    backgroundId: preset.backgroundId,
    experience: 0,
    alignment: 'N',
    abilities: preset.abilities,
    saves: {
      for: preset.saves?.for ?? false,
      dex: preset.saves?.dex ?? false,
      con: preset.saves?.con ?? false,
      int: preset.saves?.int ?? false,
      sag: preset.saves?.sag ?? false,
      cha: preset.saves?.cha ?? false,
    },
    skills: preset.skills ?? {},
    hp: { current: preset.hp.current, max: preset.hp.max, temp: preset.hp.temp ?? 0 },
    ac: preset.ac,
    speed: preset.speed ?? 30,
    initiative: preset.initiative ?? 0,
    hitDice: preset.hitDice ?? [],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: preset.preparedSpells ?? {},
    knownSpells: preset.knownSpells ?? {},
    spellcastingAbility: preset.spellcastingAbility ?? {},
    inventory: {
      items: (preset.inventory?.items ?? []).map((it) => ({
        contentId: it.contentId,
        contentScope: 'public',
        qty: it.qty ?? 1,
        equipped: it.equipped,
        attuned: false,
        notes: '',
      })),
      coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 },
      weightCache: 0,
    },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: initial.toUpperCase() },
    schemaVersion: writeV2 ? 2 : 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  };

  // v2 only : ancestrySubChoices. v1 legacy : subancestryId (sentinelle).
  if (writeV2) {
    base.ancestrySubChoices = ancestrySubChoices;
  } else {
    base.subancestryId = null;
  }
  return base;
}

/**
 * Génère un charId déterministe à partir du preset name (pour l'introspection
 * Firestore en cas d'échec) + suffixe random pour éviter les collisions entre
 * specs qui réutilisent le même preset.
 */
function generateCharId(presetName: string): string {
  const slug = presetName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'pj';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug}-${suffix}`;
}

/**
 * Récupère l'UID anon de la page courante. La page DOIT déjà avoir traversé
 * le splash (cf. `waitForAppReady`). Polls jusqu'à 5s pour absorber le délai
 * réseau du sign-in anon contre l'émulateur (en pratique <500ms).
 */
async function readAnonUid(page: Page): Promise<string> {
  const uid = await page.waitForFunction(
    () => {
      const w = window as Window & { __e2eAuthUid?: string | null };
      return w.__e2eAuthUid ?? null;
    },
    null,
    { timeout: 5_000 },
  );
  const resolved = await uid.jsonValue();
  if (typeof resolved !== 'string' || resolved.length === 0) {
    throw new Error(
      '[seedCharacter] window.__e2eAuthUid absent — vérifie que VITE_USE_FIREBASE_EMULATOR=true et que auth-provider expose le hook.',
    );
  }
  return resolved;
}

/**
 * Pose un personnage dans Firestore via l'Admin SDK + retourne `{ uid, charId }`.
 *
 * Usage :
 *
 * ```ts
 * test('combat HP +/-', async ({ page }) => {
 *   await page.goto('/');
 *   await waitForAppReady(page);
 *   const { charId } = await seedCharacter(page, fighterL3);
 *   await page.goto(`/character/${charId}`);
 *   // … assertions Combat
 * });
 * ```
 *
 * Important : `page.goto('/')` + `waitForAppReady` DOIVENT être appelés
 * AVANT `seedCharacter` pour que l'auth anon ait eu le temps d'aboutir et
 * d'exposer `window.__e2eAuthUid`. Si l'émulateur est down, ce hook n'est
 * jamais alimenté et `seedCharacter` throw au bout de 5s — c'est attendu,
 * le caller doit guard via `requireEmulator()`.
 */
export async function seedCharacter(
  page: Page,
  preset: SeedPreset,
  opts: { diceMode?: DiceMode } = {},
): Promise<SeededCharacter> {
  const uid = await readAnonUid(page);
  const charId = generateCharId(preset.name);
  const { db } = getAdmin();

  // Optionnel : poser users/{uid}.settings.diceMode (utile pour dice-physical).
  if (opts.diceMode) {
    await db
      .collection('users')
      .doc(uid)
      .set({ settings: { diceMode: opts.diceMode } }, { merge: true });
  }

  const doc = buildCharacterDoc(preset, charId, uid);
  await db.collection('users').doc(uid).collection('characters').doc(charId).set(doc);

  return { uid, charId };
}
