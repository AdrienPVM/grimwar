import { useMemo, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { Checkbox } from '@/shared/components/form';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import type { ClassEntity, Spell } from '@/shared/types/content';

import { applyReferenceSpells } from '../reference-builds/builds';
import { StepIntro } from '../help/help-panel';

/**
 * Étape 8 — Sorts (plan 05 §E.8). Visible uniquement si au moins une classe
 * choisie est lanceuse. Le shell route déjà autour si non-applicable — on peut
 * supposer ici que `caster classes >= 1`.
 *
 * Pour chaque classe lanceuse : une section avec cantrips + sorts de niveau 1.
 * Multi-class : les picks sont conservés par classe pour respecter le data
 * model (knownSpells / preparedSpells keyés par classId).
 */
export function SpellsStep(): JSX.Element {
  const draft = useWizardStore((s) => s.draft);
  const setSpellsForClass = useWizardStore((s) => s.setSpellsForClass);

  const classes = useContent('classes');
  const spells = useContent('spells');

  const casterClasses = useMemo<ClassEntity[]>(() => {
    const ids = new Set(draft.classes.map((c) => c.classId));
    return classes.data.filter((c) => ids.has(c.id) && Boolean(c.spellcasting));
  }, [draft.classes, classes.data]);

  if (casterClasses.length === 0) {
    return (
      <section className="flex flex-col gap-4">
        <StepIntro>{t('wizard.spells.noCaster')}</StepIntro>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <StepIntro>{t('wizard.help.spells.intro')}</StepIntro>

      {casterClasses.map((cls) => (
        <CasterSection
          key={cls.id}
          characterClass={cls}
          spells={spells.data}
          picked={
            draft.spellsByClass.find((s) => s.classId === cls.id) ?? {
              classId: cls.id,
              cantrips: [],
              level1: [],
            }
          }
          onChange={(cantrips, level1) =>
            setSpellsForClass(cls.id, cantrips, level1)
          }
        />
      ))}
    </section>
  );
}

interface CasterSectionProps {
  characterClass: ClassEntity;
  spells: Spell[];
  picked: { classId: string; cantrips: string[]; level1: string[] };
  onChange: (cantrips: string[], level1: string[]) => void;
}

/**
 * Quotas SRD simplifiés au niveau 1 — on n'a pas la table par niveau dans le
 * bundle classes.json. Plan 18 (level-up) câblera les quotas multi-niveau.
 */
const CANTRIP_QUOTA: Record<string, number> = {
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

const LEVEL1_QUOTA: Record<string, number> = {
  wizard: 6, // grimoire de départ
  sorcerer: 2,
  bard: 4,
  cleric: 0, // prépare quotidiennement, à la création on en garde 0
  druid: 0,
  warlock: 2,
  paladin: 0,
  ranger: 2,
  fighter: 0,
  monk: 0,
  rogue: 0,
  barbarian: 0,
};

function CasterSection({
  characterClass,
  spells,
  picked,
  onChange,
}: CasterSectionProps): JSX.Element {
  const cantripList = useMemo(
    () =>
      spells
        .filter((s) => s.level === 0 && s.classes.includes(characterClass.id))
        .sort((a, b) => localize(a.name).localeCompare(localize(b.name))),
    [spells, characterClass.id],
  );
  const level1List = useMemo(
    () =>
      spells
        .filter((s) => s.level === 1 && s.classes.includes(characterClass.id))
        .sort((a, b) => localize(a.name).localeCompare(localize(b.name))),
    [spells, characterClass.id],
  );

  const cantripsQuota = CANTRIP_QUOTA[characterClass.id] ?? 0;
  const level1Quota = LEVEL1_QUOTA[characterClass.id] ?? 0;

  const toggleCantrip = (spellId: string): void => {
    const has = picked.cantrips.includes(spellId);
    if (has) {
      onChange(
        picked.cantrips.filter((s) => s !== spellId),
        picked.level1,
      );
    } else if (picked.cantrips.length < cantripsQuota) {
      onChange([...picked.cantrips, spellId], picked.level1);
    }
  };
  const toggleLevel1 = (spellId: string): void => {
    const has = picked.level1.includes(spellId);
    if (has) {
      onChange(
        picked.cantrips,
        picked.level1.filter((s) => s !== spellId),
      );
    } else if (picked.level1.length < level1Quota) {
      onChange(picked.cantrips, [...picked.level1, spellId]);
    }
  };

  const handleAutoFill = (): void => {
    const next = applyReferenceSpells(
      characterClass.id,
      cantripList.map((s) => s.id),
      level1List.map((s) => s.id),
      cantripsQuota,
      level1Quota,
    );
    onChange(next.cantrips, next.level1);
  };

  return (
    <div className="flex flex-col gap-4 rounded-card border border-soft bg-bg-3/30 p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-display text-display text-gold-bright">
          {localize(characterClass.name)}
        </h3>
        <Button variant="secondary" size="sm" onClick={handleAutoFill}>
          ✨ {t('wizard.action.autofill')}
        </Button>
      </header>

      {cantripsQuota > 0 ? (
        <SpellPickGroup
          title={t('wizard.label.cantrips')}
          quota={cantripsQuota}
          chosen={picked.cantrips}
          options={cantripList}
          onToggle={toggleCantrip}
        />
      ) : null}

      {level1Quota > 0 ? (
        <SpellPickGroup
          title={t('wizard.label.level1Spells')}
          quota={level1Quota}
          chosen={picked.level1}
          options={level1List}
          onToggle={toggleLevel1}
        />
      ) : (
        <p className="font-serif text-[13px] italic text-text-tertiary">
          {t('wizard.spells.preparedDaily')}
        </p>
      )}
    </div>
  );
}

function SpellPickGroup({
  title,
  quota,
  chosen,
  options,
  onToggle,
}: {
  title: string;
  quota: number;
  chosen: string[];
  options: Spell[];
  onToggle: (id: string) => void;
}): JSX.Element {
  return (
    <div>
      <p className={cn('font-title text-meta uppercase tracking-[0.18em] mb-2', 'text-text-secondary')}>
        {title} — {chosen.length} / {quota}
      </p>
      <ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
        {options.map((s) => {
          const isChecked = chosen.includes(s.id);
          const disabled = !isChecked && chosen.length >= quota;
          return (
            <li key={s.id}>
              <Checkbox
                checked={isChecked}
                disabled={disabled}
                onChange={() => onToggle(s.id)}
                label={localize(s.name)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
