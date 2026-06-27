import {
  Children,
  cloneElement,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';

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

const PLACEMENT_CLASSES: Record<TooltipPlacement, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2 origin-bottom',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2 origin-top',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2 origin-right',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2 origin-left',
};

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
  // Décalage horizontal correctif pour garder la bulle dans le viewport (pas de
  // dépendance type floating-ui : on mesure et on recale au moment de l'ouverture).
  const [shiftX, setShiftX] = useState(0);

  // Mesure APRÈS layout, AVANT peinture (pas de flash) : si la bulle déborde un
  // bord du viewport, on la repousse vers l'intérieur via `marginLeft` (qui ne
  // rentre pas en conflit avec les `transform` de placement/scale de Tailwind).
  useLayoutEffect(() => {
    if (!open) {
      setShiftX(0);
      return;
    }
    const el = bubbleRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    if (rect.left < margin) setShiftX(margin - rect.left);
    else if (rect.right > vw - margin) setShiftX(vw - margin - rect.right);
    else setShiftX(0);
  }, [open]);

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

  return (
    <span
      className={cn('relative inline-flex', className)}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
    >
      {trigger}
      <span
        ref={bubbleRef}
        role="tooltip"
        id={id}
        style={shiftX !== 0 ? { marginLeft: `${shiftX}px` } : undefined}
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
          // jusqu'au bord utile au lieu de se clamper trop tôt. Le recalage
          // horizontal (`shiftX`) garde ensuite la bulle dans le viewport.
          'pointer-events-none absolute z-50 w-max max-w-[min(22rem,calc(100vw_-_3rem))] whitespace-normal text-balance',
          'rounded-card-sm border border-gold-dim/40 bg-[#1a1410]/95 px-2.5 py-1.5',
          'text-center font-sans text-body-sm font-medium normal-case tracking-normal text-text',
          'shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm',
          'transition-[opacity,transform] duration-150 ease-base motion-reduce:transition-none',
          PLACEMENT_CLASSES[placement],
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        )}
      >
        {label}
      </span>
    </span>
  );
}
