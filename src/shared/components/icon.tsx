import type { SVGProps } from 'react';
import { cn } from '../lib/cn';
import type { IconName } from '../design/icons';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  name: IconName;
};

/**
 * Référence un symbole du sprite défini par <IconSprite />. La classe `.ic`
 * fournie par `globals.css` règle stroke + fill + tailles relatives. Surcharger
 * via `className` Tailwind (ex: `w-5 h-5 text-gold`).
 */
export function Icon({ name, className, ...rest }: IconProps): JSX.Element {
  return (
    <svg aria-hidden="true" focusable="false" className={cn('ic', className)} {...rest}>
      <use href={`#${name}`} />
    </svg>
  );
}
