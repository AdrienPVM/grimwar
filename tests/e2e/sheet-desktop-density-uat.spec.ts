import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { fighterL3, seedCharacter, wizardL5DamageD1 } from './seed-character';

/**
 * UAT visuel DEBT D6 — densité desktop de la fiche (plan 13.14).
 *
 * Produit la galerie ordonnée que l'utilisateur doit juger pour CE lot :
 * les 2 modes qui restaient mobile-only à grand écran (Avoir et Magie),
 * capturés AUX 3 viewports qui comptent, plus un témoin mobile qui prouve
 * la non-régression du cas nominal (le MJ joue sur téléphone).
 *
 * Captures `fullPage` (CLAUDE.md 2026-05-19) — la fiche scrolle au niveau du
 * document, aucun overflow interne sur ce chemin, donc `fullPage` suffit.
 *
 * Pré-requis : émulateur Firebase (`pnpm e2e:emulators`, Java 11+).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

/** Viewports de l'UAT D6 — critère 4 de la dette : 1024 / 1440 / 1920. */
const VIEWPORTS = [
  { slug: 'mobile-375', width: 375, height: 812 },
  { slug: 'tablette-1024', width: 1024, height: 900 },
  { slug: 'desktop-1440', width: 1440, height: 900 },
  { slug: 'desktop-1920', width: 1920, height: 1080 },
] as const;

async function openMode(page: Page, charId: string, tab: string): Promise<void> {
  await page.goto(`/character/${charId}`);
  await waitForAppReady(page);
  await page.getByRole('tab', { name: new RegExp(`^${tab}$`, 'i') }).click();
  // Laisse la transition de panneau se poser avant la capture.
  await page.waitForTimeout(350);
}

test.describe('UAT visuel D6 — densité desktop Avoir + Magie', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). UAT skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('galerie Avoir + Magie × 4 viewports', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/');
    await waitForAppReady(page);

    // Guerrier équipé pour l'inventaire, magicien L5 pour la liste de sorts —
    // il faut des listes NON VIDES pour que la densité se voie.
    const { charId: fighterId } = await seedCharacter(page, fighterL3);
    const { charId: wizardId } = await seedCharacter(page, wizardL5DamageD1);

    const shots: { file: string; charId: string; tab: string }[] = [];
    let index = 1;
    for (const mode of [
      { tab: 'Avoir', charId: fighterId, label: 'avoir-inventaire' },
      { tab: 'Magie', charId: wizardId, label: 'magie-sorts' },
    ]) {
      for (const vp of VIEWPORTS) {
        shots.push({
          file: `${String(index).padStart(2, '0')}-${mode.label}-${vp.slug}.png`,
          charId: mode.charId,
          tab: mode.tab,
        });
        index += 1;
      }
    }

    let shotIdx = 0;
    for (const mode of [
      { tab: 'Avoir', charId: fighterId },
      { tab: 'Magie', charId: wizardId },
    ]) {
      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await openMode(page, mode.charId, mode.tab);
        const buffer = await page.screenshot({ fullPage: true, animations: 'disabled' });
        writeFileSync(path.join(UAT_DIR, shots[shotIdx]!.file), buffer);
        shotIdx += 1;
      }
    }

    // Sanity-check : la galerie n'est utile que si les captures desktop
    // montrent VRAIMENT 2 colonnes. On le vérifie sur le dernier état rendu
    // (Magie à 1920) plutôt que de livrer une galerie potentiellement muette.
    const tracks = await page.evaluate(() => {
      const section = document.getElementById('sheet-mode-panel-magie');
      return section
        ? getComputedStyle(section).gridTemplateColumns.split(' ').filter(Boolean).length
        : 0;
    });
    expect(tracks, 'Magie à 1920 doit rendre 2 colonnes de cartes').toBe(2);
  });
});
