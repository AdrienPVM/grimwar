import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

/**
 * JALON 1B.2 — backfill structured `effects[]` sur les 4 magic items SRD
 * candidats v0. Garde-fou de régression : si une dérive du bundle écrasait
 * ces effets, l'engine de propagation cesserait silencieusement de fonctionner.
 *
 * Catégorie 3 (« fidélité bundle — entrées de référence figées ») de la
 * politique content-truth du projet (CLAUDE.md).
 *
 * Référence SRD : descriptions issues de `FR_SRD_CC_v5.2.1.pdf` / `SRD_CC_v5.2.1.pdf` :
 *  - Amulet of Health → CON = max(CON, 19)
 *  - Gauntlets of Ogre Power → FOR = max(FOR, 19)
 *  - Ring of Protection → +1 AC, +1 toutes sauves
 *  - Cloak of Protection → +1 AC, +1 toutes sauves
 */

interface MagicItemEntry {
  id: string;
  effects?: ReadonlyArray<Record<string, unknown>>;
}

async function loadMagicItems(): Promise<MagicItemEntry[]> {
  const raw = await readFile('public/data/magic-items.json', 'utf-8');
  return JSON.parse(raw) as MagicItemEntry[];
}

function findItem(items: readonly MagicItemEntry[], id: string): MagicItemEntry {
  const found = items.find((it) => it.id === id);
  expect(found, `magic item "${id}" introuvable dans le bundle`).toBeDefined();
  return found as MagicItemEntry;
}

describe('JALON 1B.2 — effects[] backfill SRD v0 (4 items candidats)', () => {
  it('`amulette-de-sante` (Amulet of Health) → ability-set-floor CON 19', async () => {
    const items = await loadMagicItems();
    const entry = findItem(items, 'amulette-de-sante');
    expect(entry.effects).toEqual([
      { kind: 'ability-set-floor', ability: 'con', minimum: 19 },
    ]);
  });

  it('`gantelets-de-puissance-d-ogre` (Gauntlets of Ogre Power) → ability-set-floor FOR 19', async () => {
    const items = await loadMagicItems();
    const entry = findItem(items, 'gantelets-de-puissance-d-ogre');
    expect(entry.effects).toEqual([
      { kind: 'ability-set-floor', ability: 'for', minimum: 19 },
    ]);
  });

  it('`anneau-de-protection` (Ring of Protection) → ac-bonus +1 + save-bonus-all +1', async () => {
    const items = await loadMagicItems();
    const entry = findItem(items, 'anneau-de-protection');
    expect(entry.effects).toEqual([
      { kind: 'ac-bonus', bonus: 1 },
      { kind: 'save-bonus-all', bonus: 1 },
    ]);
  });

  it('`cape-de-protection` (Cloak of Protection) → ac-bonus +1 + save-bonus-all +1', async () => {
    const items = await loadMagicItems();
    const entry = findItem(items, 'cape-de-protection');
    expect(entry.effects).toEqual([
      { kind: 'ac-bonus', bonus: 1 },
      { kind: 'save-bonus-all', bonus: 1 },
    ]);
  });
});
