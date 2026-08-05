import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { rogueL1Expertise, seedCharacter } from './seed-character';

/**
 * UAT — les dés numériques prennent du volume.
 *
 * Ce que la spec doit prouver AU-DELÀ des tests unitaires : les unitaires
 * vérifient la géométrie et le choix de la face, mais ils tournent sous jsdom,
 * qui ne compose aucune transformation 3D. Seul un vrai navigateur dit si le
 * solide a l'air d'un solide.
 *
 * **Le piège du gel.** Le plateau se retire tout seul au bout de 2,2 s et sa
 * dernière image est `opacity: 0`. Or `page.screenshot({ animations:
 * 'disabled' })` projette chaque animation à son état FINAL — capturer sans
 * précaution donne donc une image vide, et l'échec ressemble à « les dés ne
 * s'affichent pas ». On neutralise donc les animations par CSS avant de
 * capturer : les dés restent visibles, posés sur leur face finale, qui est
 * précisément ce qu'il faut juger.
 */

async function uatShot(
  page: Page,
  name: string,
  opts: { viewport?: boolean } = {},
): Promise<void> {
  const dir = 'uat-review';
  mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: !opts.viewport,
    animations: 'disabled',
  });
}

/**
 * Fige le plateau sur son état posé (cf. le piège décrit en tête de fichier).
 *
 * Le toast est figé du même coup : il s'efface lui aussi en fin d'animation, et
 * une capture sans lui montrerait des dés orphelins au milieu de l'écran au
 * lieu de la vraie composition « les dés au-dessus, le total en dessous ».
 */
async function freezeTray(page: Page): Promise<void> {
  // On attend un SIGNAL, pas une durée.
  //
  // La culbute est peinte image par image sur un canevas : `animations:
  // 'disabled'` ne l'arrête pas, et une attente à l'estime est fausse deux fois
  // — trop courte sur une machine chargée, trop longue face au plateau qui se
  // retire de lui-même au bout de 2,2 s. C'est exactement ce qui a fait tomber
  // cette spec sous la charge d'un run complet, alors qu'elle passait seule.
  // Chaque dé annonce donc sa pose, et le total du toast la sienne.
  for (const die of await page.getByTestId('die-3d').all()) {
    await expect(die).toHaveAttribute('data-settled', 'true');
  }
  await expect(page.getByTestId('toast-total')).not.toHaveClass(/opacity-70/);
  await page.addStyleTag({
    content: `
      .dice-tray-life { animation: none !important; opacity: 1 !important; transform: none !important; }
      .die3d-drop { animation: none !important; opacity: 1 !important; transform: none !important; }
      .toast-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
    `,
  });
}

/** Ouvre le menu radial et choisit une entrée par son libellé. */
async function pickFromFab(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: /Ouvrir le menu/i }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: label, exact: true })
    .click();
}

async function freeRoll(page: Page, formula: string): Promise<void> {
  await pickFromFab(page, 'Jet libre');
  const input = page.getByTestId('free-roll-input');
  await expect(input).toBeVisible();
  await input.fill(formula);
  await page.getByTestId('free-roll-submit').click();
  await expect(page.getByTestId('free-roll-input')).toHaveCount(0);
}

test.describe('UAT — dés en relief', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+).',
    );
  });

  test('un jet numérique fait tomber des dés, posés sur la face tirée', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, rogueL1Expertise);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(rogueL1Expertise.name).first()).toBeVisible({
      timeout: 10_000,
    });

    // 1 — un d20 seul : la forme de référence.
    await freeRoll(page, '1d20+3');
    const tray = page.getByTestId('dice-tray');
    await expect(tray).toBeVisible();
    await freezeTray(page);
    await uatShot(page, '03-un-d20-pose', { viewport: true });

    // Le dé affiché porte EXACTEMENT la face que le moteur a tirée : on la lit
    // dans le DOM plutôt que de faire confiance à l'image.
    const die = tray.getByTestId('die-3d').first();
    const face = await die.getAttribute('data-face');
    expect(Number(face)).toBeGreaterThanOrEqual(1);
    expect(Number(face)).toBeLessThanOrEqual(20);

    // Le solide est PEINT, et pas seulement monté. Un canevas vierge est le mode
    // de panne propre au tracé sur canevas : le DOM est intact, les attributs
    // justes, et il n'y a rien à l'écran. Le seul moyen honnête de l'exclure est
    // de compter les pixels réellement couverts.
    const coverage = await die.locator('canvas').evaluate((node) => {
      const canvas = node as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let opaque = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! > 8) opaque += 1;
      return opaque / (canvas.width * canvas.height);
    });
    // Un dé occupe une bonne part de sa boîte sans la remplir — il est convexe
    // mais pas carré.
    expect(coverage).toBeGreaterThan(0.25);
    expect(coverage).toBeLessThan(0.95);
  });

  test('les six solides ont chacun leur forme', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, rogueL1Expertise);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(rogueL1Expertise.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await freeRoll(page, '1d4+1d6+1d8+1d10+1d12+1d20');
    const tray = page.getByTestId('dice-tray');
    await expect(tray).toBeVisible();
    await expect(tray.getByTestId('die-3d')).toHaveCount(6);

    // Tétraèdre, cube, octaèdre, trapézoèdre, dodécaèdre, icosaèdre — dans
    // l'ordre de la formule.
    const sides = await tray
      .getByTestId('die-3d')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-sides')));
    expect(sides).toEqual(['4', '6', '8', '10', '12', '20']);

    await freezeTray(page);

    // Le total annoncé doit être EXACTEMENT la somme des faces posées. C'est
    // l'invariant qui compte pour un joueur : des dés décoratifs qui ne
    // totalisent pas le résultat feraient douter du calcul à chaque jet.
    const faces = await tray
      .getByTestId('die-3d')
      .evaluateAll((nodes) =>
        nodes.map((n) => Number(n.getAttribute('data-face'))),
      );
    const sum = faces.reduce((a, b) => a + b, 0);
    await expect(page.getByRole('status').locator('.sr-only')).toHaveText(
      String(sum),
    );
    // Et le total VU par le joueur dit la même chose que celui annoncé au
    // lecteur d'écran. Le compteur du toast défile avant de se poser : s'il
    // restait bloqué sur une face intermédiaire, le joueur lirait un total qui
    // ne correspond ni à ses dés ni au détail affiché juste en dessous.
    await expect(page.getByTestId('toast-total')).toHaveText(String(sum));

    await uatShot(page, '04-les-six-solides', { viewport: true });
  });

  test('l’avantage montre les deux dés, celui qu’on écarte en retrait', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, rogueL1Expertise);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(rogueL1Expertise.name).first()).toBeVisible({
      timeout: 10_000,
    });

    await freeRoll(page, '2d20kh1+5');
    const tray = page.getByTestId('dice-tray');
    await expect(tray.getByTestId('die-3d')).toHaveCount(2);

    // Exactement un dé écarté : voir tomber celui qu'on évite fait partie du
    // plaisir de l'avantage, mais il ne doit pas se confondre avec le retenu.
    const kept = await tray
      .getByTestId('die-3d')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-kept')));
    expect(kept.filter((k) => k === 'true')).toHaveLength(1);
    expect(kept.filter((k) => k === 'false')).toHaveLength(1);

    await freezeTray(page);
    await uatShot(page, '05-avantage-deux-d20', { viewport: true });
  });

  test('le réglage de Compte éteint et rallume les dés en relief', async ({
    page,
  }) => {
    await page.goto('/account');
    await waitForAppReady(page);
    const toggle = page.getByRole('checkbox', { name: 'Dés en relief' });
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    await uatShot(page, '06-reglage-des-en-relief');

    const { charId } = await seedCharacter(page, rogueL1Expertise);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(rogueL1Expertise.name).first()).toBeVisible({
      timeout: 10_000,
    });
    await freeRoll(page, '1d20');
    // Le jet aboutit — seul le décor disparaît.
    await expect(page.getByText('Jet libre').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId('dice-tray')).toHaveCount(0);
  });
});
