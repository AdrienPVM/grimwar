import { create } from 'zustand';

import { polyhedronFor } from '../dice3d/polyhedra';
import type { DiceTerm, RollResult } from '../dice/types';

/**
 * Plateau de dés 3D — état éphémère du jet en cours d'affichage.
 *
 * Séparé du toast à dessein. Le toast dit le RÉSULTAT (« 18 ») ; le plateau
 * montre le GESTE (les dés qui roulent et se posent). Les deux ont des durées
 * de vie différentes : les dés s'effacent quand ils ont fini de tomber, le
 * toast reste le temps qu'on le lise.
 *
 * Le plateau ne s'ouvre QUE sur un jet numérique. En mode physique, les vrais
 * dés sont sur la table — leur mimer une chute à l'écran serait une redite
 * absurde, et l'écran sert alors à saisir les faces, pas à les montrer.
 */

export interface TrayDie {
  /** Stable dans la durée de vie du jet — sert de clé React. */
  readonly id: string;
  readonly sides: number;
  /** Face obtenue, telle que le moteur l'a tirée. */
  readonly face: number;
  /**
   * `false` pour un dé écarté par un `kh`/`kl` — le dé d'avantage qu'on ne
   * garde pas. Il roule quand même : voir tomber le 3 qu'on vient d'éviter
   * fait partie du plaisir.
   */
  readonly kept: boolean;
}

export interface TrayRoll {
  readonly id: number;
  readonly dice: readonly TrayDie[];
  readonly crit: boolean;
  readonly fumble: boolean;
}

interface DiceTrayState {
  readonly current: TrayRoll | null;
  presentRoll: (roll: TrayRoll) => void;
  clearRoll: (id: number) => void;
}

export const useDiceTrayStore = create<DiceTrayState>()((set, get) => ({
  current: null,
  presentRoll: (roll) => set({ current: roll }),
  // On ne vide que si le jet affiché est bien celui qu'on cherche à retirer :
  // deux jets rapprochés se remplacent, et le minuteur du premier ne doit pas
  // effacer le second sous les yeux du joueur.
  clearRoll: (id) => {
    if (get().current?.id === id) set({ current: null });
  },
}));

/** Indices des dés retenus d'un terme, en respectant `kh` / `kl`. */
function keptIndices(faces: readonly number[], term: DiceTerm): Set<number> {
  const keep = term.kh ?? term.kl;
  if (keep === undefined) {
    return new Set(faces.map((_, i) => i));
  }
  const order = faces
    .map((face, index) => ({ face, index }))
    .sort((a, b) => (term.kh !== undefined ? b.face - a.face : a.face - b.face));
  return new Set(order.slice(0, keep).map((e) => e.index));
}

/**
 * Traduit un résultat de jet en dés à faire tomber.
 *
 * Renvoie `null` quand il n'y a rien à montrer : jet physique, ou formule
 * n'employant que des dés dont on n'a pas la forme (d100, d3 maison). Mieux
 * vaut pas de plateau qu'un plateau qui ment sur la forme des dés.
 */
export function trayRollFromResult(result: RollResult): TrayRoll | null {
  if (result.mode !== 'digital') return null;

  const dice: TrayDie[] = [];
  let cursor = 0;
  for (const [termIndex, term] of result.dice.entries()) {
    const faces = result.rawFaces.slice(cursor, cursor + term.count);
    cursor += term.count;
    if (polyhedronFor(term.sides) === null) continue;
    const kept = keptIndices(faces, term);
    faces.forEach((face, i) => {
      dice.push({
        id: `${termIndex}-${i}`,
        sides: term.sides,
        face,
        kept: kept.has(i),
      });
    });
  }

  if (dice.length === 0) return null;
  return {
    id: result.timestamp,
    dice,
    crit: result.crit,
    fumble: result.fumble,
  };
}

/** Point d'entrée unique du moteur de dés vers le plateau. */
export function presentRollOnTray(result: RollResult): void {
  const roll = trayRollFromResult(result);
  if (roll) useDiceTrayStore.getState().presentRoll(roll);
}
