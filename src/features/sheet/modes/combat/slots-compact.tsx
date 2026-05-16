import { Card, CardHeader } from '@/shared/components/card';
import { useLongPress } from '@/shared/hooks/use-long-press';
import { cn } from '@/shared/lib/cn';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

interface SlotsCompactProps {
  character: Character;
  readOnly: boolean;
}

/**
 * Liste verticale des emplacements de sort par niveau. Chaque emplacement
 * actif est représenté par un "rune dot" gold ; un dot vide = consommé.
 *
 * Tap dot = consommer un emplacement (current--).
 * Long-press dot = restaurer un emplacement (current++).
 *
 * Si le PJ n'a aucun spellSlots configuré (non-spellcaster), on n'affiche pas
 * la carte du tout — le mode Combat décide via `Object.keys(spellSlots).length`.
 */
export function SlotsCompact({ character, readOnly }: SlotsCompactProps): JSX.Element {
  const { updateCharacter } = useUpdateCharacter(character.id);
  const slots = character.spellSlots;
  const levels = Object.keys(slots)
    .map((lvl) => Number.parseInt(lvl, 10))
    .filter((lvl) => Number.isFinite(lvl) && lvl >= 1 && lvl <= 9)
    .sort((a, b) => a - b);

  async function setSlotCurrent(level: number, current: number): Promise<void> {
    if (readOnly) return;
    const slot = slots[String(level)];
    if (!slot) return;
    const next = Math.max(0, Math.min(slot.max, current));
    if (next === slot.current) return;
    await updateCharacter({
      spellSlots: { ...slots, [String(level)]: { current: next, max: slot.max } },
    });
    showToast({
      kind: 'info',
      title: `Emplacement niv. ${level}`,
      sub: `${next}/${slot.max}`,
    });
  }

  return (
    <Card>
      <CardHeader>
        <h3>Sortilèges</h3>
      </CardHeader>
      <div className="flex flex-col gap-2">
        {levels.map((level) => {
          const slot = slots[String(level)]!;
          return (
            <SlotRow
              key={level}
              level={level}
              current={slot.current}
              max={slot.max}
              readOnly={readOnly}
              onConsume={() => void setSlotCurrent(level, slot.current - 1)}
              onRestore={() => void setSlotCurrent(level, slot.current + 1)}
            />
          );
        })}
      </div>
    </Card>
  );
}

interface SlotRowProps {
  level: number;
  current: number;
  max: number;
  readOnly: boolean;
  onConsume: () => void;
  onRestore: () => void;
}

function SlotRow({
  level,
  current,
  max,
  readOnly,
  onConsume,
  onRestore,
}: SlotRowProps): JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-card-sm border border-white-8 bg-white/[0.02] px-3 py-2">
      <span className="min-w-[60px] font-title text-[9px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
        Niv. {level}
      </span>
      <div className="flex flex-1 flex-wrap gap-1.5">
        {Array.from({ length: max }).map((_, i) => (
          <SlotDot
            key={i}
            filled={i < current}
            readOnly={readOnly}
            onConsume={onConsume}
            onRestore={onRestore}
          />
        ))}
      </div>
      <span className="font-display text-[12px] font-bold tracking-[-0.02em] text-text-secondary">
        {current}/{max}
      </span>
    </div>
  );
}

interface SlotDotProps {
  filled: boolean;
  readOnly: boolean;
  onConsume: () => void;
  onRestore: () => void;
}

function SlotDot({ filled, readOnly, onConsume, onRestore }: SlotDotProps): JSX.Element {
  const handlers = useLongPress(
    () => !readOnly && filled && onConsume(),
    () => !readOnly && onRestore(),
  );
  return (
    <button
      type="button"
      disabled={readOnly}
      aria-label={filled ? 'Consommer un emplacement (long-press pour restaurer)' : 'Emplacement consommé (long-press pour restaurer)'}
      className={cn(
        'h-4 w-4 rounded-full border-[1.5px] transition-all',
        filled
          ? 'border-gold-bright bg-gradient-to-br from-gold-bright to-gold shadow-[0_0_10px_var(--gold-glow)]'
          : 'border-gold-dim bg-transparent',
        'hover:scale-110 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40',
      )}
      {...handlers}
    />
  );
}
