import { useState } from 'react';

import { Button } from '@/shared/components/button';
import { cn } from '@/shared/lib/cn';

interface NumberPadProps {
  /** Mode du tap initial — détermine la couleur du badge "−" ou "+" + le label. */
  intent: 'damage' | 'heal';
  /** Plafond utile pour le bouton "Plein" (intent === 'heal') et le clamp d'affichage. */
  max: number;
  /** Plafond effectif côté soin (max - hp.current) ; côté dégâts on accepte tout. */
  maxApplicable: number;
  onCommit: (amount: number) => void;
  onCancel: () => void;
}

const PAD_BUTTONS: readonly (string | 'back')[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', 'back'];

/**
 * Pad numérique modal pour saisir un montant arbitraire de damage ou heal.
 * Sobre : pas de masque overlay full-screen (sinon ça noie la fiche),
 * mais une carte glass centrée avec backdrop semi-transparent. Bouton "Plein"
 * en heal court-circuite la saisie (heal up to max).
 */
export function NumberPad({
  intent,
  max,
  maxApplicable,
  onCommit,
  onCancel,
}: NumberPadProps): JSX.Element {
  const [value, setValue] = useState<string>('');
  const numeric = Math.max(0, Number.parseInt(value, 10) || 0);
  const clamped = Math.min(numeric, intent === 'heal' ? Math.max(0, maxApplicable) : 9999);

  function push(token: string | 'back'): void {
    setValue((prev) => {
      if (token === 'back') return prev.slice(0, -1);
      if (prev.length >= 4) return prev;
      if (prev === '' && token === '0') return prev;
      return prev + token;
    });
  }

  const isHeal = intent === 'heal';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="number-pad-title"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/80 px-4 py-6 backdrop-blur-xl"
    >
      <div className="w-full max-w-[340px] rounded-card border border-soft bg-glass p-6 shadow-card-lg">
        <h2
          id="number-pad-title"
          className={cn(
            'mb-3 text-center font-title text-meta font-bold uppercase tracking-[0.22em]',
            isHeal ? 'text-teal' : 'text-crimson',
          )}
        >
          {isHeal ? 'Soigner' : 'Dégâts'}
        </h2>
        <div
          className={cn(
            'mb-4 flex h-[64px] items-center justify-center rounded-card-sm border bg-bg-2/60 font-display text-[40px] font-bold tracking-[-0.03em]',
            isHeal
              ? 'border-teal/40 text-teal'
              : 'border-crimson/40 text-crimson',
          )}
          aria-live="polite"
        >
          {clamped}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PAD_BUTTONS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => push(b)}
              className="rounded-card-sm border border-white-8 bg-white/[0.04] py-3 font-display text-[20px] font-bold text-text transition-colors hover:border-soft hover:text-gold-bright active:scale-95"
            >
              {b === 'back' ? '⌫' : b}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          {isHeal && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onCommit(Math.max(0, maxApplicable))}
              className="flex-1"
            >
              Plein ({max})
            </Button>
          )}
          <Button
            variant={isHeal ? 'primary' : 'danger'}
            size="sm"
            onClick={() => onCommit(clamped)}
            disabled={clamped <= 0}
            className="flex-1"
          >
            {isHeal ? 'Soigner' : 'Appliquer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
