/**
 * Sorts — table d'alias d'IDs « PHB 2014 (AideDD) » → « SRD 5.2.1 (2024) ».
 *
 * ⚠️ DONNÉES DÉPLACÉES (plan 13.10 commit 4) — la source de vérité canonique
 * vit désormais dans `src/shared/lib/rules/spell-aliases.ts`, parce que ces
 * alias sont consommés au RUNTIME (migration des `knownSpells[]` /
 * `preparedSpells[]` à la lecture d'une fiche). Ce fichier n'est plus qu'un
 * ré-export pour la réconciliation d'audit côté scripts (sens scripts → src,
 * déjà établi par `build-public-content.ts` qui importe `src/shared/types`).
 *
 * Usages :
 *  (a) Migration des persos — `src/shared/lib/rules/spell-aliases.ts >
 *      migrateSpellIds` (runtime, appelé par `use-character.ts`).
 *  (b) Réconciliation d'audit — `scripts/__tests__/spell-audit-reconciliation.test.ts`
 *      importe ces tables via ce ré-export.
 */
export type { SpellRename } from '../../src/shared/lib/rules/spell-aliases.js';
export {
  SPELL_RENAMES_2014_TO_2024,
  SPELL_REMOVALS_NON_SRD,
} from '../../src/shared/lib/rules/spell-aliases.js';
