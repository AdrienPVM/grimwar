import { useEffect } from 'react';

import { Button } from '@/shared/components/button';
import {
  resolveHitMissGate,
  useUiModalsStore,
  type HitMissGateSpec,
} from '@/shared/lib/slices/ui-modals-slice';

/**
 * `<HitMissGateModal />` — plan 12.5.
 *
 * Gate manuel **Touché / Raté** en mode physique, présenté uniquement quand le
 * d20 d'attaque tombe sur une face neutre (≠ 20, ≠ 1). Sur 20 → auto-Touché +
 * crit. Sur 1 → auto-Raté + fumble. Le seuil CA cible automatique arrive plan
 * 14/24 (quand la cible est connue côté combat tracker DM).
 *
 * Esc = Passer (résolution `null`) — la séquence attaque physique en mode
 * « j'abandonne » est légitime, le pivot ne logge rien.
 */
export function HitMissGateModal(): JSX.Element | null {
  const pending = useUiModalsStore((s) => s.pendingHitMissGate);
  if (!pending) return null;
  return <HitMissDialog spec={pending.spec} />;
}

interface DialogProps {
  spec: HitMissGateSpec;
}

function HitMissDialog({ spec }: DialogProps): JSX.Element {
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        resolveHitMissGate(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hit-miss-title"
      className="fixed inset-0 z-[95] flex items-end justify-center bg-ink/85 px-4 py-6 backdrop-blur-xl sm:items-center"
    >
      <div className="flex w-full max-w-[420px] flex-col overflow-hidden rounded-card border border-soft bg-glass shadow-card-lg">
        <header className="border-b border-white-8 px-6 py-4">
          <p className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
            Mode physique — résolution attaque
          </p>
          <h2
            id="hit-miss-title"
            className="mt-1 font-display text-[20px] font-black tracking-[-0.02em] text-gold-bright"
          >
            {spec.label}
          </h2>
          {spec.hint && (
            <p className="mt-1 font-serif text-body-sm italic text-text-secondary">{spec.hint}</p>
          )}
          <p className="mt-3 font-serif text-body-sm text-text-secondary">
            Ton total dépasse-t-il la CA de la cible&nbsp;?
          </p>
        </header>

        <footer className="flex items-center justify-between gap-3 px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resolveHitMissGate('miss')}
            className="flex-1"
          >
            Raté
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => resolveHitMissGate('hit')}
            className="flex-1"
          >
            Touché
          </Button>
        </footer>
      </div>
    </div>
  );
}
