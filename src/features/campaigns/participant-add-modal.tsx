import { useId, useState, type FormEvent, type JSX } from 'react';

import { MonsterPickerModal } from '@/features/map-proto/monster-picker-modal';
import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import type { CreateParticipantInput } from '@/shared/lib/services/encounters';
import { PARTICIPANT_NAME_MAX } from '@/shared/lib/services/encounters';
import type { Monster } from '@/shared/types/content';
import type { ParticipantType } from '@/shared/types/encounter';

interface ParticipantAddModalProps {
  open: boolean;
  /** Écriture en cours — désactive la validation. */
  pending: boolean;
  onAdd: (input: CreateParticipantInput) => void;
  onClose: () => void;
}

/** Types proposés : un PJ entre par la fiche liée, jamais saisi à la main ici. */
const ADDABLE_TYPES: readonly { type: Extract<ParticipantType, 'monster' | 'npc'>; labelKey: 'encounters.add.typeMonster' | 'encounters.add.typeNpc' }[] = [
  { type: 'monster', labelKey: 'encounters.add.typeMonster' },
  { type: 'npc', labelKey: 'encounters.add.typeNpc' },
];

/**
 * Ajout d'un combattant à une rencontre DÉJÀ créée (M2 de l'audit de
 * malléabilité) — le renfort qui débarque au round 3, le garde qui se réveille.
 *
 * Le mur d'origine : la liste des participants était figée à la création. Pour
 * faire entrer une créature, il fallait clôturer et refaire la rencontre — donc
 * perdre l'initiative, les PV et les états de tout le monde.
 *
 * Deux chemins, comme à la création : saisie libre (nom + PV, aucune dépendance
 * au bestiaire) ou reprise d'une fiche de créature qui préremplit le nom et les
 * PV moyens tout en gardant le lien `monsterContentId` (la fiche reste
 * consultable depuis la modale de contrôle, et l'initiative dérive de sa DEX).
 */
export function ParticipantAddModal({
  open,
  pending,
  onAdd,
  onClose,
}: ParticipantAddModalProps): JSX.Element {
  const titleId = useId();
  const [name, setName] = useState<string>('');
  const [hp, setHp] = useState<string>('');
  const [type, setType] = useState<Extract<ParticipantType, 'monster' | 'npc'>>('monster');
  const [contentId, setContentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  function reset(): void {
    setName('');
    setHp('');
    setType('monster');
    setContentId(null);
    setError(null);
  }

  function closeAndReset(): void {
    reset();
    onClose();
  }

  /** Autofill depuis le bestiaire — le MJ garde la main sur nom et PV ensuite. */
  function pickMonster(monster: Monster): void {
    setName(localize(monster.name));
    setHp(String(monster.hp.avg));
    setContentId(monster.id);
    setType('monster');
    setPickerOpen(false);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (pending) return;

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError(t('encounters.add.error.name'));
      return;
    }
    const parsedHp = Number.parseInt(hp, 10);
    if (!Number.isFinite(parsedHp) || parsedHp <= 0) {
      setError(t('encounters.add.error.hp'));
      return;
    }

    onAdd({
      type,
      name: trimmed.slice(0, PARTICIPANT_NAME_MAX),
      maxHp: parsedHp,
      monsterContentId: contentId,
    });
    reset();
    onClose();
  }

  return (
    <>
      <DetailModal
        open={open}
        onClose={closeAndReset}
        titleId={titleId}
        closeLabel={t('encounters.add.closeAria')}
        size="md"
      >
        {/* `noValidate` : la validation native afficherait une bulle non stylée
            et dans la langue du navigateur. Nos messages français sont la seule
            voix — ils sortent de `handleSubmit`. */}
        <form
          noValidate
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 px-5 py-6 pr-12"
        >
          <header className="flex flex-col gap-2">
            <h2
              id={titleId}
              className="font-display text-xl font-bold uppercase tracking-[0.12em] text-gold-bright"
            >
              {t('encounters.add.title')}
            </h2>
            <p className="font-serif text-body-sm italic text-text-secondary">
              {t('encounters.add.intro')}
            </p>
          </header>

          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPickerOpen(true)}
              tooltip={t('campaigns.tip.addParticipant')}
            >
              {t('encounters.add.fromBestiary')}
            </Button>
          </div>

          <label className="flex flex-col gap-1">
            <span className="font-title text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
              {t('encounters.add.nameLabel')}
            </span>
            <input
              type="text"
              value={name}
              maxLength={PARTICIPANT_NAME_MAX}
              placeholder={t('encounters.add.namePlaceholder')}
              onChange={(e) => {
                setName(e.target.value);
                // Le nom retapé décroche du bestiaire : c'est une créature à
                // part, pas la fiche SRD renommée.
                if (contentId !== null) setContentId(null);
                if (error) setError(null);
              }}
              aria-label={t('encounters.add.nameLabel')}
              className="w-full rounded-pill border border-white-8 bg-bg-3/60 px-4 py-2 font-serif text-body text-text outline-none transition-colors duration-200 ease-base focus:border-gold"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-title text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                {t('encounters.add.hpLabel')}
              </span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={hp}
                onChange={(e) => {
                  setHp(e.target.value);
                  if (error) setError(null);
                }}
                aria-label={t('encounters.add.hpLabel')}
                className="w-full rounded-pill border border-white-8 bg-bg-3/60 px-4 py-2 font-serif text-body tabular-nums text-text outline-none transition-colors duration-200 ease-base focus:border-gold"
              />
            </label>

            <fieldset className="flex flex-col gap-1">
              <legend className="font-title text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                {t('encounters.add.typeLabel')}
              </legend>
              <div className="mt-1 flex gap-2">
                {ADDABLE_TYPES.map((entry) => (
                  <button
                    key={entry.type}
                    type="button"
                    aria-pressed={type === entry.type}
                    onClick={() => setType(entry.type)}
                    className={cn(
                      'rounded-pill border px-3 py-1.5 font-title text-[10px] font-bold uppercase tracking-[0.14em]',
                      'transition-colors duration-200 ease-base',
                      type === entry.type
                        ? 'border-gold-bright bg-gold/15 text-gold-bright'
                        : 'border-white-8 bg-white/[0.04] text-text-secondary hover:border-gold-bright hover:text-gold-bright',
                    )}
                  >
                    {t(entry.labelKey)}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-card-sm border border-crimson/40 bg-crimson/[0.08] px-3 py-2 font-serif text-body-sm text-crimson"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={closeAndReset}>
              {t('encounters.add.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={pending}>
              {t('encounters.add.submit')}
            </Button>
          </div>
        </form>
      </DetailModal>

      <MonsterPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={pickMonster}
      />
    </>
  );
}
