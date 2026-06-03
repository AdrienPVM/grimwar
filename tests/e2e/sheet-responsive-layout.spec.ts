import { test, expect, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, wizardL5DamageD1 } from './seed-character';

/**
 * Plan 13.14 — Tests structuraux responsive de la fiche (DOM bbox, pas
 * pixel-diff). Garde-fou contre les régressions de layout sur les 4
 * viewports cibles.
 *
 * Assertions :
 *   - Hero card visible sans scroll (bbox.top >= 0 et top < viewport.height).
 *   - À lg+ (1024) : sidebar à gauche de la zone main (aside.left < main.left).
 *   - À lg+ : main col largeur > 400px (la coquille a élargi le contenu).
 *   - À xl+ (1280) : main col largeur > 800px ET grille combat 2-col active.
 *   - Aucun overlap entre les sections-modes et la sidebar (intervalle
 *     horizontal disjoint).
 *
 * Pré-requis : émulateur Firebase (Java 11+).
 */

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-1024', width: 1024, height: 800 },
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

async function gotoSheet(page: Page, charId: string): Promise<void> {
  await page.goto(`/character/${charId}`);
  await waitForAppReady(page);
  // Petite respiration pour laisser les lazy chunks se monter (Pixel 7 emu).
  await page.waitForTimeout(250);
}

test.describe('Plan 13.14 — Sheet responsive structural', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable. Run `pnpm e2e:emulators` first.',
    );
  });

  test('hero card + main col élargissent à lg+ et xl+', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL5DamageD1);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoSheet(page, charId);

      const info = await page.evaluate(() => {
        const hero = document.querySelector('h1#hero-name') as HTMLElement | null;
        const aside = document.querySelector(
          '.sheet-desktop-aside',
        ) as HTMLElement | null;
        const main = document.querySelector(
          '.sheet-desktop-main',
        ) as HTMLElement | null;
        const section = document.querySelector(
          '[id^="sheet-mode-panel-"]',
        ) as HTMLElement | null;
        return {
          inner: { w: window.innerWidth, h: window.innerHeight },
          heroRect: hero?.getBoundingClientRect().toJSON() ?? null,
          asideRect: aside?.getBoundingClientRect().toJSON() ?? null,
          mainRect: main?.getBoundingClientRect().toJSON() ?? null,
          sectionRect: section?.getBoundingClientRect().toJSON() ?? null,
          sectionDisplay: section ? getComputedStyle(section).display : null,
        };
      });

      // 1. Hero card visible sans scroll initial.
      expect(info.heroRect, `hero card existe sur ${vp.name}`).not.toBeNull();
      if (info.heroRect) {
        expect(info.heroRect.top, `${vp.name}: hero top >= 0`).toBeGreaterThanOrEqual(0);
        expect(info.heroRect.top, `${vp.name}: hero top < viewport.h`).toBeLessThan(
          info.inner.h,
        );
      }

      // 2. À lg+ : sidebar à gauche du main (aside.right <= main.left + 1px).
      if (vp.width >= 1024) {
        expect(info.asideRect, `${vp.name}: aside existe`).not.toBeNull();
        expect(info.mainRect, `${vp.name}: main existe`).not.toBeNull();
        if (info.asideRect && info.mainRect) {
          expect(
            info.asideRect.right,
            `${vp.name}: aside.right <= main.left (sidebar à gauche)`,
          ).toBeLessThanOrEqual(info.mainRect.left + 1);
          expect(
            info.mainRect.width,
            `${vp.name}: main col > 400px (élargi vs mobile)`,
          ).toBeGreaterThan(400);
        }
      }

      // 3. À xl+ (1280+) : main col > 800px ; combat mode display = grid.
      if (vp.width >= 1280) {
        expect(info.mainRect, `${vp.name}: main existe`).not.toBeNull();
        if (info.mainRect) {
          expect(
            info.mainRect.width,
            `${vp.name}: xl+ main col > 800px`,
          ).toBeGreaterThan(800);
        }
        expect(info.sectionDisplay, `${vp.name}: combat mode display = grid`).toBe(
          'grid',
        );
      }

      // 4. Mobile (< lg) : pas de sidebar visible (asideRect width = 0 OU n'existe pas).
      if (vp.width < 1024) {
        if (info.asideRect) {
          // À mobile l'aside est rendu mais en flow normal (pas dans la grille).
          // Sa largeur est celle de son contenu mobile. On ne vérifie pas qu'il
          // n'existe pas (il existe dans le DOM), juste qu'il ne se positionne
          // pas comme une sidebar à gauche du main.
          expect(info.asideRect.left, `${vp.name}: aside aligned to viewport`).toBeLessThan(
            info.inner.w,
          );
        }
      }
    }
  });

  test('combat mode : focal cards (HUD + HP) prennent toute la largeur à xl+', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, wizardL5DamageD1);

    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoSheet(page, charId);

    const info = await page.evaluate(() => {
      const section = document.querySelector(
        '#sheet-mode-panel-combat',
      ) as HTMLElement | null;
      if (!section) return null;
      const fullSpanChildren = Array.from(section.children).filter((c) =>
        (c as HTMLElement).className.includes('xl:col-span-2'),
      );
      const sectionW = section.getBoundingClientRect().width;
      return {
        sectionW,
        fullSpanCount: fullSpanChildren.length,
        fullSpanWidths: fullSpanChildren.map((c) =>
          (c as HTMLElement).getBoundingClientRect().width,
        ),
      };
    });

    expect(info, 'combat section existe').not.toBeNull();
    if (!info) return;
    // Au moins 3 cards full-width (BattleHud, HpMegaCard, AttacksList / PartyStrip).
    expect(info.fullSpanCount).toBeGreaterThanOrEqual(3);
    // Chaque full-span prend la pleine largeur de la section (à ±1px près).
    for (const w of info.fullSpanWidths) {
      expect(Math.abs(w - info.sectionW)).toBeLessThanOrEqual(1);
    }
  });
});
