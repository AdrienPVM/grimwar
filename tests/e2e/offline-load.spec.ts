import { expect, test } from '@playwright/test';

/**
 * JALON 1D.4b — offline-load e2e (preview-mode).
 *
 * Vérifie que l'app est utilisable hors réseau APRÈS une première visite
 * online : le Service Worker (Workbox généré par VitePWA) précache HTML, JS,
 * CSS et les bundles `public/data/*.json` au boot, puis sert tout depuis le
 * cache quand le navigateur est offline.
 *
 * **Pourquoi preview-mode** (cf. `playwright.preview.config.ts`) :
 * VitePWA en dev mode n'enregistre PAS le SW par défaut. Le précache et la
 * navigation route ne tournent qu'en build de production. Cette spec est donc
 * lancée contre `vite preview` (qui sert `dist/` + `dist/sw.js`), pas contre
 * `vite dev`. Le spec **n'est jamais exécutée par `pnpm test:e2e`** (config
 * dev) — uniquement par `pnpm test:e2e:preview`.
 *
 * **Stratégie du test** :
 *   1. Visite `/` online → SW installe, active, `clients.claim()` (immédiat
 *      via `registerType: 'autoUpdate'` + `skipWaiting` Workbox).
 *   2. Attend que `navigator.serviceWorker.controller !== null` (page sous
 *      contrôle SW) ET que `workbox-precache-v2` contienne au minimum
 *      `index.html` (preuve que le précache a terminé).
 *   3. Bascule `context.setOffline(true)`.
 *   4. Reload de la page. La requête de `index.html` doit être servie par le
 *      SW depuis le cache (route `NavigationRoute(createHandlerBoundToURL("index.html"))`).
 *   5. L'app doit rendre la LibraryScreen (route `/`) — preuve que :
 *      - HTML cached → SW intercepted
 *      - JS bundles cached → React boote
 *      - CSS cached → styles présents
 *      - `public/data/*.json` cached → contenu disponible (Dexie est l'autre
 *        moitié, mais ici on vérifie le SW seul).
 *   6. Reconnect (cleanup).
 *
 * **Ce qui n'est PAS testé ici** (intentionnel — scope minimaliste) :
 *   - Persistence des persos Firestore en offline-load (le test du splash
 *     anonyme empêche l'auth de résoudre sans réseau émulateur). Le périmètre
 *     V1 1D.4 disait « fiche du joueur lisible depuis Dexie cache » ; en
 *     pratique la fiche est dans Firestore (pas Dexie), et l'auth anon offline
 *     vs. émulateur indispo demande un setup hors-scope. Ce qu'on prouve : le
 *     **chargement de l'app** marche offline — c'est le critère le plus
 *     critique vu que sans ça, rien d'autre n'a de sens.
 *
 * **Source des invariants Workbox** : `vite.config.ts > VitePWA > workbox`
 * configure `globPatterns: ['**\/*.{js,css,html,svg,png,ico,woff2,json}']`
 * et la navigation route fallback (auto-injectée par `generateSW`). Si la
 * config régresse (ex. retrait du précache HTML), cette spec casse rouge.
 */
test.describe('Service Worker — offline-load après première visite online', () => {
  test('SW précache index.html + bundles → reload offline rend la LibraryScreen', async ({
    context,
    page,
  }) => {
    // 1. Boot online.
    await page.goto('/');

    // 2. Attendre la registration du SW. `navigator.serviceWorker.ready`
    //    résout quand au moins UN SW est installé ET actif. Sur la 1re
    //    visite, c'est la fin de l'install+activate.
    await page.waitForFunction(
      async () => {
        const reg = await navigator.serviceWorker.ready;
        return reg.active !== null;
      },
      null,
      { timeout: 15_000 },
    );

    // 3. Attendre que la page elle-même soit sous contrôle SW (clients.claim
    //    activé via `registerType: 'autoUpdate'` + Workbox `clientsClaim()`).
    //    Sans `controller`, la page n'a pas été interceptée — un reload
    //    offline servirait du 404 par le réseau direct.
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
      null,
      { timeout: 15_000 },
    );

    // 4. Attendre que le précache contienne au minimum `index.html`. Workbox
    //    nomme son cache `workbox-precache-v2-<scope>`. On itère sur tous les
    //    caches dispo et on cherche une entrée dont l'URL termine par
    //    `index.html`. Le précache peut prendre quelques centaines de ms
    //    après activate — on poll jusqu'à 10s.
    await page.waitForFunction(
      async () => {
        const names = await caches.keys();
        for (const name of names) {
          const cache = await caches.open(name);
          const reqs = await cache.keys();
          if (reqs.some((r) => r.url.endsWith('/index.html'))) return true;
        }
        return false;
      },
      null,
      { timeout: 10_000 },
    );

    // 5. Sanity check côté UI online : la LibraryScreen est rendue. On cherche
    //    le CTA « Créer » qui est présent en empty state ET liste non-vide.
    //    Le sélecteur est volontairement souple — on veut prouver que l'app
    //    rend, pas tester le contenu exact.
    await expect(
      page.getByRole('button', { name: /Créer/i }).first(),
      'LibraryScreen doit afficher le CTA « Créer » au boot online.',
    ).toBeVisible({ timeout: 10_000 });

    // 6. Bascule offline ET reload. La requête de `index.html` doit être
    //    servie par le SW depuis le précache via `NavigationRoute`.
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 7. L'app doit re-rendre la LibraryScreen — preuve que HTML+JS+CSS sont
    //    bien servis depuis le cache. Si le SW n'avait pas pris le contrôle
    //    OU si le précache était manquant, on aurait un écran « pas de
    //    connexion » du navigateur ou un crash JS.
    await expect(
      page.getByRole('button', { name: /Créer/i }).first(),
      'Après reload offline, la LibraryScreen doit re-rendre — preuve que le SW sert HTML+JS+CSS depuis le cache.',
    ).toBeVisible({ timeout: 15_000 });

    // 8. Reconnect (cleanup pour ne pas laisser la page en état offline si
    //    d'autres tests partagent le contexte — workers: 1 ici, mais bonne
    //    hygiène).
    await context.setOffline(false);
  });
});
