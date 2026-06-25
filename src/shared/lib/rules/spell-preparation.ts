import type { ClassEntity, Spell } from '@/shared/types/content';

/**
 * Règles de **préparation des sorts** (SRD 5.2.1 / 2024).
 *
 * Helpers purs : aucun accès Firestore, aucun React. La couche UI
 * (`preparation-editor.tsx`) consomme ces fonctions pour construire le pool de
 * candidats, calculer le plafond et appliquer un toggle.
 *
 * Vocabulaire 2024 :
 *  - **Préparateurs** : Clerc, Druide, Paladin, Magicien — re-préparent à chaque
 *    repos long depuis (pour Clerc/Druide/Paladin) **toute la liste de classe**.
 *  - **Connaisseurs** : Barde, Ensorceleur, Rôdeur, Occultiste — liste fixe, pas
 *    de re-préparation. Pas d'éditeur.
 *
 * Le Magicien est un préparateur mais depuis son **grimoire** (cas particulier
 * géré ailleurs) — il est listé ici pour `isPreparedCaster`, mais l'éditeur de
 * liste-complète ne s'applique qu'aux trois autres.
 */

/**
 * Classes qui préparent leurs sorts (colonne « Prepared Spells » des tables de
 * classe SRD 5.2.1). Les ids EN matchent `classes` du bundle `spells.json` et
 * `character.classes[].classId`. Codé ici (et non dans `classes.json`, un path
 * protégé sans champ `preparationType`) comme fait de règles.
 */
export const PREPARED_CASTER_CLASS_IDS = [
  'cleric',
  'druid',
  'paladin',
  'wizard',
] as const;

const PREPARED_CASTER_SET: ReadonlySet<string> = new Set(PREPARED_CASTER_CLASS_IDS);

/** `true` si la classe prépare ses sorts (par opposition à « connaît »). */
export function isPreparedCaster(classId: string): boolean {
  return PREPARED_CASTER_SET.has(classId);
}

/**
 * Plafond de sorts préparés pour une classe à un niveau donné — colonne
 * « Prepared Spells » du SRD 2024 (`spellProgression.spellsKnownOrPrepared`).
 * `level` est le niveau DANS cette classe (multiclasse : par classe). Retourne 0
 * si la classe n'a pas de progression de sorts ou si le niveau est hors borne.
 */
export function preparationCap(classDef: ClassEntity | undefined, level: number): number {
  const table = classDef?.spellProgression?.spellsKnownOrPrepared;
  if (!table) return 0;
  const idx = level - 1;
  if (idx < 0 || idx >= table.length) return 0;
  return table[idx] ?? 0;
}

/**
 * Pool de sorts préparables pour une classe : sorts dont `classes` contient le
 * `classId`, de niveau ∈ [1 .. maxLevel]. Les cantrips (niveau 0) sont **exclus**
 * (toujours disponibles, ne comptent pas dans le plafond). Trié par niveau puis
 * nom FR pour un rendu stable.
 */
export function candidatePreparableSpells(
  spells: readonly Spell[],
  classId: string,
  maxLevel: number,
): Spell[] {
  return spells
    .filter(
      (s) =>
        s.level >= 1 &&
        s.level <= maxLevel &&
        s.classes.includes(classId),
    )
    .sort(
      (a, b) =>
        a.level - b.level || a.name.fr.localeCompare(b.name.fr, 'fr'),
    );
}

/**
 * Applique un toggle de préparation à la liste d'une classe, en respectant le
 * plafond. Si le sort est déjà préparé → retiré. Sinon ajouté, **sauf** si le
 * plafond est atteint (retourne la liste inchangée — l'UI désactive de toute
 * façon les lignes au plafond, ceci est la barrière logique). Retourne une
 * nouvelle liste (jamais de mutation).
 */
export function togglePrepared(
  current: readonly string[],
  spellId: string,
  cap: number,
): string[] {
  if (current.includes(spellId)) {
    return current.filter((id) => id !== spellId);
  }
  if (current.length >= cap) return [...current];
  return [...current, spellId];
}
