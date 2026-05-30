import { useMemo, useReducer, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize } from '@/shared/lib/i18n';
import {
  levelUpChoices,
  type LevelUpStep,
} from '@/shared/lib/level-up/level-up-choices';
import {
  buildLevelUpDraft,
  canSubmitFlow,
  initialLevelUpFlowState,
  levelUpFlowReducer,
  type LevelUpFlowState,
} from '@/shared/lib/level-up/level-up-flow';
import type { LevelUpDraft } from '@/shared/lib/level-up/level-up-types';
import { computeFeatAvailability } from '@/shared/lib/rules/feat-availability';
import type { AbilityCode, Character } from '@/shared/types/character';
import type { ClassEntity, Feat, FeatPrerequisite, I18n, Subclass } from '@/shared/types/content';

/**
 * JALON 2B.4c — Coquille UI de la modale de level-up.
 *
 * Compose les briques pures livrées en 2B.4a (`levelUpChoices`) et 2B.4b
 * (`levelUpFlowReducer` + `buildLevelUpDraft`) avec le primitif `DetailModal`
 * du design system pour produire un wizard 1-N étapes pilotable au tap.
 *
 * Périmètre 2B.4c :
 *  - sélection automatique de la classe à monter (= entrée `primaryClass` du
 *    perso ; multi-class est hors scope, repoussé à JALON 2D)
 *  - calcul des étapes via `levelUpChoices`
 *  - rendu d'un sous-écran par étape (HP roll, sous-classe, ASI/feat, sorts,
 *    cantrips, invocations) — formulaires opérationnels sourcés des bundles
 *    publics `useContent`
 *  - validation incrémentale (`canSubmitFlow` borne le bouton « Confirmer »)
 *  - composition finale en `LevelUpDraft` au confirm
 *
 * `onConfirm` reçoit le draft validé. La persistance (Firestore + recompute)
 * est portée par JALON 2B.5 — ce composant ne touche PAS au character store.
 */

interface LevelUpModalProps {
  open: boolean;
  onClose: () => void;
  character: Character;
  classDefinition: ClassEntity;
  onConfirm: (draft: LevelUpDraft) => void;
  /**
   * 2B.5 — Quand la persistance est en cours (parent attend l'ack Firestore),
   * on grise navigation + Confirmer pour empêcher la double-soumission et la
   * fermeture par Escape pendant l'écriture.
   */
  isSubmitting?: boolean;
  /**
   * 2B.5 — Message d'erreur de persistance rendu sous le footer. Reset par le
   * parent à chaque nouvelle tentative.
   */
  submitError?: string | null;
}

export function LevelUpModal({
  open,
  onClose,
  character,
  classDefinition,
  onConfirm,
  isSubmitting = false,
  submitError = null,
}: LevelUpModalProps): JSX.Element | null {
  const titleId = 'level-up-modal-title';

  // Pour 2B.4c : la classe qui monte est la primaire. Multi-class déclaré
  // hors scope 2B (JALON 2D — un sélecteur de classe sera ajouté à ce
  // moment-là sans toucher au reducer ni à `applyLevelUp`, qui acceptent
  // déjà un `classId` paramétrable).
  const classEntry = useMemo(
    () =>
      character.classes.find((c) => c.classId === character.primaryClassId) ??
      character.classes[0],
    [character.classes, character.primaryClassId],
  );

  const newClassLevel = classEntry ? classEntry.level + 1 : 2;

  const steps = useMemo<readonly LevelUpStep[]>(() => {
    if (!classEntry) return [];
    if (classEntry.level >= 20) return [];
    return levelUpChoices({ classEntry, classDefinition, newClassLevel });
  }, [classEntry, classDefinition, newClassLevel]);

  const [state, dispatch] = useReducer(levelUpFlowReducer, initialLevelUpFlowState);

  if (!classEntry) return null;

  const isLast = state.stepIdx >= steps.length - 1;
  const current = steps[state.stepIdx];
  const allFilled = canSubmitFlow(state, steps);

  function handleConfirm(): void {
    if (!allFilled) return;
    if (!classEntry) return;
    const draft = buildLevelUpDraft({
      state,
      classId: classEntry.classId,
      newClassLevel,
    });
    onConfirm(draft);
  }

  // Pendant la persistance, on neutralise onClose pour empêcher la fermeture
  // par Escape / clic backdrop. DetailModal réutilise la prop telle quelle —
  // un no-op suffit, pas besoin de patcher le primitif.
  const safeOnClose = isSubmitting ? () => {} : onClose;

  return (
    <DetailModal
      open={open}
      onClose={safeOnClose}
      titleId={titleId}
      className="max-w-[560px]"
    >
      <header className="border-b border-white-8 px-6 py-4 pr-14">
        <p className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
          Montée de niveau
        </p>
        <h2
          id={titleId}
          className="mt-1 font-display text-[20px] font-black tracking-[-0.02em] text-gold-bright"
        >
          {localize(classDefinition.name)} — Niveau {classEntry.level} → {newClassLevel}
        </h2>
        <StepIndicator stepIdx={state.stepIdx} total={steps.length} />
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {current ? (
          <StepBody
            step={current}
            state={state}
            character={character}
            classDefinition={classDefinition}
            classEntry={classEntry}
            newClassLevel={newClassLevel}
            dispatch={dispatch}
          />
        ) : (
          <p className="font-serif text-body-sm italic text-text-tertiary">
            Aucun choix à faire — confirme la montée de niveau.
          </p>
        )}
      </div>

      <footer className="flex flex-col gap-2 border-t border-white-8 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: 'go-prev' })}
            disabled={state.stepIdx === 0 || isSubmitting}
          >
            Précédent
          </Button>
          {isLast ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              disabled={!allFilled || isSubmitting}
              aria-busy={isSubmitting || undefined}
            >
              {isSubmitting ? 'Application…' : 'Confirmer'}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="md"
              onClick={() => dispatch({ type: 'go-next' })}
              disabled={!isStepFilled(current, state) || isSubmitting}
            >
              Suivant
            </Button>
          )}
        </div>
        {submitError ? (
          <p
            role="alert"
            className="font-serif text-body-sm text-crimson"
          >
            {submitError}
          </p>
        ) : null}
      </footer>
    </DetailModal>
  );
}

function StepIndicator({ stepIdx, total }: { stepIdx: number; total: number }): JSX.Element | null {
  if (total <= 1) return null;
  return (
    <p
      className="mt-2 font-ui text-[10px] uppercase tracking-[0.18em] text-text-tertiary"
      aria-label="Progression de la montée de niveau"
    >
      Étape {stepIdx + 1} / {total}
    </p>
  );
}

interface StepBodyProps {
  step: LevelUpStep;
  state: LevelUpFlowState;
  character: Character;
  classDefinition: ClassEntity;
  classEntry: Character['classes'][number];
  newClassLevel: number;
  dispatch: React.Dispatch<Parameters<typeof levelUpFlowReducer>[1]>;
}

function StepBody(props: StepBodyProps): JSX.Element {
  switch (props.step.kind) {
    case 'hp-roll':
      return <HpRollStep {...props} />;
    case 'subclass':
      return <SubclassStep {...props} />;
    case 'asi-or-feat':
      return <AsiOrFeatStep {...props} />;
    case 'cantrips':
      return <CantripsStep {...props} count={props.step.count} />;
    case 'spells':
      return <SpellsStep {...props} count={props.step.count} />;
    case 'invocations':
      return <InvocationsStep {...props} count={props.step.count} />;
    case 'add-class-pick':
    case 'add-class-sub-choices':
      // JALON 2D.4b — Stubs des steps add-class. Le rendu réel arrive en 2D.4c
      // (intégration UI complète : picker éligibilité + sub-choosers L1). La
      // séquence n'est jamais montée par le LevelUpButton actuel — il n'expose
      // pas encore le mode add-class — donc ce branch n'est pas reachable
      // runtime tant que 2D.4c n'a pas câblé le bouton « Ajouter une classe ».
      return (
        <p className="font-serif text-body-sm italic text-text-tertiary">
          Add-class flow — UI 2D.4c à venir.
        </p>
      );
  }
}

/**
 * Vrai/faux selon que l'étape courante a son input rempli. Permet de griser
 * le bouton « Suivant » tant que l'utilisateur n'a pas saisi l'étape — pour
 * éviter qu'il avance dans la modale puis se retrouve à un bouton confirmer
 * désactivé sans comprendre pourquoi.
 */
function isStepFilled(step: LevelUpStep | undefined, state: LevelUpFlowState): boolean {
  if (!step) return true;
  switch (step.kind) {
    case 'hp-roll':
      return state.hpRoll != null;
    case 'subclass':
      return state.subclassId != null;
    case 'asi-or-feat':
      return state.asiOrFeat != null;
    case 'cantrips':
      return state.newCantrips.length === step.count;
    case 'spells':
      return state.newSpellsKnown.length === step.count;
    case 'invocations':
      return state.newInvocations.length === step.count;
    case 'add-class-pick':
      return state.addClassTargetId != null;
    case 'add-class-sub-choices':
      // Validation dure déléguée à `canSubmitFlow` (qui a accès à `classes`).
      // Ici on libère la nav dès qu'une cible existe — 2D.4c câblera la
      // garde fine via `getMissingAddClassL1SubChoiceKeys` côté Suivant.
      return state.addClassTargetId != null;
  }
}

// ─── Steps ──────────────────────────────────────────────────────────

function HpRollStep({
  classDefinition,
  character,
  state,
  dispatch,
}: StepBodyProps): JSX.Element {
  const conMod = abilityMod(character.abilities.con);
  // SRD 5.2.1 : à partir du L2 le HP gagné = moyenne arrondie haute du hit die
  // de la classe + mod CON. Hit die exprimé en `d6/d8/d10/d12` dans classes.json.
  const hitDieFaces = parseInt(classDefinition.hitDie.replace(/^d/, ''), 10);
  const averageGain = Math.floor(hitDieFaces / 2) + 1 + conMod;
  const rolledValue = state.hpRoll?.kind === 'rolled' ? state.hpRoll.rolled : null;
  return (
    <section aria-labelledby="step-hp-title" className="space-y-4">
      <header>
        <h3
          id="step-hp-title"
          className="font-ui text-[11px] uppercase tracking-[0.18em] text-text-tertiary"
        >
          Points de vie
        </h3>
        <p className="mt-1 font-serif text-body-sm text-text-secondary">
          Choisis comment déterminer ton gain de PV pour ce niveau. La moyenne
          est l'option recommandée par défaut.
        </p>
      </header>
      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => dispatch({ type: 'set-hp-roll', value: { kind: 'average' } })}
          aria-pressed={state.hpRoll?.kind === 'average'}
          className={cn(
            'flex w-full items-center justify-between rounded-card border px-4 py-3 text-left transition-colors ease-base duration-200',
            state.hpRoll?.kind === 'average'
              ? 'border-gold bg-gold-bright/10 text-gold-bright'
              : 'border-white-8 bg-glass text-text hover:border-soft',
          )}
        >
          <span className="font-title text-meta uppercase tracking-[0.16em]">Moyenne</span>
          <span className="font-serif text-body-sm text-text-secondary">+{averageGain} PV</span>
        </button>
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: 'set-hp-roll',
              value: { kind: 'rolled', rolled: averageGain },
            })
          }
          aria-pressed={state.hpRoll?.kind === 'rolled'}
          className={cn(
            'flex w-full items-center justify-between rounded-card border px-4 py-3 text-left transition-colors ease-base duration-200',
            state.hpRoll?.kind === 'rolled'
              ? 'border-gold bg-gold-bright/10 text-gold-bright'
              : 'border-white-8 bg-glass text-text hover:border-soft',
          )}
        >
          <span className="font-title text-meta uppercase tracking-[0.16em]">
            Lancer le dé
          </span>
          <span className="font-serif text-body-sm text-text-secondary">
            {rolledValue != null ? `+${rolledValue} PV` : `${classDefinition.hitDie} + ${conMod}`}
          </span>
        </button>
      </div>
    </section>
  );
}

function SubclassStep({
  classDefinition,
  state,
  dispatch,
}: StepBodyProps): JSX.Element {
  const { data: subclasses, loading } = useContent('subclasses');
  const candidates = useMemo<Subclass[]>(
    () => subclasses.filter((s) => s.classId === classDefinition.id),
    [subclasses, classDefinition.id],
  );

  return (
    <section aria-labelledby="step-subclass-title" className="space-y-4">
      <header>
        <h3
          id="step-subclass-title"
          className="font-ui text-[11px] uppercase tracking-[0.18em] text-text-tertiary"
        >
          Sous-classe
        </h3>
        <p className="mt-1 font-serif text-body-sm text-text-secondary">
          Choisis la voie spécialisée de ton {localize(classDefinition.name)}.
          Ce choix s'applique dès ce niveau.
        </p>
      </header>
      {loading ? (
        <p className="font-serif text-body-sm italic text-text-tertiary">
          Chargement des sous-classes…
        </p>
      ) : candidates.length === 0 ? (
        <p className="font-serif text-body-sm italic text-crimson">
          Aucune sous-classe disponible pour cette classe.
        </p>
      ) : (
        <ul role="radiogroup" aria-label="Sous-classes disponibles" className="grid gap-3">
          {candidates.map((sc) => {
            const checked = state.subclassId === sc.id;
            return (
              <li key={sc.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => dispatch({ type: 'set-subclass', id: sc.id })}
                  className={cn(
                    'flex w-full flex-col gap-1 rounded-card border px-4 py-3 text-left transition-colors ease-base duration-200',
                    checked
                      ? 'border-gold bg-gold-bright/10'
                      : 'border-white-8 bg-glass hover:border-soft',
                  )}
                >
                  <span
                    className={cn(
                      'font-title text-meta uppercase tracking-[0.16em]',
                      checked ? 'text-gold-bright' : 'text-text',
                    )}
                  >
                    {localize(sc.name)}
                  </span>
                  <span className="font-serif text-body-sm text-text-secondary">
                    {localize(sc.description)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const ABILITY_LABELS: Record<AbilityCode, string> = {
  for: 'Force',
  dex: 'Dextérité',
  con: 'Constitution',
  int: 'Intelligence',
  sag: 'Sagesse',
  cha: 'Charisme',
};

function AsiOrFeatStep({
  state,
  character,
  dispatch,
  newClassLevel,
}: StepBodyProps): JSX.Element {
  const { data: feats, loading } = useContent('feats');
  // SRD 5.2.1 (PHB 2024) : à L19 le choix « Epic Boon » tire dans la catégorie
  // `epic-boon`, pas dans `general`. Les autres niveaux ASI (4/6/8/10/12/14/16)
  // tirent dans `general`. Cf. matrice ASI 2C.2.
  const isEpicBoonLevel = newClassLevel === 19;
  const featCategory: 'general' | 'epic-boon' = isEpicBoonLevel ? 'epic-boon' : 'general';
  const candidateFeats = useMemo(
    () => feats.filter((f) => f.category === featCategory),
    [feats, featCategory],
  );
  // 2C-feat-4 : éligibilité par feat → grise le `<option>` + tooltip raison.
  // On évalue contre le perso APRÈS le level-up (totalLevel + 1) — sinon un
  // feat à prereq L4+ resterait grisé pendant le step L3→L4 alors qu'on est
  // précisément en train d'acquérir L4. Mono-class : trivial. Multi-class
  // (2D) : `totalLevel + 1` reste correct car on monte exactement d'un niveau.
  const postLevelUpCharacter = useMemo<Character>(
    () => ({ ...character, totalLevel: character.totalLevel + 1 }),
    [character],
  );
  const availabilityByFeatId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeFeatAvailability>>();
    for (const f of candidateFeats) {
      map.set(f.id, computeFeatAvailability(postLevelUpCharacter, f.prerequisites));
    }
    return map;
  }, [candidateFeats, postLevelUpCharacter]);
  const mode = state.asiOrFeat?.kind ?? null;
  const featLabel = isEpicBoonLevel ? 'Don épique' : 'Don général';

  // Au toggle « Don », auto-pick le premier feat ÉLIGIBLE pour éviter d'amorcer
  // la sélection sur un feat grisé (cas Wizard L4 sur catégorie `general` avec
  // Lutteur en tête de liste).
  const firstAvailableFeatId =
    candidateFeats.find((f) => availabilityByFeatId.get(f.id)?.available)?.id ??
    candidateFeats[0]?.id ??
    '';

  return (
    <section aria-labelledby="step-asi-title" className="space-y-4">
      <header>
        <h3
          id="step-asi-title"
          className="font-ui text-[11px] uppercase tracking-[0.18em] text-text-tertiary"
        >
          {isEpicBoonLevel
            ? 'Amélioration de caractéristique ou don épique'
            : 'Amélioration de caractéristique ou don'}
        </h3>
        <p className="mt-1 font-serif text-body-sm text-text-secondary">
          {isEpicBoonLevel
            ? 'À ce niveau tu peux soit répartir 2 points de caractéristique (+2 sur une stat ou +1/+1 sur deux), soit prendre un don épique à la place.'
            : 'Tu peux soit répartir 2 points de caractéristique (+2 sur une stat ou +1/+1 sur deux), soit prendre un don général à la place.'}
        </p>
      </header>

      <div role="radiogroup" aria-label="Type de bonification" className="flex gap-2">
        <ToggleChip
          checked={mode === 'asi'}
          label="Amélioration"
          onClick={() =>
            dispatch({
              type: 'set-asi-or-feat',
              value: {
                kind: 'asi',
                abilityIncreases: [{ ability: 'for', bonus: 2 }],
              },
            })
          }
        />
        <ToggleChip
          checked={mode === 'feat'}
          label="Don"
          onClick={() =>
            dispatch({
              type: 'set-asi-or-feat',
              value: { kind: 'feat', featId: firstAvailableFeatId },
            })
          }
        />
      </div>

      {mode === 'asi' && (
        <AsiPicker
          state={state}
          onChange={(value) => dispatch({ type: 'set-asi-or-feat', value })}
        />
      )}
      {mode === 'feat' && (
        <FeatPicker
          state={state}
          feats={candidateFeats}
          availabilityByFeatId={availabilityByFeatId}
          loading={loading}
          label={featLabel}
          onChange={(value) => dispatch({ type: 'set-asi-or-feat', value })}
        />
      )}
    </section>
  );
}

function AsiPicker({
  state,
  onChange,
}: {
  state: LevelUpFlowState;
  onChange: (value: { kind: 'asi'; abilityIncreases: { ability: AbilityCode; bonus: 1 | 2 }[] }) => void;
}): JSX.Element {
  const asi = state.asiOrFeat?.kind === 'asi' ? state.asiOrFeat : null;
  const isSplit = (asi?.abilityIncreases.length ?? 1) === 2;
  const primary = asi?.abilityIncreases[0]?.ability ?? 'for';
  const secondary = asi?.abilityIncreases[1]?.ability ?? 'dex';

  return (
    <div className="space-y-3 rounded-card border border-white-8 bg-glass p-4">
      <fieldset className="space-y-2">
        <legend className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
          Mode de répartition
        </legend>
        <label className="flex items-center gap-2 font-serif text-body-sm text-text">
          <input
            type="radio"
            name="asi-mode"
            checked={!isSplit}
            onChange={() => onChange({ kind: 'asi', abilityIncreases: [{ ability: primary, bonus: 2 }] })}
          />
          +2 sur une caractéristique
        </label>
        <label className="flex items-center gap-2 font-serif text-body-sm text-text">
          <input
            type="radio"
            name="asi-mode"
            checked={isSplit}
            onChange={() =>
              onChange({
                kind: 'asi',
                abilityIncreases: [
                  { ability: primary, bonus: 1 },
                  { ability: secondary === primary ? 'dex' : secondary, bonus: 1 },
                ],
              })
            }
          />
          +1 sur deux caractéristiques
        </label>
      </fieldset>
      <label className="block font-serif text-body-sm text-text">
        Caractéristique principale
        <select
          className="mt-1 block w-full rounded-card-sm border border-white-8 bg-glass-2 px-3 py-2 font-serif text-body-sm text-text"
          value={primary}
          onChange={(e) => {
            const ability = e.target.value as AbilityCode;
            if (isSplit) {
              onChange({
                kind: 'asi',
                abilityIncreases: [
                  { ability, bonus: 1 },
                  { ability: secondary === ability ? 'dex' : secondary, bonus: 1 },
                ],
              });
            } else {
              onChange({ kind: 'asi', abilityIncreases: [{ ability, bonus: 2 }] });
            }
          }}
        >
          {(Object.keys(ABILITY_LABELS) as AbilityCode[]).map((a) => (
            <option key={a} value={a}>
              {ABILITY_LABELS[a]}
            </option>
          ))}
        </select>
      </label>
      {isSplit && (
        <label className="block font-serif text-body-sm text-text">
          Caractéristique secondaire
          <select
            className="mt-1 block w-full rounded-card-sm border border-white-8 bg-glass-2 px-3 py-2 font-serif text-body-sm text-text"
            value={secondary}
            onChange={(e) => {
              const ability = e.target.value as AbilityCode;
              onChange({
                kind: 'asi',
                abilityIncreases: [
                  { ability: primary === ability ? 'for' : primary, bonus: 1 },
                  { ability, bonus: 1 },
                ],
              });
            }}
          >
            {(Object.keys(ABILITY_LABELS) as AbilityCode[]).map((a) => (
              <option key={a} value={a}>
                {ABILITY_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

/**
 * Formate un prérequis non satisfait en libellé FR humain pour tooltip / a11y.
 * Garde la sémantique de `computeFeatAvailability` mais reste local au composant
 * (pas de duplication dans le helper règles — c'est du rendu UI).
 */
function formatPrerequisiteReason(prereq: FeatPrerequisite): string {
  switch (prereq.kind) {
    case 'character-level':
      return `Niveau ${prereq.minimum}+ requis`;
    case 'ability-score':
      return `${ABILITY_LABELS[prereq.ability]} ${prereq.minimum}+ requis`;
    case 'spellcasting':
      return 'Capacité à lancer un sort requise';
    case 'class-feature':
      return `Aptitude de classe « ${prereq.featureNameEn} » requise`;
  }
}

function FeatPicker({
  state,
  feats,
  availabilityByFeatId,
  loading,
  label,
  onChange,
}: {
  state: LevelUpFlowState;
  feats: Feat[];
  availabilityByFeatId: Map<string, ReturnType<typeof computeFeatAvailability>>;
  loading: boolean;
  label: string;
  onChange: (value: { kind: 'feat'; featId: string }) => void;
}): JSX.Element {
  const featId = state.asiOrFeat?.kind === 'feat' ? state.asiOrFeat.featId : '';
  return (
    <div className="space-y-3 rounded-card border border-white-8 bg-glass p-4">
      <label className="block font-serif text-body-sm text-text">
        {label}
        {loading ? (
          <p className="mt-1 font-serif text-body-sm italic text-text-tertiary">
            Chargement des dons…
          </p>
        ) : (
          <select
            className="mt-1 block w-full rounded-card-sm border border-white-8 bg-glass-2 px-3 py-2 font-serif text-body-sm text-text"
            value={featId}
            onChange={(e) => onChange({ kind: 'feat', featId: e.target.value })}
          >
            <option value="" disabled>
              Choisir un don…
            </option>
            {feats.map((f) => {
              const availability = availabilityByFeatId.get(f.id);
              const blocked = availability ? !availability.available : false;
              const reasons = availability?.unmetPrerequisites
                .map(formatPrerequisiteReason)
                .join(' · ');
              return (
                <option
                  key={f.id}
                  value={f.id}
                  disabled={blocked}
                  title={blocked ? `Prérequis non rempli — ${reasons}` : undefined}
                >
                  {localize(f.name)}
                  {blocked ? ` — ${reasons}` : ''}
                </option>
              );
            })}
          </select>
        )}
      </label>
    </div>
  );
}

interface PickListStepProps extends StepBodyProps {
  count: number;
}

function CantripsStep({
  classDefinition,
  state,
  dispatch,
  count,
}: PickListStepProps): JSX.Element {
  const { data: spells, loading } = useContent('spells');
  const cantrips = useMemo(
    () =>
      spells.filter(
        (s) => s.level === 0 && s.classes.includes(classDefinition.id),
      ),
    [spells, classDefinition.id],
  );
  return (
    <PickList
      label="Sorts mineurs"
      help={`Choisis ${count} sort${count > 1 ? 's' : ''} mineur${count > 1 ? 's' : ''} supplémentaire${count > 1 ? 's' : ''}.`}
      options={cantrips}
      selected={state.newCantrips}
      max={count}
      loading={loading}
      onChange={(ids) => dispatch({ type: 'set-cantrips', ids })}
    />
  );
}

function SpellsStep({
  classDefinition,
  classEntry,
  state,
  dispatch,
  count,
}: PickListStepProps): JSX.Element {
  const { data: spells, loading } = useContent('spells');
  // Seuls les sorts dans la liste de la classe ET de niveau ≤ casterLevel équivalent
  // sont sélectionnables. Pour la coquille 2B.4c on filtre simplement par niveau
  // ≤ ceil(classLevel/2) (approximation pour les casters connus type Bard/Warlock).
  // Le filtre fin (slots dispo, etc.) reste à raffiner en 2B.5.
  const maxLevel = Math.max(1, Math.ceil((classEntry.level + 1) / 2));
  const candidates = useMemo(
    () =>
      spells.filter(
        (s) =>
          s.level > 0 &&
          s.level <= maxLevel &&
          s.classes.includes(classDefinition.id),
      ),
    [spells, classDefinition.id, maxLevel],
  );
  return (
    <PickList
      label="Sorts"
      help={`Choisis ${count} sort${count > 1 ? 's' : ''} supplémentaire${count > 1 ? 's' : ''} (niveau ≤ ${maxLevel}).`}
      options={candidates}
      selected={state.newSpellsKnown}
      max={count}
      loading={loading}
      onChange={(ids) => dispatch({ type: 'set-spells', ids })}
    />
  );
}

function InvocationsStep({
  classEntry,
  state,
  dispatch,
  count,
}: PickListStepProps): JSX.Element {
  const { data: invocations, loading } = useContent('invocations');
  const newLevel = classEntry.level + 1;
  const candidates = useMemo(
    () =>
      invocations.filter(
        (i) =>
          i.prerequisiteWarlockLevel == null ||
          i.prerequisiteWarlockLevel <= newLevel,
      ),
    [invocations, newLevel],
  );
  return (
    <PickList
      label="Manifestations occultes"
      help={`Choisis ${count} manifestation${count > 1 ? 's' : ''} occulte${count > 1 ? 's' : ''} supplémentaire${count > 1 ? 's' : ''}.`}
      options={candidates}
      selected={state.newInvocations}
      max={count}
      loading={loading}
      onChange={(ids) => dispatch({ type: 'set-invocations', ids })}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

interface PickOption {
  id: string;
  name: I18n;
}

function PickList({
  label,
  help,
  options,
  selected,
  max,
  loading,
  onChange,
}: {
  label: string;
  help: string;
  options: PickOption[];
  selected: string[];
  max: number;
  loading: boolean;
  onChange: (ids: string[]) => void;
}): JSX.Element {
  function toggle(id: string): void {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, id]);
  }
  return (
    <section className="space-y-3">
      <header>
        <h3 className="font-ui text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
          {label}
        </h3>
        <p className="mt-1 font-serif text-body-sm text-text-secondary">{help}</p>
        <p className="mt-1 font-ui text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
          {selected.length} / {max} sélectionné{selected.length > 1 ? 's' : ''}
        </p>
      </header>
      {loading ? (
        <p className="font-serif text-body-sm italic text-text-tertiary">Chargement…</p>
      ) : options.length === 0 ? (
        <p className="font-serif text-body-sm italic text-text-tertiary">
          Aucune option disponible pour ce niveau.
        </p>
      ) : (
        <ul className="grid gap-2">
          {options.map((opt) => {
            const checked = selected.includes(opt.id);
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(opt.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-card border px-3 py-2 text-left transition-colors ease-base duration-200',
                    checked
                      ? 'border-gold bg-gold-bright/10 text-gold-bright'
                      : 'border-white-8 bg-glass text-text hover:border-soft',
                  )}
                >
                  <span className="font-serif text-body-sm">{localize(opt.name)}</span>
                  <span aria-hidden="true" className="font-title text-meta">
                    {checked ? '✓' : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ToggleChip({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        'rounded-pill border px-4 py-2 font-title text-meta uppercase tracking-[0.16em] transition-colors ease-base duration-200',
        checked
          ? 'border-gold bg-gold-bright/10 text-gold-bright'
          : 'border-white-8 bg-glass text-text-secondary hover:border-soft hover:text-text',
      )}
    >
      {label}
    </button>
  );
}

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}
