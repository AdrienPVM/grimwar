import {
  Children,
  cloneElement,
  useCallback,
  useId,
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
  className,
  children,
}: TooltipProps): JSX.Element {
  const id = useId();
  const [open, setOpen] = useState(false);

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

  // Infobulle = nom (labelledby) seulement si la cible n'a pas déjà un nom propre ;
  // sinon elle reste une simple description (describedby).
  const ariaPatch: TriggerAria =
    nameTrigger && !hasOwnName
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
        role="tooltip"
        id={id}
        // Hors de l'arbre d'accessibilité quand l'infobulle est fermée, SAUF si
        // elle sert de nom (labelledby/aria-hidden ne doivent pas se masquer
        // mutuellement — labelledby lit le texte quelle que soit la visibilité).
        aria-hidden={nameTrigger ? undefined : !open}
        className={cn(
          'pointer-events-none absolute z-50 max-w-[16rem] whitespace-normal text-balance',
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
