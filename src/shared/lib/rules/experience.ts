/**
 * Points d'expérience — table d'évolution du personnage (M45).
 *
 * `character.experience` existait au schéma depuis l'origine, écrit à 0 par le
 * wizard de création puis **jamais relu ni réécrit** : jouer à l'XP était
 * impossible, la seule progression disponible était « le joueur monte quand il
 * veut ». Ce module donne au champ ses règles.
 *
 * Source : SRD 5.2.1, table « Character Advancement »
 * (`content-sources/extracted/raw/SRD_CC_v5.2.1.txt`, lignes 2382-2402). Les
 * valeurs ont été vérifiées UNE fois contre cette extraction ; les tests les
 * figent ensuite (cf. CLAUDE.md > vérité du contenu, catégorie 3).
 *
 * Le bonus de maîtrise de la même table vit déjà dans `multiclass.ts`
 * (`proficiencyBonus`) — il n'est pas dupliqué ici.
 *
 * Ces fonctions n'imposent RIEN : l'app ne bloque pas une montée de niveau
 * parce que l'XP manque. Une table joue aux jalons, une autre à l'XP, et le
 * meneur reste souverain — le seuil est une information, pas une barrière.
 */

/** Seuil d'XP requis pour atteindre chaque niveau (index = niveau − 1). */
const XP_THRESHOLDS: readonly number[] = [
  0, // 1
  300, // 2
  900, // 3
  2_700, // 4
  6_500, // 5
  14_000, // 6
  23_000, // 7
  34_000, // 8
  48_000, // 9
  64_000, // 10
  85_000, // 11
  100_000, // 12
  120_000, // 13
  140_000, // 14
  165_000, // 15
  195_000, // 16
  225_000, // 17
  265_000, // 18
  305_000, // 19
  355_000, // 20
];

/** Niveau maximal 5e. */
export const MAX_LEVEL = 20;

/**
 * Seuil d'XP du niveau donné. Un niveau hors bornes est ramené dans la table
 * plutôt que de lever : cette fonction sert à afficher une jauge, pas à valider
 * une entrée.
 */
export function xpForLevel(level: number): number {
  const clamped = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  return XP_THRESHOLDS[clamped - 1]!;
}

/** Niveau atteint avec ce total d'XP (le plus haut seuil franchi). */
export function levelFromXp(xp: number): number {
  const safe = Math.max(0, Math.floor(xp));
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i += 1) {
    if (safe >= XP_THRESHOLDS[i]!) level = i + 1;
    else break;
  }
  return level;
}

export interface XpProgress {
  /** Niveau atteint d'après l'XP seul (pas forcément `character.totalLevel`). */
  readonly level: number;
  /** Seuil du niveau courant. */
  readonly currentThreshold: number;
  /** Seuil du niveau suivant, `null` au niveau 20. */
  readonly nextThreshold: number | null;
  /** XP restants avant le niveau suivant, `null` au niveau 20. */
  readonly toNext: number | null;
  /** Avancement dans le palier courant, de 0 à 1. Vaut 1 au niveau 20. */
  readonly ratio: number;
}

/**
 * Position d'un total d'XP dans sa progression : niveau atteint, seuils
 * encadrants, reste à parcourir, et ratio pour une jauge.
 */
export function xpProgress(xp: number): XpProgress {
  const safe = Math.max(0, Math.floor(xp));
  const level = levelFromXp(safe);
  const currentThreshold = xpForLevel(level);
  if (level >= MAX_LEVEL) {
    return { level, currentThreshold, nextThreshold: null, toNext: null, ratio: 1 };
  }
  const nextThreshold = xpForLevel(level + 1);
  const span = nextThreshold - currentThreshold;
  return {
    level,
    currentThreshold,
    nextThreshold,
    toNext: nextThreshold - safe,
    // `span` ne peut pas être nul (les seuils sont strictement croissants),
    // mais le ratio est borné pour rester sûr en cas d'XP hors table.
    ratio: Math.min(1, Math.max(0, (safe - currentThreshold) / span)),
  };
}
