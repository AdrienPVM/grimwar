import { useId, useMemo, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { DetailModal } from '@/shared/components/detail-modal';
import { Tooltip } from '@/shared/components/tooltip';
import { MonsterStatBlock } from '@/features/codex/browsers/monster-stat-block';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import type { Condition, Monster } from '@/shared/types/content';
import type { EncounterParticipant } from '@/shared/types/encounter';

import {
  CUSTOM_CONDITION_LABEL_MAX,
  customConditionLabel,
  isCustomCondition,
  toCustomConditionId,
} from './custom-condition';
import { hpBarColor, hpRatio, quickHpAmounts } from './encounter-hp';
import {
  PARTICIPANT_NAME_MAX,
  PARTICIPANT_NOTE_MAX,
  type ParticipantPatch,
} from '@/shared/lib/services/encounters';

interface ParticipantControlModalProps {
  participant: EncounterParticipant;
  /** Catalogue des états SRD (∪ custom) — rendu en grille de bascule. */
  conditions: readonly Condition[];
  /**
   * Fiche de créature liée au participant via son `monsterContentId` (résolue
   * côté écran depuis `useContent('monsters')`). `null` si le participant a été
   * saisi à la main ou si le bestiaire n'a pas la créature — le bouton « Voir la
   * fiche de créature » n'apparaît alors pas.
   */
  monster?: Monster | null;
  /** Action en cours (écriture Firestore) — désactive les contrôles. */
  pending: boolean;
  /** Applique un delta de PV (négatif = dégâts, positif = soin). */
  onApplyHp: (delta: number) => void;
  /** Accorde des PV temporaires (règle SRD : on garde le plus avantageux). */
  onGrantTempHp: (amount: number) => void;
  /** Pose/retire un état (slug de `conditions.json`, ou `custom:…` maison). */
  onToggleCondition: (condition: string, action: 'add' | 'remove') => void;
  /** Écrit la note libre du combattant (« celui-ci porte la clé »). */
  onSaveNote: (note: string) => void;
  /** Corrige nom / initiative / PV du combattant (M2, M3). */
  onUpdate: (patch: ParticipantPatch) => void;
  /** Sort le combattant de la rencontre (M2). */
  onRemove: () => void;
  onClose: () => void;
}

/** Champs éditables du bloc « Modifier le combattant », en saisie brute. */
interface EditDraft {
  name: string;
  initiative: string;
  currentHp: string;
  maxHp: string;
}

/**
 * Modale de contrôle MJ d'un participant non-joueur (monstre / PNJ) — JALON 24.4
 * step 7. Le MJ ajuste les PV (dégâts/soin, journalisés `monster-hp-change`,
 * visibilité `dm`) et pose/retire des états (persistés sur le doc partagé, sans
 * event dédié — aucun kind `monster-condition-change` n'existe).
 *
 * Réservée aux participants DM-contrôlés (`type !== 'player'`) : les PV d'un PJ
 * se gèrent sur sa fiche (event `hp-change` sur la fiche), pas ici. La défense
 * ultime reste la rule d'écriture `isDMOf` sur le doc rencontre.
 *
 * Le `participant` est dérivé en live du doc (`onSnapshot`) côté écran : les PV
 * et états affichés ici se mettent à jour après chaque application.
 */
export function ParticipantControlModal({
  participant,
  conditions,
  monster = null,
  pending,
  onApplyHp,
  onGrantTempHp,
  onToggleCondition,
  onSaveNote,
  onUpdate,
  onRemove,
  onClose,
}: ParticipantControlModalProps): JSX.Element {
  const [amount, setAmount] = useState<number>(1);
  const [customCondition, setCustomCondition] = useState<string>('');
  const [note, setNote] = useState<string>(participant.notes);
  // Fiche de créature ouverte en surcouche (modale imbriquée).
  const [statBlockOpen, setStatBlockOpen] = useState<boolean>(false);
  // Brouillon d'édition (M2/M3). `null` = aucun champ touché : les valeurs
  // affichées suivent alors le doc EN LIVE (un soin appliqué juste au-dessus se
  // reflète ici). Dès la première frappe, le brouillon prend la main — sinon le
  // prochain snapshot écraserait la saisie en cours.
  const [draft, setDraft] = useState<EditDraft | null>(null);
  // Retrait en deux temps : un geste irréversible ne part pas au premier tap.
  const [removeConfirming, setRemoveConfirming] = useState<boolean>(false);

  const titleId = `participant-control-${participant.instanceId}`;
  const statBlockTitleId = useId();
  const ratio = hpRatio(participant.currentHp, participant.maxHp);
  const hpPercent = Math.round(ratio * 100);
  const activeSet = useMemo(() => new Set(participant.conditions), [participant.conditions]);
  // Paliers rapides à l'échelle de la créature — pas [1,5,10] pour un dragon.
  const quickAmounts = useMemo(() => quickHpAmounts(participant.maxHp), [participant.maxHp]);
  // États maison déjà posés : ils ne sont dans aucun bundle, on les rend à part
  // pour que le MJ puisse les retirer d'un tap comme un état SRD.
  const customActive = useMemo(
    () => participant.conditions.filter(isCustomCondition),
    [participant.conditions],
  );

  // Montant saisi borné > 0 (un montant ≤ 0 n'a pas de sens pour dégâts/soin).
  const safeAmount = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  const noteDirty = note !== participant.notes;

  // Valeurs live du combattant, forme de saisie.
  const liveDraft: EditDraft = {
    name: participant.name,
    initiative: String(participant.initiative),
    currentHp: String(participant.currentHp),
    maxHp: String(participant.maxHp),
  };
  const edit = draft ?? liveDraft;
  const editDirty =
    draft !== null &&
    (draft.name !== liveDraft.name ||
      draft.initiative !== liveDraft.initiative ||
      draft.currentHp !== liveDraft.currentHp ||
      draft.maxHp !== liveDraft.maxHp);

  function patchDraft(patch: Partial<EditDraft>): void {
    setDraft((prev) => ({ ...(prev ?? liveDraft), ...patch }));
  }

  /**
   * N'envoie QUE les champs réellement changés : un patch partiel évite
   * d'écraser une valeur mise à jour côté serveur entre-temps (le service relit
   * l'état avant d'écrire, mais un champ non transmis ne peut pas régresser).
   * Une saisie vidée ou illisible est ignorée plutôt que rejetée.
   */
  function saveEdit(): void {
    if (draft === null) return;
    const patch: ParticipantPatch = {};
    if (draft.name.trim().length > 0 && draft.name !== liveDraft.name) patch.name = draft.name;
    if (draft.initiative !== liveDraft.initiative) {
      const parsed = Number.parseInt(draft.initiative, 10);
      if (Number.isFinite(parsed)) patch.initiative = parsed;
    }
    if (draft.maxHp !== liveDraft.maxHp) {
      const parsed = Number.parseInt(draft.maxHp, 10);
      if (Number.isFinite(parsed)) patch.maxHp = parsed;
    }
    if (draft.currentHp !== liveDraft.currentHp) {
      const parsed = Number.parseInt(draft.currentHp, 10);
      if (Number.isFinite(parsed)) patch.currentHp = parsed;
    }
    if (Object.keys(patch).length > 0) onUpdate(patch);
    setDraft(null);
  }

  function addCustomCondition(): void {
    const id = toCustomConditionId(customCondition);
    if (id === null || activeSet.has(id)) return;
    onToggleCondition(id, 'add');
    setCustomCondition('');
  }

  return (
    <DetailModal
      open
      onClose={onClose}
      titleId={titleId}
      closeLabel={t('encounters.control.closeAria')}
      size="md"
    >
      <div className="flex flex-col gap-6 px-5 py-6 pr-12">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Chip variant="damage">{t('encounters.participant.typeMonster')}</Chip>
          </div>
          <h2
            id={titleId}
            className="font-display text-xl font-bold uppercase tracking-[0.12em] text-gold-bright"
          >
            {participant.name}
          </h2>
          {monster ? (
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setStatBlockOpen(true)}
                tooltip={t('campaigns.tip.viewStatBlock')}
              >
                {t('encounters.control.viewStatBlock')}
              </Button>
            </div>
          ) : null}
        </header>

        {/* ─── PV ─────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
              {t('encounters.control.hpTitle')}
            </h3>
            <span className="font-serif text-body tabular-nums text-text">
              {participant.currentHp}/{participant.maxHp}
              {participant.tempHp > 0 ? (
                <span className="ml-2 text-teal">+{participant.tempHp}</span>
              ) : null}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-300 ease-base',
                hpBarColor(ratio),
              )}
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="font-title text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                {t('encounters.control.amount')}
              </span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={Number.isFinite(amount) ? amount : ''}
                onChange={(e) => setAmount(e.target.valueAsNumber)}
                aria-label={t('encounters.control.amount')}
                className="w-full rounded-pill border border-white-8 bg-bg-3/60 px-4 py-2 font-serif text-body tabular-nums text-text outline-none transition-colors duration-200 ease-base focus:border-gold"
              />
            </label>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onApplyHp(-safeAmount)}
              disabled={pending || safeAmount === 0}
              className="border-crimson/50 text-crimson hover:border-crimson"
              tooltip={t('campaigns.tip.applyDamage')}
            >
              − {t('encounters.control.damage')}
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onApplyHp(safeAmount)}
              disabled={pending || safeAmount === 0}
              className="border-teal/50 text-teal hover:border-teal"
              tooltip={t('campaigns.tip.applyHeal')}
            >
              + {t('encounters.control.heal')}
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onGrantTempHp(safeAmount)}
              disabled={pending || safeAmount === 0}
              className="border-teal/50 text-teal hover:border-teal"
              tooltip={t('campaigns.tip.grantTempHp')}
            >
              {t('encounters.control.tempHp')}
            </Button>
          </div>

          {/* Montants rapides : un tap = dégâts (−) ou soin (+). */}
          <div className="flex flex-wrap items-center gap-2">
            {quickAmounts.map((q) => (
              <Tooltip key={`dmg-${q}`} label={t('campaigns.tip.quickDamage')} decorative>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onApplyHp(-q)}
                  className="rounded-pill border border-crimson/30 bg-crimson/[0.06] px-3 py-1 font-title text-meta font-bold tabular-nums text-crimson transition-colors duration-200 ease-base hover:border-crimson hover:bg-crimson/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −{q}
                </button>
              </Tooltip>
            ))}
            {quickAmounts.map((q) => (
              <Tooltip key={`heal-${q}`} label={t('campaigns.tip.quickHeal')} decorative>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onApplyHp(q)}
                  className="rounded-pill border border-teal/30 bg-teal/[0.06] px-3 py-1 font-title text-meta font-bold tabular-nums text-teal transition-colors duration-200 ease-base hover:border-teal hover:bg-teal/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +{q}
                </button>
              </Tooltip>
            ))}
          </div>
        </section>

        {/* ─── États ──────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <h3 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('encounters.control.conditionsTitle')}
          </h3>
          {conditions.length === 0 ? (
            <p className="font-serif text-body-sm italic text-text-tertiary">
              {t('encounters.control.noConditions')}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {conditions.map((c) => {
                const active = activeSet.has(c.id);
                return (
                  <Tooltip
                    key={c.id}
                    label={active ? t('campaigns.tip.conditionRemove') : t('campaigns.tip.conditionAdd')}
                    decorative
                  >
                    <button
                      type="button"
                      disabled={pending}
                      aria-pressed={active}
                      onClick={() => onToggleCondition(c.id, active ? 'remove' : 'add')}
                      className={cn(
                        'rounded-pill border px-3 py-1 font-title text-[10px] font-bold uppercase tracking-[0.14em]',
                        'transition-colors duration-200 ease-base',
                        'disabled:cursor-not-allowed disabled:opacity-40',
                        active
                          ? 'border-crimson bg-crimson/15 text-crimson hover:bg-crimson/25'
                          : 'border-white-8 bg-white/[0.04] text-text-secondary hover:border-gold-bright hover:text-gold-bright',
                      )}
                    >
                      {localize(c.name)}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* États maison déjà posés — retirables d'un tap, comme les SRD. */}
          {customActive.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customActive.map((id) => (
                <Tooltip key={id} label={t('campaigns.tip.conditionRemove')} decorative>
                  <button
                    type="button"
                    disabled={pending}
                    aria-pressed
                    onClick={() => onToggleCondition(id, 'remove')}
                    className="rounded-pill border border-crimson bg-crimson/15 px-3 py-1 font-title text-[10px] font-bold uppercase tracking-[0.14em] text-crimson transition-colors duration-200 ease-base hover:bg-crimson/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {customConditionLabel(id)}
                  </button>
                </Tooltip>
              ))}
            </div>
          ) : null}

          {/* Champ « Autre état… » : la table invente ses propres conditions. */}
          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="font-title text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                {t('encounters.control.customCondition')}
              </span>
              <input
                type="text"
                value={customCondition}
                maxLength={CUSTOM_CONDITION_LABEL_MAX}
                placeholder={t('encounters.control.customConditionPlaceholder')}
                onChange={(e) => setCustomCondition(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomCondition();
                  }
                }}
                aria-label={t('encounters.control.customCondition')}
                className="w-full rounded-pill border border-white-8 bg-bg-3/60 px-4 py-2 font-serif text-body text-text outline-none transition-colors duration-200 ease-base focus:border-gold"
              />
            </label>
            <Button
              variant="secondary"
              size="md"
              onClick={addCustomCondition}
              disabled={pending || customCondition.trim().length === 0}
              tooltip={t('campaigns.tip.customCondition')}
            >
              {t('encounters.control.customConditionAdd')}
            </Button>
          </div>
        </section>

        {/* ─── Note libre ─────────────────────────────────────────── */}
        <section className="flex flex-col gap-2">
          <h3 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('encounters.control.noteTitle')}
          </h3>
          <textarea
            value={note}
            rows={3}
            maxLength={PARTICIPANT_NOTE_MAX}
            placeholder={t('encounters.control.notePlaceholder')}
            onChange={(e) => setNote(e.target.value)}
            aria-label={t('encounters.control.noteTitle')}
            className="w-full resize-y rounded-card-sm border border-white-8 bg-bg-3/60 px-4 py-2 font-serif text-body-sm text-text outline-none transition-colors duration-200 ease-base focus:border-gold"
          />
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSaveNote(note)}
              disabled={pending || !noteDirty}
              tooltip={t('campaigns.tip.saveNote')}
            >
              {t('encounters.control.noteSave')}
            </Button>
          </div>
        </section>

        {/* ─── Modifier le combattant (M2/M3) ─────────────────────── */}
        <section className="flex flex-col gap-3 border-t border-white-8 pt-5">
          <h3 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('encounters.control.editTitle')}
          </h3>

          <label className="flex flex-col gap-1">
            <span className="font-title text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
              {t('encounters.control.editName')}
            </span>
            <input
              type="text"
              value={edit.name}
              maxLength={PARTICIPANT_NAME_MAX}
              onChange={(e) => patchDraft({ name: e.target.value })}
              aria-label={t('encounters.control.editName')}
              className="w-full rounded-pill border border-white-8 bg-bg-3/60 px-4 py-2 font-serif text-body text-text outline-none transition-colors duration-200 ease-base focus:border-gold"
            />
          </label>

          <div className="grid grid-cols-3 gap-2">
            <EditNumberField
              label={t('encounters.control.editInitiative')}
              value={edit.initiative}
              onChange={(v) => patchDraft({ initiative: v })}
            />
            <EditNumberField
              label={t('encounters.control.editCurrentHp')}
              value={edit.currentHp}
              min={0}
              onChange={(v) => patchDraft({ currentHp: v })}
            />
            <EditNumberField
              label={t('encounters.control.editMaxHp')}
              value={edit.maxHp}
              min={1}
              onChange={(v) => patchDraft({ maxHp: v })}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (removeConfirming ? onRemove() : setRemoveConfirming(true))}
              disabled={pending}
              className={cn(
                'text-crimson',
                removeConfirming && 'border border-crimson/50 bg-crimson/[0.08]',
              )}
              tooltip={t('campaigns.tip.removeParticipant')}
            >
              {removeConfirming
                ? t('encounters.control.removeConfirm')
                : t('encounters.control.remove')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={saveEdit}
              disabled={pending || !editDirty}
              tooltip={t('campaigns.tip.editParticipant')}
            >
              {t('encounters.control.editSave')}
            </Button>
          </div>
        </section>
      </div>

      {/* Fiche de créature liée (modale imbriquée, lecture seule). */}
      {monster ? (
        <DetailModal
          open={statBlockOpen}
          onClose={() => setStatBlockOpen(false)}
          titleId={statBlockTitleId}
          closeLabel={t('encounters.control.statBlockCloseAria')}
          size="lg"
        >
          <MonsterStatBlock monster={monster} titleId={statBlockTitleId} />
        </DetailModal>
      ) : null}
    </DetailModal>
  );
}

interface EditNumberFieldProps {
  label: string;
  value: string;
  min?: number;
  onChange: (value: string) => void;
}

/**
 * Champ numérique du bloc d'édition. La valeur reste une CHAÎNE : un `number`
 * contrôlé rend impossible d'effacer le champ pour retaper (`valueAsNumber`
 * donne `NaN` sur vide, qui repart aussitôt en `0`). La conversion se fait à
 * l'enregistrement, où une saisie illisible est simplement ignorée.
 */
function EditNumberField({ label, value, min, onChange }: EditNumberFieldProps): JSX.Element {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-title text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full rounded-pill border border-white-8 bg-bg-3/60 px-3 py-2 font-serif text-body tabular-nums text-text outline-none transition-colors duration-200 ease-base focus:border-gold"
      />
    </label>
  );
}
