import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * JALON 3C.1 — e2e PackEditor (création in-app de pack custom).
 *
 * Couvre le parcours utilisateur réel : MJ ouvre `/account/content/new`,
 * remplit les métadonnées + 1 feat, clique « Enregistrer le pack ». L'app
 * doit valider le pack (passe Zod, comme l'import par fichier), écrire en
 * Firestore via `writePack`, rediriger vers `/account/content` et afficher le
 * nouveau pack dans la liste.
 *
 * Sans la rule `users/{uid}/customContentPacks/{packId}` (déployée 3B.3),
 * `writePack` échouerait avec « Missing or insufficient permissions ».
 */

test.describe('PackEditor — JALON 3C.1', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping spec.',
    );
  });

  test('crée un pack contenant 1 feat → save → apparaît dans /account/content', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    // 1. Métadonnées du pack
    await page.getByTestId('pack-meta-id').fill('pack-tracer-e2e');
    await page.getByTestId('pack-meta-name-fr').fill('Pack tracer e2e');
    await page.getByTestId('pack-meta-author').fill('Adrien e2e');
    // version reste à 1.0.0 par défaut

    // 2. Ajout d'un feat
    await page.getByTestId('pack-editor-add-feat').click();
    await expect(page.getByTestId('feat-form')).toBeVisible();
    await page.getByTestId('feat-form-id').fill('don-tracer-e2e');
    await page.getByTestId('feat-form-name-fr').fill('Don tracer e2e');
    await page.getByTestId('feat-form-confirm').click();

    // 3. Le feat apparaît dans la liste, le form se ferme
    await expect(page.getByTestId('feat-form')).toHaveCount(0);
    // `data-testid` et `data-feat-id` sont sur le MÊME élément <li> — on cible
    // directement par compound selector (filter({has}) cherche des descendants
    // uniquement, donc ne matche pas un attribut sur l'élément lui-même).
    const featRow = page.locator(
      '[data-testid="pack-editor-feat-row"][data-feat-id="don-tracer-e2e"]',
    );
    await expect(featRow).toBeVisible();

    // 4. Save → writePack Firestore → redirection /account/content
    await page.getByTestId('pack-editor-save').click();

    await page.waitForURL('**/account/content', { timeout: 10_000 });
    const packRow = page.locator('[data-pack-id="pack-tracer-e2e"]').first();
    await expect(packRow).toBeVisible({ timeout: 10_000 });
    await expect(packRow).toContainText('Pack tracer e2e');
    await expect(packRow).toContainText('Adrien e2e');
  });

  test('refuse un save sans feat (pack vide → erreur Zod affichée)', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    await page.getByTestId('pack-meta-id').fill('pack-vide-e2e');
    await page.getByTestId('pack-meta-name-fr').fill('Pack vide e2e');
    await page.getByTestId('pack-meta-author').fill('Adrien e2e');

    await page.getByTestId('pack-editor-save').click();

    // L'erreur de validation reste sur l'écran ; URL inchangée.
    await expect(
      page.getByTestId('pack-editor-validation-error'),
    ).toBeVisible();
    expect(page.url()).toContain('/account/content/new');
  });

  test('JALON 3C.3 — crée un pack avec 1 subancestry référant Humain SRD → save → liste packs', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    await page.getByTestId('pack-meta-id').fill('pack-sub-e2e');
    await page.getByTestId('pack-meta-name-fr').fill('Pack subancestry e2e');
    await page.getByTestId('pack-meta-author').fill('Adrien e2e');

    await page.getByTestId('pack-editor-add-subancestry').click();
    await expect(page.getByTestId('subancestry-form')).toBeVisible();

    await page
      .getByTestId('subancestry-form-id')
      .fill('human-tracer-e2e');

    // Ouvre le combobox ancestryId et choisit "Humain" (SRD).
    const ancestryWrapper = page.getByTestId('subancestry-form-ancestry-id');
    await ancestryWrapper.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Humain' }).click();

    await page
      .getByTestId('subancestry-form-name-fr')
      .fill('Humain tracer e2e');
    await page
      .getByTestId('subancestry-form-description-fr')
      .fill('Variante de test pour le parcours subancestry custom.');

    // Ajout d'une ASI (DEX +1)
    await page.getByTestId('subancestry-form-asi-add').click();
    const asiWrapper = page.getByTestId('subancestry-form-asi-ability-0');
    await asiWrapper.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Dextérité' }).click();

    await page.getByTestId('subancestry-form-confirm').click();

    await expect(page.getByTestId('subancestry-form')).toHaveCount(0);
    const subRow = page.locator(
      '[data-testid="pack-editor-subancestry-row"][data-subancestry-id="human-tracer-e2e"]',
    );
    await expect(subRow).toBeVisible();

    await page.getByTestId('pack-editor-save').click();

    await page.waitForURL('**/account/content', { timeout: 10_000 });
    const packRow = page.locator('[data-pack-id="pack-sub-e2e"]').first();
    await expect(packRow).toBeVisible({ timeout: 10_000 });
    await expect(packRow).toContainText('Pack subancestry e2e');
  });

  test('JALON 3C.2 — crée un pack avec 1 invocation (sans feat) → save → liste packs', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    await page.getByTestId('pack-meta-id').fill('pack-inv-e2e');
    await page.getByTestId('pack-meta-name-fr').fill('Pack invocations e2e');
    await page.getByTestId('pack-meta-author').fill('Adrien e2e');

    await page.getByTestId('pack-editor-add-invocation').click();
    await expect(page.getByTestId('invocation-form')).toBeVisible();
    await page.getByTestId('invocation-form-id').fill('inv-tracer-e2e');
    await page.getByTestId('invocation-form-name-fr').fill('Invocation tracer e2e');
    await page
      .getByTestId('invocation-form-summary-fr')
      .fill('Effet d\'essai de l\'invocation tracer.');
    await page.getByTestId('invocation-form-confirm').click();

    await expect(page.getByTestId('invocation-form')).toHaveCount(0);
    const invRow = page.locator(
      '[data-testid="pack-editor-invocation-row"][data-invocation-id="inv-tracer-e2e"]',
    );
    await expect(invRow).toBeVisible();

    await page.getByTestId('pack-editor-save').click();

    await page.waitForURL('**/account/content', { timeout: 10_000 });
    const packRow = page.locator('[data-pack-id="pack-inv-e2e"]').first();
    await expect(packRow).toBeVisible({ timeout: 10_000 });
    await expect(packRow).toContainText('Pack invocations e2e');
  });
});
