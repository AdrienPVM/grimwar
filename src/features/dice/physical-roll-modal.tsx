import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/shared/components/button';
import { cn } from '@/shared/lib/cn';
import { applyKeep } from '@/shared/lib/dice/roller';
import type { DiceTerm } from '@/shared/lib/dice/types';
import {
  resolvePhysicalRoll,
  useUiModalsStore,
  type PhysicalRollSpec,
} from '@/shared/lib/slices/ui-modals-slice';

/**
 * `<PhysicalRollModal />` — plan 12.5.
 *
 * Affiche un prompt par dé à lancer IRL. Le joueur saisit la face brute lue
 * sur ses dés. L'app valide la plage `1..sides`, calcule le total live (en
 * gardant `kh`/`kl` pour l'avantage/désavantage), signale crit/fumble visuel.
 *
 * Deux issues :
 *   - **Valider** → résolution `{ rawFaces }` ; le pivot continue le flow.
 *   - **Passer** → résolution `null` ; le pivot abandonne le jet (aucun toast,
 *     aucun log, aucun patch — c'est un chemin intentionnel et non-erreur). Le
 *     wording « Passer » est non-négociable (cf. plan 12.5 step 7).
 *
 * Esc = Passer. Focus initial sur le premier input (a11y).
 *
 * Le composant intérieur `PhysicalRollDialog` est remonté à chaque nouveau
 * `spec` (via `key`) pour réinitialiser l'état (`faces`, focus, etc.) sans
 * effets dépendants. C'est volontaire — pas de fuite d'état entre deux jets
 * consécutifs.
 */
export function PhysicalRollModal(): JSX.Element | null {
  const pending = useUiModalsStore((s) => s.pendingPhysicalRoll);
  if (!pending) return null;
  return <PhysicalRollDialog key={pending.spec.label + pending.spec.dice.length} spec={pending.spec} />;
}

interface DialogProps {
  spec: PhysicalRollSpec;
}

function PhysicalRollDialog({ spec }: DialogProps): JSX.Element {
  const dieSlots = useMemo<DieSlot[]>(() => flattenDice(spec.dice), [spec.dice]);
  const [faces, setFaces] = useState<(number | null)[]>(() => dieSlots.map(() => null));
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        resolvePhysicalRoll(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const outcome = useMemo(
    () => computeOutcome(spec.dice, dieSlots, faces, spec.modifier),
    [spec.dice, spec.modifier, dieSlots, faces],
  );

  const allValid = faces.every(
    (face, idx) =>
      face !== null && Number.isInteger(face) && face >= 1 && face <= dieSlots[idx]!.sides,
  );

  function setFace(idx: number, raw: string): void {
    setFaces((prev) => {
      const next = [...prev];
      if (raw === '') {
        next[idx] = null;
      } else {
        const parsed = Number.parseInt(raw, 10);
        next[idx] = Number.isNaN(parsed) ? null : parsed;
      }
      return next;
    });
  }

  function validate(): void {
    if (!allValid) return;
    const rawFaces = faces.filter((f): f is number => f !== null);
    resolvePhysicalRoll({ rawFaces });
  }

  function pass(): void {
    resolvePhysicalRoll(null);
  }

  const { total, keptFlags, crit, fumble } = outcome;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="physical-roll-title"
      className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/85 px-4 py-6 backdrop-blur-xl sm:items-center"
    >
      <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-card border border-soft bg-glass shadow-card-lg">
        <header className="border-b border-white-8 px-6 py-4">
          <p className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
            Mode physique — saisis tes dés
          </p>
          <h2
            id="physical-roll-title"
            className="mt-1 font-display text-[22px] font-black leading-tight tracking-[-0.02em] text-gold-bright"
          >
            {spec.label}
          </h2>
          <p className="mt-1 font-serif text-body-sm italic text-text-secondary">
            Lance {describeDice(spec.dice, spec.modifier)}
            {spec.advantage === 'advantage' ? ' · avec avantage' : ''}
            {spec.advantage === 'disadvantage' ? ' · avec désavantage' : ''}
          </p>
        </header>

        <div className="flex flex-col gap-3 px-6 py-5">
          {dieSlots.map((slot, idx) => {
            const face = faces[idx] ?? null;
            const outOfRange = face !== null && (face < 1 || face > slot.sides);
            const kept = keptFlags[idx];
            return (
              <label
                key={`die-${idx}`}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-card-sm border px-3 py-2',
                  outOfRange ? 'border-crimson/70 bg-crimson/10' : 'border-white-8 bg-ink/30',
                  kept && !outOfRange && 'border-gold-bright/60 bg-gold-bright/[0.06]',
                )}
              >
                <span className="font-title text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary">
                  d{slot.sides}
                  {countForTerm(spec.dice, slot.termIndex) > 1
                    ? ` · ${slot.indexInTerm + 1}`
                    : ''}
                  {kept && (
                    <span className="ml-2 inline-flex items-center rounded-full border border-gold-dim px-1.5 py-0.5 text-[8px] tracking-[0.1em] text-gold-bright">
                      Gardé
                    </span>
                  )}
                </span>
                <input
                  ref={idx === 0 ? firstInputRef : undefined}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={slot.sides}
                  value={face ?? ''}
                  onChange={(e) => setFace(idx, e.target.value)}
                  aria-label={`Face d${slot.sides} numéro ${idx + 1}`}
                  className={cn(
                    'w-20 rounded-card-sm border border-white-8 bg-ink/40 px-2 py-1.5 text-center font-display text-[20px] font-bold tabular-nums focus:border-gold-dim focus:outline-none',
                    outOfRange ? 'text-crimson' : 'text-gold-bright',
                  )}
                />
              </label>
            );
          })}
        </div>

        <div className="border-t border-white-8 bg-ink/20 px-6 py-3">
          <p className="flex items-baseline justify-between font-title text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
            <span>Total</span>
            <span
              className={cn(
                'font-display text-[32px] font-black tabular-nums tracking-[-0.02em]',
                crit ? 'text-gold-bright' : fumble ? 'text-crimson' : 'text-text',
              )}
            >
              {allValid ? total : '—'}
            </span>
          </p>
          {(crit || fumble) && (
            <p
              className={cn(
                'mt-1 text-right font-title text-[10px] font-bold uppercase tracking-[0.2em]',
                crit ? 'text-gold-bright' : 'text-crimson',
              )}
            >
              {crit ? 'Réussite critique' : 'Échec critique'}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-white-8 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={pass}>
            Passer
          </Button>
          <Button variant="primary" size="sm" onClick={validate} disabled={!allValid}>
            Valider
          </Button>
        </footer>
      </div>
    </div>
  );
}

interface DieSlot {
  /** Index du terme parent dans `spec.dice`. */
  termIndex: number;
  /** Index du dé dans son terme (0..count-1). */
  indexInTerm: number;
  sides: number;
}

function flattenDice(dice: DiceTerm[]): DieSlot[] {
  const slots: DieSlot[] = [];
  dice.forEach((term, termIndex) => {
    for (let i = 0; i < term.count; i += 1) {
      slots.push({ termIndex, indexInTerm: i, sides: term.sides });
    }
  });
  return slots;
}

function countForTerm(dice: DiceTerm[], termIndex: number): number {
  return dice[termIndex]?.count ?? 1;
}

interface Outcome {
  total: number;
  /** Pour chaque slot, indique si la face est gardée après kh/kl. */
  keptFlags: boolean[];
  crit: boolean;
  fumble: boolean;
}

function computeOutcome(
  dice: DiceTerm[],
  slots: DieSlot[],
  faces: (number | null)[],
  modifier: number,
): Outcome {
  const keptFlags = slots.map(() => false);
  let sum = 0;
  let crit = false;
  let fumble = false;

  dice.forEach((term, termIndex) => {
    const slotIndices: number[] = [];
    const slotFaces: number[] = [];
    slots.forEach((slot, idx) => {
      if (slot.termIndex !== termIndex) return;
      const face = faces[idx];
      if (face === null || face === undefined || face < 1 || face > slot.sides) return;
      slotIndices.push(idx);
      slotFaces.push(face);
    });
    if (slotFaces.length !== term.count) return;
    const kept = applyKeep(slotFaces, term);
    // Marque comme « gardés » les premiers slots correspondant aux faces kept
    // (un slot pour chaque face conservée, en respectant l'ordre de saisie pour
    // les doublons).
    const remainingKept = [...kept];
    slotIndices.forEach((idx, i) => {
      const face = slotFaces[i]!;
      const pos = remainingKept.indexOf(face);
      if (pos !== -1) {
        keptFlags[idx] = true;
        remainingKept.splice(pos, 1);
      }
    });
    const subtotal = kept.reduce((a, b) => a + b, 0);
    sum += subtotal;

    if (term.sides === 20 && kept.length === 1) {
      const face = kept[0]!;
      if (face === 20) crit = true;
      else if (face === 1) fumble = true;
    }
  });

  return { total: sum + modifier, keptFlags, crit, fumble };
}

function describeDice(dice: DiceTerm[], modifier: number): string {
  const parts = dice.map((t) => `${t.count}d${t.sides}`);
  let str = parts.join(' + ');
  if (modifier > 0) str += ` + ${modifier}`;
  else if (modifier < 0) str += ` − ${Math.abs(modifier)}`;
  return str;
}
