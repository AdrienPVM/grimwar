import type { RollResult } from './dice/types';

/**
 * Stub `event-logger` du plan 12 — no-op en S1 (pas de campagne, pas d'events).
 *
 * Plan 22 (event log infrastructure) remplacera l'implémentation par le vrai
 * `event-logger.ts` qui écrit dans `campaigns/{id}/events` avec le payload
 * `roll` / `attack` / `damage` portant `mode + rawFaces + total + crit + fumble`.
 *
 * Aujourd'hui : no-op. Aucun call site n'a à se soucier du mode (S1 = solo) —
 * le pivot `rollWithFlags` appelle systématiquement ce hook.
 */
export async function logRollIfCampaign(_result: RollResult): Promise<void> {
  // intentionally empty in S1 — plan 22 wires the real implementation.
}
