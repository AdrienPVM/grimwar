import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

/**
 * D24 — Doublet `amulette-de-sante` / `amulette-de-bonne-sante`.
 *
 * Le SRD CC v5.2.1 expose 2 amulettes de santé distinctes :
 *   - **Amulet of Health** (`SRD_CC_v5.2.1.txt:20913`) — Wondrous Item, Rare,
 *     Requires Attunement. Constitution = 19.
 *     FR officiel `FR_SRD_CC_v5.2.1.txt:24400` : « Amulette de santé ».
 *   - **Periapt of Health** (`SRD_CC_v5.2.1.txt:23546`) — Wondrous Item,
 *     Uncommon, Requires Attunement. Action Magie 1×/aube → 2d4+2 PV, Avantage
 *     contre Empoisonné.
 *     FR officiel `FR_SRD_CC_v5.2.1.txt:24373` : « Amulette de bonne santé ».
 *
 * Le bundle baseline AideDD a swappé les noms FR et introduit un homebrew
 * « immunité maladies » non-SRD. D24 résout en plaçant les deux entrées SRD
 * fidèlement sous les bons slugs.
 *
 * Ce garde-fou empêche toute régression silencieuse du mapping.
 */

interface MagicItemEntry {
  id: string;
  name: { fr: string; en?: string };
  rarity: string;
  attunement: boolean | { fr: string; en?: string };
  magicDescription: { fr: string; en?: string };
  source: string;
}

async function loadMagicItems(): Promise<MagicItemEntry[]> {
  const raw = await readFile('public/data/magic-items.json', 'utf-8');
  return JSON.parse(raw) as MagicItemEntry[];
}

describe('D24 — Amulet of Health / Periapt of Health (SRD CC v5.2.1)', () => {
  it('`amulette-de-sante` = Amulet of Health SRD (rare, CON=19, attunement)', async () => {
    const items = await loadMagicItems();
    const entry = items.find((it) => it.id === 'amulette-de-sante');
    expect(entry, "L'entrée `amulette-de-sante` doit exister.").toBeDefined();
    expect(entry?.name.fr).toBe('Amulette de santé');
    expect(entry?.rarity).toBe('rare');
    expect(entry?.attunement).toBe(true);
    expect(entry?.source).toBe('srd-5.2.1');
    expect(entry?.magicDescription.fr).toMatch(/Constitution est de 19/);
  });

  it('`amulette-de-bonne-sante` = Periapt of Health SRD (uncommon, 2d4+2 PV, advantage Empoisonné, attunement)', async () => {
    const items = await loadMagicItems();
    const entry = items.find((it) => it.id === 'amulette-de-bonne-sante');
    expect(entry, "L'entrée `amulette-de-bonne-sante` doit exister.").toBeDefined();
    expect(entry?.name.fr).toBe('Amulette de bonne santé');
    expect(entry?.rarity).toBe('uncommon');
    expect(entry?.attunement).toBe(true);
    expect(entry?.source).toBe('srd-5.2.1');
    expect(entry?.magicDescription.fr).toMatch(/2d4 \+ 2 points de vie/);
    expect(entry?.magicDescription.fr).toMatch(/Avantage/);
    expect(entry?.magicDescription.fr).toMatch(/Empoisonné/);
  });

  it("aucune mention de l'homebrew « immunité aux maladies » ne subsiste sur ces 2 slugs", async () => {
    const items = await loadMagicItems();
    for (const slug of ['amulette-de-sante', 'amulette-de-bonne-sante']) {
      const entry = items.find((it) => it.id === slug);
      expect(entry?.magicDescription.fr ?? '').not.toMatch(/immunisé contre toutes les maladies/i);
    }
  });
});
