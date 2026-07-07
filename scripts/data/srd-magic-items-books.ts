/**
 * SRD CC v5.2.1 — Manuels & traités magiques (7 entrées).
 *
 * Batch D29.12 (backfill EN des magic-items grandfathered AideDD).
 *
 * Sources verbatim :
 *   - EN : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`
 *     (Manual of Bodily Health l. 23047, Manual of Gainful Exercise l. 23056,
 *     Manual of Golems l. 23064, Manual of Quickness of Action l. 23094, Tome of
 *     Clear Thought l. 25237, Tome of Leadership and Influence l. 25246, Tome of
 *     Understanding l. 25258)
 *   - FR : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`
 *     (Manuel d'exercices physiques l. 27383, Manuel de vitalité l. 27392,
 *     Manuel de vivacité l. 27401, Manuel des golems l. 27411, Traité de
 *     perspicacité l. 29457, Traité d'autorité et d'influence l. 29466, Traité
 *     de compréhension l. 29479)
 *
 * Correspondances ability-boost (vérifiées sur la valeur augmentée dans les deux
 * éditions) : Manuel de vitalité = Bodily Health (**Constitution**) · Manuel
 * d'exercices physiques = Gainful Exercise (**Force**) · Manuel de vivacité =
 * Quickness of Action (**Dextérité**) · Traité de perspicacité = Clear Thought
 * (**Intelligence**) · Traité d'autorité et d'influence = Leadership and
 * Influence (**Charisme**) · Traité de compréhension = Understanding (**Sagesse**).
 *
 * Aucun drift : les 7 sont « très rare » sans Harmonisation dans les deux
 * éditions (conforme au bundle) et les 7 noms FR sont déjà officiels. Backfill EN
 * + reformulation FR sur la VF officielle SRD uniquement.
 *
 * Conventions (identiques aux modules D29.1→D29.11) : hyphénations de fin de ligne
 * et artefacts d'espacement retirés (« cent ur y » → « century ») ; ordinaux
 * scindés « 5\ne\n niveau » → « 5e niveau » ; apostrophes FR en ASCII, EN
 * verbatim SRD (quotes courbes) ; `\n\n` entre blocs ; table du Manuel des golems
 * inlinée en énumération (les deux éditions ont la même table).
 */

import type { SrdMagicItemEntry } from './srd-magic-items-potions';

export const SRD_MAGIC_ITEMS_BOOKS: SrdMagicItemEntry[] = [
  {
    id: 'manuel-de-vitalite',
    name: { fr: 'Manuel de vitalité', en: 'Manual of Bodily Health' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Ce livre aux inscriptions chargées de magie dispense de précieux conseils en matière de santé et de nutrition. Si vous consacrez 48 heures sur une période maximale de 6 jours à étudier le contenu de l'ouvrage et à le mettre en pratique, votre valeur de Constitution augmente de 2, jusqu'à un maximum de 30. Le manuel perd alors sa magie, mais la retrouve après un siècle.",
      en: 'This book contains health and nutrition tips, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book’s contents and practicing its guidelines, your Constitution increases by 2, to a maximum of 30. The manual then loses its magic but regains it in a century.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'manuel-d-exercices-physiques',
    name: { fr: "Manuel d'exercices physiques", en: 'Manual of Gainful Exercise' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Ce livre aux inscriptions chargées de magie dispense de précieux conseils en matière d'exercices physiques. Si vous consacrez 48 heures sur une période maximale de 6 jours à étudier le contenu de l'ouvrage et à le mettre en pratique, votre valeur de Force augmente de 2, jusqu'à un maximum de 30. Le manuel perd alors sa magie, mais la retrouve après un siècle.",
      en: 'This book describes fitness exercises, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book’s contents and practicing its guidelines, your Strength increases by 2, to a maximum of 30. The manual then loses its magic but regains it in a century.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'manuel-de-vivacite',
    name: { fr: 'Manuel de vivacité', en: 'Manual of Quickness of Action' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Ce livre aux inscriptions chargées de magie dispense de précieux conseils en matière d'exercices de coordination et d'équilibre. Si vous consacrez 48 heures sur une période maximale de 6 jours à étudier le contenu de l'ouvrage et à le mettre en pratique, votre valeur de Dextérité augmente de 2, jusqu'à un maximum de 30. Le manuel perd alors sa magie, mais la retrouve après un siècle.",
      en: 'This book contains coordination and balance exercises, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book’s contents and practicing its guidelines, your Dexterity increases by 2, to a maximum of 30. The manual then loses its magic but regains it in a century.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'manuel-des-golems',
    name: { fr: 'Manuel des golems', en: 'Manual of Golems' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Cet ouvrage renferme les informations et incantations nécessaires à l'assemblage d'un type spécifique de golem. Le MJ en choisit le type ou le détermine aléatoirement selon la table suivante. Pour déchiffrer et utiliser ce manuel, vous devez être un incantateur disposant d'au moins deux emplacements de sort du 5e niveau. Une créature incapable d'utiliser le manuel des golems et qui tente de le lire subit 6d6 dégâts psychiques.\n\nPour créer un golem, vous devez consacrer le nombre de jours indiqué sur la table et travailler sans relâche avec le manuel à portée de main sans prendre plus de 8 heures de Repos par jour. Vous devez également acquitter le coût indiqué pour acheter les matériaux nécessaires.\n\nUne fois la création du golem terminée, des flammes mystiques dévorent le livre. Le golem s'anime lorsque les cendres du manuel sont dispersées sur lui. Reportez-vous à « Monstres » pour le profil de jeu du golem. Il est sous votre contrôle, vous comprend et obéit à vos ordres.\n\nGolem (1d20) : Golem d'argile 1-5, 30 jours, 65 000 po ; Golem de chair 6-17, 60 jours, 50 000 po ; Golem de fer 18, 120 jours, 100 000 po ; Golem de pierre 19-20, 90 jours, 80 000 po.",
      en: 'This tome contains information and incantations necessary to make a particular type of golem. The GM chooses the type or determines it randomly by rolling on the accompanying table. To decipher and use the manual, you must be a spellcaster with at least two level 5 spell slots. A creature that can’t use a Manual of Golems and attempts to read it takes 6d6 Psychic damage.\n\nTo create a golem, you must spend the time shown on the table, working without interruption with the manual at hand and resting no more than 8 hours per day. You must also pay the specified cost to purchase supplies.\n\nOnce you finish creating the golem, the book is consumed in eldritch flames. The golem becomes animate when the ashes of the manual are sprinkled on it. See “Monsters” for the golem’s stat block. The golem is under your control, and it understands and obeys your commands.\n\nGolem (1d20): Clay Golem 1–5, 30 days, 65,000 GP; Flesh Golem 6–17, 60 days, 50,000 GP; Iron Golem 18, 120 days, 100,000 GP; Stone Golem 19–20, 90 days, 80,000 GP.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'traite-de-perspicacite',
    name: { fr: 'Traité de perspicacité', en: 'Tome of Clear Thought' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Ce livre aux inscriptions chargées de magie recèle de précieux exercices de mémoire et de logique. Si vous consacrez 48 heures sur une période maximale de 6 jours à étudier le contenu de l'ouvrage et à le mettre en pratique, votre valeur d'Intelligence augmente de 2, jusqu'à un maximum de 30. Le manuel perd alors sa magie, mais la retrouve après un siècle.",
      en: 'This book contains memory and logic exercises, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book’s contents and practicing its guidelines, your Intelligence increases by 2, to a maximum of 30. The manual then loses its magic but regains it in a century.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'traite-d-autorite-et-d-influence',
    name: { fr: "Traité d'autorité et d'influence", en: 'Tome of Leadership and Influence' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Ce livre aux inscriptions chargées de magie dispense de précieux conseils sur la façon d'influencer et de captiver l'auditoire. Si vous consacrez 48 heures sur une période maximale de 6 jours à étudier le contenu de l'ouvrage et à le mettre en pratique, votre valeur de Charisme augmente de 2, jusqu'à un maximum de 30. Le manuel perd alors sa magie, mais la retrouve après un siècle.",
      en: 'This book contains guidelines for influencing and charming others, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book’s contents and practicing its guidelines, your Charisma increases by 2, to a maximum of 30. The manual then loses its magic but regains it in a century.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
  {
    id: 'traite-de-comprehension',
    name: { fr: 'Traité de compréhension', en: 'Tome of Understanding' },
    category: 'gear',
    rarity: 'very rare',
    attunement: false,
    magicDescription: {
      fr: "Ce livre aux inscriptions chargées de magie propose de précieux exercices d'intuition et de perspicacité. Si vous consacrez 48 heures sur une période maximale de 6 jours à étudier le contenu de l'ouvrage et à le mettre en pratique, votre valeur de Sagesse augmente de 2, jusqu'à un maximum de 30. Le manuel perd alors sa magie, mais la retrouve après un siècle.",
      en: 'This book contains intuition and insight exercises, and its words are charged with magic. If you spend 48 hours over a period of 6 days or fewer studying the book’s contents and practicing its guidelines, your Wisdom increases by 2, to a maximum of 30. The manual then loses its magic, but regains it in a century.',
    },
    description: null,
    source: 'srd-5.2.1',
  },
];

/** Compteurs figés (parse strict côté merge script). */
export const SRD_MAGIC_ITEMS_BOOKS_COUNTS = {
  total: SRD_MAGIC_ITEMS_BOOKS.length,
  veryRare: SRD_MAGIC_ITEMS_BOOKS.filter((e) => e.rarity === 'very rare').length,
  attuned: SRD_MAGIC_ITEMS_BOOKS.filter((e) => e.attunement !== false).length,
} as const;
