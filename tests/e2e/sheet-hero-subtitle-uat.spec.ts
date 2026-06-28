import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, type SeedPreset } from './seed-character';

/**
 * UAT « polish fiche » — deux améliorations de mise en page de la fiche :
 *
 *  1. Hero card — ligne d'identité : la sous-classe est résolue À L'IDENTIQUE
 *     du bundle (« Voie du Berserker ») au lieu du slug brut capitalisé
 *     (« Path of the berserker », qui fuitait l'anglais en FR). Le niveau est
 *     localisé (« Niveau {n} »). Plus de double séparateur « · · » quand la
 *     sous-classe manque.
 *  2. StatusStrip — sur desktop (sidebar 300-320px), le strip passe en grille
 *     2×2 (`lg:grid-cols-2`) au lieu de 4 cellules tassées sur une rangée.
 *
 * Captures écrites À PLAT dans `uat-review/` (convention projet).
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

/** Barbare niv. 3 — Voie du Berserker : la seule fixture avec une sous-classe. */
const berserkerL3: SeedPreset = {
  name: 'Kethra Brise-Crâne',
  classes: [{ classId: 'barbarian', subclassId: 'path-of-the-berserker', level: 3 }],
  primaryClassId: 'barbarian',
  ancestryId: 'human',
  backgroundId: 'soldier',
  abilities: { for: 16, dex: 14, con: 15, int: 8, sag: 12, cha: 10 },
  hp: { current: 32, max: 32 },
  ac: 14,
  speed: 30,
  initiative: 2,
  hitDice: [{ classId: 'barbarian', current: 3, max: 3, die: 'd12' }],
  saves: { for: true, con: true },
};

test.describe('UAT polish fiche — hero subtitle + status strip desktop', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(!ok, 'Firestore emulator unreachable. Run `pnpm e2e:emulators` first.');
  });

  test('hero subtitle (mobile) + status strip 2×2 (desktop)', async ({ page }) => {
    test.setTimeout(180_000);
    mkdirSync(UAT_DIR, { recursive: true });

    await page.goto('/');
    await waitForAppReady(page);
    const { charId } = await seedCharacter(page, berserkerL3);

    // 1. Mobile — sous-titre « Barbare · Voie du Berserker · Niveau 3 ».
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);
    await page.waitForTimeout(250);
    writeFileSync(
      path.join(UAT_DIR, '01-hero-sous-classe-niveau-mobile.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );

    // 2. Desktop 1280 — sidebar : hero + status strip en grille 2×2 + onglets verticaux.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);
    await page.waitForTimeout(250);
    writeFileSync(
      path.join(UAT_DIR, '02-sidebar-desktop-1280-statut-2x2.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );

    // 3. Desktop 1440 — sidebar 320px, même grille 2×2.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/character/${charId}`);
    await waitForAppReady(page);
    await page.waitForTimeout(250);
    writeFileSync(
      path.join(UAT_DIR, '03-sidebar-desktop-1440-statut-2x2.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );
  });
});
