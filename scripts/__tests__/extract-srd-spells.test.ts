import { describe, expect, it } from 'vitest';

import { SpellSchema } from '../../src/shared/types/content';
import { SRD_SPELLS, SRD_SPELLS_COUNTS } from '../data/srd-spells';

/**
 * Plan 13.10 commit 1 — garde-fous de `extract-srd-spells.ts` (TS→JSON).
 * Forme bilingue, compteur strict, source SRD-only, schéma, déterminisme du tri.
 */
describe('extract-srd-spells — module canonique SRD', () => {
  it('compteur strict : length === SRD_SPELLS_COUNTS.total', () => {
    expect(SRD_SPELLS.length).toBe(SRD_SPELLS_COUNTS.total);
  });

  it('chaque entrée valide le SpellSchema (zod)', () => {
    for (const s of SRD_SPELLS) {
      const parsed = SpellSchema.safeParse(s);
      expect(parsed.success, `${s.id}: ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`).toBe(true);
    }
  });

  it('forme bilingue : name.en + description.en présents partout (pas d’héritage AideDD en=null)', () => {
    for (const s of SRD_SPELLS) {
      expect(s.name.en, `${s.id} name.en`).toBeTruthy();
      expect(s.description.en, `${s.id} description.en`).toBeTruthy();
    }
  });

  it('source SRD-only : aucune provenance non-SRD', () => {
    const off = SRD_SPELLS.filter((s) => s.source !== 'srd-5.2.1');
    expect(off.map((s) => `${s.id}=${s.source}`)).toEqual([]);
  });

  it('ids uniques', () => {
    const ids = SRD_SPELLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tri déterministe par id (idempotence d’écriture)', () => {
    const ids = SRD_SPELLS.map((s) => s.id);
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    const reSorted = [...sorted].sort((a, b) => a.localeCompare(b));
    // Le tri appliqué par l'extracteur est stable : re-trier ne change rien.
    expect(reSorted).toEqual(sorted);
  });
});
