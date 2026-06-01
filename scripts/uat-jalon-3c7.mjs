// Capture une galerie ordonnée pour l'UAT visuelle de JALON 3C.7 — ItemForm.
// Lance Chromium en émulation Pixel 7, exécute le parcours utilisateur puis
// dépose les PNG (pleine page + viewport pour la modale) dans uat-review/.
// Usage : pnpm dev (port 5180, VITE_USE_FIREBASE_EMULATOR=true) puis
//         node scripts/uat-jalon-3c7.mjs
import { mkdirSync, rmSync, readdirSync, unlinkSync } from 'node:fs';
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

function clearUatReview() {
  try {
    mkdirSync(OUT_DIR, { recursive: true });
  } catch {
    /* noop */
  }
  for (const entry of readdirSync(OUT_DIR)) {
    const full = path.join(OUT_DIR, entry);
    rmSync(full, { recursive: true, force: true });
  }
}

async function main() {
  clearUatReview();
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/account/content/new`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => !document.querySelector('[data-splash="true"]'),
    null,
    { timeout: 30_000 },
  );
  await page.waitForSelector('[data-screen="custom-content-pack-editor"]', {
    timeout: 30_000,
  });

  // 01 — shell : on voit Sorts + Objets + comingSoon (Ascendances + Classes)
  await page.waitForSelector('[data-testid="pack-editor-items"]');
  await shoot(page, '01-pack-editor-shell-avec-section-objets');

  // Méta
  await page.getByTestId('pack-meta-id').fill('pack-item-uat');
  await page.getByTestId('pack-meta-name-fr').fill('Pack objet UAT');
  await page.getByTestId('pack-meta-author').fill('Adrien UAT');

  // Ouvrir ItemForm
  await page.getByTestId('pack-editor-add-item').click();
  await page.waitForSelector('[data-testid="item-form"]');

  // 02 — ItemForm vierge (pleine page)
  await shoot(page, '02-item-form-vierge');
  // 02b — vierge viewport
  await shoot(page, '02-item-form-vierge', { viewport: true });

  // === Cas 1 : équipement courant minimal ===
  await page.getByTestId('item-form-id').fill('corde-rituelle');
  await page.getByTestId('item-form-name-fr').fill('Corde rituelle');
  // Sélection clavier (combobox) — pattern stable Pixel 7.
  // Schools-style: itemCategorySchema = weapon(0), armor(1), shield(2),
  // gear(3), tool(4), pack(5), mount(6), vehicle(7). 3× ArrowDown → gear.
  const catCombo = page.getByTestId('item-form-category').getByRole('combobox');
  await catCombo.focus();
  await catCombo.press('Enter');
  for (let i = 0; i < 3; i += 1) {
    await catCombo.press('ArrowDown');
  }
  await catCombo.press('Enter');
  // weight=0 par défaut OK

  // 03 — gear minimal rempli
  await shoot(page, '03-item-form-rempli-gear-minimal');

  // Confirmer
  await page.getByTestId('item-form-confirm').click();
  await page.waitForSelector('[data-testid="pack-editor-item-row"]');

  // === Cas 2 : arme — montrer la richesse des champs conditionnels ===
  await page.getByTestId('pack-editor-add-item').click();
  await page.waitForSelector('[data-testid="item-form"]');
  await page.getByTestId('item-form-id').fill('epee-ombre');
  await page.getByTestId('item-form-name-fr').fill('Épée d’ombre');

  const catCombo2 = page.getByTestId('item-form-category').getByRole('combobox');
  await catCombo2.focus();
  await catCombo2.press('Enter');
  // weapon = index 0 → Enter directement
  await catCombo2.press('Enter');

  // Coût optionnel
  await page.getByTestId('item-form-has-cost').scrollIntoViewIfNeeded();
  await page.getByTestId('item-form-has-cost').click({ force: true });
  await page.getByTestId('item-form-cost-qty').fill('120');

  // Description riche
  await page.getByTestId('item-form-has-description').scrollIntoViewIfNeeded();
  await page.getByTestId('item-form-has-description').click({ force: true });
  await page
    .getByTestId('item-form-description-fr')
    .fill('Une épée fine qui boit la lumière de la lune.');

  // Damage
  await page.getByTestId('item-form-has-damage').scrollIntoViewIfNeeded();
  await page.getByTestId('item-form-has-damage').click({ force: true });
  await page.getByTestId('item-form-damage-dice').fill('1d8');
  await page.getByTestId('item-form-damage-type-label-fr').fill('tranchant');

  // Range
  await page.getByTestId('item-form-has-range').scrollIntoViewIfNeeded();
  await page.getByTestId('item-form-has-range').click({ force: true });

  // Mastery
  await page.getByTestId('item-form-has-mastery').scrollIntoViewIfNeeded();
  await page.getByTestId('item-form-has-mastery').click({ force: true });
  const masteryCombo = page
    .getByTestId('item-form-mastery-property')
    .getByRole('combobox');
  await masteryCombo.focus();
  await masteryCombo.press('Enter');
  // Mastery options: cleave(0), graze(1), nick(2), push(3), sap(4),
  // slow(5), topple(6), vex(7). 7× ArrowDown → vex.
  for (let i = 0; i < 7; i += 1) {
    await masteryCombo.press('ArrowDown');
  }
  await masteryCombo.press('Enter');

  // Propriété libre
  await page
    .getByTestId('item-form-property-input')
    .scrollIntoViewIfNeeded();
  await page.getByTestId('item-form-property-input').fill('finesse');
  await page.getByTestId('item-form-property-add').click();
  await page.getByTestId('item-form-property-input').fill('légère');
  await page.getByTestId('item-form-property-add').click();

  // 04 — version arme riche pleine page
  await shoot(page, '04-item-form-arme-riche-pleine-page');

  await page.getByTestId('item-form-confirm').scrollIntoViewIfNeeded();
  await page.getByTestId('item-form-confirm').click();
  await page.waitForSelector(
    '[data-testid="pack-editor-item-row"][data-item-id="epee-ombre"]',
  );

  // === Cas 3 : armure — section Armure visible ===
  await page.getByTestId('pack-editor-add-item').click();
  await page.waitForSelector('[data-testid="item-form"]');
  await page.getByTestId('item-form-id').fill('plastron-runique');
  await page.getByTestId('item-form-name-fr').fill('Plastron runique');
  const catCombo3 = page.getByTestId('item-form-category').getByRole('combobox');
  await catCombo3.focus();
  await catCombo3.press('Enter');
  await catCombo3.press('ArrowDown');
  await catCombo3.press('Enter');
  // weight
  await page.getByTestId('item-form-weight').fill('9');
  // acBase visible (armor section automatiquement)
  await page.getByTestId('item-form-ac-base').fill('14');
  await page.getByTestId('item-form-has-ac-dex-max').scrollIntoViewIfNeeded();
  await page.getByTestId('item-form-has-ac-dex-max').click({ force: true });
  await page.getByTestId('item-form-ac-dex-max').fill('2');
  await page.getByTestId('item-form-has-str-required').scrollIntoViewIfNeeded();
  await page.getByTestId('item-form-has-str-required').click({ force: true });
  await page.getByTestId('item-form-str-required').fill('13');
  await page
    .getByTestId('item-form-stealth-disadvantage')
    .scrollIntoViewIfNeeded();
  await page
    .getByTestId('item-form-stealth-disadvantage')
    .click({ force: true });

  // 05 — armure riche pleine page (section Armure remplie)
  await shoot(page, '05-item-form-armure-riche-pleine-page');

  await page.getByTestId('item-form-confirm').scrollIntoViewIfNeeded();
  await page.getByTestId('item-form-confirm').click();
  await page.waitForSelector(
    '[data-testid="pack-editor-item-row"][data-item-id="plastron-runique"]',
  );

  // 06 — liste pack editor avec 3 objets (gear + weapon + armor)
  await shoot(page, '06-pack-editor-avec-3-objets');

  await browser.close();
  console.log(`\nGalerie complète dans ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
