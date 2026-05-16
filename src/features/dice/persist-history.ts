import { db, type DiceHistoryRow } from '@/shared/lib/dexie-db';
import type { RollResult } from '@/shared/lib/dice/types';

const HISTORY_LIMIT = 200;

/**
 * Persiste un `RollResult` dans Dexie (`diceHistory`) et auto-prune à 200 rows.
 * Best-effort : un échec Dexie (IndexedDB indisponible, quota…) NE doit PAS
 * casser le flow de jeu. On `console.warn` et on continue.
 *
 * `id` est un UUID v4 généré côté client. Le champ legacy `rolls` est aliasé à
 * `rawFaces` pour cohérence avec les lecteurs antérieurs.
 */
export async function persistRollHistory(result: RollResult): Promise<void> {
  const row: DiceHistoryRow = {
    id: crypto.randomUUID(),
    characterId: result.characterId,
    label: result.label,
    total: result.total,
    rolls: result.rawFaces,
    rawFaces: result.rawFaces,
    keptFaces: result.keptFaces,
    mode: result.mode,
    crit: result.crit,
    fumble: result.fumble,
    kind: result.kind,
    timestamp: result.timestamp,
  };
  try {
    await db.diceHistory.add(row);
    const count = await db.diceHistory.count();
    if (count > HISTORY_LIMIT) {
      const excess = count - HISTORY_LIMIT;
      const oldest = await db.diceHistory.orderBy('timestamp').limit(excess).toArray();
      await db.diceHistory.bulkDelete(oldest.map((r) => r.id));
    }
  } catch (err) {
    console.warn('[dice/persist] échec d\'écriture de l\'historique', err);
  }
}

/** Lit les N derniers jets (ordre antichrono). Filtre par `characterId` optionnel. */
export async function readRollHistory(
  limit: number,
  characterId?: string,
): Promise<DiceHistoryRow[]> {
  try {
    const query = characterId
      ? db.diceHistory.where('characterId').equals(characterId)
      : db.diceHistory.toCollection();
    const rows = await query.reverse().sortBy('timestamp');
    return rows.slice(0, limit);
  } catch (err) {
    console.warn('[dice/persist] échec de lecture de l\'historique', err);
    return [];
  }
}
