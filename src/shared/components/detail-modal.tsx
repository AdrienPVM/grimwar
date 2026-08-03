import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type JSX,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../lib/cn';

/**
 * Primitive « modale de détail » partagée (UAT post-plan 05 — bug n°2 corrigé).
 *
 * Pourquoi un portal vers `document.body` : tout ancêtre qui applique
 * `backdrop-filter`, `filter`, `transform`, `perspective` ou `will-change`
 * crée un nouveau containing block pour `position: fixed`. Le `<GlassPanel>`
 * du wizard utilise `backdrop-blur-xl` → un `fixed inset-0` rendu à l'intérieur
 * couvre la zone du panel, pas le viewport. La modale s'affichait alors en
 * bas de la page, sans backdrop plein écran.
 *
 * En portalant au `body`, la modale échappe à toute hiérarchie de containing
 * blocks parents et `fixed inset-0` est garanti relatif au viewport.
 *
 * Contrat a11y (inchangé) :
 *   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
 *   - Échap ferme ; clic backdrop ferme ; bouton X 44×44 ferme.
 *   - À l'ouverture : focus sur premier focusable interne (ou panneau).
 *   - À la fermeture : focus rendu au déclencheur (typiquement le « ? »).
 *   - Tab piégé à l'intérieur du panneau.
 *
 * Scroll de la PAGE bloqué (`document.body.style.overflow = 'hidden'`) tant
 * que la modale est ouverte — empêche de scroller le contenu derrière. Le
 * scroll INTERNE de la modale (`overflow-y-auto`) reste, légitime pour les
 * longues descriptions.
 */

/**
 * Gabarit de largeur responsive. Avant le plan 27, le panneau était figé à
 * `max-w-[460px]` à toutes les tailles → à l'étroit sur tablette/TV (et chaque
 * caller bricolait son `max-w` en className, source de conflits tailwind-merge).
 * On centralise trois échelles :
 *  - `sm` : confirmations / dialogues compacts — reste étroit même sur grand
 *    écran (un « Quitter la campagne ? » n'a pas vocation à faire 760px).
 *  - `md` (défaut) : formulaires et modales standard — élargissement doux.
 *  - `lg` : contenu dense (détail de sort, montée de niveau, création de
 *    rencontre) — profite franchement de la largeur sur desktop/TV.
 *  - `xl` : écran entier emprunté (Codex en superposition) — une liste
 *    filtrable de 300 sorts a besoin de plus qu'une colonne de lecture.
 */
type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-[440px]',
  md: 'max-w-[480px] sm:max-w-[560px]',
  lg: 'max-w-[480px] sm:max-w-[600px] lg:max-w-[760px]',
  xl: 'max-w-none sm:max-w-[720px] lg:max-w-[1000px]',
};

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * ID du titre rendu par le contenu (`<h2 id={titleId}>…</h2>`). Branché à
   * `aria-labelledby` pour que les lecteurs d'écran annoncent correctement la
   * modale. Si le caller ne contrôle pas le titre, il peut omettre — un id
   * généré est utilisé et le caller doit poser le `id` lui-même.
   */
  titleId?: string;
  /** Libellé du bouton de fermeture (a11y). Défaut "Fermer". */
  closeLabel?: string;
  /** Gabarit de largeur responsive (cf. `ModalSize`). Défaut `md`. */
  size?: ModalSize;
  children: ReactNode;
  className?: string;
}

/**
 * Marqueur porté par le fond de chaque modale ouverte. Sert à désigner « celle
 * du dessus » au moment d'Échap (cf. `isTopmostModal`).
 */
const MODAL_ROOT_ATTR = 'data-detail-modal';

/**
 * La modale `el` est-elle celle du dessus ?
 *
 * POURQUOI cette question se pose : le Codex consultable en pleine partie est
 * une modale QUI CONTIENT les navigateurs du Codex, lesquels ouvrent leur
 * propre modale de détail. Or les deux posent leur écouteur `keydown` sur
 * `window`, et `stopPropagation` empêche la propagation vers d'autres CIBLES,
 * pas vers les autres écouteurs de la MÊME cible : les deux se déclenchaient
 * donc quoi qu'il arrive. On relisait la portée d'un sort, on appuyait sur
 * Échap, et on se retrouvait éjecté du Codex.
 *
 * POURQUOI l'ordre du DOM plutôt qu'une pile d'ordre de montage : React
 * commite les effets ENFANT D'ABORD, donc une modale rendue à l'intérieur
 * d'une autre s'empilerait avant sa parente — l'inverse de l'empilement voulu.
 * L'ordre du document, lui, est exactement l'ordre de peinture à `z-index`
 * égal (toutes les modales partagent `z-[80]`), et toutes sont portalées au
 * même `body`. Le dernier nœud marqué est donc, littéralement, celui que
 * l'utilisateur voit au-dessus.
 *
 * Le clic sur le fond, lui, n'a jamais eu besoin de ça : le fond du dessus
 * recouvre celui du dessous et reçoit seul le clic.
 */
function isTopmostModal(el: HTMLElement | null): boolean {
  if (!el) return false;
  const roots = document.querySelectorAll<HTMLElement>(`[${MODAL_ROOT_ATTR}]`);
  return roots.length === 0 || roots[roots.length - 1] === el;
}

/** Sélecteur des éléments potentiellement focusables à l'intérieur du panneau. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function DetailModal({
  open,
  onClose,
  titleId: providedTitleId,
  closeLabel = 'Fermer',
  size = 'md',
  children,
  className,
}: Props): JSX.Element | null {
  const generatedId = useId();
  const titleId = providedTitleId ?? `detail-modal-${generatedId}`;
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Le fond de CETTE modale — comparé aux autres pour savoir qui est au-dessus.
  const rootRef = useRef<HTMLDivElement | null>(null);
  // L'élément qui avait le focus juste avant l'ouverture (typiquement le
  // bouton « ? » déclencheur). On lui rend le focus à la fermeture.
  const triggerRef = useRef<Element | null>(null);

  // Capture le focus précédent + place le focus interne à l'ouverture.
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    const panel = panelRef.current;
    if (!panel) return;
    const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? panel).focus({ preventScroll: true });
  }, [open]);

  // Rend le focus au déclencheur quand on ferme.
  useEffect(() => {
    if (open) return;
    const prev = triggerRef.current;
    if (prev instanceof HTMLElement) {
      prev.focus({ preventScroll: true });
    }
  }, [open]);

  // Verrouille le scroll de la page derrière la modale, restaure à la
  // fermeture ET au démontage (cas où la modale est arrachée encore ouverte).
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Échap ferme + Tab cycle à l'intérieur.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        // Seule la modale du dessus se ferme : sinon relire le détail d'un sort
        // depuis le Codex en superposition éjecterait aussi du Codex.
        if (!isTopmostModal(rootRef.current)) return;
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => !el.hasAttribute('disabled'));
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Clic strictement sur l'overlay (et pas remontant depuis le panneau).
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!open) return null;
  // SSR safety : pas de document → on ne tente pas le portal.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      {...{ [MODAL_ROOT_ATTR]: '' }}
      onClick={handleBackdropClick}
      className={cn(
        // Ancrage bottom-sheet sur mobile (`items-end` → atteignable au pouce),
        // recentré à partir de `sm` — aligné sur les modales custom (item, dés…).
        'fixed inset-0 z-[80] flex items-end justify-center px-4 py-6 sm:items-center',
        'bg-ink/85 backdrop-blur-xl',
        'animate-fadeIn motion-reduce:animate-none',
      )}
    >
      <div
        ref={panelRef}
        // tabIndex=-1 → le panneau accepte le focus programmatique en fallback
        // si aucun focusable interne, sans entrer dans l'ordre de tabulation.
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col overflow-y-auto',
          SIZE_CLASS[size],
          'rounded-card border border-soft bg-glass shadow-card-lg',
          'focus:outline-none',
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className={cn(
            'absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center',
            'rounded-full border border-white-8 bg-glass-2',
            'font-title text-[14px] text-text-tertiary',
            'transition-colors duration-200 ease-base',
            'hover:border-soft hover:text-gold-bright',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
          )}
        >
          <span aria-hidden="true">✕</span>
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
