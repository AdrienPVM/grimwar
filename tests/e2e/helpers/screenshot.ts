import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { type Page, type TestInfo } from '@playwright/test';

/**
 * Plan 13.9 commit 4c — helper de capture e2e systématique pour réduire l'UAT
 * manuel d'Adrien.
 *
 * Décision : générer + archiver des screenshots à des points clés du parcours
 * (changement d'onglet de la fiche, ouverture d'une modale, etc.) — PAS de
 * comparaison pixel-diff automatique. Raisons (cf. réponse Claude commit
 * 4c) :
 *
 *  1. Cohérence avec plan 13.14 où on a tranché contre le pixel-diff (tests
 *     de layout = DOM uniquement). Adopter le diff visuel ici puis l'interdire
 *     là-bas serait une règle bipolaire.
 *  2. Fragilité — sub-pixel antialiasing macOS vs CI Linux, animations en
 *     cours au moment du shot, fonts. Un baseline à 1 px près casse pour
 *     mauvaises raisons.
 *  3. Redondance — l'identité de contenu est déjà testée via le DOM (cat. 2
 *     du content-truth testing policy). Si le DOM est correct mais le visuel
 *     dérive, c'est un bug de style isolé que l'UAT humain d'Adrien attrape.
 *
 * Usage :
 *
 *   import { takeStepScreenshot } from './helpers/screenshot';
 *   await takeStepScreenshot(page, testInfo, 'magie-grimoire');
 *
 * Chaque capture est écrite dans `test-results/screenshots/{spec-slug}/`
 * avec un nom déterministe basé sur la step. Playwright l'attache aussi
 * comme artefact via `testInfo.attach`, ce qui le rend visible dans le
 * rapport HTML (`playwright-report/index.html`).
 *
 * Le helper est SILENT-PASS : il ne fait jamais échouer le test. Une
 * capture qui échoue (browser fermé, viewport invalide) est traitée en
 * `console.warn`, pas en `throw` — la galerie est un complément, pas une
 * gate.
 *
 * **Pleine page obligatoire** (`fullPage: true`) — acté 2026-05-19 suite à
 * l'UAT 4c où les captures viewport-only ne montraient qu'un fragment de
 * la fiche scrollable, rendant la validation impossible. Une capture
 * tronquée n'est pas une validation. Si un panneau interne a son propre
 * overflow (scroll indépendant du document), `fullPage` ne le capturera
 * pas — à traiter au cas par cas via un screenshot ciblé sur l'élément.
 *
 * **Exception modales — double-capture (`viewport: true`)** acté 2026-05-20
 * suite à l'UAT 4c : une modale ouverte par-dessus la fiche reste dans le
 * flux du document quand `fullPage` reprojette toute la hauteur, donc le
 * ressenti d'overlay (backdrop, ancrage `items-end` mobile, position
 * stacking) est illisible. Pour ces cas, ajouter une seconde capture
 * `viewport: true` en plus de la pleine page. Le ressenti visuel se lit sur
 * la capture viewport ; le contenu textuel exhaustif sur la pleine page.
 */
export async function takeStepScreenshot(
  page: Page,
  testInfo: TestInfo,
  step: string,
  options: { viewport?: boolean } = {},
): Promise<void> {
  const specSlug = slugify(testInfo.titlePath.slice(-1)[0] ?? 'unknown');
  const dir = path.join('test-results', 'screenshots', specSlug);
  const fullPage = options.viewport !== true;
  const suffix = fullPage ? '' : '-viewport';
  const filename = `${zeroPadStep(testInfo)}-${slugify(step)}${suffix}.png`;
  const target = path.join(dir, filename);
  try {
    mkdirSync(dir, { recursive: true });
    const buffer = await page.screenshot({
      path: target,
      fullPage,
      animations: 'disabled',
    });
    await testInfo.attach(`${step}${suffix}.png`, {
      body: buffer,
      contentType: 'image/png',
    });
  } catch (err) {
    // Silent-pass — la galerie n'est pas une gate. Stack en console pour CI.
    console.warn(
      `[takeStepScreenshot] échec capture "${step}" pour spec "${specSlug}" :`,
      err,
    );
  }
}

/** Compteur de step par TestInfo — préfixe `01-`, `02-`, etc. pour ordre lisible. */
function zeroPadStep(testInfo: TestInfo): string {
  // Playwright n'expose pas de compteur de step natif. On l'attache au testInfo.
  const counter = (testInfo as TestInfo & { __screenshotStep?: number }).__screenshotStep ?? 0;
  const next = counter + 1;
  (testInfo as TestInfo & { __screenshotStep?: number }).__screenshotStep = next;
  return String(next).padStart(2, '0');
}

function slugify(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
