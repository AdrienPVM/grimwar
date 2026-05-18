/**
 * SRD 5.2.1 — enrichissements L1 par ascendance pour `public/data/ancestries.json`.
 *
 * Source (plan 13.7 §0.4) : `docs/AUDIT-SRD-COMPLETUDE.md` § A.2. Issue de
 * `content-sources/extracted/raw/SRD_CC_v5.2.1.txt` + `FR_SRD_CC_v5.2.1.txt`.
 * Aucune lecture de PDF non-SRD.
 *
 * 6 ascendances ont des sous-choix L1 SRD ; les 3 autres (Nain, Halfling, Orc)
 * n'en ont pas et reçoivent `options: {}`.
 */

export interface DragonAncestryOption {
  id: 'black' | 'blue' | 'brass' | 'bronze' | 'copper' | 'gold' | 'green' | 'red' | 'silver' | 'white';
  name: { fr: string; en: string };
  damageType:
    | 'acid'
    | 'cold'
    | 'fire'
    | 'lightning'
    | 'poison';
  damageTypeLabel: { fr: string; en: string };
}

export const DRAGON_ANCESTRIES: DragonAncestryOption[] = [
  { id: 'black', name: { fr: 'Noir', en: 'Black' }, damageType: 'acid', damageTypeLabel: { fr: 'Acide', en: 'Acid' } },
  { id: 'blue', name: { fr: 'Bleu', en: 'Blue' }, damageType: 'lightning', damageTypeLabel: { fr: 'Foudre', en: 'Lightning' } },
  { id: 'brass', name: { fr: 'Airain', en: 'Brass' }, damageType: 'fire', damageTypeLabel: { fr: 'Feu', en: 'Fire' } },
  { id: 'bronze', name: { fr: 'Bronze', en: 'Bronze' }, damageType: 'lightning', damageTypeLabel: { fr: 'Foudre', en: 'Lightning' } },
  { id: 'copper', name: { fr: 'Cuivre', en: 'Copper' }, damageType: 'acid', damageTypeLabel: { fr: 'Acide', en: 'Acid' } },
  { id: 'gold', name: { fr: 'Or', en: 'Gold' }, damageType: 'fire', damageTypeLabel: { fr: 'Feu', en: 'Fire' } },
  { id: 'green', name: { fr: 'Vert', en: 'Green' }, damageType: 'poison', damageTypeLabel: { fr: 'Poison', en: 'Poison' } },
  { id: 'red', name: { fr: 'Rouge', en: 'Red' }, damageType: 'fire', damageTypeLabel: { fr: 'Feu', en: 'Fire' } },
  { id: 'silver', name: { fr: 'Argent', en: 'Silver' }, damageType: 'cold', damageTypeLabel: { fr: 'Froid', en: 'Cold' } },
  { id: 'white', name: { fr: 'Blanc', en: 'White' }, damageType: 'cold', damageTypeLabel: { fr: 'Froid', en: 'Cold' } },
];

export interface TieflingLegacyOption {
  id: 'abyssal' | 'chthonic' | 'infernal';
  name: { fr: string; en: string };
  resistance: { fr: string; en: string };
  cantripSpellId: string; // id de sort attendu dans spells.json
  level3SpellId: string;
  level5SpellId: string;
}

// Slugs FR pour aligner sur `public/data/spells.json` (qui n'expose que des
// IDs FR). Fix Bug 1 UAT 2026-05-18 — cf. `tests/content-referential-integrity.test.ts`.
//
// `rayon-de-maladie` (Ray of Sickness) et `feinte-vie` (False Life) sont
// référencés ici par fidélité SRD 5.2.1 MAIS encore absents du bundle FR
// `spells.json` au moment du fix → dette D9 (à livrer par plan 13.10).
// Le runtime `AncestrySpellsCard` skip silencieusement le sort manquant —
// les autres slots (cantrip + L5) du même héritage s'affichent normalement.
export const TIEFLING_LEGACIES: TieflingLegacyOption[] = [
  {
    id: 'abyssal',
    name: { fr: 'Abyssal', en: 'Abyssal' },
    resistance: { fr: 'Poison', en: 'Poison' },
    cantripSpellId: 'bouffee-de-poison',
    level3SpellId: 'rayon-de-maladie', // DEBT D9 — absent du bundle FR jusqu'à 13.10.
    level5SpellId: 'immobilisation-de-personne',
  },
  {
    id: 'chthonic',
    name: { fr: 'Chtonien', en: 'Chthonic' },
    resistance: { fr: 'Nécrotique', en: 'Necrotic' },
    cantripSpellId: 'contact-glacial',
    level3SpellId: 'feinte-vie', // DEBT D9 — absent du bundle FR jusqu'à 13.10.
    level5SpellId: 'rayon-affaiblissant',
  },
  {
    id: 'infernal',
    name: { fr: 'Infernal', en: 'Infernal' },
    resistance: { fr: 'Feu', en: 'Fire' },
    cantripSpellId: 'trait-de-feu',
    level3SpellId: 'represailles-infernales',
    level5SpellId: 'tenebres',
  },
];

export interface ElfLineageOption {
  id: 'drow' | 'high-elf' | 'wood-elf';
  name: { fr: string; en: string };
  benefit: { fr: string; en: string };
  cantripSpellId: string | null;
  level3SpellId: string;
  level5SpellId: string;
}

// Slugs FR (cf. Bug 1 UAT 2026-05-18 ci-dessus). 100% des sorts elfes
// existent dans le bundle FR — aucun blocage D10b sur cette ascendance.
export const ELF_LINEAGES: ElfLineageOption[] = [
  {
    id: 'drow',
    name: { fr: 'Drow', en: 'Drow' },
    benefit: {
      fr: 'Vision dans le noir étendue à 36 m.',
      en: 'Darkvision extended to 120 ft.',
    },
    cantripSpellId: 'lumieres-dansantes',
    level3SpellId: 'lueurs-feeriques',
    level5SpellId: 'tenebres',
  },
  {
    id: 'high-elf',
    name: { fr: 'Haut-elfe', en: 'High Elf' },
    benefit: {
      fr: "Swap du cantrip de lignage à chaque repos long (parmi la liste Magicien).",
      en: 'Swap your lineage cantrip on each long rest (from the Wizard list).',
    },
    cantripSpellId: 'prestidigitation',
    level3SpellId: 'detection-de-la-magie',
    level5SpellId: 'foulee-brumeuse',
  },
  {
    id: 'wood-elf',
    name: { fr: 'Elfe sylvestre', en: 'Wood Elf' },
    benefit: {
      fr: 'Vitesse de marche portée à 10,50 m.',
      en: 'Walking speed increases to 35 ft.',
    },
    cantripSpellId: 'druidisme',
    level3SpellId: 'grande-foulee',
    level5SpellId: 'passage-sans-trace',
  },
];

export interface GnomeLineageOption {
  id: 'forest' | 'rock';
  name: { fr: string; en: string };
  benefit: { fr: string; en: string };
  cantripSpellIds: string[];
}

// Slugs FR (cf. Bug 1 UAT 2026-05-18 ci-dessus).
export const GNOME_LINEAGES: GnomeLineageOption[] = [
  {
    id: 'forest',
    name: { fr: 'Gnome des forêts', en: 'Forest Gnome' },
    benefit: {
      fr: 'Vous lancez Communication avec les animaux (rituel) sans slot, jusqu\'à PB fois par repos long sans rituel.',
      en: 'Cast Speak with Animals as a ritual without a slot, up to PB times per long rest without the ritual tag.',
    },
    cantripSpellIds: ['illusion-mineure'],
  },
  {
    id: 'rock',
    name: { fr: 'Gnome des roches', en: 'Rock Gnome' },
    benefit: {
      fr: "Vous fabriquez de petits appareils (Tiny) en 10 minutes. Tinker's Tools maîtrise requise.",
      en: 'Craft Tiny clockwork devices in 10 minutes. Requires Tinker\'s Tools proficiency.',
    },
    cantripSpellIds: ['reparation', 'prestidigitation'],
  },
];

export interface GiantAncestryOption {
  id: 'cloud' | 'fire' | 'frost' | 'hill' | 'stone' | 'storm';
  name: { fr: string; en: string };
  effect: { fr: string; en: string };
}

export const GIANT_ANCESTRIES: GiantAncestryOption[] = [
  {
    id: 'cloud',
    name: { fr: 'Saut des nuées', en: "Cloud's Jaunt" },
    effect: {
      fr: 'Action bonus : téléportation jusqu\'à 9 m.',
      en: 'Bonus Action: teleport up to 30 ft.',
    },
  },
  {
    id: 'fire',
    name: { fr: 'Brûlure ignée', en: "Fire's Burn" },
    effect: {
      fr: 'Sur un coup au but : +1d10 dégâts de feu.',
      en: 'On a hit: deal +1d10 fire damage.',
    },
  },
  {
    id: 'frost',
    name: { fr: 'Froid mordant', en: "Frost's Chill" },
    effect: {
      fr: 'Sur un coup au but : +1d6 dégâts de froid + −3 m de vitesse de la cible.',
      en: "On a hit: +1d6 cold damage and reduce target's Speed by 10 ft.",
    },
  },
  {
    id: 'hill',
    name: { fr: 'Renversement', en: "Hill's Tumble" },
    effect: {
      fr: 'Sur un coup au but contre cible ≤Large : la cible est Prone.',
      en: 'On a hit against Large or smaller target: knock it Prone.',
    },
  },
  {
    id: 'stone',
    name: { fr: 'Endurance de la pierre', en: "Stone's Endurance" },
    effect: {
      fr: 'Réaction quand vous subissez des dégâts : réduisez-les de 1d12 + modificateur Con.',
      en: 'Reaction when taking damage: reduce it by 1d12 + Con modifier.',
    },
  },
  {
    id: 'storm',
    name: { fr: 'Tonnerre', en: "Storm's Thunder" },
    effect: {
      fr: 'Réaction quand vous subissez des dégâts d\'une cible à ≤18 m : 1d8 dégâts de tonnerre à la cible.',
      en: "Reaction when damaged by a target within 60 ft.: deal 1d8 thunder damage back.",
    },
  },
];

/**
 * Human Options — Versatile (1 Origin Feat parmi 4) + Skillful (1 skill parmi 18).
 *
 * Les 18 skills SRD : Acrobatics, Animal Handling, Arcana, Athletics, Deception,
 * History, Insight, Intimidation, Investigation, Medicine, Nature, Perception,
 * Performance, Persuasion, Religion, Sleight of Hand, Stealth, Survival.
 */
export const HUMAN_SKILLFUL_OPTIONS = [
  'acrobatics',
  'animal-handling',
  'arcana',
  'athletics',
  'deception',
  'history',
  'insight',
  'intimidation',
  'investigation',
  'medicine',
  'nature',
  'perception',
  'performance',
  'persuasion',
  'religion',
  'sleight-of-hand',
  'stealth',
  'survival',
];

export const HUMAN_VERSATILE_FEAT_IDS = [
  'alert',
  'magic-initiate',
  'savage-attacker',
  'skilled',
];

/** Compteurs de référence pour `tests/srd-counters.test.ts`. */
export const SRD_ANCESTRIES_COUNTS = {
  dragonAncestries: DRAGON_ANCESTRIES.length, // 10
  tieflingLegacies: TIEFLING_LEGACIES.length, // 3
  elfLineages: ELF_LINEAGES.length, // 3
  gnomeLineages: GNOME_LINEAGES.length, // 2
  giantAncestries: GIANT_ANCESTRIES.length, // 6
  humanSkillful: HUMAN_SKILLFUL_OPTIONS.length, // 18
  humanVersatile: HUMAN_VERSATILE_FEAT_IDS.length, // 4
};
