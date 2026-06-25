import type { Character } from '../../types/character';
import type { ClassEntity } from '../../types/content';
import type { StringKey } from '../i18n';

/**
 * JALON « tracker de ressources de classe » — dérivation des pools CONSOMMABLES
 * de classe (Rage, Second souffle, Conduit divin, Imposition des mains…) depuis
 * `classes.json[id].classResourceProgression` + niveau de classe.
 *
 * Le bundle SRD encode beaucoup d'entrées de progression hétérogènes sous la
 * même clé `classResourceProgression`. On NE veut tracker que les vraies
 * réserves consommées par une utilisation (compteurs `n/jour` ou points). On
 * EXCLUT donc :
 *   - les dés de mise à l'échelle PASSIFS (`sneak-attack-dice`,
 *     `martial-arts-die`, `bardic-inspiration-die`, `rage-damage`) : ce ne sont
 *     pas des réserves, juste une valeur qui grandit avec le niveau ;
 *   - tout ce qui touche les emplacements de sort (`pact-magic-*`,
 *     `mystic-arcanum`, `arcane-recovery-slot-level`) : géré par les
 *     emplacements ailleurs (carte Emplacements).
 *
 * La table `CONSUMABLE_RESOURCE_META` est la liste blanche : une clé de
 * progression absente de cette table n'est jamais rendue comme réserve. Chaque
 * entrée porte son libellé FR officiel (vérifié contre `FR_SRD_CC_v5.2.1.txt`)
 * et son `restoresOn` (court/long, table « Aptitudes de classe » du SRD).
 */

export type ResourceRestoresOn = 'short' | 'long';

interface ConsumableResourceMeta {
  /** Clé i18n du libellé FR officiel de la ressource. */
  labelKey: StringKey;
  /** Repos qui réinitialise la réserve (SRD). */
  restoresOn: ResourceRestoresOn;
}

/**
 * Liste blanche des réserves de classe consommables, par clé de
 * `classResourceProgression`. Libellés FR = traduction officielle SRD 5.2.1 FR.
 */
export const CONSUMABLE_RESOURCE_META: Record<string, ConsumableResourceMeta> = {
  // Barbare — entrer en Rage `n` fois par jour (repos long). Source : colonne
  // « Rages », FR_SRD l. 3247.
  rage: { labelKey: 'sheet.combat.resources.rage', restoresOn: 'long' },
  // Guerrier — Second souffle (repos court ou long). FR_SRD l. 5946.
  'second-wind': { labelKey: 'sheet.combat.resources.secondWind', restoresOn: 'short' },
  // Guerrier — Fougue / Action Surge (repos court ou long). FR_SRD l. 5924.
  'action-surge': { labelKey: 'sheet.combat.resources.actionSurge', restoresOn: 'short' },
  // Clerc / Paladin — Conduit divin (repos court ou long). FR_SRD l. 4179.
  'channel-divinity': { labelKey: 'sheet.combat.resources.channelDivinity', restoresOn: 'short' },
  // Paladin — Imposition des mains, réserve de points (repos long). FR_SRD l. 7882.
  'lay-on-hands': { labelKey: 'sheet.combat.resources.layOnHands', restoresOn: 'long' },
  // Druide — Forme sauvage (repos court ou long). FR_SRD l. 4667.
  'wild-shape': { labelKey: 'sheet.combat.resources.wildShape', restoresOn: 'short' },
  // Ensorceleur — Points de sorcellerie (repos long). FR_SRD l. 5398.
  'sorcery-points': { labelKey: 'sheet.combat.resources.sorceryPoints', restoresOn: 'long' },
  // Moine — Points de focalisation / discipline (repos court ou long).
  'focus-points': { labelKey: 'sheet.combat.resources.focusPoints', restoresOn: 'short' },
};

/** Une réserve consommable résolue pour un personnage, prête à afficher. */
export interface ClassResourcePool {
  /** Clé composite stable `classId:resourceKey` (multiclasse-safe). */
  storageKey: string;
  /** Clé de progression brute (`rage`, `channel-divinity`…). */
  resourceKey: string;
  /** Classe d'origine. */
  classId: string;
  /** Libellé FR affiché (résolu par l'appelant via `t(labelKey)`). */
  labelKey: StringKey;
  /** Maximum à ce niveau de classe. */
  max: number;
  restoresOn: ResourceRestoresOn;
}

/** Clé de stockage stable dans `character.classResources`. */
export function resourceStorageKey(classId: string, resourceKey: string): string {
  return `${classId}:${resourceKey}`;
}

/**
 * Dérive les réserves consommables d'un personnage (multiclasse-aware).
 *
 * Pour chaque classe du personnage, on lit `classResourceProgression`, et pour
 * chaque clé connue de la liste blanche on prend la valeur à `level - 1`. Une
 * entrée n'est retenue que si c'est un `number > 0` (un `0` SRD = aptitude pas
 * encore débloquée à ce niveau ; une `string` = dé passif, jamais une réserve).
 *
 * Fonction PURE : aucun accès `character.classResources` (l'état courant est lu
 * par l'appelant). Sert à la fois à l'affichage et à la réinitialisation au repos.
 */
export function deriveClassResourcePools(
  character: Character,
  classes: readonly ClassEntity[],
): ClassResourcePool[] {
  const pools: ClassResourcePool[] = [];

  for (const entry of character.classes) {
    const cls = classes.find((c) => c.id === entry.classId);
    const progression = cls?.classResourceProgression;
    if (!progression) continue;

    for (const [resourceKey, meta] of Object.entries(CONSUMABLE_RESOURCE_META)) {
      const table = progression[resourceKey];
      if (!table) continue;
      const raw = table[entry.level - 1];
      // Réserve réelle = compteur strictement positif. `0` (pas débloqué) ou
      // chaîne (dé passif) → on n'émet pas de réserve.
      if (typeof raw !== 'number' || raw <= 0) continue;

      pools.push({
        storageKey: resourceStorageKey(entry.classId, resourceKey),
        resourceKey,
        classId: entry.classId,
        labelKey: meta.labelKey,
        max: raw,
        restoresOn: meta.restoresOn,
      });
    }
  }

  return pools;
}

/**
 * Valeur courante d'une réserve : lue dans `character.classResources` si déjà
 * instanciée, sinon par défaut au `max` (réserve pleine — le wizard pose
 * `classResources: {}`, donc une réserve jamais touchée est considérée pleine).
 *
 * Cape aussi au `max` courant : si un personnage monte de niveau et que son max
 * de Rage passe de 2 à 3, une valeur stockée à 2 reste valide ; si le max
 * baissait (jamais en SRD, mais défensif), on ne dépasse pas.
 */
export function currentResourceValue(character: Character, pool: ClassResourcePool): number {
  const stored = character.classResources[pool.storageKey];
  if (!stored) return pool.max;
  return Math.min(stored.current, pool.max);
}
