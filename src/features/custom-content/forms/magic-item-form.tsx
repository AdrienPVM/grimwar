import { useCallback, useState } from 'react';

import { Button } from '@/shared/components/button';
import { Divider } from '@/shared/components/divider';
import { Checkbox } from '@/shared/components/form';
import { GlassPanel } from '@/shared/components/glass-panel';
import { t } from '@/shared/lib/i18n';
import {
  itemCategorySchema,
  MagicItemSchema,
  rarityScheme,
  type ItemCategory,
  type MagicItem,
  type Rarity,
} from '@/shared/types/content';

import { FieldEnum } from './fields/field-enum';
import { FieldI18n } from './fields/field-i18n';
import { FieldString } from './fields/field-string';

/**
 * Formulaire de création d'un OBJET MAGIQUE custom (directive Adrien 2026-06-27).
 *
 * Schéma source : `MagicItemSchema`. Champs requis : id, name, category
 * (8 catégories SRD), rarity (6 raretés), attunement (harmonisation),
 * magicDescription (l'effet magique). Optionnel : description (fluff non
 * mécanique). `source` est figé à `custom` (contenu joueur, hors SRD).
 *
 * Modélisation des champs nullable / union :
 *   - `attunement: boolean | i18n` → on n'expose que la forme BOOLÉENNE
 *     (« nécessite l'harmonisation » oui/non), la plus courante. La forme
 *     i18n (« par un lanceur de sorts ») reste importable en JSON brut mais
 *     n'a pas besoin d'un toggle dédié dans le formulaire v1.
 *   - `description: null | i18n` → toggle `hasDescription`. Off → null.
 *   - `effects` (union discriminée d'effets actifs) → NON exposé au formulaire
 *     v1 (réservé au JSON brut). Un objet sans `effects` est parfaitement
 *     valide ; l'immense majorité des objets magiques n'en a pas.
 */

const ITEM_CATEGORIES: readonly ItemCategory[] = itemCategorySchema.options;
const RARITIES: readonly Rarity[] = rarityScheme.options;

export interface MagicItemFormDraft {
  id: string;
  nameFr: string;
  nameEn: string;
  category: ItemCategory | '';
  rarity: Rarity | '';
  attunement: boolean;
  magicDescriptionFr: string;
  magicDescriptionEn: string;
  hasDescription: boolean;
  descriptionFr: string;
  descriptionEn: string;
}

export const EMPTY_MAGIC_ITEM_DRAFT: MagicItemFormDraft = {
  id: '',
  nameFr: '',
  nameEn: '',
  category: '',
  rarity: '',
  attunement: false,
  magicDescriptionFr: '',
  magicDescriptionEn: '',
  hasDescription: false,
  descriptionFr: '',
  descriptionEn: '',
};

function i18nFrEn(fr: string, en: string): { fr: string; en?: string } {
  return { fr: fr.trim(), ...(en.trim() ? { en: en.trim() } : {}) };
}

export function buildMagicItemFromDraft(draft: MagicItemFormDraft): MagicItem {
  // `validateMagicItemDraft` garantit category/rarity non vides avant le build.
  return {
    id: draft.id.trim(),
    name: i18nFrEn(draft.nameFr, draft.nameEn),
    category: draft.category as ItemCategory,
    rarity: draft.rarity as Rarity,
    attunement: draft.attunement,
    magicDescription: i18nFrEn(draft.magicDescriptionFr, draft.magicDescriptionEn),
    description:
      draft.hasDescription && draft.descriptionFr.trim()
        ? i18nFrEn(draft.descriptionFr, draft.descriptionEn)
        : null,
    source: 'custom',
  };
}

export function draftFromMagicItem(item: MagicItem): MagicItemFormDraft {
  return {
    id: item.id,
    nameFr: item.name.fr,
    nameEn: item.name.en ?? '',
    category: item.category,
    rarity: item.rarity,
    // Forme i18n d'attunement → on l'aplatit en « true » (nécessite harmo.) ;
    // le détail i18n n'est pas éditable au formulaire v1 mais reste préservé
    // pour les objets importés tant qu'on ne les ré-enregistre pas.
    attunement: item.attunement !== false,
    magicDescriptionFr: item.magicDescription.fr,
    magicDescriptionEn: item.magicDescription.en ?? '',
    hasDescription: item.description !== null,
    descriptionFr: item.description?.fr ?? '',
    descriptionEn: item.description?.en ?? '',
  };
}

export function validateMagicItemDraft(
  draft: MagicItemFormDraft,
):
  | { ok: true; item: MagicItem }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof MagicItemFormDraft, string>>;
    } {
  const fieldErrors: Partial<Record<keyof MagicItemFormDraft, string>> = {};
  if (!draft.id.trim()) {
    fieldErrors.id = t('customContent.editor.magicItemForm.error.idRequired');
  } else if (!/^[a-z0-9-]+$/.test(draft.id.trim())) {
    fieldErrors.id = t('customContent.editor.magicItemForm.error.idFormat');
  }
  if (!draft.nameFr.trim()) {
    fieldErrors.nameFr = t(
      'customContent.editor.magicItemForm.error.nameFrRequired',
    );
  }
  if (!draft.category) {
    fieldErrors.category = t(
      'customContent.editor.magicItemForm.error.categoryRequired',
    );
  }
  if (!draft.rarity) {
    fieldErrors.rarity = t(
      'customContent.editor.magicItemForm.error.rarityRequired',
    );
  }
  if (!draft.magicDescriptionFr.trim()) {
    fieldErrors.magicDescriptionFr = t(
      'customContent.editor.magicItemForm.error.magicDescriptionRequired',
    );
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const candidate = buildMagicItemFromDraft(draft);
  const parsed = MagicItemSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const fieldKey = String(issue?.path[0] ?? 'id') as keyof MagicItemFormDraft;
    fieldErrors[fieldKey] = issue?.message ?? 'invalid';
    return { ok: false, fieldErrors };
  }
  return { ok: true, item: parsed.data };
}

interface MagicItemFormProps {
  draft: MagicItemFormDraft;
  onChange: (draft: MagicItemFormDraft) => void;
  onConfirm: (item: MagicItem) => void;
  onCancel: () => void;
}

export function MagicItemForm({
  draft,
  onChange,
  onConfirm,
  onCancel,
}: MagicItemFormProps): JSX.Element {
  const [errors, setErrors] = useState<
    Partial<Record<keyof MagicItemFormDraft, string>>
  >({});

  const update = useCallback(
    <K extends keyof MagicItemFormDraft>(
      key: K,
      value: MagicItemFormDraft[K],
    ) => {
      onChange({ ...draft, [key]: value });
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [draft, errors, onChange],
  );

  const handleConfirm = useCallback(() => {
    const result = validateMagicItemDraft(draft);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    onConfirm(result.item);
  }, [draft, onConfirm]);

  const categoryOptions = ITEM_CATEGORIES.map((c) => ({
    value: c,
    label: t(`item.category.${c}`),
  }));

  const rarityOptions = RARITIES.map((r) => ({
    value: r,
    label: t(`rarity.${r}`),
  }));

  return (
    <GlassPanel className="px-6 py-6" data-testid="magic-item-form">
      <h3 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
        {t('customContent.editor.magicItemForm.title')}
      </h3>
      <Divider className="my-4" />
      <div className="flex flex-col gap-4">
        <FieldString
          label={t('customContent.editor.magicItemForm.id')}
          value={draft.id}
          onChange={(value) => update('id', value)}
          helper={t('customContent.editor.magicItemForm.idHelper')}
          error={errors.id}
          required
          testId="magic-item-form-id"
        />
        <FieldI18n
          labelFr={t('customContent.editor.magicItemForm.nameFr')}
          labelEn={t('customContent.editor.magicItemForm.nameEn')}
          valueFr={draft.nameFr}
          valueEn={draft.nameEn}
          onChangeFr={(value) => update('nameFr', value)}
          onChangeEn={(value) => update('nameEn', value)}
          requiredFr
          errorFr={errors.nameFr}
          testIdFr="magic-item-form-name-fr"
          testIdEn="magic-item-form-name-en"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldEnum
            label={t('customContent.editor.magicItemForm.category')}
            value={draft.category}
            options={categoryOptions}
            onChange={(value) => update('category', value as ItemCategory)}
            placeholder={t(
              'customContent.editor.magicItemForm.categoryPlaceholder',
            )}
            error={errors.category}
            required
            testId="magic-item-form-category"
          />
          <FieldEnum
            label={t('customContent.editor.magicItemForm.rarity')}
            value={draft.rarity}
            options={rarityOptions}
            onChange={(value) => update('rarity', value as Rarity)}
            placeholder={t(
              'customContent.editor.magicItemForm.rarityPlaceholder',
            )}
            error={errors.rarity}
            required
            testId="magic-item-form-rarity"
          />
        </div>

        <Checkbox
          label={t('customContent.editor.magicItemForm.attunement')}
          helper={t('customContent.editor.magicItemForm.attunementHelper')}
          checked={draft.attunement}
          onChange={(event) => update('attunement', event.target.checked)}
          data-testid="magic-item-form-attunement"
        />

        <FieldI18n
          labelFr={t('customContent.editor.magicItemForm.magicDescriptionFr')}
          labelEn={t('customContent.editor.magicItemForm.magicDescriptionEn')}
          valueFr={draft.magicDescriptionFr}
          valueEn={draft.magicDescriptionEn}
          onChangeFr={(value) => update('magicDescriptionFr', value)}
          onChangeEn={(value) => update('magicDescriptionEn', value)}
          helperFr={t('customContent.editor.magicItemForm.magicDescriptionHelper')}
          requiredFr
          errorFr={errors.magicDescriptionFr}
          testIdFr="magic-item-form-magic-desc-fr"
          testIdEn="magic-item-form-magic-desc-en"
        />

        {/* Description fluff (optionnelle) */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="magic-item-form-description"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.magicItemForm.hasDescription')}
          </legend>
          <Checkbox
            label={t('customContent.editor.magicItemForm.hasDescription')}
            helper={t(
              'customContent.editor.magicItemForm.hasDescriptionHelper',
            )}
            checked={draft.hasDescription}
            onChange={(event) =>
              update('hasDescription', event.target.checked)
            }
            data-testid="magic-item-form-has-description"
          />
          {draft.hasDescription ? (
            <div className="mt-4">
              <FieldI18n
                labelFr={t('customContent.editor.magicItemForm.descriptionFr')}
                labelEn={t('customContent.editor.magicItemForm.descriptionEn')}
                valueFr={draft.descriptionFr}
                valueEn={draft.descriptionEn}
                onChangeFr={(value) => update('descriptionFr', value)}
                onChangeEn={(value) => update('descriptionEn', value)}
                testIdFr="magic-item-form-desc-fr"
                testIdEn="magic-item-form-desc-en"
              />
            </div>
          ) : null}
        </fieldset>
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onCancel}
          data-testid="magic-item-form-cancel"
        >
          {t('customContent.editor.magicItemForm.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          data-testid="magic-item-form-confirm"
        >
          {t('customContent.editor.magicItemForm.confirm')}
        </Button>
      </div>
    </GlassPanel>
  );
}
