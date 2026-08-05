import {
  Children,
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../lib/cn';

/**
 * Infobulle accessible et i18n-ready, sans dépendance externe.
 *
 * Pourquoi un composant maison plutôt que l'attribut natif `title` :
 * - `title` ne s'affiche PAS au toucher (la cible primaire est un téléphone) ;
 * - `title` n'est ni stylable, ni traduisible proprement (texte hors `t()`) ;
 * - `title` n'a aucune transition (viole la règle « transitions douces partout »).
 *
 * Comportement :
 * - Apparaît au survol souris (`pointerenter` non-touch) et au focus clavier ;
 *   disparaît au `pointerleave`, au `blur` et sur Échap.
 * - Le toucher est sciemment NON déclencheur (un tap = action du bouton, pas un
 *   flash d'infobulle). Les utilisateurs de lecteurs d'écran sont couverts par le
 *   nom accessible (voir `nameTrigger`). Un « appui long pour révéler » au toucher
 *   est un geste à part, à valider en UAT — différé.
 * - ARIA : par défaut l'infobulle DÉCRIT la cible (`aria-describedby`). Pour un
 *   bouton purement iconographique sans texte visible, `nameTrigger` fait de
 *   l'infobulle le NOM accessible (`aria-labelledby`) — une seule source de vérité.
 *
 * **Rendu en portail `position: fixed`** (et non plus `absolute` chez la cible).
 * Deux défauts réels l'imposent, tous deux constatés en UAT :
 *
 *  1. *Débordement horizontal du document.* Une bulle `absolute` reste dans le
 *     flux de mise en page même fermée (elle n'est qu'`opacity: 0`). Ancrée près
 *     du bord droit, elle élargissait `document.body` — mesuré 466 px de contenu
 *     pour un viewport de 412 px sur `/create`. `overflow-x: clip` masquait la
 *     barre de défilement mais PAS le décalage : la capture pleine page montrait
 *     une bande vide à droite, et le contenu réel se retrouvait tronqué.
 *     Un élément `fixed` ne participe pas au débordement défilable du document.
 *  2. *Rognage par un parent.* Une bulle `absolute` se fait couper par le premier
 *     ancêtre `overflow-hidden` (cartes, rangées de filtres). Le portail vers
 *     `<body>` la sort de toute chaîne de rognage.
 *
 * Le portail impose de positionner à la main : on mesure la cible et la bulle à
 * l'ouverture, puis on borne dans le viewport. La position se recalcule au
 * défilement et au redimensionnement tant que la bulle est ouverte.
 */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

type TriggerAria = {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
};

interface TooltipProps {
  /** Texte déjà localisé (l'appelant passe `t('…')`). */
  label: string;
  /** Côté d'apparition. Défaut : au-dessus. */
  placement?: TooltipPlacement;
  /**
   * `true` pour une cible sans texte visible (bouton-icône) : l'infobulle devient
   * le nom accessible. Ignoré si la cible a déjà son propre `aria-label`/`-labelledby`.
   */
  nameTrigger?: boolean;
  /**
   * `true` quand la cible porte DÉJÀ son propre nom accessible (`aria-label`) et
   * que l'infobulle n'est qu'un rappel visuel au survol : aucun câblage ARIA
   * (ni describedby ni labelledby), la bulle reste hors de l'arbre d'accessibilité
   * → évite la double annonce « nom + description identique » par le lecteur d'écran.
   */
  decorative?: boolean;
  /** Classes supplémentaires sur l'enveloppe (ex. `w-full`). */
  className?: string;
  /** Cible unique : un élément focusable/survolable (bouton, lien…). */
  children: ReactElement<TriggerAria>;
}

/** L'origine du `scale` reste du côté de la cible : la bulle « sort » d'elle. */
const PLACEMENT_ORIGIN: Record<TooltipPlacement, string> = {
  top: 'origin-bottom',
  bottom: 'origin-top',
  left: 'origin-right',
  right: 'origin-left',
};

/** Écart entre la cible et la bulle. */
const GAP_PX = 8;
/** Marge minimale conservée entre la bulle et le bord du viewport. */
const VIEWPORT_MARGIN_PX = 8;

type Coords = { readonly top: number; readonly left: number };

/**
 * Position en coordonnées viewport (`position: fixed`), bornée aux bords.
 *
 * On mesure la bulle via `offsetWidth`/`offsetHeight` et NON via
 * `getBoundingClientRect()` : au repos la bulle porte `scale-95`, et un rect
 * tient compte de la transformation — on sous-estimerait la taille de 5 % et la
 * bulle finirait décentrée à l'ouverture.
 */
function computeCoords(
  trigger: DOMRect,
  bubbleWidth: number,
  bubbleHeight: number,
  placement: TooltipPlacement,
  viewportWidth: number,
  viewportHeight: number,
): Coords {
  let top: number;
  let left: number;

  switch (placement) {
    case 'bottom':
      top = trigger.bottom + GAP_PX;
      left = trigger.left + trigger.width / 2 - bubbleWidth / 2;
      break;
    case 'left':
      top = trigger.top + trigger.height / 2 - bubbleHeight / 2;
      left = trigger.left - bubbleWidth - GAP_PX;
      break;
    case 'right':
      top = trigger.top + trigger.height / 2 - bubbleHeight / 2;
      left = trigger.right + GAP_PX;
      break;
    case 'top':
    default:
      top = trigger.top - bubbleHeight - GAP_PX;
      left = trigger.left + trigger.width / 2 - bubbleWidth / 2;
      break;
  }

  // Bornage : la bulle reste entièrement visible. `Math.max` en dernier pour
  // qu'une bulle plus large que le viewport se cale au bord gauche plutôt que
  // de partir en négatif à droite.
  left = Math.max(
    VIEWPORT_MARGIN_PX,
    Math.min(left, viewportWidth - bubbleWidth - VIEWPORT_MARGIN_PX),
  );
  top = Math.max(
    VIEWPORT_MARGIN_PX,
    Math.min(top, viewportHeight - bubbleHeight - VIEWPORT_MARGIN_PX),
  );

  return { top, left };
}

/** Concatène un id existant avec le nôtre sans écraser l'existant. */
function mergeIds(existing: string | undefined, id: string): string {
  return existing ? `${existing} ${id}` : id;
}

export function Tooltip({
  label,
  placement = 'top',
  nameTrigger = false,
  decorative = false,
  className,
  children,
}: TooltipProps): JSX.Element {
  const id = useId();
  const [open, setOpen] = useState(false);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  const reposition = useCallback(() => {
    const bubble = bubbleRef.current;
    const wrapper = wrapperRef.current;
    if (!bubble || !wrapper) return;
    setCoords(
      computeCoords(
        wrapper.getBoundingClientRect(),
        bubble.offsetWidth,
        bubble.offsetHeight,
        placement,
        window.innerWidth,
        window.innerHeight,
      ),
    );
  }, [placement]);

  // Mesure APRÈS layout, AVANT peinture : la bulle est déjà à sa place au
  // premier rendu visible, jamais positionnée puis corrigée sous l'œil.
  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  // Tant que la bulle est ouverte, elle suit sa cible : un `fixed` ne défile pas
  // avec la page, il resterait collé au viewport pendant que la cible s'en va.
  useEffect(() => {
    if (!open) return undefined;
    const onMove = (): void => reposition();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, reposition]);

  const show = useCallback(() => {
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  const handlePointerEnter = useCallback(
    (e: ReactPointerEvent<HTMLSpanElement>) => {
      // Le toucher ne déclenche pas l'infobulle (évite le flash avant le tap).
      if (e.pointerType === 'touch') return;
      setOpen(true);
    },
    [],
  );

  const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);

  const child = Children.only(children);
  const childAria: TriggerAria = child.props;
  const hasOwnName =
    childAria['aria-label'] != null || childAria['aria-labelledby'] != null;

  // Décorative : aucune retouche ARIA (la cible garde son propre nom).
  // Sinon : infobulle = nom (labelledby) si la cible n'a pas déjà un nom propre,
  // ou simple description (describedby) dans tous les autres cas.
  const ariaPatch: TriggerAria = decorative
    ? {}
    : nameTrigger && !hasOwnName
      ? { 'aria-labelledby': mergeIds(childAria['aria-labelledby'], id) }
      : { 'aria-describedby': mergeIds(childAria['aria-describedby'], id) };

  const trigger = cloneElement(child, ariaPatch);

  const bubble = (
    <span
      ref={bubbleRef}
      role="tooltip"
      id={id}
      // Tant qu'aucune mesure n'a eu lieu, la bulle attend hors écran plutôt
      // qu'en 0,0 — sinon un coin haut-gauche translucide clignote au tout
      // premier survol, avant que `useLayoutEffect` ne la place.
      style={
        coords
          ? { top: `${coords.top}px`, left: `${coords.left}px` }
          : { top: '0px', left: '-9999px' }
      }
      // Décorative → toujours hors de l'arbre d'accessibilité (le nom vit sur
      // la cible). Sinon hors arbre quand fermée, SAUF si l'infobulle sert de
      // nom (labelledby lit le texte quelle que soit la visibilité).
      aria-hidden={decorative ? true : nameTrigger ? undefined : !open}
      className={cn(
        // `w-max` : la bulle se dimensionne à son contenu (borné par max-w),
        // sinon une cible étroite (− / +) clampe la largeur en « shrink-to-fit »
        // et le texte s'empile sur trop de lignes.
        // Plafond responsive : ~22rem sur écran large (texte plus aéré, moins
        // d'empilement), mais jamais plus que la largeur du viewport moins une
        // marge (1.5rem de chaque côté) — sur mobile la bulle s'élargit donc
        // jusqu'au bord utile au lieu de se clamper trop tôt. `computeCoords`
        // borne ensuite la position aux bords du viewport.
        'pointer-events-none fixed z-50 w-max max-w-[min(22rem,calc(100vw_-_3rem))] whitespace-normal text-balance',
        'rounded-card-sm border border-gold-dim/40 bg-[#1a1410]/95 px-2.5 py-1.5',
        'text-center font-sans text-body-sm font-medium normal-case tracking-normal text-text',
        'shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm',
        'transition-[opacity,transform] duration-150 ease-base motion-reduce:transition-none',
        PLACEMENT_ORIGIN[placement],
        open ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
      )}
    >
      {label}
    </span>
  );

  return (
    <span
      ref={wrapperRef}
      className={cn('relative inline-flex', className)}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
    >
      {trigger}
      {typeof document === 'undefined'
        ? bubble
        : createPortal(bubble, document.body)}
    </span>
  );
}
