import { useState } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useLongPress } from '@/shared/hooks/use-long-press';
import { cn } from '@/shared/lib/cn';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';
import { applyDamage, applyHeal } from './hp-combat';
import { NumberPad } from './number-pad';

interface HpMegaCardProps {
  character: Character;
  /** Désactive les contrôles lorsque la fiche est read-only (status:'dead'). */
  readOnly: boolean;
}

/**
 * Carte HP centrale du Combat. Tap court "+"/"−" applique ±1, long-press
 * ouvre un pad numérique pour saisir un montant précis (5, 12, etc.).
 * Le passage à 0 PV déclenche automatiquement la modale Death Saves (effet
 * géré par CombatMode via `hp.current === 0` plutôt que par un callback
 * couplant les deux composants).
 */
export function HpMegaCard({ character, readOnly }: HpMegaCardProps): JSX.Element {
  const { updateCharacter } = useUpdateCharacter(character.id);
  const [padIntent, setPadIntent] = useState<'damage' | 'heal' | null>(null);

  const hp = character.hp;
  const ratio = hp.max > 0 ? Math.max(0, Math.min(1, hp.current / hp.max)) : 0;
  const widthPct = `${Math.round(ratio * 100)}%`;
  const fillTone =
    ratio === 0
      ? 'from-crimson to-[#7a2828]'
      : ratio < 0.25
        ? 'from-crimson to-[#a83d3d]'
        : ratio < 0.6
          ? 'from-gold-bright to-amethyst'
          : 'from-gold-bright to-gold';

  async function applyDelta(delta: number): Promise<void> {
    if (readOnly || delta === 0) return;
    if (delta < 0) {
      const result = applyDamage(hp, -delta);
      await updateCharacter({ hp: result.hp });
      showToast({
        kind: 'damage',
        title: 'Dégâts subis',
        big: `−${-delta}`,
        sub: `${result.hp.current}/${hp.max} PV`,
      });
      if (result.triggeredMassiveDeath) {
        showToast({
          kind: 'grim',
          title: 'Mort foudroyante',
          big: '✦',
          sub: 'Dégâts massifs — pas de jet de mort',
          durationMs: 3000,
        });
      }
    } else {
      const next = applyHeal(hp, delta);
      await updateCharacter({ hp: next });
      showToast({
        kind: 'heal',
        title: 'Soin',
        big: `+${delta}`,
        sub: `${next.current}/${hp.max} PV`,
      });
    }
  }

  const minusHandlers = useLongPress(
    () => void applyDelta(-1),
    () => !readOnly && setPadIntent('damage'),
  );
  const plusHandlers = useLongPress(
    () => void applyDelta(1),
    () => !readOnly && setPadIntent('heal'),
  );

  const padMaxApplicable = padIntent === 'heal' ? hp.max - hp.current : hp.current;

  return (
    <>
      <Card className="relative overflow-hidden">
        <CardHeader>
          <h3>Vitalité</h3>
        </CardHeader>

        {/* Fill bar en fond */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 bottom-6 top-[64px] -z-0 rounded-card-sm border border-white-8 bg-bg-2/40"
        >
          <div
            className={cn(
              'h-full rounded-card-sm bg-gradient-to-r opacity-30 transition-[width] duration-500 ease-base',
              fillTone,
            )}
            style={{ width: widthPct }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-4">
          {hp.temp > 0 && (
            <div className="font-title text-[10px] font-bold uppercase tracking-[0.22em] text-amethyst">
              PV temp. <span className="font-display text-[16px] tracking-[-0.02em]">{hp.temp}</span>
            </div>
          )}
          <div className="flex items-baseline gap-3">
            <span
              className={cn(
                'font-display text-[clamp(48px,12vw,80px)] font-black leading-none tracking-[-0.04em]',
                ratio === 0 ? 'text-crimson' : 'text-gold-bright',
                '[text-shadow:0_0_32px_rgba(220,184,108,0.4)]',
              )}
            >
              {hp.current}
            </span>
            <span className="font-serif text-[20px] italic text-text-tertiary">/ {hp.max}</span>
          </div>

          <div className="flex w-full max-w-[260px] items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Subir 1 dégât (long-press pour saisir un montant)"
              disabled={readOnly}
              className="h-14 flex-1 rounded-card-sm border border-crimson/40 bg-crimson/10 font-display text-[26px] font-black text-crimson transition-all hover:border-crimson hover:bg-crimson/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              {...minusHandlers}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Soigner de 1 PV (long-press pour saisir un montant)"
              disabled={readOnly}
              className="h-14 flex-1 rounded-card-sm border border-teal/40 bg-teal/10 font-display text-[26px] font-black text-teal transition-all hover:border-teal hover:bg-teal/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              {...plusHandlers}
            >
              +
            </button>
          </div>
          <p className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-faint">
            Tap = ±1 · Long-press = pad numérique
          </p>
        </div>
      </Card>

      {padIntent !== null && (
        <NumberPad
          intent={padIntent}
          max={hp.max}
          maxApplicable={padMaxApplicable}
          onCommit={(amount) => {
            setPadIntent(null);
            const signed = padIntent === 'heal' ? amount : -amount;
            void applyDelta(signed);
          }}
          onCancel={() => setPadIntent(null)}
        />
      )}
    </>
  );
}
