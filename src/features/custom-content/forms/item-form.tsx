import { useCallback, useState } from 'react';

import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { Checkbox } from '@/shared/components/form';
import { GlassPanel } from '@/shared/components/glass-panel';
import { t } from '@/shared/lib/i18n';
import {
  ItemSchema,
  damageTypeSchema,
  itemCategorySchema,
  weaponMasteryPropertySchema,
  type CoinUnit,
  type DamageType,
  type Item,
  type ItemCategory,
  type WeaponMasteryProperty,
} from '@/shared/types/content';

import { FieldEnum } from './fields/field-enum';
import { FieldI18n } from './fields/field-i18n';
import { FieldNumber } from './fields/field-number';
import { FieldString } from './fields/field-string';

/**
 * Formulaire de création d'un objet custom (JALON 3C.7).
 *
 * Schéma source : `ItemSchema`. Les 8 catégories SRD (weapon, armor, shield,
 * gear, tool, pack, mount, vehicle) sont supportées ; les sections « Arme » et
 * « Armure » ne s'affichent que pour les catégories concernées. La surface
 * couvre les 6 champs requis (id, name, category, cost?, weight, description)
 * + les champs conditionnels (damage, properties, range, masteryProperty,
 * acBase, acDexMax, strRequired, stealthDisadvantage). `source` est figé à
 * `aidedd-homebrew`.
 *
 * Modélisation des champs « nullable / optional » :
 *   - `cost: null | {qty, unit}` → toggle `hasCost`. Off → null.
 *   - `description: null | i18n` → toggle `hasDescription`. Off → null.
 *   - `damage` optional (weapon only) → toggle `hasDamage`. Off → omit.
 *   - `range` optional (weapon only, ranged) → toggle `hasRange`.
 *   - `masteryProperty` optional → toggle `hasMastery`.
 *   - `properties` optional → array of free strings (chips + add/remove).
 *   - `acBase` optional → required quand category ∈ {armor, shield}.
 *   - `acDexMax: null | number` → toggle `hasAcDexMax` (off = omit = Dex
 *     complète ajoutée ; on = number 0..N, 0 lourde, 2 intermédiaire).
 *   - `strRequired` optional → toggle.
 *   - `stealthDisadvantage` optional → toggle direct.
 *
 * Le validateur custom (`validateItemDraft`) attrape les erreurs métier
 * avant `safeParse` pour fournir des messages actionnables (idem SpellForm).
 */

interface ItemDamageDraft {
  dice: string;
  type: DamageType;
  typeLabelFr: string;
  typeLabelEn: string;
}

const COIN_UNITS: readonly CoinUnit[] = ['cp', 'sp', 'ep', 'gp', 'pp'];
const ITEM_CATEGORIES: readonly ItemCategory[] = itemCategorySchema.options;
const DAMAGE_TYPES: readonly DamageType[] = damageTypeSchema.options;
const MASTERY_PROPERTIES: readonly WeaponMasteryProperty[] =
  weaponMasteryPropertySchema.options;

export interface ItemFormDraft {
  id: string;
  nameFr: string;
  nameEn: string;
  category: ItemCategory | '';
  hasCost: boolean;
  costQty: number;
  costUnit: CoinUnit;
  weight: number;
  hasDescription: boolean;
  descriptionFr: string;
  descriptionEn: string;
  // Weapon fields
  hasDamage: boolean;
  damage: ItemDamageDraft;
  hasRange: boolean;
  rangeNormal: number;
  rangeMax: number;
  hasMastery: boolean;
  masteryProperty: WeaponMasteryProperty | '';
  properties: string[];
  propertyInput: string;
  // Armor fields
  acBase: number;
  hasAcDexMax: boolean;
  acDexMax: number;
  hasStrRequired: boolean;
  strRequired: number;
  stealthDisadvantage: boolean;
}

export const EMPTY_ITEM_DAMAGE_DRAFT: ItemDamageDraft = {
  dice: '',
  type: 'slashing',
  typeLabelFr: '',
  typeLabelEn: '',
};

export const EMPTY_ITEM_DRAFT: ItemFormDraft = {
  id: '',
  nameFr: '',
  nameEn: '',
  category: '',
  hasCost: false,
  costQty: 0,
  costUnit: 'gp',
  weight: 0,
  hasDescription: false,
  descriptionFr: '',
  descriptionEn: '',
  hasDamage: false,
  damage: EMPTY_ITEM_DAMAGE_DRAFT,
  hasRange: false,
  rangeNormal: 20,
  rangeMax: 60,
  hasMastery: false,
  masteryProperty: '',
  properties: [],
  propertyInput: '',
  acBase: 10,
  hasAcDexMax: false,
  acDexMax: 2,
  hasStrRequired: false,
  strRequired: 13,
  stealthDisadvantage: false,
};

function i18nFrEn(fr: string, en: string): { fr: string; en?: string } {
  return { fr: fr.trim(), ...(en.trim() ? { en: en.trim() } : {}) };
}

function isArmorLike(category: ItemCategory | ''): boolean {
  return category === 'armor' || category === 'shield';
}

export function buildItemFromDraft(draft: ItemFormDraft): Item {
  // `validateItemDraft` garantit que `category` n'est pas vide avant le build.
  const category = draft.category as ItemCategory;
  const result: Item = {
    id: draft.id.trim(),
    name: i18nFrEn(draft.nameFr, draft.nameEn),
    category,
    cost: draft.hasCost
      ? { qty: draft.costQty, unit: draft.costUnit }
      : null,
    weight: draft.weight,
    description:
      draft.hasDescription && draft.descriptionFr.trim()
        ? i18nFrEn(draft.descriptionFr, draft.descriptionEn)
        : null,
    source: 'aidedd-homebrew',
  };
  // Champs propriété (toutes catégories) — on garde uniquement les entrées
  // non vides, déjà dédupliquées au moment de l'ajout.
  const trimmedProps = draft.properties
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (trimmedProps.length > 0) {
    result.properties = trimmedProps;
  }
  // Champs spécifiques weapon
  if (category === 'weapon') {
    if (draft.hasDamage && draft.damage.dice.trim()) {
      result.damage = {
        dice: draft.damage.dice.trim(),
        type: draft.damage.type,
        typeLabel: i18nFrEn(draft.damage.typeLabelFr, draft.damage.typeLabelEn),
      };
    }
    if (draft.hasRange) {
      result.range = { normal: draft.rangeNormal, max: draft.rangeMax };
    }
    if (draft.hasMastery && draft.masteryProperty) {
      result.masteryProperty = draft.masteryProperty as WeaponMasteryProperty;
    }
  }
  // Champs spécifiques armor / shield
  if (isArmorLike(category)) {
    result.acBase = draft.acBase;
    if (draft.hasAcDexMax) {
      result.acDexMax = draft.acDexMax;
    }
    if (draft.hasStrRequired) {
      result.strRequired = draft.strRequired;
    }
    if (draft.stealthDisadvantage) {
      result.stealthDisadvantage = true;
    }
  }
  return result;
}

export function draftFromItem(item: Item): ItemFormDraft {
  const dmg = item.damage;
  const range = item.range;
  return {
    id: item.id,
    nameFr: item.name.fr,
    nameEn: item.name.en ?? '',
    category: item.category,
    hasCost: item.cost !== null,
    costQty: item.cost?.qty ?? 0,
    costUnit: item.cost?.unit ?? 'gp',
    weight: item.weight,
    hasDescription: item.description !== null,
    descriptionFr: item.description?.fr ?? '',
    descriptionEn: item.description?.en ?? '',
    hasDamage: dmg !== undefined,
    damage: dmg
      ? {
          dice: dmg.dice,
          type: dmg.type as DamageType,
          typeLabelFr: dmg.typeLabel.fr,
          typeLabelEn: dmg.typeLabel.en ?? '',
        }
      : EMPTY_ITEM_DAMAGE_DRAFT,
    hasRange: range !== undefined,
    rangeNormal: range?.normal ?? 20,
    rangeMax: range?.max ?? 60,
    hasMastery: item.masteryProperty !== undefined,
    masteryProperty: item.masteryProperty ?? '',
    properties: item.properties ? [...item.properties] : [],
    propertyInput: '',
    acBase: item.acBase ?? 10,
    hasAcDexMax: item.acDexMax !== undefined && item.acDexMax !== null,
    acDexMax: item.acDexMax ?? 2,
    hasStrRequired: item.strRequired !== undefined,
    strRequired: item.strRequired ?? 13,
    stealthDisadvantage: item.stealthDisadvantage ?? false,
  };
}

export function validateItemDraft(
  draft: ItemFormDraft,
):
  | { ok: true; item: Item }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof ItemFormDraft, string>>;
    } {
  const fieldErrors: Partial<Record<keyof ItemFormDraft, string>> = {};
  if (!draft.id.trim()) {
    fieldErrors.id = t('customContent.editor.itemForm.error.idRequired');
  } else if (!/^[a-z0-9-]+$/.test(draft.id.trim())) {
    fieldErrors.id = t('customContent.editor.itemForm.error.idFormat');
  }
  if (!draft.nameFr.trim()) {
    fieldErrors.nameFr = t(
      'customContent.editor.itemForm.error.nameFrRequired',
    );
  }
  if (!draft.category) {
    fieldErrors.category = t(
      'customContent.editor.itemForm.error.categoryRequired',
    );
  }
  if (draft.weight < 0) {
    fieldErrors.weight = t(
      'customContent.editor.itemForm.error.weightNegative',
    );
  }
  if (draft.hasCost && draft.costQty < 0) {
    fieldErrors.costQty = t(
      'customContent.editor.itemForm.error.costQtyNegative',
    );
  }
  if (draft.hasDescription && !draft.descriptionFr.trim()) {
    fieldErrors.descriptionFr = t(
      'customContent.editor.itemForm.error.descriptionFrRequired',
    );
  }
  if (draft.category === 'weapon' && draft.hasDamage) {
    if (!draft.damage.dice.trim()) {
      fieldErrors.damage = t(
        'customContent.editor.itemForm.error.damageDiceRequired',
      );
    } else if (!draft.damage.typeLabelFr.trim()) {
      fieldErrors.damage = t(
        'customContent.editor.itemForm.error.damageTypeLabelFrRequired',
      );
    }
  }
  if (draft.category === 'weapon' && draft.hasRange) {
    if (draft.rangeNormal <= 0) {
      fieldErrors.rangeNormal = t(
        'customContent.editor.itemForm.error.rangeNormalRequired',
      );
    } else if (draft.rangeMax < draft.rangeNormal) {
      fieldErrors.rangeMax = t(
        'customContent.editor.itemForm.error.rangeMaxLessThanNormal',
      );
    }
  }
  if (isArmorLike(draft.category) && draft.acBase <= 0) {
    fieldErrors.acBase = t(
      'customContent.editor.itemForm.error.acBaseRequired',
    );
  }
  if (
    isArmorLike(draft.category) &&
    draft.hasStrRequired &&
    draft.strRequired <= 0
  ) {
    fieldErrors.strRequired = t(
      'customContent.editor.itemForm.error.strRequiredRequired',
    );
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const candidate = buildItemFromDraft(draft);
  const parsed = ItemSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const fieldKey = String(issue?.path[0] ?? 'id') as keyof ItemFormDraft;
    fieldErrors[fieldKey] = issue?.message ?? 'invalid';
    return { ok: false, fieldErrors };
  }
  return { ok: true, item: parsed.data };
}

interface ItemFormProps {
  draft: ItemFormDraft;
  onChange: (draft: ItemFormDraft) => void;
  onConfirm: (item: Item) => void;
  onCancel: () => void;
}

export function ItemForm({
  draft,
  onChange,
  onConfirm,
  onCancel,
}: ItemFormProps): JSX.Element {
  const [errors, setErrors] = useState<
    Partial<Record<keyof ItemFormDraft, string>>
  >({});

  const update = useCallback(
    <K extends keyof ItemFormDraft>(key: K, value: ItemFormDraft[K]) => {
      onChange({ ...draft, [key]: value });
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [draft, errors, onChange],
  );

  const updateDamage = (patch: Partial<ItemDamageDraft>): void => {
    onChange({ ...draft, damage: { ...draft.damage, ...patch } });
    if (errors.damage) {
      setErrors((prev) => ({ ...prev, damage: undefined }));
    }
  };

  const handleConfirm = useCallback(() => {
    const result = validateItemDraft(draft);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    onConfirm(result.item);
  }, [draft, onConfirm]);

  const addProperty = (): void => {
    const value = draft.propertyInput.trim();
    if (!value) {
      setErrors((prev) => ({
        ...prev,
        propertyInput: t(
          'customContent.editor.itemForm.error.propertyEmpty',
        ),
      }));
      return;
    }
    if (draft.properties.includes(value)) {
      setErrors((prev) => ({
        ...prev,
        propertyInput: t(
          'customContent.editor.itemForm.error.propertyDuplicate',
        ),
      }));
      return;
    }
    onChange({
      ...draft,
      properties: [...draft.properties, value],
      propertyInput: '',
    });
    setErrors((prev) => ({ ...prev, propertyInput: undefined }));
  };

  const removeProperty = (idx: number): void => {
    update(
      'properties',
      draft.properties.filter((_, i) => i !== idx),
    );
  };

  const categoryOptions = ITEM_CATEGORIES.map((c) => ({
    value: c,
    label: t(`item.category.${c}`),
  }));

  const damageTypeOptions = DAMAGE_TYPES.map((d) => ({
    value: d,
    label: t(`damageType.${d}`),
  }));

  const masteryOptions = MASTERY_PROPERTIES.map((m) => ({
    value: m,
    label: m,
  }));

  const coinUnitOptions = COIN_UNITS.map((u) => ({
    value: u,
    label: u,
  }));

  const isWeapon = draft.category === 'weapon';
  const isArmor = isArmorLike(draft.category);

  return (
    <GlassPanel className="px-6 py-6" data-testid="item-form">
      <h3 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
        {t('customContent.editor.itemForm.title')}
      </h3>
      <Divider className="my-4" />
      <div className="flex flex-col gap-4">
        <FieldString
          label={t('customContent.editor.itemForm.id')}
          value={draft.id}
          onChange={(value) => update('id', value)}
          helper={t('customContent.editor.itemForm.idHelper')}
          error={errors.id}
          required
          testId="item-form-id"
        />
        <FieldI18n
          labelFr={t('customContent.editor.itemForm.nameFr')}
          labelEn={t('customContent.editor.itemForm.nameEn')}
          valueFr={draft.nameFr}
          valueEn={draft.nameEn}
          onChangeFr={(value) => update('nameFr', value)}
          onChangeEn={(value) => update('nameEn', value)}
          requiredFr
          errorFr={errors.nameFr}
          testIdFr="item-form-name-fr"
          testIdEn="item-form-name-en"
        />
        <FieldEnum
          label={t('customContent.editor.itemForm.category')}
          value={draft.category}
          options={categoryOptions}
          onChange={(value) => update('category', value as ItemCategory)}
          placeholder={t(
            'customContent.editor.itemForm.categoryPlaceholder',
          )}
          error={errors.category}
          required
          testId="item-form-category"
        />

        {/* Coût */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="item-form-cost"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.itemForm.hasCost')}
          </legend>
          <Checkbox
            label={t('customContent.editor.itemForm.hasCost')}
            helper={t('customContent.editor.itemForm.hasCostHelper')}
            checked={draft.hasCost}
            onChange={(event) => update('hasCost', event.target.checked)}
            data-testid="item-form-has-cost"
          />
          {draft.hasCost ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldNumber
                label={t('customContent.editor.itemForm.costQty')}
                value={draft.costQty}
                onChange={(value) => update('costQty', value)}
                min={0}
                step={1}
                error={errors.costQty}
                required
                testId="item-form-cost-qty"
              />
              <FieldEnum
                label={t('customContent.editor.itemForm.costUnit')}
                value={draft.costUnit}
                options={coinUnitOptions}
                onChange={(value) => update('costUnit', value as CoinUnit)}
                placeholder={t(
                  'customContent.editor.itemForm.costUnitPlaceholder',
                )}
                required
                testId="item-form-cost-unit"
              />
            </div>
          ) : null}
        </fieldset>

        <FieldNumber
          label={t('customContent.editor.itemForm.weight')}
          value={draft.weight}
          onChange={(value) => update('weight', value)}
          min={0}
          step={0.5}
          helper={t('customContent.editor.itemForm.weightHelper')}
          error={errors.weight}
          required
          testId="item-form-weight"
        />

        {/* Description riche (optionnelle) */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="item-form-description"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.itemForm.hasDescription')}
          </legend>
          <Checkbox
            label={t('customContent.editor.itemForm.hasDescription')}
            helper={t(
              'customContent.editor.itemForm.hasDescriptionHelper',
            )}
            checked={draft.hasDescription}
            onChange={(event) =>
              update('hasDescription', event.target.checked)
            }
            data-testid="item-form-has-description"
          />
          {draft.hasDescription ? (
            <div className="mt-4">
              <FieldI18n
                labelFr={t('customContent.editor.itemForm.descriptionFr')}
                labelEn={t('customContent.editor.itemForm.descriptionEn')}
                valueFr={draft.descriptionFr}
                valueEn={draft.descriptionEn}
                onChangeFr={(value) => update('descriptionFr', value)}
                onChangeEn={(value) => update('descriptionEn', value)}
                helperFr={t(
                  'customContent.editor.itemForm.descriptionHelper',
                )}
                requiredFr
                errorFr={errors.descriptionFr}
                testIdFr="item-form-description-fr"
                testIdEn="item-form-description-en"
              />
            </div>
          ) : null}
        </fieldset>

        {/* Section Arme — conditionnelle */}
        {isWeapon ? (
          <fieldset
            className="rounded-card border border-soft px-4 py-4"
            data-testid="item-form-weapon"
          >
            <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
              {t('customContent.editor.itemForm.weaponLegend')}
            </legend>
            <p className="mt-1 font-serif text-[13px] text-text-tertiary">
              {t('customContent.editor.itemForm.weaponHelper')}
            </p>

            {/* Dégâts */}
            <div className="mt-4">
              <Checkbox
                label={t('customContent.editor.itemForm.hasDamage')}
                helper={t(
                  'customContent.editor.itemForm.hasDamageHelper',
                )}
                checked={draft.hasDamage}
                onChange={(event) =>
                  update('hasDamage', event.target.checked)
                }
                data-testid="item-form-has-damage"
              />
              {draft.hasDamage ? (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FieldString
                    label={t('customContent.editor.itemForm.damageDice')}
                    value={draft.damage.dice}
                    onChange={(value) => updateDamage({ dice: value })}
                    placeholder={t(
                      'customContent.editor.itemForm.damageDicePlaceholder',
                    )}
                    required
                    testId="item-form-damage-dice"
                  />
                  <FieldEnum
                    label={t('customContent.editor.itemForm.damageType')}
                    value={draft.damage.type}
                    options={damageTypeOptions}
                    onChange={(value) =>
                      updateDamage({ type: value as DamageType })
                    }
                    required
                    testId="item-form-damage-type"
                  />
                  <div className="sm:col-span-2">
                    <FieldI18n
                      labelFr={t(
                        'customContent.editor.itemForm.damageTypeLabelFr',
                      )}
                      labelEn={t(
                        'customContent.editor.itemForm.damageTypeLabelEn',
                      )}
                      valueFr={draft.damage.typeLabelFr}
                      valueEn={draft.damage.typeLabelEn}
                      onChangeFr={(value) =>
                        updateDamage({ typeLabelFr: value })
                      }
                      onChangeEn={(value) =>
                        updateDamage({ typeLabelEn: value })
                      }
                      requiredFr
                      testIdFr="item-form-damage-type-label-fr"
                      testIdEn="item-form-damage-type-label-en"
                    />
                  </div>
                </div>
              ) : null}
              {errors.damage ? (
                <p
                  className="mt-2 font-serif text-[13px] text-crimson"
                  role="alert"
                >
                  {errors.damage}
                </p>
              ) : null}
            </div>

            {/* Portée */}
            <div className="mt-4">
              <Checkbox
                label={t('customContent.editor.itemForm.hasRange')}
                helper={t(
                  'customContent.editor.itemForm.hasRangeHelper',
                )}
                checked={draft.hasRange}
                onChange={(event) =>
                  update('hasRange', event.target.checked)
                }
                data-testid="item-form-has-range"
              />
              {draft.hasRange ? (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FieldNumber
                    label={t('customContent.editor.itemForm.rangeNormal')}
                    value={draft.rangeNormal}
                    onChange={(value) => update('rangeNormal', value)}
                    min={1}
                    step={5}
                    helper={t('customContent.editor.itemForm.rangeHelper')}
                    error={errors.rangeNormal}
                    required
                    testId="item-form-range-normal"
                  />
                  <FieldNumber
                    label={t('customContent.editor.itemForm.rangeMax')}
                    value={draft.rangeMax}
                    onChange={(value) => update('rangeMax', value)}
                    min={1}
                    step={5}
                    error={errors.rangeMax}
                    required
                    testId="item-form-range-max"
                  />
                </div>
              ) : null}
            </div>

            {/* Maîtrise d'arme */}
            <div className="mt-4">
              <Checkbox
                label={t('customContent.editor.itemForm.hasMastery')}
                helper={t(
                  'customContent.editor.itemForm.hasMasteryHelper',
                )}
                checked={draft.hasMastery}
                onChange={(event) =>
                  update('hasMastery', event.target.checked)
                }
                data-testid="item-form-has-mastery"
              />
              {draft.hasMastery ? (
                <div className="mt-3">
                  <FieldEnum
                    label={t(
                      'customContent.editor.itemForm.masteryProperty',
                    )}
                    value={draft.masteryProperty}
                    options={masteryOptions}
                    onChange={(value) =>
                      update(
                        'masteryProperty',
                        value as WeaponMasteryProperty,
                      )
                    }
                    placeholder={t(
                      'customContent.editor.itemForm.masteryPlaceholder',
                    )}
                    required
                    testId="item-form-mastery-property"
                  />
                </div>
              ) : null}
            </div>
          </fieldset>
        ) : null}

        {/* Section Armure — conditionnelle */}
        {isArmor ? (
          <fieldset
            className="rounded-card border border-soft px-4 py-4"
            data-testid="item-form-armor"
          >
            <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
              {t('customContent.editor.itemForm.armorLegend')}
            </legend>
            <p className="mt-1 font-serif text-[13px] text-text-tertiary">
              {t('customContent.editor.itemForm.armorHelper')}
            </p>
            <div className="mt-4">
              <FieldNumber
                label={t('customContent.editor.itemForm.acBase')}
                value={draft.acBase}
                onChange={(value) => update('acBase', value)}
                min={0}
                step={1}
                helper={t('customContent.editor.itemForm.acBaseHelper')}
                error={errors.acBase}
                required
                testId="item-form-ac-base"
              />
            </div>
            <div className="mt-4">
              <Checkbox
                label={t('customContent.editor.itemForm.hasAcDexMax')}
                helper={t(
                  'customContent.editor.itemForm.hasAcDexMaxHelper',
                )}
                checked={draft.hasAcDexMax}
                onChange={(event) =>
                  update('hasAcDexMax', event.target.checked)
                }
                data-testid="item-form-has-ac-dex-max"
              />
              {draft.hasAcDexMax ? (
                <div className="mt-3">
                  <FieldNumber
                    label={t('customContent.editor.itemForm.acDexMax')}
                    value={draft.acDexMax}
                    onChange={(value) => update('acDexMax', value)}
                    min={0}
                    step={1}
                    helper={t('customContent.editor.itemForm.acDexMaxHelper')}
                    required
                    testId="item-form-ac-dex-max"
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-4">
              <Checkbox
                label={t('customContent.editor.itemForm.hasStrRequired')}
                helper={t(
                  'customContent.editor.itemForm.hasStrRequiredHelper',
                )}
                checked={draft.hasStrRequired}
                onChange={(event) =>
                  update('hasStrRequired', event.target.checked)
                }
                data-testid="item-form-has-str-required"
              />
              {draft.hasStrRequired ? (
                <div className="mt-3">
                  <FieldNumber
                    label={t('customContent.editor.itemForm.strRequired')}
                    value={draft.strRequired}
                    onChange={(value) => update('strRequired', value)}
                    min={1}
                    step={1}
                    error={errors.strRequired}
                    required
                    testId="item-form-str-required"
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-4">
              <Checkbox
                label={t(
                  'customContent.editor.itemForm.stealthDisadvantage',
                )}
                helper={t(
                  'customContent.editor.itemForm.stealthDisadvantageHelper',
                )}
                checked={draft.stealthDisadvantage}
                onChange={(event) =>
                  update('stealthDisadvantage', event.target.checked)
                }
                data-testid="item-form-stealth-disadvantage"
              />
            </div>
          </fieldset>
        ) : null}

        {/* Propriétés libres (toutes catégories) */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="item-form-properties"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.itemForm.propertiesLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.itemForm.propertiesHelper')}
          </p>
          {draft.properties.length === 0 ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="item-form-properties-empty"
            >
              {t('customContent.editor.itemForm.propertyEmpty')}
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {draft.properties.map((p, idx) => (
                <li key={p} data-testid="item-form-property-row">
                  <Chip
                    active
                    variant="gold"
                    onToggle={() => removeProperty(idx)}
                    data-testid={`item-form-property-${idx}`}
                  >
                    {p}
                  </Chip>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr,auto] sm:items-end">
            <FieldString
              label={t('customContent.editor.itemForm.propertyAdd')}
              value={draft.propertyInput}
              onChange={(value) => update('propertyInput', value)}
              placeholder={t(
                'customContent.editor.itemForm.propertyPlaceholder',
              )}
              error={errors.propertyInput}
              testId="item-form-property-input"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={addProperty}
              data-testid="item-form-property-add"
            >
              {t('customContent.editor.itemForm.propertyAdd')}
            </Button>
          </div>
        </fieldset>
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onCancel}
          data-testid="item-form-cancel"
        >
          {t('customContent.editor.itemForm.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          data-testid="item-form-confirm"
        >
          {t('customContent.editor.itemForm.confirm')}
        </Button>
      </div>
    </GlassPanel>
  );
}
