import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, wizardL5DamageD1 } from './seed-character';

/**
 * Garde-fou — AUCUN écran ne déborde horizontalement.
 *
 * Le bug signalé en UAT : « certaines pages ont du contenu vide sur la droite
 * et peuvent être scrollées horizontalement ». C'est un défaut mobile-first
 * majeur : sur téléphone, un débordement de quelques pixels décale la page
 * entière et le contenu réel se retrouve tronqué à droite.
 *
 * **Pourquoi ce test ne mesure PAS `scrollWidth`.** `globals.css` pose
 * `overflow-x: clip` sur `html, body` — le débordement ne produit donc PLUS de
 * barre de défilement, et `document.documentElement.scrollWidth` reste égal à
 * `clientWidth` même quand un enfant déborde franchement. Le `clip` **masque le
 * symptôme sans corriger la cause** : le contenu qui dépasse devient
 * inatteignable au lieu d'être atteignable en scrollant. C'est pire, et c'est
 * silencieux.
 *
 * On mesure donc ce qui compte réellement : la **bounding box de chaque élément
 * visible**. Tout élément dont le bord droit dépasse la largeur du viewport
 * (au-delà de la tolérance sub-pixel) est un débordement, `clip` ou pas.
 *
 * Le rapport d'échec liste les coupables (tag + classes + bord droit) pour que
 * la correction soit immédiate — un « ça déborde quelque part » n'aide personne.
 */

/** Tolérance sub-pixel : Chromium reporte parfois +0,5 px sur les bordures. */
const TOLERANCE_PX = 1.5;

type Measure = {
  readonly clientWidth: number;
  readonly bodyScrollWidth: number;
  readonly offenders: readonly string[];
};

/**
 * Mesure le débordement du document et, s'il y en a, nomme les coupables.
 *
 * L'assertion porte sur `document.body.scrollWidth` : c'est **exactement** ce
 * que capture une capture pleine page, donc exactement la bande vide à droite
 * que l'utilisateur voit. (`documentElement.scrollWidth` ne sert à rien ici :
 * `overflow-x: clip` sur `html` le ramène toujours à `clientWidth`.)
 *
 * La liste de coupables n'est qu'un outil de diagnostic joint au message
 * d'échec. Elle ignore volontairement :
 *   - les sous-arbres `position: fixed` — les couches décoratives (aurore,
 *     géométrie sacrée, particules) débordent PAR CONSTRUCTION pour saigner
 *     hors cadre, et un `fixed` ne participe pas au défilement du document ;
 *   - les descendants d'un conteneur à défilement horizontal assumé
 *     (`overflow-x: auto|scroll`) — une rangée de filtres qui défile est un
 *     choix de design.
 */
async function measureOverflow(page: Page): Promise<Measure> {
  return page.evaluate((tolerance) => {
    const clientWidth = document.documentElement.clientWidth;
    const offenders: string[] = [];

    const isExcluded = (el: Element): boolean => {
      let node: Element | null = el;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (style.position === 'fixed') return true;
        if (node !== el) {
          const overflowX = style.overflowX;
          if (overflowX === 'auto' || overflowX === 'scroll') return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.right <= clientWidth + tolerance) continue;
      if (isExcluded(el)) continue;

      const cls =
        typeof el.className === 'string' ? el.className.slice(0, 160) : '(svg)';
      offenders.push(
        `<${el.tagName.toLowerCase()} class="${cls}"> right=${Math.round(rect.right)} w=${Math.round(rect.width)}`,
      );
    }

    return {
      clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      offenders,
    };
  }, TOLERANCE_PX);
}

/** Assertion partagée — message d'échec exploitable directement. */
export async function expectNoHorizontalOverflow(
  page: Page,
  label: string,
): Promise<void> {
  const { clientWidth, bodyScrollWidth, offenders } =
    await measureOverflow(page);
  const report = offenders.map((o) => `  • ${o}`).join('\n');

  expect(
    bodyScrollWidth,
    `${label} — le document déborde de ${bodyScrollWidth - clientWidth}px ` +
      `(défilable ${bodyScrollWidth}px pour un viewport de ${clientWidth}px). ` +
      `Coupables probables :\n${report || '  (aucun élément identifié — vérifier une marge/largeur en %)'}`,
  ).toBeLessThanOrEqual(clientWidth + TOLERANCE_PX);
}

test.describe('Garde-fou — aucun débordement horizontal', () => {
  test('Écrans publics (sans seed)', async ({ page }) => {
    for (const route of ['/', '/codex', '/account', '/create', '/campaigns']) {
      await page.goto(route);
      await waitForAppReady(page);
      await expectNoHorizontalOverflow(page, `route ${route}`);
    }
  });

  test('Codex — chaque catégorie', async ({ page }) => {
    await page.goto('/codex');
    await waitForAppReady(page);

    // Le Codex empile filtres + rangées de chips ; c'est le candidat #1 au
    // débordement puisque chaque catégorie change la barre de filtres.
    const categories = page.getByRole('tab');
    const count = await categories.count();
    for (let i = 0; i < count; i += 1) {
      const tab = categories.nth(i);
      const name = (await tab.textContent())?.trim() ?? `#${i}`;
      await tab.click();
      await page.waitForTimeout(150);
      await expectNoHorizontalOverflow(page, `Codex › ${name}`);
    }
  });

  test('Fiche personnage — les 5 modes', async ({ page }) => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable. Run `pnpm e2e:emulators`.');

    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL5DamageD1);

    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);

    for (const mode of ['Combat', 'Magie', 'Essence', 'Avoir', 'Âme']) {
      const tab = page.getByRole('tab', { name: new RegExp(`^${mode}$`, 'i') });
      if (!(await tab.isVisible().catch(() => false))) continue;
      await tab.click();
      await page.waitForTimeout(200);
      await expectNoHorizontalOverflow(page, `Fiche › ${mode}`);
    }
  });
});
