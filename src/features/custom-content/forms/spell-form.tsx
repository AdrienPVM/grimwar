import { useCallback, useState } from 'react';

import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { Checkbox } from '@/shared/components/form';
import { GlassPanel } from '@/shared/components/glass-panel';
import { useContent } from '@/shared/hooks/use-content';
import { t } from '@/shared/lib/i18n';
import {
  SpellSchema,
  damageTypeSchema,
  spellSchoolSchema,
  type DamageType,
  type Spell,
  type SpellSchool,
} from '@/shared/types/content';

import { FieldEnum } from './fields/field-enum';
import { FieldI18n } from './fields/field-i18n';
import { FieldNumber } from './fields/field-number';
import { FieldString } from './fields/field-string';

/**
 * Formulaire de création d'un Sort custom (JALON 3C.6).
 *
 * Schéma source : `SpellSchema`. Le sort est la catégorie homebrew la plus
 * fréquemment utilisée en pratique — les joueurs ajoutent souvent des sorts
 * inspirés d'éditions antérieures ou de classes maison. La surface couvre les
 * 14 champs requis du schéma :
 *
 *   - id (slug), name (i18n FR), level (0-9), school (enum SRD)
 *   - castingTime (i18n FR), range (i18n FR), duration (i18n FR)
 *   - components { v, s, m, material? } — `material` en i18n nullable
 *   - concentration (bool), ritual (bool)
 *   - description (i18n FR), atHigherLevels (i18n nullable)
 *   - classes[] : multi-select via `useContent('classes')`
 *   - damage[] : répéteur optionnel { formula, type, typeLabel, atHigherLevels? }
 *   - source : figé à `aidedd-homebrew` (convention 3C partagée)
 *
 * `summonedCreatureIds` (plan D14) est hors scope du form V1 — la quasi-totalité
 * des sorts SRD n'en portent pas (4/339), et la résolution dépend de bundles
 * `summoned-creatures` non-éditables. L'import par fichier JSON reste l'échappatoire
 * pour les sorts qui invoquent une créature custom.
 *
 * `damage` est volontairement minimal : formula libre + type enum + label
 * i18n. Les patterns `cantripScaling` / `resolution` / `condition` du SRD sont
 * réservés à l'import par fichier — ils sont rarement écrits à la main.
 */

interface SpellDamageDraft {
  formula: string;
  type: DamageType;
  typeLabelFr: string;
  typeLabelEn: string;
  hasUpcast: boolean;
  upcastPerLevel: string;
}

export interface SpellFormDraft {
  id: string;
  nameFr: string;
  nameEn: string;
  level: number;
  school: SpellSchool | '';
  castingTimeFr: string;
  castingTimeEn: string;
  rangeFr: string;
  rangeEn: string;
  durationFr: string;
  durationEn: string;
  componentsV: boolean;
  componentsS: boolean;
  componentsM: boolean;
  materialFr: string;
  materialEn: string;
  concentration: boolean;
  ritual: boolean;
  descriptionFr: string;
  descriptionEn: string;
  hasAtHigherLevels: boolean;
  atHigherLevelsFr: string;
  atHigherLevelsEn: string;
  classes: string[];
  damage: SpellDamageDraft[];
}

export const EMPTY_SPELL_DAMAGE_DRAFT: SpellDamageDraft = {
  formula: '',
  type: 'fire',
  typeLabelFr: '',
  typeLabelEn: '',
  hasUpcast: false,
  upcastPerLevel: '',
};

export const EMPTY_SPELL_DRAFT: SpellFormDraft = {
  id: '',
  nameFr: '',
  nameEn: '',
  level: 0,
  school: '',
  castingTimeFr: '',
  castingTimeEn: '',
  rangeFr: '',
  rangeEn: '',
  durationFr: '',
  durationEn: '',
  componentsV: false,
  componentsS: false,
  componentsM: false,
  materialFr: '',
  materialEn: '',
  concentration: false,
  ritual: false,
  descriptionFr: '',
  descriptionEn: '',
  hasAtHigherLevels: false,
  atHigherLevelsFr: '',
  atHigherLevelsEn: '',
  classes: [],
  damage: [],
};

function i18nFrEn(fr: string, en: string): { fr: string; en?: string } {
  return { fr: fr.trim(), ...(en.trim() ? { en: en.trim() } : {}) };
}

export function buildSpellFromDraft(draft: SpellFormDraft): Spell {
  // L'absence de school est validée avant d'appeler ce builder ; le cast `as`
  // est gardé par la vérification dans `validateSpellDraft` (FR required + enum).
  const school = draft.school as SpellSchool;
  return {
    id: draft.id.trim(),
    name: i18nFrEn(draft.nameFr, draft.nameEn),
    level: draft.level,
    school,
    castingTime: i18nFrEn(draft.castingTimeFr, draft.castingTimeEn),
    range: i18nFrEn(draft.rangeFr, draft.rangeEn),
    components: {
      v: draft.componentsV,
      s: draft.componentsS,
      m: draft.componentsM,
      ...(draft.componentsM && draft.materialFr.trim()
        ? { material: i18nFrEn(draft.materialFr, draft.materialEn) }
        : {}),
    },
    duration: i18nFrEn(draft.durationFr, draft.durationEn),
    concentration: draft.concentration,
    ritual: draft.ritual,
    description: i18nFrEn(draft.descriptionFr, draft.descriptionEn),
    atHigherLevels:
      draft.hasAtHigherLevels && draft.atHigherLevelsFr.trim()
        ? i18nFrEn(draft.atHigherLevelsFr, draft.atHigherLevelsEn)
        : null,
    classes: draft.classes.map((c) => c.trim()).filter((c) => c.length > 0),
    ...(draft.damage.length > 0
      ? {
          damage: draft.damage.map((d) => ({
            formula: d.formula.trim(),
            type: d.type,
            typeLabel: i18nFrEn(d.typeLabelFr, d.typeLabelEn),
            ...(d.hasUpcast && d.upcastPerLevel.trim()
              ? { atHigherLevels: { perLevel: d.upcastPerLevel.trim() } }
              : {}),
          })),
        }
      : {}),
    source: 'aidedd-homebrew',
  };
}

export function draftFromSpell(spell: Spell): SpellFormDraft {
  return {
    id: spell.id,
    nameFr: spell.name.fr,
    nameEn: spell.name.en ?? '',
    level: spell.level,
    school: spell.school,
    castingTimeFr: spell.castingTime.fr,
    castingTimeEn: spell.castingTime.en ?? '',
    rangeFr: spell.range.fr,
    rangeEn: spell.range.en ?? '',
    durationFr: spell.duration.fr,
    durationEn: spell.duration.en ?? '',
    componentsV: spell.components.v,
    componentsS: spell.components.s,
    componentsM: spell.components.m,
    materialFr: spell.components.material?.fr ?? '',
    materialEn: spell.components.material?.en ?? '',
    concentration: spell.concentration,
    ritual: spell.ritual,
    descriptionFr: spell.description.fr,
    descriptionEn: spell.description.en ?? '',
    hasAtHigherLevels: spell.atHigherLevels !== null,
    atHigherLevelsFr: spell.atHigherLevels?.fr ?? '',
    atHigherLevelsEn: spell.atHigherLevels?.en ?? '',
    classes: [...spell.classes],
    damage: (spell.damage ?? []).map((d) => ({
      formula: d.formula,
      type: d.type,
      typeLabelFr: d.typeLabel.fr,
      typeLabelEn: d.typeLabel.en ?? '',
      hasUpcast: d.atHigherLevels !== undefined,
      upcastPerLevel: d.atHigherLevels?.perLevel ?? '',
    })),
  };
}

export function validateSpellDraft(
  draft: SpellFormDraft,
):
  | { ok: true; spell: Spell }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof SpellFormDraft, string>>;
    } {
  const fieldErrors: Partial<Record<keyof SpellFormDraft, string>> = {};
  if (!draft.id.trim()) {
    fieldErrors.id = t('customContent.editor.spellForm.error.idRequired');
  } else if (!/^[a-z0-9-]+$/.test(draft.id.trim())) {
    fieldErrors.id = t('customContent.editor.spellForm.error.idFormat');
  }
  if (!draft.nameFr.trim()) {
    fieldErrors.nameFr = t(
      'customContent.editor.spellForm.error.nameFrRequired',
    );
  }
  if (!draft.school) {
    fieldErrors.school = t(
      'customContent.editor.spellForm.error.schoolRequired',
    );
  }
  if (!draft.castingTimeFr.trim()) {
    fieldErrors.castingTimeFr = t(
      'customContent.editor.spellForm.error.castingTimeFrRequired',
    );
  }
  if (!draft.rangeFr.trim()) {
    fieldErrors.rangeFr = t(
      'customContent.editor.spellForm.error.rangeFrRequired',
    );
  }
  if (!draft.durationFr.trim()) {
    fieldErrors.durationFr = t(
      'customContent.editor.spellForm.error.durationFrRequired',
    );
  }
  if (!draft.descriptionFr.trim()) {
    fieldErrors.descriptionFr = t(
      'customContent.editor.spellForm.error.descriptionFrRequired',
    );
  }
  // material FR obligatoire si M coché — le SRD impose la description du
  // composant matériel quand il est présent (« perle de 100 po » etc.).
  if (draft.componentsM && !draft.materialFr.trim()) {
    fieldErrors.materialFr = t(
      'customContent.editor.spellForm.error.materialFrRequired',
    );
  }
  if (draft.hasAtHigherLevels && !draft.atHigherLevelsFr.trim()) {
    fieldErrors.atHigherLevelsFr = t(
      'customContent.editor.spellForm.error.atHigherLevelsFrRequired',
    );
  }
  // damage[] : chaque ligne demande formula + typeLabelFr non vides ; bloquer
  // AVANT le safeParse pour un message actionnable.
  for (const d of draft.damage) {
    if (!d.formula.trim() || !d.typeLabelFr.trim()) {
      fieldErrors.damage = t(
        'customContent.editor.spellForm.error.damageIncomplete',
      );
      break;
    }
  }
  // doublon de type de dégâts dans le même sort = warning (ex. 2× feu).
  const seenDamageTypes = new Set<DamageType>();
  for (const d of draft.damage) {
    if (d.formula.trim() && seenDamageTypes.has(d.type)) {
      fieldErrors.damage = t(
        'customContent.editor.spellForm.error.damageDuplicate',
      );
      break;
    }
    seenDamageTypes.add(d.type);
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const candidate = buildSpellFromDraft(draft);
  const parsed = SpellSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const fieldKey = String(issue?.path[0] ?? 'id') as keyof SpellFormDraft;
    fieldErrors[fieldKey] = issue?.message ?? 'invalid';
    return { ok: false, fieldErrors };
  }
  return { ok: true, spell: parsed.data };
}

const SPELL_SCHOOLS: readonly SpellSchool[] = spellSchoolSchema.options;
const DAMAGE_TYPES: readonly DamageType[] = damageTypeSchema.options;

interface SpellFormProps {
  draft: SpellFormDraft;
  onChange: (draft: SpellFormDraft) => void;
  onConfirm: (spell: Spell) => void;
  onCancel: () => void;
}

export function SpellForm({
  draft,
  onChange,
  onConfirm,
  onCancel,
}: SpellFormProps): JSX.Element {
  const { data: classes, loading: classesLoading } = useContent('classes');
  const [errors, setErrors] = useState<
    Partial<Record<keyof SpellFormDraft, string>>
  >({});

  const update = useCallback(
    <K extends keyof SpellFormDraft>(
      key: K,
      value: SpellFormDraft[K],
    ) => {
      onChange({ ...draft, [key]: value });
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [draft, errors, onChange],
  );

  const handleConfirm = useCallback(() => {
    const result = validateSpellDraft(draft);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    onConfirm(result.spell);
  }, [draft, onConfirm]);

  const toggleClass = (id: string): void => {
    const exists = draft.classes.includes(id);
    update(
      'classes',
      exists ? draft.classes.filter((c) => c !== id) : [...draft.classes, id],
    );
  };

  const addDamage = (): void => {
    update('damage', [...draft.damage, EMPTY_SPELL_DAMAGE_DRAFT]);
  };
  const updateDamage = (
    idx: number,
    patch: Partial<SpellDamageDraft>,
  ): void => {
    update(
      'damage',
      draft.damage.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    );
  };
  const removeDamage = (idx: number): void => {
    update(
      'damage',
      draft.damage.filter((_, i) => i !== idx),
    );
  };

  const schoolOptions = SPELL_SCHOOLS.map((s) => ({
    value: s,
    label: t(`school.${s}`),
  }));

  const damageTypeOptions = DAMAGE_TYPES.map((d) => ({
    value: d,
    label: t(`damageType.${d}`),
  }));

  return (
    <GlassPanel className="px-6 py-6" data-testid="spell-form">
      <h3 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
        {t('customContent.editor.spellForm.title')}
      </h3>
      <Divider className="my-4" />
      <div className="flex flex-col gap-4">
        <FieldString
          label={t('customContent.editor.spellForm.id')}
          value={draft.id}
          onChange={(value) => update('id', value)}
          helper={t('customContent.editor.spellForm.idHelper')}
          error={errors.id}
          required
          testId="spell-form-id"
        />
        <FieldI18n
          labelFr={t('customContent.editor.spellForm.nameFr')}
          labelEn={t('customContent.editor.spellForm.nameEn')}
          valueFr={draft.nameFr}
          valueEn={draft.nameEn}
          onChangeFr={(value) => update('nameFr', value)}
          onChangeEn={(value) => update('nameEn', value)}
          requiredFr
          errorFr={errors.nameFr}
          testIdFr="spell-form-name-fr"
          testIdEn="spell-form-name-en"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldNumber
            label={t('customContent.editor.spellForm.level')}
            value={draft.level}
            onChange={(value) => update('level', value)}
            min={0}
            max={9}
            step={1}
            helper={t('customContent.editor.spellForm.levelHelper')}
            error={errors.level}
            required
            testId="spell-form-level"
          />
          <FieldEnum
            label={t('customContent.editor.spellForm.school')}
            value={draft.school}
            options={schoolOptions}
            onChange={(value) => update('school', value as SpellSchool)}
            placeholder={t(
              'customContent.editor.spellForm.schoolPlaceholder',
            )}
            error={errors.school}
            required
            testId="spell-form-school"
          />
        </div>
        <FieldI18n
          labelFr={t('customContent.editor.spellForm.castingTimeFr')}
          labelEn={t('customContent.editor.spellForm.castingTimeEn')}
          valueFr={draft.castingTimeFr}
          valueEn={draft.castingTimeEn}
          onChangeFr={(value) => update('castingTimeFr', value)}
          onChangeEn={(value) => update('castingTimeEn', value)}
          helperFr={t('customContent.editor.spellForm.castingTimeHelper')}
          requiredFr
          errorFr={errors.castingTimeFr}
          testIdFr="spell-form-casting-time-fr"
          testIdEn="spell-form-casting-time-en"
        />
        <FieldI18n
          labelFr={t('customContent.editor.spellForm.rangeFr')}
          labelEn={t('customContent.editor.spellForm.rangeEn')}
          valueFr={draft.rangeFr}
          valueEn={draft.rangeEn}
          onChangeFr={(value) => update('rangeFr', value)}
          onChangeEn={(value) => update('rangeEn', value)}
          helperFr={t('customContent.editor.spellForm.rangeHelper')}
          requiredFr
          errorFr={errors.rangeFr}
          testIdFr="spell-form-range-fr"
          testIdEn="spell-form-range-en"
        />
        <FieldI18n
          labelFr={t('customContent.editor.spellForm.durationFr')}
          labelEn={t('customContent.editor.spellForm.durationEn')}
          valueFr={draft.durationFr}
          valueEn={draft.durationEn}
          onChangeFr={(value) => update('durationFr', value)}
          onChangeEn={(value) => update('durationEn', value)}
          helperFr={t('customContent.editor.spellForm.durationHelper')}
          requiredFr
          errorFr={errors.durationFr}
          testIdFr="spell-form-duration-fr"
          testIdEn="spell-form-duration-en"
        />

        {/* Components */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="spell-form-components"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.spellForm.componentsLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.spellForm.componentsHelper')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip
              active={draft.componentsV}
              variant={draft.componentsV ? 'gold' : 'default'}
              onToggle={() => update('componentsV', !draft.componentsV)}
              data-testid="spell-form-component-v"
              data-active={draft.componentsV ? 'true' : 'false'}
            >
              {t('customContent.editor.spellForm.componentV')}
            </Chip>
            <Chip
              active={draft.componentsS}
              variant={draft.componentsS ? 'gold' : 'default'}
              onToggle={() => update('componentsS', !draft.componentsS)}
              data-testid="spell-form-component-s"
              data-active={draft.componentsS ? 'true' : 'false'}
            >
              {t('customContent.editor.spellForm.componentS')}
            </Chip>
            <Chip
              active={draft.componentsM}
              variant={draft.componentsM ? 'gold' : 'default'}
              onToggle={() => update('componentsM', !draft.componentsM)}
              data-testid="spell-form-component-m"
              data-active={draft.componentsM ? 'true' : 'false'}
            >
              {t('customContent.editor.spellForm.componentM')}
            </Chip>
          </div>
          {draft.componentsM ? (
            <div className="mt-4">
              <FieldI18n
                labelFr={t('customContent.editor.spellForm.materialFr')}
                labelEn={t('customContent.editor.spellForm.materialEn')}
                valueFr={draft.materialFr}
                valueEn={draft.materialEn}
                onChangeFr={(value) => update('materialFr', value)}
                onChangeEn={(value) => update('materialEn', value)}
                helperFr={t('customContent.editor.spellForm.materialHelper')}
                requiredFr
                errorFr={errors.materialFr}
                testIdFr="spell-form-material-fr"
                testIdEn="spell-form-material-en"
              />
            </div>
          ) : null}
        </fieldset>

        {/* Concentration + Ritual */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Checkbox
            label={t('customContent.editor.spellForm.concentration')}
            helper={t('customContent.editor.spellForm.concentrationHelper')}
            checked={draft.concentration}
            onChange={(event) => update('concentration', event.target.checked)}
            data-testid="spell-form-concentration"
          />
          <Checkbox
            label={t('customContent.editor.spellForm.ritual')}
            helper={t('customContent.editor.spellForm.ritualHelper')}
            checked={draft.ritual}
            onChange={(event) => update('ritual', event.target.checked)}
            data-testid="spell-form-ritual"
          />
        </div>

        <FieldI18n
          labelFr={t('customContent.editor.spellForm.descriptionFr')}
          labelEn={t('customContent.editor.spellForm.descriptionEn')}
          valueFr={draft.descriptionFr}
          valueEn={draft.descriptionEn}
          onChangeFr={(value) => update('descriptionFr', value)}
          onChangeEn={(value) => update('descriptionEn', value)}
          helperFr={t('customContent.editor.spellForm.descriptionHelper')}
          requiredFr
          errorFr={errors.descriptionFr}
          testIdFr="spell-form-description-fr"
          testIdEn="spell-form-description-en"
        />

        {/* atHigherLevels — nullable, toggle */}
        <Checkbox
          label={t('customContent.editor.spellForm.hasAtHigherLevels')}
          helper={t(
            'customContent.editor.spellForm.hasAtHigherLevelsHelper',
          )}
          checked={draft.hasAtHigherLevels}
          onChange={(event) =>
            update('hasAtHigherLevels', event.target.checked)
          }
          data-testid="spell-form-has-at-higher-levels"
        />
        {draft.hasAtHigherLevels ? (
          <FieldI18n
            labelFr={t('customContent.editor.spellForm.atHigherLevelsFr')}
            labelEn={t('customContent.editor.spellForm.atHigherLevelsEn')}
            valueFr={draft.atHigherLevelsFr}
            valueEn={draft.atHigherLevelsEn}
            onChangeFr={(value) => update('atHigherLevelsFr', value)}
            onChangeEn={(value) => update('atHigherLevelsEn', value)}
            requiredFr
            errorFr={errors.atHigherLevelsFr}
            testIdFr="spell-form-at-higher-levels-fr"
            testIdEn="spell-form-at-higher-levels-en"
          />
        ) : null}

        {/* Classes multi-select (toggle chips) */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="spell-form-classes"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.spellForm.classesLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {classesLoading
              ? t('customContent.editor.spellForm.classesLoading')
              : t('customContent.editor.spellForm.classesHelper')}
          </p>
          {classes.length === 0 && !classesLoading ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="spell-form-classes-empty"
            >
              {t('customContent.editor.spellForm.classesEmpty')}
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {classes.map((c) => {
                const active = draft.classes.includes(c.id);
                return (
                  <Chip
                    key={c.id}
                    active={active}
                    variant={active ? 'gold' : 'default'}
                    onToggle={() => toggleClass(c.id)}
                    data-testid={`spell-form-class-${c.id}`}
                    data-active={active ? 'true' : 'false'}
                  >
                    {c.name.fr}
                  </Chip>
                );
              })}
            </div>
          )}
        </fieldset>

        {/* Damage repeater (optional) */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="spell-form-damage"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.spellForm.damageLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.spellForm.damageHelper')}
          </p>
          {draft.damage.length === 0 ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="spell-form-damage-empty"
            >
              {t('customContent.editor.spellForm.damageEmpty')}
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {draft.damage.map((row, idx) => (
                <li
                  key={idx}
                  className="rounded-card border border-white-8 bg-glass px-4 py-4 backdrop-blur-xl"
                  data-testid="spell-form-damage-row"
                  data-damage-index={idx}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FieldString
                      label={t('customContent.editor.spellForm.damageFormula')}
                      value={row.formula}
                      onChange={(value) =>
                        updateDamage(idx, { formula: value })
                      }
                      placeholder={t(
                        'customContent.editor.spellForm.damageFormulaPlaceholder',
                      )}
                      required
                      testId={`spell-form-damage-formula-${idx}`}
                    />
                    <FieldEnum
                      label={t('customContent.editor.spellForm.damageType')}
                      value={row.type}
                      options={damageTypeOptions}
                      onChange={(value) =>
                        updateDamage(idx, { type: value as DamageType })
                      }
                      required
                      testId={`spell-form-damage-type-${idx}`}
                    />
                  </div>
                  <div className="mt-3">
                    <FieldI18n
                      labelFr={t(
                        'customContent.editor.spellForm.damageTypeLabelFr',
                      )}
                      labelEn={t(
                        'customContent.editor.spellForm.damageTypeLabelEn',
                      )}
                      valueFr={row.typeLabelFr}
                      valueEn={row.typeLabelEn}
                      onChangeFr={(value) =>
                        updateDamage(idx, { typeLabelFr: value })
                      }
                      onChangeEn={(value) =>
                        updateDamage(idx, { typeLabelEn: value })
                      }
                      requiredFr
                      testIdFr={`spell-form-damage-type-label-fr-${idx}`}
                      testIdEn={`spell-form-damage-type-label-en-${idx}`}
                    />
                  </div>
                  <div className="mt-3">
                    <Checkbox
                      label={t(
                        'customContent.editor.spellForm.damageHasUpcast',
                      )}
                      helper={t(
                        'customContent.editor.spellForm.damageHasUpcastHelper',
                      )}
                      checked={row.hasUpcast}
                      onChange={(event) =>
                        updateDamage(idx, { hasUpcast: event.target.checked })
                      }
                      data-testid={`spell-form-damage-has-upcast-${idx}`}
                    />
                  </div>
                  {row.hasUpcast ? (
                    <div className="mt-3">
                      <FieldString
                        label={t(
                          'customContent.editor.spellForm.damageUpcastPerLevel',
                        )}
                        value={row.upcastPerLevel}
                        onChange={(value) =>
                          updateDamage(idx, { upcastPerLevel: value })
                        }
                        placeholder={t(
                          'customContent.editor.spellForm.damageUpcastPerLevelPlaceholder',
                        )}
                        helper={t(
                          'customContent.editor.spellForm.damageUpcastPerLevelHelper',
                        )}
                        testId={`spell-form-damage-upcast-per-level-${idx}`}
                      />
                    </div>
                  ) : null}
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDamage(idx)}
                      data-testid={`spell-form-damage-remove-${idx}`}
                    >
                      {t('customContent.editor.spellForm.removeRow')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {errors.damage ? (
            <p
              className="mt-2 font-serif text-[13px] text-crimson"
              role="alert"
            >
              {errors.damage}
            </p>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={addDamage}
            data-testid="spell-form-damage-add"
            className="mt-4"
          >
            {t('customContent.editor.spellForm.damageAdd')}
          </Button>
        </fieldset>
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onCancel}
          data-testid="spell-form-cancel"
        >
          {t('customContent.editor.spellForm.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          data-testid="spell-form-confirm"
        >
          {t('customContent.editor.spellForm.confirm')}
        </Button>
      </div>
    </GlassPanel>
  );
}
