import { describe, expect, it } from 'vitest';

import { SRD_SPELLS } from '../data/srd-spells';
import { checkSpellQuality } from '../srd-spell-quality-gate';

/**
 * Plan 13.10 commit 1 — GATE QUALITÉ permanente des sorts SRD (test versionné).
 *
 * Trace mémorielle : le pairing par empreinte structurelle s'était avéré insuffisant
 * (2 collisions de range → inversions EN↔FR), et l'extraction texte avait fait fuir
 * des colonnes (bleeds vidant/gonflant des descriptions). Les heuristiques fallback
 * ne l'avaient pas vu ; le détecteur de ratio FR/EN si. On le fige en garde-fou.
 *
 * Ce test partage sa logique avec `bootstrap-srd-spells.ts --gate`.
 */
describe('SRD spells — gate qualité (ratio FR/EN + plancher)', () => {
  it('module bilingue : aucun name.en/description.en/description.fr vide', () => {
    for (const s of SRD_SPELLS) {
      expect(s.name.en, `${s.id} name.en`).toBeTruthy();
      expect(s.description.en, `${s.id} description.en`).toBeTruthy();
      expect(s.description.fr, `${s.id} description.fr`).toBeTruthy();
    }
  });

  it('aucune description quasi-vide ni ratio FR/EN aberrant hors allowlist', () => {
    const { violations } = checkSpellQuality(SRD_SPELLS);
    expect(violations, violations.join('\n')).toEqual([]);
  });
});
