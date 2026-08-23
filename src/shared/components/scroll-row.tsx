import type { HTMLAttributes, JSX, ReactNode } from 'react';

import { cn } from '../lib/cn';

/**
 * Rangée à défilement horizontal — barres de filtres, chips, onglets.
 *
 * **Pourquoi une primitive plutôt qu'un `flex overflow-x-auto` recopié.**
 * Un bug d'UAT a révélé que le motif recopié était subtilement faux : quand on
 * pose `overflow-x: auto`, la spec CSS recalcule l'autre axe — un `overflow-y`
 * resté `visible` devient `auto`. La rangée se met donc à rogner VERTICALEMENT
 * aussi, alors que personne ne le lui a demandé. Conséquence visible : l'anneau
 * `ring-1` d'un chip actif, dessiné à l'extérieur de la boîte, se retrouve
 * coupé net en haut et en bas — « comme s'il sortait d'un overflow hidden ».
 *
 * Le correctif est un rembourrage vertical annulé par une marge négative : la
 * rangée gagne 8 px de marge interne où l'anneau peut respirer, sans bouger
 * d'un pixel dans la mise en page du parent. 8 px et non 4 : la valeur est
 * calibrée sur le débordement le plus large de l'app, le halo `drop-shadow` de
 * 8 px de l'onglet actif du Codex — un anneau `ring-1` s'en contente largement.
 *
 * On en profite pour masquer la barre de défilement des deux côtés du monde
 * (`::-webkit-scrollbar` pour Chromium/Safari, `scrollbar-width` pour Firefox) —
 * l'ancien motif ne traitait que WebKit.
 */
interface ScrollRowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function ScrollRow({
  children,
  className,
  ...rest
}: ScrollRowProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto',
        // Respiration verticale pour les anneaux/ombres des enfants actifs,
        // neutralisée dans le flux par la marge négative correspondante.
        '-my-2 py-2',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
