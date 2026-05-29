import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Garde structurelle Bug 1 — Service Worker vs invalidation (post-13.7).
 *
 * `index.json` est le fichier qui PORTE le signal de fraîcheur (contentHash).
 * S'il est mis en `StaleWhileRevalidate` côté SW Workbox, un SW persistant
 * d'une session antérieure peut servir un ancien `index.json` au boot
 * suivant — l'app voit alors `localHash === remoteHash` (les deux périmés)
 * et ne purge jamais le cache Dexie. C'est un piège latent garanti en prod
 * PWA (le SW est enregistré).
 *
 * Fix : `index.json` passe en NetworkFirst (online → vrai disque, offline →
 * cache). Les autres `/data/*.json` peuvent rester en SWR. Ce test bloque
 * une régression de la config Workbox vers SWR sur index.json.
 *
 * Red-before-green : vu rouge sur la config pré-fix (un seul pattern
 * `/data/.*\.json$` en SWR), vert après séparation.
 *
 * Étendu JALON 1D.4b avec les invariants PWA precache + assets manifest.
 */
describe('SW workbox config — index.json ne doit pas être SWR (Bug 1 latent)', () => {
  const viteConfigPath = join(process.cwd(), 'vite.config.ts');
  const viteConfig = readFileSync(viteConfigPath, 'utf8');

  it('contient une règle dédiée index.json (NetworkFirst)', () => {
    // Le critère : il existe une règle runtime caching qui matche
    // explicitement index.json avec un handler NetworkFirst.
    // On cherche le motif texte du handler — un test de présence,
    // pas de sémantique runtime (qui demanderait un vrai SW lancé).
    const hasIndexJsonRule =
      /index\.json/.test(viteConfig) && /NetworkFirst/.test(viteConfig);
    expect(hasIndexJsonRule).toBe(true);
  });

  it("la règle SWR sur /data/*.json exclut explicitement index.json (ou index.json a son propre handler placé AVANT)", () => {
    // Workbox applique le premier `urlPattern` qui matche dans l'ordre. Donc
    // soit index.json a son propre handler placé AVANT le pattern générique
    // `/data/.*\.json$`, soit le pattern générique exclut index.json.
    //
    // On vérifie : la position de la mention `index.json` dans le fichier
    // précède celle de `StaleWhileRevalidate` sur le pattern data.
    const indexJsonPos = viteConfig.indexOf('index.json');
    const swrPos = viteConfig.indexOf('StaleWhileRevalidate');
    expect(indexJsonPos).toBeGreaterThan(0);
    expect(swrPos).toBeGreaterThan(0);
    expect(indexJsonPos).toBeLessThan(swrPos);
  });
});

/**
 * JALON 1D.4b — SW precache + PWA manifest assets.
 *
 * Le critère minimum pour que `pnpm build` produise une PWA installable +
 * offline-loadable :
 *  - VitePWA en `registerType: 'autoUpdate'` (auto-injecte le script de
 *    registration dans `dist/index.html` — pas besoin de code dans main.tsx).
 *  - `workbox.globPatterns` inclut HTML/JS/CSS/JSON (les bundles SRD
 *    `public/data/*.json` ET les chunks Vite). Sinon le précache rate les
 *    bons fichiers et le offline-load échoue silencieusement.
 *  - Les 4 icons + favicon.svg référencés par manifest + `index.html`
 *    existent sur disque (sinon manifest invalide + 404 console).
 *
 * Ces tests bloquent dur les régressions de config et garantissent que
 * `pnpm test:e2e:preview > offline-load.spec.ts` ne casse pas pour une
 * raison triviale (config oubliée ou asset manquant).
 */
describe('PWA precache + assets manifest (1D.4b)', () => {
  const ROOT = process.cwd();
  const viteConfigPath = join(ROOT, 'vite.config.ts');
  const indexHtmlPath = join(ROOT, 'index.html');
  const viteConfig = readFileSync(viteConfigPath, 'utf8');
  const indexHtml = readFileSync(indexHtmlPath, 'utf8');

  it("registerType 'autoUpdate' est positionné (auto-injection de registerSW)", () => {
    // Avec autoUpdate + injectRegister auto (défaut), VitePWA insère
    // automatiquement `<script src="/registerSW.js">` dans dist/index.html
    // au build. Si ce flag passe à 'prompt' ou disparaît, le SW n'est plus
    // auto-enregistré → l'offline-load ne marche plus.
    expect(viteConfig).toMatch(/registerType:\s*'autoUpdate'/);
  });

  it('globPatterns inclut HTML + JS + CSS + JSON (bundles précachés)', () => {
    // Si un de ces types est retiré (typo refactor), le précache rate des
    // assets critiques et l'app ne se charge pas offline. Test syntaxique
    // sur la chaîne — pas robuste à toutes les reformulations mais attrape
    // les régressions naïves.
    expect(viteConfig).toMatch(/globPatterns:.*['"]?\*\*\/\*\.\{[^}]*\}['"]?/s);
    const pattern = viteConfig.match(/globPatterns:\s*\[\s*['"]([^'"]+)['"]/);
    expect(pattern, 'globPatterns introuvable dans vite.config.ts').not.toBeNull();
    const exts = pattern?.[1] ?? '';
    for (const required of ['html', 'js', 'css', 'json']) {
      expect(
        exts.includes(required),
        `globPatterns doit inclure ${required} (trouvé : ${exts})`,
      ).toBe(true);
    }
  });

  it('les 3 icons manifest existent sur disque avec extension PNG', () => {
    // Le manifest référence icon-192.png + icon-512.png + icon-maskable.png.
    // Si l'un manque, manifest est techniquement invalide (Lighthouse fail) +
    // le précache Workbox rate l'asset → écran d'accueil iOS sans icône.
    const icons = [
      'public/icons/icon-192.png',
      'public/icons/icon-512.png',
      'public/icons/icon-maskable.png',
    ];
    for (const icon of icons) {
      const fullPath = join(ROOT, icon);
      expect(existsSync(fullPath), `${icon} doit exister sur disque`).toBe(true);
      // Sanity check : PNG fait au minimum 8 octets (signature PNG).
      expect(
        statSync(fullPath).size,
        `${icon} doit avoir un contenu non vide`,
      ).toBeGreaterThan(8);
    }
  });

  it('favicon.svg + apple-touch-icon.png référencés par index.html existent', () => {
    // `index.html` référence `/favicon.svg` (icon) et `/icons/apple-touch-icon.png`.
    // Si l'un manque, console pollutée par 404 au boot iOS/desktop.
    expect(indexHtml).toMatch(/href="\/favicon\.svg"/);
    expect(indexHtml).toMatch(/href="\/icons\/apple-touch-icon\.png"/);
    expect(
      existsSync(join(ROOT, 'public/favicon.svg')),
      'public/favicon.svg doit exister (référencé par index.html)',
    ).toBe(true);
    expect(
      existsSync(join(ROOT, 'public/icons/apple-touch-icon.png')),
      'public/icons/apple-touch-icon.png doit exister (référencé par index.html)',
    ).toBe(true);
  });
});
