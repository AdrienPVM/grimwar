import { useEffect, type JSX } from 'react';

import { useDevicePrefsStore } from '@/shared/lib/slices/device-prefs-slice';
import { useDiceTrayStore } from '@/shared/lib/slices/dice-tray-slice';

import { Die3D, radiusForCount } from './die-3d';

/**
 * Plateau de dés — couche globale montée une fois dans `<App />`.
 *
 * Les dés tombent AU-DESSUS du toast, jamais dessus : on regarde d'abord le
 * geste, on lit ensuite le résultat. La couche n'intercepte aucun clic — un
 * joueur qui enchaîne deux jets ne doit jamais taper dans un dé en vol.
 *
 * Le nombre de dés affichés est plafonné. Une boule de feu au niveau 8, c'est
 * 8d6 ; certaines formules maison montent bien plus haut, et cinquante solides
 * en composition 3D transforment un téléphone en radiateur pour un gain visuel
 * nul (on ne lit plus rien). Au-delà du plafond, le surplus est compté en
 * toutes lettres — ce qui est honnête, alors qu'une troncature muette
 * laisserait croire que le jet portait moins de dés.
 */

/** Au-delà, on n'y voit plus rien et le rendu coûte cher. */
const MAX_RENDERED_DICE = 12;
/** Durée de vie du plateau — calée sur la fin de chute + un temps de lecture. */
const TRAY_LIFETIME_MS = 2200;

export function DiceTrayOverlay(): JSX.Element | null {
  const current = useDiceTrayStore((s) => s.current);
  const clearRoll = useDiceTrayStore((s) => s.clearRoll);
  const enabled = useDevicePrefsStore((s) => s.dice3d);

  const rollId = current?.id ?? null;
  useEffect(() => {
    if (rollId === null) return undefined;
    const timer = window.setTimeout(() => clearRoll(rollId), TRAY_LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [rollId, clearRoll]);

  if (!enabled || !current) return null;

  const shown = current.dice.slice(0, MAX_RENDERED_DICE);
  const hidden = current.dice.length - shown.length;
  const radius = radiusForCount(shown.length);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[19rem] z-[95] flex flex-col items-center gap-2 px-4"
      data-testid="dice-tray"
    >
      <div
        className="dice-tray-life flex flex-wrap items-center justify-center gap-4"
        // La perspective vit sur le CONTENEUR : posée sur chaque dé, chacun
        // aurait son propre point de fuite et le lot paraîtrait éclaté.
        style={{ perspective: '900px' }}
      >
        {shown.map((die, index) => (
          <Die3D
            key={die.id}
            sides={die.sides}
            face={die.face}
            kept={die.kept}
            radius={radius}
            index={index}
            seed={current.id}
          />
        ))}
      </div>
      {hidden > 0 ? (
        <p
          aria-hidden="true"
          className="dice-tray-life font-title text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary"
        >
          + {hidden}
        </p>
      ) : null}
    </div>
  );
}
