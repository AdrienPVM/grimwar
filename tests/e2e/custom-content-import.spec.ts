import { expect, test } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * JALON 3B.4 — e2e ImportScreen.
 *
 * Couvre le parcours utilisateur réel : MJ ouvre `/account/content`, drop un
 * pack JSON valide via le file picker, voit l'aperçu (compteurs), clique
 * « Importer », voit son pack apparaître dans la liste « Mes packs importés ».
 *
 * Le test prouve aussi que la rule `users/{uid}/customContentPacks/{packId}`
 * (JALON 3B.3) est lue correctement par l'émulateur — sans la rule, le
 * `writePack` échouerait avec « Missing or insufficient permissions ».
 */

const VALID_PACK = {
  meta: {
    id: 'pack-homebrew-e2e',
    name: { fr: 'Pack homebrew e2e', en: 'Homebrew e2e pack' },
    version: '1.0.0',
    author: 'Adrien e2e',
    createdAt: '2026-05-31T12:00:00Z',
  },
  entities: {
    spells: [
      {
        id: 'feu-magique-e2e',
        name: { fr: 'Feu magique e2e', en: 'Magic fire e2e' },
        level: 1,
        school: 'evocation',
        castingTime: { fr: '1 action', en: '1 action' },
        range: { fr: '30 mètres', en: '120 feet' },
        components: { v: true, s: true, m: false },
        duration: { fr: 'Instantanée', en: 'Instantaneous' },
        concentration: false,
        ritual: false,
        description: {
          fr: 'Un trait de feu jaillit de ta main.',
          en: 'A bolt of fire shoots from your hand.',
        },
        atHigherLevels: null,
        classes: ['wizard'],
        source: 'srd-5.2.1',
      },
    ],
  },
};

test.describe('Custom content import — JALON 3B.4', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping spec.',
    );
  });

  test('importe un pack JSON valide depuis /account/content', async ({ page }) => {
    await page.goto('/account/content');
    await waitForAppReady(page);

    // 1. La DropZone est visible en état initial.
    await expect(page.getByTestId('pack-dropzone')).toBeVisible();

    // 2. Upload du fichier JSON via le file input caché. Playwright `setInputFiles`
    //    accepte un payload inline — pas besoin de créer un fichier sur disque.
    const fileInput = page.getByTestId('pack-file-input');
    await fileInput.setInputFiles({
      name: 'pack-homebrew-e2e.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(VALID_PACK), 'utf-8'),
    });

    // 3. L'aperçu apparaît avec le nom du pack et le compteur de sorts.
    const preview = page.getByTestId('pack-preview');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(VALID_PACK.meta.name.fr);
    const counts = page.getByTestId('pack-counts');
    await expect(counts).toContainText('Sorts');
    await expect(counts).toContainText('1');

    // 4. Clic « Importer » → write Firestore → toast OK → retour à idle +
    //    le pack apparaît dans la liste « Mes packs ».
    await page.getByTestId('pack-import-confirm').click();
    await expect(page.getByTestId('pack-preview')).not.toBeVisible();
    const row = page.locator('[data-pack-id="pack-homebrew-e2e"]').first();
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText(VALID_PACK.meta.name.fr);
    await expect(row).toContainText(VALID_PACK.meta.author);
  });

  test('affiche l\'erreur structurée d\'un pack avec doublon d\'id', async ({ page }) => {
    await page.goto('/account/content');
    await waitForAppReady(page);

    const dupPack = {
      ...VALID_PACK,
      meta: { ...VALID_PACK.meta, id: 'pack-dup-e2e' },
      entities: {
        spells: [VALID_PACK.entities.spells[0], VALID_PACK.entities.spells[0]],
      },
    };
    await page.getByTestId('pack-file-input').setInputFiles({
      name: 'pack-dup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(dupPack), 'utf-8'),
    });

    const errors = page.getByTestId('pack-errors');
    await expect(errors).toBeVisible();
    await expect(errors).toContainText(/doublon/i);
  });
});
