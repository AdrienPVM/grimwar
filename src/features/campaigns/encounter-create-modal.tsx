import { useId, useRef, useState, type FormEvent, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { Divider } from '@/shared/components/divider';
import { FormField } from '@/shared/components/form/form-field';
import { TextInput } from '@/shared/components/form/text-input';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import {
  createEncounter,
  type CreateParticipantInput,
} from '@/shared/lib/services/encounters';

import type { Monster } from '@/shared/types/content';
import type { Npc } from '@/shared/types/npc';

import { MonsterPickerModal } from '@/features/map-proto/monster-picker-modal';

import { NpcPortraitFor } from './npc-portrait';
import {
  useEncounterPartyDraft,
  type LinkedMember,
} from './use-encounter-party-draft';
import { useNpcs } from './use-npcs';

interface Props {
  campaignId: string;
  open: boolean;
  /** Membres ayant lié une fiche — auto-inclus comme participants joueurs. */
  linkedMembers: LinkedMember[];
  onClose: () => void;
  /** Appelé après création réussie — le parent rafraîchit la liste. */
  onCreated: (result: { encounterId: string }) => void;
}

// Aligné sur `EncounterSchema.name` (1..120) et participant `name` (1..120).
const NAME_MAX = 120;
// Garde-fou anti-saisie absurde : un même monstre instancié au plus 20 fois.
const QTY_MAX = 20;

/** Ligne de monstre : saisie manuelle OU préremplie depuis le bestiaire. */
interface MonsterRow {
  /** Clé React locale stable (compteur), pas l'`instanceId` Firestore. */
  key: number;
  name: string;
  hp: string;
  qty: string;
  /**
   * Slug `monsters.json` (ou contenu custom) si la ligne a été préremplie depuis
   * le bestiaire — propagé en `monsterContentId` sur le participant. `null` pour
   * une ligne saisie à la main (le lien au bestiaire est alors inconnu).
   */
  contentId: string | null;
}

/**
 * Modale « Créer une rencontre » (steps 2-3 du plan 24, livraison 24.2).
 *
 * Deux sources de participants :
 *   - **Joueurs auto-inclus** : les fiches liées de la table (`useEncounterPartyDraft`),
 *     en lecture seule ici — le MJ ne les édite pas, ils sont la compagnie.
 *   - **Monstres en saisie manuelle** (nom + PV) : stopgap acté tant que
 *     `monsters.json` est vide (0/332, bloquant S3). `monsterContentId` reste
 *     `null` ; le bestiaire SRD enrichira plus tard. La CA n'est PAS saisie : le
 *     schéma participant documenté (DATA-MODEL.md) ne porte pas de champ `ac` —
 *     l'ajouter serait un changement de schéma (décision Adrien). Le tracker
 *     (initiative / tours / PV) fonctionne sans CA.
 *
 * Une quantité > 1 sur une ligne de monstre crée N participants numérotés
 * (« Gobelin 1 », « Gobelin 2 »…), chacun avec son `instanceId` (posé par le
 * service). Les PV des joueurs sont figés à l'instant de la création.
 */
export function EncounterCreateModal({
  campaignId,
  open,
  linkedMembers,
  onClose,
  onCreated,
}: Props): JSX.Element {
  const titleId = useId();
  const nextRowKey = useRef<number>(0);
  const [name, setName] = useState<string>('');
  const [monsters, setMonsters] = useState<MonsterRow[]>([]);
  // PNJ enregistrés sélectionnés : npcId → PV (string, prérempli depuis combatStats).
  const [npcSelections, setNpcSelections] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  // Sélecteur de bestiaire (autofill d'une ligne de monstre).
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  const party = useEncounterPartyDraft(linkedMembers, open);
  // PNJ de la campagne (contexte MJ) — chargés seulement quand la modale est
  // ouverte (le hook ne lance ses lectures que si `campaignId` est défini).
  const { npcs: savedNpcs } = useNpcs(open ? campaignId : undefined, true);

  function resetAndClose(): void {
    setName('');
    setMonsters([]);
    setNpcSelections({});
    setSubmitError(null);
    setNameError(null);
    setSubmitting(false);
    setPickerOpen(false);
    onClose();
  }

  /** (Dé)sélectionne un PNJ ; à la sélection, préremplit ses PV depuis `combatStats`. */
  function toggleNpc(npc: Npc): void {
    setNpcSelections((prev) => {
      if (npc.id in prev) {
        const { [npc.id]: _removed, ...rest } = prev;
        return rest;
      }
      const hp = npc.combatStats?.hp;
      return { ...prev, [npc.id]: hp !== undefined ? String(hp) : '' };
    });
    if (submitError) setSubmitError(null);
  }

  function updateNpcHp(npcId: string, hp: string): void {
    setNpcSelections((prev) => ({ ...prev, [npcId]: hp }));
    if (submitError) setSubmitError(null);
  }

  function addMonsterRow(): void {
    setMonsters((rows) => [
      ...rows,
      { key: nextRowKey.current++, name: '', hp: '', qty: '1', contentId: null },
    ]);
  }

  /**
   * Préremplit une ligne de monstre depuis le bestiaire (autofill rencontre,
   * directive 2026-06-27) : nom localisé + PV moyens du bloc de stats, et on
   * mémorise le slug en `contentId` pour lier le participant à sa fiche de
   * créature. La CA n'est pas portée (le schéma participant n'a pas de champ
   * `ac` — décision Adrien) ; le MJ ajuste PV et quantité ensuite comme une
   * ligne manuelle.
   */
  function addMonsterFromBestiary(monster: Monster): void {
    setMonsters((rows) => [
      ...rows,
      {
        key: nextRowKey.current++,
        name: localize(monster.name),
        hp: String(monster.hp.avg),
        qty: '1',
        contentId: monster.id,
      },
    ]);
    setPickerOpen(false);
    if (submitError) setSubmitError(null);
  }

  function updateMonsterRow(key: number, patch: Partial<Omit<MonsterRow, 'key'>>): void {
    setMonsters((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    if (submitError) setSubmitError(null);
  }

  function removeMonsterRow(key: number): void {
    setMonsters((rows) => rows.filter((r) => r.key !== key));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setNameError(t('encounters.create.error.nameRequired'));
      return;
    }
    if (trimmedName.length > NAME_MAX) {
      setNameError(t('encounters.create.error.nameTooLong'));
      return;
    }
    setNameError(null);

    // Lignes « actives » : une ligne entièrement vide (ajoutée par erreur) est
    // ignorée ; une ligne partiellement remplie est validée.
    const activeRows = monsters.filter(
      (r) => r.name.trim().length > 0 || r.hp.trim().length > 0,
    );
    if (activeRows.some((r) => r.name.trim().length === 0)) {
      setSubmitError(t('encounters.create.error.monsterName'));
      return;
    }
    const parsedRows = activeRows.map((r) => ({
      name: r.name.trim(),
      hp: Number.parseInt(r.hp, 10),
      qty: clampQty(Number.parseInt(r.qty, 10)),
      contentId: r.contentId,
    }));
    if (parsedRows.some((r) => !Number.isFinite(r.hp) || r.hp <= 0)) {
      setSubmitError(t('encounters.create.error.monsterHp'));
      return;
    }

    const playerParticipants: CreateParticipantInput[] = party.drafts.map((d) => ({
      type: 'player',
      characterId: d.characterId,
      name: d.name,
      maxHp: d.maxHp,
      currentHp: d.currentHp,
    }));

    const monsterParticipants: CreateParticipantInput[] = parsedRows.flatMap((r) =>
      expandMonsterRow(r),
    );

    // PNJ sélectionnés → participants `type:'npc'`. PV depuis le champ (prérempli
    // de `combatStats.hp`). Un PNJ lié à un monstre conserve son `monsterContentId`.
    const selectedNpcEntries = savedNpcs.filter((n) => n.id in npcSelections);
    const npcHps = selectedNpcEntries.map((n) => ({
      npc: n,
      hp: Number.parseInt(npcSelections[n.id] ?? '', 10),
    }));
    if (npcHps.some((e) => !Number.isFinite(e.hp) || e.hp <= 0)) {
      setSubmitError(t('encounters.create.error.npcHp'));
      return;
    }
    const npcParticipants: CreateParticipantInput[] = npcHps.map(({ npc, hp }) => ({
      type: 'npc',
      monsterContentId: npc.combatStats?.monsterContentId ?? null,
      name: npc.name,
      maxHp: hp,
    }));

    const participants = [
      ...playerParticipants,
      ...monsterParticipants,
      ...npcParticipants,
    ];
    if (participants.length === 0) {
      setSubmitError(t('encounters.create.error.noParticipants'));
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await createEncounter(campaignId, {
        name: trimmedName,
        participants,
      });
      onCreated(result);
      resetAndClose();
    } catch {
      setSubmitError(t('encounters.create.error.generic'));
      setSubmitting(false);
    }
  }

  return (
    <DetailModal
      open={open}
      onClose={resetAndClose}
      titleId={titleId}
      closeLabel={t('encounters.create.close')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
        <header className="text-center">
          <h2
            id={titleId}
            className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright"
          >
            {t('encounters.create.title')}
          </h2>
          <Divider className="my-3" />
          <p className="mx-auto max-w-[40ch] font-serif text-body-sm italic text-text-secondary">
            {t('encounters.create.intro')}
          </p>
        </header>

        <FormField
          label={t('encounters.create.nameField.label')}
          helper={t('encounters.create.nameField.helper')}
          error={nameError ?? undefined}
          required
        >
          {(field) => (
            <TextInput
              {...field}
              value={name}
              maxLength={NAME_MAX}
              autoFocus
              placeholder={t('encounters.create.nameField.placeholder')}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              disabled={submitting}
            />
          )}
        </FormField>

        <PartySection
          drafts={party.drafts}
          isLoading={party.isLoading}
          hadReadError={party.hadReadError}
        />

        <section aria-label={t('encounters.create.monsters.title')}>
          <h3 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('encounters.create.monsters.title')}
          </h3>
          <p className="mt-1 font-serif text-body-sm italic text-text-tertiary">
            {t('encounters.create.monsters.intro')}
          </p>

          {monsters.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {monsters.map((row) => (
                <li key={row.key} className="flex items-end gap-2">
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                      {t('encounters.create.monsters.nameLabel')}
                    </span>
                    <TextInput
                      value={row.name}
                      maxLength={NAME_MAX}
                      placeholder={t('encounters.create.monsters.namePlaceholder')}
                      onChange={(e) =>
                        updateMonsterRow(row.key, { name: e.target.value, contentId: null })
                      }
                      disabled={submitting}
                    />
                  </label>
                  <label className="flex w-16 flex-col gap-1">
                    <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                      {t('encounters.create.monsters.hpLabel')}
                    </span>
                    <NumberInput
                      value={row.hp}
                      min={1}
                      placeholder={t('encounters.create.monsters.hpPlaceholder')}
                      ariaLabel={t('encounters.create.monsters.hpLabel')}
                      onChange={(v) => updateMonsterRow(row.key, { hp: v })}
                      disabled={submitting}
                    />
                  </label>
                  <label className="flex w-14 flex-col gap-1">
                    <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                      {t('encounters.create.monsters.qtyLabel')}
                    </span>
                    <NumberInput
                      value={row.qty}
                      min={1}
                      max={QTY_MAX}
                      ariaLabel={t('encounters.create.monsters.qtyLabel')}
                      onChange={(v) => updateMonsterRow(row.key, { qty: v })}
                      disabled={submitting}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t('encounters.create.monsters.removeRow')}
                    onClick={() => removeMonsterRow(row.key)}
                    disabled={submitting}
                  >
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addMonsterRow}
              disabled={submitting}
            >
              + {t('encounters.create.monsters.addRow')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPickerOpen(true)}
              disabled={submitting}
            >
              + {t('encounters.create.monsters.fromBestiary')}
            </Button>
          </div>
        </section>

        <NpcSection
          npcs={savedNpcs}
          selections={npcSelections}
          onToggle={toggleNpc}
          onHpChange={updateNpcHp}
          disabled={submitting}
        />

        {submitError ? (
          <p
            role="alert"
            className="rounded-card-sm border border-crimson/40 bg-crimson/[0.08] px-3 py-2 font-serif text-body-sm text-crimson"
          >
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={resetAndClose}
            disabled={submitting}
          >
            {t('encounters.create.cancel')}
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={submitting}>
            {submitting ? t('encounters.create.submitting') : t('encounters.create.submit')}
          </Button>
        </div>
      </form>

      <MonsterPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addMonsterFromBestiary}
      />
    </DetailModal>
  );
}

interface PartySectionProps {
  drafts: { characterId: string; name: string; maxHp: number; currentHp: number }[];
  isLoading: boolean;
  hadReadError: boolean;
}

/**
 * Section « Personnages de la table » — lecture seule, montre qui sera auto-inclus
 * avec ses PV courants/max au moment de la création.
 */
function PartySection({ drafts, isLoading, hadReadError }: PartySectionProps): JSX.Element {
  return (
    <section aria-label={t('encounters.create.party.title')}>
      <h3 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
        {t('encounters.create.party.title')}
      </h3>
      {isLoading ? (
        <p className="mt-2 font-serif text-body-sm italic text-text-tertiary">
          {t('encounters.create.party.loading')}
        </p>
      ) : drafts.length === 0 ? (
        <p className="mt-2 font-serif text-body-sm italic text-text-tertiary">
          {t('encounters.create.party.empty')}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {drafts.map((d) => (
            <li
              key={d.characterId}
              className="flex items-center justify-between gap-3 rounded-card-sm border border-white-8 bg-bg-3/40 px-3 py-2"
            >
              <span className="truncate font-serif text-body text-text">{d.name}</span>
              <span className="shrink-0 font-display text-body-sm text-text-secondary">
                {t('encounters.create.party.hpLabel')} {d.currentHp}
                <span className="text-text-tertiary"> / {d.maxHp}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {hadReadError ? (
        <p className="mt-2 font-serif text-body-sm italic text-ruby">
          {t('encounters.create.party.error')}
        </p>
      ) : null}
    </section>
  );
}

interface NpcSectionProps {
  npcs: Npc[];
  /** npcId → PV (string) pour les PNJ sélectionnés. */
  selections: Record<string, string>;
  onToggle: (npc: Npc) => void;
  onHpChange: (npcId: string, hp: string) => void;
  disabled: boolean;
}

/**
 * Section « PNJ » (plan 28 steps 9-10) : le MJ choisit parmi les PNJ enregistrés
 * de la campagne pour les ajouter au combat. Un PNJ sélectionné devient un
 * participant `type:'npc'` avec ses PV (préremplis depuis `combatStats.hp`,
 * éditables). Aucun changement de schéma : pas de `npcId` sur le participant
 * (cf. DATA-MODEL.md note plan 28) — le PNJ contribue nom + PV (+ `monsterContentId`
 * s'il est lié à un monstre), suffisant pour le tracker.
 */
function NpcSection({
  npcs,
  selections,
  onToggle,
  onHpChange,
  disabled,
}: NpcSectionProps): JSX.Element {
  return (
    <section aria-label={t('encounters.create.npcs.title')}>
      <h3 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
        {t('encounters.create.npcs.title')}
      </h3>
      <p className="mt-1 font-serif text-body-sm italic text-text-tertiary">
        {t('encounters.create.npcs.intro')}
      </p>
      {npcs.length === 0 ? (
        <p className="mt-2 font-serif text-body-sm italic text-text-tertiary">
          {t('encounters.create.npcs.empty')}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {npcs.map((npc) => {
            const selected = npc.id in selections;
            return (
              <li
                key={npc.id}
                className={cn(
                  'flex items-center gap-3 rounded-card-sm border px-3 py-2 transition-colors duration-200 ease-base',
                  selected
                    ? 'border-gold-bright/50 bg-gold-bright/[0.06]'
                    : 'border-white-8 bg-bg-3/40',
                )}
              >
                <label className="flex flex-1 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle(npc)}
                    disabled={disabled}
                    className="h-4 w-4 accent-gold-bright"
                  />
                  <NpcPortraitFor npc={npc} size="sm" />
                  <span className="truncate font-serif text-body text-text">{npc.name}</span>
                </label>
                {selected ? (
                  <label className="flex w-16 flex-col gap-1">
                    <span className="font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                      {t('encounters.create.npcs.hpLabel')}
                    </span>
                    <NumberInput
                      value={selections[npc.id] ?? ''}
                      min={1}
                      ariaLabel={`${npc.name} — ${t('encounters.create.npcs.hpLabel')}`}
                      onChange={(v) => onHpChange(npc.id, v)}
                      disabled={disabled}
                    />
                  </label>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

interface NumberInputProps {
  value: string;
  min?: number;
  max?: number;
  placeholder?: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Champ numérique brut (PV / quantité). Pas de `FormField` ici : la disposition
 * est en grille de ligne, les labels sont gérés par le `<label>` parent.
 */
function NumberInput({
  value,
  min,
  max,
  placeholder,
  ariaLabel,
  onChange,
  disabled,
}: NumberInputProps): JSX.Element {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      min={min}
      max={max}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'w-full rounded-card-sm border border-white-8 bg-bg-3/40',
        'px-2 py-2 text-center font-serif text-body text-text',
        'placeholder:text-text-tertiary',
        'focus:border-gold-bright focus:outline-none focus:ring-1 focus:ring-gold-bright/40',
        'transition-colors duration-200 ease-base',
        'disabled:opacity-50',
        '[color-scheme:dark]',
      )}
    />
  );
}

/** Borne la quantité dans [1, QTY_MAX] ; NaN ou < 1 ⇒ 1. */
function clampQty(qty: number): number {
  if (!Number.isFinite(qty) || qty < 1) return 1;
  return Math.min(QTY_MAX, qty);
}

/**
 * Développe une ligne de monstre en N participants. Numérote les noms quand
 * `qty > 1` (« Gobelin 1 », « Gobelin 2 »…) ; nom inchangé si unique.
 */
function expandMonsterRow(row: {
  name: string;
  hp: number;
  qty: number;
  contentId: string | null;
}): CreateParticipantInput[] {
  return Array.from({ length: row.qty }, (_, i) => ({
    type: 'monster' as const,
    monsterContentId: row.contentId,
    name: row.qty > 1 ? `${row.name} ${i + 1}` : row.name,
    maxHp: row.hp,
  }));
}
