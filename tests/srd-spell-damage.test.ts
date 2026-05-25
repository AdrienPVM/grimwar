import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import type { Spell } from '@/shared/types/content';

import { expectSpellDamage } from './helpers/content-truth';

/**
 * Cat. 4 — Dégâts de sort canoniques (plan D1, étend le bornage Q1 de la
 * matrice 13.12 qui excluait explicitement `spell.damage[]`).
 *
 * Itère sur la liste figée `PINNED_DAMAGES` et vérifie que chaque sort SRD
 * porte les valeurs canoniques attendues : `formula`, `type`, `typeLabel`,
 * `cantripScaling` (pour les cantrips), `atHigherLevels.perLevel` (pour les
 * sorts L1+ avec upcast), `resolution`.
 *
 * Source de vérité : SRD 5.2.1 CC EN (`SRD_CC_v5.2.1.pdf`). Chaque entrée a
 * été vérifiée UNE FOIS à l'ajout (cf. citations dans
 * `scripts/data/srd-spell-damage.ts`). Le test maintient la vérité figée ;
 * une dérive du bundle (rebuild silencieux, suppression accidentelle d'un
 * champ) la fait échouer dur.
 *
 * Pattern « rouge avant vert » : sans le merge `damage[]` dans
 * `extract-srd-spells.ts`, chaque cas échoue sur `expect(spell.damage).toBeDefined()`.
 */

async function loadSpells(): Promise<Spell[]> {
  const raw = await readFile('public/data/spells.json', 'utf-8');
  return JSON.parse(raw) as Spell[];
}

interface PinnedDamage {
  slug: string;
  formula: string;
  type:
    | 'acid'
    | 'bludgeoning'
    | 'cold'
    | 'fire'
    | 'force'
    | 'lightning'
    | 'necrotic'
    | 'piercing'
    | 'poison'
    | 'psychic'
    | 'radiant'
    | 'slashing'
    | 'thunder';
  typeLabelFr: string;
  typeLabelEn: string;
  resolution: 'attack-roll' | 'saving-throw' | 'auto';
  atHigherLevelsPerLevel?: string;
  cantripScaling?: { tier5: string; tier11: string; tier17: string };
}

const PINNED_DAMAGES: readonly PinnedDamage[] = [
  // Cantrips avec attack-roll
  {
    slug: 'trait-de-feu',
    formula: '1d10',
    type: 'fire',
    typeLabelFr: 'feu',
    typeLabelEn: 'Fire',
    resolution: 'attack-roll',
    cantripScaling: { tier5: '2d10', tier11: '3d10', tier17: '4d10' },
  },
  {
    slug: 'rayon-de-givre',
    formula: '1d8',
    type: 'cold',
    typeLabelFr: 'froid',
    typeLabelEn: 'Cold',
    resolution: 'attack-roll',
    cantripScaling: { tier5: '2d8', tier11: '3d8', tier17: '4d8' },
  },
  {
    slug: 'decharge-occulte',
    formula: '1d10',
    type: 'force',
    typeLabelFr: 'force',
    typeLabelEn: 'Force',
    resolution: 'attack-roll',
    cantripScaling: { tier5: '2d10', tier11: '3d10', tier17: '4d10' },
  },
  // Cantrips avec save
  {
    slug: 'flamme-sacree',
    formula: '1d8',
    type: 'radiant',
    typeLabelFr: 'radiants',
    typeLabelEn: 'Radiant',
    resolution: 'saving-throw',
    cantripScaling: { tier5: '2d8', tier11: '3d8', tier17: '4d8' },
  },
  {
    slug: 'bouffee-de-poison',
    formula: '1d12',
    type: 'poison',
    typeLabelFr: 'poison',
    typeLabelEn: 'Poison',
    resolution: 'saving-throw',
    cantripScaling: { tier5: '2d12', tier11: '3d12', tier17: '4d12' },
  },
  // L1 AoE save-half avec upcast
  {
    slug: 'mains-brulantes',
    formula: '3d6',
    type: 'fire',
    typeLabelFr: 'feu',
    typeLabelEn: 'Fire',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d6',
  },
  {
    slug: 'vague-tonnante',
    formula: '2d8',
    type: 'thunder',
    typeLabelFr: 'tonnerre',
    typeLabelEn: 'Thunder',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d8',
  },
  // Auto-hit avec condition (Magic Missile)
  {
    slug: 'projectile-magique',
    formula: '1d4+1',
    type: 'force',
    typeLabelFr: 'force',
    typeLabelEn: 'Force',
    resolution: 'auto',
  },
  // L3 AoE save-half avec upcast
  {
    slug: 'boule-de-feu',
    formula: '8d6',
    type: 'fire',
    typeLabelFr: 'feu',
    typeLabelEn: 'Fire',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d6',
  },
  {
    slug: 'eclair',
    formula: '8d6',
    type: 'lightning',
    typeLabelFr: 'foudre',
    typeLabelEn: 'Lightning',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d6',
  },
];

describe('cat. 4 — Dégâts canoniques de sort (D1)', () => {
  it.each(PINNED_DAMAGES.map((d) => ({ pin: d, label: d.slug })))(
    'spells.json — $label porte la formule canonique',
    async ({ pin }) => {
      const spells = await loadSpells();
      const spell = spells.find((s) => s.id === pin.slug);
      expect(spell, `sort ${pin.slug} absent du bundle`).toBeDefined();
      if (!spell) return;
      expectSpellDamage(spell, {
        formula: pin.formula,
        type: pin.type,
        typeLabelFr: pin.typeLabelFr,
        typeLabelEn: pin.typeLabelEn,
        resolution: pin.resolution,
        atHigherLevelsPerLevel: pin.atHigherLevelsPerLevel,
        cantripScaling: pin.cantripScaling,
      });
    },
  );

  it('Projectile magique porte la condition explicative du nombre de projectiles', async () => {
    const spells = await loadSpells();
    const spell = spells.find((s) => s.id === 'projectile-magique');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('3 projectiles');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('+1 projectile');
    expect(spell?.damage?.[0]?.condition?.en).toContain('3 darts');
  });

  it('Décharge occulte porte la condition de tiers (nombre de rayons)', async () => {
    const spells = await loadSpells();
    const spell = spells.find((s) => s.id === 'decharge-occulte');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('rayon par tier');
  });
});
