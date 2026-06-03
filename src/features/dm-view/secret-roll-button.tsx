import { useCallback, useState } from 'react';

import { GlassPanel } from '@/shared/components/glass-panel';
import { cn } from '@/shared/lib/cn';
import { t, type StringKey } from '@/shared/lib/i18n';

interface SecretRollState {
  /** Total après modificateur. */
  total: number;
  /** Face brute du d20 (1-20). Permet de signaler nat 20 / nat 1. */
  face: number;
  /** Modificateur appliqué (signé). */
  modifier: number;
}

const ADV_LABEL: Record<'normal' | 'advantage' | 'disadvantage', StringKey> = {
  normal: 'dm.secretRoll.normal',
  advantage: 'dm.secretRoll.advantage',
  disadvantage: 'dm.secretRoll.disadvantage',
};

/**
 * Outil DM — jet de d20 secret (sans toast, sans log).
 *
 * Pour S1 : pas de système d'événements visibility:'dm' (plan 22). Le jet
 * reste local au composant — l'historique récente s'affiche en bas et est
 * tronquée aux 5 derniers. Quand plan 22 (event-log) livrera, ce composant
 * basculera vers `logEvent({ type: 'dm-secret-roll', visibility: 'dm' })`
 * et purgera son state local.
 *
 * Mécanique : d20 + modificateur signé. Toggle Avantage / Désavantage qui
 * tire 2 d20 et prend max/min. Le 20 nat ou 1 nat est signalé visuellement
 * (chip doré ou crimson) — utile pour le DM qui décide d'un crit secret.
 *
 * On n'utilise PAS `useDice()` ici : ce hook requiert un `character` ctx
 * (inspiration / exhaust), or un secret-roll DM n'est lié à aucun PJ.
 * Roll inline d20 = quelques lignes ; pas de duplication problématique avec
 * le moteur principal (qui couvre les jets liés à un perso).
 */
export function SecretRollButton(): JSX.Element {
  const [modifier, setModifier] = useState<number>(0);
  const [advantage, setAdvantage] = useState<'normal' | 'advantage' | 'disadvantage'>('normal');
  const [history, setHistory] = useState<SecretRollState[]>([]);

  const handleRoll = useCallback(() => {
    const d1 = 1 + Math.floor(Math.random() * 20);
    const d2 = 1 + Math.floor(Math.random() * 20);
    const face =
      advantage === 'advantage'
        ? Math.max(d1, d2)
        : advantage === 'disadvantage'
          ? Math.min(d1, d2)
          : d1;
    const total = face + modifier;
    setHistory((prev) => [{ total, face, modifier }, ...prev].slice(0, 5));
  }, [advantage, modifier]);

  const last = history[0] ?? null;

  return (
    <GlassPanel className="flex flex-col gap-3 p-5">
      <header className="flex items-center justify-between">
        <h2 className="font-title text-[11px] font-bold uppercase tracking-[0.22em] text-gold-bright">
          {t('dm.secretRoll.title')}
        </h2>
        <span className="font-serif text-meta italic text-text-tertiary">
          {t('dm.secretRoll.subtitle')}
        </span>
      </header>

      {/* Modificateur */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="dm-secret-mod"
          className="font-title text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary"
        >
          {t('dm.secretRoll.modLabel')}
        </label>
        <input
          id="dm-secret-mod"
          type="number"
          value={modifier}
          onChange={(e) => setModifier(parseInt(e.target.value, 10) || 0)}
          className="w-16 rounded-card-sm border border-white-8 bg-ink/40 px-2 py-1 text-center font-display text-[16px] font-semibold text-gold-bright outline-none focus:border-gold"
          aria-label={t('dm.secretRoll.modLabel')}
        />
        <div role="radiogroup" aria-label={t('dm.secretRoll.advantageAria')} className="ml-auto flex gap-1.5">
          {(['normal', 'advantage', 'disadvantage'] as const).map((mode) => {
            const isActive = mode === advantage;
            return (
              <button
                key={mode}
                role="radio"
                aria-checked={isActive}
                type="button"
                onClick={() => setAdvantage(mode)}
                className={cn(
                  'rounded-pill border px-2.5 py-1 font-title text-[9px] font-bold uppercase tracking-[0.16em] transition-colors duration-150',
                  isActive
                    ? 'border-gold bg-gold/15 text-gold-bright'
                    : 'border-white-8 bg-white/[0.03] text-text-tertiary hover:border-soft hover:text-text-secondary',
                )}
              >
                {t(ADV_LABEL[mode])}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bouton roll */}
      <button
        type="button"
        onClick={handleRoll}
        className="rounded-card-sm bg-gradient-to-b from-gold-bright to-gold px-4 py-3 font-title text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink shadow-[0_4px_14px_rgba(220,184,108,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(220,184,108,0.45)] active:scale-95"
      >
        {t('dm.secretRoll.button')}
      </button>

      {/* Résultat dernier roll */}
      {last && (
        <div className="rounded-card-sm border border-soft bg-bg-2/60 px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="font-title text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
              {t('dm.secretRoll.resultLabel')}
            </span>
            <span
              className={cn(
                'font-display text-[28px] font-extrabold tracking-tight',
                last.face === 20
                  ? 'text-gold-bright drop-shadow-[0_0_12px_var(--gold-glow)]'
                  : last.face === 1
                    ? 'text-crimson'
                    : 'text-text',
              )}
              aria-live="polite"
            >
              {last.total}
            </span>
          </div>
          <p className="mt-1 font-serif text-meta italic text-text-tertiary">
            {t('dm.secretRoll.detail')}: d20={last.face}
            {last.modifier !== 0 && (
              <>
                {' '}
                {last.modifier >= 0 ? '+' : ''}
                {last.modifier}
              </>
            )}
            {last.face === 20 && <> · {t('dm.secretRoll.nat20')}</>}
            {last.face === 1 && <> · {t('dm.secretRoll.nat1')}</>}
          </p>
        </div>
      )}

      {/* Historique court (4 derniers, le 1er est déjà dans la card ci-dessus) */}
      {history.length > 1 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t('dm.secretRoll.historyAria')}>
          {history.slice(1).map((roll, idx) => (
            <li
              key={idx}
              className="inline-flex items-baseline gap-1 rounded-pill border border-white-8 bg-ink/40 px-2.5 py-1 font-serif text-meta text-text-tertiary"
            >
              <span className="font-display text-[12px] text-text">{roll.total}</span>
              <span className="font-title text-[8px] uppercase tracking-[0.16em]">
                ({roll.face})
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}
