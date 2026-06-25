import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, wizardSigilShowcase } from './seed-character';

/**
 * Plan 38 — UAT visuel des sceaux de sort procéduraux.
 *
 * Pour chaque école, on lance un sort réel depuis la fiche (vrai câblage
 * `handleCast` → `triggerCastSigil`) et on capture l'overlay de sceau. Les
 * 5 sorts sont sans dégâts → branche « toast » de `handleCast`, aucune modale
 * de jet ne recouvre le sceau (capture propre, indépendante du mode de dés).
 *
 * Technique de capture : l'overlay s'auto-retire après ~2,6 s et anime son
 * tracé. On gèle donc son état (animations off, tracé complet, éclat visible)
 * via une feuille de style injectée juste après l'apparition, puis on capture
 * en **viewport** (le ressenti d'un overlay plein écran se lit en viewport, cf.
 * CLAUDE.md > captures de modales/overlays).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review', 'spell-sigils');

const FREEZE_CSS = `
  [data-testid="spell-sigil-overlay"] * { animation: none !important; }
  [data-testid="spell-sigil-overlay"] path { stroke-dashoffset: 0 !important; }
  [data-testid="spell-sigil-overlay"] [data-testid="sigil-flare"] { opacity: 0.55 !important; }
`;

interface SigilCase {
  readonly slug: string;
  readonly spellNameFr: string;
  readonly school: string;
}

const CASES: readonly SigilCase[] = [
  { slug: '01-evocation-lumiere', spellNameFr: 'Lumière', school: 'evocation' },
  { slug: '02-illusion-illusion-mineure', spellNameFr: 'Illusion mineure', school: 'illusion' },
  { slug: '03-abjuration-bouclier', spellNameFr: 'Bouclier', school: 'abjuration' },
  { slug: '04-conjuration-graisse', spellNameFr: 'Graisse', school: 'conjuration' },
  { slug: '05-divination-detection', spellNameFr: 'Détection de la magie', school: 'divination' },
];

async function openMagieAndCast(page: Page, spellNameFr: string): Promise<void> {
  const { charId } = await seedCharacter(page, wizardSigilShowcase);
  await page.goto(`/character/${charId}`);
  await expect(page.getByText(wizardSigilShowcase.name).first()).toBeVisible({ timeout: 10_000 });
  await page.getByRole('tab', { name: /^Magie$/i }).click();
  await page.getByText(spellNameFr, { exact: false }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /^Lancer$/ }).click();
}

test.describe('UAT visuel plan 38 — sceaux de sort procéduraux', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). UAT skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  for (const c of CASES) {
    test(`${c.slug} — ${c.spellNameFr} (${c.school})`, async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      await openMagieAndCast(page, c.spellNameFr);

      const overlay = page.getByTestId('spell-sigil-overlay');
      await expect(overlay, 'le sceau doit apparaître après le lancement').toBeVisible();
      // Identité (content-truth cat. 2) : le sceau porte bien l'école du sort.
      await expect(overlay).toHaveAttribute('data-school', c.school);

      await page.addStyleTag({ content: FREEZE_CSS });
      const buffer = await page.screenshot({ fullPage: false, animations: 'disabled' });
      writeFileSync(path.join(UAT_DIR, `${c.slug}-viewport.png`), buffer);
    });
  }

  test('06-reduced-motion — sceau statique (prefers-reduced-motion)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await waitForAppReady(page);
    await openMagieAndCast(page, 'Bouclier');

    const overlay = page.getByTestId('spell-sigil-overlay');
    await expect(overlay).toBeVisible();
    // En mouvement réduit, aucun chemin n'a la classe de tracé animé.
    await expect(overlay.locator('path.animate-trace-sigil')).toHaveCount(0);

    const buffer = await page.screenshot({ fullPage: false, animations: 'disabled' });
    writeFileSync(path.join(UAT_DIR, '06-reduced-motion-viewport.png'), buffer);
  });
});
