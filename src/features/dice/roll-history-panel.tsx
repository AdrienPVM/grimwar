import { useEffect, useState } from 'react';

import { Icon } from '@/shared/components/icon';
import { cn } from '@/shared/lib/cn';
import type { DiceHistoryRow } from '@/shared/lib/dexie-db';

import { readRollHistory } from './persist-history';

interface RollHistoryPanelProps {
  open: boolean;
  characterId: string | undefined;
  onClose: () => void;
}

const HISTORY_LIMIT = 50;

/**
 * Panneau slide-up affichant les 50 derniers jets de l'historique Dexie. Filtre
 * implicite par `characterId` (S1 = un seul PJ par session). Badge `mode` (D/P)
 * — en plan 12 toujours D ; plan 12.5 ajoutera la lecture du badge P pour les
 * jets physiques.
 *
 * Le slot « header » est aussi le foyer du toggle Digital/Physique de plan 12.5
 * (pour qu'il soit accessible sans dépendre du radial FAB plan 11).
 *
 * **Repeat différé** : la spec plan 12 mentionne « Tap a roll → repeat » ; en
 * S1 le tap est un no-op visuel (highlight) — le repeat naturel passera par le
 * radial FAB de plan 11 (« lancer un dé » wedge). Documenté ici en autonomie
 * tactique pour ne pas dupliquer la logique de roll loose-coupled.
 */
export function RollHistoryPanel({
  open,
  characterId,
  onClose,
}: RollHistoryPanelProps): JSX.Element | null {
  const [rows, setRows] = useState<DiceHistoryRow[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void readRollHistory(HISTORY_LIMIT, characterId).then((data) => {
      if (!cancelled) setRows(data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, characterId]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Historique des jets"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/70 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-[460px] flex-col rounded-t-card border-x border-t border-soft bg-glass shadow-card-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          data-slot="dice-history-header"
          className="flex items-center justify-between gap-3 border-b border-white-8 px-5 py-3"
        >
          <div className="flex items-center gap-2">
            <Icon name="i-dice" className="h-4 w-4 text-gold-bright" />
            <h2 className="font-title text-[11px] font-bold uppercase tracking-[0.2em] text-text">
              Historique des jets
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l'historique"
            className="rounded-full border border-white-8 px-3 py-1 font-title text-[10px] uppercase tracking-[0.18em] text-text-tertiary transition-colors hover:border-soft hover:text-gold-bright"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {rows.length === 0 ? (
            <p className="py-6 text-center font-serif text-body-sm italic text-text-tertiary">
              Aucun jet enregistré. Tente une initiative ou un test de
              caractéristique.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {rows.map((row) => (
                <HistoryRow key={row.id} row={row} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

interface HistoryRowProps {
  row: DiceHistoryRow;
}

function HistoryRow({ row }: HistoryRowProps): JSX.Element {
  const badgeLabel = row.mode === 'physical' ? 'P' : 'D';
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-card-sm border border-white-8 bg-white/[0.02] px-3 py-2',
        row.crit && 'border-gold-bright/40 bg-gold-bright/[0.06]',
        row.fumble && 'border-crimson/40 bg-crimson/[0.06]',
      )}
    >
      <ModeBadge label={badgeLabel} crit={row.crit} fumble={row.fumble} />
      <div className="flex-1 min-w-0">
        <div className="truncate font-serif text-body-sm text-text">{row.label}</div>
        <div className="font-ui text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
          {formatTime(row.timestamp)} · {row.rawFaces.join(' / ')}
        </div>
      </div>
      <span
        className={cn(
          'font-display text-[18px] font-black tracking-[-0.02em]',
          row.crit ? 'text-gold-bright' : row.fumble ? 'text-crimson' : 'text-text',
        )}
      >
        {row.total}
      </span>
    </li>
  );
}

function ModeBadge({
  label,
  crit,
  fumble,
}: {
  label: string;
  crit: boolean;
  fumble: boolean;
}): JSX.Element {
  return (
    <span
      aria-label={`Mode ${label === 'P' ? 'physique' : 'digital'}`}
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-full border font-title text-[9px] font-bold uppercase tracking-[0.1em]',
        crit
          ? 'border-gold-bright bg-gold-bright/15 text-gold-bright'
          : fumble
            ? 'border-crimson bg-crimson/15 text-crimson'
            : 'border-white-8 bg-white/[0.04] text-text-tertiary',
      )}
    >
      {label}
    </span>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
