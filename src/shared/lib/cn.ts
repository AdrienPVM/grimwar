import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * `tailwind-merge` configuré avec le thème custom GrimWar.
 *
 * Pourquoi : par défaut, `twMerge` classe `text-{n'importe quoi}` comme couleur
 * (`text-color`). Nos tokens custom de TAILLE — `text-meta`, `text-body`, … —
 * tombaient donc dans le même groupe que les couleurs `text-ink`, `text-text`,
 * ce qui faisait évincer la couleur quand `cva` concaténait
 * `text-ink … text-meta`. Symptôme UAT : bouton or à texte crème, contraste cassé.
 *
 * Le fix : déclarer explicitement les tailles custom dans `font-size` et les
 * couleurs custom dans `text-color`, pour que `twMerge` les sache distinctes.
 *
 * Toute nouvelle taille / couleur custom ajoutée dans `tailwind.config.ts` DOIT
 * être ajoutée ici aussi.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'hero',
            'display-lg',
            'display',
            'body-lg',
            'body',
            'meta',
            'micro',
          ],
        },
      ],
      'text-color': [
        {
          text: [
            'ink',
            'text',
            'text-secondary',
            'text-tertiary',
            'text-faint',
            'gold',
            'gold-bright',
            'gold-lite',
            'gold-text',
            'gold-dim',
            'gold-deep',
            'crimson',
            'teal',
            'amethyst',
            'amethyst-deep',
            'ruby',
            'sapphire',
            'emerald',
          ],
        },
      ],
    },
  },
});

/**
 * Concatène des classes Tailwind conditionnelles tout en réconciliant les conflits
 * (`px-2 px-4` → `px-4`). Standard projet pour TOUT className conditionnel.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
