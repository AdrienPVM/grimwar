import {
  casterLevel,
  spellSlotsForCasterLevel,
  type CasterClassEntry,
  type SpellSlotsByLevel,
} from '@/shared/lib/rules/multiclass';
import type { Character } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

/**
 * Pures helpers Magie : consommation/restauration d'emplacements, dérivation
 * du niveau d'incantateur unifié à partir des classes du personnage et du
 * référentiel de contenu (classes.json).
 *
 * Plan 09 step 5b — slots UNIFIÉS via la formule casterLevel ; les cantrips et
 * sorts préparés restent per-class. Le pact magic (warlock) n'est pas géré dans
 * cette V1 — il sera ajouté avec son propre helper si besoin (sa progression de
 * slots est indépendante de la table unifiée).
 */

/** Représentation de la table d'emplacements telle que stockée dans la fiche. */
export type SpellSlotState = Record<string, { current: number; max: number }>;

const SLOT_LEVEL_KEYS: readonly (keyof SpellSlotsByLevel)[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Croise les `character.classes` avec `classes.json` pour produire les paires
 * `(level, progression)` exploitables par `casterLevel`. Les classes inconnues
 * du référentiel (content pas encore chargé) sont ignorées.
 */
export function deriveCasterEntries(
  characterClasses: Character['classes'],
  classCatalog: readonly ClassEntity[],
): CasterClassEntry[] {
  const byId = new Map(classCatalog.map((c) => [c.id, c]));
  const entries: CasterClassEntry[] = [];
  for (const entry of characterClasses) {
    const def = byId.get(entry.classId);
    if (!def) continue;
    entries.push({
      level: entry.level,
      progression: def.spellcasting ? def.spellcasting.progression : null,
    });
  }
  return entries;
}

/**
 * Niveau d'incantateur unifié du personnage. 0 si pas de classe lanceuse.
 * Le pact (warlock) est exclu de la table unifiée — voir `casterLevel`.
 */
export function characterCasterLevel(
  character: Character,
  classCatalog: readonly ClassEntity[],
): number {
  return casterLevel(deriveCasterEntries(character.classes, classCatalog));
}

/**
 * Slots attendus par niveau pour la table unifiée. Les "max" stockés sur la
 * fiche peuvent diverger (level-up en plan 18 les réconciliera), mais ce helper
 * sert d'affichage de référence quand `character.spellSlots[lvl].max === 0`.
 */
export function expectedSpellSlots(
  character: Character,
  classCatalog: readonly ClassEntity[],
): SpellSlotsByLevel {
  return spellSlotsForCasterLevel(characterCasterLevel(character, classCatalog));
}

/**
 * Niveaux 1-9 effectivement débloqués (max > 0) selon la table unifiée ou la
 * fiche elle-même (l'un ou l'autre). Sert à savoir quels anneaux dessiner.
 */
export function unlockedSlotLevels(
  character: Character,
  classCatalog: readonly ClassEntity[],
): readonly number[] {
  const expected = expectedSpellSlots(character, classCatalog);
  const stored = character.spellSlots;
  const out: number[] = [];
  for (const lvl of SLOT_LEVEL_KEYS) {
    const expMax = expected[lvl];
    const storedMax = stored[String(lvl)]?.max ?? 0;
    if (expMax > 0 || storedMax > 0) out.push(lvl);
  }
  return out;
}

/**
 * Réduit un slot d'un niveau donné de 1, clamp à 0. Retourne le nouveau record
 * (sans muter l'entrée). Si le niveau n'existe pas ou que current === 0, retourne
 * `null` pour signaler que l'opération n'a rien à faire (l'appelant ne devrait
 * alors pas patcher Firestore).
 */
export function consumeSlot(
  slots: SpellSlotState,
  level: number,
): SpellSlotState | null {
  const key = String(level);
  const entry = slots[key];
  if (!entry || entry.current <= 0) return null;
  return {
    ...slots,
    [key]: { current: entry.current - 1, max: entry.max },
  };
}

/**
 * Restaure un slot d'un niveau donné de 1, clamp à max. Retourne null si déjà
 * au max (rien à patcher).
 */
export function restoreSlot(
  slots: SpellSlotState,
  level: number,
): SpellSlotState | null {
  const key = String(level);
  const entry = slots[key];
  if (!entry || entry.current >= entry.max) return null;
  return {
    ...slots,
    [key]: { current: entry.current + 1, max: entry.max },
  };
}

/**
 * `true` si le personnage a au moins une classe à progression `pact` (Warlock).
 * Sert à afficher un état dédié dans `MagicCircle` tant que plan 18 n'a pas livré
 * la table de pact magic — sinon l'utilisateur voit un "aucun emplacement débloqué"
 * trompeur (un Occultiste niveau 1 a normalement 1 slot pact L1).
 */
export function hasPactProgression(
  character: Character,
  classCatalog: readonly ClassEntity[],
): boolean {
  const byId = new Map(classCatalog.map((c) => [c.id, c]));
  for (const entry of character.classes) {
    const def = byId.get(entry.classId);
    if (def?.spellcasting?.progression === 'pact') return true;
  }
  return false;
}

/** Liste des classes du personnage qui sont effectivement lanceuses de sorts. */
export interface SpellcastingClassEntry {
  classId: string;
  level: number;
  ability: 'int' | 'sag' | 'cha';
  progression: 'full' | 'half' | 'third' | 'pact';
  /** Nom localisé tel qu'exposé par classes.json — laissé en string pour découpler. */
  name: string;
}

export function spellcastingClasses(
  character: Character,
  classCatalog: readonly ClassEntity[],
  localize: (i18n: { fr: string; en?: string }) => string,
): SpellcastingClassEntry[] {
  const byId = new Map(classCatalog.map((c) => [c.id, c]));
  const out: SpellcastingClassEntry[] = [];
  for (const entry of character.classes) {
    const def = byId.get(entry.classId);
    if (!def || !def.spellcasting) continue;
    const ability = character.spellcastingAbility[entry.classId] ?? def.spellcasting.ability;
    if (!ability) continue;
    out.push({
      classId: entry.classId,
      level: entry.level,
      ability,
      progression: def.spellcasting.progression,
      name: localize(def.name),
    });
  }
  return out;
}
