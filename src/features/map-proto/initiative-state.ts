/**
 * Initiative tracker — pure functions (CHANTIER H nuit 3).
 *
 * Modèle minimal d'ordre d'initiative pour le prototype : chaque entrée
 * a un id (token id ou libellé manuel), un nom affichable, une valeur
 * d'initiative (jet d20 + Dex), et des PV courants/max éditables. La
 * liste est triée décroissant par initiative — ties cassés par ordre
 * d'ajout (stable). Un curseur de tour pointe l'entrée active.
 *
 * Pas de persistance — le tracker meurt avec la session prototype. La
 * persistance Firestore viendra plus tard.
 */

export interface InitiativeEntry {
  readonly id: string;
  readonly name: string;
  readonly initiative: number;
  readonly hp: number;
  readonly hpMax: number;
}

export interface Initiative {
  readonly entries: readonly InitiativeEntry[];
  /**
   * Index dans `entries` de l'entrée active. `null` quand la liste est
   * vide ou que le combat n'a pas commencé.
   */
  readonly turnIndex: number | null;
}

export const EMPTY_INITIATIVE: Initiative = { entries: [], turnIndex: null };

/**
 * Compare 2 entrées pour le tri : initiative décroissante. En cas
 * d'égalité, on garde l'ordre d'insertion (`Array.sort` est stable
 * depuis ES2019).
 */
function compareEntries(a: InitiativeEntry, b: InitiativeEntry): number {
  return b.initiative - a.initiative;
}

export function addEntry(
  init: Initiative,
  entry: InitiativeEntry,
): Initiative {
  // Idempotent par id : si l'entrée existe déjà, on la met à jour.
  const without = init.entries.filter((e) => e.id !== entry.id);
  const next = [...without, entry].sort(compareEntries);
  return { ...init, entries: next };
}

export function removeEntry(init: Initiative, id: string): Initiative {
  const idx = init.entries.findIndex((e) => e.id === id);
  if (idx === -1) return init;
  const next = init.entries.filter((e) => e.id !== id);
  let turnIndex = init.turnIndex;
  if (turnIndex !== null) {
    if (next.length === 0) turnIndex = null;
    else if (idx < turnIndex) turnIndex -= 1;
    else if (idx === turnIndex && turnIndex >= next.length) turnIndex = 0;
  }
  return { entries: next, turnIndex };
}

export function updateHp(init: Initiative, id: string, hp: number): Initiative {
  return {
    ...init,
    entries: init.entries.map((e) =>
      e.id === id ? { ...e, hp: Math.max(0, Math.min(e.hpMax, hp)) } : e,
    ),
  };
}

/**
 * Avance au tour suivant. Si turnIndex est null et la liste non-vide,
 * démarre au premier (entrée la plus haute en initiative).
 */
export function nextTurn(init: Initiative): Initiative {
  if (init.entries.length === 0) return init;
  if (init.turnIndex === null) {
    return { ...init, turnIndex: 0 };
  }
  return {
    ...init,
    turnIndex: (init.turnIndex + 1) % init.entries.length,
  };
}

/** Reset complet — clear list + turn. */
export function clearInitiative(_init: Initiative): Initiative {
  return EMPTY_INITIATIVE;
}
