/**
 * SRD 5.2.1 Feats — 17 entrées (4 Origin + 2 General + 4 Fighting Style + 7 Epic Boon).
 *
 * Source unique de vérité (plan 13.7 §0.4) : table D.2 + C.2 + C.4 + C.5 de
 * `docs/AUDIT-SRD-COMPLETUDE.md`. Issue de `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 * et `FR_SRD_CC_v5.2.1.txt`. Aucune lecture de PDF non-SRD.
 *
 * Note : la `description` est volontairement concise ici (effet en 1-2 phrases). La
 * formulation complète SRD sera enrichie quand le wizard 13.8/13.9 consommera ces
 * feats (Fighting Style chooser notamment). Le format respecte le contrat
 * `public/data/feats.json` existant.
 *
 * L'entrée `grappler` (anciennement bundlée sous l'id `lutteur`) est ré-encodée
 * proprement : on garde l'id `lutteur` pour ne pas casser les références
 * potentielles, mais on aligne le contenu avec le SRD 2024.
 */

export type FeatCategory = 'origin' | 'general' | 'fighting-style' | 'epic-boon';

export interface SrdFeatEntry {
  id: string;
  name: { fr: string; en: string };
  category: FeatCategory;
  prerequisite: { fr: string; en: string } | null;
  summary: { fr: string; en: string };
  source: 'srd-5.2.1';
}

export const SRD_FEATS: SrdFeatEntry[] = [
  // ─── Origin Feats (4) ──────────────────────────────────────────────
  {
    id: 'alert',
    name: { fr: 'Vigilant', en: 'Alert' },
    category: 'origin',
    prerequisite: null,
    summary: {
      fr: "Vous avez la maîtrise de l'initiative : ajoutez votre bonus de maîtrise à vos jets d'initiative. Vous pouvez aussi échanger votre score d'initiative avec un allié consentant.",
      en: 'Initiative Proficiency: add your proficiency bonus to initiative rolls. You can also swap your initiative with a consenting ally.',
    },
    source: 'srd-5.2.1',
  },
  {
    id: 'magic-initiate',
    name: { fr: 'Initié à la magie', en: 'Magic Initiate' },
    category: 'origin',
    prerequisite: null,
    summary: {
      fr: "Choisissez une liste (Clerc, Druide ou Magicien) : vous apprenez 2 cantrips + 1 sort de niveau 1 (lancé une fois par repos long sans slot). Choisissez Int, Sag ou Cha comme caractéristique d'incantation.",
      en: 'Pick a class spell list (Cleric, Druid, or Wizard): learn 2 cantrips + 1 level-1 spell (castable once per long rest without a slot). Choose Int, Wis, or Cha as casting ability.',
    },
    source: 'srd-5.2.1',
  },
  {
    id: 'savage-attacker',
    name: { fr: 'Sauvagerie martiale', en: 'Savage Attacker' },
    category: 'origin',
    prerequisite: null,
    summary: {
      fr: "1 fois par tour, relancez les dés de dégâts d'une attaque d'arme et gardez le meilleur résultat.",
      en: 'Once per turn, reroll the damage dice of a weapon attack and keep whichever result you prefer.',
    },
    source: 'srd-5.2.1',
  },
  {
    id: 'skilled',
    name: { fr: 'Doué', en: 'Skilled' },
    category: 'origin',
    prerequisite: null,
    summary: {
      fr: 'Gagnez la maîtrise dans 3 compétences ou outils au choix. Ce feat peut être pris plusieurs fois.',
      en: 'Gain proficiency in 3 skills or tools of your choice. Repeatable.',
    },
    source: 'srd-5.2.1',
  },

  // ─── General Feats (2) ─────────────────────────────────────────────
  {
    id: 'ability-score-improvement',
    name: { fr: 'Amélioration de caractéristique', en: 'Ability Score Improvement' },
    category: 'general',
    prerequisite: { fr: 'Niveau 4+', en: 'Level 4+' },
    summary: {
      fr: 'Augmentez de 2 une caractéristique au choix, ou de 1 deux caractéristiques différentes. Aucune ne peut dépasser 20. Ce feat peut être pris plusieurs fois.',
      en: 'Raise one ability score by 2, or two ability scores by 1 each. No score may exceed 20. Repeatable.',
    },
    source: 'srd-5.2.1',
  },
  {
    id: 'lutteur',
    name: { fr: 'Lutteur', en: 'Grappler' },
    category: 'general',
    prerequisite: { fr: 'Niveau 4+, Force 13+', en: 'Level 4+, Strength 13+' },
    summary: {
      fr: "Avantage aux jets d'attaque contre une créature avec laquelle vous êtes en lutte. Vous pouvez utiliser votre action pour bloquer une créature en lutte (vous et elle entravés).",
      en: 'Advantage on attack rolls against a creature you are grappling. You can use your action to pin a grappled creature (both Restrained until the grapple ends).',
    },
    source: 'srd-5.2.1',
  },

  // ─── Fighting Style Feats (4) ──────────────────────────────────────
  {
    id: 'archery',
    name: { fr: 'Archerie', en: 'Archery' },
    category: 'fighting-style',
    prerequisite: { fr: 'Membre d\'une classe qui octroie un Fighting Style', en: 'Class that grants a Fighting Style' },
    summary: {
      fr: "+2 aux jets d'attaque à distance avec des armes.",
      en: '+2 to attack rolls with ranged weapons.',
    },
    source: 'srd-5.2.1',
  },
  {
    id: 'defense',
    name: { fr: 'Défense', en: 'Defense' },
    category: 'fighting-style',
    prerequisite: { fr: 'Membre d\'une classe qui octroie un Fighting Style', en: 'Class that grants a Fighting Style' },
    summary: {
      fr: '+1 CA tant que vous portez une armure légère, intermédiaire ou lourde.',
      en: '+1 AC while wearing light, medium, or heavy armor.',
    },
    source: 'srd-5.2.1',
  },
  {
    id: 'great-weapon-fighting',
    name: { fr: 'Armes à deux mains', en: 'Great Weapon Fighting' },
    category: 'fighting-style',
    prerequisite: { fr: 'Membre d\'une classe qui octroie un Fighting Style', en: 'Class that grants a Fighting Style' },
    summary: {
      fr: "Quand vous utilisez une arme à deux mains ou polyvalente (tenue à deux mains) et obtenez 1 ou 2 sur un dé de dégâts d'arme, relancez-le (gardez le second résultat).",
      en: 'When wielding a two-handed or versatile weapon (in two hands), reroll a 1 or 2 on a weapon damage die (keep the second roll).',
    },
    source: 'srd-5.2.1',
  },
  {
    id: 'two-weapon-fighting',
    name: { fr: 'Combat à deux armes', en: 'Two-Weapon Fighting' },
    category: 'fighting-style',
    prerequisite: { fr: 'Membre d\'une classe qui octroie un Fighting Style', en: 'Class that grants a Fighting Style' },
    summary: {
      fr: "Lorsque vous attaquez avec deux armes Light, ajoutez votre modificateur de caractéristique aux dégâts de l'attaque bonus.",
      en: 'When attacking with two Light weapons, add your ability modifier to the bonus-action attack damage.',
    },
    source: 'srd-5.2.1',
  },

  // ─── Epic Boon Feats (7) ───────────────────────────────────────────
  {
    id: 'boon-of-combat-prowess',
    name: { fr: 'Don du talent au combat', en: 'Boon of Combat Prowess' },
    category: 'epic-boon',
    prerequisite: { fr: 'Niveau 19+', en: 'Level 19+' },
    summary: {
      fr: 'Quand vous ratez une attaque, vous pouvez la convertir en touche automatique (1 fois par tour).',
      en: 'When you miss an attack, you may turn it into an automatic hit (once per turn).',
    },
    source: 'srd-5.2.1',
  },
  {
    id: 'boon-of-dimensional-travel',
    name: { fr: 'Don du voyage dimensionnel', en: 'Boon of Dimensional Travel' },
    category: 'epic-boon',
    prerequisite: { fr: 'Niveau 19+', en: 'Level 19+' },
    summary: {
      fr: "En action bonus, téléportez-vous jusqu'à 9 m vers un endroit visible. PB usages par repos long.",
      en: 'As a bonus action, teleport up to 30 ft. to a visible spot. PB uses per long rest.',
    },
    source: 'srd-5.2.1',
  },
  {
    id: 'boon-of-fate',
    name: { fr: 'Don du destin', en: 'Boon of Fate' },
    category: 'epic-boon',
    prerequisite: { fr: 'Niveau 19+', en: 'Level 19+' },
    summary: {
      fr: "Quand une autre créature dans 18 m fait un d20 Test, ajoutez 2d6 au résultat. PB usages par repos long.",
      en: 'When another creature within 60 ft. makes a d20 Test, add 2d6 to the result. PB uses per long rest.',
    },
    source: 'srd-5.2.1',
  },
  {
    id: 'boon-of-irresistible-offense',
    name: { fr: 'Don de l\'offensive irrésistible', en: 'Boon of Irresistible Offense' },
    category: 'epic-boon',
    prerequisite: { fr: 'Niveau 19+', en: 'Level 19+' },
    summary: {
      fr: 'Vos attaques ignorent la résistance aux dégâts contondants/perçants/tranchants. Sur 20 naturel, ajoutez votre niveau aux dégâts.',
      en: 'Your attacks ignore bludgeoning/piercing/slashing resistance. On a nat 20, add your level to damage.',
    },
    source: 'srd-5.2.1',
  },
  {
    id: 'boon-of-spell-recall',
    name: { fr: 'Don du rappel de sort', en: 'Boon of Spell Recall' },
    category: 'epic-boon',
    prerequisite: { fr: 'Niveau 19+ + savoir lancer 1+ sort', en: 'Level 19+ and ability to cast at least 1 spell' },
    summary: {
      fr: 'Quand vous lancez un sort avec un slot ≤ 4, JS Cha (DD 15) : succès → le slot n\'est pas consommé.',
      en: 'When casting a spell using a slot of level 4 or lower, make a Cha save (DC 15): success → slot is not expended.',
    },
    source: 'srd-5.2.1',
  },
  {
    id: 'boon-of-the-night-spirit',
    name: { fr: 'Don de l\'esprit nocturne', en: 'Boon of the Night Spirit' },
    category: 'epic-boon',
    prerequisite: { fr: 'Niveau 19+', en: 'Level 19+' },
    summary: {
      fr: "Dans le noir : invisible jusqu'à ce que vous attaquiez ou lanciez un sort. Résistance aux dégâts froids/nécrotiques/psychiques.",
      en: 'In Darkness: Invisible until you attack or cast a spell. Resistance to cold, necrotic, and psychic damage.',
    },
    source: 'srd-5.2.1',
  },
  {
    id: 'boon-of-truesight',
    name: { fr: 'Don de vision véritable', en: 'Boon of Truesight' },
    category: 'epic-boon',
    prerequisite: { fr: 'Niveau 19+', en: 'Level 19+' },
    summary: {
      fr: 'Truesight 18 m permanent.',
      en: 'Permanent Truesight to a range of 60 ft.',
    },
    source: 'srd-5.2.1',
  },
];

/** Compteurs de référence pour `tests/srd-counters.test.ts`. */
export const SRD_FEATS_COUNTS = {
  total: SRD_FEATS.length,
  origin: SRD_FEATS.filter((f) => f.category === 'origin').length,
  general: SRD_FEATS.filter((f) => f.category === 'general').length,
  fightingStyle: SRD_FEATS.filter((f) => f.category === 'fighting-style').length,
  epicBoon: SRD_FEATS.filter((f) => f.category === 'epic-boon').length,
};
