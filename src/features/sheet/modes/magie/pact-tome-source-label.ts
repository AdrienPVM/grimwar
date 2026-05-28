import { t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

/**
 * Résolveur des sorts grantés par l'invocation `pact-of-the-tome`
 * (D13e-followup-grant-display). Lit `classes[i].pactTomeCantrips` (3 sorts
 * mineurs) + `classes[i].pactTomeRituals` (2 sorts du 1ᵉʳ niveau marqués
 * Rituel) sur toute classe Warlock du perso. Per SRD FR 5.2.1 page 142 :
 *
 *   Tant que le grimoire est sur vous, les sorts choisis sont préparés et
 *   fonctionnent pour vous comme des sorts d'Occultiste.
 *
 * Le label est unique pour les 5 sorts du Pacte (« Pacte du grimoire ») :
 * c'est le nom de l'invocation, cohérent avec le chooser wizard.
 */

export interface PactTomeSpellEntry {
  spell: Spell;
  sourceLabel: string;
}

export function resolvePactTomeSpellEntries(
  character: Character,
  allSpells: readonly Spell[],
): PactTomeSpellEntry[] {
  const spellById = new Map(allSpells.map((s) => [s.id, s]));
  const out: PactTomeSpellEntry[] = [];
  const seen = new Set<string>();
  const label = t('sheet.magie.pactTome.sourceLabel');

  for (const entry of character.classes) {
    const cantrips = entry.pactTomeCantrips ?? [];
    const rituals = entry.pactTomeRituals ?? [];
    for (const id of [...cantrips, ...rituals]) {
      if (seen.has(id)) continue;
      const spell = spellById.get(id);
      if (!spell) continue;
      seen.add(id);
      out.push({ spell, sourceLabel: label });
    }
  }

  return out;
}

/**
 * Map `spellId → sourceLabel` dérivée des entries — consommée par `SpellList`
 * (chip par ligne) et la modale détail (source du sort actif). Symétrique du
 * `buildAncestrySourceLabelMap` de `./ancestry-source-label`.
 */
export function buildPactTomeSourceLabelMap(
  entries: readonly PactTomeSpellEntry[],
): Map<string, string> {
  return new Map(entries.map((e) => [e.spell.id, e.sourceLabel]));
}
