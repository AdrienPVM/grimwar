import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

type GlassPanelTag = 'div' | 'section' | 'article';

type GlassPanelProps = HTMLAttributes<HTMLElement> & {
  as?: GlassPanelTag;
  children?: ReactNode;
};

/**
 * Brique de base des cartes en verre. Apparence par défaut :
 * fond glass + backdrop-blur + bordure douce + radius card + shadow.
 * Sert de base à <Card> et à toute surface flottante.
 */
export function GlassPanel({
  as: Tag = 'div',
  className,
  children,
  ...rest
}: GlassPanelProps): JSX.Element {
  // Cast nécessaire : ElementType<HTMLElement> n'accepte pas les props HTML génériques
  // sans largeur d'inférence. Restreindre `as` à un union littéral garde la sécurité.
  const Component = Tag as ElementType;
  return (
    <Component
      className={cn(
        'bg-glass backdrop-blur-xl backdrop-saturate-150',
        'border border-white-8 rounded-card shadow-card',
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
