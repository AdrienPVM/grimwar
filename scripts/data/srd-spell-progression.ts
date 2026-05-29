/**
 * scripts/data/srd-spell-progression.ts (JALON 2B.2c)
 *
 * Tables canoniques de progression Cantrips connus / Spells Known ou Prepared
 * du SRD CC 5.2.1 — pour les 8 classes incantatrices de base : Bard, Cleric,
 * Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard.
 *
 * Source : SRD 5.2.1, tables « <Class> Features » (Creative Commons).
 * Référencé via `content-sources/extracted/raw/SRD_CC_v5.2.1.txt` :
 *   - Bard Features         L3194  (colonnes : Cantrips | Prepared Spells | slots)
 *   - Cleric Features       L3625  (colonnes : Cantrips | Channel Divinity | Prepared | slots)
 *   - Druid Features        L4054  (colonnes : Wild Shape | Cantrips | Prepared | slots)
 *   - Paladin Features      L5136  (colonnes : Channel Divinity | Prepared | slots — pas de cantrips)
 *   - Ranger Features       L5584  (colonnes : Favored Enemy | Prepared | slots — pas de cantrips)
 *   - Sorcerer Features     L6193  (colonnes : Sorcery Points | Cantrips | Prepared | slots)
 *   - Warlock Features      L6760  (colonnes : EI | Cantrips | Prepared | Slots | Slot Level — Pact Magic)
 *   - Wizard Features       L7310  (colonnes : Cantrips | Prepared | slots)
 *
 * Décisions :
 *  - Encodage strict `number[20]` (index = level - 1). On n'utilise PAS les
 *    sentinelles `'ability-mod-plus-level'` / `'ability-mod-plus-half-level'`
 *    initialement envisagées dans `plans/2B-LEVELUP-INVENTORY.md §2.4` : le
 *    SRD CC 5.2.1 (PHB 2024) liste des compteurs fixes dans chaque table de
 *    classe. La formule WIS/INT/CHA mod + niveau n'apparaît plus comme règle
 *    générale dans les versions 2024 — chaque classe a sa colonne. Encoder
 *    les sentinelles serait porter du bruit pour un cas mort.
 *  - Paladin et Ranger n'ont PAS de cantrips (aucune colonne dans leur table
 *    SRD). On omet `cantripsKnown` au lieu d'écrire `[0,0,...,0]` — plus
 *    sémantique, et le schéma le supporte (`cantripsKnown?: number[20]`).
 *  - Warlock partage le même format de table que les full casters : colonne
 *    Prepared. Le distinguo Pact Magic vs Spellcasting est porté côté
 *    `classResourceProgression` (pact-magic-slots / pact-magic-slot-level,
 *    cf. JALON 2B.2b), pas ici.
 *  - Eldritch Knight (Fighter) et Arcane Trickster (Rogue) cantrips/prepared
 *    sont portés par les bundles `subclasses.json` — hors scope 2B.2c.
 */

export type SpellProgressionTable = {
  cantripsKnown?: readonly number[];
  spellsKnownOrPrepared: readonly number[];
};

const length20 = (label: string, arr: readonly number[]): readonly number[] => {
  if (arr.length !== 20) {
    throw new Error(
      `[srd-spell-progression] PARSE STRICT FAIL — ${label} doit avoir 20 entrées (L1..L20), trouvé ${arr.length}.`,
    );
  }
  return arr;
};

const make = (
  classId: string,
  spellsKnownOrPrepared: readonly number[],
  cantripsKnown?: readonly number[],
): SpellProgressionTable => {
  const out: SpellProgressionTable = {
    spellsKnownOrPrepared: length20(`${classId}.spellsKnownOrPrepared`, spellsKnownOrPrepared),
  };
  if (cantripsKnown !== undefined) {
    out.cantripsKnown = length20(`${classId}.cantripsKnown`, cantripsKnown);
  }
  return out;
};

export const SRD_SPELL_PROGRESSION: Record<string, SpellProgressionTable> = {
  // SRD L3194 — Bard. Colonnes Cantrips / Prepared Spells.
  bard: make(
    'bard',
    [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
    [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ),
  // SRD L3625 — Cleric. Colonnes Cantrips / Channel Divinity / Prepared.
  cleric: make(
    'cleric',
    [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
    [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  ),
  // SRD L4054 — Druid. Colonnes Wild Shape / Cantrips / Prepared.
  druid: make(
    'druid',
    [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
    [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ),
  // SRD L5136 — Paladin. Colonnes Channel Divinity / Prepared. Pas de cantrips.
  paladin: make(
    'paladin',
    [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
  ),
  // SRD L5584 — Ranger. Colonnes Favored Enemy / Prepared. Pas de cantrips.
  ranger: make(
    'ranger',
    [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
  ),
  // SRD L6193 — Sorcerer. Colonnes Sorcery Points / Cantrips / Prepared.
  sorcerer: make(
    'sorcerer',
    [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
    [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  ),
  // SRD L6760 — Warlock. Pact Magic — colonnes EI / Cantrips / Prepared / Slots / Slot Level.
  warlock: make(
    'warlock',
    [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
    [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  ),
  // SRD L7310 — Wizard. Colonnes Cantrips / Prepared. Prep diverge à L14+.
  wizard: make(
    'wizard',
    [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25],
    [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  ),
};

/**
 * Compteurs de complétude — exposés au test SRD pour figer la couverture
 * attendue (8 classes incantatrices SRD CC 5.2.1).
 */
export const SRD_SPELL_PROGRESSION_COUNTS = {
  totalClasses: Object.keys(SRD_SPELL_PROGRESSION).length,
  classesWithCantrips: Object.values(SRD_SPELL_PROGRESSION).filter(
    (p) => p.cantripsKnown !== undefined,
  ).length,
} as const;
