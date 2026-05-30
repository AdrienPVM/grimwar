import type { CharacterClassEntry } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

/**
 * JALON 2B.4a — Introspection pure : étapes que la modale de level-up doit
 * afficher pour cette classe à ce nouveau niveau.
 *
 * Pur, déterministe : à entrée égale, sortie égale. Aucun IO, aucun accès au
 * runtime React/Zustand. Le caller (LevelUpModal en 2B.4b) consomme le tableau
 * ordonné de `LevelUpStep` et fabrique un sous-écran par étape.
 *
 * Le tri respecte l'ordre logique SRD 5.2.1 d'un level-up :
 *   1. HP roll (toujours présent — average ou rolled)
 *   2. Subclass (uniquement à `newClassLevel === 3` ET subclassId absent)
 *   3. ASI ou feat (uniquement quand la classe a une feature
 *      `Ability Score Improvement` à ce niveau)
 *   4. Cantrips (delta `cantripsKnown[lvl-1] - [lvl-2] > 0`)
 *   5. Spells (delta `spellsKnownOrPrepared[lvl-1] - [lvl-2] > 0` pour les
 *      casters « connus » — Wizard/Cleric/Druid utilisent une formule basée
 *      sur l'ability mod et délèguent le compte au caller via `count: null`
 *      quand le delta théorique n'est pas un nombre fixe)
 *   6. Invocations (Warlock — delta `eldritch-invocations > 0`)
 *
 * Les étapes apparaissent dans l'ordre du tableau retourné. Vide quand le
 * level-up ne demande aucun sous-choix au-delà du HP roll (cas Fighter L2 :
 * juste HP, pas d'ASI, pas de sous-classe, pas de sorts).
 */

export type LevelUpStep =
  | { kind: 'hp-roll' }
  | { kind: 'subclass' }
  | { kind: 'asi-or-feat' }
  | { kind: 'cantrips'; count: number }
  | { kind: 'spells'; count: number }
  | { kind: 'invocations'; count: number }
  /**
   * JALON 2D.4b — Sélecteur de classe à ajouter en multiclass. Affiche la
   * grille des 12 classes SRD avec grey-out + tooltip via
   * `computeMulticlassEligibility`. La sélection est posée dans
   * `LevelUpFlowState.addClassTargetId` par l'action `set-add-class-target`.
   */
  | { kind: 'add-class-pick' }
  /**
   * JALON 2D.4b — Sous-choix L1 de la classe ajoutée. Le composant lit la
   * classe cible dans `LevelUpFlowState.addClassTargetId` puis rend les
   * choosers SRD via `getAddClassL1SubChoiceKeys(targetId)`. La saisie est
   * agrégée dans `LevelUpFlowState.addClassSubChoices` (bloc partiel).
   *
   * HP au multiclass-add est forcé à `average` (audit 2D Décision 2) — pas
   * d'étape `hp-roll` séparée pour ce path ; le builder injecte
   * `hpRoll: { kind: 'average' }` automatiquement.
   */
  | { kind: 'add-class-sub-choices' };

interface LevelUpChoicesParams {
  classEntry: CharacterClassEntry;
  classDefinition: ClassEntity;
  /** Niveau atteint dans CETTE classe (≥ 2, ≤ 20). */
  newClassLevel: number;
}

const ASI_FEATURE_NAME_EN = 'Ability Score Improvement';
/**
 * SRD 5.2.1 (PHB 2024) : à L19 toutes les classes reçoivent « Epic Boon »
 * au lieu d'un « Ability Score Improvement ». Mécaniquement c'est la même
 * étape pour le joueur (choisir un feat — incluant Ability Score Improvement
 * comme feat valide). On traite Epic Boon comme une variante du choix ASI.
 */
const EPIC_BOON_FEATURE_NAME_EN = 'Epic Boon';
const FIGHTER_FIGHTING_STYLE_NAME = /style de combat|fighting style/i;

export function levelUpChoices({
  classEntry,
  classDefinition,
  newClassLevel,
}: LevelUpChoicesParams): LevelUpStep[] {
  if (newClassLevel < 2 || newClassLevel > 20) {
    throw new Error(
      `[levelUpChoices] newClassLevel hors bornes (${newClassLevel}) — attendu 2..20.`,
    );
  }
  if (newClassLevel !== classEntry.level + 1) {
    throw new Error(
      `[levelUpChoices] newClassLevel=${newClassLevel} attendu ${classEntry.level + 1} (level + 1).`,
    );
  }

  const steps: LevelUpStep[] = [{ kind: 'hp-roll' }];

  if (newClassLevel === 3 && !classEntry.subclassId) {
    steps.push({ kind: 'subclass' });
  }

  if (hasAsiAtLevel(classDefinition, newClassLevel)) {
    steps.push({ kind: 'asi-or-feat' });
  }

  const prog = classDefinition.spellProgression;
  if (prog) {
    const cantripDelta = computeDelta(prog.cantripsKnown, newClassLevel);
    if (cantripDelta > 0) steps.push({ kind: 'cantrips', count: cantripDelta });

    if (typeof prog.spellsKnownOrPrepared !== 'string') {
      const spellDelta = computeDelta(prog.spellsKnownOrPrepared, newClassLevel);
      if (spellDelta > 0) steps.push({ kind: 'spells', count: spellDelta });
    }
  }

  const invProg = classDefinition.classResourceProgression?.['eldritch-invocations'];
  if (invProg) {
    const invDelta = computeNumericDelta(invProg, newClassLevel);
    if (invDelta > 0) steps.push({ kind: 'invocations', count: invDelta });
  }

  return steps;
}

/**
 * JALON 2D.4b — Étapes du path « ajouter une nouvelle classe en multiclass ».
 *
 * Séquence fixe en 2 temps :
 *   1. `add-class-pick` — sélection de la classe à ajouter (grey-out via
 *      `computeMulticlassEligibility`).
 *   2. `add-class-sub-choices` — sous-choix L1 de la classe choisie
 *      (Divine Order pour Clerc, Fighting Style pour Guerrier, etc. — cf.
 *      `getAddClassL1SubChoiceKeys`).
 *
 * HP est forcé à `average` au multiclass-add (audit 2D Décision 2) — pas
 * d'étape `hp-roll` ; `buildLevelUpDraft` l'injecte automatiquement.
 *
 * La séquence est statique (ne dépend pas de la classe cible — l'étape de
 * sous-choix se rend différemment selon `addClassTargetId`, pas via une
 * variation du tableau de steps).
 */
export function addClassChoices(): readonly LevelUpStep[] {
  return [{ kind: 'add-class-pick' }, { kind: 'add-class-sub-choices' }];
}

/**
 * Cherche dans `features[]` une entrée au niveau cible dont le nom anglais
 * matche exactement « Ability Score Improvement ». Le SRD 5.2.1 standardise
 * ce nom — Fighter a cependant un ASI bonus à L6 (Combat Master au-delà,
 * mais L6 reste ASI standard) ; cette détection nom-exact suffit pour les 12
 * classes SRD car le nom est uniforme dans `classes.json`.
 *
 * Fighter L1 « Fighting Style » est un don de catégorie Fighting Style — il
 * n'est PAS un ASI au sens du choix « 2 points ou feat ». On l'exclut
 * explicitement même si le bundle utilisait par erreur le mot « Improvement »
 * dans une description.
 */
function hasAsiAtLevel(def: ClassEntity, level: number): boolean {
  return def.features.some((f) => {
    if (f.level !== level) return false;
    const en = f.name.en ?? '';
    if (FIGHTER_FIGHTING_STYLE_NAME.test(en) || FIGHTER_FIGHTING_STYLE_NAME.test(f.name.fr)) {
      return false;
    }
    return en === ASI_FEATURE_NAME_EN || en === EPIC_BOON_FEATURE_NAME_EN;
  });
}

/** Delta `table[newLevel-1] - table[newLevel-2]`, clampé à 0. */
function computeDelta(
  table: readonly number[] | undefined,
  newClassLevel: number,
): number {
  if (!table) return 0;
  const next = table[newClassLevel - 1] ?? 0;
  const prev = table[newClassLevel - 2] ?? 0;
  return Math.max(0, next - prev);
}

/**
 * Variante pour `classResourceProgression` qui peut contenir des entrées
 * textuelles (« d6 », « 1d8 ») au lieu de compteurs numériques. Les entrées
 * non-numériques sont assimilées à 0 — elles décrivent un dé scalable, pas
 * un pool indexable, et ne déclenchent pas d'étape de choix utilisateur.
 */
function computeNumericDelta(
  table: readonly (number | string)[],
  newClassLevel: number,
): number {
  const rawNext = table[newClassLevel - 1];
  const rawPrev = table[newClassLevel - 2];
  const next = typeof rawNext === 'number' ? rawNext : 0;
  const prev = typeof rawPrev === 'number' ? rawPrev : 0;
  return Math.max(0, next - prev);
}
