import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';
import { takeStepScreenshot } from './helpers/screenshot';

/**
 * Autofill carte depuis un monstre (directive 2026-06-27) — spec e2e.
 *
 * Prouve bout-en-bout, contre Firestore émulateur + vraies security rules, que
 * le bouton « + Bestiaire » de la vue live monte le sélecteur de monstres et le
 * rend (titre + état vide orientant vers l'import de pack).
 *
 * NB — le chemin « monstre → jeton auto-rempli » (kind PNJ, nom dédoublonné,
 * rayon de vision tiré du bloc de stats) est prouvé au niveau composant dans
 * `src/features/map-proto/__tests__/map-live-screen.test.tsx` (bestiaire mocké).
 * Ici le bundle SRD `monsters.json` est vide et aucun pack custom n'est seedé,
 * donc on valide l'ouverture du sélecteur + l'état vide pédagogique — la partie
 * du parcours qui ne dépend PAS d'un bestiaire peuplé.
 *
 * Pré-requis : émulateur Firebase actif (Auth + Firestore). Sans lui, skip.
 */
test.describe('Carte — autofill depuis le bestiaire', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping bestiary spec.',
    );
  });

  test('« + Bestiaire » ouvre le sélecteur de monstres (état vide pédagogique)', async ({
    page,
  }, testInfo) => {
    const cid = `bestiary-uat-${Date.now().toString(36)}`;
    const mapSlug = `donjon-${Date.now().toString(36)}`;
    const mapName = 'Bestiaire (UAT)';

    // Campagne stub + carte (même parcours prouvé que map-phase2-uat).
    await page.goto(`/map-proto/cloud/${cid}`);
    await waitForAppReady(page);
    await page.waitForFunction(
      () => {
        const w = window as Window & { __e2eAuthUid?: string | null };
        return typeof w.__e2eAuthUid === 'string' && w.__e2eAuthUid.length > 0;
      },
      null,
      { timeout: 10_000 },
    );
    await expect(page.getByTestId('maps-cloud-create-submit')).toBeEnabled({
      timeout: 10_000,
    });
    await page.getByTestId('maps-cloud-create-id').fill(mapSlug);
    await page.getByTestId('maps-cloud-create-name').fill(mapName);
    await page.getByTestId('maps-cloud-create-submit').click();
    await expect(page.getByTestId(`maps-cloud-card-${mapSlug}`)).toBeVisible({
      timeout: 5_000,
    });

    // Vue live.
    await page.goto(`/map-proto/cloud/${cid}/maps/${mapSlug}`);
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: mapName })).toBeVisible({
      timeout: 10_000,
    });

    // Le sélecteur n'est pas monté tant qu'on n'a pas cliqué « + Bestiaire ».
    await expect(page.getByText('Ajouter depuis le bestiaire')).toHaveCount(0);
    await page.getByTestId('map-live-add-monster').click();

    // La modale s'ouvre — titre + état vide orientant vers l'import de pack.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText('Ajouter depuis le bestiaire')).toBeVisible();
    await expect(dialog.getByText('Votre bestiaire est vide.')).toBeVisible();
    await expect(dialog.getByText(/Mon compte/)).toBeVisible();

    await takeStepScreenshot(page, testInfo, 'bestiaire-picker-empty');
    await takeStepScreenshot(page, testInfo, 'bestiaire-picker-empty', {
      viewport: true,
    });

    // Échap referme la modale (contrat DetailModal).
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5_000 });
  });
});
