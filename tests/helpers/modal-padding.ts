import { expect } from 'vitest';

/**
 * Garde-fou « le contenu d'une modale ne touche pas ses bordures ».
 *
 * `<DetailModal>` est délibérément SANS padding : le panneau est une coquille
 * (bordure, fond, scroll, bouton ✕ en absolu) et chaque appelant pose son propre
 * gabarit — il y a 14 valeurs de padding différentes en usage, du `p-4` d'une
 * confirmation au `p-8` d'un détail de sort. Remonter une valeur par défaut dans
 * la primitive changerait l'allure de 42 écrans.
 *
 * Le prix de ce choix : un appelant peut OUBLIER son padding, et rien ne le
 * rattrape. C'est arrivé trois fois (Identité, Ajouter un sort, pacte du Tome) —
 * le titre sortait littéralement du panneau par la gauche, en bottom-sheet
 * mobile où le panneau est collé au bord de l'écran.
 *
 * Ce helper vérifie le rendu, pas la source : il descend au premier enfant de
 * contenu du panneau (le ✕ absolu est ignoré) et exige qu'il porte un padding
 * horizontal ET vertical. Une modale qui délègue à une coquille padante
 * (`CodexModalShell`, `HelpPanel`) passe donc sans rien changer, puisque c'est
 * la racine DOM rendue qui est inspectée.
 */

/** `p-6`, `px-5`, `py-6`, `p-[18px]`, `sm:p-7`… — variantes responsive comprises. */
function paddingSides(className: string): { x: boolean; y: boolean } {
  let x = false;
  let y = false;
  for (const token of className.split(/\s+/)) {
    // On retire un éventuel préfixe de variante (`sm:`, `lg:`, `md:`…).
    const utility = token.includes(':') ? token.slice(token.lastIndexOf(':') + 1) : token;
    const match = /^p([xytb]?)-\[?[\w.]+\]?$/.exec(utility);
    if (!match) continue;
    const side = match[1];
    if (side === '' || side === 'x') x = true;
    if (side === '' || side === 'y' || side === 't' || side === 'b') y = true;
  }
  return { x, y };
}

/**
 * Le contenu de la modale ouverte porte-t-il un padding sur les deux axes ?
 *
 * @param label Nom de la modale, pour que l'échec dise laquelle est en cause.
 */
export function expectModalContentPadded(label: string): void {
  const root = document.querySelector('[data-detail-modal]');
  expect(root, `${label} : aucune modale ouverte`).not.toBeNull();

  const panel = root!.firstElementChild;
  expect(panel, `${label} : la modale n'a pas de panneau`).not.toBeNull();

  // Le ✕ est positionné en absolu par la primitive — il ne compte pas comme
  // contenu, et son propre padding ne protège rien.
  const content = Array.from(panel!.children).find(
    (el) => !el.className.includes('absolute'),
  );
  expect(content, `${label} : le panneau n'a aucun contenu`).toBeDefined();

  const { x, y } = paddingSides(content!.className);
  expect(
    x,
    `${label} : le contenu touche les bordures gauche/droite du panneau ` +
      `(classes : « ${content!.className} »)`,
  ).toBe(true);
  expect(
    y,
    `${label} : le contenu touche les bordures haute/basse du panneau ` +
      `(classes : « ${content!.className} »)`,
  ).toBe(true);
}
