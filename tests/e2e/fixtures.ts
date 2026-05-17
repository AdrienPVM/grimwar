import { expect, type Page } from '@playwright/test';

/**
 * Helpers partagés pour les e2e Playwright (plan 13.5).
 *
 * Principes :
 *   - `expectModalInViewport(page)` est LA primitive critique du plan : elle
 *     transforme la classe de défaut "modale rendue dans le flux du parent au
 *     lieu du portal vers `body`" en bug détectable automatiquement. C'est le
 *     filet qui aurait attrapé en jsdom le bug de modale du wizard plan 05.
 *   - `waitForEmulator()` : ping l'émulateur Firestore avant les specs qui en
 *     dépendent. Si l'émulateur n'est pas joignable (Java pas installé, port
 *     occupé, etc.), `test.skip` la spec avec un message **visible** dans la
 *     sortie Playwright — pas de faux-vert silencieux.
 *   - `waitForAppReady(page)` : attend la résolution du splash auth pour que
 *     les premiers `getByRole` ne tombent pas sur un écran de chargement.
 */

/**
 * Vérifie qu'une modale ouverte respecte les 3 invariants critiques :
 *   1. `role="dialog"` visible.
 *   2. Bounding box du dialog **strictement inclus** dans le viewport (la
 *      modale est visible sans qu'il faille scroller la page derrière).
 *   3. `document.body.style.overflow === 'hidden'` (scroll de la page
 *      bloqué tant que la modale est ouverte).
 *
 * Helper conçu pour être réutilisable par TOUTE spec qui ouvre une modale
 * (wizard `?`, sheet item-detail, combat death-saves, dice physical-roll).
 *
 * On accepte une **tolérance de 1px** sur les bornes pour gérer les bugs
 * d'arrondi sub-pixel du moteur de rendu Chromium ; au-delà la modale
 * déborde réellement.
 */
export async function expectModalInViewport(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog').first();
  await expect(dialog, 'La modale doit être visible (role=dialog).').toBeVisible();

  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error(
      "[expectModalInViewport] Viewport size indisponible — config Playwright incomplète.",
    );
  }

  // On valide la position du PANEL (la card visible centrée) et non du
  // backdrop. Pourquoi : le backdrop est `fixed inset-0` ; sa bbox équivaut
  // au viewport par définition. Mais Chromium peut le reporter +1 à +6 px
  // au-delà du viewport reporté par Playwright sur émulation mobile (artefact
  // de zoom / device pixel ratio). Tester le panel reflète mieux le bug
  // utilisateur réel : « le panneau lui-même est-il visible sans scroll ? ».
  // Le bug du wizard plan 05 portait sur la position du panel (rendu en bas
  // de page, hors viewport, sans backdrop), pas sur les bornes du backdrop.
  const panel = dialog.locator('> div[tabindex="-1"]').first();
  await expect(
    panel,
    "Le panel interne de la modale doit être présent (tabindex=-1 child du dialog).",
  ).toBeVisible();
  const box = await panel.boundingBox();
  if (!box) {
    throw new Error(
      "[expectModalInViewport] BoundingBox du panel introuvable — la structure DetailModal a probablement changé.",
    );
  }

  const TOL = 1; // px d'arrondi sub-pixel acceptés.
  expect(
    box.x,
    `Le panel déborde à gauche (x=${box.x}, attendu ≥ -${TOL}).`,
  ).toBeGreaterThanOrEqual(-TOL);
  expect(
    box.y,
    `Le panel déborde en haut (y=${box.y}, attendu ≥ -${TOL}).`,
  ).toBeGreaterThanOrEqual(-TOL);
  expect(
    box.x + box.width,
    `Le panel déborde à droite (right=${box.x + box.width}, vw=${viewport.width}).`,
  ).toBeLessThanOrEqual(viewport.width + TOL);
  expect(
    box.y + box.height,
    `Le panel déborde en bas (bottom=${box.y + box.height}, vh=${viewport.height}).`,
  ).toBeLessThanOrEqual(viewport.height + TOL);

  // body.overflow=hidden — scroll de la page bloqué derrière la modale.
  const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
  expect(
    bodyOverflow,
    "Le scroll de la page doit être verrouillé (body.style.overflow=hidden) tant que la modale est ouverte.",
  ).toBe('hidden');
}

/**
 * Vérifie qu'après fermeture d'une modale, le scroll du body est restauré
 * (= revient à la valeur initiale, généralement chaîne vide).
 *
 * À appeler APRÈS le clic sur fermeture + `await expect(dialog).toBeHidden()`.
 */
export async function expectBodyScrollRestored(page: Page): Promise<void> {
  const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
  expect(
    bodyOverflow,
    "Le scroll de la page doit être restauré après fermeture de la modale (body.style.overflow ≠ 'hidden').",
  ).not.toBe('hidden');
}

/**
 * Attend que l'app soit prête : le splash a disparu, on est sur l'écran réel.
 * Le splash render `data-splash="true"` (cf. `src/shared/components/splash.tsx`).
 * Si l'émulateur n'est pas joignable, l'auth anonyme échoue mais `setReady(true)`
 * est appelé immédiatement par `onAuthStateChanged(null)` → l'app boote en
 * empty state (user=null). Le splash disparaît dans les deux cas.
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Le splash disparaît dès que `auth.isReady === true`. En pratique <1s.
  await page.waitForFunction(
    () => !document.querySelector('[data-splash="true"]'),
    null,
    { timeout: 10_000 },
  );
}

/**
 * Ping l'émulateur Firestore (HTTP GET sur la racine). Retourne `true` si
 * joignable (réponse rapide quelle que soit le code HTTP), `false` sinon.
 *
 * À utiliser dans `test.beforeAll` pour skip les specs qui dépendent d'écritures
 * Firestore quand l'émulateur n'est pas dispo (typiquement : Java pas installé).
 *
 * Pourquoi ping HTTP plutôt que tcp connect : Playwright ne expose pas de tcp
 * connect natif portable Windows/Linux. fetch() suffit — la racine de
 * l'émulateur répond toujours (200 ou 404 selon la version), seule l'erreur de
 * fetch indique l'absence.
 */
export async function isEmulatorReachable(): Promise<boolean> {
  try {
    const res = await fetch('http://127.0.0.1:8080/', {
      signal: AbortSignal.timeout(1500),
    });
    // 200 ou 404 — peu importe le code, ce qu'on teste c'est que QUELQUE CHOSE
    // répond sur ce port (= émulateur Firestore up).
    return res.status >= 200 && res.status < 600;
  } catch {
    return false;
  }
}

/**
 * Sucre pour `test.beforeAll` : skip la suite si l'émulateur n'est pas
 * joignable. Affiche un message clair côté reporter Playwright.
 *
 * Pattern d'usage :
 *
 * ```ts
 * import { test } from '@playwright/test';
 * import { requireEmulator } from './fixtures';
 *
 * test.beforeAll(async () => {
 *   await requireEmulator();
 * });
 * ```
 *
 * Note : on ne peut pas utiliser `test.skip(condition, reason)` ici car
 * `beforeAll` ne reçoit pas `test` en argument. On lance une erreur typée
 * que Playwright affiche en "skipped" via `test.skip()` côté caller, ou on
 * passe par `test.beforeEach(() => test.skip(!ok))` — voir helper ci-dessous.
 */
export async function requireEmulator(): Promise<boolean> {
  const ok = await isEmulatorReachable();
  if (!ok) {
    console.warn(
      '\n[e2e] ⚠ Firestore emulator unreachable on 127.0.0.1:8080 — skipping spec.\n' +
        '       Run `pnpm e2e:emulators` in another terminal (requires Java/JRE 11+).\n',
    );
  }
  return ok;
}

/**
 * Remplit l'étape "Identité" du wizard (nom + niveau + alignement).
 * Le wizard charge ses contenus depuis `public/data/*.json` (pas de Firestore),
 * donc cette étape fonctionne **sans émulateur**.
 */
export async function fillWizardIdentity(
  page: Page,
  opts: { name: string; level?: number },
): Promise<void> {
  const nameInput = page.getByPlaceholder(/Nom de l['']aventurier/i);
  await nameInput.fill(opts.name);
  if (opts.level && opts.level !== 1) {
    // NumberInput a un bouton "incrémenter" — plus robuste qu'un fill direct.
    const inc = page.getByRole('button', { name: /augmenter/i }).first();
    for (let i = 1; i < opts.level; i++) await inc.click();
  }
}

/**
 * Avance d'une étape du wizard via le bouton "Suivant" inline desktop ou
 * la flèche "→" en mobile. La sélection automatique du bouton se fait via
 * `getByRole('button', { name: /Suivant|→/ })`.
 */
export async function wizardNext(page: Page): Promise<void> {
  // Mobile a un "→", desktop a "Suivant →". On accepte les deux.
  const next = page
    .getByRole('button')
    .filter({ hasText: /^(Suivant|→)/ })
    .first();
  await next.click();
}
