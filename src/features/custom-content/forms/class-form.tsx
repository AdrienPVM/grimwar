import { useCallback, useState } from 'react';

import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { GlassPanel } from '@/shared/components/glass-panel';
import { t } from '@/shared/lib/i18n';
import {
  ClassSchema,
  type ClassEntity,
  type CoinUnit,
} from '@/shared/types/content';

import { FieldEnum } from './fields/field-enum';
import { FieldI18n } from './fields/field-i18n';
import { FieldNumber } from './fields/field-number';
import { FieldString } from './fields/field-string';

/**
 * Formulaire de création d'une Classe custom (JALON 3C.9).
 *
 * Schéma source : `ClassSchema`. Surface V1 ciblée sur les fondations d'une
 * classe homebrew simple :
 *   - id (slug), name (i18n FR), description (i18n FR)
 *   - hitDie (enum d6/d8/d10/d12)
 *   - primaryAbility[] / saveProficiencies[] (chips toggle d'aptitude)
 *   - armorProficiencies / weaponProficiencies / toolProficiencies (chip input libre)
 *   - skillChoices { count, from[] }
 *   - spellcasting toggle : { ability, progression } nullable
 *   - startingEquipment : 1 option d'équipement V1 (items[] + coins nullable)
 *   - features[] : répéteur { level, name i18n, description i18n } — utile
 *     surtout pour 2-3 traits L1 ; la table complète L2-L20 n'est PAS gérée
 *     ici (hint explicite vers l'édition JSON)
 *   - multiclassPrerequisite : toggle, combinator AND/OR + minima
 *   - multiclassProficiencies : { armor, weapons, tools } toujours présents
 *
 * Hors scope V1 (V2 via JSON edit) :
 *   - Table de progression L2-L20 (`classResourceProgression`, `spellProgression`).
 *   - Sous-choix L1 type Divine Order / Primal Order.
 *   - Weapon Mastery (`weaponMasteryCount` + `weaponMasteryEligibility` —
 *     filtrage cross-bundle des armes éligibles, complexe pour V1).
 *   - Multiples options d'équipement A/B/C (SRD 2024 propose souvent 2-3
 *     paquets — V1 livre 1 option).
 *
 * Pour éviter la branche `superRefine` du `ClassSchema` qui exige
 * `divineOrders`/`primalOrders` non vide quand `id === 'cleric' || 'druid'`,
 * on bloque les 12 ids SRD officiels à la validation — un homebrew ne peut
 * pas re-définir une classe SRD avec le même id (de toute façon le merger
 * SRD ∪ custom écraserait, et l'écrasement d'une classe complète serait
 * généralement une erreur de l'utilisateur).
 *
 * `source` est figé à `aidedd-homebrew` — convention partagée 3C.
 */

const ABILITY_KEYS = ['for', 'dex', 'con', 'int', 'sag', 'cha'] as const;
type AbilityKey = (typeof ABILITY_KEYS)[number];

const HIT_DICE = ['d6', 'd8', 'd10', 'd12'] as const;
type HitDie = (typeof HIT_DICE)[number];

const SPELLCASTING_ABILITIES = ['int', 'sag', 'cha'] as const;
type SpellcastingAbility = (typeof SPELLCASTING_ABILITIES)[number];

const SPELLCASTING_PROGRESSIONS = ['full', 'half', 'third', 'pact'] as const;
type SpellcastingProgression = (typeof SPELLCASTING_PROGRESSIONS)[number];

const COIN_UNITS: readonly CoinUnit[] = ['cp', 'sp', 'ep', 'gp', 'pp'];

const RESERVED_CLASS_IDS = new Set([
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
]);

interface FeatureDraft {
  level: number;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
}

interface StartingItemDraft {
  itemId: string;
  qty: number;
}

interface MulticlassMinimumDraft {
  ability: AbilityKey | '';
  minimum: number;
}

export interface ClassFormDraft {
  id: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  hitDie: HitDie;
  primaryAbility: AbilityKey[];
  saveProficiencies: AbilityKey[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  skillChoiceCount: number;
  skillChoiceFrom: string[];
  spellcastingEnabled: boolean;
  spellcastingAbility: SpellcastingAbility;
  spellcastingProgression: SpellcastingProgression;
  startingEquipmentItems: StartingItemDraft[];
  startingEquipmentCoinsIncluded: boolean;
  startingEquipmentCoinsQty: number;
  startingEquipmentCoinsUnit: CoinUnit;
  features: FeatureDraft[];
  multiclassPrerequisiteEnabled: boolean;
  multiclassCombinator: 'and' | 'or';
  multiclassMinima: MulticlassMinimumDraft[];
  multiclassArmor: string[];
  multiclassWeapons: string[];
  multiclassTools: string[];
}

export const EMPTY_FEATURE_DRAFT: FeatureDraft = {
  level: 1,
  nameFr: '',
  nameEn: '',
  descriptionFr: '',
  descriptionEn: '',
};

export const EMPTY_STARTING_ITEM_DRAFT: StartingItemDraft = {
  itemId: '',
  qty: 1,
};

export const EMPTY_MULTICLASS_MIN_DRAFT: MulticlassMinimumDraft = {
  ability: '',
  minimum: 13,
};

export const EMPTY_CLASS_DRAFT: ClassFormDraft = {
  id: '',
  nameFr: '',
  nameEn: '',
  descriptionFr: '',
  descriptionEn: '',
  hitDie: 'd8',
  primaryAbility: [],
  saveProficiencies: [],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoiceCount: 0,
  skillChoiceFrom: [],
  spellcastingEnabled: false,
  spellcastingAbility: 'int',
  spellcastingProgression: 'full',
  startingEquipmentItems: [],
  startingEquipmentCoinsIncluded: false,
  startingEquipmentCoinsQty: 0,
  startingEquipmentCoinsUnit: 'gp',
  features: [],
  multiclassPrerequisiteEnabled: false,
  multiclassCombinator: 'and',
  multiclassMinima: [],
  multiclassArmor: [],
  multiclassWeapons: [],
  multiclassTools: [],
};

function i18nFrEn(fr: string, en: string): { fr: string; en?: string } {
  return { fr: fr.trim(), ...(en.trim() ? { en: en.trim() } : {}) };
}

export function buildClassFromDraft(draft: ClassFormDraft): ClassEntity {
  const features = draft.features.map((feature) => ({
    level: feature.level,
    name: i18nFrEn(feature.nameFr, feature.nameEn),
    description: i18nFrEn(feature.descriptionFr, feature.descriptionEn),
  }));

  const items = draft.startingEquipmentItems
    .filter((item) => item.itemId.trim().length > 0)
    .map((item) => ({ itemId: item.itemId.trim(), qty: item.qty }));
  const coins = draft.startingEquipmentCoinsIncluded
    ? { qty: draft.startingEquipmentCoinsQty, unit: draft.startingEquipmentCoinsUnit }
    : null;

  const multiclassPrerequisite = draft.multiclassPrerequisiteEnabled
    ? {
        combinator: draft.multiclassCombinator,
        scores: draft.multiclassMinima
          .filter((m) => m.ability !== '')
          .map((m) => ({
            ability: m.ability as AbilityKey,
            minimum: m.minimum,
          })),
      }
    : null;

  return {
    id: draft.id.trim(),
    name: i18nFrEn(draft.nameFr, draft.nameEn),
    hitDie: draft.hitDie,
    primaryAbility: [...draft.primaryAbility],
    saveProficiencies: [...draft.saveProficiencies],
    armorProficiencies: draft.armorProficiencies.map((s) => s.trim()).filter(Boolean),
    weaponProficiencies: draft.weaponProficiencies.map((s) => s.trim()).filter(Boolean),
    toolProficiencies: draft.toolProficiencies.map((s) => s.trim()).filter(Boolean),
    skillChoices: {
      count: draft.skillChoiceCount,
      from: draft.skillChoiceFrom.map((s) => s.trim()).filter(Boolean),
    },
    spellcasting: draft.spellcastingEnabled
      ? {
          ability: draft.spellcastingAbility,
          progression: draft.spellcastingProgression,
        }
      : null,
    startingEquipment: {
      options: [{ items, coins }],
    },
    description: i18nFrEn(draft.descriptionFr, draft.descriptionEn),
    features,
    weaponMasteryCount: 0,
    multiclassPrerequisite,
    multiclassProficiencies: {
      armor: draft.multiclassArmor.map((s) => s.trim()).filter(Boolean),
      weapons: draft.multiclassWeapons.map((s) => s.trim()).filter(Boolean),
      tools: draft.multiclassTools.map((s) => s.trim()).filter(Boolean),
    },
    source: 'aidedd-homebrew',
  };
}

export function draftFromClass(cls: ClassEntity): ClassFormDraft {
  const firstOption = cls.startingEquipment.options[0] ?? { items: [], coins: null };
  return {
    id: cls.id,
    nameFr: cls.name.fr,
    nameEn: cls.name.en ?? '',
    descriptionFr: cls.description.fr,
    descriptionEn: cls.description.en ?? '',
    hitDie: cls.hitDie,
    primaryAbility: [...cls.primaryAbility],
    saveProficiencies: [...cls.saveProficiencies],
    armorProficiencies: [...cls.armorProficiencies],
    weaponProficiencies: [...cls.weaponProficiencies],
    toolProficiencies: [...cls.toolProficiencies],
    skillChoiceCount: cls.skillChoices.count,
    skillChoiceFrom: [...cls.skillChoices.from],
    spellcastingEnabled: cls.spellcasting !== null,
    spellcastingAbility: cls.spellcasting?.ability ?? 'int',
    spellcastingProgression: cls.spellcasting?.progression ?? 'full',
    startingEquipmentItems: firstOption.items.map((it) => ({
      itemId: it.itemId,
      qty: it.qty,
    })),
    startingEquipmentCoinsIncluded: firstOption.coins !== null,
    startingEquipmentCoinsQty: firstOption.coins?.qty ?? 0,
    startingEquipmentCoinsUnit: firstOption.coins?.unit ?? 'gp',
    features: cls.features.map((feature) => ({
      level: feature.level,
      nameFr: feature.name.fr,
      nameEn: feature.name.en ?? '',
      descriptionFr: feature.description.fr,
      descriptionEn: feature.description.en ?? '',
    })),
    multiclassPrerequisiteEnabled: cls.multiclassPrerequisite != null,
    multiclassCombinator: cls.multiclassPrerequisite?.combinator ?? 'and',
    multiclassMinima:
      cls.multiclassPrerequisite?.scores.map((s) => ({
        ability: s.ability,
        minimum: s.minimum,
      })) ?? [],
    multiclassArmor: [...(cls.multiclassProficiencies?.armor ?? [])],
    multiclassWeapons: [...(cls.multiclassProficiencies?.weapons ?? [])],
    multiclassTools: [...(cls.multiclassProficiencies?.tools ?? [])],
  };
}

export function validateClassDraft(
  draft: ClassFormDraft,
):
  | { ok: true; cls: ClassEntity }
  | { ok: false; fieldErrors: Partial<Record<keyof ClassFormDraft, string>> } {
  const fieldErrors: Partial<Record<keyof ClassFormDraft, string>> = {};

  const idTrimmed = draft.id.trim();
  if (!idTrimmed) {
    fieldErrors.id = t('customContent.editor.classForm.error.idRequired');
  } else if (!/^[a-z0-9-]+$/.test(idTrimmed)) {
    fieldErrors.id = t('customContent.editor.classForm.error.idFormat');
  } else if (RESERVED_CLASS_IDS.has(idTrimmed)) {
    fieldErrors.id = t('customContent.editor.classForm.error.idReserved');
  }
  if (!draft.nameFr.trim()) {
    fieldErrors.nameFr = t('customContent.editor.classForm.error.nameFrRequired');
  }
  if (!draft.descriptionFr.trim()) {
    fieldErrors.descriptionFr = t(
      'customContent.editor.classForm.error.descriptionFrRequired',
    );
  }
  if (draft.primaryAbility.length === 0) {
    fieldErrors.primaryAbility = t(
      'customContent.editor.classForm.error.primaryAbilityRequired',
    );
  }
  if (draft.saveProficiencies.length === 0) {
    fieldErrors.saveProficiencies = t(
      'customContent.editor.classForm.error.saveProficienciesRequired',
    );
  }
  if (!Number.isFinite(draft.skillChoiceCount) || draft.skillChoiceCount < 0) {
    fieldErrors.skillChoiceCount = t(
      'customContent.editor.classForm.error.skillChoiceCountInvalid',
    );
  }
  if (draft.skillChoiceFrom.length < draft.skillChoiceCount) {
    fieldErrors.skillChoiceFrom = t(
      'customContent.editor.classForm.error.skillChoiceFromTooShort',
    );
  }
  for (const feature of draft.features) {
    if (
      !feature.nameFr.trim() ||
      !feature.descriptionFr.trim() ||
      feature.level < 1 ||
      feature.level > 20
    ) {
      fieldErrors.features = t(
        'customContent.editor.classForm.error.featureIncomplete',
      );
      break;
    }
  }
  if (
    draft.startingEquipmentCoinsIncluded &&
    (!Number.isFinite(draft.startingEquipmentCoinsQty) ||
      draft.startingEquipmentCoinsQty < 0)
  ) {
    fieldErrors.startingEquipmentCoinsQty = t(
      'customContent.editor.classForm.error.coinsInvalid',
    );
  }
  for (const item of draft.startingEquipmentItems) {
    const id = item.itemId.trim();
    if (id && !/^[a-z0-9-]+$/.test(id)) {
      fieldErrors.startingEquipmentItems = t(
        'customContent.editor.classForm.error.startingItemIdFormat',
      );
      break;
    }
    if (id && (!Number.isFinite(item.qty) || item.qty <= 0)) {
      fieldErrors.startingEquipmentItems = t(
        'customContent.editor.classForm.error.startingItemQtyInvalid',
      );
      break;
    }
  }
  if (draft.multiclassPrerequisiteEnabled) {
    if (draft.multiclassMinima.length === 0) {
      fieldErrors.multiclassMinima = t(
        'customContent.editor.classForm.error.multiclassMinimumRequired',
      );
    } else if (draft.multiclassMinima.some((m) => m.ability === '')) {
      fieldErrors.multiclassMinima = t(
        'customContent.editor.classForm.error.multiclassMinimumAbilityRequired',
      );
    } else {
      const seen = new Set<string>();
      for (const min of draft.multiclassMinima) {
        if (seen.has(min.ability)) {
          fieldErrors.multiclassMinima = t(
            'customContent.editor.classForm.error.multiclassMinimumDuplicate',
          );
          break;
        }
        seen.add(min.ability);
        if (min.minimum < 1 || min.minimum > 20) {
          fieldErrors.multiclassMinima = t(
            'customContent.editor.classForm.error.multiclassMinimumOutOfRange',
          );
          break;
        }
      }
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const candidate = buildClassFromDraft(draft);
  const parsed = ClassSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const fieldKey = String(issue?.path[0] ?? 'id') as keyof ClassFormDraft;
    fieldErrors[fieldKey] = issue?.message ?? 'invalid';
    return { ok: false, fieldErrors };
  }
  return { ok: true, cls: parsed.data };
}

interface ClassFormProps {
  draft: ClassFormDraft;
  onChange: (draft: ClassFormDraft) => void;
  onConfirm: (cls: ClassEntity) => void;
  onCancel: () => void;
}

export function ClassForm({
  draft,
  onChange,
  onConfirm,
  onCancel,
}: ClassFormProps): JSX.Element {
  const [errors, setErrors] = useState<
    Partial<Record<keyof ClassFormDraft, string>>
  >({});
  const [armorInput, setArmorInput] = useState<string>('');
  const [weaponInput, setWeaponInput] = useState<string>('');
  const [toolInput, setToolInput] = useState<string>('');
  const [skillInput, setSkillInput] = useState<string>('');
  const [multiArmorInput, setMultiArmorInput] = useState<string>('');
  const [multiWeaponInput, setMultiWeaponInput] = useState<string>('');
  const [multiToolInput, setMultiToolInput] = useState<string>('');

  const update = useCallback(
    <K extends keyof ClassFormDraft>(key: K, value: ClassFormDraft[K]) => {
      onChange({ ...draft, [key]: value });
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [draft, errors, onChange],
  );

  const handleConfirm = useCallback(() => {
    const result = validateClassDraft(draft);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    onConfirm(result.cls);
  }, [draft, onConfirm]);

  // Ability toggles ---
  const toggleAbility = (
    key: 'primaryAbility' | 'saveProficiencies',
    ability: AbilityKey,
  ): void => {
    const current = draft[key];
    update(
      key,
      current.includes(ability)
        ? current.filter((a) => a !== ability)
        : [...current, ability],
    );
  };

  // Chip input helpers ---
  const addChipTo = (
    key: keyof Pick<
      ClassFormDraft,
      | 'armorProficiencies'
      | 'weaponProficiencies'
      | 'toolProficiencies'
      | 'skillChoiceFrom'
      | 'multiclassArmor'
      | 'multiclassWeapons'
      | 'multiclassTools'
    >,
    input: string,
    setInput: (next: string) => void,
  ): void => {
    const next = input.trim();
    if (!next) return;
    const list = draft[key];
    if (list.includes(next)) {
      setInput('');
      return;
    }
    update(key, [...list, next]);
    setInput('');
  };

  const removeChipFrom = (
    key: keyof Pick<
      ClassFormDraft,
      | 'armorProficiencies'
      | 'weaponProficiencies'
      | 'toolProficiencies'
      | 'skillChoiceFrom'
      | 'multiclassArmor'
      | 'multiclassWeapons'
      | 'multiclassTools'
    >,
    value: string,
  ): void => {
    update(
      key,
      draft[key].filter((v) => v !== value),
    );
  };

  // Features helpers ---
  const addFeature = (): void => {
    update('features', [...draft.features, EMPTY_FEATURE_DRAFT]);
  };
  const updateFeature = (idx: number, patch: Partial<FeatureDraft>): void => {
    update(
      'features',
      draft.features.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    );
  };
  const removeFeature = (idx: number): void => {
    update(
      'features',
      draft.features.filter((_, i) => i !== idx),
    );
  };

  // Starting equipment items helpers ---
  const addStartingItem = (): void => {
    update('startingEquipmentItems', [
      ...draft.startingEquipmentItems,
      EMPTY_STARTING_ITEM_DRAFT,
    ]);
  };
  const updateStartingItem = (
    idx: number,
    patch: Partial<StartingItemDraft>,
  ): void => {
    update(
      'startingEquipmentItems',
      draft.startingEquipmentItems.map((it, i) =>
        i === idx ? { ...it, ...patch } : it,
      ),
    );
  };
  const removeStartingItem = (idx: number): void => {
    update(
      'startingEquipmentItems',
      draft.startingEquipmentItems.filter((_, i) => i !== idx),
    );
  };

  // Multiclass minima helpers ---
  const addMulticlassMin = (): void => {
    update('multiclassMinima', [
      ...draft.multiclassMinima,
      EMPTY_MULTICLASS_MIN_DRAFT,
    ]);
  };
  const updateMulticlassMin = (
    idx: number,
    patch: Partial<MulticlassMinimumDraft>,
  ): void => {
    update(
      'multiclassMinima',
      draft.multiclassMinima.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    );
  };
  const removeMulticlassMin = (idx: number): void => {
    update(
      'multiclassMinima',
      draft.multiclassMinima.filter((_, i) => i !== idx),
    );
  };

  const hitDieOptions = HIT_DICE.map((value) => ({
    value,
    label: value.toUpperCase(),
  }));
  const spellcastingAbilityOptions = SPELLCASTING_ABILITIES.map((value) => ({
    value,
    label: t(`ability.${value}` as const),
  }));
  const spellcastingProgressionOptions = SPELLCASTING_PROGRESSIONS.map(
    (value) => ({
      value,
      label: t(`customContent.editor.classForm.spellcastingProgression.${value}` as const),
    }),
  );
  const coinUnitOptions = COIN_UNITS.map((value) => ({
    value,
    label: value.toUpperCase(),
  }));

  return (
    <GlassPanel className="px-6 py-6" data-testid="class-form">
      <h3 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
        {t('customContent.editor.classForm.title')}
      </h3>
      <p className="mt-2 font-serif text-body-sm italic text-text-secondary">
        {t('customContent.editor.classForm.intro')}
      </p>
      <Divider className="my-4" />

      <div className="flex flex-col gap-4">
        <FieldString
          label={t('customContent.editor.classForm.id')}
          value={draft.id}
          onChange={(value) => update('id', value)}
          helper={t('customContent.editor.classForm.idHelper')}
          error={errors.id}
          required
          testId="class-form-id"
        />
        <FieldI18n
          labelFr={t('customContent.editor.classForm.nameFr')}
          labelEn={t('customContent.editor.classForm.nameEn')}
          valueFr={draft.nameFr}
          valueEn={draft.nameEn}
          onChangeFr={(value) => update('nameFr', value)}
          onChangeEn={(value) => update('nameEn', value)}
          requiredFr
          errorFr={errors.nameFr}
          testIdFr="class-form-name-fr"
          testIdEn="class-form-name-en"
        />
        <FieldI18n
          labelFr={t('customContent.editor.classForm.descriptionFr')}
          labelEn={t('customContent.editor.classForm.descriptionEn')}
          valueFr={draft.descriptionFr}
          valueEn={draft.descriptionEn}
          onChangeFr={(value) => update('descriptionFr', value)}
          onChangeEn={(value) => update('descriptionEn', value)}
          requiredFr
          errorFr={errors.descriptionFr}
          testIdFr="class-form-description-fr"
          testIdEn="class-form-description-en"
        />
        <FieldEnum
          label={t('customContent.editor.classForm.hitDie')}
          value={draft.hitDie}
          options={hitDieOptions}
          onChange={(value) => update('hitDie', value as HitDie)}
          helper={t('customContent.editor.classForm.hitDieHelper')}
          required
          testId="class-form-hit-die"
        />

        {/* Primary ability */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="class-form-primary-ability"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.classForm.primaryAbilityLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.classForm.primaryAbilityHelper')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ABILITY_KEYS.map((ability) => {
              const active = draft.primaryAbility.includes(ability);
              return (
                <Chip
                  key={ability}
                  active={active}
                  variant={active ? 'gold' : 'default'}
                  onToggle={() => toggleAbility('primaryAbility', ability)}
                  data-testid={`class-form-primary-${ability}`}
                  data-active={active ? 'true' : 'false'}
                >
                  {t(`ability.${ability}` as const)}
                </Chip>
              );
            })}
          </div>
          {errors.primaryAbility ? (
            <p className="mt-2 font-serif text-[13px] text-crimson" role="alert">
              {errors.primaryAbility}
            </p>
          ) : null}
        </fieldset>

        {/* Save proficiencies */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="class-form-save-proficiencies"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.classForm.saveProficienciesLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.classForm.saveProficienciesHelper')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ABILITY_KEYS.map((ability) => {
              const active = draft.saveProficiencies.includes(ability);
              return (
                <Chip
                  key={ability}
                  active={active}
                  variant={active ? 'gold' : 'default'}
                  onToggle={() => toggleAbility('saveProficiencies', ability)}
                  data-testid={`class-form-save-${ability}`}
                  data-active={active ? 'true' : 'false'}
                >
                  {t(`ability.${ability}` as const)}
                </Chip>
              );
            })}
          </div>
          {errors.saveProficiencies ? (
            <p className="mt-2 font-serif text-[13px] text-crimson" role="alert">
              {errors.saveProficiencies}
            </p>
          ) : null}
        </fieldset>

        {/* Skill choices */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="class-form-skill-choices"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.classForm.skillChoicesLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.classForm.skillChoicesHelper')}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FieldNumber
              label={t('customContent.editor.classForm.skillChoiceCount')}
              value={draft.skillChoiceCount}
              onChange={(value) => update('skillChoiceCount', value)}
              min={0}
              max={6}
              step={1}
              required
              error={errors.skillChoiceCount}
              testId="class-form-skill-count"
            />
            <div className="sm:col-span-2">
              <ChipInputField
                legend={t('customContent.editor.classForm.skillChoiceFrom')}
                helper={t('customContent.editor.classForm.skillChoiceFromHelper')}
                values={draft.skillChoiceFrom}
                input={skillInput}
                setInput={setSkillInput}
                onAdd={() =>
                  addChipTo('skillChoiceFrom', skillInput, setSkillInput)
                }
                onRemove={(v) => removeChipFrom('skillChoiceFrom', v)}
                placeholder={t(
                  'customContent.editor.classForm.skillChoiceFromPlaceholder',
                )}
                emptyText={t(
                  'customContent.editor.classForm.skillChoiceFromEmpty',
                )}
                addLabel={t('customContent.editor.classForm.chipAdd')}
                inputLabel={t('customContent.editor.classForm.chipInputLabel')}
                error={errors.skillChoiceFrom}
                testIdPrefix="class-form-skill-from"
              />
            </div>
          </div>
        </fieldset>

        {/* Proficiencies (armor / weapons / tools) */}
        <ChipInputField
          legend={t('customContent.editor.classForm.armorProficiencies')}
          helper={t('customContent.editor.classForm.armorProficienciesHelper')}
          values={draft.armorProficiencies}
          input={armorInput}
          setInput={setArmorInput}
          onAdd={() =>
            addChipTo('armorProficiencies', armorInput, setArmorInput)
          }
          onRemove={(v) => removeChipFrom('armorProficiencies', v)}
          placeholder={t(
            'customContent.editor.classForm.armorProficienciesPlaceholder',
          )}
          emptyText={t('customContent.editor.classForm.armorProficienciesEmpty')}
          addLabel={t('customContent.editor.classForm.chipAdd')}
          inputLabel={t('customContent.editor.classForm.chipInputLabel')}
          testIdPrefix="class-form-armor"
        />
        <ChipInputField
          legend={t('customContent.editor.classForm.weaponProficiencies')}
          helper={t('customContent.editor.classForm.weaponProficienciesHelper')}
          values={draft.weaponProficiencies}
          input={weaponInput}
          setInput={setWeaponInput}
          onAdd={() =>
            addChipTo('weaponProficiencies', weaponInput, setWeaponInput)
          }
          onRemove={(v) => removeChipFrom('weaponProficiencies', v)}
          placeholder={t(
            'customContent.editor.classForm.weaponProficienciesPlaceholder',
          )}
          emptyText={t(
            'customContent.editor.classForm.weaponProficienciesEmpty',
          )}
          addLabel={t('customContent.editor.classForm.chipAdd')}
          inputLabel={t('customContent.editor.classForm.chipInputLabel')}
          testIdPrefix="class-form-weapon"
        />
        <ChipInputField
          legend={t('customContent.editor.classForm.toolProficiencies')}
          helper={t('customContent.editor.classForm.toolProficienciesHelper')}
          values={draft.toolProficiencies}
          input={toolInput}
          setInput={setToolInput}
          onAdd={() => addChipTo('toolProficiencies', toolInput, setToolInput)}
          onRemove={(v) => removeChipFrom('toolProficiencies', v)}
          placeholder={t(
            'customContent.editor.classForm.toolProficienciesPlaceholder',
          )}
          emptyText={t('customContent.editor.classForm.toolProficienciesEmpty')}
          addLabel={t('customContent.editor.classForm.chipAdd')}
          inputLabel={t('customContent.editor.classForm.chipInputLabel')}
          testIdPrefix="class-form-tool"
        />

        {/* Spellcasting */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="class-form-spellcasting"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.classForm.spellcastingLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.classForm.spellcastingHelper')}
          </p>
          <label className="mt-3 flex items-center gap-2 font-serif text-body-sm text-text">
            <input
              type="checkbox"
              checked={draft.spellcastingEnabled}
              onChange={(e) => update('spellcastingEnabled', e.target.checked)}
              data-testid="class-form-spellcasting-toggle"
              className="h-4 w-4 rounded border border-soft bg-glass"
            />
            {t('customContent.editor.classForm.spellcastingToggle')}
          </label>
          {draft.spellcastingEnabled ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldEnum
                label={t('customContent.editor.classForm.spellcastingAbility')}
                value={draft.spellcastingAbility}
                options={spellcastingAbilityOptions}
                onChange={(value) =>
                  update('spellcastingAbility', value as SpellcastingAbility)
                }
                required
                testId="class-form-spellcasting-ability"
              />
              <FieldEnum
                label={t(
                  'customContent.editor.classForm.spellcastingProgression',
                )}
                value={draft.spellcastingProgression}
                options={spellcastingProgressionOptions}
                onChange={(value) =>
                  update(
                    'spellcastingProgression',
                    value as SpellcastingProgression,
                  )
                }
                required
                testId="class-form-spellcasting-progression"
              />
            </div>
          ) : null}
        </fieldset>

        {/* Starting equipment */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="class-form-starting-equipment"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.classForm.startingEquipmentLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.classForm.startingEquipmentHelper')}
          </p>
          {draft.startingEquipmentItems.length === 0 ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="class-form-starting-items-empty"
            >
              {t('customContent.editor.classForm.startingItemsEmpty')}
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {draft.startingEquipmentItems.map((item, idx) => (
                <li
                  key={idx}
                  className="grid grid-cols-1 gap-3 rounded-card border border-white-8 bg-glass px-4 py-4 backdrop-blur-xl sm:grid-cols-[1fr_auto_auto]"
                  data-testid="class-form-starting-item-row"
                  data-starting-item-index={idx}
                >
                  <FieldString
                    label={t('customContent.editor.classForm.startingItemId')}
                    value={item.itemId}
                    onChange={(value) =>
                      updateStartingItem(idx, { itemId: value })
                    }
                    placeholder={t(
                      'customContent.editor.classForm.startingItemIdPlaceholder',
                    )}
                    testId={`class-form-starting-item-id-${idx}`}
                  />
                  <FieldNumber
                    label={t('customContent.editor.classForm.startingItemQty')}
                    value={item.qty}
                    onChange={(value) => updateStartingItem(idx, { qty: value })}
                    min={1}
                    max={99}
                    step={1}
                    testId={`class-form-starting-item-qty-${idx}`}
                  />
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStartingItem(idx)}
                      data-testid={`class-form-starting-item-remove-${idx}`}
                    >
                      {t('customContent.editor.classForm.removeRow')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {errors.startingEquipmentItems ? (
            <p className="mt-2 font-serif text-[13px] text-crimson" role="alert">
              {errors.startingEquipmentItems}
            </p>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={addStartingItem}
            data-testid="class-form-starting-item-add"
            className="mt-4"
          >
            {t('customContent.editor.classForm.startingItemAdd')}
          </Button>

          <label className="mt-5 flex items-center gap-2 font-serif text-body-sm text-text">
            <input
              type="checkbox"
              checked={draft.startingEquipmentCoinsIncluded}
              onChange={(e) =>
                update('startingEquipmentCoinsIncluded', e.target.checked)
              }
              data-testid="class-form-starting-coins-toggle"
              className="h-4 w-4 rounded border border-soft bg-glass"
            />
            {t('customContent.editor.classForm.startingCoinsToggle')}
          </label>
          {draft.startingEquipmentCoinsIncluded ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldNumber
                label={t('customContent.editor.classForm.startingCoinsQty')}
                value={draft.startingEquipmentCoinsQty}
                onChange={(value) =>
                  update('startingEquipmentCoinsQty', value)
                }
                min={0}
                max={9999}
                step={1}
                error={errors.startingEquipmentCoinsQty}
                testId="class-form-starting-coins-qty"
              />
              <FieldEnum
                label={t('customContent.editor.classForm.startingCoinsUnit')}
                value={draft.startingEquipmentCoinsUnit}
                options={coinUnitOptions}
                onChange={(value) =>
                  update('startingEquipmentCoinsUnit', value as CoinUnit)
                }
                testId="class-form-starting-coins-unit"
              />
            </div>
          ) : null}
        </fieldset>

        {/* Features repeater */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="class-form-features"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.classForm.featuresLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.classForm.featuresHelper')}
          </p>
          {draft.features.length === 0 ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="class-form-features-empty"
            >
              {t('customContent.editor.classForm.featuresEmpty')}
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {draft.features.map((feature, idx) => (
                <li
                  key={idx}
                  className="rounded-card border border-white-8 bg-glass px-4 py-4 backdrop-blur-xl"
                  data-testid="class-form-feature-row"
                  data-feature-index={idx}
                >
                  <FieldNumber
                    label={t('customContent.editor.classForm.featureLevel')}
                    value={feature.level}
                    onChange={(value) => updateFeature(idx, { level: value })}
                    min={1}
                    max={20}
                    step={1}
                    required
                    testId={`class-form-feature-level-${idx}`}
                  />
                  <div className="mt-3">
                    <FieldI18n
                      labelFr={t('customContent.editor.classForm.featureNameFr')}
                      labelEn={t('customContent.editor.classForm.featureNameEn')}
                      valueFr={feature.nameFr}
                      valueEn={feature.nameEn}
                      onChangeFr={(value) =>
                        updateFeature(idx, { nameFr: value })
                      }
                      onChangeEn={(value) =>
                        updateFeature(idx, { nameEn: value })
                      }
                      requiredFr
                      testIdFr={`class-form-feature-name-fr-${idx}`}
                      testIdEn={`class-form-feature-name-en-${idx}`}
                    />
                  </div>
                  <div className="mt-3">
                    <FieldI18n
                      labelFr={t(
                        'customContent.editor.classForm.featureDescriptionFr',
                      )}
                      labelEn={t(
                        'customContent.editor.classForm.featureDescriptionEn',
                      )}
                      valueFr={feature.descriptionFr}
                      valueEn={feature.descriptionEn}
                      onChangeFr={(value) =>
                        updateFeature(idx, { descriptionFr: value })
                      }
                      onChangeEn={(value) =>
                        updateFeature(idx, { descriptionEn: value })
                      }
                      requiredFr
                      testIdFr={`class-form-feature-description-fr-${idx}`}
                      testIdEn={`class-form-feature-description-en-${idx}`}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeature(idx)}
                      data-testid={`class-form-feature-remove-${idx}`}
                    >
                      {t('customContent.editor.classForm.removeRow')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {errors.features ? (
            <p className="mt-2 font-serif text-[13px] text-crimson" role="alert">
              {errors.features}
            </p>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={addFeature}
            data-testid="class-form-feature-add"
            className="mt-4"
          >
            {t('customContent.editor.classForm.featureAdd')}
          </Button>
        </fieldset>

        {/* Multiclass */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="class-form-multiclass"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.classForm.multiclassLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.classForm.multiclassHelper')}
          </p>
          <label className="mt-3 flex items-center gap-2 font-serif text-body-sm text-text">
            <input
              type="checkbox"
              checked={draft.multiclassPrerequisiteEnabled}
              onChange={(e) =>
                update('multiclassPrerequisiteEnabled', e.target.checked)
              }
              data-testid="class-form-multiclass-toggle"
              className="h-4 w-4 rounded border border-soft bg-glass"
            />
            {t('customContent.editor.classForm.multiclassToggle')}
          </label>
          {draft.multiclassPrerequisiteEnabled ? (
            <div className="mt-4 space-y-4">
              <FieldEnum
                label={t('customContent.editor.classForm.multiclassCombinator')}
                value={draft.multiclassCombinator}
                options={[
                  {
                    value: 'and',
                    label: t(
                      'customContent.editor.classForm.multiclassCombinatorAnd',
                    ),
                  },
                  {
                    value: 'or',
                    label: t(
                      'customContent.editor.classForm.multiclassCombinatorOr',
                    ),
                  },
                ]}
                onChange={(value) =>
                  update('multiclassCombinator', value as 'and' | 'or')
                }
                required
                testId="class-form-multiclass-combinator"
              />
              {draft.multiclassMinima.length === 0 ? (
                <p
                  className="font-serif text-body-sm italic text-text-secondary"
                  data-testid="class-form-multiclass-minima-empty"
                >
                  {t('customContent.editor.classForm.multiclassMinimaEmpty')}
                </p>
              ) : (
                <ul className="space-y-3">
                  {draft.multiclassMinima.map((min, idx) => (
                    <li
                      key={idx}
                      className="grid grid-cols-1 gap-3 rounded-card border border-white-8 bg-glass px-4 py-4 backdrop-blur-xl sm:grid-cols-[1fr_1fr_auto]"
                      data-testid="class-form-multiclass-min-row"
                      data-multiclass-min-index={idx}
                    >
                      <FieldEnum
                        label={t(
                          'customContent.editor.classForm.multiclassMinAbility',
                        )}
                        value={min.ability}
                        options={ABILITY_KEYS.map((a) => ({
                          value: a,
                          label: t(`ability.${a}` as const),
                        }))}
                        onChange={(value) =>
                          updateMulticlassMin(idx, {
                            ability: (value as AbilityKey) || '',
                          })
                        }
                        placeholder={t(
                          'customContent.editor.classForm.multiclassMinAbilityPlaceholder',
                        )}
                        required
                        testId={`class-form-multiclass-min-ability-${idx}`}
                      />
                      <FieldNumber
                        label={t(
                          'customContent.editor.classForm.multiclassMinValue',
                        )}
                        value={min.minimum}
                        onChange={(value) =>
                          updateMulticlassMin(idx, { minimum: value })
                        }
                        min={1}
                        max={20}
                        step={1}
                        required
                        testId={`class-form-multiclass-min-value-${idx}`}
                      />
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMulticlassMin(idx)}
                          data-testid={`class-form-multiclass-min-remove-${idx}`}
                        >
                          {t('customContent.editor.classForm.removeRow')}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {errors.multiclassMinima ? (
                <p
                  className="font-serif text-[13px] text-crimson"
                  role="alert"
                >
                  {errors.multiclassMinima}
                </p>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                onClick={addMulticlassMin}
                data-testid="class-form-multiclass-min-add"
              >
                {t('customContent.editor.classForm.multiclassMinAdd')}
              </Button>
            </div>
          ) : null}

          {/* Multiclass proficiencies (always editable) */}
          <div className="mt-5 space-y-4">
            <ChipInputField
              legend={t('customContent.editor.classForm.multiclassArmor')}
              helper={t('customContent.editor.classForm.multiclassArmorHelper')}
              values={draft.multiclassArmor}
              input={multiArmorInput}
              setInput={setMultiArmorInput}
              onAdd={() =>
                addChipTo('multiclassArmor', multiArmorInput, setMultiArmorInput)
              }
              onRemove={(v) => removeChipFrom('multiclassArmor', v)}
              placeholder={t(
                'customContent.editor.classForm.multiclassArmorPlaceholder',
              )}
              emptyText={t('customContent.editor.classForm.multiclassArmorEmpty')}
              addLabel={t('customContent.editor.classForm.chipAdd')}
              inputLabel={t('customContent.editor.classForm.chipInputLabel')}
              testIdPrefix="class-form-mc-armor"
            />
            <ChipInputField
              legend={t('customContent.editor.classForm.multiclassWeapons')}
              helper={t(
                'customContent.editor.classForm.multiclassWeaponsHelper',
              )}
              values={draft.multiclassWeapons}
              input={multiWeaponInput}
              setInput={setMultiWeaponInput}
              onAdd={() =>
                addChipTo(
                  'multiclassWeapons',
                  multiWeaponInput,
                  setMultiWeaponInput,
                )
              }
              onRemove={(v) => removeChipFrom('multiclassWeapons', v)}
              placeholder={t(
                'customContent.editor.classForm.multiclassWeaponsPlaceholder',
              )}
              emptyText={t(
                'customContent.editor.classForm.multiclassWeaponsEmpty',
              )}
              addLabel={t('customContent.editor.classForm.chipAdd')}
              inputLabel={t('customContent.editor.classForm.chipInputLabel')}
              testIdPrefix="class-form-mc-weapons"
            />
            <ChipInputField
              legend={t('customContent.editor.classForm.multiclassTools')}
              helper={t('customContent.editor.classForm.multiclassToolsHelper')}
              values={draft.multiclassTools}
              input={multiToolInput}
              setInput={setMultiToolInput}
              onAdd={() =>
                addChipTo('multiclassTools', multiToolInput, setMultiToolInput)
              }
              onRemove={(v) => removeChipFrom('multiclassTools', v)}
              placeholder={t(
                'customContent.editor.classForm.multiclassToolsPlaceholder',
              )}
              emptyText={t('customContent.editor.classForm.multiclassToolsEmpty')}
              addLabel={t('customContent.editor.classForm.chipAdd')}
              inputLabel={t('customContent.editor.classForm.chipInputLabel')}
              testIdPrefix="class-form-mc-tools"
            />
          </div>
        </fieldset>
      </div>

      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onCancel}
          data-testid="class-form-cancel"
        >
          {t('customContent.editor.classForm.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          data-testid="class-form-confirm"
        >
          {t('customContent.editor.classForm.confirm')}
        </Button>
      </div>
    </GlassPanel>
  );
}

/**
 * Sous-composant : champ chip-input réutilisé pour les listes de proficiencies
 * et de skill choices. Mutualise le markup et les transitions douces.
 *
 * Chip = élément déjà ajouté, cliquable pour retirer (onToggle). L'input
 * sous-jacent porte le label « Nouvelle valeur » via `inputLabel` pour rester
 * accessible (FormField rejette un label vide).
 */
interface ChipInputFieldProps {
  legend: string;
  helper: string;
  inputLabel: string;
  values: string[];
  input: string;
  setInput: (value: string) => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
  placeholder: string;
  emptyText: string;
  addLabel: string;
  error?: string;
  testIdPrefix: string;
}

function ChipInputField({
  legend,
  helper,
  inputLabel,
  values,
  input,
  setInput,
  onAdd,
  onRemove,
  placeholder,
  emptyText,
  addLabel,
  error,
  testIdPrefix,
}: ChipInputFieldProps): JSX.Element {
  return (
    <fieldset
      className="rounded-card border border-soft px-4 py-4"
      data-testid={testIdPrefix}
    >
      <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
        {legend}
      </legend>
      <p className="mt-1 font-serif text-[13px] text-text-tertiary">
        {helper}
      </p>
      {values.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <Chip
              key={value}
              variant="default"
              onToggle={() => onRemove(value)}
              data-testid={`${testIdPrefix}-chip`}
              data-chip-value={value}
            >
              {value} ×
            </Chip>
          ))}
        </div>
      ) : (
        <p
          className="mt-3 font-serif text-body-sm italic text-text-secondary"
          data-testid={`${testIdPrefix}-empty`}
        >
          {emptyText}
        </p>
      )}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr,auto] sm:items-end">
        <FieldString
          label={inputLabel}
          value={input}
          onChange={setInput}
          placeholder={placeholder}
          testId={`${testIdPrefix}-input`}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={onAdd}
          disabled={!input.trim()}
          data-testid={`${testIdPrefix}-add`}
        >
          {addLabel}
        </Button>
      </div>
      {error ? (
        <p className="mt-2 font-serif text-[13px] text-crimson" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
