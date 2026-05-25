import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, wizardL5DamageD1 } from './seed-character';

/**
 * Plan D1 — UAT visuel de la section « Dégâts » de `SpellDetailModal`.
 *
 * 4 captures : (1) liste avec chips dégâts visibles, (2) Boule de feu (slot
 * base L3 = 8d6 feu), (3) Trait de feu cantrip scaling à L5 = 2d10 feu,
 * (4) Projectile magique auto-hit + condition.
 *
 * Convention CLAUDE.md 2026-05-19/20 (modales) : pleine page POUR le contenu
 * textuel exhaustif (modale haute, scrollable), viewport POUR le ressenti
 * d'overlay (backdrop + ancrage `items-end` mobile).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

interface UatCase {
  readonly slug: string;
  readonly spellNameFr: string;
  readonly expectedFormulaSubstring: string;
  readonly description: string;
}

const CASES: readonly UatCase[] = [
  {
    slug: '02-fireball-L3-base',
    spellNameFr: 'Boule de feu',
    expectedFormulaSubstring: '8d6',
    description:
      'Magicien L5 → tap sur « Boule de feu » → modale ouvre la section Dégâts canonique (8d6 feu, jet de sauvegarde, formule de base au niveau 3, perLevel +1d6 expliqué)',
  },
  {
    slug: '03-fire-bolt-cantrip-scaling',
    spellNameFr: 'Trait de feu',
    expectedFormulaSubstring: '2d10',
    description:
      'Magicien L5 → tap sur « Trait de feu » (cantrip) → modale ouvre la section Dégâts avec 2d10 feu (tier 2 par scaling cantrip), jet d’attaque, progression cantrip listée',
  },
  {
    slug: '04-magic-missile-auto-hit',
    spellNameFr: 'Projectile magique',
    expectedFormulaSubstring: '1d4+1',
    description:
      'Magicien L5 → tap sur « Projectile magique » → modale ouvre la section Dégâts avec 1d4+1 force, touche automatique, condition « 3 projectiles » décrite',
  },
];

test.describe('UAT visuel D1 — section Dégâts canoniques de la modale détail sort', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). UAT skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('01-spell-list-with-damage-chips — Magicien L5 → Magie → liste avec chips dégâts visibles', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL5DamageD1);
    await page.goto(`/character/${charId}`);
    await expect(
      page.getByText(wizardL5DamageD1.name).first(),
      'La hero card doit afficher le nom du PJ seedé.',
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('tab', { name: /^Magie$/i }).click();

    // Liste doit afficher au moins les chips Boule de feu (8d6 feu) +
    // Projectile magique (1d4+1 force) + Trait de feu (1d10 feu).
    await expect(
      page.getByText(/8d6.*feu/).first(),
      'La SpellList doit afficher un chip « 8d6 feu » pour Boule de feu.',
    ).toBeVisible();

    const buffer = await page.screenshot({ fullPage: true, animations: 'disabled' });
    writeFileSync(path.join(UAT_DIR, '01-spell-list-with-damage-chips.png'), buffer);
  });

  for (const uat of CASES) {
    test(`${uat.slug} — ${uat.description}`, async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);
      const { charId } = await seedCharacter(page, wizardL5DamageD1);
      await page.goto(`/character/${charId}`);
      await expect(
        page.getByText(wizardL5DamageD1.name).first(),
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole('tab', { name: /^Magie$/i }).click();
      await page.getByText(uat.spellNameFr, { exact: false }).first().click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const card = dialog.getByTestId('spell-damage-card');
      await expect(card, 'la section Dégâts doit être rendue').toBeVisible();
      await expect(
        card.getByTestId('spell-damage-formula').first(),
        `la formule canonique doit contenir « ${uat.expectedFormulaSubstring} »`,
      ).toContainText(uat.expectedFormulaSubstring);

      // Neutralisation overflow double (cf. UAT D14 pattern documented in
      // CLAUDE.md 2026-05-20)
      await dialog.evaluate((el: Element) => {
        const root = el as HTMLElement;
        root.style.maxHeight = 'none';
        root.style.overflow = 'visible';
        for (const desc of root.querySelectorAll<HTMLElement>('*')) {
          const cs = window.getComputedStyle(desc);
          if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
            desc.style.overflow = 'visible';
          }
          if (cs.maxHeight && cs.maxHeight !== 'none') {
            desc.style.maxHeight = 'none';
          }
          if (cs.flex && cs.flex !== '0 1 auto') {
            desc.style.flex = 'initial';
          }
        }
      });
      const docHeight = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      await page.setViewportSize({
        width: 412,
        height: Math.max(900, docHeight + 100),
      });
      const fullPageBuffer = await page.screenshot({
        fullPage: true,
        animations: 'disabled',
      });
      writeFileSync(path.join(UAT_DIR, `${uat.slug}-pleine-page.png`), fullPageBuffer);

      // Restore + viewport-only
      await dialog.evaluate((el: Element) => {
        const root = el as HTMLElement;
        root.style.maxHeight = '';
        root.style.overflow = '';
        for (const desc of root.querySelectorAll<HTMLElement>('*')) {
          desc.style.overflow = '';
          desc.style.maxHeight = '';
          desc.style.flex = '';
        }
      });
      await page.setViewportSize({ width: 412, height: 869 });
      const viewportBuffer = await page.screenshot({
        fullPage: false,
        animations: 'disabled',
      });
      writeFileSync(path.join(UAT_DIR, `${uat.slug}-viewport.png`), viewportBuffer);
    });
  }
});
