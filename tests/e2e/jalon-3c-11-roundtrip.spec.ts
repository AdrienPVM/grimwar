import { expect, test, type Page } from '@playwright/test';

import { isEmulatorReachable, waitForAppReady } from './fixtures';

/**
 * JALON 3C.11 — closure test du parcours « créer + éditer un pack custom in-app ».
 *
 * Couvre les pièces qui ne sont PAS déjà testées par les e2es par catégorie
 * (3C.1..3C.9) ni par le round-trip à 1 entrée (3C.10) :
 *
 *   1. Un même pack peut héberger PLUSIEURS catégories simultanément.
 *   2. Le mode édition recharge correctement les N entités à travers les
 *      catégories — toutes les rows réapparaissent, intégrées et cliquables.
 *   3. Une modification (rename) + un ajout d'une nouvelle catégorie au sein
 *      du même save persistent côté Firestore et reviennent au reload édition.
 *
 * Les 9 forms (Feat, Invocation, Subancestry, Background, Subclass, Spell,
 * Item, Ancestry, Class) sont couverts unitairement et en e2e individuel ;
 * ce test se concentre donc sur 4 catégories distinctes (feat, invocation,
 * ancestry, background) — assez pour prouver la coexistence multi-catégorie
 * sans dupliquer la matrice complète.
 */

const PACK_ID = 'pack-3c11-roundtrip';
const FEAT_ID = 'feat-3c11';
const INVOCATION_ID = 'invocation-3c11';
const ANCESTRY_ID = 'ancestry-3c11';
const BACKGROUND_ID = 'background-3c11';
const NEW_FEAT_NAME = 'Don roundtrip';

test.describe('Custom content roundtrip — JALON 3C.11', () => {
  test.beforeAll(async () => {
    const ok = await isEmulatorReachable();
    test.skip(
      !ok,
      'Firestore emulator unreachable on 127.0.0.1:8080 — start it with `pnpm e2e:emulators` (requires Java/JRE 11+). Skipping spec.',
    );
  });

  test('pack avec 4 catégories → save → edit recharge tout → rename + ajout → re-save → reload conserve l\'état', async ({
    page,
  }) => {
    // ─── 1) Création initiale : 4 catégories distinctes ───────────────────
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    await page.getByTestId('pack-meta-id').fill(PACK_ID);
    await page.getByTestId('pack-meta-name-fr').fill('Pack roundtrip 3C.11');
    await page.getByTestId('pack-meta-author').fill('Adrien e2e');

    await addFeat(page, { id: FEAT_ID, nameFr: 'Don initial' });
    await addInvocation(page, {
      id: INVOCATION_ID,
      nameFr: 'Invocation roundtrip',
    });
    await addAncestry(page, {
      id: ANCESTRY_ID,
      nameFr: 'Ascendance roundtrip',
    });

    await page.getByTestId('pack-editor-save').click();
    await page.waitForURL('**/account/content', { timeout: 10_000 });

    const packRow = page.locator(`[data-pack-id="${PACK_ID}"]`).first();
    await expect(packRow).toBeVisible({ timeout: 10_000 });

    // ─── 2) Ouverture du mode édition : les 3 catégories réapparaissent ──
    await packRow.locator('[data-testid="pack-edit"]').click();
    await expect(page.getByTestId('pack-editor-title')).toContainText(
      'Modifier le pack',
    );
    await expect(page.getByTestId('pack-meta-id')).toHaveValue(PACK_ID);
    await expect(page.getByTestId('pack-meta-id')).toHaveAttribute(
      'readonly',
      '',
    );

    const featRow = page.locator(
      `[data-testid="pack-editor-feat-row"][data-feat-id="${FEAT_ID}"]`,
    );
    const invocationRow = page.locator(
      `[data-testid="pack-editor-invocation-row"][data-invocation-id="${INVOCATION_ID}"]`,
    );
    const ancestryRow = page.locator(
      `[data-testid="pack-editor-ancestry-row"][data-ancestry-id="${ANCESTRY_ID}"]`,
    );
    await expect(featRow).toBeVisible();
    await expect(invocationRow).toBeVisible();
    await expect(ancestryRow).toBeVisible();

    // ─── 3) Modification du feat existant via le bouton « Modifier » ──────
    await featRow.locator('[data-testid="pack-editor-feat-edit"]').click();
    await expect(page.getByTestId('feat-form')).toBeVisible();
    await expect(page.getByTestId('feat-form-id')).toHaveValue(FEAT_ID);
    const featFormNameFr = page.getByTestId('feat-form-name-fr');
    await featFormNameFr.fill(NEW_FEAT_NAME);
    await page.getByTestId('feat-form-confirm').click();
    await expect(page.getByTestId('feat-form')).toHaveCount(0);
    await expect(featRow).toContainText(NEW_FEAT_NAME);

    // ─── 4) Ajout d'une 4e catégorie (background) dans le même édit ──────
    await addBackground(page, {
      id: BACKGROUND_ID,
      nameFr: 'Historique roundtrip',
    });

    // ─── 5) Save → retour à la liste, puis re-ouvre l'édition ─────────────
    await page.getByTestId('pack-editor-save').click();
    await page.waitForURL('**/account/content', { timeout: 10_000 });

    const packRowAfter = page.locator(`[data-pack-id="${PACK_ID}"]`).first();
    await packRowAfter.locator('[data-testid="pack-edit"]').click();
    await expect(page.getByTestId('pack-editor-title')).toContainText(
      'Modifier le pack',
    );

    // ─── 6) Toutes les 4 catégories sont là, et le rename a persisté ─────
    await expect(featRow).toBeVisible();
    await expect(featRow).toContainText(NEW_FEAT_NAME);
    await expect(invocationRow).toBeVisible();
    await expect(ancestryRow).toBeVisible();
    const backgroundRow = page.locator(
      `[data-testid="pack-editor-background-row"][data-background-id="${BACKGROUND_ID}"]`,
    );
    await expect(backgroundRow).toBeVisible();
  });
});

// ─── Helpers — flot minimal de chaque form (V1 : pas de champs facultatifs) ─

async function addFeat(
  page: Page,
  { id, nameFr }: { id: string; nameFr: string },
): Promise<void> {
  await page.getByTestId('pack-editor-add-feat').click();
  await expect(page.getByTestId('feat-form')).toBeVisible();
  await page.getByTestId('feat-form-id').fill(id);
  await page.getByTestId('feat-form-name-fr').fill(nameFr);
  await page.getByTestId('feat-form-confirm').click();
  await expect(page.getByTestId('feat-form')).toHaveCount(0);
}

async function addInvocation(
  page: Page,
  { id, nameFr }: { id: string; nameFr: string },
): Promise<void> {
  await page.getByTestId('pack-editor-add-invocation').click();
  await expect(page.getByTestId('invocation-form')).toBeVisible();
  await page.getByTestId('invocation-form-id').fill(id);
  await page.getByTestId('invocation-form-name-fr').fill(nameFr);
  await page
    .getByTestId('invocation-form-summary-fr')
    .fill('Effet de roundtrip.');
  await page.getByTestId('invocation-form-confirm').click();
  await expect(page.getByTestId('invocation-form')).toHaveCount(0);
}

async function addAncestry(
  page: Page,
  { id, nameFr }: { id: string; nameFr: string },
): Promise<void> {
  await page.getByTestId('pack-editor-add-ancestry').click();
  await expect(page.getByTestId('ancestry-form')).toBeVisible();
  await page.getByTestId('ancestry-form-id').fill(id);
  await page.getByTestId('ancestry-form-name-fr').fill(nameFr);
  await page
    .getByTestId('ancestry-form-description-fr')
    .fill('Ascendance test roundtrip.');
  // size/speed gardent leur valeur par défaut (medium, 9m)
  await page.getByTestId('ancestry-form-confirm').click();
  await expect(page.getByTestId('ancestry-form')).toHaveCount(0);
}

async function addBackground(
  page: Page,
  { id, nameFr }: { id: string; nameFr: string },
): Promise<void> {
  await page.getByTestId('pack-editor-add-background').click();
  await expect(page.getByTestId('background-form')).toBeVisible();
  await page.getByTestId('background-form-id').fill(id);
  await page.getByTestId('background-form-name-fr').fill(nameFr);
  await page
    .getByTestId('background-form-description-fr')
    .fill('Historique test roundtrip.');
  // V1 background form : skills/tools/equipment/languages tous optionnels.
  // Seule la feature {nameFr, descriptionFr} est requise.
  await page
    .getByTestId('background-form-feature-name-fr')
    .fill('Trait du roundtrip');
  await page
    .getByTestId('background-form-feature-description-fr')
    .fill('Décrit le trait du roundtrip.');
  await page.getByTestId('background-form-confirm').click();
  await expect(page.getByTestId('background-form')).toHaveCount(0);
}
