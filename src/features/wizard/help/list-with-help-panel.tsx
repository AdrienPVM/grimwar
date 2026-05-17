import { isValidElement, type JSX, type ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

/**
 * Dérive une clé stable à partir du panneau pour rejouer l'animation `fadeIn`
 * quand le contenu change. Lecture par défaut via `panel.props.title` ; les
 * consumers qui ne portent pas `title` (ex. `SpellHelpPanel`) passent un
 * `panelKey` explicite à `ListWithHelpPanel`.
 */
function panelKey(panel: ReactNode): string | null {
  if (!isValidElement(panel)) return null;
  const props = panel.props as { title?: unknown };
  return typeof props.title === 'string' ? props.title : null;
}

/**
 * Layout partagé "liste de choix + panneau d'aide", utilisé par les étapes
 * Classe / Ascendance / Historique / Sorts.
 *
 * Modèle d'interaction (UAT post-plan 05 — ajustements 1+2) :
 *   - Desktop (md+) : panneau PERSISTANT côté droit. Le parent owner gère un
 *     `selectedItemId` qui ne se vide JAMAIS sur mouseleave/blur — il bascule
 *     uniquement quand un AUTRE item devient actif (hover, focus, clic). Le
 *     panneau a donc toujours du contenu une fois la première interaction
 *     faite, jusqu'à la fin de l'étape.
 *   - Mobile (<md) : le hover n'existe pas. La liste est rendue seule ;
 *     chaque ligne expose un bouton `?` (cf. `HelpTriggerButton`) qui ouvre
 *     une `<DetailModal>` partagée. Le panneau latéral est masqué (`hidden
 *     md:block`) pour ne pas dupliquer le contenu.
 *
 * Stabilité verticale : la liste vit dans la 1ère cellule du grid, le panneau
 * dans la 2e. Quand le panneau grandit ou rétrécit, la cellule liste reste
 * top-aligned (`items-start`). Aucun reflow latéral, et sur mobile (1 col)
 * la question ne se pose pas — le panneau n'est pas inline.
 *
 * Cf. CLAUDE.md > transitions douces : `animate-fadeIn` + `motion-reduce`.
 */
interface Props {
  /** Liste cliquable (ul + items). Garde la responsabilité du hover/focus. */
  list: ReactNode;
  /** Panneau d'aide (HelpPanel ou SpellHelpPanel). `null` → placeholder desktop. */
  panel: ReactNode;
  /**
   * Clé explicite pour la fadeIn — utile quand le panneau n'expose pas `title`
   * (ex. `SpellHelpPanel` keyé par `spell.id`). Si absent, on lit `panel.props.title`.
   */
  panelKey?: string;
  className?: string;
}

// Min-height empirique du placeholder vide pour qu'il garde une présence
// visuelle même quand rien n'est survolé (sans capper le contenu).
const DESKTOP_EMPTY_MIN_HEIGHT = 'min-h-[280px]';

export function ListWithHelpPanel({
  list,
  panel,
  panelKey: explicitKey,
  className,
}: Props): JSX.Element {
  const key = explicitKey ?? panelKey(panel);
  // Wrappers fadeIn pour éviter l'apparition brutale du panneau au hover
  // (cf. CLAUDE.md > transitions douces). La key change quand le panneau
  // pointe sur un nouvel élément, ce qui rejoue l'animation.
  const desktopPanel = panel ? (
    <div
      key={key ?? 'panel'}
      className="rounded-card animate-fadeIn motion-reduce:animate-none"
    >
      {panel}
    </div>
  ) : (
    <div
      key="empty"
      className={cn(
        DESKTOP_EMPTY_MIN_HEIGHT,
        'animate-fadeIn motion-reduce:animate-none',
      )}
    >
      <HelpPanelEmpty />
    </div>
  );
  return (
    <div
      className={cn(
        'grid grid-cols-1 items-start gap-6',
        'md:grid-cols-[minmax(0,1fr)_360px] md:gap-8',
        className,
      )}
    >
      <div>{list}</div>
      {/* Desktop seul. Mobile = pas de panneau inline : le détail s'ouvre via
          le bouton `?` de chaque ligne dans une `<DetailModal>` partagée. */}
      <aside className="hidden md:block sticky top-4 self-start">
        {desktopPanel}
      </aside>
    </div>
  );
}

/**
 * Placeholder visible côté desktop tant qu'aucun item n'est survolé/sélectionné.
 * Occupe toute la hauteur réservée du panneau pour préserver le layout.
 */
function HelpPanelEmpty(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex h-full flex-col items-center justify-center gap-2',
        'rounded-card border border-dashed border-soft/60 bg-bg-3/20 p-5',
        'text-center',
      )}
    >
      <span aria-hidden="true" className="text-gold-bright text-2xl">
        ✦
      </span>
      <p className="font-serif italic text-text-tertiary text-[14px]">
        {t('wizard.helpPanel.hint')}
      </p>
    </div>
  );
}
