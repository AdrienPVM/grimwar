import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

import { prefersReducedMotion } from '../lib/prefers-reduced-motion';

/** Durée de l'entrée d'écran. Alignée sur `duration-250` du design system. */
const ENTER_MS = 260;
/** `ease-base` du design system, en valeur littérale pour l'API Web Animations. */
const EASE_BASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
/** Montée initiale. Volontairement courte : un écran qui « voyage » fatigue. */
const ENTER_LIFT_PX = 10;

/**
 * Deux comportements qu'on attend d'une app native et qui manquaient tous les
 * deux : le défilement se remet où il doit, et l'écran entre au lieu
 * d'apparaître d'un coup.
 *
 * ── DÉFILEMENT ──
 * Rien ne le gérait. On quittait une liste de campagnes défilée à mi-hauteur
 * pour arriver sur le détail d'une campagne… à mi-hauteur, sur un paragraphe
 * au hasard, sans que rien n'explique pourquoi le titre manque.
 *
 * On distingue les deux sens :
 *   - AVANT (push) → on remonte en haut. C'est un écran neuf.
 *   - RETOUR (pop) → on restaure la position mémorisée. Revenir d'une fiche de
 *     PNJ à l'annuaire pour retomber en tête de liste, c'est reperdre à chaque
 *     aller-retour la place qu'on avait mis dix secondes à retrouver.
 *
 * La position courante est suivie par un écouteur passif plutôt que lue au
 * moment du changement de route : au nettoyage d'effet, le DOM du nouvel écran
 * est déjà en place et `window.scrollY` a pu être écrasé par un document plus
 * court — on mémoriserait alors une position fausse.
 *
 * Limite assumée : sur retour vers un écran dont le contenu arrive en asynchrone
 * (une liste Firestore pas encore résolue), le document est encore court et le
 * navigateur borne la position restaurée à sa hauteur du moment. Le retour est
 * alors partiel, jamais pire que l'état d'avant (qui remontait en haut à tous
 * les coups).
 *
 * ── ENTRÉE ──
 * Animée en API Web Animations plutôt qu'en classe CSS rejouée : pas de remontage
 * de l'arbre React (une clé sur le conteneur détruirait l'état de chaque écran à
 * chaque navigation, et relancerait les abonnements Firestore), et pas de
 * bidouille `requestAnimationFrame` pour redéclencher une `@keyframes`.
 *
 * Conséquence à connaître : pendant les 260 ms, la `transform` du conteneur en
 * fait le bloc conteneur des descendants en `position: fixed` (le menu radial de
 * la fiche). Ils montent donc avec la page — ce qui est le rendu voulu : l'écran
 * se lève d'un seul tenant.
 *
 * `prefers-reduced-motion` supprime l'entrée ; la restauration du défilement,
 * elle, est une fonction et non une décoration — elle reste active.
 */
export function useRouteMotion(ref: RefObject<HTMLElement>): void {
  const location = useLocation();
  const navigationType = useNavigationType();

  const positions = useRef<Map<string, number>>(new Map());
  const currentScroll = useRef(0);
  const previousKey = useRef<string | null>(null);

  useEffect(() => {
    const onScroll = (): void => {
      currentScroll.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    // Mémorise la position de l'écran qu'on vient de quitter, sous SA clé.
    if (previousKey.current !== null) {
      positions.current.set(previousKey.current, currentScroll.current);
    }
    previousKey.current = location.key;

    const target = navigationType === 'POP' ? (positions.current.get(location.key) ?? 0) : 0;
    window.scrollTo(0, target);
    currentScroll.current = target;

    const element = ref.current;
    // `animate` est absent de jsdom : les tests unitaires rendent l'arbre sans
    // animation plutôt que d'exploser.
    if (!element || typeof element.animate !== 'function' || prefersReducedMotion()) return;

    const animation = element.animate(
      [
        { opacity: 0, transform: `translateY(${ENTER_LIFT_PX}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: ENTER_MS, easing: EASE_BASE, fill: 'both' },
    );
    // Rendre la main sur le style dès la fin : un `fill: both` laissé en place
    // gèlerait `opacity: 1` en style calculé et écraserait toute transition
    // ultérieure posée par un écran sur son propre conteneur.
    const release = (): void => animation.cancel();
    animation.addEventListener('finish', release);
    return () => {
      animation.removeEventListener('finish', release);
      animation.cancel();
    };
    // `location.key` change à CHAQUE navigation, y compris vers le même chemin —
    // c'est le déclencheur juste. `pathname` raterait un aller-retour A→B→A.
  }, [location.key, navigationType, ref]);
}
