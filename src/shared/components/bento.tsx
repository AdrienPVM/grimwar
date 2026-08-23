import type { JSX, ReactNode } from 'react';

import { cn } from '../lib/cn';

/**
 * Primitive de mise en page « bento » — mosaïque de tuiles de tailles
 * hétérogènes, utilisée par les 5 modes de la fiche à partir de la tablette.
 *
 * POURQUOI une primitive plutôt que des classes Tailwind à la main dans chaque
 * mode : la fiche compte ~40 cartes dont **28 se masquent elles-mêmes**
 * (`return null` quand le personnage n'a pas d'invocations, pas d'emplacements,
 * pas d'objet harmonisé…). Une grille écrite à la main dans chaque mode devait
 * dupliquer chaque condition côté parent pour ne pas ouvrir de trou — c'est le
 * piège déjà documenté sur `AttunementSummary` (DEBT D6) : un composant qui rend
 * `null` ne crée pas de cellule de grille, mais le `<div>` qui l'enveloppe, si.
 *
 * La primitive supprime la classe entière de ce bug : une tuile dont l'enfant
 * n'a rien rendu est retirée du flux par CSS (`[data-hide-if-empty]:not(:has(*))`,
 * cf. `globals.css`), sans que le parent ait à connaître la condition. La règle
 * est **globale et non media-scopée** — en colonne simple (mobile) une tuile
 * vide produirait un `gap` fantôme, exactement le même défaut. Elle est aussi
 * générique : `data-hide-if-empty` se pose sur n'importe quel conteneur ayant
 * le même risque, hors mosaïque (cf. le raccourci de campagne de la fiche).
 * `data-bento-tile` reste le marqueur de mise en page, interrogé par les tests.
 *
 * Grille : 6 colonnes, choisies pour être divisibles par 2 et par 3 — une même
 * tuile peut donc valoir une demie, un tiers ou deux tiers de rangée sans jamais
 * tomber sur une fraction. Trois paliers :
 *   - `< lg`   : colonne unique (mobile inchangé, `flex flex-col`)
 *   - `lg`     : 2 colonnes utiles (tablette — `sm`/`md` font une demie)
 *   - `xl`     : mosaïque pleine (`sm` = 1/3, `md` = 1/2, `lg` = 2/3)
 *
 * `grid-flow-row-dense` rattrape les trous laissés par les cartes absentes en
 * remontant une tuile plus petite. Compromis d'accessibilité assumé : le
 * placement visuel peut alors diverger de l'ordre DOM (WCAG 1.3.2). C'est
 * acceptable ici parce que les tuiles sont des panneaux **indépendants** sans
 * séquence de lecture — l'ordre de tabulation reste celui du DOM, cohérent, et
 * aucune tuile ne dépend de la précédente pour être comprise.
 *
 * `items-stretch` + `[&>*]:h-full` : les tuiles d'une même rangée partagent leur
 * arête basse. La première version alignait sur le haut (`items-start`), ce qui
 * laissait chaque rangée se terminer en marches d'escalier — une carte de 200 px
 * à côté d'une carte de 450 px, et deux décrochements de bordure au milieu de la
 * mosaïque. C'est précisément ce qui distingue une mosaïque d'une pile mal
 * rangée : un bento se lit comme un pavage de rectangles alignés, le blanc se
 * met À L'INTÉRIEUR d'une tuile, jamais entre deux tuiles. Le prix — une carte
 * courte affiche du vide sous son contenu — est un vide cadré, pas un trou.
 *
 * Corollaire pour les modes : deux tuiles qui se font face doivent rester de
 * hauteurs comparables. Quand ce n'est pas naturel (le cercle d'incantation fait
 * 3 fois la hauteur de la barre de stats), on empile plusieurs cartes courtes
 * dans la tuile courte via `BentoStack` plutôt que de laisser l'étirement
 * fabriquer un aplat.
 */

/** Classes de la grille bento, à poser sur le conteneur du mode (`<section>`). */
export const BENTO_GRID = cn(
  'mx-auto mt-4 flex w-full max-w-[420px] flex-col gap-3 px-4',
  'lg:grid lg:max-w-none lg:grid-cols-6 lg:grid-flow-row-dense lg:items-stretch lg:gap-4 lg:px-0',
  'xl:gap-5',
);

/**
 * Empreinte d'une tuile dans la mosaïque.
 * - `sm`   : accessoire — 1/2 rangée en tablette, 1/3 en desktop
 * - `md`   : moitié de rangée aux deux paliers
 * - `lg`   : pièce maîtresse — pleine largeur en tablette, 2/3 en desktop
 * - `full` : bandeau pleine largeur aux deux paliers (états, compétences,
 *            inventaire, listes de sorts)
 */
export type BentoSpan = 'sm' | 'md' | 'lg' | 'full';

const SPAN_CLASSES: Record<BentoSpan, string> = {
  sm: 'lg:col-span-3 xl:col-span-2',
  md: 'lg:col-span-3 xl:col-span-3',
  lg: 'lg:col-span-6 xl:col-span-4',
  full: 'lg:col-span-6 xl:col-span-6',
};

interface BentoTileProps {
  children: ReactNode;
  span?: BentoSpan;
  className?: string;
}

/**
 * Une tuile de la mosaïque. Se retire d'elle-même si son enfant n'a rien rendu
 * (cf. la règle `:has()` de `globals.css`) — le parent n'a donc jamais à
 * dupliquer la condition d'affichage de la carte qu'il enveloppe.
 */
export function BentoTile({
  children,
  span = 'sm',
  className,
}: BentoTileProps): JSX.Element {
  return (
    <div
      data-bento-tile=""
      data-hide-if-empty=""
      // `lg:[&>*]:h-full` : la tuile est étirée à la hauteur de sa rangée par la
      // grille, mais la CARTE qu'elle enveloppe garderait sa hauteur naturelle —
      // on verrait la tuile s'étirer sous une carte qui, elle, s'arrête plus
      // haut. Le fond de verre doit aller jusqu'à l'arête de la rangée.
      className={cn(SPAN_CLASSES[span], 'lg:[&>*]:h-full', className)}
    >
      {children}
    </div>
  );
}

/**
 * Colonne de cartes empilées à l'intérieur d'une tuile.
 *
 * POURQUOI : une grille CSS ne remplit jamais le vide VERTICAL sous une carte
 * courte posée à côté d'une carte haute — la hauteur de rangée est celle de la
 * plus haute, et `align-items: start` laisse le reste vide. À côté de
 * l'hexagramme (un carré de 460 px), la carte des sauvegardes ouvrait ainsi
 * une colonne vide de plusieurs centaines de pixels. Empiler plusieurs cartes
 * courtes dans la même tuile comble ce vide, ce que le placement dense ne peut
 * pas faire tout seul.
 *
 * La pile porte elle-même `data-hide-if-empty` : quand toutes ses cartes ont
 * rendu `null`, la règle imbriquée de `globals.css` retire la tuile entière.
 * Sans elle, une pile vide restait un élément — donc une tuile « pleine », donc
 * la cellule fantôme que la primitive existe pour supprimer.
 */
export function BentoStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      data-hide-if-empty=""
      // La DERNIÈRE carte de la pile absorbe la hauteur restante. Sans ça, une
      // pile plus courte que la tuile qu'elle remplit (le cas du Magicien : une
      // barre de stats de 200 px dans une tuile de 484 px calée sur le cercle)
      // laissait un trou de fond de page entre la dernière carte et l'arête de
      // la rangée — le décrochement qu'on venait justement de supprimer entre
      // tuiles se réinstallait À L'INTÉRIEUR de la tuile.
      className={cn(
        'flex h-full flex-col gap-3 lg:gap-4',
        'lg:[&>*:last-child]:flex-1',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Groupe d'accessoires en fin de mosaïque — cartes optionnelles dont on ne sait
 * pas combien seront rendues (ordres, invocations, don d'origine…).
 *
 * POURQUOI ce n'est pas une suite de tuiles d'un tiers : une grille CSS ne sait
 * pas élargir un orphelin sur les pistes restantes. Trois cartes d'un tiers font
 * une rangée pleine ; UNE seule laisse deux tiers de vide en bas de page — c'est
 * ce qu'on voyait sous « Manifestations occultes » chez l'occultiste. Le groupe
 * prend une rangée pleine et répartit ses cartes en `auto-fit` : à une carte
 * elle occupe toute la largeur, à deux elles font deux moitiés, à trois deux
 * tiers-et-un. Aucun cas ne laisse de trou.
 */
export function BentoCluster({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      data-hide-if-empty=""
      className={cn(
        'flex flex-col gap-3',
        'lg:grid lg:grid-cols-[repeat(auto-fit,minmax(320px,1fr))] lg:items-stretch lg:gap-4',
        'lg:[&>*]:h-full',
        className,
      )}
    >
      {children}
    </div>
  );
}
