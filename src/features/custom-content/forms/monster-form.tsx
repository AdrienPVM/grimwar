import { useCallback, useState } from 'react';

import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { Checkbox } from '@/shared/components/form';
import { GlassPanel } from '@/shared/components/glass-panel';
import { t } from '@/shared/lib/i18n';
import {
  MonsterSchema,
  sizeSchema,
  type CreatureSize,
  type Monster,
} from '@/shared/types/content';

import { FieldEnum } from './fields/field-enum';
import { FieldI18n } from './fields/field-i18n';
import { FieldNumber } from './fields/field-number';
import { FieldString } from './fields/field-string';

/**
 * Formulaire de création d'un MONSTRE / créature custom (directive Adrien
 * 2026-06-27 : bestiaire d'extension importable). Schéma source :
 * `MonsterSchema`.
 *
 * Couvre tout le bloc de stats SRD : identité (taille, type, alignement),
 * défense (CA, PV avg+formule), 6 caractéristiques, vitesses (marche + nage/
 * vol/escalade/creusement optionnels), sens (+ Perception passive), FP/PX,
 * et les listes : résistances / immunités / vulnérabilités / immunités d'état /
 * langues (chips libres), jets de sauvegarde + compétences (clé→bonus), et
 * traits / actions / réactions / actions légendaires (nom + description i18n).
 *
 * `source` est figé à `custom` (contenu joueur hors SRD). Les champs
 * `reactions` / `legendaryActions` sont `nullable` au schéma : on stocke `null`
 * tant que la liste est vide (jamais `[]` parasite).
 */

const SIZES: readonly CreatureSize[] = sizeSchema.options;
const ABILITY_CODES = ['for', 'dex', 'con', 'int', 'sag', 'cha'] as const;
type AbilityCode = (typeof ABILITY_CODES)[number];

/** Entrée nom+description i18n (trait / action / réaction / action légendaire). */
interface NamedEntryDraft {
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
}

/** Jet de sauvegarde ou compétence : une clé + un bonus chiffré. */
interface KeyBonusDraft {
  key: string;
  bonus: number;
}

const EMPTY_NAMED_ENTRY: NamedEntryDraft = {
  nameFr: '',
  nameEn: '',
  descriptionFr: '',
  descriptionEn: '',
};

export interface MonsterFormDraft {
  id: string;
  nameFr: string;
  nameEn: string;
  size: CreatureSize;
  type: string;
  alignmentFr: string;
  alignmentEn: string;
  ac: number;
  hasAcDetail: boolean;
  acDetailFr: string;
  acDetailEn: string;
  hpAvg: number;
  hpFormula: string;
  speedWalk: number;
  hasFly: boolean;
  speedFly: number;
  hasSwim: boolean;
  speedSwim: number;
  hasClimb: boolean;
  speedClimb: number;
  hasBurrow: boolean;
  speedBurrow: number;
  abilities: Record<AbilityCode, number>;
  saves: KeyBonusDraft[];
  skills: KeyBonusDraft[];
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
  conditionImmunities: string[];
  languages: string[];
  hasDarkvision: boolean;
  darkvision: number;
  hasBlindsight: boolean;
  blindsight: number;
  hasTremorsense: boolean;
  tremorsense: number;
  hasTruesight: boolean;
  truesight: number;
  passivePerception: number;
  cr: number;
  xp: number;
  traits: NamedEntryDraft[];
  actions: NamedEntryDraft[];
  reactions: NamedEntryDraft[];
  legendaryActions: NamedEntryDraft[];
}

export const EMPTY_MONSTER_DRAFT: MonsterFormDraft = {
  id: '',
  nameFr: '',
  nameEn: '',
  size: 'medium',
  type: '',
  alignmentFr: '',
  alignmentEn: '',
  ac: 12,
  hasAcDetail: false,
  acDetailFr: '',
  acDetailEn: '',
  hpAvg: 10,
  hpFormula: '',
  speedWalk: 30,
  hasFly: false,
  speedFly: 0,
  hasSwim: false,
  speedSwim: 0,
  hasClimb: false,
  speedClimb: 0,
  hasBurrow: false,
  speedBurrow: 0,
  abilities: { for: 10, dex: 10, con: 10, int: 10, sag: 10, cha: 10 },
  saves: [],
  skills: [],
  resistances: [],
  immunities: [],
  vulnerabilities: [],
  conditionImmunities: [],
  languages: [],
  hasDarkvision: false,
  darkvision: 0,
  hasBlindsight: false,
  blindsight: 0,
  hasTremorsense: false,
  tremorsense: 0,
  hasTruesight: false,
  truesight: 0,
  passivePerception: 10,
  cr: 1,
  xp: 200,
  traits: [],
  actions: [],
  reactions: [],
  legendaryActions: [],
};

function i18nFrEn(fr: string, en: string): { fr: string; en?: string } {
  return { fr: fr.trim(), ...(en.trim() ? { en: en.trim() } : {}) };
}

/** Convertit une liste d'entrées nom+desc en `{name, description}[]` propre. */
function buildNamedEntries(
  entries: readonly NamedEntryDraft[],
): { name: { fr: string; en?: string }; description: { fr: string; en?: string } }[] {
  return entries
    .filter((e) => e.nameFr.trim() && e.descriptionFr.trim())
    .map((e) => ({
      name: i18nFrEn(e.nameFr, e.nameEn),
      description: i18nFrEn(e.descriptionFr, e.descriptionEn),
    }));
}

/** Convertit une liste clé→bonus en record (clé non vide uniquement). */
function buildKeyBonusRecord(
  entries: readonly KeyBonusDraft[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) {
    const key = e.key.trim();
    if (key) out[key] = e.bonus;
  }
  return out;
}

export function buildMonsterFromDraft(draft: MonsterFormDraft): Monster {
  const speed: Monster['speed'] = { walk: draft.speedWalk };
  if (draft.hasFly) speed.fly = draft.speedFly;
  if (draft.hasSwim) speed.swim = draft.speedSwim;
  if (draft.hasClimb) speed.climb = draft.speedClimb;
  if (draft.hasBurrow) speed.burrow = draft.speedBurrow;

  const senses: Monster['senses'] = {
    passivePerception: draft.passivePerception,
  };
  if (draft.hasDarkvision) senses.darkvision = draft.darkvision;
  if (draft.hasBlindsight) senses.blindsight = draft.blindsight;
  if (draft.hasTremorsense) senses.tremorsense = draft.tremorsense;
  if (draft.hasTruesight) senses.truesight = draft.truesight;

  const reactions = buildNamedEntries(draft.reactions);
  const legendaryActions = buildNamedEntries(draft.legendaryActions);

  return {
    id: draft.id.trim(),
    name: i18nFrEn(draft.nameFr, draft.nameEn),
    size: draft.size,
    type: draft.type.trim(),
    alignment: i18nFrEn(draft.alignmentFr, draft.alignmentEn),
    ac: draft.ac,
    acDetail:
      draft.hasAcDetail && draft.acDetailFr.trim()
        ? i18nFrEn(draft.acDetailFr, draft.acDetailEn)
        : null,
    hp: { avg: draft.hpAvg, formula: draft.hpFormula.trim() },
    speed,
    abilities: { ...draft.abilities },
    saves: buildKeyBonusRecord(draft.saves),
    skills: buildKeyBonusRecord(draft.skills),
    resistances: draft.resistances.map((s) => s.trim()).filter(Boolean),
    immunities: draft.immunities.map((s) => s.trim()).filter(Boolean),
    vulnerabilities: draft.vulnerabilities.map((s) => s.trim()).filter(Boolean),
    conditionImmunities: draft.conditionImmunities
      .map((s) => s.trim())
      .filter(Boolean),
    senses,
    languages: draft.languages.map((s) => s.trim()).filter(Boolean),
    cr: draft.cr,
    xp: draft.xp,
    traits: buildNamedEntries(draft.traits),
    actions: buildNamedEntries(draft.actions),
    // `nullable` au schéma : null quand vide (pas de `[]` parasite).
    reactions: reactions.length > 0 ? reactions : null,
    legendaryActions: legendaryActions.length > 0 ? legendaryActions : null,
    source: 'custom',
  };
}

function namedEntriesToDraft(
  entries: { name: { fr: string; en?: string }; description: { fr: string; en?: string } }[] | null,
): NamedEntryDraft[] {
  if (!entries) return [];
  return entries.map((e) => ({
    nameFr: e.name.fr,
    nameEn: e.name.en ?? '',
    descriptionFr: e.description.fr,
    descriptionEn: e.description.en ?? '',
  }));
}

function recordToKeyBonus(record: Record<string, number>): KeyBonusDraft[] {
  return Object.entries(record).map(([key, bonus]) => ({ key, bonus }));
}

export function draftFromMonster(monster: Monster): MonsterFormDraft {
  return {
    id: monster.id,
    nameFr: monster.name.fr,
    nameEn: monster.name.en ?? '',
    size: monster.size,
    type: monster.type,
    alignmentFr: monster.alignment.fr,
    alignmentEn: monster.alignment.en ?? '',
    ac: monster.ac,
    hasAcDetail: monster.acDetail !== null,
    acDetailFr: monster.acDetail?.fr ?? '',
    acDetailEn: monster.acDetail?.en ?? '',
    hpAvg: monster.hp.avg,
    hpFormula: monster.hp.formula,
    speedWalk: monster.speed.walk ?? 0,
    hasFly: monster.speed.fly !== undefined,
    speedFly: monster.speed.fly ?? 0,
    hasSwim: monster.speed.swim !== undefined,
    speedSwim: monster.speed.swim ?? 0,
    hasClimb: monster.speed.climb !== undefined,
    speedClimb: monster.speed.climb ?? 0,
    hasBurrow: monster.speed.burrow !== undefined,
    speedBurrow: monster.speed.burrow ?? 0,
    abilities: { ...monster.abilities },
    saves: recordToKeyBonus(monster.saves),
    skills: recordToKeyBonus(monster.skills),
    resistances: [...monster.resistances],
    immunities: [...monster.immunities],
    vulnerabilities: [...monster.vulnerabilities],
    conditionImmunities: [...monster.conditionImmunities],
    languages: [...monster.languages],
    hasDarkvision: monster.senses.darkvision !== undefined,
    darkvision: monster.senses.darkvision ?? 0,
    hasBlindsight: monster.senses.blindsight !== undefined,
    blindsight: monster.senses.blindsight ?? 0,
    hasTremorsense: monster.senses.tremorsense !== undefined,
    tremorsense: monster.senses.tremorsense ?? 0,
    hasTruesight: monster.senses.truesight !== undefined,
    truesight: monster.senses.truesight ?? 0,
    passivePerception: monster.senses.passivePerception,
    cr: monster.cr,
    xp: monster.xp,
    traits: namedEntriesToDraft(monster.traits),
    actions: namedEntriesToDraft(monster.actions),
    reactions: namedEntriesToDraft(monster.reactions),
    legendaryActions: namedEntriesToDraft(monster.legendaryActions),
  };
}

export function validateMonsterDraft(
  draft: MonsterFormDraft,
):
  | { ok: true; monster: Monster }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof MonsterFormDraft, string>>;
    } {
  const fieldErrors: Partial<Record<keyof MonsterFormDraft, string>> = {};
  if (!draft.id.trim()) {
    fieldErrors.id = t('customContent.editor.monsterForm.error.idRequired');
  } else if (!/^[a-z0-9-]+$/.test(draft.id.trim())) {
    fieldErrors.id = t('customContent.editor.monsterForm.error.idFormat');
  }
  if (!draft.nameFr.trim()) {
    fieldErrors.nameFr = t(
      'customContent.editor.monsterForm.error.nameFrRequired',
    );
  }
  if (!draft.type.trim()) {
    fieldErrors.type = t('customContent.editor.monsterForm.error.typeRequired');
  }
  if (!draft.alignmentFr.trim()) {
    fieldErrors.alignmentFr = t(
      'customContent.editor.monsterForm.error.alignmentRequired',
    );
  }
  if (!draft.hpFormula.trim()) {
    fieldErrors.hpFormula = t(
      'customContent.editor.monsterForm.error.hpFormulaRequired',
    );
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const candidate = buildMonsterFromDraft(draft);
  const parsed = MonsterSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const fieldKey = String(issue?.path[0] ?? 'id') as keyof MonsterFormDraft;
    fieldErrors[fieldKey] = issue?.message ?? 'invalid';
    return { ok: false, fieldErrors };
  }
  return { ok: true, monster: parsed.data };
}

interface MonsterFormProps {
  draft: MonsterFormDraft;
  onChange: (draft: MonsterFormDraft) => void;
  onConfirm: (monster: Monster) => void;
  onCancel: () => void;
}

/** Liste de chips libres (résistances, langues…) avec ajout/retrait. */
function ChipList({
  legend,
  helper,
  emptyLabel,
  addLabel,
  values,
  onAdd,
  onRemove,
  testId,
}: {
  legend: string;
  helper: string;
  emptyLabel: string;
  addLabel: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (idx: number) => void;
  testId: string;
}): JSX.Element {
  const [input, setInput] = useState('');
  return (
    <fieldset
      className="rounded-card border border-soft px-4 py-4"
      data-testid={testId}
    >
      <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
        {legend}
      </legend>
      <p className="mt-1 font-serif text-[13px] text-text-tertiary">{helper}</p>
      {values.length === 0 ? (
        <p className="mt-3 font-serif text-body-sm italic text-text-secondary">
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((v, idx) => (
            <li key={`${v}-${idx}`} data-testid={`${testId}-row`}>
              <Chip
                active
                variant="gold"
                onToggle={() => onRemove(idx)}
                data-testid={`${testId}-${idx}`}
              >
                {v}
              </Chip>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr,auto] sm:items-end">
        <FieldString
          label={addLabel}
          value={input}
          onChange={setInput}
          testId={`${testId}-input`}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const value = input.trim();
            if (!value) return;
            onAdd(value);
            setInput('');
          }}
          data-testid={`${testId}-add`}
        >
          {addLabel}
        </Button>
      </div>
    </fieldset>
  );
}

/** Liste d'entrées nom+description (traits, actions…) avec ajout/retrait. */
function NamedEntryList({
  legend,
  addLabel,
  emptyLabel,
  removeLabel,
  entries,
  onChange,
  testId,
}: {
  legend: string;
  addLabel: string;
  emptyLabel: string;
  removeLabel: string;
  entries: NamedEntryDraft[];
  onChange: (entries: NamedEntryDraft[]) => void;
  testId: string;
}): JSX.Element {
  const updateEntry = (idx: number, patch: Partial<NamedEntryDraft>): void => {
    onChange(entries.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };
  return (
    <fieldset
      className="rounded-card border border-soft px-4 py-4"
      data-testid={testId}
    >
      <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
        {legend}
      </legend>
      {entries.length === 0 ? (
        <p className="mt-3 font-serif text-body-sm italic text-text-secondary">
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-3 space-y-4">
          {entries.map((entry, idx) => (
            <li
              key={idx}
              className="rounded-card border border-white-8 bg-glass px-3 py-3"
              data-testid={`${testId}-row`}
            >
              <FieldI18n
                labelFr={t('customContent.editor.monsterForm.entryNameFr')}
                labelEn={t('customContent.editor.monsterForm.entryNameEn')}
                valueFr={entry.nameFr}
                valueEn={entry.nameEn}
                onChangeFr={(v) => updateEntry(idx, { nameFr: v })}
                onChangeEn={(v) => updateEntry(idx, { nameEn: v })}
                testIdFr={`${testId}-name-fr-${idx}`}
              />
              <div className="mt-3">
                <FieldI18n
                  labelFr={t('customContent.editor.monsterForm.entryDescFr')}
                  labelEn={t('customContent.editor.monsterForm.entryDescEn')}
                  valueFr={entry.descriptionFr}
                  valueEn={entry.descriptionEn}
                  onChangeFr={(v) => updateEntry(idx, { descriptionFr: v })}
                  onChangeEn={(v) => updateEntry(idx, { descriptionEn: v })}
                  testIdFr={`${testId}-desc-fr-${idx}`}
                />
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(entries.filter((_, i) => i !== idx))}
                  data-testid={`${testId}-remove-${idx}`}
                >
                  {removeLabel}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange([...entries, { ...EMPTY_NAMED_ENTRY }])}
          data-testid={`${testId}-add`}
        >
          {addLabel}
        </Button>
      </div>
    </fieldset>
  );
}

export function MonsterForm({
  draft,
  onChange,
  onConfirm,
  onCancel,
}: MonsterFormProps): JSX.Element {
  const [errors, setErrors] = useState<
    Partial<Record<keyof MonsterFormDraft, string>>
  >({});

  const update = useCallback(
    <K extends keyof MonsterFormDraft>(key: K, value: MonsterFormDraft[K]) => {
      onChange({ ...draft, [key]: value });
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [draft, errors, onChange],
  );

  const updateAbility = (code: AbilityCode, value: number): void => {
    onChange({ ...draft, abilities: { ...draft.abilities, [code]: value } });
  };

  const handleConfirm = useCallback(() => {
    const result = validateMonsterDraft(draft);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    onConfirm(result.monster);
  }, [draft, onConfirm]);

  const sizeOptions = SIZES.map((s) => ({
    value: s,
    label: t(`size.${s}`),
  }));

  return (
    <GlassPanel className="px-6 py-6" data-testid="monster-form">
      <h3 className="font-title text-body uppercase tracking-[0.18em] text-gold-bright">
        {t('customContent.editor.monsterForm.title')}
      </h3>
      <Divider className="my-4" />
      <div className="flex flex-col gap-4">
        <FieldString
          label={t('customContent.editor.monsterForm.id')}
          value={draft.id}
          onChange={(v) => update('id', v)}
          helper={t('customContent.editor.monsterForm.idHelper')}
          error={errors.id}
          required
          testId="monster-form-id"
        />
        <FieldI18n
          labelFr={t('customContent.editor.monsterForm.nameFr')}
          labelEn={t('customContent.editor.monsterForm.nameEn')}
          valueFr={draft.nameFr}
          valueEn={draft.nameEn}
          onChangeFr={(v) => update('nameFr', v)}
          onChangeEn={(v) => update('nameEn', v)}
          requiredFr
          errorFr={errors.nameFr}
          testIdFr="monster-form-name-fr"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldEnum
            label={t('customContent.editor.monsterForm.size')}
            value={draft.size}
            options={sizeOptions}
            onChange={(v) => update('size', v as CreatureSize)}
            required
            testId="monster-form-size"
          />
          <FieldString
            label={t('customContent.editor.monsterForm.type')}
            value={draft.type}
            onChange={(v) => update('type', v)}
            helper={t('customContent.editor.monsterForm.typeHelper')}
            error={errors.type}
            required
            testId="monster-form-type"
          />
        </div>
        <FieldI18n
          labelFr={t('customContent.editor.monsterForm.alignmentFr')}
          labelEn={t('customContent.editor.monsterForm.alignmentEn')}
          valueFr={draft.alignmentFr}
          valueEn={draft.alignmentEn}
          onChangeFr={(v) => update('alignmentFr', v)}
          onChangeEn={(v) => update('alignmentEn', v)}
          requiredFr
          errorFr={errors.alignmentFr}
          testIdFr="monster-form-alignment-fr"
        />

        {/* Défense */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldNumber
            label={t('customContent.editor.monsterForm.ac')}
            value={draft.ac}
            onChange={(v) => update('ac', v)}
            min={0}
            testId="monster-form-ac"
          />
          <FieldNumber
            label={t('customContent.editor.monsterForm.hpAvg')}
            value={draft.hpAvg}
            onChange={(v) => update('hpAvg', v)}
            min={1}
            testId="monster-form-hp-avg"
          />
          <FieldString
            label={t('customContent.editor.monsterForm.hpFormula')}
            value={draft.hpFormula}
            onChange={(v) => update('hpFormula', v)}
            error={errors.hpFormula}
            required
            testId="monster-form-hp-formula"
          />
        </div>

        {/* Vitesses */}
        <fieldset className="rounded-card border border-soft px-4 py-4">
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.monsterForm.speedLegend')}
          </legend>
          <div className="mt-3">
            <FieldNumber
              label={t('customContent.editor.monsterForm.speedWalk')}
              value={draft.speedWalk}
              onChange={(v) => update('speedWalk', v)}
              min={0}
              step={5}
              testId="monster-form-speed-walk"
            />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ['hasFly', 'speedFly', 'speedFly'],
                ['hasSwim', 'speedSwim', 'speedSwim'],
                ['hasClimb', 'speedClimb', 'speedClimb'],
                ['hasBurrow', 'speedBurrow', 'speedBurrow'],
              ] as const
            ).map(([toggle, valueKey, labelKey]) => (
              <div key={toggle}>
                <Checkbox
                  label={t(`customContent.editor.monsterForm.${labelKey}`)}
                  checked={draft[toggle]}
                  onChange={(e) => update(toggle, e.target.checked)}
                  data-testid={`monster-form-${toggle}`}
                />
                {draft[toggle] ? (
                  <div className="mt-2">
                    <FieldNumber
                      label={t(`customContent.editor.monsterForm.${labelKey}`)}
                      value={draft[valueKey]}
                      onChange={(v) => update(valueKey, v)}
                      min={0}
                      step={5}
                      testId={`monster-form-${valueKey}`}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </fieldset>

        {/* Caractéristiques */}
        <fieldset className="rounded-card border border-soft px-4 py-4">
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.monsterForm.abilitiesLegend')}
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ABILITY_CODES.map((code) => (
              <FieldNumber
                key={code}
                label={t(`ability.${code}`)}
                value={draft.abilities[code]}
                onChange={(v) => updateAbility(code, v)}
                min={1}
                max={30}
                testId={`monster-form-ability-${code}`}
              />
            ))}
          </div>
        </fieldset>

        {/* Sens */}
        <fieldset className="rounded-card border border-soft px-4 py-4">
          <legend className="font-title text-meta uppercase tracking-[0.18em] text-text-secondary">
            {t('customContent.editor.monsterForm.sensesLegend')}
          </legend>
          <div className="mt-3">
            <FieldNumber
              label={t('customContent.editor.monsterForm.passivePerception')}
              value={draft.passivePerception}
              onChange={(v) => update('passivePerception', v)}
              min={0}
              testId="monster-form-passive-perception"
            />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ['hasDarkvision', 'darkvision'],
                ['hasBlindsight', 'blindsight'],
                ['hasTremorsense', 'tremorsense'],
                ['hasTruesight', 'truesight'],
              ] as const
            ).map(([toggle, valueKey]) => (
              <div key={toggle}>
                <Checkbox
                  label={t(`customContent.editor.monsterForm.${valueKey}`)}
                  checked={draft[toggle]}
                  onChange={(e) => update(toggle, e.target.checked)}
                  data-testid={`monster-form-${toggle}`}
                />
                {draft[toggle] ? (
                  <div className="mt-2">
                    <FieldNumber
                      label={t(`customContent.editor.monsterForm.${valueKey}`)}
                      value={draft[valueKey]}
                      onChange={(v) => update(valueKey, v)}
                      min={0}
                      step={5}
                      testId={`monster-form-${valueKey}`}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </fieldset>

        {/* FP / PX */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldNumber
            label={t('customContent.editor.monsterForm.cr')}
            value={draft.cr}
            onChange={(v) => update('cr', v)}
            min={0}
            step={0.125}
            helper={t('customContent.editor.monsterForm.crHelper')}
            testId="monster-form-cr"
          />
          <FieldNumber
            label={t('customContent.editor.monsterForm.xp')}
            value={draft.xp}
            onChange={(v) => update('xp', v)}
            min={0}
            step={10}
            testId="monster-form-xp"
          />
        </div>

        {/* Listes libres */}
        <ChipList
          legend={t('customContent.editor.monsterForm.resistances')}
          helper={t('customContent.editor.monsterForm.listHelper')}
          emptyLabel={t('customContent.editor.monsterForm.listEmpty')}
          addLabel={t('customContent.editor.monsterForm.listAdd')}
          values={draft.resistances}
          onAdd={(v) => update('resistances', [...draft.resistances, v])}
          onRemove={(idx) =>
            update(
              'resistances',
              draft.resistances.filter((_, i) => i !== idx),
            )
          }
          testId="monster-form-resistances"
        />
        <ChipList
          legend={t('customContent.editor.monsterForm.immunities')}
          helper={t('customContent.editor.monsterForm.listHelper')}
          emptyLabel={t('customContent.editor.monsterForm.listEmpty')}
          addLabel={t('customContent.editor.monsterForm.listAdd')}
          values={draft.immunities}
          onAdd={(v) => update('immunities', [...draft.immunities, v])}
          onRemove={(idx) =>
            update(
              'immunities',
              draft.immunities.filter((_, i) => i !== idx),
            )
          }
          testId="monster-form-immunities"
        />
        <ChipList
          legend={t('customContent.editor.monsterForm.vulnerabilities')}
          helper={t('customContent.editor.monsterForm.listHelper')}
          emptyLabel={t('customContent.editor.monsterForm.listEmpty')}
          addLabel={t('customContent.editor.monsterForm.listAdd')}
          values={draft.vulnerabilities}
          onAdd={(v) => update('vulnerabilities', [...draft.vulnerabilities, v])}
          onRemove={(idx) =>
            update(
              'vulnerabilities',
              draft.vulnerabilities.filter((_, i) => i !== idx),
            )
          }
          testId="monster-form-vulnerabilities"
        />
        <ChipList
          legend={t('customContent.editor.monsterForm.conditionImmunities')}
          helper={t('customContent.editor.monsterForm.listHelper')}
          emptyLabel={t('customContent.editor.monsterForm.listEmpty')}
          addLabel={t('customContent.editor.monsterForm.listAdd')}
          values={draft.conditionImmunities}
          onAdd={(v) =>
            update('conditionImmunities', [...draft.conditionImmunities, v])
          }
          onRemove={(idx) =>
            update(
              'conditionImmunities',
              draft.conditionImmunities.filter((_, i) => i !== idx),
            )
          }
          testId="monster-form-condition-immunities"
        />
        <ChipList
          legend={t('customContent.editor.monsterForm.languages')}
          helper={t('customContent.editor.monsterForm.listHelper')}
          emptyLabel={t('customContent.editor.monsterForm.listEmpty')}
          addLabel={t('customContent.editor.monsterForm.listAdd')}
          values={draft.languages}
          onAdd={(v) => update('languages', [...draft.languages, v])}
          onRemove={(idx) =>
            update(
              'languages',
              draft.languages.filter((_, i) => i !== idx),
            )
          }
          testId="monster-form-languages"
        />

        {/* Traits / Actions / Réactions / Actions légendaires */}
        <NamedEntryList
          legend={t('customContent.editor.monsterForm.traits')}
          addLabel={t('customContent.editor.monsterForm.traitAdd')}
          emptyLabel={t('customContent.editor.monsterForm.namedEmpty')}
          removeLabel={t('customContent.editor.monsterForm.namedRemove')}
          entries={draft.traits}
          onChange={(e) => update('traits', e)}
          testId="monster-form-traits"
        />
        <NamedEntryList
          legend={t('customContent.editor.monsterForm.actions')}
          addLabel={t('customContent.editor.monsterForm.actionAdd')}
          emptyLabel={t('customContent.editor.monsterForm.namedEmpty')}
          removeLabel={t('customContent.editor.monsterForm.namedRemove')}
          entries={draft.actions}
          onChange={(e) => update('actions', e)}
          testId="monster-form-actions"
        />
        <NamedEntryList
          legend={t('customContent.editor.monsterForm.reactions')}
          addLabel={t('customContent.editor.monsterForm.reactionAdd')}
          emptyLabel={t('customContent.editor.monsterForm.namedEmpty')}
          removeLabel={t('customContent.editor.monsterForm.namedRemove')}
          entries={draft.reactions}
          onChange={(e) => update('reactions', e)}
          testId="monster-form-reactions"
        />
        <NamedEntryList
          legend={t('customContent.editor.monsterForm.legendaryActions')}
          addLabel={t('customContent.editor.monsterForm.legendaryAdd')}
          emptyLabel={t('customContent.editor.monsterForm.namedEmpty')}
          removeLabel={t('customContent.editor.monsterForm.namedRemove')}
          entries={draft.legendaryActions}
          onChange={(e) => update('legendaryActions', e)}
          testId="monster-form-legendary-actions"
        />
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onCancel}
          data-testid="monster-form-cancel"
        >
          {t('customContent.editor.monsterForm.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          data-testid="monster-form-confirm"
        >
          {t('customContent.editor.monsterForm.confirm')}
        </Button>
      </div>
    </GlassPanel>
  );
}
