import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright **preview-mode** (JALON 1D.4b).
 *
 * Pourquoi une 2e config :
 *   - `playwright.config.ts` (dev mode) boote Vite en `pnpm dev` + Firebase
 *     emulator. C'est l'environnement nominal des e2e fonctionnels (login,
 *     wizard, sheet, dice).
 *   - Pour tester le **Service Worker + precache offline**, on a besoin de
 *     l'environnement de PRODUCTION : `pnpm build` génère `dist/sw.js` avec
 *     précache complet (33 entrées : HTML, JS, CSS, data/*.json), `pnpm
 *     preview` le sert sur `localhost:5180`. En dev mode, VitePWA n'enregistre
 *     PAS le SW par défaut — un test offline contre dev mode mesurerait le
 *     vide.
 *
 * Cette config tourne UNIQUEMENT la spec `offline-load.spec.ts` (testMatch
 * étroit) et ne dépend PAS de Firebase emulator (le test vérifie le précache
 * SW, pas les écritures Firestore — la fiche reste hors-scope).
 *
 * Usage : `pnpm test:e2e:preview` (à ajouter dans package.json).
 *
 * Cf. CLAUDE.md « e2e environment » — les emulators sont la cible nominale
 * S1+ pour les tests qui touchent Firestore. Cette config est l'exception
 * scopée sur le test de précache pur.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: ['offline-load.spec.ts'],
  timeout: 60_000,
  expect: { timeout: 5_000 },
  retries: process.env['CI'] === 'true' ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-preview' }],
  ],
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium-preview',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    // Build d'abord, puis sert avec `vite preview`. Playwright attend que
    // `localhost:5180` réponde 200 avant de lancer les specs. La build prend
    // ~2s, le preview démarre en <1s — total ~3-4s de boot avant les tests.
    // strictPort pour ne pas migrer silencieusement vers un port que
    // Playwright ne saurait pas trouver.
    command: 'pnpm build && pnpm preview --port 5180 --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000, // pnpm build peut prendre 30-60s sur runner CI froid
  },
});
