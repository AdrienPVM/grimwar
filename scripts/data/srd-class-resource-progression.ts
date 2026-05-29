/**
 * scripts/data/srd-class-resource-progression.ts (JALON 2B.2b)
 *
 * Tables canoniques de progression des ressources de classe SRD 5.2.1.
 * Chaque entrée encode 20 valeurs (index = niveau - 1).
 *
 * Source : SRD 5.2.1, tables « <Class> Features » (Creative Commons).
 * Référencé via `content-sources/extracted/raw/SRD_CC_v5.2.1.txt` :
 *   - Barbarian Features    L2909
 *   - Bard Features         L3194
 *   - Cleric Features       L3625
 *   - Druid Features        L4054
 *   - Fighter Features      L4613
 *   - Monk Features         L4868
 *   - Paladin Features      L5136
 *   - Rogue Features        L5928
 *   - Sorcerer Features     L6193
 *   - Warlock Features      L6760
 *   - Wizard Features       L7310 (Arcane Recovery rule L7426)
 *
 * Tous les dés sont normalisés en minuscule (`d6`, `1d6`) pour cohérence
 * avec les tokens dice du projet. `0` représente l'absence de ressource au
 * niveau donné (cf. Channel Divinity, Action Surge…).
 *
 * Décisions :
 *  - Pas de dérivation runtime : on encode les 20 valeurs explicitement.
 *    Plus simple à vérifier, plus simple à tester (cf. règle « test-vérité
 *    du contenu » cat. 3 — 15-20 valeurs figées contre le SRD).
 *  - Resources dérivées d'un modificateur (ex. Bardic Inspiration uses =
 *    Charisma modifier ; PB-based uses) NE sont PAS encodées ici — elles
 *    relèveront d'une logique runtime distincte.
 *  - Les classes sans ressources progressives (Ranger pour V1 minimal —
 *    `favored-enemy` est un compteur mais hors scope V1 jalon 2) ne
 *    déclarent pas la clé.
 */

/**
 * Une entrée de progression : nombre entier non-négatif (`0` = pas encore
 * disponible, `2` = 2 charges, etc.) ou chaîne (dés `d6`/`1d6`, valeurs
 * symboliques type `Unlimited` si jamais).
 */
export type ResourceProgressionEntry = number | string;

/** Tableau ordonné L1→L20 — toujours 20 entrées. */
export type ResourceProgression = readonly ResourceProgressionEntry[];

const length20 = <const T extends readonly ResourceProgressionEntry[]>(arr: T): T => {
  if (arr.length !== 20) {
    throw new Error(
      `[srd-class-resource-progression] PARSE STRICT FAIL — progression doit avoir 20 entrées (L1..L20), trouvé ${arr.length}.`,
    );
  }
  return arr;
};

export const SRD_CLASS_RESOURCE_PROGRESSION: Record<string, Record<string, ResourceProgression>> = {
  // SRD L2909 (Rages, Rage Damage)
  barbarian: {
    rage: length20([2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6]),
    'rage-damage': length20([2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4]),
  },
  // SRD L3194 (Bardic Die — colonne dédiée)
  bard: {
    'bardic-inspiration-die': length20([
      'd6',
      'd6',
      'd6',
      'd6',
      'd8',
      'd8',
      'd8',
      'd8',
      'd8',
      'd10',
      'd10',
      'd10',
      'd10',
      'd10',
      'd12',
      'd12',
      'd12',
      'd12',
      'd12',
      'd12',
    ]),
  },
  // SRD L3625 (Channel Divinity — none at L1, gained at L2)
  cleric: {
    'channel-divinity': length20([
      0, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4,
    ]),
  },
  // SRD L4054 (Wild Shape — none at L1, gained at L2)
  druid: {
    'wild-shape': length20([0, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4]),
  },
  // SRD L4613 (Second Wind, Action Surge L2 « one use » → L17 « two uses »)
  fighter: {
    'second-wind': length20([2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]),
    'action-surge': length20([0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2]),
  },
  // SRD L4868 (Martial Arts die, Focus Points — none at L1)
  monk: {
    'martial-arts-die': length20([
      '1d6',
      '1d6',
      '1d6',
      '1d6',
      '1d8',
      '1d8',
      '1d8',
      '1d8',
      '1d8',
      '1d8',
      '1d10',
      '1d10',
      '1d10',
      '1d10',
      '1d10',
      '1d10',
      '1d12',
      '1d12',
      '1d12',
      '1d12',
    ]),
    'focus-points': length20([
      0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]),
  },
  // SRD L5136 (Channel Divinity — none L1-2, gained L3 ; Lay On Hands pool = level × 5 par règle textuelle)
  paladin: {
    'channel-divinity': length20([
      0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
    ]),
    'lay-on-hands': length20([
      5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
    ]),
  },
  // SRD L5928 (Sneak Attack dice)
  rogue: {
    'sneak-attack-dice': length20([
      '1d6',
      '1d6',
      '2d6',
      '2d6',
      '3d6',
      '3d6',
      '4d6',
      '4d6',
      '5d6',
      '5d6',
      '6d6',
      '6d6',
      '7d6',
      '7d6',
      '8d6',
      '8d6',
      '9d6',
      '9d6',
      '10d6',
      '10d6',
    ]),
  },
  // SRD L6193 (Sorcery Points — colonne dédiée, none L1)
  sorcerer: {
    'sorcery-points': length20([
      0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]),
  },
  // SRD L6760 (Eldritch Invocations, Pact Magic slots/slot-level, Mystic Arcanum dérivé des features L11/13/15/17)
  warlock: {
    'eldritch-invocations': length20([
      1, 3, 3, 3, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10,
    ]),
    'pact-magic-slots': length20([
      1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4,
    ]),
    'pact-magic-slot-level': length20([
      1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
    ]),
    'mystic-arcanum': length20([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 4,
    ]),
  },
  // SRD L7310 + règle Arcane Recovery L7426 : « combined level = ceil(level/2), aucun slot >= 6 ».
  // Encodé ici comme niveau combiné de slots récupérables (cap implicite par règle textuelle).
  wizard: {
    'arcane-recovery-slot-level': length20([
      1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10,
    ]),
  },
};

/**
 * Compte total d'entrées de progression pour assertions de complétude
 * (utilisé par le test des compteurs SRD).
 */
export const SRD_CLASS_RESOURCE_PROGRESSION_COUNTS = {
  totalClasses: Object.keys(SRD_CLASS_RESOURCE_PROGRESSION).length,
  totalResources: Object.values(SRD_CLASS_RESOURCE_PROGRESSION).reduce(
    (acc, perClass) => acc + Object.keys(perClass).length,
    0,
  ),
} as const;
