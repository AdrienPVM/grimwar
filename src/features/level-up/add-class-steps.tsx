import { useMemo, type JSX } from 'react';

import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize } from '@/shared/lib/i18n';
import type { LevelUpStep } from '@/shared/lib/level-up/level-up-choices';
import type {
  LevelUpFlowState,
  levelUpFlowReducer,
} from '@/shared/lib/level-up/level-up-flow';
import {
  getAddClassL1SubChoiceKeys,
  getMissingAddClassL1SubChoiceKeys,
  getRequiredCount,
  type ClassSubChoiceKey,
} from '@/shared/lib/rules/class-l1-sub-choices';
import {
  computeMulticlassEligibility,
  type MulticlassEligibility,
} from '@/shared/lib/rules/multiclass-eligibility';
import { getEligibleWeaponMasteryIds } from '@/shared/lib/rules/weapon-mastery';
import type {
  AbilityCode,
  Character,
  DivineOrder,
  FightingStyle,
  PrimalOrder,
} from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

/**
 * JALON 2D.4c — Steps add-class extraits de `level-up-modal.tsx` pour aérer
 * la modale (qui dépassait 1300 lignes en combinant level-up + add-class).
 *
 * Composants exportés :
 *  - `AddClassPickerStep` — picker des 12 classes SRD avec grey-out
 *    d'éligibilité (`computeMulticlassEligibility`) + tooltip raison
 *    (pattern FeatPicker, 2C-feat-4).
 *  - `AddClassSubChoicesStep` — sous-choosers L1 de la classe ajoutée.
 *    Cette première itération wire les single-select (Cleric Divine Order,
 *    Druid Primal Order, Fighter Fighting Style). Les multi-select
 *    (weaponMasteries, expertiseSkills, eldritchInvocations, wizardSpellbookL1,
 *    pact-of-the-tome/blade) sont déférés à 2D.4d — `canSubmitFlow` détecte
 *    les manquants via `getMissingAddClassL1SubChoiceKeys` et bloque le
 *    bouton « Confirmer » en attendant.
 *
 * Sorcerer / Bard / Monk : aucun sous-choix L1 SRD → step en mode « rien à
 * choisir », Confirmer immédiatement actif.
 */

export interface AddClassStepProps {
  step: LevelUpStep;
  state: LevelUpFlowState;
  character: Character;
  classDefinition: ClassEntity;
  classEntry: Character['classes'][number];
  newClassLevel: number;
  dispatch: React.Dispatch<Parameters<typeof levelUpFlowReducer>[1]>;
  allClasses: readonly ClassEntity[];
}

const ABILITY_SHORT_LABELS_FR: Record<AbilityCode, string> = {
  for: 'FOR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  sag: 'SAG',
  cha: 'CHA',
};

export function AddClassPickerStep({
  character,
  state,
  dispatch,
  allClasses,
}: AddClassStepProps): JSX.Element {
  const ownedIds = useMemo(
    () => new Set(character.classes.map((c) => c.classId)),
    [character.classes],
  );
  const options = useMemo(() => {
    return allClasses
      .slice()
      .sort((a, b) => localize(a.name).localeCompare(localize(b.name), 'fr'))
      .map((def) => {
        const isOwned = ownedIds.has(def.id);
        const eligibility: MulticlassEligibility = computeMulticlassEligibility(
          character,
          def.multiclassPrerequisite ?? null,
        );
        const blocked = isOwned || !eligibility.eligible;
        const reason = isOwned
          ? 'Classe déjà possédée'
          : !eligibility.eligible
            ? eligibility.unmetScores
                .map(
                  (s) =>
                    `${ABILITY_SHORT_LABELS_FR[s.ability]} ${s.actual}/${s.minimum}`,
                )
                .join(' · ')
            : '';
        return { def, blocked, reason };
      });
  }, [allClasses, character, ownedIds]);

  return (
    <section aria-labelledby="step-add-class-pick-title" className="space-y-4">
      <header>
        <h3
          id="step-add-class-pick-title"
          className="font-ui text-[11px] uppercase tracking-[0.18em] text-text-tertiary"
        >
          Classe à ajouter
        </h3>
        <p className="mt-1 font-serif text-body-sm text-text-secondary">
          Choisis la classe que ton personnage souhaite apprendre. Les classes
          grisées sont indisponibles — survole pour voir la raison.
        </p>
      </header>
      <ul className="grid gap-2">
        {options.map(({ def, blocked, reason }) => {
          const selected = state.addClassTargetId === def.id;
          return (
            <li key={def.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={blocked || undefined}
                disabled={blocked}
                onClick={() => {
                  if (blocked) return;
                  dispatch({ type: 'set-add-class-target', classId: def.id });
                }}
                title={blocked ? `Indisponible — ${reason}` : undefined}
                className={cn(
                  'flex w-full items-center justify-between rounded-card border px-4 py-3 text-left transition-colors ease-base duration-200',
                  blocked
                    ? 'cursor-not-allowed border-white-8 bg-glass-2/40 text-text-tertiary opacity-60'
                    : selected
                      ? 'border-gold bg-gold-bright/10 text-gold-bright'
                      : 'border-white-8 bg-glass text-text hover:border-soft',
                )}
              >
                <span className="font-serif text-body-sm">
                  {localize(def.name)}
                </span>
                {blocked ? (
                  <span className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                    {reason}
                  </span>
                ) : selected ? (
                  <span
                    aria-hidden="true"
                    className="font-title text-meta text-gold-bright"
                  >
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AddClassSubChoicesStep({
  state,
  dispatch,
  allClasses,
}: AddClassStepProps): JSX.Element {
  const targetId = state.addClassTargetId;
  // Hooks toujours appelés AVANT tout early-return pour respecter la règle
  // des hooks (Rules of Hooks). On filtre l'usage après si targetId est null
  // ou la définition introuvable.
  const { data: feats } = useContent('feats');
  const { data: items } = useContent('items');
  const { data: invocations } = useContent('invocations');
  const { data: spells } = useContent('spells');

  const fightingStyleOptions = useMemo(() => {
    return feats
      .filter((f) => f.category === 'fighting-style')
      .map((f) => ({
        id: f.id,
        name: localize(f.name),
        summary: f.summary ? localize(f.summary) : '',
      }));
  }, [feats]);

  const targetDef = targetId
    ? allClasses.find((c) => c.id === targetId) ?? null
    : null;

  // 2D.4d — Weapon Mastery éligibilité data-driven (mirror du wizard chooser).
  const weaponMasteryOptions = useMemo(() => {
    if (!targetDef) return [];
    const eligibility = targetDef.weaponMasteryEligibility ?? null;
    return getEligibleWeaponMasteryIds(eligibility, items, 'fr').map((it) => ({
      id: it.id,
      name: localize(it.name),
      summary: it.masteryProperty ? `Maîtrise · ${it.masteryProperty}` : '',
    }));
  }, [targetDef, items]);
  const weaponMasteryCount = useMemo(
    () =>
      targetId
        ? getRequiredCount(targetId, 'weaponMasteries', allClasses)
        : 0,
    [targetId, allClasses],
  );

  // 2D.4d — Eldritch Invocations (Warlock L1) : filtre
  // `prerequisiteWarlockLevel === null` → 5 invocations éligibles SRD CC.
  const invocationOptions = useMemo(() => {
    return invocations
      .filter((inv) => inv.prerequisiteWarlockLevel === null)
      .sort((a, b) => localize(a.name).localeCompare(localize(b.name), 'fr'))
      .map((inv) => ({
        id: inv.id,
        name: localize(inv.name),
        summary: inv.summary ? localize(inv.summary) : '',
      }));
  }, [invocations]);

  // 2D.4d — Wizard Spellbook L1 : sorts L1 disponibles pour Magicien.
  const wizardSpellbookOptions = useMemo(() => {
    return spells
      .filter((sp) => sp.level === 1 && sp.classes.includes('wizard'))
      .sort((a, b) => localize(a.name).localeCompare(localize(b.name), 'fr'))
      .map((sp) => ({
        id: sp.id,
        name: localize(sp.name),
        summary: sp.school ? `École · ${sp.school}` : '',
      }));
  }, [spells]);

  if (!targetId) {
    return (
      <p className="font-serif text-body-sm italic text-text-tertiary">
        Sélectionne d&apos;abord une classe à l&apos;étape précédente.
      </p>
    );
  }
  if (!targetDef) {
    return (
      <p className="font-serif text-body-sm italic text-crimson">
        Définition introuvable pour « {targetId} ».
      </p>
    );
  }
  const requiredKeys: readonly ClassSubChoiceKey[] =
    getAddClassL1SubChoiceKeys(targetId);
  const className = localize(targetDef.name);

  if (requiredKeys.length === 0) {
    return (
      <section
        aria-labelledby="step-add-class-sub-choices-title"
        className="space-y-4"
      >
        <header>
          <h3
            id="step-add-class-sub-choices-title"
            className="font-ui text-[11px] uppercase tracking-[0.18em] text-text-tertiary"
          >
            Sous-choix L1
          </h3>
        </header>
        <p className="font-serif text-body-sm text-text-secondary">
          {className} n&apos;a aucun sous-choix imposé au niveau 1 — tu peux
          valider directement.
        </p>
      </section>
    );
  }

  const missing = getMissingAddClassL1SubChoiceKeys(
    targetId,
    state.addClassSubChoices,
    allClasses,
  );

  // 2D.4d — Clés wirées avec un chooser fonctionnel. Le reste (Expertise,
  // pact-of-the-tome cantrips/rituals, pact-of-the-blade weapon) reste en
  // banner « à venir » : Expertise dépend des skill proficiencies déjà
  // posées au L1 (UX nestée) ; pact-of-the-* est conditionnel à
  // l'invocation choisie.
  const WIRED_KEYS: ReadonlySet<ClassSubChoiceKey> = new Set([
    'clericDivineOrder',
    'druidPrimalOrder',
    'fighterFightingStyle',
    'weaponMasteries',
    'eldritchInvocations',
    'wizardSpellbookL1',
  ]);
  const hasUnwiredKey = requiredKeys.some((k) => !WIRED_KEYS.has(k));

  return (
    <section
      aria-labelledby="step-add-class-sub-choices-title"
      className="space-y-4"
    >
      <header>
        <h3
          id="step-add-class-sub-choices-title"
          className="font-ui text-[11px] uppercase tracking-[0.18em] text-text-tertiary"
        >
          Sous-choix L1 — {className}
        </h3>
        <p className="mt-1 font-serif text-body-sm text-text-secondary">
          Sélectionne les options de niveau 1 imposées par la classe.
        </p>
      </header>

      {requiredKeys.includes('clericDivineOrder') ? (
        <RadioRowGroup
          legend="Ordre divin"
          options={(targetDef.divineOrders ?? []).map((o) => ({
            id: o.id,
            name: localize(o.name),
            summary: localize(o.summary),
          }))}
          value={state.addClassSubChoices.clericDivineOrder ?? null}
          onChange={(id) =>
            dispatch({
              type: 'patch-add-class-sub-choices',
              patch: { clericDivineOrder: id as DivineOrder },
            })
          }
        />
      ) : null}

      {requiredKeys.includes('druidPrimalOrder') ? (
        <RadioRowGroup
          legend="Ordre primordial"
          options={(targetDef.primalOrders ?? []).map((o) => ({
            id: o.id,
            name: localize(o.name),
            summary: localize(o.summary),
          }))}
          value={state.addClassSubChoices.druidPrimalOrder ?? null}
          onChange={(id) =>
            dispatch({
              type: 'patch-add-class-sub-choices',
              patch: { druidPrimalOrder: id as PrimalOrder },
            })
          }
        />
      ) : null}

      {requiredKeys.includes('fighterFightingStyle') ? (
        <RadioRowGroup
          legend="Style de combat"
          options={fightingStyleOptions}
          value={state.addClassSubChoices.fighterFightingStyle ?? null}
          onChange={(id) =>
            dispatch({
              type: 'patch-add-class-sub-choices',
              patch: { fighterFightingStyle: id as FightingStyle },
            })
          }
        />
      ) : null}

      {requiredKeys.includes('weaponMasteries') ? (
        <MultiSelectChooser
          legend={`Maîtrises d'armes (${weaponMasteryCount})`}
          helper={`Sélectionne ${weaponMasteryCount} armes éligibles à la maîtrise SRD 5.2.1.`}
          options={weaponMasteryOptions}
          values={state.addClassSubChoices.weaponMasteries ?? []}
          count={weaponMasteryCount}
          onChange={(ids) =>
            dispatch({
              type: 'patch-add-class-sub-choices',
              patch: { weaponMasteries: ids },
            })
          }
        />
      ) : null}

      {requiredKeys.includes('eldritchInvocations') ? (
        <MultiSelectChooser
          legend="Invocation occulte (1)"
          helper="Choisis ton invocation occulte initiale. Pact of the Tome / Blade exposeront leurs sous-choix dans une prochaine itération."
          options={invocationOptions}
          values={state.addClassSubChoices.eldritchInvocations ?? []}
          count={1}
          onChange={(ids) =>
            dispatch({
              type: 'patch-add-class-sub-choices',
              patch: { eldritchInvocations: ids },
            })
          }
        />
      ) : null}

      {requiredKeys.includes('wizardSpellbookL1') ? (
        <MultiSelectChooser
          legend="Sorts du grimoire (6 sorts L1)"
          helper="Sélectionne 6 sorts L1 du Magicien à inscrire dans ton grimoire de départ."
          options={wizardSpellbookOptions}
          values={state.addClassSubChoices.wizardSpellbookL1 ?? []}
          count={6}
          onChange={(ids) =>
            dispatch({
              type: 'patch-add-class-sub-choices',
              patch: { wizardSpellbookL1: ids },
            })
          }
        />
      ) : null}

      {hasUnwiredKey ? (
        <div
          role="note"
          className="rounded-card border border-amber/40 bg-amber/10 p-3"
        >
          <p className="font-serif text-body-sm text-text">
            <strong className="font-semibold text-amber">À venir</strong>
            {' — '}les sous-choix conditionnels (Expertise du Roublard, Pact
            of the Tome / Blade de l&apos;Occultiste) seront wirés dans une
            prochaine itération. Confirmer reste bloqué si tu sélectionnes
            une invocation de pact qui requiert ces sous-choix.
          </p>
        </div>
      ) : null}

      {missing.length > 0 ? (
        <p className="font-serif text-body-sm italic text-text-tertiary">
          Encore {missing.length} sous-choix à compléter avant de pouvoir
          confirmer.
        </p>
      ) : null}
    </section>
  );
}

interface MultiSelectChooserProps {
  legend: string;
  helper?: string;
  options: readonly RadioRowGroupOption[];
  values: readonly string[];
  count: number;
  onChange: (ids: string[]) => void;
}

/**
 * 2D.4d — Multi-select borné par `count`. Tap sur option cochée → décoche ;
 * tap sur option non cochée → coche si on a encore de la place, sinon
 * ignore (cartes grisées visuellement quand cap atteint). `aria-live`
 * annonce le ratio sélectionné/requis pour lecteurs d'écran.
 */
function MultiSelectChooser({
  legend,
  helper,
  options,
  values,
  count,
  onChange,
}: MultiSelectChooserProps): JSX.Element {
  const valueSet = useMemo(() => new Set(values), [values]);
  const reachedCap = values.length >= count;
  function toggle(id: string): void {
    if (valueSet.has(id)) {
      onChange(values.filter((v) => v !== id));
      return;
    }
    if (reachedCap) return;
    onChange([...values, id]);
  }
  return (
    <fieldset className="space-y-2 rounded-card border border-white-8 bg-glass-2/40 p-3">
      <legend className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
        {legend}
      </legend>
      {helper ? (
        <p className="font-serif text-meta text-text-secondary">{helper}</p>
      ) : null}
      <p
        className="font-serif text-body-sm text-text-secondary"
        aria-live="polite"
      >
        {values.length} / {count}
      </p>
      <div className="grid gap-2">
        {options.map((opt) => {
          const checked = valueSet.has(opt.id);
          const disabled = !checked && reachedCap;
          return (
            <button
              key={opt.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              onClick={() => toggle(opt.id)}
              className={cn(
                'flex w-full flex-col items-start gap-1 rounded-card border px-3 py-2 text-left transition-colors ease-base duration-200',
                checked
                  ? 'border-gold bg-gold-bright/10 text-gold-bright'
                  : disabled
                    ? 'cursor-not-allowed border-white-8 bg-glass-2/40 text-text-tertiary opacity-60'
                    : 'border-white-8 bg-glass text-text hover:border-soft',
              )}
            >
              <span className="font-serif text-body-sm font-semibold">
                {opt.name}
              </span>
              {opt.summary ? (
                <span className="font-serif text-meta text-text-secondary">
                  {opt.summary}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

interface RadioRowGroupOption {
  id: string;
  name: string;
  summary: string;
}

function RadioRowGroup({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly RadioRowGroupOption[];
  value: string | null;
  onChange: (id: string) => void;
}): JSX.Element {
  return (
    <fieldset className="space-y-2 rounded-card border border-white-8 bg-glass-2/40 p-3">
      <legend className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
        {legend}
      </legend>
      <div className="grid gap-2">
        {options.map((opt) => {
          const checked = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(opt.id)}
              className={cn(
                'flex w-full flex-col items-start gap-1 rounded-card border px-3 py-2 text-left transition-colors ease-base duration-200',
                checked
                  ? 'border-gold bg-gold-bright/10 text-gold-bright'
                  : 'border-white-8 bg-glass text-text hover:border-soft',
              )}
            >
              <span className="font-serif text-body-sm font-semibold">
                {opt.name}
              </span>
              {opt.summary ? (
                <span className="font-serif text-meta text-text-secondary">
                  {opt.summary}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
