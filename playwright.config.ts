import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour le smoke e2e (plan 13.5).
 *
 * Périmètre S1 :
 *   - **Un seul navigateur** : Chromium en émulation mobile Pixel 7 (la
 *     mobile-first est le cas nominal — DM qui joue sur téléphone). Desktop
 *     +  WebKit ajoutés en S5 (plan 40 production deploy).
 *   - **Backend** : Firebase Local Emulator Suite (Auth + Firestore).
 *     `VITE_USE_FIREBASE_EMULATOR=true` redirige tous les appels vers
 *     localhost:9099 / 8080 — pendant le test, aucune requête n'atteint la
 *     base eu-west1 réelle (décision lockée CLAUDE.md).
 *   - **Java/JRE 11+** requis pour démarrer l'émulateur via
 *     `pnpm e2e:emulators`. Si l'émulateur n'est pas joignable, les specs qui
 *     dépendent d'écritures Firestore se **skippent proprement** avec un
 *     message visible (cf. `tests/e2e/fixtures.ts > waitForEmulator`) — pas
 *     de faux-vert silencieux. Les specs UI-only (modale, écran vide)
 *     continuent à tourner.
 *
 * Note : la triple gate `pnpm typecheck && pnpm test && pnpm lint` ne
 * dépend PAS de `pnpm test:e2e`. Les e2e tournent en gate séparé sur les
 * plans qui touchent routes/screens/wizard/dice/Sheet. CLAUDE.md trace la
 * règle dans la section "Required at every commit".
 */
export default defineConfig({
  testDir: 'tests/e2e',
  // Réchauffement Vite global (plan 13.9 fix point 2 UAT 2026-05-18) — évite
  // le timeout `waitForAppReady` sur la 1ʳᵉ spec qui paie le cold-start Vite
  // (compilation lazy chunks wizard sur Pixel 7 emu).
  globalSetup: './tests/e2e/global-setup.ts',
  // Timeout global d'un test : 60s suffit largement pour les parcours wizard
  // (le plus long ~10s à la main) avec marge pour la boot Firestore.
  timeout: 60_000,
  expect: {
    // 5s pour qu'un getByRole/getByText apparaisse — pratique sur les
    // transitions de routes (Suspense lazy chunks).
    timeout: 5_000,
  },
  // Local : aucun retry — un test flaky doit être détecté, pas masqué.
  // CI : 1 retry pour absorber un flake réseau ponctuel (à activer plus tard).
  retries: process.env['CI'] === 'true' ? 1 : 0,
  // Parallélisme : 1 par défaut local pour éviter les courses sur l'émulateur
  // (les tests partagent le même Firestore en mémoire). Augmentable plus tard
  // par projectId-per-worker si besoin.
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: 'http://localhost:5179',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  // Boot du dev server Vite avec `VITE_USE_FIREBASE_EMULATOR=true` pour cette
  // session : redirige les appels Firebase vers localhost. Sans `e2e:emulators`
  // lancé en parallèle, l'auth anonyme échoue silencieusement → l'app tombe en
  // empty state (utile : permet aux specs UI-only de tourner SANS Java).
  webServer: {
    // Port 5179 (au lieu de 5173) pour ne pas entrer en conflit avec un
    // `pnpm dev` qu'Adrien aurait déjà ouvert (5173/5174/5175). `--strictPort`
    // force Vite à échouer si 5179 est déjà pris plutôt que de migrer
    // silencieusement vers un autre port que Playwright ne saura pas trouver.
    command: 'pnpm dev --port 5179 --strictPort',
    env: {
      VITE_USE_FIREBASE_EMULATOR: 'true',
      // Override projectId pour l'e2e — l'émulateur tourne en
      // `singleProjectMode: true` (cf. firebase.json) avec `--project
      // demo-grimwar` (cf. package.json:test:e2e). Si le client utilise
      // `dndjourney-2ee6f` (de .env.local) au lieu de demo-grimwar, les
      // documents écrits par l'Admin SDK côté seed (project demo-grimwar)
      // ne sont pas visibles depuis le client (project dndjourney-2ee6f).
      // L'override aligne le client sur le project ID que l'Admin SDK et
      // l'émulateur utilisent. Acté 2026-05-18 suite à UAT plan 13.9 — bug
      // resté caché tant que les specs de seed étaient skippées sans Java.
      VITE_FIREBASE_PROJECT_ID: 'demo-grimwar',
    },
    url: 'http://localhost:5179',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
