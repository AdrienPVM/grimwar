import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import type { Ancestry, SpellUsage } from '@/shared/types/content';

/**
 * Plan D12a — `ancestry.spellUsages` (map slug→usage) doit refléter les
 * canonicalités SRD 5.2.1 pour les 3 ascendances à sorts d'ascendance à
 * recharge limitée (Tieffelin, Elfe, Gnome). Le rendu du compteur côté UI
 * est différé à D12b — ce test garde la VÉRITÉ DE LA DONNÉE figée.
 *
 * Convention :
 *   - Cantrips at-will absents du record (consommateur fait `?? 'at-will'`).
 *   - Tiefling L3/L5 (6 sorts × 3 héritages) → `long-rest`.
 *   - Elf L3/L5 (6 sorts × 3 lignages) → `long-rest`.
 *   - Gnome forêts `communication-avec-les-animaux` → `pb-per-rest`.
 */

async function loadAncestries(): Promise<Ancestry[]> {
  const raw = await readFile('public/data/ancestries.json', 'utf-8');
  return JSON.parse(raw) as Ancestry[];
}

interface UsageExpectation {
  ancestryId: string;
  spellSlug: string;
  expected: SpellUsage;
}

const PINNED_USAGES: readonly UsageExpectation[] = [
  // Tiefling — 6 sorts à recharge long-rest (Abyssal L3+L5, Chthonic L3+L5, Infernal L3+L5)
  { ancestryId: 'tiefling', spellSlug: 'rayon-empoisonne', expected: 'long-rest' },
  { ancestryId: 'tiefling', spellSlug: 'immobilisation-de-personne', expected: 'long-rest' },
  { ancestryId: 'tiefling', spellSlug: 'simulacre-de-vie', expected: 'long-rest' },
  { ancestryId: 'tiefling', spellSlug: 'rayon-affaiblissant', expected: 'long-rest' },
  { ancestryId: 'tiefling', spellSlug: 'represailles-infernales', expected: 'long-rest' },
  { ancestryId: 'tiefling', spellSlug: 'tenebres', expected: 'long-rest' },

  // Elf — 6 sorts à recharge long-rest (Drow L3+L5, High-Elf L3+L5, Wood Elf L3+L5)
  { ancestryId: 'elf', spellSlug: 'lueurs-feeriques', expected: 'long-rest' },
  { ancestryId: 'elf', spellSlug: 'tenebres', expected: 'long-rest' },
  { ancestryId: 'elf', spellSlug: 'detection-de-la-magie', expected: 'long-rest' },
  { ancestryId: 'elf', spellSlug: 'foulee-brumeuse', expected: 'long-rest' },
  { ancestryId: 'elf', spellSlug: 'grande-foulee', expected: 'long-rest' },
  { ancestryId: 'elf', spellSlug: 'passage-sans-trace', expected: 'long-rest' },

  // Gnome forêts — rituel PB×/repos long
  { ancestryId: 'gnome', spellSlug: 'communication-avec-les-animaux', expected: 'pb-per-rest' },
];

describe('D12a — ancestry.spellUsages canoniques SRD 5.2.1', () => {
  it.each(
    PINNED_USAGES.map((u) => ({
      pin: u,
      label: `${u.ancestryId}/${u.spellSlug}`,
    })),
  )(
    'ancestries.json — $label porte usage=$pin.expected',
    async ({ pin }) => {
      const ancestries = await loadAncestries();
      const ancestry = ancestries.find((a) => a.id === pin.ancestryId);
      expect(ancestry, `ascendance ${pin.ancestryId} absente du bundle`).toBeDefined();
      if (!ancestry) return;
      expect(
        ancestry.spellUsages,
        `${pin.ancestryId}.spellUsages absent du bundle (champ D12a non peuplé)`,
      ).toBeDefined();
      expect(
        ancestry.spellUsages?.[pin.spellSlug],
        `${pin.ancestryId}/${pin.spellSlug} : usage attendu ${pin.expected}, reçu ${ancestry.spellUsages?.[pin.spellSlug] ?? 'undefined'}`,
      ).toBe(pin.expected);
    },
  );

  it('Tieffelin — thaumaturgie (commonSpellIds at-will) N\'EST PAS dans spellUsages (cantrip implicite)', async () => {
    const ancestries = await loadAncestries();
    const tiefling = ancestries.find((a) => a.id === 'tiefling');
    expect(tiefling?.commonSpellIds).toContain('thaumaturgie');
    // Convention D12a : cantrip at-will = absent du map (consommateur fait `?? 'at-will'`).
    expect(tiefling?.spellUsages?.thaumaturgie).toBeUndefined();
  });

  it('Ascendances sans sorts à recharge (Drakéide, Halfling, etc.) — spellUsages absent ou vide', async () => {
    const ancestries = await loadAncestries();
    for (const a of ancestries) {
      if (a.id === 'tiefling' || a.id === 'elf' || a.id === 'gnome') continue;
      // Les autres n'ont aucun sort à recharge limitée — soit `undefined`, soit `{}`.
      const usages = a.spellUsages;
      if (usages !== undefined && usages !== null) {
        expect(
          Object.keys(usages).length,
          `${a.id} ne devrait pas avoir d'entrée spellUsages (aucun sort SRD à recharge)`,
        ).toBe(0);
      }
    }
  });
});
