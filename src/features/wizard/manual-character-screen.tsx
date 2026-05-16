import { useMemo, useState, type ChangeEvent, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t, type I18nString } from '@/shared/lib/i18n';
import {
  abilityModifier,
  ABILITY_ORDER,
  isValidPointBuy,
  pointBuyCost,
  pointBuyRemaining,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  STANDARD_ARRAY,
} from '@/shared/lib/rules/abilities';
import { maxHp } from '@/shared/lib/rules/multiclass';
import {
  EMPTY_DRAFT,
  useWizardStore,
  type AbilityMethod,
  type WizardDraftItem,
} from '@/shared/lib/slices/wizard-slice';
import { cn } from '@/shared/lib/cn';
import type { AbilityCode } from '@/shared/types/character';
import type {
  Ancestry,
  Background,
  ClassEntity,
  Spell,
  StartingEquipmentChoice,
} from '@/shared/types/content';

import { submitCharacter } from './submit-character';

const SKILLS_FR_TO_KEY: Record<string, string> = {
  Athlétisme: 'athletics',
  Acrobaties: 'acrobatics',
  Discrétion: 'stealth',
  Escamotage: 'sleight-of-hand',
  Arcanes: 'arcana',
  Histoire: 'history',
  Investigation: 'investigation',
  Nature: 'nature',
  Religion: 'religion',
  'Dressage': 'animal-handling',
  Médecine: 'medicine',
  Perception: 'perception',
  Perspicacité: 'insight',
  Survie: 'survival',
  Tromperie: 'deception',
  Intimidation: 'intimidation',
  Persuasion: 'persuasion',
  Représentation: 'performance',
};

export function ManualCharacterScreen(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const draft = useWizardStore((s) => s.draft);
  const setField = useWizardStore((s) => s.setField);
  const setAbility = useWizardStore((s) => s.setAbility);
  const reset = useWizardStore((s) => s.reset);

  const ancestries = useContent('ancestries');
  const classes = useContent('classes');
  const subclasses = useContent('subclasses');
  const backgrounds = useContent('backgrounds');
  const spells = useContent('spells');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const ancestry = useMemo(
    () => ancestries.data.find((a) => a.id === draft.ancestryId) ?? null,
    [ancestries.data, draft.ancestryId],
  );
  const characterClass = useMemo(
    () => classes.data.find((c) => c.id === draft.classId) ?? null,
    [classes.data, draft.classId],
  );
  const background = useMemo(
    () => backgrounds.data.find((b) => b.id === draft.backgroundId) ?? null,
    [backgrounds.data, draft.backgroundId],
  );

  const handleSubmit = async (): Promise<void> => {
    setSubmitError(null);
    if (!user) {
      setSubmitError('Auth non prête.');
      return;
    }
    if (!draft.name.trim()) {
      setSubmitError(t('wizard.error.nameRequired'));
      return;
    }
    if (!ancestry) {
      setSubmitError(t('wizard.error.ancestryRequired'));
      return;
    }
    if (!characterClass) {
      setSubmitError(t('wizard.error.classRequired'));
      return;
    }
    if (!background) {
      setSubmitError(t('wizard.error.backgroundRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitCharacter({
        uid: user.uid,
        draft,
        ancestry,
        characterClass,
        background,
      });
      reset();
      navigate(`/character/${result.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading =
    ancestries.loading || classes.loading || backgrounds.loading || subclasses.loading;

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="font-display text-hero text-gold-bright">{t('wizard.title')}</h1>

      <GlassPanel className="flex flex-col gap-6 p-5 sm:p-7">
        {isLoading && (
          <p className="font-serif text-body-sm text-text-tertiary">Chargement du contenu…</p>
        )}

        <IdentitySection
          name={draft.name}
          level={draft.level}
          alignment={draft.alignment}
          onName={(v): void => setField('name', v)}
          onLevel={(v): void => setField('level', v)}
          onAlignment={(v): void => setField('alignment', v)}
        />

        <Divider />

        <LineageSection
          ancestries={ancestries.data}
          ancestryId={draft.ancestryId}
          onAncestryId={(v): void => setField('ancestryId', v)}
        />

        <Divider />

        <ClassSection
          classes={classes.data}
          subclasses={subclasses.data}
          classId={draft.classId}
          subclassId={draft.subclassId}
          level={draft.level}
          onClassId={(v): void => {
            setField('classId', v);
            setField('subclassId', null);
            // Reset starting equipment selection when class changes.
            setField('classOptionIndex', 0);
            setField('inventoryDraft', []);
          }}
          onSubclassId={(v): void => setField('subclassId', v)}
        />

        <Divider />

        <BackgroundSection
          backgrounds={backgrounds.data}
          backgroundId={draft.backgroundId}
          onBackgroundId={(v): void => setField('backgroundId', v)}
        />

        <Divider />

        <AbilitiesSection
          method={draft.method}
          abilities={draft.abilities}
          onMethod={(v): void => setField('method', v)}
          onAbility={(c, v): void => setAbility(c, v)}
          ancestry={ancestry}
        />

        <Divider />

        <CombatSection
          characterClass={characterClass}
          ancestry={ancestry}
          conMod={abilityModifier(draft.abilities.con)}
          dexMod={abilityModifier(draft.abilities.dex)}
          level={draft.level}
          hpOverride={draft.hpOverride}
          acOverride={draft.acOverride}
          onHpOverride={(v): void => setField('hpOverride', v)}
          onAcOverride={(v): void => setField('acOverride', v)}
        />

        <Divider />

        <ProficienciesSection
          characterClass={characterClass}
          pickedSkills={draft.pickedSkills}
          onTogglePickedSkill={(skill): void => {
            const exists = draft.pickedSkills.includes(skill);
            const next = exists
              ? draft.pickedSkills.filter((s) => s !== skill)
              : [...draft.pickedSkills, skill];
            setField('pickedSkills', next);
          }}
        />

        <Divider />

        <SpellsSection
          characterClass={characterClass}
          spells={spells.data}
          pickedCantrips={draft.pickedCantrips}
          pickedSpellsLevel1={draft.pickedSpellsLevel1}
          onPickedCantrips={(v): void => setField('pickedCantrips', v)}
          onPickedSpellsLevel1={(v): void => setField('pickedSpellsLevel1', v)}
        />

        <Divider />

        <EquipmentSection
          characterClass={characterClass}
          background={background}
          classOptionIndex={draft.classOptionIndex}
          inventoryDraft={draft.inventoryDraft}
          startingCoinsGp={draft.startingCoinsGp}
          onClassOption={(i): void => {
            setField('classOptionIndex', i);
            // Re-derive draft inventory items from the picked option + background.
            const opt = characterClass?.startingEquipment.options[i];
            const fromClass: WizardDraftItem[] = opt
              ? opt.items.map((it) => ({
                  contentId: it.itemId,
                  qty: it.qty,
                  origin: 'class' as const,
                }))
              : [];
            const fromBg: WizardDraftItem[] = background
              ? background.equipment.map((it) => ({
                  contentId: it.itemId,
                  qty: it.qty,
                  origin: 'background' as const,
                }))
              : [];
            setField('inventoryDraft', [...fromClass, ...fromBg]);
            const classCoins = opt?.coins?.qty ?? 0;
            const bgCoins = background?.startingCoins?.qty ?? 0;
            setField('startingCoinsGp', classCoins + bgCoins);
          }}
        />

        <Divider />

        {submitError && (
          <p className="font-serif text-body-sm text-rose-300" role="alert">
            {submitError}
          </p>
        )}

        <div className="sticky bottom-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={(): void => reset()}>
            {t('wizard.button.reset')}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('wizard.button.creating') : t('wizard.button.create')}
          </Button>
        </div>
        <p className="text-center font-serif text-body-xs text-text-tertiary">
          {t('wizard.notice.draftSaved')}
        </p>
      </GlassPanel>
    </main>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label
      htmlFor={htmlFor}
      className="font-serif text-body-sm text-text-tertiary uppercase tracking-wider"
    >
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <h2 className="font-display text-display-sm text-gold-bright">{children}</h2>
  );
}

function IdentitySection({
  name,
  level,
  alignment,
  onName,
  onLevel,
  onAlignment,
}: {
  name: string;
  level: number;
  alignment: string;
  onName: (v: string) => void;
  onLevel: (v: number) => void;
  onAlignment: (v: string) => void;
}): JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{t('wizard.section.identity')}</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <FieldLabel htmlFor="wiz-name">{t('wizard.field.name')}</FieldLabel>
          <input
            id="wiz-name"
            type="text"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>): void => onName(e.target.value)}
            placeholder={t('wizard.placeholder.name')}
            className="rounded-md border border-bronze/30 bg-bg-deep/40 px-3 py-2 font-serif text-body-md text-text-primary placeholder:text-text-tertiary focus:border-gold-bright focus:outline-none"
            maxLength={60}
          />
        </div>
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="wiz-level">{t('wizard.field.level')}</FieldLabel>
          <select
            id="wiz-level"
            value={level}
            onChange={(e): void => onLevel(Number(e.target.value))}
            className="rounded-md border border-bronze/30 bg-bg-deep/40 px-3 py-2 font-serif text-body-md text-text-primary focus:border-gold-bright focus:outline-none"
          >
            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-3">
          <FieldLabel htmlFor="wiz-alignment">{t('wizard.field.alignment')}</FieldLabel>
          <select
            id="wiz-alignment"
            value={alignment}
            onChange={(e): void => onAlignment(e.target.value)}
            className="rounded-md border border-bronze/30 bg-bg-deep/40 px-3 py-2 font-serif text-body-md text-text-primary focus:border-gold-bright focus:outline-none"
          >
            {['LB', 'NB', 'CB', 'LN', 'N', 'CN', 'LM', 'NM', 'CM'].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

function LineageSection({
  ancestries,
  ancestryId,
  onAncestryId,
}: {
  ancestries: Ancestry[];
  ancestryId: string | null;
  onAncestryId: (v: string | null) => void;
}): JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{t('wizard.section.lineage')}</SectionTitle>
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor="wiz-ancestry">{t('wizard.field.ancestry')}</FieldLabel>
        <select
          id="wiz-ancestry"
          value={ancestryId ?? ''}
          onChange={(e): void => onAncestryId(e.target.value || null)}
          className="rounded-md border border-bronze/30 bg-bg-deep/40 px-3 py-2 font-serif text-body-md text-text-primary focus:border-gold-bright focus:outline-none"
        >
          <option value="">{t('wizard.placeholder.choose')}</option>
          {ancestries
            .slice()
            .sort((a, b) => localize(a.name).localeCompare(localize(b.name)))
            .map((a) => (
              <option key={a.id} value={a.id}>
                {localize(a.name)}
              </option>
            ))}
        </select>
      </div>
    </section>
  );
}

function ClassSection({
  classes,
  subclasses,
  classId,
  subclassId,
  level,
  onClassId,
  onSubclassId,
}: {
  classes: ClassEntity[];
  subclasses: { id: string; classId: string; name: I18nString }[];
  classId: string | null;
  subclassId: string | null;
  level: number;
  onClassId: (v: string | null) => void;
  onSubclassId: (v: string | null) => void;
}): JSX.Element {
  const eligibleSubclasses = subclasses.filter((s) => s.classId === classId);
  const showSubclass = level >= 3 && classId !== null;
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{t('wizard.section.class')}</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="wiz-class">{t('wizard.field.class')}</FieldLabel>
          <select
            id="wiz-class"
            value={classId ?? ''}
            onChange={(e): void => onClassId(e.target.value || null)}
            className="rounded-md border border-bronze/30 bg-bg-deep/40 px-3 py-2 font-serif text-body-md text-text-primary focus:border-gold-bright focus:outline-none"
          >
            <option value="">{t('wizard.placeholder.choose')}</option>
            {classes
              .slice()
              .sort((a, b) => localize(a.name).localeCompare(localize(b.name)))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {localize(c.name)}
                </option>
              ))}
          </select>
        </div>
        {showSubclass && (
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="wiz-subclass">{t('wizard.field.subclass')}</FieldLabel>
            <select
              id="wiz-subclass"
              value={subclassId ?? ''}
              onChange={(e): void => onSubclassId(e.target.value || null)}
              className="rounded-md border border-bronze/30 bg-bg-deep/40 px-3 py-2 font-serif text-body-md text-text-primary focus:border-gold-bright focus:outline-none"
            >
              <option value="">{t('wizard.placeholder.choose')}</option>
              {eligibleSubclasses.map((s) => (
                <option key={s.id} value={s.id}>
                  {localize(s.name)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </section>
  );
}

function BackgroundSection({
  backgrounds,
  backgroundId,
  onBackgroundId,
}: {
  backgrounds: Background[];
  backgroundId: string | null;
  onBackgroundId: (v: string | null) => void;
}): JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{t('wizard.section.background')}</SectionTitle>
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor="wiz-bg">{t('wizard.field.background')}</FieldLabel>
        <select
          id="wiz-bg"
          value={backgroundId ?? ''}
          onChange={(e): void => onBackgroundId(e.target.value || null)}
          className="rounded-md border border-bronze/30 bg-bg-deep/40 px-3 py-2 font-serif text-body-md text-text-primary focus:border-gold-bright focus:outline-none"
        >
          <option value="">{t('wizard.placeholder.choose')}</option>
          {backgrounds
            .slice()
            .sort((a, b) => localize(a.name).localeCompare(localize(b.name)))
            .map((b) => (
              <option key={b.id} value={b.id}>
                {localize(b.name)}
              </option>
            ))}
        </select>
      </div>
    </section>
  );
}

function AbilitiesSection({
  method,
  abilities,
  onMethod,
  onAbility,
  ancestry,
}: {
  method: AbilityMethod;
  abilities: Record<AbilityCode, number>;
  onMethod: (v: AbilityMethod) => void;
  onAbility: (code: AbilityCode, value: number) => void;
  ancestry: Ancestry | null;
}): JSX.Element {
  const remaining = pointBuyRemaining(abilities);
  const valid = method === 'point-buy' ? isValidPointBuy(abilities) : true;
  // ASI from ancestry (SRD 2024 puts ASI on backgrounds, not species — kept here for legacy data).
  const ancestryBonus: Record<AbilityCode, number> = {
    for: 0, dex: 0, con: 0, int: 0, sag: 0, cha: 0,
  };
  for (const asi of ancestry?.abilityScoreIncrease ?? []) {
    ancestryBonus[asi.ability] += asi.bonus;
  }
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{t('wizard.section.abilities')}</SectionTitle>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <FieldLabel>{t('wizard.field.method')}</FieldLabel>
        <div className="flex gap-1">
          {(['standard-array', 'point-buy', 'manual'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={(): void => onMethod(m)}
              className={cn(
                'rounded-md border px-3 py-1.5 font-serif text-body-sm transition-colors',
                method === m
                  ? 'border-gold-bright/60 bg-gold-bright/10 text-gold-bright'
                  : 'border-bronze/30 bg-bg-deep/40 text-text-tertiary hover:text-text-primary',
              )}
            >
              {t(`wizard.method.${m}`)}
            </button>
          ))}
        </div>
      </div>
      {method === 'standard-array' && (
        <p className="font-serif text-body-xs text-text-tertiary">
          {t('wizard.label.from')} {STANDARD_ARRAY.join(', ')}
        </p>
      )}
      {method === 'point-buy' && (
        <p
          className={cn(
            'font-serif text-body-xs',
            valid ? 'text-text-tertiary' : 'text-rose-300',
          )}
          aria-live="polite"
        >
          {t('wizard.label.pointsRemaining')}: {remaining}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {ABILITY_ORDER.map((code) => {
          const score = abilities[code];
          const bonus = ancestryBonus[code];
          const total = score + bonus;
          const mod = abilityModifier(total);
          const cost = method === 'point-buy' ? pointBuyCost(score) : null;
          return (
            <div
              key={code}
              className="grid grid-cols-[6rem,1fr,4rem,5rem] items-center gap-2"
            >
              <span className="font-serif text-body-sm text-text-tertiary">
                {t(`ability.${code}`)}
              </span>
              <input
                type="number"
                min={method === 'point-buy' ? POINT_BUY_MIN : 3}
                max={method === 'point-buy' ? POINT_BUY_MAX : 20}
                value={score}
                onChange={(e): void => onAbility(code, Number(e.target.value) || 0)}
                className="rounded-md border border-bronze/30 bg-bg-deep/40 px-2 py-1 font-serif text-body-md text-text-primary focus:border-gold-bright focus:outline-none"
              />
              <span className="text-right font-serif text-body-xs text-text-tertiary">
                {bonus > 0 && `+${bonus}`}
                {bonus < 0 && bonus}
              </span>
              <span className="text-right font-display text-body-md text-gold-bright">
                {total} <span className="text-body-xs text-text-tertiary">({mod >= 0 ? '+' : ''}{mod})</span>
                {cost !== null && cost !== Infinity && (
                  <span className="ml-1 text-body-xs text-text-tertiary">[{cost}]</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CombatSection({
  characterClass,
  ancestry,
  conMod,
  dexMod,
  level,
  hpOverride,
  acOverride,
  onHpOverride,
  onAcOverride,
}: {
  characterClass: ClassEntity | null;
  ancestry: Ancestry | null;
  conMod: number;
  dexMod: number;
  level: number;
  hpOverride: number | null;
  acOverride: number | null;
  onHpOverride: (v: number | null) => void;
  onAcOverride: (v: number | null) => void;
}): JSX.Element {
  const computedHp = characterClass
    ? maxHp({
        classes: [{ classId: characterClass.id, level, die: characterClass.hitDie }],
        primaryClassId: characterClass.id,
        conMod,
      })
    : 0;
  const computedAc = 10 + dexMod;
  const speed = ancestry?.speed ?? 30;
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{t('wizard.section.combat')}</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberOverrideField
          label={t('wizard.field.hp')}
          computed={computedHp}
          override={hpOverride}
          onOverride={onHpOverride}
        />
        <NumberOverrideField
          label={t('wizard.field.ac')}
          computed={computedAc}
          override={acOverride}
          onOverride={onAcOverride}
        />
        <ReadonlyField label={t('wizard.field.initiative')} value={dexMod >= 0 ? `+${dexMod}` : `${dexMod}`} />
        <ReadonlyField label={t('wizard.field.speed')} value={`${speed} ft`} />
      </div>
    </section>
  );
}

function NumberOverrideField({
  label,
  computed,
  override,
  onOverride,
}: {
  label: string;
  computed: number;
  override: number | null;
  onOverride: (v: number | null) => void;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        min={0}
        value={override ?? computed}
        onChange={(e): void => {
          const n = Number(e.target.value);
          onOverride(n === computed ? null : n);
        }}
        className="rounded-md border border-bronze/30 bg-bg-deep/40 px-3 py-2 font-serif text-body-md text-text-primary focus:border-gold-bright focus:outline-none"
      />
      {override !== null && override !== computed && (
        <span className="font-serif text-body-xs text-text-tertiary">calc. {computed}</span>
      )}
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      <span className="rounded-md border border-bronze/20 bg-bg-deep/20 px-3 py-2 font-serif text-body-md text-text-primary">
        {value}
      </span>
    </div>
  );
}

function ProficienciesSection({
  characterClass,
  pickedSkills,
  onTogglePickedSkill,
}: {
  characterClass: ClassEntity | null;
  pickedSkills: string[];
  onTogglePickedSkill: (skill: string) => void;
}): JSX.Element {
  if (!characterClass) {
    return (
      <section className="flex flex-col gap-2">
        <SectionTitle>{t('wizard.section.proficiencies')}</SectionTitle>
        <p className="font-serif text-body-xs text-text-tertiary">
          {t('wizard.placeholder.choose')} {t('wizard.field.class')}.
        </p>
      </section>
    );
  }
  const choices = characterClass.skillChoices;
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{t('wizard.section.proficiencies')}</SectionTitle>
      <p className="font-serif text-body-xs text-text-tertiary">
        {t('wizard.label.skillsToPick')} : {choices.count} {t('wizard.label.from')} {choices.from.length}
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {choices.from.map((s) => {
          const checked = pickedSkills.includes(s);
          const disabled = !checked && pickedSkills.length >= choices.count;
          return (
            <label
              key={s}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 font-serif text-body-sm transition-colors',
                checked
                  ? 'border-gold-bright/60 bg-gold-bright/10 text-gold-bright'
                  : 'border-bronze/30 bg-bg-deep/40 text-text-tertiary',
                disabled && 'opacity-50',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(): void => onTogglePickedSkill(s)}
                className="accent-gold-bright"
              />
              <span>{s}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function SpellsSection({
  characterClass,
  spells,
  pickedCantrips,
  pickedSpellsLevel1,
  onPickedCantrips,
  onPickedSpellsLevel1,
}: {
  characterClass: ClassEntity | null;
  spells: Spell[];
  pickedCantrips: string[];
  pickedSpellsLevel1: string[];
  onPickedCantrips: (v: string[]) => void;
  onPickedSpellsLevel1: (v: string[]) => void;
}): JSX.Element {
  const isCaster = characterClass?.spellcasting !== null;
  if (!characterClass || !isCaster) {
    return (
      <section className="flex flex-col gap-2">
        <SectionTitle>{t('wizard.section.spells')}</SectionTitle>
        <p className="font-serif text-body-xs text-text-tertiary">
          {t('wizard.notice.spellcasterOnly')}
        </p>
      </section>
    );
  }
  const filterByClass = (s: Spell): boolean => s.classes.includes(characterClass.id);
  const cantrips = spells.filter((s) => s.level === 0 && filterByClass(s));
  const level1 = spells.filter((s) => s.level === 1 && filterByClass(s));
  const toggle = (id: string, current: string[], setter: (v: string[]) => void): void => {
    setter(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{t('wizard.section.spells')}</SectionTitle>
      <SpellPicker
        title={t('wizard.label.cantrips')}
        spells={cantrips}
        selected={pickedCantrips}
        onToggle={(id): void => toggle(id, pickedCantrips, onPickedCantrips)}
      />
      <SpellPicker
        title={t('wizard.label.level1Spells')}
        spells={level1}
        selected={pickedSpellsLevel1}
        onToggle={(id): void => toggle(id, pickedSpellsLevel1, onPickedSpellsLevel1)}
      />
    </section>
  );
}

function SpellPicker({
  title,
  spells,
  selected,
  onToggle,
}: {
  title: string;
  spells: Spell[];
  selected: string[];
  onToggle: (id: string) => void;
}): JSX.Element {
  return (
    <details className="rounded-md border border-bronze/30 bg-bg-deep/30 p-2">
      <summary className="cursor-pointer font-serif text-body-sm text-text-tertiary">
        {title} ({selected.length}/{spells.length})
      </summary>
      <div className="mt-2 grid max-h-64 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
        {spells.map((s) => {
          const checked = selected.includes(s.id);
          return (
            <label
              key={s.id}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 font-serif text-body-xs transition-colors',
                checked
                  ? 'border-gold-bright/60 bg-gold-bright/10 text-gold-bright'
                  : 'border-bronze/20 bg-bg-deep/40 text-text-tertiary',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(): void => onToggle(s.id)}
                className="accent-gold-bright"
              />
              <span>{localize(s.name)}</span>
            </label>
          );
        })}
      </div>
    </details>
  );
}

function EquipmentSection({
  characterClass,
  background,
  classOptionIndex,
  inventoryDraft,
  startingCoinsGp,
  onClassOption,
}: {
  characterClass: ClassEntity | null;
  background: Background | null;
  classOptionIndex: number;
  inventoryDraft: WizardDraftItem[];
  startingCoinsGp: number;
  onClassOption: (i: number) => void;
}): JSX.Element {
  if (!characterClass || !background) {
    return (
      <section className="flex flex-col gap-2">
        <SectionTitle>{t('wizard.section.equipment')}</SectionTitle>
        <p className="font-serif text-body-xs text-text-tertiary">
          {t('wizard.placeholder.choose')} {t('wizard.field.class')} + {t('wizard.field.background')}.
        </p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{t('wizard.section.equipment')}</SectionTitle>
      <div className="flex flex-col gap-2">
        {characterClass.startingEquipment.options.map((opt, idx) => (
          <ClassOptionRow
            key={idx}
            label={`${t('wizard.label.option')} ${String.fromCharCode(65 + idx)}`}
            option={opt}
            selected={classOptionIndex === idx}
            onSelect={(): void => onClassOption(idx)}
          />
        ))}
      </div>
      <div className="rounded-md border border-bronze/20 bg-bg-deep/20 p-2 text-body-xs">
        <p className="font-serif text-text-tertiary">
          {t('wizard.label.startingCoins')} : <span className="font-display text-gold-bright">{startingCoinsGp} po</span>
        </p>
        {inventoryDraft.length === 0 && (
          <p className="mt-1 font-serif italic text-text-tertiary">
            {t('wizard.placeholder.choose')} option…
          </p>
        )}
        {inventoryDraft.length > 0 && (
          <ul className="mt-1 list-disc pl-4 font-serif text-text-primary">
            {inventoryDraft.map((it, i) => (
              <li key={`${it.contentId}-${i}`}>
                {it.qty > 1 ? `${it.qty}× ` : ''}
                {it.contentId}
                <span className="ml-1 text-text-tertiary">({it.origin})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ClassOptionRow({
  label,
  option,
  selected,
  onSelect,
}: {
  label: string;
  option: StartingEquipmentChoice;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'rounded-md border px-3 py-2 text-left font-serif text-body-sm transition-colors',
        selected
          ? 'border-gold-bright/60 bg-gold-bright/10 text-gold-bright'
          : 'border-bronze/30 bg-bg-deep/40 text-text-tertiary hover:text-text-primary',
      )}
    >
      <span className="block font-display text-body-md">{label}</span>
      <span className="block">
        {option.items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.itemId}` : i.itemId)).join(', ')}
        {option.coins && ` + ${option.coins.qty} ${option.coins.unit}`}
      </span>
    </button>
  );
}

// Suppress unused-var warnings for imports kept for future plan-17 wizard.
void EMPTY_DRAFT;
void SKILLS_FR_TO_KEY;
