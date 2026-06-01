import { useCallback, useState } from 'react';

import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { Checkbox } from '@/shared/components/form';
import { GlassPanel } from '@/shared/components/glass-panel';
import { useContent } from '@/shared/hooks/use-content';
import { SKILLS } from '@/shared/lib/rules/skills';
import { t, type StringKey } from '@/shared/lib/i18n';
import {
  BackgroundSchema,
  type Background,
  type CoinUnit,
} from '@/shared/types/content';

import { FieldEnum } from './fields/field-enum';
import { FieldI18n } from './fields/field-i18n';
import { FieldNumber } from './fields/field-number';
import { FieldString } from './fields/field-string';

/**
 * Formulaire de création d'un Background (Historique) custom — JALON 3C.4.
 *
 * Schéma source : `BackgroundSchema`. Surface large (9 champs requis + 1
 * nullable), d'où ce form un cran plus dense que Subancestry :
 *   - id (slug), name + description i18n (FR requis)
 *   - skillProficiencies : multi-select toggle parmi les 18 skills SRD. On
 *     stocke en EN PascalCase (« Insight »…), même format que SRD bundle —
 *     le resolveur wizard (`resolveSkillIds`) accepte EN ou ID kebab-case.
 *   - toolProficiencies : chip input libre (kebab-case slugs). Pas de
 *     fixed-list canonique côté SRD pour les outils, on laisse l'utilisateur
 *     saisir — il sait ce qu'il fait s'il crée un background custom.
 *   - languages : entier non négatif (nombre de langues bonus à choisir au
 *     wizard, typiquement 0..2).
 *   - equipment : repeater d'ItemRef ; chaque ligne référence un itemId
 *     existant dans items.json (Select alimenté par `useContent('items')`).
 *   - startingCoins : nullable — un checkbox « Pièces de départ » révèle le
 *     couple (qty, unit). Pattern identique à InvocationForm.hasLevelPrereq.
 *   - feature : { name i18n, description i18n } — le don / bonus offert par
 *     le background ; FR requis pour name et description.
 *
 * `source` est figé à `aidedd-homebrew` — convention partagée 3C.
 */

const COIN_UNITS: readonly CoinUnit[] = ['cp', 'sp', 'ep', 'gp', 'pp'];

export interface BackgroundFormEquipmentDraft {
  itemId: string;
  qty: number;
}

export interface BackgroundFormDraft {
  id: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  /** EN PascalCase (« Athletics »…). Cf. SKILLS[].name.en. */
  skillProficiencies: string[];
  /** Slugs libres (kebab-case typiquement). */
  toolProficiencies: string[];
  languages: number;
  equipment: BackgroundFormEquipmentDraft[];
  hasStartingCoins: boolean;
  startingCoinsQty: number;
  startingCoinsUnit: CoinUnit;
  featureNameFr: string;
  featureNameEn: string;
  featureDescriptionFr: string;
  featureDescriptionEn: string;
}

export const EMPTY_EQUIPMENT_DRAFT: BackgroundFormEquipmentDraft = {
  itemId: '',
  qty: 1,
};

export const EMPTY_BACKGROUND_DRAFT: BackgroundFormDraft = {
  id: '',
  nameFr: '',
  nameEn: '',
  descriptionFr: '',
  descriptionEn: '',
  skillProficiencies: [],
  toolProficiencies: [],
  languages: 0,
  equipment: [],
  hasStartingCoins: false,
  startingCoinsQty: 0,
  startingCoinsUnit: 'gp',
  featureNameFr: '',
  featureNameEn: '',
  featureDescriptionFr: '',
  featureDescriptionEn: '',
};

export function buildBackgroundFromDraft(
  draft: BackgroundFormDraft,
): Background {
  return {
    id: draft.id.trim(),
    name: {
      fr: draft.nameFr.trim(),
      ...(draft.nameEn.trim() ? { en: draft.nameEn.trim() } : {}),
    },
    description: {
      fr: draft.descriptionFr.trim(),
      ...(draft.descriptionEn.trim() ? { en: draft.descriptionEn.trim() } : {}),
    },
    skillProficiencies: [...draft.skillProficiencies],
    toolProficiencies: draft.toolProficiencies
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
    languages: draft.languages,
    equipment: draft.equipment
      .filter((eq) => eq.itemId.trim() !== '')
      .map((eq) => ({
        itemId: eq.itemId.trim(),
        qty: eq.qty,
      })),
    startingCoins: draft.hasStartingCoins
      ? { qty: draft.startingCoinsQty, unit: draft.startingCoinsUnit }
      : null,
    feature: {
      name: {
        fr: draft.featureNameFr.trim(),
        ...(draft.featureNameEn.trim()
          ? { en: draft.featureNameEn.trim() }
          : {}),
      },
      description: {
        fr: draft.featureDescriptionFr.trim(),
        ...(draft.featureDescriptionEn.trim()
          ? { en: draft.featureDescriptionEn.trim() }
          : {}),
      },
    },
    source: 'aidedd-homebrew',
  };
}

export function draftFromBackground(bg: Background): BackgroundFormDraft {
  return {
    id: bg.id,
    nameFr: bg.name.fr,
    nameEn: bg.name.en ?? '',
    descriptionFr: bg.description.fr,
    descriptionEn: bg.description.en ?? '',
    skillProficiencies: [...bg.skillProficiencies],
    toolProficiencies: [...bg.toolProficiencies],
    languages: bg.languages,
    equipment: bg.equipment.map((eq) => ({ itemId: eq.itemId, qty: eq.qty })),
    hasStartingCoins: bg.startingCoins !== null,
    startingCoinsQty: bg.startingCoins?.qty ?? 0,
    startingCoinsUnit: bg.startingCoins?.unit ?? 'gp',
    featureNameFr: bg.feature.name.fr,
    featureNameEn: bg.feature.name.en ?? '',
    featureDescriptionFr: bg.feature.description.fr,
    featureDescriptionEn: bg.feature.description.en ?? '',
  };
}

export function validateBackgroundDraft(
  draft: BackgroundFormDraft,
):
  | { ok: true; background: Background }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof BackgroundFormDraft, string>>;
    } {
  const fieldErrors: Partial<Record<keyof BackgroundFormDraft, string>> = {};
  if (!draft.id.trim()) {
    fieldErrors.id = t('customContent.editor.backgroundForm.error.idRequired');
  } else if (!/^[a-z0-9-]+$/.test(draft.id.trim())) {
    fieldErrors.id = t('customContent.editor.backgroundForm.error.idFormat');
  }
  if (!draft.nameFr.trim()) {
    fieldErrors.nameFr = t(
      'customContent.editor.backgroundForm.error.nameFrRequired',
    );
  }
  if (!draft.descriptionFr.trim()) {
    fieldErrors.descriptionFr = t(
      'customContent.editor.backgroundForm.error.descriptionFrRequired',
    );
  }
  if (!draft.featureNameFr.trim()) {
    fieldErrors.featureNameFr = t(
      'customContent.editor.backgroundForm.error.featureNameFrRequired',
    );
  }
  if (!draft.featureDescriptionFr.trim()) {
    fieldErrors.featureDescriptionFr = t(
      'customContent.editor.backgroundForm.error.featureDescriptionFrRequired',
    );
  }
  // Une ligne d'équipement sans itemId est silencieusement filtrée par
  // buildBackgroundFromDraft, mais on prévient l'utilisateur — la ligne sera
  // perdue à la confirmation, mieux vaut le savoir avant.
  if (draft.equipment.some((eq) => eq.itemId.trim() === '')) {
    fieldErrors.equipment = t(
      'customContent.editor.backgroundForm.error.equipmentItemIdRequired',
    );
  }
  // Doublon d'itemId : un même item ne devrait pas apparaître deux fois (le
  // wizard n'agrégerait pas proprement les quantités).
  const itemIdsSeen = new Set<string>();
  for (const eq of draft.equipment) {
    if (eq.itemId.trim() === '') continue;
    if (itemIdsSeen.has(eq.itemId)) {
      fieldErrors.equipment = t(
        'customContent.editor.backgroundForm.error.equipmentDuplicate',
      );
    }
    itemIdsSeen.add(eq.itemId);
  }
  if (draft.equipment.some((eq) => !Number.isFinite(eq.qty) || eq.qty < 1)) {
    fieldErrors.equipment = t(
      'customContent.editor.backgroundForm.error.equipmentQtyInvalid',
    );
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const candidate = buildBackgroundFromDraft(draft);
  const parsed = BackgroundSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const fieldKey = String(
      issue?.path[0] ?? 'id',
    ) as keyof BackgroundFormDraft;
    fieldErrors[fieldKey] = issue?.message ?? 'invalid';
    return { ok: false, fieldErrors };
  }
  return { ok: true, background: parsed.data };
}

interface BackgroundFormProps {
  draft: BackgroundFormDraft;
  onChange: (draft: BackgroundFormDraft) => void;
  onConfirm: (background: Background) => void;
  onCancel: () => void;
}

export function BackgroundForm({
  draft,
  onChange,
  onConfirm,
  onCancel,
}: BackgroundFormProps): JSX.Element {
  const { data: items, loading: itemsLoading } = useContent('items');
  const [errors, setErrors] = useState<
    Partial<Record<keyof BackgroundFormDraft, string>>
  >({});
  const [toolDraft, setToolDraft] = useState<string>('');

  const update = useCallback(
    <K extends keyof BackgroundFormDraft>(
      key: K,
      value: BackgroundFormDraft[K],
    ) => {
      onChange({ ...draft, [key]: value });
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [draft, errors, onChange],
  );

  const handleConfirm = useCallback(() => {
    const result = validateBackgroundDraft(draft);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    onConfirm(result.background);
  }, [draft, onConfirm]);

  // Skills : EN PascalCase comme stockage (cf. SRD backgrounds.json).
  const toggleSkill = (en: string): void => {
    const exists = draft.skillProficiencies.includes(en);
    update(
      'skillProficiencies',
      exists
        ? draft.skillProficiencies.filter((s) => s !== en)
        : [...draft.skillProficiencies, en],
    );
  };

  const addTool = (): void => {
    const next = toolDraft.trim();
    if (!next) return;
    if (draft.toolProficiencies.includes(next)) {
      setToolDraft('');
      return;
    }
    update('toolProficiencies', [...draft.toolProficiencies, next]);
    setToolDraft('');
  };
  const removeTool = (tool: string): void => {
    update(
      'toolProficiencies',
      draft.toolProficiencies.filter((t) => t !== tool),
    );
  };

  const addEquipment = (): void => {
    update('equipment', [...draft.equipment, EMPTY_EQUIPMENT_DRAFT]);
  };
  const updateEquipment = (
    idx: number,
    patch: Partial<BackgroundFormEquipmentDraft>,
  ): void => {
    update(
      'equipment',
      draft.equipment.map((eq, i) => (i === idx ? { ...eq, ...patch } : eq)),
    );
  };
  const removeEquipment = (idx: number): void => {
    update(
      'equipment',
      draft.equipment.filter((_, i) => i !== idx),
    );
  };

  const itemOptions = items.map((it) => ({
    value: it.id,
    label: it.name.fr,
  }));

  const coinUnitOptions = COIN_UNITS.map((unit) => ({
    value: unit,
    label: t(`customContent.editor.backgroundForm.coinUnit.${unit}` as StringKey),
  }));

  return (
    <GlassPanel className="px-6 py-6" data-testid="background-form">
      <h3 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
        {t('customContent.editor.backgroundForm.title')}
      </h3>
      <Divider className="my-4" />
      <div className="flex flex-col gap-4">
        <FieldString
          label={t('customContent.editor.backgroundForm.id')}
          value={draft.id}
          onChange={(value) => update('id', value)}
          helper={t('customContent.editor.backgroundForm.idHelper')}
          error={errors.id}
          required
          testId="background-form-id"
        />
        <FieldI18n
          labelFr={t('customContent.editor.backgroundForm.nameFr')}
          labelEn={t('customContent.editor.backgroundForm.nameEn')}
          valueFr={draft.nameFr}
          valueEn={draft.nameEn}
          onChangeFr={(value) => update('nameFr', value)}
          onChangeEn={(value) => update('nameEn', value)}
          requiredFr
          errorFr={errors.nameFr}
          testIdFr="background-form-name-fr"
          testIdEn="background-form-name-en"
        />
        <FieldI18n
          labelFr={t('customContent.editor.backgroundForm.descriptionFr')}
          labelEn={t('customContent.editor.backgroundForm.descriptionEn')}
          valueFr={draft.descriptionFr}
          valueEn={draft.descriptionEn}
          onChangeFr={(value) => update('descriptionFr', value)}
          onChangeEn={(value) => update('descriptionEn', value)}
          requiredFr
          errorFr={errors.descriptionFr}
          testIdFr="background-form-description-fr"
          testIdEn="background-form-description-en"
        />

        {/* Skills repeater (toggle chips) */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="background-form-skills"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.backgroundForm.skillsLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.backgroundForm.skillsHelper')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SKILLS.map((skill) => {
              const en = skill.name.en ?? skill.id;
              const active = draft.skillProficiencies.includes(en);
              return (
                <Chip
                  key={skill.id}
                  active={active}
                  variant={active ? 'gold' : 'default'}
                  onToggle={() => toggleSkill(en)}
                  data-testid={`background-form-skill-${skill.id}`}
                  data-active={active ? 'true' : 'false'}
                >
                  {skill.name.fr}
                </Chip>
              );
            })}
          </div>
        </fieldset>

        {/* Tools chip input */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="background-form-tools"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.backgroundForm.toolsLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.backgroundForm.toolsHelper')}
          </p>
          {draft.toolProficiencies.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.toolProficiencies.map((tool) => (
                <Chip
                  key={tool}
                  variant="default"
                  onToggle={() => removeTool(tool)}
                  data-testid="background-form-tool-chip"
                  data-tool={tool}
                >
                  {tool} ×
                </Chip>
              ))}
            </div>
          ) : (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="background-form-tools-empty"
            >
              {t('customContent.editor.backgroundForm.toolsEmpty')}
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr,auto] sm:items-end">
            <FieldString
              label={t('customContent.editor.backgroundForm.toolAdd')}
              value={toolDraft}
              onChange={setToolDraft}
              placeholder={t(
                'customContent.editor.backgroundForm.toolAddPlaceholder',
              )}
              testId="background-form-tool-input"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={addTool}
              disabled={!toolDraft.trim()}
              data-testid="background-form-tool-add"
            >
              {t('customContent.editor.backgroundForm.toolAddButton')}
            </Button>
          </div>
        </fieldset>

        {/* Languages */}
        <FieldNumber
          label={t('customContent.editor.backgroundForm.languages')}
          value={draft.languages}
          onChange={(value) => update('languages', value)}
          min={0}
          max={5}
          step={1}
          helper={t('customContent.editor.backgroundForm.languagesHelper')}
          testId="background-form-languages"
        />

        {/* Equipment repeater */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="background-form-equipment"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.backgroundForm.equipmentLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.backgroundForm.equipmentHelper')}
          </p>
          {draft.equipment.length === 0 ? (
            <p
              className="mt-3 font-serif text-body-sm italic text-text-secondary"
              data-testid="background-form-equipment-empty"
            >
              {t('customContent.editor.backgroundForm.equipmentEmpty')}
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {draft.equipment.map((eq, idx) => (
                <li
                  key={idx}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,140px,auto]"
                  data-testid="background-form-equipment-row"
                  data-equipment-index={idx}
                >
                  <FieldEnum
                    label={t(
                      'customContent.editor.backgroundForm.equipmentItemId',
                    )}
                    value={eq.itemId}
                    options={itemOptions}
                    onChange={(value) =>
                      updateEquipment(idx, { itemId: value })
                    }
                    placeholder={
                      itemsLoading
                        ? t(
                            'customContent.editor.backgroundForm.equipmentItemIdLoading',
                          )
                        : t(
                            'customContent.editor.backgroundForm.equipmentItemIdPlaceholder',
                          )
                    }
                    required
                    testId={`background-form-equipment-item-${idx}`}
                  />
                  <FieldNumber
                    label={t(
                      'customContent.editor.backgroundForm.equipmentQty',
                    )}
                    value={eq.qty}
                    onChange={(value) => updateEquipment(idx, { qty: value })}
                    min={1}
                    max={99}
                    step={1}
                    required
                    testId={`background-form-equipment-qty-${idx}`}
                  />
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEquipment(idx)}
                      data-testid={`background-form-equipment-remove-${idx}`}
                    >
                      {t('customContent.editor.backgroundForm.removeRow')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {errors.equipment ? (
            <p
              className="mt-2 font-serif text-[13px] text-crimson"
              role="alert"
            >
              {errors.equipment}
            </p>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={addEquipment}
            data-testid="background-form-equipment-add"
            className="mt-4"
          >
            {t('customContent.editor.backgroundForm.equipmentAdd')}
          </Button>
        </fieldset>

        {/* Starting coins (nullable) */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="background-form-coins"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.backgroundForm.coinsLegend')}
          </legend>
          <Checkbox
            checked={draft.hasStartingCoins}
            onChange={(event) =>
              update('hasStartingCoins', event.target.checked)
            }
            label={t('customContent.editor.backgroundForm.coinsToggle')}
            data-testid="background-form-coins-toggle"
            className="mt-2"
          />
          {draft.hasStartingCoins ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldNumber
                label={t('customContent.editor.backgroundForm.coinsQty')}
                value={draft.startingCoinsQty}
                onChange={(value) => update('startingCoinsQty', value)}
                min={0}
                max={9999}
                step={1}
                required
                testId="background-form-coins-qty"
              />
              <FieldEnum
                label={t('customContent.editor.backgroundForm.coinsUnit')}
                value={draft.startingCoinsUnit}
                options={coinUnitOptions}
                onChange={(value) =>
                  update('startingCoinsUnit', value as CoinUnit)
                }
                required
                testId="background-form-coins-unit"
              />
            </div>
          ) : null}
        </fieldset>

        {/* Feature (don / bonus du background) */}
        <fieldset
          className="rounded-card border border-soft px-4 py-4"
          data-testid="background-form-feature"
        >
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.backgroundForm.featureLegend')}
          </legend>
          <p className="mt-1 font-serif text-[13px] text-text-tertiary">
            {t('customContent.editor.backgroundForm.featureHelper')}
          </p>
          <div className="mt-4 flex flex-col gap-4">
            <FieldI18n
              labelFr={t('customContent.editor.backgroundForm.featureNameFr')}
              labelEn={t('customContent.editor.backgroundForm.featureNameEn')}
              valueFr={draft.featureNameFr}
              valueEn={draft.featureNameEn}
              onChangeFr={(value) => update('featureNameFr', value)}
              onChangeEn={(value) => update('featureNameEn', value)}
              requiredFr
              errorFr={errors.featureNameFr}
              testIdFr="background-form-feature-name-fr"
              testIdEn="background-form-feature-name-en"
            />
            <FieldI18n
              labelFr={t(
                'customContent.editor.backgroundForm.featureDescriptionFr',
              )}
              labelEn={t(
                'customContent.editor.backgroundForm.featureDescriptionEn',
              )}
              valueFr={draft.featureDescriptionFr}
              valueEn={draft.featureDescriptionEn}
              onChangeFr={(value) => update('featureDescriptionFr', value)}
              onChangeEn={(value) => update('featureDescriptionEn', value)}
              requiredFr
              errorFr={errors.featureDescriptionFr}
              testIdFr="background-form-feature-description-fr"
              testIdEn="background-form-feature-description-en"
            />
          </div>
        </fieldset>
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onCancel}
          data-testid="background-form-cancel"
        >
          {t('customContent.editor.backgroundForm.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          data-testid="background-form-confirm"
        >
          {t('customContent.editor.backgroundForm.confirm')}
        </Button>
      </div>
    </GlassPanel>
  );
}
