import { useCallback, useState } from 'react';

import { GlassPanel } from '@/shared/components/glass-panel';
import { Tooltip } from '@/shared/components/tooltip';
import { cn } from '@/shared/lib/cn';
import { logSecretRoll } from '@/shared/lib/event-logger';
import { t, type StringKey } from '@/shared/lib/i18n';

interface SecretRollState {
  /** Total après modificateur. */
  total: number;
  /** Face brute du d20 (1-20). Permet de signaler nat 20 / nat 1. */
  face: number;
  /** Modificateur appliqué (signé). */
  modifier: number;
  /** Ce sur quoi portait le jet (« Perception du garde »), ou `null`. */
  label: string | null;
  /** `true` une fois le jet re-journalisé en visibilité `all`. */
  revealed: boolean;
}

interface SecretRollButtonProps {
  /**
   * Campagne où journaliser le jet (kind `dm-secret-roll`, visibilité `dm`).
   * Absente ⇒ le jet reste purement local, comme avant : le composant est aussi
   * monté sur `/dm`, hors de toute campagne.
   */
  campaignId?: string;
}

/** Longueur max du champ libre « à propos de quoi ? ». */
const LABEL_MAX = 80;

const ADV_LABEL: Record<'normal' | 'advantage' | 'disadvantage', StringKey> = {
  normal: 'dm.secretRoll.normal',
  advantage: 'dm.secretRoll.advantage',
  disadvantage: 'dm.secretRoll.disadvantage',
};

const ADV_TIP: Record<'normal' | 'advantage' | 'disadvantage', StringKey> = {
  normal: 'dm.tip.advNormal',
  advantage: 'dm.tip.advAdvantage',
  disadvantage: 'dm.tip.advDisadvantage',
};

/**
 * Outil DM — jet de d20 secret.
 *
 * Journalisé en `dm-secret-roll` (visibilité `dm`) quand une `campaignId` est
 * fournie — M10 de l'audit de malléabilité. Le kind, sa doc et TOUT le côté
 * lecteur (`event-line.ts`) existaient déjà ; seul l'écrivain manquait, et le
 * jet vivait dans un `useState` plafonné à cinq entrées, perdu au démontage :
 * un MJ ne pouvait pas retrouver dix minutes plus tard ce qu'il avait lancé
 * derrière son paravent.
 *
 * « Révéler » RE-JOURNALISE le même jet en visibilité `all` plutôt que de
 * modifier l'event d'origine : les events sont immuables côté rules (`allow
 * update: if false`), et le récit garde ainsi trace des deux temps — le MJ a
 * lancé en secret, puis a montré.
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
export function SecretRollButton({ campaignId }: SecretRollButtonProps = {}): JSX.Element {
  const [modifier, setModifier] = useState<number>(0);
  const [label, setLabel] = useState<string>('');
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
    const rollLabel = label.trim() === '' ? null : label.trim();
    setHistory((prev) =>
      [{ total, face, modifier, label: rollLabel, revealed: false }, ...prev].slice(0, 5),
    );
    // Best-effort : un échec de journalisation ne doit pas gâcher le jet, qui
    // reste affiché à l'écran du MJ.
    if (campaignId) {
      void logSecretRoll(campaignId, {
        label: rollLabel,
        face,
        modifier,
        total,
        advantage,
      });
    }
  }, [advantage, campaignId, label, modifier]);

  const last = history[0] ?? null;

  const handleReveal = useCallback(() => {
    if (!campaignId || !last || last.revealed) return;
    void logSecretRoll(campaignId, {
      label: last.label,
      face: last.face,
      modifier: last.modifier,
      total: last.total,
      advantage,
      visibility: 'all',
    });
    setHistory((prev) => prev.map((r, i) => (i === 0 ? { ...r, revealed: true } : r)));
  }, [advantage, campaignId, last]);

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

      {/* Sujet du jet — ce qui rend l'entrée de journal relisible plus tard. */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="dm-secret-label"
          className="font-title text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary"
        >
          {t('dm.secretRoll.aboutLabel')}
        </label>
        <input
          id="dm-secret-label"
          type="text"
          value={label}
          maxLength={LABEL_MAX}
          placeholder={t('dm.secretRoll.aboutPlaceholder')}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded-card-sm border border-white-8 bg-ink/40 px-3 py-1.5 font-serif text-body-sm text-text outline-none transition-colors duration-200 ease-base focus:border-gold"
        />
      </div>

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
      </div>

      {/* Mode du jet — rangée dédiée pleine largeur : les 3 boutons se partagent
          la largeur (flex-1) pour ne jamais déborder du panneau, même sur une
          colonne mobile étroite où « Désavantage » sortait du bloc. */}
      <div
        role="radiogroup"
        aria-label={t('dm.secretRoll.advantageAria')}
        className="flex gap-1.5"
      >
        {(['normal', 'advantage', 'disadvantage'] as const).map((mode) => {
          const isActive = mode === advantage;
          return (
            <Tooltip key={mode} label={t(ADV_TIP[mode])} placement="bottom" decorative className="flex-1">
              <button
                role="radio"
                aria-checked={isActive}
                type="button"
                onClick={() => setAdvantage(mode)}
                className={cn(
                  'w-full rounded-pill border px-2 py-1.5 text-center font-title text-[9px] font-bold uppercase tracking-[0.14em] transition-colors duration-150',
                  isActive
                    ? 'border-gold bg-gold/15 text-gold-bright'
                    : 'border-white-8 bg-white/[0.03] text-text-tertiary hover:border-soft hover:text-text-secondary',
                )}
              >
                {t(ADV_LABEL[mode])}
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Bouton roll */}
      <Tooltip label={t('dm.tip.secretRoll')} decorative>
        <button
          type="button"
          onClick={handleRoll}
          className="w-full rounded-card-sm bg-gradient-to-b from-gold-bright to-gold px-4 py-3 font-title text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink shadow-[0_4px_14px_rgba(220,184,108,0.35)] transition-all hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(220,184,108,0.45)] active:scale-95"
        >
          {t('dm.secretRoll.button')}
        </button>
      </Tooltip>

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
          {/* Révéler : re-log en visibilité `all`. Hors campagne, rien à
              révéler — le jet n'a jamais été journalisé. */}
          {campaignId ? (
            <div className="mt-3 flex justify-end">
              <Tooltip label={t('dm.tip.revealSecretRoll')} decorative>
                <button
                  type="button"
                  onClick={handleReveal}
                  disabled={last.revealed}
                  className="rounded-pill border border-white-8 bg-white/[0.03] px-3 py-1 font-title text-[9px] font-bold uppercase tracking-[0.14em] text-text-secondary transition-colors duration-200 ease-base hover:border-gold-bright hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {last.revealed
                    ? t('dm.secretRoll.revealed')
                    : t('dm.secretRoll.reveal')}
                </button>
              </Tooltip>
            </div>
          ) : null}
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
