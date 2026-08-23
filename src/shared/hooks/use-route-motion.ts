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
 * La restauration INSISTE, et ce n'est pas du zèle : un seul `scrollTo` au
 * moment du rendu ne marche jamais en pratique. Au retour, l'écran est monté
 * mais son contenu arrive encore (cache Dexie, `onSnapshot` Firestore) — le
 * document fait quelques centaines de pixels, et le navigateur borne la
 * position demandée à cette hauteur, c'est-à-dire à zéro. Mesuré : la première
 * version rendait 0 au lieu de 1200. On réessaie donc image par image jusqu'à
 * atteindre la cible ou expirer.
 *
 * Deux gardes autour de cette insistance :
 *   - `history.scrollRestoration = 'manual'` — sinon le navigateur applique SA
 *     propre restauration et les deux se marchent dessus.
 *   - toute intervention de l'utilisateur (molette, doigt, clavier) annule la
 *     poursuite. Se battre contre quelqu'un qui a déjà repris la main est pire
 *     que de ne rien restaurer du tout.
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
/** Fenêtre pendant laquelle on réessaie d'atteindre la position mémorisée. */
const RESTORE_WINDOW_MS = 900;
/** Tolérance : à deux pixels près, on considère la position atteinte. */
const RESTORE_EPSILON_PX = 2;

/**
 * Pose la position de défilement et la MAINTIENT le temps que le contenu de
 * l'écran arrive. Retourne la fonction d'annulation.
 */
function restoreScroll(target: number): () => void {
  if (typeof window === 'undefined') return () => undefined;

  // Le navigateur applique sinon sa propre restauration en concurrence de la
  // nôtre, et le résultat dépend de qui écrit en dernier.
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

  window.scrollTo(0, target);
  if (target <= 0 || typeof window.requestAnimationFrame !== 'function') {
    return () => undefined;
  }

  let cancelled = false;
  let frame = 0;
  let elapsed = 0;

  const cancel = (): void => {
    if (cancelled) return;
    cancelled = true;
    window.cancelAnimationFrame(frame);
    window.removeEventListener('wheel', cancel);
    window.removeEventListener('touchstart', cancel);
    window.removeEventListener('keydown', cancel);
  };

  const attempt = (): void => {
    if (cancelled) return;
    window.scrollTo(0, target);
    if (Math.abs(window.scrollY - target) <= RESTORE_EPSILON_PX) return cancel();
    // ~16 ms par image : compter les images plutôt que lire l'horloge garde la
    // fonction testable sans horloge simulée.
    elapsed += 16;
    if (elapsed >= RESTORE_WINDOW_MS) return cancel();
    frame = window.requestAnimationFrame(attempt);
  };

  // Reprendre la main annule la poursuite : se battre contre quelqu'un qui
  // défile déjà est pire que de ne rien restaurer.
  window.addEventListener('wheel', cancel, { passive: true, once: true });
  window.addEventListener('touchstart', cancel, { passive: true, once: true });
  window.addEventListener('keydown', cancel, { once: true });

  frame = window.requestAnimationFrame(attempt);
  return cancel;
}

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
    const stopRestoring = restoreScroll(target);
    currentScroll.current = target;

    const element = ref.current;
    // `animate` est absent de jsdom : les tests unitaires rendent l'arbre sans
    // animation plutôt que d'exploser.
    if (!element || typeof element.animate !== 'function' || prefersReducedMotion()) {
      return stopRestoring;
    }

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
      stopRestoring();
      animation.removeEventListener('finish', release);
      animation.cancel();
    };
    // `location.key` change à CHAQUE navigation, y compris vers le même chemin —
    // c'est le déclencheur juste. `pathname` raterait un aller-retour A→B→A.
  }, [location.key, navigationType, ref]);
}
