// Capture une galerie ordonnée pour l'UAT visuelle de JALON 3C.9 — ClassForm.
// Lance Chromium en émulation Pixel 7, exécute le parcours utilisateur puis
// dépose les PNG (pleine page + viewport pour les sections clés) dans
// uat-review/. Usage : pnpm dev (port 5180, VITE_USE_FIREBASE_EMULATOR=true)
// puis node scripts/uat-jalon-3c9.mjs
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

  // 01 — shell : la section « Classes » est rendue à la fin (et plus aucun
  // placeholder « bientôt » derrière elle — 9/9 catégories éditables in-app).
  await page.waitForSelector('[data-testid="pack-editor-classes"]');
  await page.getByTestId('pack-editor-classes').scrollIntoViewIfNeeded();
  await shoot(page, '01-pack-editor-shell-section-classes-finale');

  // Méta
  await page.getByTestId('pack-meta-id').fill('pack-class-uat');
  await page.getByTestId('pack-meta-name-fr').fill('Pack classe UAT');
  await page.getByTestId('pack-meta-author').fill('Adrien UAT');

  // Ouvrir ClassForm
  await page.getByTestId('pack-editor-add-class').click();
  await page.waitForSelector('[data-testid="class-form"]');

  // 02 — ClassForm vierge (pleine page + viewport pour ressentir l'overlay)
  await shoot(page, '02-class-form-vierge');
  await shoot(page, '02-class-form-vierge', { viewport: true });

  // === Cas 1 : Classe minimale ===
  await page.getByTestId('class-form-id').fill('cendre-pacte');
  await page.getByTestId('class-form-name-fr').fill('Cendre-pacte');
  await page
    .getByTestId('class-form-description-fr')
    .fill(
      'Pacte avec une entité de cendres qui octroie pouvoir occulte et résistance au feu.',
    );

  // Hit Die d10
  const hitDieCombo = page
    .getByTestId('class-form-hit-die')
    .getByRole('combobox');
  await hitDieCombo.focus();
  await hitDieCombo.press('Enter');
  // HIT_DICE = d6(0), d8(1), d10(2), d12(3) — 2× ArrowDown
  await hitDieCombo.press('ArrowDown');
  await hitDieCombo.press('ArrowDown');
  await hitDieCombo.press('Enter');

  // Ability principale : Charisme
  await page.getByTestId('class-form-primary-cha').click();
  // Sauvegardes : Charisme + Sagesse
  await page.getByTestId('class-form-save-cha').click();
  await page.getByTestId('class-form-save-sag').click();

  // 03 — ClassForm rempli minimal
  await shoot(page, '03-class-form-rempli-minimal');

  // === Cas 2 : enrichi — spellcasting + 1 feature + multi-classe ===
  await page.getByTestId('class-form-spellcasting-toggle').check();

  // Une aptitude de classe L1
  await page.getByTestId('class-form-feature-add').click();
  await page
    .getByTestId('class-form-feature-name-fr-0')
    .fill('Sens cendreux');
  await page
    .getByTestId('class-form-feature-description-fr-0')
    .fill(
      'Vous percevez les sources de chaleur dans un rayon de 6 mètres, même à travers une fine paroi.',
    );

  // Multi-classe : prérequis CHA 13
  await page.getByTestId('class-form-multiclass-toggle').check();
  await page.getByTestId('class-form-multiclass-min-add').click();
  const mcAbilityCombo = page
    .getByTestId('class-form-multiclass-min-ability-0')
    .getByRole('combobox');
  await mcAbilityCombo.focus();
  await mcAbilityCombo.press('Enter');
  // ABILITY_KEYS = for, dex, con, int, sag, cha — 5× ArrowDown → cha
  for (let i = 0; i < 5; i += 1) {
    await mcAbilityCombo.press('ArrowDown');
  }
  await mcAbilityCombo.press('Enter');

  // 04 — ClassForm enrichi (spellcasting + feature + multi-classe)
  await shoot(page, '04-class-form-enrichi-caster-multiclasse');

  await page.getByTestId('class-form-confirm').click();
  await page.waitForSelector(
    '[data-testid="pack-editor-class-row"][data-class-id="cendre-pacte"]',
  );

  // 05 — liste pack editor avec 1 classe (d10, lanceur complet)
  await page.getByTestId('pack-editor-classes').scrollIntoViewIfNeeded();
  await shoot(page, '05-pack-editor-avec-1-classe');

  await browser.close();
  console.log(`\nGalerie complète dans ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
