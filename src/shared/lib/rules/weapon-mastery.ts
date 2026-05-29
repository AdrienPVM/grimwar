import type { Character, FightingStyle } from '@/shared/types/character';
import type { Item, WeaponMasteryEligibility } from '@/shared/types/content';

/**
 * Règles Weapon Mastery SRD 5.2.1 (plan 13.9, refactor data-driven 2A.5).
 *
 * Source : `docs/AUDIT-SRD-COMPLETUDE.md > C.1` — table d'allocation par
 * classe. À L1, la classe accède à un sous-ensemble d'armes éligibles selon
 * ses maîtrises (proficiencies) :
 *
 * - `all-proficient` (Barb/Fighter/Paladin/Ranger) : toutes les armes SRD
 *   avec `masteryProperty` sont éligibles.
 * - `rogue-finesse-light` (Rogue) : simple OU (martiale ayant Finesse OU
 *   Light) — sous-ensemble.
 *
 * Le moine n'a PAS Weapon Mastery au SRD (cf. plan 13.9 Notes —
 * `weaponMasteryCount` = 0 dans le bundle → `eligibility` absent → aucune
 * arme éligible).
 *
 * JALON 2A.5 — l'éligibilité est désormais portée par la donnée
 * (`weaponMasteryEligibility` sur `ClassEntity`). Plus de `switch (classId)`
 * dans le code : une classe custom (JALON 3) peut déclarer son éligibilité
 * sans patcher ce fichier.
 */

/**
 * Renvoie les ids d'items éligibles à Weapon Mastery pour une politique
 * d'éligibilité donnée. Filtré sur `masteryProperty` présent ET sur la
 * sémantique de la politique (cf. en-tête).
 *
 * Le tri stable (par nom) est appliqué pour que l'ordre des cartes du chooser
 * reste constant entre les sessions — pas de "ça bouge à chaque F5".
 *
 * `eligibility = null | undefined` → tableau vide. C'est le cas des classes
 * sans Weapon Mastery à L1 (chooser non monté en pratique, mais on retourne
 * `[]` plutôt que de jeter pour rester robuste face à un appel défensif).
 */
export function getEligibleWeaponMasteryIds(
  eligibility: WeaponMasteryEligibility | null | undefined,
  items: readonly Item[],
  locale: 'fr' | 'en' = 'fr',
): readonly Item[] {
  if (!eligibility) return [];
  const withMastery = items.filter(
    (it) => it.category === 'weapon' && it.masteryProperty,
  );
  let eligible: Item[];
  switch (eligibility) {
    case 'all-proficient':
      eligible = [...withMastery];
      break;
    case 'rogue-finesse-light':
      eligible = withMastery.filter((it) => {
        const props = it.properties ?? [];
        const isSimple =
          props.includes('simple-melee') || props.includes('simple-ranged');
        const isMartial =
          props.includes('martial-melee') || props.includes('martial-ranged');
        if (isSimple) return true;
        if (isMartial && (props.includes('Finesse') || props.includes('Light')))
          return true;
        return false;
      });
      break;
  }
  return eligible.sort((a, b) => {
    const an = a.name[locale] ?? a.name.fr;
    const bn = b.name[locale] ?? b.name.fr;
    return an.localeCompare(bn, locale);
  });
}

/**
 * Renvoie l'ensemble des `itemId` de Weapon Mastery connus du personnage —
 * union sur toutes les entrées de `classes[]` (multi-class : un Roublard 2 /
 * Guerrier 1 cumule les 2 masteries Roublard + les 3 Guerrier).
 *
 * Renvoie un `Set` pour permettre un test d'appartenance O(1) côté
 * `attacks-list.tsx` (38 armes potentielles × 1 lookup par ligne d'attaque).
 * La fonction est pure et stable : pas de side effect, idempotente sur le
 * même perso.
 */
export function getKnownWeaponMasteries(character: Character): Set<string> {
  const known = new Set<string>();
  for (const entry of character.classes) {
    for (const id of entry.weaponMasteries) {
      known.add(id);
    }
  }
  return known;
}

/**
 * Renvoie le Fighting Style choisi pour la première classe de type Guerrier
 * du personnage, ou `null` si aucun (perso non-Guerrier, ou Guerrier dont la
 * sentinelle est restée vide — cas v1 migré).
 *
 * À L1, un perso a au plus une entrée Guerrier dans `classes[]` ; à plus haut
 * niveau, un multi-Guerrier est non-canonique mais resté possible côté schéma
 * — on prend le premier match pour garder un comportement déterministe.
 */
export function getFighterFightingStyle(
  character: Character,
): FightingStyle | null {
  const fighterEntry = character.classes.find(
    (c) => c.classId === 'fighter' && c.fighterFightingStyle !== null,
  );
  return fighterEntry?.fighterFightingStyle ?? null;
}
