import { readFileSync } from 'node:fs';

import {
  applyReferenceAbilities,
  applyReferenceEquipment,
  applyReferenceSkills,
  applyReferenceSpells,
  REFERENCE_BUILDS,
} from '@/features/wizard/reference-builds/builds';
import { resolveSkillIds } from '@/features/wizard/steps/skill-resolver';
import { getAncestrySubChoiceRequirements } from '@/features/wizard/steps/ancestry/use-ancestry-sub-choices';
import {
  ROGUE_EXPERTISE_COUNT_L1,
  WARLOCK_INVOCATIONS_COUNT_L1,
  WIZARD_SPELLBOOK_INSCRIBED_COUNT_L1,
  WIZARD_SPELLBOOK_PREPARED_COUNT_L1,
} from '@/shared/lib/rules/class-l1-sub-choices';
import { getEligibleWeaponMasteryIds } from '@/shared/lib/rules/weapon-mastery';
import type { SubmitFromWizardInput } from '@/features/wizard/submit-from-wizard';
import {
  EMPTY_DRAFT,
  type AbilityMethod,
  type WizardClassEntry,
  type WizardDraft,
  type WizardSpellsForClass,
} from '@/shared/lib/slices/wizard-slice';
import {
  EMPTY_ANCESTRY_SUB_CHOICES,
  type AncestrySubChoices,
  type DivineOrder,
  type FightingStyle,
  type PrimalOrder,
} from '@/shared/types/character';
import type {
  Ancestry,
  Background,
  ClassEntity,
  Invocation,
  Item,
  Spell,
} from '@/shared/types/content';

/**
 * Runner combinatoire L1 — plan 13.12 commit 3 (catégorie 2 « vérité du
 * contenu », cœur de la matrice de parcours).
 *
 * Objectif : driver la VRAIE fonction de prod `buildCharacterFromWizard`
 * (via le wrapper `submitWizardAndDeriveSheet` du commit 1) sur un espace de
 * personas L1 généré par COUVERTURE (1 persona représentatif par classe + axes
 * ascendance / background ciblés qui changent un calcul), pas par exhaustivité
 * (décision de cadrage 13.12). Ferme le trou B4 du verdict d'inventaire :
 * `reference-builds.test.ts` ne testait QUE pointBuy=27 + kebab-case, jamais le
 * maillon « build de référence → Character valide ».
 *
 * Tout l'outillage RÉUTILISE les helpers de prod (applyReference*,
 * resolveSkillIds, getEligibleWeaponMasteryIds, getAncestrySubChoiceRequirements,
 * constantes de sous-choix) — aucune réimplémentation de règle. Une dérive de la
 * règle de prod casse donc la matrice, pas seulement un `toBeGreaterThan(0)`.
 *
 * Garde-fou intégrité référentielle : la fonction lit les VRAIS bundles
 * `public/data/*.json`. Un slug de sort / d'arme / d'invocation renommé dans le
 * bundle fait diverger les personas dérivés → la matrice rougit.
 */

export interface MatrixBundles {
  readonly classes: readonly ClassEntity[];
  readonly ancestries: readonly Ancestry[];
  readonly backgrounds: readonly Background[];
  readonly items: readonly Item[];
  readonly spells: readonly Spell[];
  readonly invocations: readonly Invocation[];
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

/** Charge les 6 bundles consommés par le pipeline de création L1. */
export function loadBundles(): MatrixBundles {
  return {
    classes: loadJson<ClassEntity[]>('public/data/classes.json'),
    ancestries: loadJson<Ancestry[]>('public/data/ancestries.json'),
    backgrounds: loadJson<Background[]>('public/data/backgrounds.json'),
    items: loadJson<Item[]>('public/data/items.json'),
    spells: loadJson<Spell[]>('public/data/spells.json'),
    invocations: loadJson<Invocation[]>('public/data/invocations.json'),
  };
}

/**
 * Quotas de sélection de sorts au niveau 1. MIROIR de `spells-step.tsx`
 * (CANTRIP_QUOTA / LEVEL1_QUOTA) — ces tables ne sont pas exportées (elles
 * vivent dans un composant React qu'on n'importe pas dans un runner de test).
 * Source SRD 5.2.1 §spell selection L1. Une dérive de prod sur ces quotas n'est
 * PAS attrapée par la matrice (limite documentée au STOP commit 3) ; la matrice
 * détecte les dérives de BUNDLE et de RÈGLE de build, pas de config de quota.
 */
const CANTRIP_QUOTA_L1: Record<string, number> = {
  wizard: 3,
  sorcerer: 4,
  bard: 2,
  cleric: 3,
  druid: 2,
  warlock: 2,
  paladin: 0,
  ranger: 0,
  fighter: 0,
  monk: 0,
  rogue: 0,
  barbarian: 0,
};

const LEVEL1_QUOTA_L1: Record<string, number> = {
  wizard: WIZARD_SPELLBOOK_INSCRIBED_COUNT_L1, // grimoire de départ = 6 inscrits
  sorcerer: 2,
  bard: 4,
  cleric: 0, // prépare quotidiennement → 0 figé à la création
  druid: 0,
  warlock: 2,
  paladin: 0,
  ranger: 2,
  fighter: 0,
  monk: 0,
  rogue: 0,
  barbarian: 0,
};

/** Sous-choix single-value figés pour les classes qui en exigent un (couverture). */
const DEFAULT_DIVINE_ORDER: DivineOrder = 'protector';
const DEFAULT_PRIMAL_ORDER: PrimalOrder = 'magician';
const DEFAULT_FIGHTING_STYLE: FightingStyle = 'defense';

export interface PersonaSpec {
  /** Label lisible (sert d'identité + de nom de perso). */
  readonly id: string;
  readonly classId: string;
  readonly ancestryId: string;
  readonly backgroundId: string;
  readonly method: AbilityMethod;
  /**
   * Axe documenté que ce persona exerce — sert au rapport STOP, pas à la prod.
   * 'class' = couverture de base, 'ancestry'/'background' = axe ciblé,
   * 'method' = axe « génération de stats » (JALON 2E : 4d6 keep-3 vs manual).
   */
  readonly axis: 'class' | 'ancestry' | 'background' | 'method';
}

/**
 * Construit les sous-choix d'ascendance VALIDES pour l'ancestry donnée en
 * piochant la 1ère valeur admissible de chaque sous-choix requis (les valeurs
 * admissibles viennent du bundle via `getAncestrySubChoiceRequirements` —
 * réutilisation prod, pas de table dupliquée).
 */
function buildAncestrySubChoices(
  ancestryId: string,
  ancestries: readonly Ancestry[],
): AncestrySubChoices {
  const sc: AncestrySubChoices = { ...EMPTY_ANCESTRY_SUB_CHOICES };
  const reqs = getAncestrySubChoiceRequirements(ancestryId, ancestries);
  for (const req of reqs) {
    const value = req.admissibleValues[0];
    if (value == null) continue;
    // Object.assign garde le typage de `sc` ; la valeur est un membre d'enum
    // valide (admissibleValues vient du bundle / des constantes canoniques).
    Object.assign(sc, { [req.key]: value });
  }
  return sc;
}

/** Sorts level 0 / level 1 disponibles pour une classe dans le bundle. */
function spellPoolsFor(
  classId: string,
  spells: readonly Spell[],
): { cantripIds: string[]; level1Ids: string[] } {
  const cantripIds = spells
    .filter((s) => s.level === 0 && s.classes.includes(classId))
    .map((s) => s.id);
  const level1Ids = spells
    .filter((s) => s.level === 1 && s.classes.includes(classId))
    .map((s) => s.id);
  return { cantripIds, level1Ids };
}

/**
 * Construit l'entrée `classes[]` du draft avec ses sous-choix L1 valides.
 * Chaque sous-choix réutilise sa dérivation de prod (weapon masteries éligibles,
 * invocations L1, grimoire). `wizardSpellbookL1` est rempli ici (6 sorts) car
 * c'est un sous-choix de classe ; les sorts préparés/cantrips vont dans
 * `spellsByClass`.
 */
function buildClassEntry(
  classId: string,
  cls: ClassEntity,
  bundles: MatrixBundles,
): { entry: WizardClassEntry; pickedSkills: string[]; spellsByClass: WizardSpellsForClass | null } {
  const allowedSkills = resolveSkillIds([...cls.skillChoices.from]);
  const pickedSkills = applyReferenceSkills(classId, allowedSkills, cls.skillChoices.count);

  // JALON 2A.5 — éligibilité Weapon Mastery désormais portée par la donnée
  // (`cls.weaponMasteryEligibility`). On lit le champ du bundle au lieu de
  // hardcoder un classId — un trou de cohérence côté `extract-srd-classes` ou
  // côté schéma serait immédiatement visible (eligible vide → matrice rouge).
  const weaponMasteries =
    cls.weaponMasteryCount > 0
      ? getEligibleWeaponMasteryIds(
          cls.weaponMasteryEligibility ?? null,
          bundles.items,
          'fr',
        )
          .slice(0, cls.weaponMasteryCount)
          .map((it) => it.id)
      : [];

  // Expertise Roublard : 2 compétences DÉJÀ piquées par la classe (cas-limite
  // cat. 6 — expertise sur compétence déjà maîtrisée = ×2, jamais ×3).
  const expertiseSkills =
    classId === 'rogue' ? pickedSkills.slice(0, ROGUE_EXPERTISE_COUNT_L1) : [];

  const invocationL1 = bundles.invocations
    .filter((inv) => inv.prerequisiteWarlockLevel === null)
    .map((inv) => inv.id);
  const eldritchInvocations =
    classId === 'warlock' ? invocationL1.slice(0, WARLOCK_INVOCATIONS_COUNT_L1) : [];

  // Grimoire Magicien : 6 sorts de niveau 1 inscrits (sous-choix de classe).
  const { cantripIds, level1Ids } = spellPoolsFor(classId, bundles.spells);
  let wizardSpellbookL1: string[] = [];
  let spellsByClass: WizardSpellsForClass | null = null;

  if (cls.spellcasting) {
    const picked = applyReferenceSpells(
      classId,
      cantripIds,
      level1Ids,
      CANTRIP_QUOTA_L1[classId] ?? 0,
      LEVEL1_QUOTA_L1[classId] ?? 0,
    );
    if (classId === 'wizard') {
      // `picked.level1` (6) = grimoire inscrit ; les préparés (4) en sont un
      // sous-ensemble. `knownSpells.wizard` doit refléter le grimoire COMPLET
      // (cas-limite cat. 6 wizard-grimoire) — pas seulement les 4 préparés.
      wizardSpellbookL1 = picked.level1.slice(0, WIZARD_SPELLBOOK_INSCRIBED_COUNT_L1);
      spellsByClass = {
        classId,
        cantrips: picked.cantrips,
        level1: wizardSpellbookL1.slice(0, WIZARD_SPELLBOOK_PREPARED_COUNT_L1),
      };
    } else {
      spellsByClass = { classId, cantrips: picked.cantrips, level1: picked.level1 };
    }
  }

  const entry: WizardClassEntry = {
    classId,
    level: 1,
    clericDivineOrder: classId === 'cleric' ? DEFAULT_DIVINE_ORDER : null,
    druidPrimalOrder: classId === 'druid' ? DEFAULT_PRIMAL_ORDER : null,
    fighterFightingStyle: classId === 'fighter' ? DEFAULT_FIGHTING_STYLE : null,
    weaponMasteries,
    expertiseSkills,
    eldritchInvocations,
    wizardSpellbookL1,
  };

  return { entry, pickedSkills, spellsByClass };
}

export interface PersonaInput {
  readonly spec: PersonaSpec;
  readonly input: SubmitFromWizardInput;
}

/**
 * Construit l'entrée `SubmitFromWizardInput` complète pour un persona. Lève si
 * une classe / ascendance / background du spec est absent du bundle (mauvais
 * spec = erreur de test, pas un verdict de persona).
 */
export function buildPersonaInput(spec: PersonaSpec, bundles: MatrixBundles): PersonaInput {
  const cls = bundles.classes.find((c) => c.id === spec.classId);
  const ancestry = bundles.ancestries.find((a) => a.id === spec.ancestryId);
  const background = bundles.backgrounds.find((b) => b.id === spec.backgroundId);
  if (!cls) throw new Error(`[matrix] classe absente du bundle : ${spec.classId}`);
  if (!ancestry) throw new Error(`[matrix] ascendance absente du bundle : ${spec.ancestryId}`);
  if (!background) throw new Error(`[matrix] background absent du bundle : ${spec.backgroundId}`);

  const { entry, pickedSkills, spellsByClass } = buildClassEntry(spec.classId, cls, bundles);

  const draft: WizardDraft = {
    ...EMPTY_DRAFT,
    name: spec.id,
    level: 1,
    alignment: 'NB',
    classes: [entry],
    primaryClassId: spec.classId,
    ancestryId: spec.ancestryId,
    ancestrySubChoices: buildAncestrySubChoices(spec.ancestryId, bundles.ancestries),
    method: spec.method,
    abilities: applyReferenceAbilities(spec.classId, spec.method),
    backgroundId: spec.backgroundId,
    pickedSkills,
    equipmentChoices: [{ classId: spec.classId, optionIndex: applyReferenceEquipment(spec.classId) }],
    spellsByClass: spellsByClass ? [spellsByClass] : [],
  };

  const input: SubmitFromWizardInput = {
    uid: 'matrix-runner',
    draft,
    classes: [cls],
    ancestry,
    background,
    items: [...bundles.items],
    spells: [...bundles.spells],
  };

  return { spec, input };
}

/**
 * Construit un persona VOLONTAIREMENT invalide (rouge-avant-vert) : un Guerrier
 * dont les Weapon Masteries requises sont vidées. `buildCharacterFromWizard`
 * doit lever sur la garde de sous-choix → snapshot `valid:false` + `errors[]`
 * peuplé. Si un jour cette garde disparaît, le runner cesse de signaler
 * l'invalidité et CE persona vire vert → on le saura.
 */
export function buildInvalidPersonaInput(bundles: MatrixBundles): SubmitFromWizardInput {
  const { input } = buildPersonaInput(
    { id: 'INVALID-fighter-no-mastery', classId: 'fighter', ancestryId: 'dwarf', backgroundId: 'soldier', method: 'standard-array', axis: 'class' },
    bundles,
  );
  return {
    ...input,
    draft: {
      ...input.draft,
      classes: input.draft.classes.map((c) => ({ ...c, weaponMasteries: [] })),
    },
  };
}

/**
 * Espace de personas borné par COUVERTURE (décision de cadrage 13.12).
 *
 * - Couche de base (axe 'class') : 1 persona par classe SRD (12), ascendance
 *   neutre (Nain — aucun sous-choix) + background acolyte, pour exercer le
 *   chemin de sous-choix de CHAQUE classe à travers le vrai build.
 * - Axe ascendance (4) : classes où l'ascendance change un calcul/une source —
 *   Humain Compétent (skill bonus + taille), Tieffelin (3 sorts d'ascendance,
 *   double duty caster), Elfe (cantrip de lignage sur non-caster), Gnome
 *   (cantrips de lignage).
 * - Axe background (3) : background varié sur une classe fixe (Roublard) —
 *   criminel / sage / soldat (acolyte déjà couvert en base).
 *
 * L'axe VARIANT n'est PAS représenté : les 4 variantes 5e
 * (featAtLevel1/flanking/slowHealing/grittyRealism) sont des réglages de
 * campagne NON consommés par `buildCharacterFromWizard` à L1 (aucun feat
 * d'origine n'est accordé dans le build). Le documenter au STOP plutôt que
 * fabriquer des personas qui n'exercent rien.
 */
const BASE_CLASS_IDS = [
  'barbarian',
  'bard',
  'cleric',
  'druid',
  'fighter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
  'sorcerer',
  'warlock',
  'wizard',
] as const;

export const PERSONAS: readonly PersonaSpec[] = [
  ...BASE_CLASS_IDS.map(
    (classId): PersonaSpec => ({
      id: `base-${classId}`,
      classId,
      ancestryId: 'dwarf',
      backgroundId: 'acolyte',
      method: 'standard-array',
      axis: 'class',
    }),
  ),
  // Axe ascendance ciblé.
  { id: 'anc-wizard-human', classId: 'wizard', ancestryId: 'human', backgroundId: 'sage', method: 'standard-array', axis: 'ancestry' },
  { id: 'anc-sorcerer-tiefling', classId: 'sorcerer', ancestryId: 'tiefling', backgroundId: 'acolyte', method: 'standard-array', axis: 'ancestry' },
  { id: 'anc-fighter-elf', classId: 'fighter', ancestryId: 'elf', backgroundId: 'soldier', method: 'standard-array', axis: 'ancestry' },
  { id: 'anc-cleric-gnome', classId: 'cleric', ancestryId: 'gnome', backgroundId: 'acolyte', method: 'standard-array', axis: 'ancestry' },
  // Axe background ciblé (Roublard fixe).
  { id: 'bg-rogue-criminal', classId: 'rogue', ancestryId: 'dwarf', backgroundId: 'criminal', method: 'standard-array', axis: 'background' },
  { id: 'bg-rogue-sage', classId: 'rogue', ancestryId: 'dwarf', backgroundId: 'sage', method: 'standard-array', axis: 'background' },
  { id: 'bg-rogue-soldier', classId: 'rogue', ancestryId: 'dwarf', backgroundId: 'soldier', method: 'standard-array', axis: 'background' },
  // ── Axe méthode de génération de stats (JALON 2E) ──
  // `applyReferenceAbilities` retourne 10/partout pour 'rolled' et 'manual' (cf.
  // builds.ts) ; isAbilitiesValid accepte 10 dans les deux cas. Le pin valide
  // que le pipeline build-from-wizard tolère bien les 4 méthodes — la sémantique
  // « tirage app vs manuel » se teste côté UI (abilities-step-rolled.test.tsx).
  { id: 'method-fighter-rolled', classId: 'fighter', ancestryId: 'dwarf', backgroundId: 'soldier', method: 'rolled', axis: 'method' },
  { id: 'method-fighter-manual', classId: 'fighter', ancestryId: 'dwarf', backgroundId: 'soldier', method: 'manual', axis: 'method' },
];

/* ──────────────────────────────────────────────────────────────────────────
 * GARDE-FOU D'AXE « matrice ≡ bundle » (plan 13.12 commit 4, catégorie C3)
 * ──────────────────────────────────────────────────────────────────────────
 * Remplace l'ancien « 12 classes codées en dur » (`reference-builds.test.ts`)
 * qui N'ÉCHOUAIT PAS sur dérive : il vérifiait que les 12 ids attendus étaient
 * présents, jamais que le registre ÉGALE le bundle. Une 13ᵉ classe ajoutée à
 * `classes.json` sans build de référence ni persona passait inaperçue.
 *
 * Le garde-fou compare l'AXE COUVERT PAR LA MATRICE à l'AXE DU BUNDLE et
 * échoue dur sur toute divergence pertinente. Trois axes, deux régimes :
 *
 *  - classes / backgrounds → ÉGALITÉ BIDIRECTIONNELLE. La matrice prétend
 *    couvrir CHAQUE classe (1 persona base par classe + 1 build de référence)
 *    et CHAQUE background (set S1 verrouillé à 4, tous exercés). Donc bundle ⊆
 *    matrice ET matrice ⊆ bundle. Une entrée ajoutée d'un côté sans l'autre =
 *    échec.
 *  - ancestries → SUBSET (résolution seule). La matrice couvre 5 ancestries
 *    CIBLÉES sur 9 par CONSTRUCTION (couverture, pas exhaustivité — décision de
 *    cadrage 13.12 : on n'exerce que les ancestries qui changent un calcul/une
 *    source). Exiger l'égalité forcerait une persona par ancestrie = exhaustivité
 *    déguisée, contraire au principe. On garde-fou donc contre les FANTÔMES (un
 *    id référencé par la matrice mais renommé/retiré du bundle), pas contre la
 *    non-exhaustivité. ⚠️ Écart documenté vs lettre du plan (« idem ») — voir
 *    rapport STOP commit 4.
 */

/** Différence symétrique entre l'axe couvert par la matrice et l'axe du bundle. */
export function axisDrift(
  matrixIds: readonly string[],
  bundleIds: readonly string[],
): { missingFromMatrix: string[]; phantomInMatrix: string[] } {
  const matrixSet = new Set(matrixIds);
  const bundleSet = new Set(bundleIds);
  return {
    // Présent dans le bundle, absent de la matrice (ex. 13ᵉ classe non couverte).
    missingFromMatrix: [...bundleSet].filter((id) => !matrixSet.has(id)).sort(),
    // Présent dans la matrice, absent du bundle (ex. slug renommé/retiré).
    phantomInMatrix: [...matrixSet].filter((id) => !bundleSet.has(id)).sort(),
  };
}

/** Axe classes couvert : clés du registre `REFERENCE_BUILDS` (source prod). */
export const MATRIX_CLASS_AXIS: readonly string[] = Object.keys(REFERENCE_BUILDS);

/** Axe classes des personas base (doit rester en lockstep avec le registre). */
export const MATRIX_BASE_PERSONA_CLASS_AXIS: readonly string[] = PERSONAS.filter(
  (p) => p.axis === 'class',
).map((p) => p.classId);

/** Axe backgrounds couvert : ids distincts référencés par les personas. */
export const MATRIX_BACKGROUND_AXIS: readonly string[] = [
  ...new Set(PERSONAS.map((p) => p.backgroundId)),
];

/** Axe ancestries couvert : ids distincts référencés par les personas (subset). */
export const MATRIX_ANCESTRY_AXIS: readonly string[] = [
  ...new Set(PERSONAS.map((p) => p.ancestryId)),
];
