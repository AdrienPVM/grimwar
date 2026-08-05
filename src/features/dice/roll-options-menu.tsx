import { useState, type JSX } from 'react';

import { cn } from '@/shared/lib/cn';
import type { Advantage } from '@/shared/lib/dice/types';
import { t } from '@/shared/lib/i18n';

/**
 * Menu d'options de jet — le geste « je ne lance pas ça n'importe comment ».
 *
 * Il existait déjà, en trois boutons, cloué dans `SavesRow` : quatre familles de
 * jets (compétences, initiative, jets de mort, attaques de sort) n'avaient donc
 * aucun moyen de demander l'avantage. Extrait ici pour être partagé, et étendu
 * de deux réglages qui n'existaient nulle part :
 *
 *  - **Dépenser l'inspiration** (M21). Le pivot forçait l'avantage dès que le
 *    personnage avait une inspiration et la consommait sans demander — on ne
 *    pouvait pas la garder pour le jet qui compte, et un Désavantage choisi
 *    explicitement était écrasé. La case n'apparaît que si l'inspiration existe.
 *  - **Bonus ponctuel** (M22). Bénédiction, +1 circonstanciel accordé à la
 *    table. Rien n'est persisté sur la fiche : c'est le bonus de CE jet.
 *
 * Le composant ne lance rien — il rend un choix. L'appelant reste maître de la
 * façon dont ce choix se traduit en jet.
 */

export interface RollOptions {
  readonly advantage: Advantage;
  readonly useInspiration: boolean;
  readonly bonus: number;
  /**
   * Jet DISCRET (M43) : journalisé en visibilité `self` au lieu de `all`.
   * Le joueur voit son jet, la table ne le voit pas passer. La visibilité
   * était codée en dur à l'écriture dans tous les loggers — `'self'` était
   * déclaré au schéma, géré en lecture, et jamais écrit.
   */
  readonly discreet: boolean;
}

interface RollOptionsMenuProps {
  /** Titre court du jet concerné (« JS Force », « Discrétion »…). */
  readonly title: string;
  /** Étiquette accessible de la boîte de dialogue. */
  readonly ariaLabel: string;
  /** `true` si le personnage dispose d'une inspiration à dépenser. */
  readonly hasInspiration: boolean;
  readonly onPick: (options: RollOptions) => void;
  readonly onClose: () => void;
}

const BONUS_MIN = -10;
const BONUS_MAX = 10;

export function RollOptionsMenu({
  title,
  ariaLabel,
  hasInspiration,
  onPick,
  onClose,
}: RollOptionsMenuProps): JSX.Element {
  const [useInspiration, setUseInspiration] = useState<boolean>(false);
  const [bonus, setBonus] = useState<number>(0);
  const [discreet, setDiscreet] = useState<boolean>(false);

  const pick = (advantage: Advantage): void =>
    onPick({ advantage, useInspiration, bonus, discreet });

  return (
    <div
      role="dialog"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-6 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label={t('sheet.essence.close')}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative flex w-full max-w-[300px] flex-col gap-2 rounded-card border border-soft bg-bg-2/95 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <p className="mb-1 text-center font-title text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
          {title}
        </p>

        {/* Bonus ponctuel AVANT le choix d'avantage : on règle, puis on lance —
            chacun des trois boutons du bas conclut le geste. */}
        <label className="flex items-center justify-between gap-3 rounded-card-sm border border-white-8 bg-white/[0.03] px-3 py-2">
          <span className="font-title text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
            {t('dice.options.bonus')}
          </span>
          <input
            type="number"
            min={BONUS_MIN}
            max={BONUS_MAX}
            value={bonus}
            onChange={(e) => {
              const n = Number(e.target.value);
              setBonus(
                Number.isFinite(n)
                  ? Math.max(BONUS_MIN, Math.min(BONUS_MAX, Math.trunc(n)))
                  : 0,
              );
            }}
            data-testid="roll-options-bonus"
            aria-label={t('dice.options.bonusAria')}
            className="w-16 rounded-card-sm border border-white-8 bg-ink/40 px-2 py-1 text-center font-display text-[16px] font-bold text-gold-bright focus:border-gold-dim focus:outline-none"
          />
        </label>

        {hasInspiration && (
          <button
            type="button"
            role="switch"
            aria-checked={useInspiration}
            onClick={() => setUseInspiration((v) => !v)}
            data-testid="roll-options-inspiration"
            className={cn(
              'flex items-center justify-between gap-3 rounded-card-sm border px-3 py-2 text-left transition-colors duration-200 ease-base',
              useInspiration
                ? 'border-gold-bright bg-gold-bright/10 text-gold-bright'
                : 'border-white-8 bg-white/[0.03] text-text-secondary hover:border-gold-dim',
            )}
          >
            <span className="font-title text-[10px] font-bold uppercase tracking-[0.16em]">
              {t('dice.options.useInspiration')}
            </span>
            <span aria-hidden className="font-display text-[14px]">
              {useInspiration ? '◆' : '◇'}
            </span>
          </button>
        )}

        <button
          type="button"
          role="switch"
          aria-checked={discreet}
          onClick={() => setDiscreet((v) => !v)}
          data-testid="roll-options-discreet"
          className={cn(
            'flex items-center justify-between gap-3 rounded-card-sm border px-3 py-2 text-left transition-colors duration-200 ease-base',
            discreet
              ? 'border-gold-bright bg-gold-bright/10 text-gold-bright'
              : 'border-white-8 bg-white/[0.03] text-text-secondary hover:border-gold-dim',
          )}
        >
          <span className="font-title text-[10px] font-bold uppercase tracking-[0.16em]">
            {t('dice.options.discreet')}
          </span>
          <span aria-hidden className="font-display text-[14px]">
            {discreet ? '◆' : '◇'}
          </span>
        </button>

        {(['advantage', 'normal', 'disadvantage'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => pick(mode)}
            data-testid={`roll-options-${mode}`}
            className="rounded-pill border border-white-8 bg-white/[0.04] px-5 py-2 font-title text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary transition-colors duration-200 ease-base hover:border-gold-bright hover:text-gold-bright"
          >
            {t(
              mode === 'advantage'
                ? 'sheet.essence.advantage'
                : mode === 'normal'
                  ? 'sheet.essence.normal'
                  : 'sheet.essence.disadvantage',
            )}
          </button>
        ))}

        {/* Dépenser l'inspiration IMPOSE l'avantage : le dire évite de croire
            qu'on peut cumuler « inspiration » et « désavantage ». */}
        {useInspiration && (
          <p className="text-center font-serif text-[11px] italic text-text-faint">
            {t('dice.options.inspirationNote')}
          </p>
        )}

        {discreet && (
          <p className="text-center font-serif text-[11px] italic text-text-faint">
            {t('dice.options.discreetNote')}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Le jet ordinaire : ni avantage, ni inspiration dépensée, ni bonus. C'est ce
 * que produit un tap simple, par opposition à l'appui long qui ouvre le menu.
 */
export const NORMAL_ROLL: RollOptions = {
  advantage: 'normal',
  useInspiration: false,
  bonus: 0,
  discreet: false,
};
