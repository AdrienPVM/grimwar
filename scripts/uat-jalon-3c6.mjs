// Capture une galerie ordonnée pour l'UAT visuelle de JALON 3C.6 — SpellForm.
// Lance Chromium en émulation Pixel 7, exécute le parcours utilisateur puis
// dépose les PNG (pleine page + viewport pour la modale) dans uat-review/.
// Usage : pnpm dev (port 5180, VITE_USE_FIREBASE_EMULATOR=true) puis
//         node scripts/uat-jalon-3c6.mjs
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { chromium, devices } from '@playwright/test';

const BASE_URL = process.env.UAT_BASE_URL ?? 'http://localhost:5180';
const OUT_DIR = path.resolve('uat-review');

async function shoot(page, name, { viewport = false } = {}) {
  const suffix = viewport ? '-viewport' : '';
  const file = path.join(OUT_DIR, `${name}${suffix}.png`);
  await page.screenshot({ path: file, fullPage: !viewport, animations: 'disabled' });
  console.log(`✓ ${path.relative(process.cwd(), file)}`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/account/content/new`, { waitUntil: 'load' });
  // Attendre que le splash d'auth disparaisse (cf. fixtures.waitForAppReady).
  await page.waitForFunction(
    () => !document.querySelector('[data-splash="true"]'),
    null,
    { timeout: 30_000 },
  );
  await page.waitForSelector('[data-screen="custom-content-pack-editor"]', {
    timeout: 30_000,
  });

  // 01 — état initial : pack editor avec 6 catégories + comingSoon mis à jour
  await shoot(page, '01-pack-editor-shell-avec-section-sorts');

  // Remplir les métadonnées
  await page.getByTestId('pack-meta-id').fill('pack-spell-uat');
  await page.getByTestId('pack-meta-name-fr').fill('Pack sort UAT');
  await page.getByTestId('pack-meta-author').fill('Adrien UAT');

  // Ouvrir le SpellForm
  await page.getByTestId('pack-editor-add-spell').click();
  await page.waitForSelector('[data-testid="spell-form"]');

  // 02 — SpellForm vierge (pleine page)
  await shoot(page, '02-spell-form-vierge');

  // 02b — SpellForm vierge (viewport, ressenti overlay)
  await shoot(page, '02-spell-form-vierge', { viewport: true });

  // Remplir le formulaire minimal V+S
  await page.getByTestId('spell-form-id').fill('trait-traceur');
  await page.getByTestId('spell-form-name-fr').fill('Trait du traceur');
  // niveau 0 par défaut
  // Sélection clavier — fiable sur Pixel 7 où la fold cache l'option list.
  // Schools order: abjuration(0), conjuration(1), divination(2),
  // enchantment(3), evocation(4). Enter ouvre le panel sur index 0, puis
  // 4 × ArrowDown amène à evocation.
  const schoolCombo = page.getByTestId('spell-form-school').getByRole('combobox');
  await schoolCombo.focus();
  await schoolCombo.press('Enter');
  for (let i = 0; i < 4; i += 1) {
    await schoolCombo.press('ArrowDown');
  }
  await schoolCombo.press('Enter');
  await page.getByTestId('spell-form-casting-time-fr').fill('1 action');
  await page.getByTestId('spell-form-range-fr').fill('36 mètres');
  await page.getByTestId('spell-form-duration-fr').fill('Instantanée');
  await page.getByTestId('spell-form-component-v').click();
  await page.getByTestId('spell-form-component-s').click();
  await page
    .getByTestId('spell-form-description-fr')
    .fill('Un trait magique frappe la cible visible.');

  // 03 — SpellForm rempli minimal (V+S, sans dégâts)
  await shoot(page, '03-spell-form-rempli-minimal');

  // Activer M + atHigherLevels + 1 ligne de dégâts pour montrer la version riche.
  // scrollIntoViewIfNeeded sur chaque toggle évite que la fold mobile cache le
  // checkbox derrière un label voisin (intercept de pointer events).
  await page.getByTestId('spell-form-component-m').scrollIntoViewIfNeeded();
  await page.getByTestId('spell-form-component-m').click();
  await page
    .getByTestId('spell-form-material-fr')
    .fill('une perle de 100 po');
  await page
    .getByTestId('spell-form-has-at-higher-levels')
    .scrollIntoViewIfNeeded();
  await page
    .getByTestId('spell-form-has-at-higher-levels')
    .click({ force: true });
  await page
    .getByTestId('spell-form-at-higher-levels-fr')
    .fill('+1d6 par emplacement supérieur.');
  await page.getByTestId('spell-form-damage-add').scrollIntoViewIfNeeded();
  await page.getByTestId('spell-form-damage-add').click();
  await page.getByTestId('spell-form-damage-formula-0').fill('1d10');
  await page.getByTestId('spell-form-damage-type-label-fr-0').fill('feu');

  // 04 — version riche (pleine page) — montre composantes + at-higher + damage repeater
  await shoot(page, '04-spell-form-riche-pleine-page');

  // Confirmer le sort et retourner à l'éditeur de pack
  await page.getByTestId('spell-form-confirm').click();
  await page.waitForSelector('[data-testid="pack-editor-spell-row"]');

  // 05 — la ligne de sort apparaît dans la liste, le form se ferme
  await shoot(page, '05-pack-editor-avec-1-sort');

  await browser.close();
  console.log(`\nGalerie complète dans ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
