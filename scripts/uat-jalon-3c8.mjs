// Capture une galerie ordonnée pour l'UAT visuelle de JALON 3C.8 — AncestryForm.
// Lance Chromium en émulation Pixel 7, exécute le parcours utilisateur puis
// dépose les PNG (pleine page + viewport pour la modale) dans uat-review/.
// Usage : pnpm dev (port 5180, VITE_USE_FIREBASE_EMULATOR=true) puis
//         node scripts/uat-jalon-3c8.mjs
import { mkdirSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { chromium, devices } from '@playwright/test';

const BASE_URL = process.env.UAT_BASE_URL ?? 'http://localhost:5180';
const OUT_DIR = path.resolve('uat-review');

async function shoot(page, name, { viewport = false } = {}) {
  const suffix = viewport ? '-viewport' : '';
  const file = path.join(OUT_DIR, `${name}${suffix}.png`);
  await page.screenshot({
    path: file,
    fullPage: !viewport,
    animations: 'disabled',
  });
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

  // 01 — shell : la section « Ascendances » est rendue + comingSoon ne liste
  // plus QUE « Classes » (la nuance vis-à-vis du commit 3C.7).
  await page.waitForSelector('[data-testid="pack-editor-ancestries"]');
  await page
    .getByTestId('pack-editor-ancestries')
    .scrollIntoViewIfNeeded();
  await shoot(page, '01-pack-editor-shell-avec-section-ascendances');

  // Méta
  await page.getByTestId('pack-meta-id').fill('pack-ancestry-uat');
  await page.getByTestId('pack-meta-name-fr').fill('Pack ascendance UAT');
  await page.getByTestId('pack-meta-author').fill('Adrien UAT');

  // Ouvrir AncestryForm
  await page.getByTestId('pack-editor-add-ancestry').click();
  await page.waitForSelector('[data-testid="ancestry-form"]');

  // 02 — AncestryForm vierge (pleine page + viewport)
  await shoot(page, '02-ancestry-form-vierge');
  await shoot(page, '02-ancestry-form-vierge', { viewport: true });

  // === Cas 1 : Ascendance minimale ===
  await page.getByTestId('ancestry-form-id').fill('peuple-des-brumes');
  await page
    .getByTestId('ancestry-form-name-fr')
    .fill('Peuple des brumes');
  await page
    .getByTestId('ancestry-form-description-fr')
    .fill(
      'Issus des hauteurs brumeuses, on les dit fils du nuage et de la pierre.',
    );

  // Une ASI : Dextérité +2
  await page.getByTestId('ancestry-form-asi-add').click();
  const asiCombo = page
    .getByTestId('ancestry-form-asi-ability-0')
    .getByRole('combobox');
  await asiCombo.focus();
  await asiCombo.press('Enter');
  // ABILITY_KEYS = for, dex, con, int, sag, cha — 1× ArrowDown → dex
  await asiCombo.press('ArrowDown');
  await asiCombo.press('Enter');
  await page.getByTestId('ancestry-form-asi-bonus-0').fill('2');

  // Un trait
  await page.getByTestId('ancestry-form-trait-add').click();
  await page
    .getByTestId('ancestry-form-trait-name-fr-0')
    .fill('Vision dans le noir');
  await page
    .getByTestId('ancestry-form-trait-description-fr-0')
    .fill(
      'Vous voyez dans l’obscurité jusqu’à 18 mètres comme s’il s’agissait d’une pénombre.',
    );

  // Une langue
  await page.getByTestId('ancestry-form-language-input').fill('Commun');
  await page.getByTestId('ancestry-form-language-add').click();
  await page.getByTestId('ancestry-form-language-input').fill('Sylvain');
  await page.getByTestId('ancestry-form-language-add').click();

  // 03 — ascendance minimale remplie
  await shoot(page, '03-ancestry-form-rempli-minimal');

  // === Cas 2 : enrichi — ancêtre draconique ===
  await page.getByTestId('ancestry-form-dragon-add').click();
  await page
    .getByTestId('ancestry-form-dragon-id-0')
    .fill('ancetre-de-givre');
  await page
    .getByTestId('ancestry-form-dragon-name-fr-0')
    .fill('Ancêtre de givre');
  const dragonDamageCombo = page
    .getByTestId('ancestry-form-dragon-damage-type-0')
    .getByRole('combobox');
  await dragonDamageCombo.focus();
  await dragonDamageCombo.press('Enter');
  // damageTypeSchema = acid(0), bludgeoning(1), cold(2), … → 2× ArrowDown
  await dragonDamageCombo.press('ArrowDown');
  await dragonDamageCombo.press('ArrowDown');
  await dragonDamageCombo.press('Enter');
  await page
    .getByTestId('ancestry-form-dragon-damage-label-fr-0')
    .fill('froid');

  // Un ancêtre géant
  await page.getByTestId('ancestry-form-giant-add').click();
  await page.getByTestId('ancestry-form-giant-id-0').fill('ancetre-de-pierre');
  await page
    .getByTestId('ancestry-form-giant-name-fr-0')
    .fill('Ancêtre de pierre');
  await page
    .getByTestId('ancestry-form-giant-effect-fr-0')
    .fill(
      'Résistance aux dégâts contondants après un repos long.',
    );

  // 04 — ascendance enrichie pleine page
  await shoot(page, '04-ancestry-form-enrichi-dragon-giant');

  await page.getByTestId('ancestry-form-confirm').click();
  await page.waitForSelector(
    '[data-testid="pack-editor-ancestry-row"][data-ancestry-id="peuple-des-brumes"]',
  );

  // 05 — liste pack editor avec 1 ascendance
  await page
    .getByTestId('pack-editor-ancestries')
    .scrollIntoViewIfNeeded();
  await shoot(page, '05-pack-editor-avec-1-ascendance');

  await browser.close();
  console.log(`\nGalerie complète dans ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
