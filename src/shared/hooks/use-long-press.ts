import { useCallback, useEffect, useRef } from 'react';

interface UseLongPressOptions {
  /** Délai en ms avant que `onLongPress` se déclenche. Défaut 450ms. */
  delayMs?: number;
}

interface LongPressHandlers {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
}

/**
 * Hook tactique : press-hold sur un bouton ou cellule sans dépendances externes.
 * - `onClick` déclenche si le doigt/curseur est relâché AVANT `delayMs`.
 * - `onLongPress` déclenche au délai, et bloque le tap court qui suit (sinon
 *   on tirerait les deux callbacks).
 *
 * Bonus : `oncontextmenu` est suppressé pour éviter le menu natif desktop en
 * cas de long-press sur touchpad/right-click — cohérent avec la sémantique tap.
 */
export function useLongPress(
  onClick: () => void,
  onLongPress: () => void,
  options: UseLongPressOptions = {},
): LongPressHandlers {
  const { delayMs = 450 } = options;
  const timerRef = useRef<number | null>(null);
  const triggeredRef = useRef<boolean>(false);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onPointerDown: (event) => {
      // Ne pas piéger les boutons milieu/droit.
      if (event.button !== undefined && event.button !== 0) return;
      triggeredRef.current = false;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        triggeredRef.current = true;
        onLongPress();
      }, delayMs);
    },
    onPointerUp: () => {
      clearTimer();
      if (!triggeredRef.current) onClick();
    },
    onPointerLeave: () => clearTimer(),
    onPointerCancel: () => clearTimer(),
    onContextMenu: (event) => event.preventDefault(),
  };
}
