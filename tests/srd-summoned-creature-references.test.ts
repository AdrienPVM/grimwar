import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

/**
 * Cat. 3 — Fidélité bundle (CLAUDE.md > Vérité du contenu, point 3).
 *
 * Pin les valeurs SRD 5.2.1 vérifiées humainement UNE FOIS contre
 * `FR_SRD_CC_v5.2.1.pdf` (FR) + `SRD_CC_v5.2.1.pdf` (EN), pages référencées
 * dans `scripts/data/srd-summoned-creatures.ts`. Détecte toute dérive du
 * bundle `public/data/summoned-creatures.json` sur 2 entrées emblématiques.
 *
 * Pseudodragon (Pact of the Chain familier — D13d) → PDF p. 343 FR / p. 316 EN.
 * Sphinx merveilleux (Pact of the Chain familier — D13d) → PDF p. 349 FR / p. 327 EN.
 */

interface SummonedCreatureEntry {
  id: string;
  name: { fr: string; en: string };
  acFormula: { fr: string; en: string };
  hpFormula: { fr: string; en: string };
  speed: { fr: string; en: string };
  abilities: {
    for: number;
    dex: number;
    con: number;
    int: number;
    sag: number;
    cha: number;
  };
  challenge: { fr: string; en: string };
  resistances: { fr: string; en: string } | null;
  source: string;
}

async function loadCreatures(): Promise<SummonedCreatureEntry[]> {
  const raw = await readFile('public/data/summoned-creatures.json', 'utf-8');
  return JSON.parse(raw) as SummonedCreatureEntry[];
}

describe('SRD summoned-creature pinned references (cat. 3)', () => {
  it('Pseudodragon — identité + caractéristiques + CA/PV fixes (SRD p. 316/343)', async () => {
    const list = await loadCreatures();
    const e = list.find((c) => c.id === 'pseudodragon');
    expect(e, 'pseudodragon absent du bundle').toBeDefined();
    if (!e) return;
    expect(e.name).toEqual({ fr: 'Pseudodragon', en: 'Pseudodragon' });
    expect(e.acFormula).toEqual({ fr: 'CA 14', en: 'AC 14' });
    expect(e.hpFormula).toEqual({ fr: 'PV 10 (3d4 + 3)', en: 'HP 10 (3d4 + 3)' });
    expect(e.abilities).toEqual({ for: 6, dex: 15, con: 13, int: 10, sag: 12, cha: 10 });
    expect(e.challenge.en).toBe('CR 1/4 (XP 50; PB +2)');
    expect(e.source).toBe('srd-5.2.1');
  });

  it('Sphinx merveilleux — résistances + CA + PV (SRD p. 327/349)', async () => {
    const list = await loadCreatures();
    const e = list.find((c) => c.id === 'sphinx-merveilleux');
    expect(e, 'sphinx-merveilleux absent du bundle').toBeDefined();
    if (!e) return;
    expect(e.name).toEqual({ fr: 'Sphinx merveilleux', en: 'Sphinx of Wonder' });
    expect(e.acFormula).toEqual({ fr: 'CA 13', en: 'AC 13' });
    expect(e.hpFormula).toEqual({ fr: 'PV 24 (7d4 + 7)', en: 'HP 24 (7d4 + 7)' });
    expect(e.abilities).toEqual({ for: 6, dex: 17, con: 13, int: 15, sag: 12, cha: 11 });
    expect(e.resistances).toEqual({
      fr: 'nécrotiques, psychiques, radiants',
      en: 'Necrotic, Psychic, Radiant',
    });
  });

  it('les 4 nouveaux familiers de Pact of the Chain sont bien présents dans le bundle', async () => {
    const list = await loadCreatures();
    const ids = new Set(list.map((c) => c.id));
    for (const id of ['pseudodragon', 'quasit', 'sphinx-merveilleux', 'esprit-follet']) {
      expect(ids.has(id), `${id} absent de summoned-creatures.json`).toBe(true);
    }
  });
});
