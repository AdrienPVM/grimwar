import { useCallback, useState } from 'react';

import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { useContent } from '@/shared/hooks/use-content';
import { t, type StringKey } from '@/shared/lib/i18n';
import {
  AncestrySchema,
  damageTypeSchema,
  sizeSchema,
  type Ancestry,
  type AncestryDragonOption,
  type AncestryGiantOption,
  type CreatureSize,
  type DamageType,
} from '@/shared/types/content';

import { FieldEnum } from './fields/field-enum';
import { FieldI18n } from './fields/field-i18n';
import { FieldNumber } from './fields/field-number';
import { FieldString } from './fields/field-string';

/**
 * Formulaire de création d'une Ascendance custom (JALON 3C.8).
 *
 * Schéma source : `AncestrySchema`. La surface couvre l'essentiel d'une
 * ascendance homebrew :
 *   - id (slug), name (i18n FR), description (i18n FR)
 *   - size enum, speed int (cases en mètres ; SRD = pieds /5)
 *   - ASI[] : répéteur ability enum + bonus int (mêmes contraintes que Subancestry)
 *   - traits[] : répéteur { name i18n, description i18n }
 *   - languages : chip input libre (slugs ou noms en clair)
 *   - commonSpellIds : multi-select de sorts SRD (chips toggle)
 *   - options.dragonAncestries[] : répéteur { id, name i18n, damageType enum,
 *     damageTypeLabel i18n } — pour une ascendance type Drakéide custom
 *   - options.giantAncestries[] : répéteur { id, name i18n, effect i18n } — pour
 *     une ascendance type Goliath custom
 *
 * Hors scope V1 (V2 via JSON edit) :
 *   - tieflingLegacies / elfLineages / gnomeLineages : ces sous-choix demandent
 *     des slugs de sorts de cantrip + L3 + L5 cross-bundle qui ne résolvent
 *     pas de façon fiable côté homebrew (les sorts de l'utilisateur peuvent
 *     ne pas exister au moment de l'édition). Le JSON edit reste la voie pour
 *     ces 3 cas — c'est aussi cohérent avec la note du plan 3C.9 ClassForm.
 *   - versatileFeatIds / skillfulOptions : impliqueraient un cross-link
 *     bidirectionnel avec FeatForm. Idem, JSON edit pour V1.
 *   - spellUsages : map de recharge par sort — micro-format, pollution UX
 *     non justifiée pour la quasi-totalité des cas custom (cantrip at-will).
 *
 * Pour éviter de tomber dans la branche `superRefine` d'AncestrySchema qui
 * exige `dragonAncestries`/`tieflingLegacies`/`elfLineages`/`gnomeLineages`/
 * `giantAncestries` non vide quand l'`id` matche un slug SRD réservé
 * (`dragonborn`, `tiefling`, `elf`, `gnome`, `goliath`, `human`), on bloque ces
 * 6 slugs à la validation — un homebrew ne peut pas re-définir une ascendance
 * SRD avec le même id (de toute façon le merger SRD ∪ custom écraserait).
 *
 * `source` est figé à `aidedd-homebrew` — convention partagée 3C.
 */

const ABILITY_KEYS = ['for', 'dex', 'con', 'int', 'sag', 'cha'] as const;
type AbilityKey = (typeof ABILITY_KEYS)[number];

const SIZES: readonly CreatureSize[] = sizeSchema.options;
const DAMAGE_TYPES: readonly DamageType[] = damageTypeSchema.options;

const RESERVED_ANCESTRY_IDS = new Set([
  'dragonborn',
  'tiefling',
  'elf',
  'gnome',
  'goliath',
  'human',
]);

interface AsiDraft {
  ability: AbilityKey | '';
  bonus: number;
}

interface TraitDraft {
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
}

interface DragonOptionDraft {
  id: string;
  nameFr: string;
  nameEn: string;
  damageType: DamageType;
  damageTypeLabelFr: string;
  damageTypeLabelEn: string;
}

interface GiantOptionDraft {
  id: string;
  nameFr: string;
  nameEn: string;
  effectFr: string;
  effectEn: string;
}

export interface AncestryFormDraft {
  id: string;
  nameFr: string;
  nameEn: string;
  size: CreatureSize;
  speed: number;
  descriptionFr: string;
  descriptionEn: string;
  asis: AsiDraft[];
  traits: TraitDraft[];
  languages: string[];
  commonSpellIds: string[];
  dragonAncestries: DragonOptionDraft[];
  giantAncestries: GiantOptionDraft[];
}

export const EMPTY_ASI_DRAFT: AsiDraft = {
  ability: '',
  bonus: 1,
};

export const EMPTY_TRAIT_DRAFT: TraitDraft = {
  nameFr: '',
  nameEn: '',
  descriptionFr: '',
  descriptionEn: '',
};

export const EMPTY_DRAGON_OPTION_DRAFT: DragonOptionDraft = {
  id: '',
  nameFr: '',
  nameEn: '',
  damageType: 'fire',
  damageTypeLabelFr: '',
  damageTypeLabelEn: '',
};

export const EMPTY_GIANT_OPTION_DRAFT: GiantOptionDraft = {
  id: '',
  nameFr: '',
  nameEn: '',
  effectFr: '',
  effectEn: '',
};

export const EMPTY_ANCESTRY_DRAFT: AncestryFormDraft = {
  id: '',
  nameFr: '',
  nameEn: '',
  size: 'medium',
  speed: 9,
  descriptionFr: '',
  descriptionEn: '',
  asis: [],
  traits: [],
  languages: [],
  commonSpellIds: [],
  dragonAncestries: [],
  giantAncestries: [],
};

function i18nFrEn(fr: string, en: string): { fr: string; en?: string } {
  return { fr: fr.trim(), ...(en.trim() ? { en: en.trim() } : {}) };
}

export function buildAncestryFromDraft(draft: AncestryFormDraft): Ancestry {
  const dragonAncestries: AncestryDragonOption[] = draft.dragonAncestries.map(
    (d) => ({
      id: d.id.trim(),
      name: i18nFrEn(d.nameFr, d.nameEn),
      damageType: d.damageType,
      damageTypeLabel: i18nFrEn(d.damageTypeLabelFr, d.damageTypeLabelEn),
    }),
  );
  const giantAncestries: AncestryGiantOption[] = draft.giantAncestries.map(
    (g) => ({
      id: g.id.trim(),
      name: i18nFrEn(g.nameFr, g.nameEn),
      effect: i18nFrEn(g.effectFr, g.effectEn),
    }),
  );
  return {
    id: draft.id.trim(),
    name: i18nFrEn(draft.nameFr, draft.nameEn),
    size: draft.size,
    speed: draft.speed,
    description: i18nFrEn(draft.descriptionFr, draft.descriptionEn),
    abilityScoreIncrease: draft.asis
      .filter((asi) => asi.ability !== '')
      .map((asi) => ({
        ability: asi.ability as AbilityKey,
        bonus: asi.bonus,
      })),
    traits: draft.traits.map((trait) => ({
      name: i18nFrEn(trait.nameFr, trait.nameEn),
      description: i18nFrEn(trait.descriptionFr, trait.descriptionEn),
    })),
    languages: draft.languages.map((l) => l.trim()).filter((l) => l.length > 0),
    options: {
      ...(dragonAncestries.length > 0 ? { dragonAncestries } : {}),
      ...(giantAncestries.length > 0 ? { giantAncestries } : {}),
    },
    ...(draft.commonSpellIds.length > 0
      ? { commonSpellIds: [...draft.commonSpellIds] }
      : {}),
    source: 'aidedd-homebrew',
  };
}

export function draftFromAncestry(ancestry: Ancestry): AncestryFormDraft {
  return {
    id: ancestry.id,
    nameFr: ancestry.name.fr,
    nameEn: ancestry.name.en ?? '',
    size: ancestry.size,
    speed: ancestry.speed,
    descriptionFr: ancestry.description.fr,
    descriptionEn: ancestry.description.en ?? '',
    asis: ancestry.abilityScoreIncrease.map((asi) => ({
      ability: asi.ability,
      bonus: asi.bonus,
    })),
    traits: ancestry.traits.map((trait) => ({
      nameFr: trait.name.fr,
      nameEn: trait.name.en ?? '',
      descriptionFr: trait.description.fr,
      descriptionEn: trait.description.en ?? '',
    })),
    languages: [...ancestry.languages],
    commonSpellIds: ancestry.commonSpellIds ? [...ancestry.commonSpellIds] : [],
    dragonAncestries: (ancestry.options.dragonAncestries ?? []).map((d) => ({
      id: d.id,
      nameFr: d.name.fr,
      nameEn: d.name.en ?? '',
      // Le schéma stocke damageType en string libre ; pour le draft on tente
      // de retomber sur l'enum, fallback `fire` si non reconnu (improbable
      // depuis un draft round-trip).
      damageType: (DAMAGE_TYPES as readonly string[]).includes(d.damageType)
        ? (d.damageType as DamageType)
        : 'fire',
      damageTypeLabelFr: d.damageTypeLabel.fr,
      damageTypeLabelEn: d.damageTypeLabel.en ?? '',
    })),
    giantAncestries: (ancestry.options.giantAncestries ?? []).map((g) => ({
      id: g.id,
      nameFr: g.name.fr,
      nameEn: g.name.en ?? '',
      effectFr: g.effect.fr,
      effectEn: g.effect.en ?? '',
    })),
  };
}

export function validateAncestryDraft(
  draft: AncestryFormDraft,
):
  | { ok: true; ancestry: Ancestry }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof AncestryFormDraft, string>>;
    } {
  const fieldErrors: Partial<Record<keyof AncestryFormDraft, string>> = {};

  const idTrimmed = draft.id.trim();
  if (!idTrimmed) {
    fieldErrors.id = t('customContent.editor.ancestryForm.error.idRequired');
  } else if (!/^[a-z0-9-]+$/.test(idTrimmed)) {
    fieldErrors.id = t('customContent.editor.ancestryForm.error.idFormat');
  } else if (RESERVED_ANCESTRY_IDS.has(idTrimmed)) {
    // SRD-réservés : éviter qu'un homebrew rentre dans la branche superRefine
    // qui exige des options spécifiques (dragonAncestries / tieflingLegacies / …).
    fieldErrors.id = t('customContent.editor.ancestryForm.error.idReserved');
  }
  if (!draft.nameFr.trim()) {
    fieldErrors.nameFr = t(
      'customContent.editor.ancestryForm.error.nameFrRequired',
    );
  }
  if (!draft.descriptionFr.trim()) {
    fieldErrors.descriptionFr = t(
      'customContent.editor.ancestryForm.error.descriptionFrRequired',
    );
  }
  if (!Number.isFinite(draft.speed) || draft.speed <= 0) {
    fieldErrors.speed = t(
      'customContent.editor.ancestryForm.error.speedPositive',
    );
  }
  if (draft.asis.some((asi) => asi.ability === '')) {
    fieldErrors.asis = t(
      'customContent.editor.ancestryForm.error.asiAbilityRequired',
    );
  }
  const abilitiesSeen = new Set<string>();
  for (const asi of draft.asis) {
    if (asi.ability === '') continue;
    if (abilitiesSeen.has(asi.ability)) {
      fieldErrors.asis = t(
        'customContent.editor.ancestryForm.error.asiDuplicate',
      );
      break;
    }
    abilitiesSeen.add(asi.ability);
  }
  for (const trait of draft.traits) {
    if (!trait.nameFr.trim() || !trait.descriptionFr.trim()) {
      fieldErrors.traits = t(
        'customContent.editor.ancestryForm.error.traitIncomplete',
      );
      break;
    }
  }
  // Dragon options : id + nameFr + damageTypeLabelFr requis ; id unique.
  const dragonIds = new Set<string>();
  for (const opt of draft.dragonAncestries) {
    const id = opt.id.trim();
    if (!id || !opt.nameFr.trim() || !opt.damageTypeLabelFr.trim()) {
      fieldErrors.dragonAncestries = t(
        'customContent.editor.ancestryForm.error.dragonIncomplete',
      );
      break;
    }
    if (!/^[a-z0-9-]+$/.test(id)) {
      fieldErrors.dragonAncestries = t(
        'customContent.editor.ancestryForm.error.dragonIdFormat',
      );
      break;
    }
    if (dragonIds.has(id)) {
      fieldErrors.dragonAncestries = t(
        'customContent.editor.ancestryForm.error.dragonDuplicate',
      );
      break;
    }
    dragonIds.add(id);
  }
  // Giant options : id + nameFr + effectFr requis ; id unique.
  const giantIds = new Set<string>();
  for (const opt of draft.giantAncestries) {
    const id = opt.id.trim();
    if (!id || !opt.nameFr.trim() || !opt.effectFr.trim()) {
      fieldErrors.giantAncestries = t(
        'customContent.editor.ancestryForm.error.giantIncomplete',
      );
      break;
    }
    if (!/^[a-z0-9-]+$/.test(id)) {
      fieldErrors.giantAncestries = t(
        'customContent.editor.ancestryForm.error.giantIdFormat',
      );
      break;
    }
    if (giantIds.has(id)) {
      fieldErrors.giantAncestries = t(
        'customContent.editor.ancestryForm.error.giantDuplicate',
      );
      break;
    }
    giantIds.add(id);
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const candidate = buildAncestryFromDraft(draft);
  const parsed = AncestrySchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const fieldKey = String(
      issue?.path[0] ?? 'id',
    ) as keyof AncestryFormDraft;
    fieldErrors[fieldKey] = issue?.message ?? 'invalid';
    return { ok: false, fieldErrors };
  }
  return { ok: true, ancestry: parsed.data };
}

interface AncestryFormProps {
  draft: AncestryFormDraft;
  onChange: (draft: AncestryFormDraft) => void;
  onConfirm: (ancestry: Ancestry) => void;
  onCancel: () => void;
}

export function AncestryForm({
  draft,
  onChange,
  onConfirm,
  onCancel,
}: AncestryFormProps): JSX.Element {
  const { data: spells, loading: spellsLoading } = useContent('spells');
  const [languageDraft, setLanguageDraft] = useState<string>('');
  const [errors, setErrors] = useState<
    Partial<Record<keyof AncestryFormDraft, string>>
  >({});

  const update = useCallback(
    <K extends keyof AncestryFormDraft>(
      key: K,
      value: AncestryFormDraft[K],
    ) => {
      onChange({ ...draft, [key]: value });
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [draft, errors, onChange],
  );

  const handleConfirm = useCallback(() => {
    const result = validateAncestryDraft(draft);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    onConfirm(result.ancestry);
  }, [draft, onConfirm]);

  const sizeOptions = SIZES.map((s) => ({
    value: s,
    label: t(`wizard.subchoice.ancestrySize.${s}.title` as StringKey),
  }));

  const abilityOptions = ABILITY_KEYS.map((key) => ({
    value: key,
    label: t(`ability.${key}` as StringKey),
  }));

  const damageTypeOptions = DAMAGE_TYPES.map((d) => ({
    value: d,
    label: t(`damageType.${d}`),
  }));

  // ASI helpers
  const addAsi = (): void => {
    update('asis', [...draft.asis, EMPTY_ASI_DRAFT]);
  };
  const updateAsi = (idx: number, patch: Partial<AsiDraft>): void => {
    update(
      'asis',
      draft.asis.map((asi, i) => (i === idx ? { ...asi, ...patch } : asi)),
    );
  };
  const removeAsi = (idx: number): void => {
    update(
      'asis',
      draft.asis.filter((_, i) => i !== idx),
    );
  };
  const atMaxAsi = draft.asis.length >= ABILITY_KEYS.length;

  // Traits helpers
  const addTrait = (): void => {
    update('traits', [...draft.traits, EMPTY_TRAIT_DRAFT]);
  };
  const updateTrait = (idx: number, patch: Partial<TraitDraft>): void => {
    update(
      'traits',
      draft.traits.map((trait, i) =>
        i === idx ? { ...trait, ...patch } : trait,
      ),
    );
  };
  const removeTrait = (idx: number): void => {
    update(
      'traits',
      draft.traits.filter((_, i) => i !== idx),
    );
  };

  // Languages chip input
  const addLanguage = (): void => {
    const next = languageDraft.trim();
    if (!next) return;
    if (draft.languages.includes(next)) {
      setLanguageDraft('');
      return;
    }
    update('languages', [...draft.languages, next]);
    setLanguageDraft('');
  };
  const removeLanguage = (lang: string): void => {
    update(
      'languages',
      draft.languages.filter((l) => l !== lang),
    );
  };

  // Common spell ids (multi-select chips)
  const toggleSpell = (id: string): void => {
    const exists = draft.commonSpellIds.includes(id);
    update(
      'commonSpellIds',
      exists
        ? draft.commonSpellIds.filter((s) => s !== id)
        : [...draft.commonSpellIds, id],
    );
  };

  // Dragon options helpers
  const addDragon = (): void => {
    update('dragonAncestries', [
      ...draft.dragonAncestries,
      EMPTY_DRAGON_OPTION_DRAFT,
    ]);
  };
  const updateDragon = (
    idx: number,
    patch: Partial<DragonOptionDraft>,
  ): void => {
    update(
      'dragonAncestries',
      draft.dragonAncestries.map((d, i) =>
        i === idx ? { ...d, ...patch } : d,
      ),
    );
  };
  const removeDragon = (idx: number): void => {
    update(
      'dragonAncestries',
      draft.dragonAncestries.filter((_, i) => i !== idx),
    );
  };

  // Giant options helpers
  const addGiant = (): void => {
    update('giantAncestries', [
      ...draft.giantAncestries,
      EMPTY_GIANT_OPTION_DRAFT,
    ]);
  };
  const updateGiant = (
    idx: number,
    patch: Partial<GiantOptionDraft>,
  ): void => {
    update(
      'giantAncestries',
      draft.giantAncestries.map((g, i) =>
        i === idx ? { ...g, ...patch } : g,
      ),
    );
  };
  const removeGiant = (idx: number): void => {
    update(
      'giantAncestries',
      draft.giantAncestries.filter((_, i) => i !== idx),
    );
  };

  return (
    <GlassPanel className="px-6 py-6" data-testid="ancestry-form">
      <h3 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
        {t('customContent.editor.ancestryForm.title')}
      </h3>
      <Divider className="my-4" />
      <div className="flex flex-col gap-4">
        <FieldString
          label={t('customContent.editor.ancestryForm.id')}
          value={draft.id}
          onChange={(value) => update('id', value)}
          helper={t('customContent.editor.ancestryForm.idHelper')}
          error={errors.id}
          required
          testId="ancestry-form-id"
        />
        <FieldI18n
          labelFr={t('customContent.editor.ancestryForm.nameFr')}
          labelEn={t('customContent.editor.ancestryForm.nameEn')}
          valueFr={draft.nameFr}
          valueEn={draft.nameEn}
          onChangeFr={(value) => update('nameFr', value)}
          onChangeEn={(value) => update('nameEn', value)}
          requiredFr
          errorFr={errors.nameFr}
          testIdFr="ancestry-form-name-fr"
          testIdEn="ancestry-form-name-en"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldEnum
            label={t('customContent.editor.ancestryForm.size')}
            value={draft.size}
            options={sizeOptions}
            onChange={(value) => update('size', value as CreatureSize)}
            required
            testId="ancestry-form-size"
          />
          <FieldNumber
            label={t('customContent.editor.ancestryForm.speed')}
            value={draft.speed}
            onChange={(value) => update('speed', value)}
            min={1}
            max={30}
            step={1}
            helper={t('customContent.editor.ancestryForm.speedHelper')}
            error={errors.speed}
            required
            testId="ancestry-form-speed"
          />
        </div>
        <FieldI18n
          labelFr={t('customContent.editor.ancestryForm.descriptionFr')}
          labelEn={t('customContent.editor.ancestryForm.descriptionEn')}
          valueFr={draft.descriptionFr}
          valueEn={draft.descriptionEn}
          onChangeFr={(value) => update('descriptionFr', value)}
          onChangeEn={(value) => update('descriptionEn', value)}
          requiredFr
          errorFr={errors.descriptionFr}
          testIdFr="ancestry-form-description-fr"
          testIdEn="ancestry-form-description-en"
        />

        {/* ASI repeater */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="ancestry-form-asis"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.ancestryForm.asisLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.ancestryForm.asisHelper')}
          </p>
          {draft.asis.length === 0 ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="ancestry-form-asis-empty"
            >
              {t('customContent.editor.ancestryForm.asisEmpty')}
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {draft.asis.map((asi, idx) => (
                <li
                  key={idx}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,140px,auto]"
                  data-testid="ancestry-form-asi-row"
                  data-asi-index={idx}
                >
                  <FieldEnum
                    label={t('customContent.editor.ancestryForm.asiAbility')}
                    value={asi.ability}
                    options={abilityOptions}
                    onChange={(value) =>
                      updateAsi(idx, { ability: value as AbilityKey })
                    }
                    placeholder={t(
                      'customContent.editor.ancestryForm.asiAbilityPlaceholder',
                    )}
                    required
                    testId={`ancestry-form-asi-ability-${idx}`}
                  />
                  <FieldNumber
                    label={t('customContent.editor.ancestryForm.asiBonus')}
                    value={asi.bonus}
                    onChange={(value) => updateAsi(idx, { bonus: value })}
                    min={-2}
                    max={3}
                    step={1}
                    required
                    testId={`ancestry-form-asi-bonus-${idx}`}
                  />
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAsi(idx)}
                      data-testid={`ancestry-form-asi-remove-${idx}`}
                    >
                      {t('customContent.editor.ancestryForm.removeRow')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {errors.asis ? (
            <p
              className="mt-2 font-serif text-[13px] text-crimson"
              role="alert"
            >
              {errors.asis}
            </p>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={addAsi}
            disabled={atMaxAsi}
            data-testid="ancestry-form-asi-add"
            className="mt-4"
          >
            {t('customContent.editor.ancestryForm.asiAdd')}
          </Button>
        </fieldset>

        {/* Traits repeater */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="ancestry-form-traits"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.ancestryForm.traitsLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.ancestryForm.traitsHelper')}
          </p>
          {draft.traits.length === 0 ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="ancestry-form-traits-empty"
            >
              {t('customContent.editor.ancestryForm.traitsEmpty')}
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {draft.traits.map((trait, idx) => (
                <li
                  key={idx}
                  className="rounded-card border border-white-8 bg-glass px-4 py-4 backdrop-blur-xl"
                  data-testid="ancestry-form-trait-row"
                  data-trait-index={idx}
                >
                  <FieldI18n
                    labelFr={t(
                      'customContent.editor.ancestryForm.traitNameFr',
                    )}
                    labelEn={t(
                      'customContent.editor.ancestryForm.traitNameEn',
                    )}
                    valueFr={trait.nameFr}
                    valueEn={trait.nameEn}
                    onChangeFr={(value) => updateTrait(idx, { nameFr: value })}
                    onChangeEn={(value) => updateTrait(idx, { nameEn: value })}
                    requiredFr
                    testIdFr={`ancestry-form-trait-name-fr-${idx}`}
                    testIdEn={`ancestry-form-trait-name-en-${idx}`}
                  />
                  <div className="mt-3">
                    <FieldI18n
                      labelFr={t(
                        'customContent.editor.ancestryForm.traitDescriptionFr',
                      )}
                      labelEn={t(
                        'customContent.editor.ancestryForm.traitDescriptionEn',
                      )}
                      valueFr={trait.descriptionFr}
                      valueEn={trait.descriptionEn}
                      onChangeFr={(value) =>
                        updateTrait(idx, { descriptionFr: value })
                      }
                      onChangeEn={(value) =>
                        updateTrait(idx, { descriptionEn: value })
                      }
                      requiredFr
                      testIdFr={`ancestry-form-trait-description-fr-${idx}`}
                      testIdEn={`ancestry-form-trait-description-en-${idx}`}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTrait(idx)}
                      data-testid={`ancestry-form-trait-remove-${idx}`}
                    >
                      {t('customContent.editor.ancestryForm.removeRow')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {errors.traits ? (
            <p
              className="mt-2 font-serif text-[13px] text-crimson"
              role="alert"
            >
              {errors.traits}
            </p>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={addTrait}
            data-testid="ancestry-form-trait-add"
            className="mt-4"
          >
            {t('customContent.editor.ancestryForm.traitAdd')}
          </Button>
        </fieldset>

        {/* Languages chip input */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="ancestry-form-languages"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.ancestryForm.languagesLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.ancestryForm.languagesHelper')}
          </p>
          {draft.languages.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.languages.map((lang) => (
                <Chip
                  key={lang}
                  variant="default"
                  onToggle={() => removeLanguage(lang)}
                  data-testid="ancestry-form-language-chip"
                  data-language={lang}
                >
                  {lang} ×
                </Chip>
              ))}
            </div>
          ) : (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="ancestry-form-languages-empty"
            >
              {t('customContent.editor.ancestryForm.languagesEmpty')}
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr,auto] sm:items-end">
            <FieldString
              label={t('customContent.editor.ancestryForm.languageAdd')}
              value={languageDraft}
              onChange={setLanguageDraft}
              placeholder={t(
                'customContent.editor.ancestryForm.languageAddPlaceholder',
              )}
              testId="ancestry-form-language-input"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={addLanguage}
              disabled={!languageDraft.trim()}
              data-testid="ancestry-form-language-add"
            >
              {t('customContent.editor.ancestryForm.languageAddButton')}
            </Button>
          </div>
        </fieldset>

        {/* Common spell ids — chips toggle */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="ancestry-form-common-spells"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.ancestryForm.commonSpellsLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {spellsLoading
              ? t('customContent.editor.ancestryForm.commonSpellsLoading')
              : t('customContent.editor.ancestryForm.commonSpellsHelper')}
          </p>
          {spells.length === 0 && !spellsLoading ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="ancestry-form-common-spells-empty"
            >
              {t('customContent.editor.ancestryForm.commonSpellsEmpty')}
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {spells.map((spell) => {
                const active = draft.commonSpellIds.includes(spell.id);
                return (
                  <Chip
                    key={spell.id}
                    active={active}
                    variant={active ? 'gold' : 'default'}
                    onToggle={() => toggleSpell(spell.id)}
                    data-testid={`ancestry-form-common-spell-${spell.id}`}
                    data-active={active ? 'true' : 'false'}
                  >
                    {spell.name.fr}
                  </Chip>
                );
              })}
            </div>
          )}
        </fieldset>

        {/* Dragon ancestries repeater (optional) */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="ancestry-form-dragon"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.ancestryForm.dragonLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.ancestryForm.dragonHelper')}
          </p>
          {draft.dragonAncestries.length === 0 ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="ancestry-form-dragon-empty"
            >
              {t('customContent.editor.ancestryForm.dragonEmpty')}
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {draft.dragonAncestries.map((opt, idx) => (
                <li
                  key={idx}
                  className="rounded-card border border-white-8 bg-glass px-4 py-4 backdrop-blur-xl"
                  data-testid="ancestry-form-dragon-row"
                  data-dragon-index={idx}
                >
                  <FieldString
                    label={t(
                      'customContent.editor.ancestryForm.dragonOptionId',
                    )}
                    value={opt.id}
                    onChange={(value) => updateDragon(idx, { id: value })}
                    placeholder={t(
                      'customContent.editor.ancestryForm.dragonOptionIdPlaceholder',
                    )}
                    required
                    testId={`ancestry-form-dragon-id-${idx}`}
                  />
                  <div className="mt-3">
                    <FieldI18n
                      labelFr={t(
                        'customContent.editor.ancestryForm.dragonOptionNameFr',
                      )}
                      labelEn={t(
                        'customContent.editor.ancestryForm.dragonOptionNameEn',
                      )}
                      valueFr={opt.nameFr}
                      valueEn={opt.nameEn}
                      onChangeFr={(value) =>
                        updateDragon(idx, { nameFr: value })
                      }
                      onChangeEn={(value) =>
                        updateDragon(idx, { nameEn: value })
                      }
                      requiredFr
                      testIdFr={`ancestry-form-dragon-name-fr-${idx}`}
                      testIdEn={`ancestry-form-dragon-name-en-${idx}`}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FieldEnum
                      label={t(
                        'customContent.editor.ancestryForm.dragonOptionDamageType',
                      )}
                      value={opt.damageType}
                      options={damageTypeOptions}
                      onChange={(value) =>
                        updateDragon(idx, { damageType: value as DamageType })
                      }
                      required
                      testId={`ancestry-form-dragon-damage-type-${idx}`}
                    />
                  </div>
                  <div className="mt-3">
                    <FieldI18n
                      labelFr={t(
                        'customContent.editor.ancestryForm.dragonOptionDamageLabelFr',
                      )}
                      labelEn={t(
                        'customContent.editor.ancestryForm.dragonOptionDamageLabelEn',
                      )}
                      valueFr={opt.damageTypeLabelFr}
                      valueEn={opt.damageTypeLabelEn}
                      onChangeFr={(value) =>
                        updateDragon(idx, { damageTypeLabelFr: value })
                      }
                      onChangeEn={(value) =>
                        updateDragon(idx, { damageTypeLabelEn: value })
                      }
                      requiredFr
                      testIdFr={`ancestry-form-dragon-damage-label-fr-${idx}`}
                      testIdEn={`ancestry-form-dragon-damage-label-en-${idx}`}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDragon(idx)}
                      data-testid={`ancestry-form-dragon-remove-${idx}`}
                    >
                      {t('customContent.editor.ancestryForm.removeRow')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {errors.dragonAncestries ? (
            <p
              className="mt-2 font-serif text-[13px] text-crimson"
              role="alert"
            >
              {errors.dragonAncestries}
            </p>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={addDragon}
            data-testid="ancestry-form-dragon-add"
            className="mt-4"
          >
            {t('customContent.editor.ancestryForm.dragonAdd')}
          </Button>
        </fieldset>

        {/* Giant ancestries repeater (optional) */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="ancestry-form-giant"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.ancestryForm.giantLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.ancestryForm.giantHelper')}
          </p>
          {draft.giantAncestries.length === 0 ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="ancestry-form-giant-empty"
            >
              {t('customContent.editor.ancestryForm.giantEmpty')}
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {draft.giantAncestries.map((opt, idx) => (
                <li
                  key={idx}
                  className="rounded-card border border-white-8 bg-glass px-4 py-4 backdrop-blur-xl"
                  data-testid="ancestry-form-giant-row"
                  data-giant-index={idx}
                >
                  <FieldString
                    label={t(
                      'customContent.editor.ancestryForm.giantOptionId',
                    )}
                    value={opt.id}
                    onChange={(value) => updateGiant(idx, { id: value })}
                    placeholder={t(
                      'customContent.editor.ancestryForm.giantOptionIdPlaceholder',
                    )}
                    required
                    testId={`ancestry-form-giant-id-${idx}`}
                  />
                  <div className="mt-3">
                    <FieldI18n
                      labelFr={t(
                        'customContent.editor.ancestryForm.giantOptionNameFr',
                      )}
                      labelEn={t(
                        'customContent.editor.ancestryForm.giantOptionNameEn',
                      )}
                      valueFr={opt.nameFr}
                      valueEn={opt.nameEn}
                      onChangeFr={(value) =>
                        updateGiant(idx, { nameFr: value })
                      }
                      onChangeEn={(value) =>
                        updateGiant(idx, { nameEn: value })
                      }
                      requiredFr
                      testIdFr={`ancestry-form-giant-name-fr-${idx}`}
                      testIdEn={`ancestry-form-giant-name-en-${idx}`}
                    />
                  </div>
                  <div className="mt-3">
                    <FieldI18n
                      labelFr={t(
                        'customContent.editor.ancestryForm.giantOptionEffectFr',
                      )}
                      labelEn={t(
                        'customContent.editor.ancestryForm.giantOptionEffectEn',
                      )}
                      valueFr={opt.effectFr}
                      valueEn={opt.effectEn}
                      onChangeFr={(value) =>
                        updateGiant(idx, { effectFr: value })
                      }
                      onChangeEn={(value) =>
                        updateGiant(idx, { effectEn: value })
                      }
                      requiredFr
                      testIdFr={`ancestry-form-giant-effect-fr-${idx}`}
                      testIdEn={`ancestry-form-giant-effect-en-${idx}`}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGiant(idx)}
                      data-testid={`ancestry-form-giant-remove-${idx}`}
                    >
                      {t('customContent.editor.ancestryForm.removeRow')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {errors.giantAncestries ? (
            <p
              className="mt-2 font-serif text-[13px] text-crimson"
              role="alert"
            >
              {errors.giantAncestries}
            </p>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={addGiant}
            data-testid="ancestry-form-giant-add"
            className="mt-4"
          >
            {t('customContent.editor.ancestryForm.giantAdd')}
          </Button>
        </fieldset>
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onCancel}
          data-testid="ancestry-form-cancel"
        >
          {t('customContent.editor.ancestryForm.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          data-testid="ancestry-form-confirm"
        >
          {t('customContent.editor.ancestryForm.confirm')}
        </Button>
      </div>
    </GlassPanel>
  );
}
