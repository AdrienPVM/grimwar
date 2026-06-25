import { useEffect, useState, type JSX } from 'react';
import { createPortal } from 'react-dom';

import { useCastFxStore } from '@/shared/lib/slices/cast-fx-slice';

/**
 * Plan 38 — Overlay d'animation de sceau de sort.
 *
 * Singleton global monté à la racine (App.tsx), s'abonne au `cast-fx-slice`.
 * À chaque incantation, trace le sceau du sort par-dessus l'écran : un cœur de
 * traits dorés (gold-bright) tracé via `stroke-dashoffset`, un halo flou
 * école-coloré, et un éclat d'aurore derrière. L'overlay est **décoratif**
 * (`aria-hidden`, `pointer-events-none`) — l'info utile passe déjà par le toast.
 *
 * Empilement (`z-[85]`) : au-dessus de la modale de sort (80) pour flamboyer par-
 * dessus la carte, mais sous la modale de jet physique (90), le gate (95) et les
 * toasts (100) — le sceau n'obscurcit jamais une saisie interactive.
 *
 * Mouvement réduit (`prefers-reduced-motion`) : aucun tracé ni éclat animé — le
 * sceau s'affiche complet ~0,7 s puis se retire (CLAUDE.md > transitions).
 */

/** Trait principal : or vif (token gold-bright). */
const CORE_COLOR = '#fde9b4';
const LIFE_MS = 2600;
const REDUCED_MS = 700;

export function SpellSigilOverlay(): JSX.Element | null {
  const sigil = useCastFxStore((s) => s.sigil);
  const nonce = useCastFxStore((s) => s.nonce);
  const clear = useCastFxStore((s) => s.clear);

  // Lu une fois : prefers-reduced-motion change rarement en session. Lecture
  // paresseuse (pas d'effet de souscription) — suffisant pour décider du rendu.
  const [reduced] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  // Retrait auto. Dépend de `nonce` pour relancer le timer même si le même sort
  // est relancé (la référence `sigil` est mémoïsée par le générateur).
  useEffect(() => {
    if (!sigil) return;
    const id = window.setTimeout(() => clear(), reduced ? REDUCED_MS : LIFE_MS);
    return () => window.clearTimeout(id);
  }, [sigil, nonce, reduced, clear]);

  if (!sigil || typeof document === 'undefined') return null;

  const { color, viewBox, paths } = sigil;

  return createPortal(
    <div
      aria-hidden="true"
      data-testid="spell-sigil-overlay"
      data-school={sigil.school}
      className="pointer-events-none fixed inset-0 z-[85] flex items-center justify-center"
    >
      <div key={nonce} className={reduced ? '' : 'animate-sigil-life'}>
        <div className="relative flex items-center justify-center">
          {/* Éclat d'aurore école-coloré, derrière le sceau. */}
          <div
            data-testid="sigil-flare"
            className={
              reduced
                ? 'absolute h-[70vmin] w-[70vmin] max-h-[420px] max-w-[420px] rounded-full opacity-25 blur-[60px]'
                : 'absolute h-[70vmin] w-[70vmin] max-h-[420px] max-w-[420px] rounded-full opacity-0 blur-[60px] animate-sigil-flare'
            }
            style={{ backgroundColor: color }}
          />

          <svg
            viewBox={viewBox}
            className="relative h-[58vmin] w-[58vmin] max-h-[360px] max-w-[360px]"
            fill="none"
          >
            {/* Halo flou, école-coloré. */}
            <g style={{ filter: 'blur(1.6px)' }} opacity={0.5}>
              {paths.map((p, i) => (
                <path
                  key={`halo-${i}`}
                  d={p.d}
                  stroke={color}
                  strokeWidth={p.width * 2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  className={reduced ? undefined : 'animate-trace-sigil'}
                  style={
                    reduced
                      ? { strokeDasharray: 1, strokeDashoffset: 0 }
                      : { strokeDasharray: 1, strokeDashoffset: 1, animationDelay: `${p.delay}ms` }
                  }
                />
              ))}
            </g>

            {/* Cœur doré net. */}
            <g style={{ filter: `drop-shadow(0 0 3px ${color})` }}>
              {paths.map((p, i) => (
                <path
                  key={`core-${i}`}
                  d={p.d}
                  stroke={CORE_COLOR}
                  strokeWidth={p.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  className={reduced ? undefined : 'animate-trace-sigil'}
                  style={
                    reduced
                      ? { strokeDasharray: 1, strokeDashoffset: 0 }
                      : { strokeDasharray: 1, strokeDashoffset: 1, animationDelay: `${p.delay}ms` }
                  }
                />
              ))}
            </g>
          </svg>
        </div>
      </div>
    </div>,
    document.body,
  );
}
