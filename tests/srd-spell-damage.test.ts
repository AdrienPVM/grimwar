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
  // ─── D1a batch 1 (2026-05-25) ──────────────────────────────────────────
  // Sorts à formule canonique + résolution propre. Riders (sans résolution)
  // sont pinned dans `PINNED_RIDERS` ci-dessous.
  {
    slug: 'orbe-chromatique',
    formula: '3d8',
    type: 'fire', // défaut éditorial — cf. condition pour les 6 types
    typeLabelFr: 'feu',
    typeLabelEn: 'Fire',
    resolution: 'attack-roll',
    atHigherLevelsPerLevel: '+1d8',
  },
  {
    slug: 'arme-spirituelle',
    formula: '1d8', // + mod d'incantation (cf. condition)
    type: 'force',
    typeLabelFr: 'force',
    typeLabelEn: 'Force',
    resolution: 'attack-roll',
    atHigherLevelsPerLevel: '+1d8',
  },
  {
    slug: 'rayon-de-lune',
    formula: '2d10',
    type: 'radiant',
    typeLabelFr: 'radiants',
    typeLabelEn: 'Radiant',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d10',
  },
  // ─── D1a batch 3 (2026-05-25) ──────────────────────────────────────────
  // 20 sorts à jet de sauvegarde de zone, dégâts pleins/moitié ou
  // pleins/aucun selon le sort. Le test des conditions (save ability
  // citée dans condition.fr) est consolidé dans
  // `it('D1a batch 3 — condition mentionne la sauvegarde')` plus bas.
  {
    slug: 'assassin-imaginaire',
    formula: '4d10',
    type: 'psychic',
    typeLabelFr: 'psychiques',
    typeLabelEn: 'Psychic',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d10',
  },
  {
    slug: 'barriere-de-lames',
    formula: '6d10',
    type: 'force',
    typeLabelFr: 'force',
    typeLabelEn: 'Force',
    resolution: 'saving-throw',
  },
  {
    slug: 'brume-mortelle',
    formula: '5d8',
    type: 'poison',
    typeLabelFr: 'poison',
    typeLabelEn: 'Poison',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d8',
  },
  {
    slug: 'cercle-de-mort',
    formula: '8d6',
    type: 'necrotic',
    typeLabelFr: 'nécrotiques',
    typeLabelEn: 'Necrotic',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+2d6',
  },
  {
    slug: 'contagion',
    formula: '11d8',
    type: 'necrotic',
    typeLabelFr: 'nécrotiques',
    typeLabelEn: 'Necrotic',
    resolution: 'saving-throw',
  },
  {
    slug: 'contamination',
    formula: '14d6',
    type: 'necrotic',
    typeLabelFr: 'nécrotiques',
    typeLabelEn: 'Necrotic',
    resolution: 'saving-throw',
  },
  {
    slug: 'controle-de-l-eau',
    formula: '2d8',
    type: 'bludgeoning',
    typeLabelFr: 'contondants',
    typeLabelEn: 'Bludgeoning',
    resolution: 'saving-throw',
  },
  {
    slug: 'eclat-du-soleil',
    formula: '12d6',
    type: 'radiant',
    typeLabelFr: 'radiants',
    typeLabelEn: 'Radiant',
    resolution: 'saving-throw',
  },
  {
    slug: 'ennemi-subconscient',
    formula: '10d10',
    type: 'psychic',
    typeLabelFr: 'psychiques',
    typeLabelEn: 'Psychic',
    resolution: 'saving-throw',
  },
  {
    slug: 'epine-mentale',
    formula: '3d8',
    type: 'psychic',
    typeLabelFr: 'psychiques',
    typeLabelEn: 'Psychic',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d8',
  },
  {
    slug: 'invocation-d-animaux',
    formula: '3d10',
    type: 'slashing',
    typeLabelFr: 'tranchants',
    typeLabelEn: 'Slashing',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d10',
  },
  {
    slug: 'invocation-d-etres-sylvestres',
    formula: '5d8',
    type: 'force',
    typeLabelFr: 'force',
    typeLabelEn: 'Force',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d8',
  },
  {
    slug: 'metal-brulant',
    formula: '2d8',
    type: 'fire',
    typeLabelFr: 'feu',
    typeLabelEn: 'Fire',
    resolution: 'auto', // Cas particulier : dégâts auto, save uniquement pour le lâcher d'objet.
    atHigherLevelsPerLevel: '+1d8',
  },
  {
    slug: 'mur-de-vent',
    formula: '4d8',
    type: 'bludgeoning',
    typeLabelFr: 'contondants',
    typeLabelEn: 'Bludgeoning',
    resolution: 'saving-throw',
  },
  {
    slug: 'sphere-glacee',
    formula: '10d6',
    type: 'cold',
    typeLabelFr: 'froid',
    typeLabelEn: 'Cold',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d6',
  },
  {
    slug: 'tentacules-noirs',
    formula: '3d6',
    type: 'bludgeoning',
    typeLabelFr: 'contondants',
    typeLabelEn: 'Bludgeoning',
    resolution: 'saving-throw',
  },
  {
    slug: 'chien-de-garde',
    formula: '4d8',
    type: 'force',
    typeLabelFr: 'force',
    typeLabelEn: 'Force',
    resolution: 'saving-throw',
  },
  // 2-formula spells : pinned ici sur damage[0] (initial / apparition).
  // damage[1] (traversée) est validé dans le test dédié plus bas.
  {
    slug: 'mur-d-epines',
    formula: '7d8',
    type: 'piercing',
    typeLabelFr: 'perforants',
    typeLabelEn: 'Piercing',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d8',
  },
  {
    slug: 'mur-de-glace',
    formula: '10d6',
    type: 'cold',
    typeLabelFr: 'froid',
    typeLabelEn: 'Cold',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+2d6',
  },
  {
    slug: 'tsunami',
    formula: '6d10',
    type: 'bludgeoning',
    typeLabelFr: 'contondants',
    typeLabelEn: 'Bludgeoning',
    resolution: 'saving-throw',
  },
  // ─── D1a batch 4 (2026-05-25) — 9 sorts de dégâts haut profil ─────────
  // Patterns supplémentaires : formule mixte « XdY+N », dégâts cumulatifs,
  // dégâts réactifs auto. Cas particuliers (`colonne-de-flamme` 2 types,
  // `main-arcanique` 2 effets) validés en dehors de PINNED_DAMAGES.
  {
    slug: 'desintegration',
    formula: '10d6+40',
    type: 'force',
    typeLabelFr: 'force',
    typeLabelEn: 'Force',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+3d6',
  },
  {
    slug: 'doigt-de-mort',
    formula: '7d8+30',
    type: 'necrotic',
    typeLabelFr: 'nécrotiques',
    typeLabelEn: 'Necrotic',
    resolution: 'saving-throw',
  },
  {
    slug: 'esprits-gardiens',
    formula: '3d8',
    type: 'radiant', // défaut (alignement Bon/Neutre) — variante nécrotique en condition
    typeLabelFr: 'radiants',
    typeLabelEn: 'Radiant',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d8',
  },
  {
    slug: 'boule-de-feu-a-retardement',
    formula: '12d6',
    type: 'fire',
    typeLabelFr: 'feu',
    typeLabelEn: 'Fire',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d6',
  },
  {
    slug: 'colonne-de-flamme',
    formula: '5d6', // damage[0] = feu ; damage[1] = radiant (testé séparément)
    type: 'fire',
    typeLabelFr: 'feu',
    typeLabelEn: 'Fire',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d6',
  },
  {
    slug: 'epee-arcanique',
    formula: '4d12',
    type: 'force',
    typeLabelFr: 'force',
    typeLabelEn: 'Force',
    resolution: 'attack-roll',
  },
  {
    slug: 'main-arcanique',
    formula: '5d8', // damage[0] = Clenched Fist (force) ; damage[1] = Grasping Hand (bludg)
    type: 'force',
    typeLabelFr: 'force',
    typeLabelEn: 'Force',
    resolution: 'attack-roll',
    atHigherLevelsPerLevel: '+2d8',
  },
  {
    slug: 'lame-de-feu',
    formula: '3d6',
    type: 'fire',
    typeLabelFr: 'feu',
    typeLabelEn: 'Fire',
    resolution: 'attack-roll',
    atHigherLevelsPerLevel: '+1d6',
  },
  {
    slug: 'bouclier-de-feu',
    formula: '2d8',
    type: 'fire',
    typeLabelFr: 'feu',
    typeLabelEn: 'Fire',
    resolution: 'auto', // dégâts réactifs auto sur attaque mêlée touchée
  },
];

/**
 * D1a batch 3 — mapping slug → ability de sauvegarde citée dans
 * `damage[*].condition.fr`. Le schéma SpellDamage n'expose pas de champ
 * structuré pour le save ; le texte `condition` porte la vérité (convention
 * `rayon-de-lune`). Test vérifie que chaque entrée mentionne explicitement
 * la bonne caractéristique en FR.
 */
const BATCH3_SAVE_ABILITIES: ReadonlyArray<{ slug: string; ability: string }> =
  [
    { slug: 'assassin-imaginaire', ability: 'Sagesse' },
    { slug: 'barriere-de-lames', ability: 'Dextérité' },
    { slug: 'brume-mortelle', ability: 'Constitution' },
    { slug: 'cercle-de-mort', ability: 'Constitution' },
    { slug: 'contagion', ability: 'Constitution' },
    { slug: 'contamination', ability: 'Constitution' },
    { slug: 'controle-de-l-eau', ability: 'Force' },
    { slug: 'eclat-du-soleil', ability: 'Constitution' },
    { slug: 'ennemi-subconscient', ability: 'Sagesse' },
    { slug: 'epine-mentale', ability: 'Sagesse' },
    { slug: 'invocation-d-animaux', ability: 'Dextérité' },
    { slug: 'invocation-d-etres-sylvestres', ability: 'Sagesse' },
    { slug: 'metal-brulant', ability: 'Constitution' }, // pour lâcher l'objet
    { slug: 'mur-d-epines', ability: 'Dextérité' },
    { slug: 'mur-de-vent', ability: 'Force' },
    { slug: 'sphere-glacee', ability: 'Constitution' },
    { slug: 'tentacules-noirs', ability: 'Force' },
    { slug: 'tsunami', ability: 'Force' },
    { slug: 'chien-de-garde', ability: 'Dextérité' },
    // mur-de-glace porte 2 abilities différentes (Dex initial, Con traversée)
    // — validé dans le test dédié plus bas.
  ];

/**
 * D1a batch 3 — sorts à 2 formules de dégâts (initial + traversée).
 * Validation explicite de damage[1] qui n'est pas couvert par PINNED_DAMAGES.
 */
interface PinnedSecondFormula {
  slug: string;
  formula: string;
  type: PinnedDamage['type'];
  typeLabelFr: string;
  typeLabelEn: string;
  resolution: 'attack-roll' | 'saving-throw' | 'auto';
  atHigherLevelsPerLevel?: string;
  saveAbilityFr: string;
}

const BATCH3_SECOND_FORMULAS: readonly PinnedSecondFormula[] = [
  {
    slug: 'mur-d-epines',
    formula: '7d8',
    type: 'slashing',
    typeLabelFr: 'tranchants',
    typeLabelEn: 'Slashing',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d8',
    saveAbilityFr: 'Dextérité',
  },
  {
    slug: 'mur-de-glace',
    formula: '5d6',
    type: 'cold',
    typeLabelFr: 'froid',
    typeLabelEn: 'Cold',
    resolution: 'saving-throw',
    atHigherLevelsPerLevel: '+1d6',
    saveAbilityFr: 'Constitution',
  },
  {
    slug: 'tsunami',
    formula: '5d10',
    type: 'bludgeoning',
    typeLabelFr: 'contondants',
    typeLabelEn: 'Bludgeoning',
    resolution: 'saving-throw',
    saveAbilityFr: 'Force',
  },
];

/**
 * D1a batch 1 — Riders : sorts qui ne portent PAS de résolution propre
 * (formule statique ajoutée aux dégâts d'une attaque d'arme qui touche). Le
 * jet d'attaque est celui de l'arme ; la formule rider s'auto-applique.
 *
 * Test schema distinct de `PinnedDamage` : pas de `resolution`, présence
 * d'une `condition` qui explique le trigger.
 */
interface PinnedRider {
  slug: string;
  formula: string;
  type: PinnedDamage['type'];
  typeLabelFr: string;
  typeLabelEn: string;
  atHigherLevelsPerLevel?: string;
  /** Sous-chaîne FR attendue dans `damage[0].condition.fr`. */
  conditionMustContainFr: string;
}

const PINNED_RIDERS: readonly PinnedRider[] = [
  {
    slug: 'faveur-divine',
    formula: '1d4',
    type: 'radiant',
    typeLabelFr: 'radiants',
    typeLabelEn: 'Radiant',
    conditionMustContainFr: 'attaque d’arme qui touche',
  },
  {
    slug: 'chatiment-divin',
    formula: '2d8',
    type: 'radiant',
    typeLabelFr: 'radiants',
    typeLabelEn: 'Radiant',
    atHigherLevelsPerLevel: '+1d8',
    conditionMustContainFr: 'Fiélon ou un Mort-vivant',
  },
  {
    slug: 'malefice',
    formula: '1d6',
    type: 'necrotic',
    typeLabelFr: 'nécrotiques',
    typeLabelEn: 'Necrotic',
    conditionMustContainFr: 'cible maudite',
  },
  // ─── D1a batch 2 (2026-05-25) ──────────────────────────────────────────
  {
    slug: 'marque-du-chasseur',
    formula: '1d6',
    type: 'force',
    typeLabelFr: 'force',
    typeLabelEn: 'Force',
    conditionMustContainFr: 'cible marquée',
  },
  {
    slug: 'malediction',
    formula: '1d8',
    type: 'necrotic',
    typeLabelFr: 'nécrotiques',
    typeLabelEn: 'Necrotic',
    conditionMustContainFr: 'malédictions au choix',
  },
  {
    slug: 'agrandissement-rapetissement',
    formula: '1d4',
    type: 'bludgeoning',
    typeLabelFr: 'contondants',
    typeLabelEn: 'Bludgeoning',
    conditionMustContainFr: 'Agrandissement',
  },
  {
    slug: 'chatiment-de-revelation',
    formula: '2d6',
    type: 'radiant',
    typeLabelFr: 'radiants',
    typeLabelEn: 'Radiant',
    atHigherLevelsPerLevel: '+1d6',
    conditionMustContainFr: 'coup non armé',
  },
  {
    slug: 'modification-d-apparence',
    formula: '1d6',
    type: 'slashing',
    typeLabelFr: 'tranchants',
    typeLabelEn: 'Slashing',
    conditionMustContainFr: 'Armes naturelles',
  },
  {
    slug: 'invocation-d-elementaires-mineurs',
    formula: '2d8',
    type: 'fire',
    typeLabelFr: 'feu',
    typeLabelEn: 'Fire',
    atHigherLevelsPerLevel: '+1d8',
    conditionMustContainFr: 'acide, froid, feu ou foudre',
  },
  {
    slug: 'croissance-d-epines',
    formula: '2d4',
    type: 'piercing',
    typeLabelFr: 'perforants',
    typeLabelEn: 'Piercing',
    conditionMustContainFr: 'par tranche de 1,50 m',
  },
  {
    slug: 'frappe-piegeuse',
    formula: '1d6',
    type: 'piercing',
    typeLabelFr: 'perforants',
    typeLabelEn: 'Piercing',
    atHigherLevelsPerLevel: '+1d6',
    conditionMustContainFr: 'Entravé',
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

  // ──────────────────────────────────────────────────────────────────────
  // D1a batch 1 — Riders (formule auto sur attaque d'arme qui touche).
  // Pas de `resolution` propre (le jet est celui de l'arme), donc test
  // dédié qui vérifie formule + type + absence de `resolution` + condition.
  // ──────────────────────────────────────────────────────────────────────
  it.each(PINNED_RIDERS.map((d) => ({ pin: d, label: d.slug })))(
    'D1a rider — $label porte la formule canonique + condition trigger',
    async ({ pin }) => {
      const spells = await loadSpells();
      const spell = spells.find((s) => s.id === pin.slug);
      expect(spell, `sort ${pin.slug} absent du bundle`).toBeDefined();
      if (!spell) return;
      const entry = spell.damage?.[0];
      expect(entry, `${pin.slug} — damage[0] absent`).toBeDefined();
      expect(entry?.formula).toBe(pin.formula);
      expect(entry?.type).toBe(pin.type);
      expect(entry?.typeLabel.fr).toBe(pin.typeLabelFr);
      expect(entry?.typeLabel.en).toBe(pin.typeLabelEn);
      // Rider = pas de jet de résolution propre.
      expect(entry?.resolution).toBeUndefined();
      // Condition trigger doit citer la mécanique exacte.
      expect(entry?.condition?.fr).toContain(pin.conditionMustContainFr);
      if (pin.atHigherLevelsPerLevel !== undefined) {
        expect(entry?.atHigherLevels?.perLevel).toBe(pin.atHigherLevelsPerLevel);
      } else {
        expect(entry?.atHigherLevels).toBeUndefined();
      }
    },
  );

  it('Orbe chromatique — condition liste les 6 types disponibles', async () => {
    const spells = await loadSpells();
    const spell = spells.find((s) => s.id === 'orbe-chromatique');
    const cond = spell?.damage?.[0]?.condition?.fr ?? '';
    expect(cond).toContain('acide');
    expect(cond).toContain('froid');
    expect(cond).toContain('feu');
    expect(cond).toContain('foudre');
    expect(cond).toContain('poison');
    expect(cond).toContain('tonnerre');
  });

  it('Arme spirituelle — condition documente le modificateur d\'incantation ajouté', async () => {
    const spells = await loadSpells();
    const spell = spells.find((s) => s.id === 'arme-spirituelle');
    const cond = spell?.damage?.[0]?.condition?.fr ?? '';
    expect(cond).toContain("modificateur de caractéristique d’incantation");
  });

  // ──────────────────────────────────────────────────────────────────────
  // D1a batch 3 — Save-throw AoE : la caractéristique de sauvegarde doit
  // figurer textuellement dans `condition.fr` (convention `rayon-de-lune`).
  // Le schéma n'expose pas de champ structuré — le texte EST la vérité.
  // ──────────────────────────────────────────────────────────────────────
  it.each(BATCH3_SAVE_ABILITIES)(
    'D1a batch 3 — $slug mentionne « $ability » dans condition.fr',
    async ({ slug, ability }) => {
      const spells = await loadSpells();
      const spell = spells.find((s) => s.id === slug);
      expect(spell, `sort ${slug} absent du bundle`).toBeDefined();
      const cond = spell?.damage?.[0]?.condition?.fr ?? '';
      expect(
        cond,
        `${slug} — condition.fr doit citer la sauvegarde « ${ability} »`,
      ).toContain(ability);
    },
  );

  it('D1a batch 3 — mur-de-glace porte 2 ability saves distincts (Dex initial, Con traversée)', async () => {
    const spells = await loadSpells();
    const spell = spells.find((s) => s.id === 'mur-de-glace');
    expect(spell?.damage).toHaveLength(2);
    expect(spell?.damage?.[0]?.condition?.fr).toContain('Dextérité');
    expect(spell?.damage?.[1]?.condition?.fr).toContain('Constitution');
  });

  it.each(BATCH3_SECOND_FORMULAS)(
    'D1a batch 3 — $slug porte damage[1] (formule de traversée)',
    async ({
      slug,
      formula,
      type,
      typeLabelFr,
      typeLabelEn,
      resolution,
      atHigherLevelsPerLevel,
      saveAbilityFr,
    }) => {
      const spells = await loadSpells();
      const spell = spells.find((s) => s.id === slug);
      expect(spell, `sort ${slug} absent du bundle`).toBeDefined();
      expect(spell?.damage, `${slug} doit avoir 2 formules`).toHaveLength(2);
      const entry = spell?.damage?.[1];
      expect(entry?.formula).toBe(formula);
      expect(entry?.type).toBe(type);
      expect(entry?.typeLabel.fr).toBe(typeLabelFr);
      expect(entry?.typeLabel.en).toBe(typeLabelEn);
      expect(entry?.resolution).toBe(resolution);
      if (atHigherLevelsPerLevel !== undefined) {
        expect(entry?.atHigherLevels?.perLevel).toBe(atHigherLevelsPerLevel);
      } else {
        expect(entry?.atHigherLevels).toBeUndefined();
      }
      expect(entry?.condition?.fr ?? '').toContain(saveAbilityFr);
    },
  );

  it('D1a batch 3 — metal-brulant utilise resolution: auto (dégâts auto, save ne réduit PAS)', async () => {
    const spells = await loadSpells();
    const spell = spells.find((s) => s.id === 'metal-brulant');
    expect(spell?.damage?.[0]?.resolution).toBe('auto');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('ne réduit PAS');
  });

  it('D1a batch 3 — 20 nouveaux sorts portent damage[] (sanity count)', async () => {
    const spells = await loadSpells();
    const batch3Slugs = [
      'assassin-imaginaire',
      'barriere-de-lames',
      'brume-mortelle',
      'cercle-de-mort',
      'contagion',
      'contamination',
      'controle-de-l-eau',
      'eclat-du-soleil',
      'ennemi-subconscient',
      'epine-mentale',
      'invocation-d-animaux',
      'invocation-d-etres-sylvestres',
      'metal-brulant',
      'mur-d-epines',
      'mur-de-glace',
      'mur-de-vent',
      'sphere-glacee',
      'tentacules-noirs',
      'tsunami',
      'chien-de-garde',
    ];
    expect(batch3Slugs).toHaveLength(20);
    for (const slug of batch3Slugs) {
      const spell = spells.find((s) => s.id === slug);
      expect(spell, `sort ${slug} absent du bundle`).toBeDefined();
      expect(
        spell?.damage,
        `${slug} doit porter au moins une entrée damage[]`,
      ).toBeDefined();
      expect((spell?.damage ?? []).length).toBeGreaterThanOrEqual(1);
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  // D1a batch 4 — Sorts haut profil (formule mixte, dégâts cumulatifs,
  // mécaniques spéciales). Test de damage[1] pour les 2 sorts à 2 effets.
  // ──────────────────────────────────────────────────────────────────────
  it('D1a batch 4 — colonne-de-flamme porte 2 entrées (feu + radiant) avec même upcast', async () => {
    const spells = await loadSpells();
    const spell = spells.find((s) => s.id === 'colonne-de-flamme');
    expect(spell?.damage, 'colonne-de-flamme doit avoir 2 formules').toHaveLength(2);
    const radiant = spell?.damage?.[1];
    expect(radiant?.formula).toBe('5d6');
    expect(radiant?.type).toBe('radiant');
    expect(radiant?.typeLabel.fr).toBe('radiants');
    expect(radiant?.resolution).toBe('saving-throw');
    expect(radiant?.atHigherLevels?.perLevel).toBe('+1d6');
    expect(radiant?.condition?.fr).toContain('Dextérité');
  });

  it('D1a batch 4 — main-arcanique porte 2 entrées (Clenched Fist force + Grasping Hand bludg)', async () => {
    const spells = await loadSpells();
    const spell = spells.find((s) => s.id === 'main-arcanique');
    expect(spell?.damage, 'main-arcanique doit avoir 2 formules').toHaveLength(2);
    const grasping = spell?.damage?.[1];
    expect(grasping?.formula).toBe('4d6');
    expect(grasping?.type).toBe('bludgeoning');
    expect(grasping?.typeLabel.fr).toBe('contondants');
    expect(grasping?.resolution).toBe('auto'); // après grapple, écrasement automatique
    expect(grasping?.atHigherLevels?.perLevel).toBe('+2d6');
    expect(grasping?.condition?.fr).toContain('Main agrippante');
  });

  it('D1a batch 4 — desintegration porte formule mixte « 10d6+40 »', async () => {
    const spells = await loadSpells();
    const spell = spells.find((s) => s.id === 'desintegration');
    expect(spell?.damage?.[0]?.formula).toBe('10d6+40');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('Dextérité');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('désintégrée');
  });

  it('D1a batch 4 — doigt-de-mort porte formule mixte « 7d8+30 »', async () => {
    const spells = await loadSpells();
    const spell = spells.find((s) => s.id === 'doigt-de-mort');
    expect(spell?.damage?.[0]?.formula).toBe('7d8+30');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('Constitution');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('Zombie');
  });

  it('D1a batch 4 — esprits-gardiens condition documente la variante nécrotique pour les Mauvais', async () => {
    const spells = await loadSpells();
    const spell = spells.find((s) => s.id === 'esprits-gardiens');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('Sagesse');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('nécrotiques');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('Mauvais');
  });

  it('D1a batch 4 — boule-de-feu-a-retardement documente le tic d\'accumulation', async () => {
    const spells = await loadSpells();
    const spell = spells.find((s) => s.id === 'boule-de-feu-a-retardement');
    expect(spell?.damage?.[0]?.formula).toBe('12d6');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('ACCUMULÉS');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('+ 1d6 supplémentaires');
  });

  it('D1a batch 4 — bouclier-de-feu utilise resolution: auto (dégâts réactifs sans save)', async () => {
    const spells = await loadSpells();
    const spell = spells.find((s) => s.id === 'bouclier-de-feu');
    expect(spell?.damage?.[0]?.resolution).toBe('auto');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('réactifs');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('chaud');
    expect(spell?.damage?.[0]?.condition?.fr).toContain('froid');
  });

  it('D1a batch 4 — 9 nouveaux sorts portent damage[] (sanity count)', async () => {
    const spells = await loadSpells();
    const batch4Slugs = [
      'desintegration',
      'doigt-de-mort',
      'esprits-gardiens',
      'boule-de-feu-a-retardement',
      'colonne-de-flamme',
      'epee-arcanique',
      'main-arcanique',
      'lame-de-feu',
      'bouclier-de-feu',
    ];
    expect(batch4Slugs).toHaveLength(9);
    for (const slug of batch4Slugs) {
      const spell = spells.find((s) => s.id === slug);
      expect(spell, `sort ${slug} absent du bundle`).toBeDefined();
      expect(
        spell?.damage,
        `${slug} doit porter au moins une entrée damage[]`,
      ).toBeDefined();
      expect((spell?.damage ?? []).length).toBeGreaterThanOrEqual(1);
    }
  });
});
