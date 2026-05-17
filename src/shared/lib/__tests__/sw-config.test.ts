import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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
