import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Gabarits de largeur de page. Chaque palier garde EXACTEMENT la largeur
 * historique du mobile jusqu'à `lg` (≤1279px) — donc zéro régression sur
 * téléphone et desktop standard — puis s'élargit à `xl` (≥1280px) et `2xl`
 * (≥1536px) pour exploiter les écrans larges / TV. Le palier `content` reprend
 * trait pour trait l'échelle déjà validée en UAT sur l'écran de combat (7ddffae).
 *
 * - `narrow`  : formulaires courts, états vides/erreur centrés (460px).
 * - `prose`   : contenu de lecture dense (760px → 920 → 1040).
 * - `content` : largeur de page par défaut, famille campagne (860 → 1080 → 1320).
 * - `wide`    : bibliothèque / navigateurs de contenu (960 → 1160 → 1360).
 * - `xwide`   : tableaux de bord en grille (1280 → 1280 → 1536).
 */
export type PageWidth = 'narrow' | 'prose' | 'content' | 'wide' | 'xwide';

const WIDTH_CLASS: Record<PageWidth, string> = {
  narrow: 'max-w-[460px]',
  prose: 'max-w-[760px] xl:max-w-[920px] 2xl:max-w-[1040px]',
  content: 'max-w-[860px] xl:max-w-[1080px] 2xl:max-w-[1320px]',
  wide: 'max-w-[960px] xl:max-w-[1160px] 2xl:max-w-[1360px]',
  xwide: 'max-w-[1280px] 2xl:max-w-[1536px]',
};

type PageContainerTag = 'main' | 'div' | 'section';

type PageContainerProps = HTMLAttributes<HTMLElement> & {
  as?: PageContainerTag;
  width?: PageWidth;
  children?: ReactNode;
};

/**
 * Conteneur de page partagé. Centralise le pattern répété sur ~10 écrans
 * (`relative z-10 mx-auto w-full max-w-… px-4 py-8 sm:px-6 lg:px-8`) pour que
 * tout réglage responsive futur (TV, marges) se fasse en un seul endroit.
 *
 * `className` reste fusionnable via `cn()` (tailwind-merge) : un appelant peut
 * surcharger le padding vertical d'un état d'erreur, par exemple, sans rouvrir
 * ce fichier.
 */
export function PageContainer({
  as: Tag = 'main',
  width = 'content',
  className,
  children,
  ...rest
}: PageContainerProps): JSX.Element {
  // Cast identique à <GlassPanel> : un union littéral d'`as` garde le typage sûr
  // tout en autorisant les props HTML génériques.
  const Component = Tag as ElementType;
  return (
    <Component
      className={cn(
        'relative z-10 mx-auto w-full px-4 py-8 sm:px-6 lg:px-8',
        WIDTH_CLASS[width],
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
