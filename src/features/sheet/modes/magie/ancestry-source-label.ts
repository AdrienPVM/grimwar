import { localize, t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';
import type { Ancestry, Spell } from '@/shared/types/content';

/**
 * Résolveur CANONIQUE des sorts d'ascendance — source de vérité unique partagée
 * entre `AncestrySpellsCard` (carte du mode Magie) et `SpellList` (chip de source
 * dans la liste générale). Avant le plan 13.14b chaque chemin reconstruisait sa
 * propre vue : la carte ratait les sorts de trait (D18) et la liste collait UN
 * label par ascendance, ce qui mislabelait thaumaturgie en « Héritage X ».
 *
 * Trois familles de sources, label PAR SORT :
 *  - `ancestry.commonSpellIds` → trait COMMUN à toute l'ascendance, indépendant
 *    du sous-choix. Tieffelin « Présence d'outre-monde » → thaumaturgie. Label =
 *    le nom du trait commun (pas « Héritage X »).
 *  - triplet d'héritage / lignage (cantrip L1 + sorts L3/L5) → label
 *    « Héritage X » (Tieffelin) / « Lignage X » (Elfe).
 *  - lignage Gnome : cantrips (`cantripSpellIds`) + sorts de trait spécifiques
 *    au lignage (`spellIds`, ex. Gnome des forêts → communication-avec-les-animaux)
 *    → MÊME label « Lignage X » (même source, un seul chip).
 */

export interface AncestrySpellEntry {
  spell: Spell;
  /** Niveau de personnage à partir duquel ce sort est déblocable. */
  unlockedAt: number;
  /** Label de la source dans la fiche, propre à CE sort. */
  sourceLabel: string;
}

export function resolveAncestrySpellEntries(
  character: Character,
  ancestry: Ancestry,
  allSpells: readonly Spell[],
): AncestrySpellEntry[] {
  const sc = character.ancestrySubChoices;
  const spellById = new Map(allSpells.map((s) => [s.id, s]));
  const out: AncestrySpellEntry[] = [];

  // 1. Sorts COMMUNS à l'ascendance — indépendants du sous-choix (plan 13.14b
  //    D18). unlockedAt = 1 (connu dès la création ; le *cast* à usage limité
  //    reste désactivé = D12).
  const commonLabel = commonSpellSourceLabel(ancestry);
  for (const id of ancestry.commonSpellIds ?? []) {
    pushIfSpell(out, spellById.get(id), 1, commonLabel);
  }

  // 2. Sorts liés au sous-choix (héritage / lignage). Pas d'early-return : on
  //    ne doit jamais écraser les sorts communs déjà poussés.
  if (ancestry.id === 'tiefling' && sc.tieflingLegacy) {
    const legacy = ancestry.options.tieflingLegacies?.find(
      (o) => o.id === sc.tieflingLegacy,
    );
    if (legacy) {
      const label = `Héritage ${localize(legacy.name)}`;
      pushIfSpell(out, spellById.get(legacy.cantripSpellId), 1, label);
      pushIfSpell(out, spellById.get(legacy.level3SpellId), 3, label);
      pushIfSpell(out, spellById.get(legacy.level5SpellId), 5, label);
    }
  } else if (ancestry.id === 'elf' && sc.elfLineage) {
    const lineage = ancestry.options.elfLineages?.find((o) => o.id === sc.elfLineage);
    if (lineage) {
      const label = `Lignage ${localize(lineage.name)}`;
      pushIfSpell(out, spellById.get(lineage.cantripSpellId), 1, label);
      pushIfSpell(out, spellById.get(lineage.level3SpellId), 3, label);
      pushIfSpell(out, spellById.get(lineage.level5SpellId), 5, label);
    }
  } else if (ancestry.id === 'gnome' && sc.gnomeLineage) {
    const lineage = ancestry.options.gnomeLineages?.find(
      (o) => o.id === sc.gnomeLineage,
    );
    if (lineage) {
      const label = `Lignage ${localize(lineage.name)}`;
      for (const id of lineage.cantripSpellIds) {
        pushIfSpell(out, spellById.get(id), 1, label);
      }
      // Sorts de trait spécifiques au lignage (forest only) — MÊME source que
      // les cantrips du lignage → même label, un seul chip cohérent.
      for (const id of lineage.spellIds ?? []) {
        pushIfSpell(out, spellById.get(id), 1, label);
      }
    }
  }

  return out;
}

/**
 * Map `spellId → sourceLabel` dérivée des entries — consommée par `SpellList`
 * (chip par ligne) et la modale détail (source du sort actif). Remplace l'ancien
 * label global par-ascendance qui mislabelait les sorts communs.
 */
export function buildAncestrySourceLabelMap(
  entries: readonly AncestrySpellEntry[],
): Map<string, string> {
  return new Map(entries.map((e) => [e.spell.id, e.sourceLabel]));
}

/**
 * Label de source pour les sorts COMMUNS à l'ascendance. Tieffelin = le trait
 * « Présence d'outre-monde » (nom officiel du bundle, via i18n). Pour toute
 * autre ascendance qui exposerait un jour `commonSpellIds`, on retombe sur le
 * nom localisé de l'ascendance (data-driven, zéro chaîne en dur).
 */
function commonSpellSourceLabel(ancestry: Ancestry): string {
  if (ancestry.id === 'tiefling') {
    return t('sheet.magie.ancestry.tieflingCommonSource');
  }
  return localize(ancestry.name);
}

function pushIfSpell(
  out: AncestrySpellEntry[],
  spell: Spell | undefined,
  unlockedAt: number,
  sourceLabel: string,
): void {
  if (!spell) return;
  out.push({ spell, unlockedAt, sourceLabel });
}
