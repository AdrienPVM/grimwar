import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import {
  fighterL1DefenseBare,
  fighterL1DefenseChainmail,
  seedCharacter,
  wizardL1LeatherArmor,
  type SeedPreset,
} from './seed-character';

/**
 * Plan 13.14b commit 3 — UAT visuel des dérives D19 (Fighting Style Defense
 * +1 CA) et D20 (`acFromArmor` câblé dans StatusStrip). Trois personas, six
 * captures (pleine page + viewport mobile par persona). Sortie directe dans
 * `uat-review/` à la racine — le dossier est gitignored et Adrien valide
 * visuellement.
 *
 * **Pourquoi une spec dédiée et non `takeStepScreenshot`** : la convention
 * d'UAT acte 2026-05-19 demande des captures NOMMÉES manuellement dans un
 * dossier dédié, dans l'ordre où Adrien doit les regarder. Le helper
 * `takeStepScreenshot` écrit dans `test-results/screenshots/<spec-slug>/` —
 * utile pour l'archivage e2e mais pas pour l'UAT humain.
 *
 * **Pleine page + viewport mobile** : la pleine page restitue l'ensemble de
 * la fiche scrollable ; la viewport (= taille Pixel 7 imposée par le projet
 * Playwright) restitue ce qu'Adrien VOIT sans scroller. StatusStrip est en
 * haut de page → la viewport suffit en théorie, mais la pleine page reste
 * utile pour vérifier l'absence de régression ailleurs dans la fiche.
 *
 * Re-tournée à chaque `pnpm test:e2e` — toute régression visuelle sur la CA
 * sera figée dans la prochaine capture, ce qui sert de garde-fou en plus du
 * test unitaire.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review');

interface UatCase {
  readonly slug: string;
  readonly preset: SeedPreset;
  readonly expectedAcText: string;
  readonly description: string;
}

const CASES: readonly UatCase[] = [
  {
    slug: '01-fighter-defense-chainmail',
    preset: fighterL1DefenseChainmail,
    expectedAcText: '17',
    description:
      "Guerrier·Defense + cotte de mailles équipée → CA 17 (16 armure + 0 DEX capé + 1 Defense)",
  },
  {
    slug: '02-fighter-defense-bare',
    preset: fighterL1DefenseBare,
    expectedAcText: '12',
    description:
      "Guerrier·Defense sans armure équipée → CA 12 désarmée (10+DEX, ZÉRO bonus Defense)",
  },
  {
    slug: '03-wizard-leather-armor',
    preset: wizardL1LeatherArmor,
    expectedAcText: '13',
    description:
      "Magicien + armure de cuir équipée → CA 13 (11+DEX), pas de Defense (classe non-Guerrier)",
  },
];

test.describe('UAT visuel D19/D20 — StatusStrip CA dérivée', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). UAT skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  for (const uat of CASES) {
    test(`${uat.slug} — ${uat.description}`, async ({ page }) => {
      await page.goto('/');
      await waitForAppReady(page);

      const { charId } = await seedCharacter(page, uat.preset);
      await page.goto(`/character/${charId}`);

      // Attente : hero card rend le nom du PJ = la fiche est chargée et les
      // hooks (useInventoryDerived → computeDisplayedAc) ont eu lieu.
      await expect(
        page.getByText(uat.preset.name).first(),
        'La hero card doit afficher le nom du PJ seedé.',
      ).toBeVisible({ timeout: 10_000 });

      // Sanity-check : la CA affichée correspond à la valeur attendue AVANT
      // de capturer — pas de capture muette d'un bug visuel. Le sélecteur
      // limite la recherche à la grille de status (max-w-[420px], grid-cols-4)
      // pour éviter de matcher un autre "17" dans la fiche.
      const statusStrip = page.getByLabel(/Statistiques vitales/i);
      await expect(
        statusStrip.getByText(uat.expectedAcText, { exact: true }),
        `La CA affichée doit valoir ${uat.expectedAcText} pour ${uat.slug}.`,
      ).toBeVisible();

      // Pleine page : tout le document scrollable. `animations: 'disabled'`
      // évite qu'un fade en cours produise une capture intermédiaire.
      const fullPageBuffer = await page.screenshot({
        fullPage: true,
        animations: 'disabled',
      });
      writeFileSync(path.join(UAT_DIR, `${uat.slug}-pleine-page.png`), fullPageBuffer);

      // Viewport Pixel 7 (375 × 667 par défaut côté Playwright devices) — ce
      // que voit Adrien sur mobile sans scroller.
      const viewportBuffer = await page.screenshot({
        fullPage: false,
        animations: 'disabled',
      });
      writeFileSync(path.join(UAT_DIR, `${uat.slug}-viewport.png`), viewportBuffer);
    });
  }
});
