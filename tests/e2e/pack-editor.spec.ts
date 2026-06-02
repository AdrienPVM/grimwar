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

  test('JALON 3C.5 — crée un pack avec 1 sous-classe référant Guerrier SRD → save → liste packs', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    await page.getByTestId('pack-meta-id').fill('pack-sc-e2e');
    await page.getByTestId('pack-meta-name-fr').fill('Pack subclasse e2e');
    await page.getByTestId('pack-meta-author').fill('Adrien e2e');

    await page.getByTestId('pack-editor-add-subclass').click();
    await expect(page.getByTestId('subclass-form')).toBeVisible();

    await page
      .getByTestId('subclass-form-id')
      .fill('fighter-tracer-e2e');

    const classWrapper = page.getByTestId('subclass-form-class-id');
    await classWrapper.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Guerrier' }).first().click();

    await page
      .getByTestId('subclass-form-name-fr')
      .fill('Tracer du champ e2e');
    await page
      .getByTestId('subclass-form-description-fr')
      .fill('Variante de test pour le parcours subclass custom.');

    // 1 feature L3
    await page.getByTestId('subclass-form-feature-add').click();
    await page
      .getByTestId('subclass-form-feature-name-fr-0')
      .fill('Coup précis');
    await page
      .getByTestId('subclass-form-feature-description-fr-0')
      .fill('Inflige +2 dégâts une fois par tour.');

    await page.getByTestId('subclass-form-confirm').click();

    await expect(page.getByTestId('subclass-form')).toHaveCount(0);
    const scRow = page.locator(
      '[data-testid="pack-editor-subclass-row"][data-subclass-id="fighter-tracer-e2e"]',
    );
    await expect(scRow).toBeVisible();

    await page.getByTestId('pack-editor-save').click();

    await page.waitForURL('**/account/content', { timeout: 10_000 });
    const packRow = page.locator('[data-pack-id="pack-sc-e2e"]').first();
    await expect(packRow).toBeVisible({ timeout: 10_000 });
    await expect(packRow).toContainText('Pack subclasse e2e');
  });

  test('JALON 3C.6 — crée un pack avec 1 sort (Évocation, V+S) → save → liste packs', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    await page.getByTestId('pack-meta-id').fill('pack-spell-e2e');
    await page.getByTestId('pack-meta-name-fr').fill('Pack sort e2e');
    await page.getByTestId('pack-meta-author').fill('Adrien e2e');

    await page.getByTestId('pack-editor-add-spell').click();
    await expect(page.getByTestId('spell-form')).toBeVisible();

    await page.getByTestId('spell-form-id').fill('tracer-bolt-e2e');
    await page
      .getByTestId('spell-form-name-fr')
      .fill('Trait du traceur e2e');

    // Sélectionne l'école Évocation
    const schoolWrapper = page.getByTestId('spell-form-school');
    await schoolWrapper.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Évocation' }).click();

    await page.getByTestId('spell-form-casting-time-fr').fill('1 action');
    await page.getByTestId('spell-form-range-fr').fill('36 mètres');
    await page.getByTestId('spell-form-duration-fr').fill('Instantanée');

    // Toggle V + S
    await page.getByTestId('spell-form-component-v').click();
    await page.getByTestId('spell-form-component-s').click();

    await page
      .getByTestId('spell-form-description-fr')
      .fill('Un trait magique frappe une cible visible.');

    await page.getByTestId('spell-form-confirm').click();

    await expect(page.getByTestId('spell-form')).toHaveCount(0);
    const spellRow = page.locator(
      '[data-testid="pack-editor-spell-row"][data-spell-id="tracer-bolt-e2e"]',
    );
    await expect(spellRow).toBeVisible();

    await page.getByTestId('pack-editor-save').click();

    await page.waitForURL('**/account/content', { timeout: 10_000 });
    const packRow = page.locator('[data-pack-id="pack-spell-e2e"]').first();
    await expect(packRow).toBeVisible({ timeout: 10_000 });
    await expect(packRow).toContainText('Pack sort e2e');
  });

  test('JALON 3C.7 — crée un pack avec 1 arme (damage + mastery + propriété) → save → liste packs', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    await page.getByTestId('pack-meta-id').fill('pack-item-e2e');
    await page.getByTestId('pack-meta-name-fr').fill('Pack arme e2e');
    await page.getByTestId('pack-meta-author').fill('Adrien e2e');

    await page.getByTestId('pack-editor-add-item').click();
    await expect(page.getByTestId('item-form')).toBeVisible();

    await page.getByTestId('item-form-id').fill('epee-ombre-e2e');
    await page.getByTestId('item-form-name-fr').fill('Épée d’ombre e2e');

    const categoryWrapper = page.getByTestId('item-form-category');
    await categoryWrapper.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Arme' }).first().click();

    // Damage 1d8 tranchant. La Checkbox primitive a son `<input>` en `sr-only`
    // sous un label cliquable → en mobile viewport, Playwright voit le label
    // intercepter les clics sur l'input. `force: true` bypass l'actionability
    // check (le handler React écoute sur l'input, le clic le déclenche).
    await page.getByTestId('item-form-has-damage').click({ force: true });
    await page.getByTestId('item-form-damage-dice').fill('1d8');
    await page.getByTestId('item-form-damage-type-label-fr').fill('tranchant');

    // Mastery vex
    await page.getByTestId('item-form-has-mastery').click({ force: true });
    const masteryWrapper = page.getByTestId('item-form-mastery-property');
    await masteryWrapper.getByRole('combobox').click();
    await page.getByRole('option', { name: 'vex' }).click();

    // Propriété libre
    await page.getByTestId('item-form-property-input').fill('finesse');
    await page.getByTestId('item-form-property-add').click();

    await page.getByTestId('item-form-confirm').click();

    await expect(page.getByTestId('item-form')).toHaveCount(0);
    const itemRow = page.locator(
      '[data-testid="pack-editor-item-row"][data-item-id="epee-ombre-e2e"]',
    );
    await expect(itemRow).toBeVisible();

    await page.getByTestId('pack-editor-save').click();

    await page.waitForURL('**/account/content', { timeout: 10_000 });
    const packRow = page.locator('[data-pack-id="pack-item-e2e"]').first();
    await expect(packRow).toBeVisible({ timeout: 10_000 });
    await expect(packRow).toContainText('Pack arme e2e');
  });

  test('JALON 3C.8 — crée un pack avec 1 ascendance (taille + vitesse + ASI + dragon) → save → liste packs', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    await page.getByTestId('pack-meta-id').fill('pack-ancestry-e2e');
    await page.getByTestId('pack-meta-name-fr').fill('Pack ascendance e2e');
    await page.getByTestId('pack-meta-author').fill('Adrien e2e');

    await page.getByTestId('pack-editor-add-ancestry').click();
    await expect(page.getByTestId('ancestry-form')).toBeVisible();

    await page
      .getByTestId('ancestry-form-id')
      .fill('peuple-des-brumes-e2e');
    await page
      .getByTestId('ancestry-form-name-fr')
      .fill('Peuple des brumes e2e');
    await page
      .getByTestId('ancestry-form-description-fr')
      .fill('Ascendance brumeuse, ardue à atteindre.');

    // Une ASI : Dextérité +2
    await page.getByTestId('ancestry-form-asi-add').click();
    const asiWrapper = page.getByTestId('ancestry-form-asi-ability-0');
    await asiWrapper.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Dextérité' }).click();

    // Un ancêtre draconique : Givre
    await page.getByTestId('ancestry-form-dragon-add').click();
    await page
      .getByTestId('ancestry-form-dragon-id-0')
      .fill('frost-ancestor');
    await page
      .getByTestId('ancestry-form-dragon-name-fr-0')
      .fill('Ancêtre de givre');
    const damageTypeWrapper = page.getByTestId(
      'ancestry-form-dragon-damage-type-0',
    );
    await damageTypeWrapper.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Froid' }).click();
    await page
      .getByTestId('ancestry-form-dragon-damage-label-fr-0')
      .fill('froid');

    await page.getByTestId('ancestry-form-confirm').click();

    await expect(page.getByTestId('ancestry-form')).toHaveCount(0);
    const ancestryRow = page.locator(
      '[data-testid="pack-editor-ancestry-row"][data-ancestry-id="peuple-des-brumes-e2e"]',
    );
    await expect(ancestryRow).toBeVisible();

    await page.getByTestId('pack-editor-save').click();

    await page.waitForURL('**/account/content', { timeout: 10_000 });
    const packRow = page
      .locator('[data-pack-id="pack-ancestry-e2e"]')
      .first();
    await expect(packRow).toBeVisible({ timeout: 10_000 });
    await expect(packRow).toContainText('Pack ascendance e2e');
  });

  test('JALON 3C.9 — crée un pack avec 1 classe (hit die + primary/saves + spellcasting) → save → liste packs', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    await page.getByTestId('pack-meta-id').fill('pack-class-e2e');
    await page.getByTestId('pack-meta-name-fr').fill('Pack classe e2e');
    await page.getByTestId('pack-meta-author').fill('Adrien e2e');

    await page.getByTestId('pack-editor-add-class').click();
    await expect(page.getByTestId('class-form')).toBeVisible();

    await page.getByTestId('class-form-id').fill('cendre-pacte-e2e');
    await page
      .getByTestId('class-form-name-fr')
      .fill('Cendre-pacte e2e');
    await page
      .getByTestId('class-form-description-fr')
      .fill('Classe maison construite pour le test e2e.');

    // Hit die : d10
    const hitDieWrapper = page.getByTestId('class-form-hit-die');
    await hitDieWrapper.getByRole('combobox').click();
    await page.getByRole('option', { name: 'D10' }).click();

    // Aptitudes principales : Charisme. Sauvegardes : Charisme + Sagesse.
    await page.getByTestId('class-form-primary-cha').click();
    await page.getByTestId('class-form-save-cha').click();
    await page.getByTestId('class-form-save-sag').click();

    // Spellcasting ON, on garde les valeurs par défaut (Int + Lanceur complet).
    await page.getByTestId('class-form-spellcasting-toggle').check();

    await page.getByTestId('class-form-confirm').click();

    await expect(page.getByTestId('class-form')).toHaveCount(0);
    const classRow = page.locator(
      '[data-testid="pack-editor-class-row"][data-class-id="cendre-pacte-e2e"]',
    );
    await expect(classRow).toBeVisible();
    await expect(classRow).toContainText('Cendre-pacte e2e');
    await expect(classRow).toContainText('D10');

    await page.getByTestId('pack-editor-save').click();

    await page.waitForURL('**/account/content', { timeout: 10_000 });
    const packRow = page.locator('[data-pack-id="pack-class-e2e"]').first();
    await expect(packRow).toBeVisible({ timeout: 10_000 });
    await expect(packRow).toContainText('Pack classe e2e');
  });

  test('JALON 3C.4 — crée un pack avec 1 background (skills + outils + équipement + don) → save → liste packs', async ({
    page,
  }) => {
    await page.goto('/account/content/new');
    await waitForAppReady(page);

    await page.getByTestId('pack-meta-id').fill('pack-bg-e2e');
    await page.getByTestId('pack-meta-name-fr').fill('Pack background e2e');
    await page.getByTestId('pack-meta-author').fill('Adrien e2e');

    await page.getByTestId('pack-editor-add-background').click();
    await expect(page.getByTestId('background-form')).toBeVisible();

    await page.getByTestId('background-form-id').fill('wanderer-e2e');
    await page.getByTestId('background-form-name-fr').fill('Vagabond e2e');
    await page
      .getByTestId('background-form-description-fr')
      .fill('Historique custom de test.');

    // Toggle deux skills
    await page.getByTestId('background-form-skill-athletics').click();
    await page.getByTestId('background-form-skill-survival').click();

    // Ajoute un outil libre
    await page
      .getByTestId('background-form-tool-input')
      .fill('navigators-tools');
    await page.getByTestId('background-form-tool-add').click();

    // Ajoute une ligne d'équipement référant un item SRD (corde — items.json)
    await page.getByTestId('background-form-equipment-add').click();
    const itemWrapper = page.getByTestId('background-form-equipment-item-0');
    await itemWrapper.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Corde', exact: true }).click();

    // Don du background (FR requis pour name + description)
    await page
      .getByTestId('background-form-feature-name-fr')
      .fill('Bénédiction du chemin');
    await page
      .getByTestId('background-form-feature-description-fr')
      .fill('Voyage plus vite que les autres.');

    await page.getByTestId('background-form-confirm').click();

    await expect(page.getByTestId('background-form')).toHaveCount(0);
    const bgRow = page.locator(
      '[data-testid="pack-editor-background-row"][data-background-id="wanderer-e2e"]',
    );
    await expect(bgRow).toBeVisible();

    await page.getByTestId('pack-editor-save').click();

    await page.waitForURL('**/account/content', { timeout: 10_000 });
    const packRow = page.locator('[data-pack-id="pack-bg-e2e"]').first();
    await expect(packRow).toBeVisible({ timeout: 10_000 });
    await expect(packRow).toContainText('Pack background e2e');
  });
});
