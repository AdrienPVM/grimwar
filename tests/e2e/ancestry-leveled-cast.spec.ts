import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { seedCharacter, tieflingL5Infernal } from './seed-character';

/**
 * D12b — lancement des sorts d'ascendance à recharge limitée.
 *
 * Régression couverte : avant ce câblage, le bouton « Lancer » d'un sort
 * d'héritage de niveau ≥ 1 (Tieffelin / Elfe L3-L5) était désactivé en dur
 * (« pas encore implémenté »). On seed un Tieffelin Infernal Roublard L5
 * (non-caster), on ouvre Représailles infernales (L1, 1×/repos long), et on
 * vérifie le cycle complet contre les VRAIES security rules de l'émulateur :
 *
 *   1. bouton « Lancer » ACTIF + indicateur de quota « 1 / 1 · par repos long » ;
 *   2. cast → sceau de sort (preuve que `handleCast` est passé) ;
 *   3. round-trip Firestore : le compteur `featureUsage` décrémenté persiste →
 *      ré-ouvrir le sort montre « Lancer » DÉSACTIVÉ + hint « plus d'usage ».
 *
 * Le propriétaire écrit le patch `featureUsage` sur sa propre fiche → ce test
 * prouve aussi que les security rules autorisent cette écriture.
 */

const UAT_DIR = path.resolve(process.cwd(), 'uat-review', 'ancestry-leveled-cast');

test.describe('D12b — sort d\'ascendance L3 lançable via featureUsage', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable — start it via `pnpm e2e:emulators` (requires Java/JRE 11+). Skipped.',
    );
    mkdirSync(UAT_DIR, { recursive: true });
  });

  test('Tieffelin Infernal L5 lance Représailles infernales puis épuise son quota du jour', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const { charId } = await seedCharacter(page, tieflingL5Infernal);
    await page.goto(`/character/${charId}`);
    await expect(page.getByText(tieflingL5Infernal.name).first()).toBeVisible({
      timeout: 10_000,
    });

    // Onglet Magie puis ouverture du sort d'héritage L3 (Représailles infernales).
    await page.getByRole('tab', { name: /^Magie$/i }).click();
    await page.getByText('Représailles infernales', { exact: false }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // CŒUR DE LA RÉGRESSION : le bouton « Lancer » est désormais ACTIF et
    // l'indicateur de quota remplace le sélecteur d'emplacement.
    const castButton = dialog.getByRole('button', { name: /^Lancer$/ });
    await expect(castButton, 'le bouton « Lancer » doit être actif (1/1 usage)').toBeEnabled({
      timeout: 10_000,
    });
    await expect(dialog.getByText(/1 \/ 1 ·/)).toBeVisible();
    // Pas de sélecteur d'emplacement de classe : un sort d'ascendance ne
    // consomme pas de slot (les pastilles « Niv. N » du picker sont absentes).
    await expect(dialog.getByRole('button', { name: /^Niv\. \d$/ })).toHaveCount(0);

    // Captures UAT : la modale avec quota disponible + Lancer actif.
    writeFileSync(
      path.join(UAT_DIR, '01-represailles-castable-quota-plein.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );
    writeFileSync(
      path.join(UAT_DIR, '02-represailles-castable-viewport.png'),
      await page.screenshot({ fullPage: false, animations: 'disabled' }),
    );

    // Cast → le sceau de sort s'affiche (preuve que `handleCast` a abouti).
    await castButton.click();
    await expect(
      page.getByTestId('spell-sigil-overlay'),
      'le sceau doit apparaître → le cast est passé',
    ).toBeVisible({ timeout: 5_000 });

    // Round-trip Firestore : ré-ouvrir le sort montre le quota épuisé (0/1) et
    // le bouton « Lancer » désactivé avec le hint « plus d'usage ».
    await page.getByText('Représailles infernales', { exact: false }).first().click();
    const dialog2 = page.getByRole('dialog');
    await expect(dialog2).toBeVisible();
    const castButton2 = dialog2.getByRole('button', { name: /^Lancer$/ });
    await expect(
      castButton2,
      'après usage, « Lancer » doit être désactivé (quota épuisé, persisté)',
    ).toBeDisabled({ timeout: 10_000 });
    await expect(castButton2).toHaveAttribute('title', 'Plus aucun usage avant un repos long.');
    await expect(dialog2.getByText(/0 \/ 1 ·/)).toBeVisible();

    writeFileSync(
      path.join(UAT_DIR, '03-quota-epuise-apres-cast.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }),
    );
  });
});
