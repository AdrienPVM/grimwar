import { chromium, type FullConfig } from '@playwright/test';

/**
 * Global setup Playwright (plan 13.9 fix point 2 UAT 2026-05-18).
 *
 * Pourquoi : la 1ʳᵉ spec qui hit `page.goto('/')` paye le coût cumulé du
 * cold-start Vite — compilation à la volée des chunks de la route racine
 * (LibraryScreen) puis de `/create` (lazy chunks wizard). Sur Pixel 7 emu
 * (CPU throttling Playwright), ce cumul peut dépasser 10s, ce qui faisait
 * timeout `waitForAppReady` sur la spec alphabétique en tête de file. Les
 * specs suivantes bénéficiaient du cache Vite chaud et passaient en <1s.
 *
 * Réchauffement : on ouvre `/` UNE FOIS au démarrage de la suite. Vite
 * compile les chunks de la home, puis on navigue vers `/create` pour pré-
 * compiler les chunks wizard (la route la plus lourde, touchée par 90% des
 * specs). Les specs individuelles tombent ensuite sur un dev server warm.
 *
 * Le warm-up est SILENCIEUX : on attend juste la disparition du splash (ce
 * qui prouve le boot complet), aucun assert métier. Si le warm-up échoue,
 * on log un warn (specs vont quand même tourner, juste en cold-start).
 *
 * Note : `baseURL` est lu depuis `config.projects[0].use.baseURL` ou la
 * config globale `use.baseURL`. Le fallback dur (`localhost:5179`) reste là
 * pour le cas dégénéré config malformée.
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    config.projects[0]?.use.baseURL ??
    config.webServer?.url ??
    'http://localhost:5179';

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // Warm-up route racine — compile les chunks LibraryScreen + Splash.
    await page.goto(baseURL, { timeout: 60_000, waitUntil: 'domcontentloaded' });
    await page
      .waitForFunction(() => !document.querySelector('[data-splash="true"]'), null, {
        timeout: 60_000,
      })
      .catch(() => {
        // Splash bloqué côté warm-up : pas fatal — la spec qui en a besoin
        // détectera. On veut juste avoir tenté la compilation.
      });
    // Warm-up route `/create` — chunks wizard (~90% des specs y vont).
    await page
      .goto(`${baseURL.replace(/\/$/, '')}/create`, {
        timeout: 60_000,
        waitUntil: 'domcontentloaded',
      })
      .catch(() => {
        // Idem : non fatal.
      });
    await page.close();
    console.log('[e2e:warm-up] cache Vite chaud — specs prêtes.');
  } catch (err) {
    console.warn('[e2e:warm-up] échec — les specs tourneront en cold-start.', err);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
