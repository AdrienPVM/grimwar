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

import { getApps, initializeApp, type App } from 'firebase-admin/app';
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
 * Pas de `credential` passé à `initializeApp` : avec
 * `FIRESTORE_EMULATOR_HOST` posé, l'Admin SDK route en mode émulateur
 * anonyme. Le SDK 12.7+ a durci la validation de `cert(…)` — passer une
 * clé PEM dummy throw désormais (`Failed to parse private key: Too few
 * bytes to read ASN.1 value`). Comme l'émulateur ignore la signature de
 * toute façon, on retire le `cert(…)` au lieu d'inventer une clé valide.
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

/**
 * Sous-choix de classe niveau 1 SRD 5.2.1 (plan 13.7 §0.1 + 13.9). Injecté
 * **par entrée `classes[]`** — la racine du preset ne porte plus ces champs
 * (le schéma v2 les attache à chaque `CharacterClassEntry`).
 *
 * Tous optionnels — si omis, le seed pose les sentinelles par défaut
 * (`null` / `[]`). Le plan 13.9 commit 4a a besoin de pouvoir injecter
 * `fighterFightingStyle` + `weaponMasteries` côté seed e2e pour que la spec
 * Combat puisse asserter la présence du badge Mastery + de la carte Style.
 */
export interface SeedClassSubChoices {
  clericDivineOrder?: 'protector' | 'thaumaturge';
  druidPrimalOrder?: 'magician' | 'warden';
  fighterFightingStyle?:
    | 'archery'
    | 'defense'
    | 'great-weapon-fighting'
    | 'two-weapon-fighting';
  weaponMasteries?: string[];
  expertiseSkills?: string[];
  eldritchInvocations?: string[];
  wizardSpellbookL1?: string[];
}

export interface SeedClassEntry {
  classId: string;
  subclassId: string | null;
  level: number;
  /** Sous-choix v2 — interprétés seulement si le preset a `ancestrySubChoices`. */
  subChoices?: SeedClassSubChoices;
}

export interface SeedPreset {
  /** Nom affiché en hero card. */
  name: string;
  /** Multi-class supporté ; un seul élément en S1 standard. */
  classes: SeedClassEntry[];
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
 *
 * **Slugs canoniques FR** (plan 13.8b commit 3) — alignés sur
 * `public/data/spells.json`. `AncestrySpellsCard` les résout via
 * `ancestries.json > tieflingLegacies > cantripSpellId` (qui est correct
 * depuis le début) ; `SpellList` (plan 13.8b) les lit directement depuis
 * `knownSpells.ancestry` — d'où la nécessité que ces slugs résolvent dans
 * le bundle spells.json.
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
  knownSpells: {
    ancestry: ['trait-de-feu', 'represailles-infernales', 'tenebres'],
  },
  spellcastingAbility: { ancestry: 'cha' },
};

/**
 * Elfe Drow niv. 1 Roublard (plan 13.8b commit 3). Non-caster pour assurer
 * la cohérence matricielle avec les 2 autres ascendances (Gnome / Tieffelin
 * sont Roublard) et permettre l'assertion « Lancer désactivé » côté modale.
 *
 * Slugs canoniques FR : `lumieres-dansantes`, `lueurs-feeriques`, `tenebres`.
 */
export const elfL1Drow: SeedPreset = {
  name: 'Vaelarie Nightveil',
  classes: [{ classId: 'rogue', subclassId: null, level: 1 }],
  primaryClassId: 'rogue',
  ancestryId: 'elf',
  ancestrySubChoices: {
    elfLineage: 'drow',
    ancestryCastingAbility: 'int',
    ancestryExtraSkill: 'perception',
  },
  backgroundId: 'outlander',
  abilities: { for: 12, dex: 16, con: 13, int: 12, sag: 14, cha: 10 },
  hp: { current: 9, max: 9 },
  ac: 13,
  hitDice: [{ classId: 'rogue', current: 1, max: 1, die: 'd8' }],
  saves: { dex: true, int: true },
  knownSpells: {
    ancestry: ['lumieres-dansantes', 'lueurs-feeriques', 'tenebres'],
  },
  spellcastingAbility: { ancestry: 'int' },
};

/**
 * Gnome des forêts niv. 1 (plan 13.8). Cas de test : `Illusion mineure`
 * visible en mode Magie. Slug canonique FR : `illusion-mineure`.
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
  knownSpells: { ancestry: ['illusion-mineure'] },
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
 * Guerrier niv. 1 avec Style « Défense » + 3 Weapon Masteries (Longsword
 * Sap, Greatsword Graze, Battleaxe Topple) — cas de test plan 13.9 commit
 * 4a : la fiche Combat doit rendre `<FightingStyleCard>` et les badges
 * Mastery sur les armes équipées.
 */
export const fighterL1MasteryDefense: SeedPreset = {
  name: 'Sigrid la Sape',
  classes: [
    {
      classId: 'fighter',
      subclassId: null,
      level: 1,
      subChoices: {
        fighterFightingStyle: 'defense',
        weaponMasteries: ['longsword', 'greatsword', 'battleaxe'],
      },
    },
  ],
  primaryClassId: 'fighter',
  ancestryId: 'human',
  // Présent → seedCharacter écrit en schemaVersion: 2, ce qui active le
  // chemin avec sub-choices côté classes[].
  ancestrySubChoices: {},
  backgroundId: 'soldier',
  abilities: { for: 16, dex: 12, con: 14, int: 10, sag: 10, cha: 10 },
  hp: { current: 12, max: 12 },
  ac: 14,
  hitDice: [{ classId: 'fighter', current: 1, max: 1, die: 'd10' }],
  saves: { for: true, con: true },
  inventory: {
    items: [
      { contentId: 'longsword', equipped: true, qty: 1 },
      { contentId: 'greatsword', equipped: true, qty: 1 },
      { contentId: 'battleaxe', equipped: true, qty: 1 },
    ],
  },
};

/**
 * Clerc niv. 1 Ordre Protecteur (plan 13.9 commit 4c). Cas de test du mode
 * Essence : la carte « Ordre divin : Protecteur » est rendue (issue de
 * `classes.json[cleric].divineOrders[protector]`) et tappable pour ouvrir
 * la modale détail.
 */
export const clericL1Protector: SeedPreset = {
  name: 'Astrid Lumière-Tenace',
  classes: [
    {
      classId: 'cleric',
      subclassId: null,
      level: 1,
      subChoices: { clericDivineOrder: 'protector' },
    },
  ],
  primaryClassId: 'cleric',
  ancestryId: 'human',
  ancestrySubChoices: {},
  backgroundId: 'acolyte',
  abilities: { for: 14, dex: 10, con: 14, int: 10, sag: 16, cha: 12 },
  hp: { current: 10, max: 10 },
  ac: 16,
  hitDice: [{ classId: 'cleric', current: 1, max: 1, die: 'd8' }],
  saves: { sag: true, cha: true },
};

/**
 * Clerc niv. 1 Thaumaturge (plan 13.9 hotfix 4c+1 cantrip → sort mineur).
 * Existe pour capturer la modale d'Ordre divin du Thaumaturge POST-fix bundle,
 * et pour garantir que l'i18n-guard de `DivineOrderCard` reste vert sur
 * l'autre branche que Protecteur.
 */
export const clericL1Thaumaturge: SeedPreset = {
  name: 'Thalrik le Scrute-Astres',
  classes: [
    {
      classId: 'cleric',
      subclassId: null,
      level: 1,
      subChoices: { clericDivineOrder: 'thaumaturge' },
    },
  ],
  primaryClassId: 'cleric',
  ancestryId: 'human',
  ancestrySubChoices: {},
  backgroundId: 'acolyte',
  abilities: { for: 10, dex: 12, con: 14, int: 14, sag: 16, cha: 10 },
  hp: { current: 9, max: 9 },
  ac: 12,
  hitDice: [{ classId: 'cleric', current: 1, max: 1, die: 'd8' }],
  saves: { sag: true, cha: true },
};

/**
 * Druide niv. 1 Ordre Mage (plan 13.9 commit 4c). Parité avec Cleric pour le
 * mode Essence — la carte « Ordre primordial : Mage » est rendue et tappable.
 */
export const druidL1Magician: SeedPreset = {
  name: 'Sylvène la Trame-Forêt',
  classes: [
    {
      classId: 'druid',
      subclassId: null,
      level: 1,
      subChoices: { druidPrimalOrder: 'magician' },
    },
  ],
  primaryClassId: 'druid',
  ancestryId: 'human',
  ancestrySubChoices: {},
  backgroundId: 'hermit',
  abilities: { for: 10, dex: 12, con: 14, int: 12, sag: 16, cha: 10 },
  hp: { current: 10, max: 10 },
  ac: 12,
  hitDice: [{ classId: 'druid', current: 1, max: 1, die: 'd8' }],
  saves: { int: true, sag: true },
};

/**
 * Magicien niv. 1 avec grimoire complet (6 inscrits dont 4 préparés) — cas
 * de test plan 13.9 commit 4c : la fiche Magie rend DEUX sections distinctes
 * « Sorts préparés » (4) et « Grimoire » (2 inscrits non-préparés).
 *
 * Échantillon raisonné par couverture d'écoles (cohérent avec
 * spell-list-wizard-grimoire.test.tsx) :
 *
 *   - **Inscrits (knownSpells.wizard, 6)** : bouclier (abj), projectile-
 *     magique (evo), armure-de-mage (abj), graisse (conj), alarme (abj),
 *     appel-de-familier (conj).
 *   - **Préparés (4 ⊂ inscrits)** : bouclier, projectile-magique,
 *     armure-de-mage, graisse.
 *   - **Inscrits non-préparés (2)** : alarme, appel-de-familier.
 */
export const wizardL1Grimoire: SeedPreset = {
  name: 'Lirael de la Plume-Ardente',
  classes: [
    {
      classId: 'wizard',
      subclassId: null,
      level: 1,
      subChoices: {
        wizardSpellbookL1: [
          'bouclier',
          'projectile-magique',
          'armure-de-mage',
          'graisse',
          'alarme',
          'appel-de-familier',
        ],
      },
    },
  ],
  primaryClassId: 'wizard',
  ancestryId: 'human',
  ancestrySubChoices: {},
  backgroundId: 'sage',
  abilities: { for: 8, dex: 14, con: 12, int: 16, sag: 12, cha: 10 },
  hp: { current: 7, max: 7 },
  ac: 12,
  hitDice: [{ classId: 'wizard', current: 1, max: 1, die: 'd6' }],
  saves: { int: true, sag: true },
  knownSpells: {
    wizard: [
      'bouclier',
      'projectile-magique',
      'armure-de-mage',
      'graisse',
      'alarme',
      'appel-de-familier',
    ],
  },
  preparedSpells: {
    wizard: ['bouclier', 'projectile-magique', 'armure-de-mage', 'graisse'],
  },
  spellcastingAbility: { wizard: 'int' },
};

/**
 * Roublard niv. 1 avec Expertise sur Discrétion + Escamotage (plan 13.9
 * commit 5 — render Essence des compétences avec Expertise).
 *
 * Background `criminal` donne Discrétion + Escamotage en maîtrise simple.
 * Roublard L1 ajoute Expertise sur 2 compétences MAÎTRISÉES — choix typique :
 * doubler la maîtrise de Discrétion + Escamotage (cf. classes.json[rogue]
 * features L1 : « Escamotage et Discrétion sont recommandés si vous en avez
 * la maîtrise »). Cat. 6 « cas-limites » de la testing policy 2026-05-19 :
 * Expertise sur compétence DÉJÀ maîtrisée → valeur finale = 2 (Expertise),
 * pas 3 — la double mention background + classe ne stacke pas.
 *
 * Rogue picks 4 skills (`classSkillCount = 4`) : on prend acrobatics +
 * perception en + des 2 du background pour avoir 4 maîtrises distinctes,
 * dont 2 portent l'Expertise. État final attendu :
 *   - stealth = 2 (Expertise)
 *   - sleight-of-hand = 2 (Expertise)
 *   - acrobatics = 1 (maîtrise)
 *   - perception = 1 (maîtrise)
 *
 * Cat. 4 (calculs de règles) côté spec : avec Dex 14 (+2) et Sag 10 (0)
 * et bonus de maîtrise L1 = +2, on attend :
 *   - Discrétion / Escamotage = +2 (Dex) + 2 × 2 (Expertise) = +6
 *   - Acrobaties = +2 (Dex) + 2 (maîtrise) = +4
 *   - Perception = 0 (Sag) + 2 (maîtrise) = +2
 *
 * Ces chiffres sont assertés EXACTEMENT par la spec e2e Rogue Expertise.
 */
export const rogueL1Expertise: SeedPreset = {
  name: 'Sif des Toits-Brisés',
  classes: [
    {
      classId: 'rogue',
      subclassId: null,
      level: 1,
      subChoices: {
        expertiseSkills: ['stealth', 'sleight-of-hand'],
      },
    },
  ],
  primaryClassId: 'rogue',
  ancestryId: 'human',
  ancestrySubChoices: {},
  backgroundId: 'criminal',
  abilities: { for: 10, dex: 14, con: 12, int: 12, sag: 10, cha: 14 },
  hp: { current: 9, max: 9 },
  ac: 13,
  hitDice: [{ classId: 'rogue', current: 1, max: 1, die: 'd8' }],
  saves: { dex: true, int: true },
  // Maîtrise simple (1) pour acrobaties + perception (picks classe), Expertise
  // (2) pour stealth + sleight-of-hand (overlap classe expertise + background).
  // Le sheet runtime `SkillsList` lit directement `character.skills[skillId]`
  // pour décider du losange (Expertise) vs cercle (maîtrise).
  skills: {
    stealth: 2,
    'sleight-of-hand': 2,
    acrobatics: 1,
    perception: 1,
  },
};

/**
 * Occultiste niv. 1 avec 1 manifestation L1 « Armure d'ombres » (plan 13.9
 * commit 4e). Cas de test du mode Essence — la carte « Manifestations
 * occultes » est rendue et tappable ; la modale détail réutilise la primitive
 * `<OrderDetailModal>` partagée (kindLabel = `Manifestation occulte`).
 *
 * Choix d'invocation : Armure d'ombres. Capacité « lance Armure du mage à
 * volonté » — démontre une mécanique pure (pas de wiring Magie L1 encore
 * câblé, cf. DEBT D12 pour pact-of-the-tome / pact-of-the-chain).
 */
export const warlockL1ArmorOfShadows: SeedPreset = {
  name: 'Velinor du Voile-Mince',
  classes: [
    {
      classId: 'warlock',
      subclassId: null,
      level: 1,
      subChoices: { eldritchInvocations: ['armor-of-shadows'] },
    },
  ],
  primaryClassId: 'warlock',
  ancestryId: 'human',
  ancestrySubChoices: {},
  backgroundId: 'charlatan',
  abilities: { for: 8, dex: 14, con: 13, int: 12, sag: 10, cha: 16 },
  hp: { current: 9, max: 9 },
  ac: 12,
  hitDice: [{ classId: 'warlock', current: 1, max: 1, die: 'd8' }],
  saves: { sag: true, cha: true },
};

/**
 * Occultiste niv. 1 avec 2 manifestations (anticipation level-up, plan 13.9
 * commit 4e). Cat. 6 (cas-limite) de la testing policy : la carte doit gérer
 * N invocations dès maintenant — un Warlock L2 réel posera la 2e, et l'ordre
 * d'affichage doit rester stable (alphabétique FR : Armure < Esprit) sans
 * duplication. Pas dans le périmètre de la sélection wizard L1 (qui force
 * count=1), mais le composant fiche doit le rendre proprement quand la
 * donnée arrive ainsi.
 */
export const warlockL1MultiInvocations: SeedPreset = {
  name: 'Velinor du Voile-Mince',
  classes: [
    {
      classId: 'warlock',
      subclassId: null,
      level: 1,
      subChoices: {
        eldritchInvocations: ['eldritch-mind', 'armor-of-shadows'],
      },
    },
  ],
  primaryClassId: 'warlock',
  ancestryId: 'human',
  ancestrySubChoices: {},
  backgroundId: 'charlatan',
  abilities: { for: 8, dex: 14, con: 13, int: 12, sag: 10, cha: 16 },
  hp: { current: 9, max: 9 },
  ac: 12,
  hitDice: [{ classId: 'warlock', current: 1, max: 1, die: 'd8' }],
  saves: { sag: true, cha: true },
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

  // Classes : v2 ajoute les 7 sentinelles de sous-choix par entrée. Les
  // valeurs explicites du preset (`subChoices.*`) gagnent — pattern utilisé
  // par les specs Combat / Essence / Magie (plan 13.9) pour seed un perso
  // déjà rempli sans rejouer le wizard.
  const classes = writeV2
    ? preset.classes.map((c) => {
        const sc = c.subChoices ?? {};
        return {
          classId: c.classId,
          subclassId: c.subclassId,
          level: c.level,
          clericDivineOrder: sc.clericDivineOrder ?? null,
          druidPrimalOrder: sc.druidPrimalOrder ?? null,
          fighterFightingStyle: sc.fighterFightingStyle ?? null,
          weaponMasteries: sc.weaponMasteries ?? [],
          expertiseSkills: sc.expertiseSkills ?? [],
          eldritchInvocations: sc.eldritchInvocations ?? [],
          wizardSpellbookL1: sc.wizardSpellbookL1 ?? [],
        };
      })
    : preset.classes.map((c) => ({
        classId: c.classId,
        subclassId: c.subclassId,
        level: c.level,
      }));

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
    // `extraLanguages` ajouté en plan 13.9 (sous-choix Roublard 1 langue
    // extra + dette de modèle). Tableau vide par défaut côté seed — les
    // presets l1 actuels ne posent pas de langues supplémentaires.
    extraLanguages: [],
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
