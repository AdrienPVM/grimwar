import { useEffect, useRef, useState, type JSX } from 'react';

import { cn } from '../lib/cn';
import { prefersReducedMotion } from '../lib/prefers-reduced-motion';

/** Durée totale de la culbute avant que le chiffre se pose. */
const TUMBLE_MS = 420;
/** Intervalle entre deux faces intermédiaires. ~7 faces sur la durée. */
const FRAME_MS = 60;

/**
 * Le résultat d'un jet, qui culbute avant de se poser.
 *
 * POURQUOI : jusqu'ici le total apparaissait d'un bloc, déjà juste. C'est
 * exact et c'est mort. Autour d'une table, le moment du jet est le moment de
 * suspense de la soirée — un dé qui roule tient l'attention une seconde, et
 * c'est cette seconde que l'écran escamotait.
 *
 * Ce n'est PAS un moteur de dés 3D (différé au sprint 5 par le journal de
 * décisions, et il faudrait une dépendance) : c'est la même intention obtenue
 * avec les chiffres qu'on a déjà. Des faces plausibles défilent ~420 ms, puis la
 * vraie valeur se pose avec un ressort.
 *
 * Ne culbute QUE sur un entier nu. Un « 18 → 7 » (chaîne attaque/dégâts) ou un
 * « ✗ Raté » n'ont pas de faces intermédiaires qui veuillent dire quelque
 * chose ; ils prennent juste la pose finale.
 *
 * ACCESSIBILITÉ : les faces intermédiaires sont `aria-hidden`. La pile de toasts
 * est une région `aria-live` — sans cette garde, un lecteur d'écran annoncerait
 * sept nombres faux avant le bon. La valeur réelle est portée une seule fois par
 * un texte hors écran, stable dès la première image.
 */
export function RollingNumber({
  value,
  className,
}: {
  value: string;
  className?: string;
}): JSX.Element {
  const final = Number.parseInt(value, 10);
  const isPlainInteger = /^\d+$/.test(value) && Number.isFinite(final);

  const [face, setFace] = useState<string | null>(null);
  // `settled` pilote la pose finale : le ressort ne doit se jouer qu'une fois,
  // pas à chaque re-rendu du toast.
  const [settled, setSettled] = useState(false);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (startedFor.current === value) return;
    startedFor.current = value;

    if (!isPlainInteger || prefersReducedMotion()) {
      setFace(null);
      setSettled(true);
      return;
    }

    // Plage des faces intermédiaires : autour de la valeur réelle, jamais en
    // dessous de 1 ni au-dessus d'une marge crédible — un total de 7 qui
    // afficherait 143 en chemin trahirait l'artifice.
    const ceiling = Math.max(6, Math.round(final * 1.35));
    setSettled(false);
    setFace(String(Math.max(1, Math.ceil(Math.random() * ceiling))));

    const tick = window.setInterval(() => {
      setFace(String(Math.max(1, Math.ceil(Math.random() * ceiling))));
    }, FRAME_MS);
    const stop = window.setTimeout(() => {
      window.clearInterval(tick);
      setFace(null);
      setSettled(true);
    }, TUMBLE_MS);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(stop);
    };
  }, [value, isPlainInteger, final]);

  return (
    <>
      {/* Annonce unique et juste, indépendante de la culbute. */}
      <span className="sr-only">{value}</span>
      <span
        aria-hidden="true"
        className={cn(
          className,
          'inline-block transition-transform duration-350 ease-spring',
          // La face intermédiaire reste légèrement en retrait et sans éclat :
          // l'œil comprend qu'elle n'est pas encore le résultat.
          face !== null && 'scale-90 opacity-70',
          settled && 'scale-100 opacity-100',
        )}
      >
        {face ?? value}
      </span>
    </>
  );
}
