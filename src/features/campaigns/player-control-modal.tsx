import { useMemo, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { DetailModal } from '@/shared/components/detail-modal';
import { Tooltip } from '@/shared/components/tooltip';
import { useCharacter } from '@/features/sheet/use-character';
import { useUpdateCharacter } from '@/features/sheet/use-update-character';
import {
  applyDamage,
  applyHeal,
  setTempHp,
  type HpVitals,
} from '@/features/sheet/modes/combat/hp-combat';
import { DM_LOCKED_FIELDS, PermissionProvider } from '@/features/sheet/permissions-context';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { hpBarColor, hpRatio, quickHpAmounts } from './encounter-hp';

interface PlayerControlModalProps {
  /** Fiche liée du joueur ciblé (`users/{ownerUid}/characters/{characterId}`). */
  characterId: string;
  ownerUid: string;
  /** Nom porté par le participant — affiché tant que la fiche charge. */
  fallbackName: string;
  /**
   * Remonte les PV réels après application, pour que le tracker (qui ne porte
   * qu'un INSTANTANÉ des PV du PJ, figé à la création) cesse de mentir.
   */
  onApplied: (currentHp: number, maxHp: number) => void;
  onClose: () => void;
}

/**
 * Contrôle MJ des PV d'un PERSONNAGE JOUEUR depuis le tracker (M5 de l'audit de
 * malléabilité) — « le dragon souffle : 22 dégâts sur les quatre PJ ».
 *
 * Le mur d'origine : `canControl = isGm && participant.type !== 'player'`
 * fermait la modale sur un PJ, alors que les rules autorisaient l'écriture
 * depuis le plan 26 (omni-edit MJ). Le MJ devait ouvrir la fiche de chaque
 * joueur, une par une, en plein tour de combat.
 *
 * L'écriture n'invente RIEN : elle emprunte la voie omni-edit déjà livrée et
 * auditée — `PermissionProvider` pose `ownerUid` + `isDMEdit`, `useUpdateCharacter`
 * route vers le sous-arbre du joueur, journalise le diff (`hp-change`,
 * `temp-hp`) ET l'audit `dm-edit`. Les PV du PJ restent sur SA fiche : le
 * participant de rencontre n'en porte qu'un reflet.
 *
 * Limite assumée : tomber à 0 PV n'ouvre pas la modale de jets de mort du
 * joueur (elle se déclenche sur le geste local de sa fiche). Le joueur voit ses
 * PV à 0 en temps réel et lance ses jets depuis sa fiche.
 */
export function PlayerControlModal({
  characterId,
  ownerUid,
  fallbackName,
  onApplied,
  onClose,
}: PlayerControlModalProps): JSX.Element {
  const { character, isLoading } = useCharacter(characterId, ownerUid);
  const titleId = `player-control-${characterId}`;

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
            <Chip variant="gold">{t('encounters.playerControl.badge')}</Chip>
          </div>
          <h2
            id={titleId}
            className="font-display text-xl font-bold uppercase tracking-[0.12em] text-gold-bright"
          >
            {character?.name ?? fallbackName}
          </h2>
          <p className="font-serif text-body-sm italic text-text-secondary">
            {t('encounters.playerControl.help')}
          </p>
        </header>

        {character === null ? (
          <p className="font-serif text-body-sm italic text-text-tertiary">
            {isLoading
              ? t('encounters.playerControl.loading')
              : t('encounters.playerControl.unreadable')}
          </p>
        ) : (
          // L'omni-edit MJ vit dans le contexte, pas dans l'appel : c'est lui
          // qui route l'écriture vers `users/{ownerUid}` et arme l'audit.
          <PermissionProvider
            value={{
              canEdit: true,
              isDM: true,
              isDMEdit: true,
              ownerUid,
              lockedFields: DM_LOCKED_FIELDS,
            }}
          >
            <PlayerHpControls character={character} onApplied={onApplied} />
          </PermissionProvider>
        )}
      </div>
    </DetailModal>
  );
}

interface PlayerHpControlsProps {
  character: Character;
  onApplied: (currentHp: number, maxHp: number) => void;
}

function PlayerHpControls({ character, onApplied }: PlayerHpControlsProps): JSX.Element {
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);
  const [amount, setAmount] = useState<number>(1);
  const [failed, setFailed] = useState<boolean>(false);

  const vitals: HpVitals = {
    current: character.hp.current,
    max: character.hp.max,
    temp: character.hp.temp,
  };
  const ratio = hpRatio(vitals.current, vitals.max);
  const hpPercent = Math.round(ratio * 100);
  const quickAmounts = useMemo(() => quickHpAmounts(vitals.max), [vitals.max]);
  const safeAmount = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;

  /**
   * Un seul chemin d'écriture pour les trois gestes : la règle SRD est déjà
   * portée par `applyDamage` / `applyHeal` / `setTempHp` (absorption par les PV
   * temporaires, plafond à `max`, temporaires non cumulatifs). On n'en réécrit
   * aucune ici — le tracker et la fiche appliquent la MÊME arithmétique.
   */
  async function write(next: HpVitals): Promise<void> {
    setFailed(false);
    try {
      await updateCharacter({ hp: { current: next.current, max: next.max, temp: next.temp } });
      onApplied(next.current, next.max);
    } catch {
      setFailed(true);
    }
  }

  function damage(value: number): void {
    if (value <= 0) return;
    void write(applyDamage(vitals, value).hp);
  }

  function heal(value: number): void {
    if (value <= 0) return;
    void write(applyHeal(vitals, value));
  }

  function grantTemp(value: number): void {
    if (value <= 0) return;
    void write(setTempHp(vitals, value));
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          {t('encounters.control.hpTitle')}
        </h3>
        <span className="font-serif text-body tabular-nums text-text">
          {vitals.current}/{vitals.max}
          {vitals.temp > 0 ? <span className="ml-2 text-teal">+{vitals.temp}</span> : null}
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
          onClick={() => damage(safeAmount)}
          disabled={isUpdating || safeAmount === 0}
          className="border-crimson/50 text-crimson hover:border-crimson"
          tooltip={t('campaigns.tip.applyDamage')}
        >
          − {t('encounters.control.damage')}
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => heal(safeAmount)}
          disabled={isUpdating || safeAmount === 0}
          className="border-teal/50 text-teal hover:border-teal"
          tooltip={t('campaigns.tip.applyHeal')}
        >
          + {t('encounters.control.heal')}
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => grantTemp(safeAmount)}
          disabled={isUpdating || safeAmount === 0}
          className="border-teal/50 text-teal hover:border-teal"
          tooltip={t('campaigns.tip.grantTempHp')}
        >
          {t('encounters.control.tempHp')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {quickAmounts.map((q) => (
          <Tooltip key={`dmg-${q}`} label={t('campaigns.tip.quickDamage')} decorative>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => damage(q)}
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
              disabled={isUpdating}
              onClick={() => heal(q)}
              className="rounded-pill border border-teal/30 bg-teal/[0.06] px-3 py-1 font-title text-meta font-bold tabular-nums text-teal transition-colors duration-200 ease-base hover:border-teal hover:bg-teal/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              +{q}
            </button>
          </Tooltip>
        ))}
      </div>

      {failed ? (
        <p
          role="alert"
          className="rounded-card-sm border border-crimson/40 bg-crimson/[0.08] px-3 py-2 font-serif text-body-sm text-crimson"
        >
          {t('encounters.action.error.generic')}
        </p>
      ) : null}
    </section>
  );
}
