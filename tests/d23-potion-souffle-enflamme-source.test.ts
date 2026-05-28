import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

/**
 * D23 — `potion-de-souffle-enflamme` (Potion of Fire Breath) **n'existe PAS**
 * dans le SRD CC v5.2.1 (vérifié dans `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 * et `FR_SRD_CC_v5.2.1.txt` : « Fire Breath » n'apparaît qu'en tant que capacité
 * de stat-block de dragons, jamais comme potion).
 *
 * L'entrée est grandfathered (héritage AideDD) et tolérée par la politique de
 * contenu LOCKED **tant qu'elle est tagguée `aidedd-homebrew`** — JAMAIS sous un
 * tag SRD (`srd-5.2.1`) ou `basic-rules` qui mentirait sur la provenance.
 *
 * Ce garde-fou interdit toute régression silencieuse du tag.
 */

interface MagicItemEntry {
  id: string;
  source: 'srd-5.2.1' | 'basic-rules' | 'aidedd-homebrew';
}

describe('D23 — potion-de-souffle-enflamme (homebrew AideDD grandfathered)', () => {
  it('reste tagguée `aidedd-homebrew` (ni srd-5.2.1 ni basic-rules)', async () => {
    const raw = await readFile('public/data/magic-items.json', 'utf-8');
    const items = JSON.parse(raw) as MagicItemEntry[];
    const entry = items.find((it) => it.id === 'potion-de-souffle-enflamme');
    expect(entry, "L'entrée `potion-de-souffle-enflamme` doit exister.").toBeDefined();
    expect(entry?.source).toBe('aidedd-homebrew');
  });
});
