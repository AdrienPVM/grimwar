/**
 * scripts/data/srd-summoned-creatures.ts (plan D14)
 *
 * Source de vérité hand-curated pour les 4 profils de créatures invoquées
 * SRD 5.2.1 référencés par les sorts Find Steed / Animate Objects / Giant
 * Insect / Summon Dragon. Chaque entrée cite les pages PDF EN + FR.
 *
 * Politique de contenu LOCKED (CLAUDE.md) : extrait des PDF officiels
 *  - `content-sources/pdfs/SRD_CC_v5.2.1.pdf` (EN)
 *  - `content-sources/pdfs/FR_SRD_CC_v5.2.1.pdf` (FR)
 * via les extractions texte `content-sources/extracted/raw/{SRD,FR_SRD}_CC_v5.2.1.txt`.
 * Aucune source externe (AideDD, PHB copyrighté, livres BBE).
 */
import type { SummonedCreatureStatBlock } from '../../src/shared/types/content';

export const SRD_SUMMONED_CREATURES: readonly SummonedCreatureStatBlock[] = [
  // ─────────────────────────────────────────────────────────────────────
  // 1. Monture d'outre-monde (Otherworldly Steed)
  //    Source : Find Steed (niv. 2 Conjuration, Paladin)
  //    EN — SRD txt lignes 12760-12792 / PDF p. 131
  //    FR — FR_SRD txt lignes 12058-12099 / PDF p. 117
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'monture-d-outre-monde',
    name: { fr: "Monture d’outre-monde", en: 'Otherworldly Steed' },
    sizeTypeAlignment: {
      fr: 'Céleste, Fée ou Fiélon (à votre convenance) de taille G, Neutre',
      en: 'Large Celestial, Fey, or Fiend (Your Choice), Neutral',
    },
    acFormula: { fr: 'CA 10 + 1 par niveau du sort', en: 'AC 10 + 1 per spell level' },
    hpFormula: {
      fr: 'PV 5 + 10 par niveau du sort (la monture dispose d’un nombre de DV [d10] égal au niveau du sort)',
      en: 'HP 5 + 10 per spell level (the steed has a number of Hit Dice [d10s] equal to the spell’s level)',
    },
    speed: {
      fr: 'Vitesse 18 m, vol 18 m (sort du 4ᵉ niveau ou plus)',
      en: 'Speed 60 ft., Fly 60 ft. (requires level 4+ spell)',
    },
    abilities: { for: 18, dex: 12, con: 14, int: 6, sag: 12, cha: 8 },
    resistances: null,
    immunities: null,
    senses: { fr: 'Perception passive 11', en: 'Passive Perception 11' },
    languages: {
      fr: 'Télépathie 1,5 km (fonctionne uniquement avec vous)',
      en: 'Telepathy 1 mile (works only with you)',
    },
    challenge: {
      fr: 'FP aucun (PX 0 ; BM égal à votre bonus de maîtrise)',
      en: 'CR None (XP 0; PB equals your Proficiency Bonus)',
    },
    traits: [
      {
        name: { fr: 'Lien vital', en: 'Life Bond' },
        description: {
          fr: 'Lorsque vous récupérez des points de vie par un sort du 1ᵉʳ niveau ou supérieur, la monture en récupère autant si vous vous trouvez à 1,50 m ou moins d’elle.',
          en: 'When you regain Hit Points from a level 1+ spell, the steed regains the same number of Hit Points if you’re within 5 feet of it.',
        },
      },
    ],
    actions: [
      {
        name: { fr: 'Coup d’outre-monde', en: 'Otherworldly Slam' },
        description: {
          fr: 'Corps à corps : bonus égal à votre modificateur d’attaque des sorts, allonge 1,50 m. Touché : 1d8 + le niveau du sort dégâts radiants (Céleste), psychiques (Fée) ou nécrotiques (Fiélon).',
          en: 'Melee Attack Roll: Bonus equals your spell attack modifier, reach 5 ft. Hit: 1d8 plus the spell’s level of Radiant (Celestial), Psychic (Fey), or Necrotic (Fiend) damage.',
        },
      },
    ],
    bonusActions: [
      {
        name: {
          fr: 'Contact guérisseur (Céleste uniquement ; recharge après un Repos long)',
          en: 'Healing Touch (Celestial Only; Recharges after a Long Rest)',
        },
        description: {
          fr: 'Une créature dans un rayon de 1,50 m de la monture récupère un nombre de points de vie égal à 2d8 + le niveau du sort.',
          en: 'One creature within 5 feet of the steed regains a number of Hit Points equal to 2d8 plus the spell’s level.',
        },
      },
      {
        name: {
          fr: 'Foulée féerique (Fée uniquement ; recharge après un Repos long)',
          en: 'Fey Step (Fey Only; Recharges after a Long Rest)',
        },
        description: {
          fr: 'La monture se téléporte avec son cavalier en un espace inoccupé de votre choix dans un rayon de 18 m.',
          en: 'The steed teleports, along with its rider, to an unoccupied space of your choice up to 60 feet away from itself.',
        },
      },
      {
        name: {
          fr: 'Regard fiélon (Fiélon uniquement ; recharge après un Repos long)',
          en: 'Fell Glare (Fiend Only; Recharges after a Long Rest)',
        },
        description: {
          fr: 'JS Sagesse : votre DD de sauvegarde des sorts, une créature dans un rayon de 18 m que la monture voit. Échec : la cible subit l’état Effrayé jusqu’à la fin de votre tour suivant.',
          en: 'Wisdom Saving Throw: DC equals your spell save DC, one creature within 60 feet the steed can see. Failure: The target has the Frightened condition until the end of your next turn.',
        },
      },
    ],
    reactions: [],
    source: 'srd-5.2.1',
  },

  // ─────────────────────────────────────────────────────────────────────
  // 2. Objet animé (Animated Object)
  //    Source : Animate Objects (niv. 5 Transmutation, Barde/Ensorceleur/Magicien)
  //    EN — SRD txt lignes 10402-10420 / PDF p. 109
  //    FR — FR_SRD txt lignes 11930-11949 / PDF p. 117
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'objet-anime',
    name: { fr: 'Objet animé', en: 'Animated Object' },
    sizeTypeAlignment: {
      fr: 'Artificiel de taille TG ou inférieure, non aligné',
      en: 'Huge or Smaller Construct, Unaligned',
    },
    acFormula: { fr: 'CA 15', en: 'AC 15' },
    hpFormula: {
      fr: 'PV 10 (taille M ou inférieure), 20 (G), 40 (TG)',
      en: 'HP 10 (Medium or smaller), 20 (Large), 40 (Huge)',
    },
    speed: { fr: 'Vitesse 9 m', en: 'Speed 30 ft.' },
    abilities: { for: 16, dex: 10, con: 10, int: 3, sag: 3, cha: 1 },
    resistances: null,
    immunities: {
      fr: 'poison, psychiques ; Charmé, Effrayé, Empoisonné, Épuisement, Paralysé',
      en: 'Poison, Psychic; Charmed, Exhaustion, Frightened, Paralyzed, Poisoned',
    },
    senses: {
      fr: 'Vision aveugle 9 m ; Perception passive 6',
      en: 'Blindsight 30 ft.; Passive Perception 6',
    },
    languages: {
      fr: 'Comprend les langues que vous parlez',
      en: 'Understands the languages you know',
    },
    challenge: {
      fr: 'FP aucun (PX 0 ; BM égal à votre bonus de maîtrise)',
      en: 'CR None (XP 0; PB equals your Proficiency Bonus)',
    },
    traits: [],
    actions: [
      {
        name: { fr: 'Coup', en: 'Slam' },
        description: {
          fr: 'Corps à corps : bonus égal à votre modificateur d’attaque des sorts, allonge 1,50 m. Touché : dégâts de force égaux à 1d4 + 3 (taille M ou inférieure), 2d6 + 3 + votre modificateur de caractéristique d’incantation (G), ou 2d12 + 3 + votre modificateur de caractéristique d’incantation (TG).',
          en: 'Melee Attack Roll: Bonus equals your spell attack modifier, reach 5 ft. Hit: Force damage equal to 1d4 + 3 (Medium or smaller), 2d6 + 3 + your spellcasting ability modifier (Large), or 2d12 + 3 + your spellcasting ability modifier (Huge).',
        },
      },
    ],
    bonusActions: [],
    reactions: [],
    source: 'srd-5.2.1',
  },

  // ─────────────────────────────────────────────────────────────────────
  // 3. Insecte géant (Giant Insect)
  //    Source : Giant Insect (niv. 4 Invocation, Druide)
  //    EN — SRD txt lignes 13252-13282 / PDF p. 136
  //    FR — FR_SRD txt lignes 16303-16336 / PDF p. 152
  //    3 formes choisies à l'incantation : mille-pattes, araignée, guêpe.
  //    Encodées dans les noms d'action (« (X uniquement) »).
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'insecte-geant-invoque',
    name: { fr: 'Insecte géant', en: 'Giant Insect' },
    sizeTypeAlignment: {
      fr: 'Bête de taille G, non alignée',
      en: 'Large Beast, Unaligned',
    },
    acFormula: { fr: 'CA 11 + niveau du sort', en: 'AC 11 + the spell’s level' },
    hpFormula: {
      fr: 'PV 30 + 10 par niveau du sort au-delà du 4ᵉ',
      en: 'HP 30 + 10 for each spell level above 4',
    },
    speed: {
      fr: 'Vitesse 12 m, escalade 12 m, vol 12 m (guêpe uniquement)',
      en: 'Speed 40 ft., Climb 40 ft., Fly 40 ft. (Wasp only)',
    },
    abilities: { for: 17, dex: 13, con: 15, int: 4, sag: 14, cha: 3 },
    resistances: null,
    immunities: null,
    senses: {
      fr: 'Vision dans le noir 18 m ; Perception passive 12',
      en: 'Darkvision 60 ft.; Passive Perception 12',
    },
    languages: {
      fr: 'Comprend les langues que vous parlez',
      en: 'Understands the languages you know',
    },
    challenge: {
      fr: 'FP aucun (PX 0 ; BM égal à votre bonus de maîtrise)',
      en: 'CR None (XP 0; PB equals your Proficiency Bonus)',
    },
    traits: [
      {
        name: { fr: 'Pattes d’araignée', en: 'Spider Climb' },
        description: {
          fr: 'L’insecte peut parcourir les parois les plus difficiles à escalader, y compris les plafonds, sans passer par un test de caractéristique.',
          en: 'The insect can climb difficult surfaces, including along ceilings, without needing to make an ability check.',
        },
      },
    ],
    actions: [
      {
        name: { fr: 'Attaques multiples', en: 'Multiattack' },
        description: {
          fr: 'L’insecte effectue autant d’attaques que la moitié du niveau de ce sort (arrondir à l’inférieur).',
          en: 'The insect makes a number of attacks equal to half this spell’s level (round down).',
        },
      },
      {
        name: { fr: 'Piqûre toxique', en: 'Poison Jab' },
        description: {
          fr: 'Corps à corps : bonus égal à votre modificateur d’attaque des sorts, allonge 3 m. Touché : 1d6 + 3 + niveau du sort dégâts perforants, plus 1d4 dégâts de poison.',
          en: 'Melee Attack Roll: Bonus equals your spell attack modifier, reach 10 ft. Hit: 1d6 + 3 plus the spell’s level Piercing damage plus 1d4 Poison damage.',
        },
      },
      {
        name: { fr: 'Jet de toile (araignée uniquement)', en: 'Web Bolt (Spider Only)' },
        description: {
          fr: 'À distance : bonus égal à votre modificateur d’attaque des sorts, portée 18 m. Touché : 1d10 + 3 + niveau du sort dégâts contondants, et la vitesse de la cible tombe à 0 jusqu’au début du tour suivant de l’insecte.',
          en: 'Ranged Attack Roll: Bonus equals your spell attack modifier, range 60 ft. Hit: 1d10 + 3 plus the spell’s level Bludgeoning damage, and the target’s Speed is reduced to 0 until the start of the insect’s next turn.',
        },
      },
    ],
    bonusActions: [
      {
        name: {
          fr: 'Crachat venimeux (mille-pattes uniquement)',
          en: 'Venomous Spew (Centipede Only)',
        },
        description: {
          fr: 'JS Constitution : votre DD de sauvegarde des sorts, une créature que l’insecte voit dans un rayon de 3 m. Échec : la cible subit l’état Empoisonné jusqu’au début du tour suivant de l’insecte.',
          en: 'Constitution Saving Throw: Your spell save DC, one creature the insect can see within 10 feet. Failure: The target has the Poisoned condition until the start of the insect’s next turn.',
        },
      },
    ],
    reactions: [],
    source: 'srd-5.2.1',
  },

  // ─────────────────────────────────────────────────────────────────────
  // 4. Esprit draconique (Draconic Spirit)
  //    Source : Summon Dragon (niv. 5 Invocation, Magicien)
  //    EN — SRD txt lignes 16545-16574 / PDF p. 167
  //    FR — FR_SRD txt lignes 13829-13861 / PDF p. 131
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'esprit-draconique',
    name: { fr: 'Esprit draconique', en: 'Draconic Spirit' },
    sizeTypeAlignment: {
      fr: 'Dragon de taille G, Neutre',
      en: 'Large Dragon, Neutral',
    },
    acFormula: { fr: 'CA 14 + niveau du sort', en: 'AC 14 + the spell’s level' },
    hpFormula: {
      fr: 'PV 50 + 10 par niveau du sort au-delà du 5ᵉ',
      en: 'HP 50 + 10 for each spell level above 5',
    },
    speed: {
      fr: 'Vitesse 9 m, nage 9 m, vol 18 m',
      en: 'Speed 30 ft., Fly 60 ft., Swim 30 ft.',
    },
    abilities: { for: 19, dex: 14, con: 17, int: 10, sag: 14, cha: 14 },
    resistances: {
      fr: 'acide, feu, froid, foudre, poison',
      en: 'Acid, Cold, Fire, Lightning, Poison',
    },
    immunities: { fr: 'Charmé, Effrayé, Empoisonné', en: 'Charmed, Frightened, Poisoned' },
    senses: {
      fr: 'Vision aveugle 9 m, Vision dans le noir 18 m ; Perception passive 12',
      en: 'Blindsight 30 ft., Darkvision 60 ft.; Passive Perception 12',
    },
    languages: {
      fr: 'Draconique, comprend les langues que vous connaissez',
      en: 'Draconic, understands the languages you know',
    },
    challenge: {
      fr: 'FP aucun (PX 0 ; BM égal à votre bonus de maîtrise)',
      en: 'CR None (XP 0; PB equals your Proficiency Bonus)',
    },
    traits: [
      {
        name: { fr: 'Résistances partagées', en: 'Shared Resistances' },
        description: {
          fr: 'Lorsque vous convoquez l’esprit, choisissez l’une de ses Résistances aux dégâts. Vous bénéficiez de la Résistance au type de dégâts choisi jusqu’à la fin du sort.',
          en: 'When you summon the spirit, choose one of its Resistances. You have Resistance to the chosen damage type until the spell ends.',
        },
      },
    ],
    actions: [
      {
        name: { fr: 'Attaques multiples', en: 'Multiattack' },
        description: {
          fr: 'L’esprit effectue autant d’attaques de Saignée que la moitié du niveau de ce sort (arrondir à l’inférieur) et il recourt à Souffle.',
          en: 'The spirit makes a number of Rend attacks equal to half the spell’s level (round down), and it uses Breath Weapon.',
        },
      },
      {
        name: { fr: 'Saignée', en: 'Rend' },
        description: {
          fr: 'Corps à corps : bonus égal à votre modificateur d’attaque des sorts, allonge 3 m. Touché : 1d6 + 4 + le niveau du sort dégâts perforants.',
          en: 'Melee Attack Roll: Bonus equals your spell attack modifier, reach 10 feet. Hit: 1d6 + 4 + the spell’s level Piercing damage.',
        },
      },
      {
        name: { fr: 'Souffle', en: 'Breath Weapon' },
        description: {
          fr: 'JS Dextérité : DD égal à votre DD de sauvegarde des sorts, chaque créature dans un cône de 9 m. Échec : 2d6 dégâts d’un type auquel l’esprit a la Résistance (vous choisissez à l’incantation du sort). Réussite : moitié des dégâts.',
          en: 'Dexterity Saving Throw: DC equals your spell save DC, each creature in a 30-foot Cone. Failure: 2d6 damage of a type this spirit has Resistance to (your choice when you cast the spell). Success: Half damage.',
        },
      },
    ],
    bonusActions: [],
    reactions: [],
    source: 'srd-5.2.1',
  },
];

/** Compteurs attendus (parse strict de l'extracteur). */
export const SRD_SUMMONED_CREATURES_COUNTS = {
  total: 4,
} as const;
