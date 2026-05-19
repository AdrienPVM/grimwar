import { useMemo } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t, type StringKey } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';
import type { Ancestry, Spell } from '@/shared/types/content';

interface AncestrySpellsCardProps {
  character: Character;
  /** Ouvre la modale détail (plan 13.8b — sort consultable d'un tap). */
  onSpellSelect: (spell: Spell) => void;
}

interface AncestrySpellEntry {
  spell: Spell;
  /** Niveau de personnage à partir duquel ce sort est déblocable. */
  unlockedAt: number;
  /** Label de la source dans la fiche. */
  sourceLabel: string;
}

/**
 * Carte « Sorts d'ascendance » dans le mode Magie (plan 13.8 step 30-31).
 *
 * Affiche les sorts inscrits dans `knownSpells.ancestry` (cantrip L1 +
 * sorts L3/L5 pour Tieffelin/Elfe — uniquement cantrips pour Gnome). Les
 * sorts dont le niveau d'unlock dépasse le `totalLevel` du perso restent
 * cliquables (consultables) mais sont visuellement grisés avec un badge
 * « Niv. N » — décision Adrien 13.8b : consultable même quand pas encore
 * lançable.
 *
 * La caractéristique d'incantation utilisée est lue dans
 * `spellcastingAbility.ancestry` posée au submit (sous-choix wizard).
 */
export function AncestrySpellsCard({
  character,
  onSpellSelect,
}: AncestrySpellsCardProps): JSX.Element | null {
  const { data: spells } = useContent('spells');
  const { data: ancestries } = useContent('ancestries');

  const ability = character.spellcastingAbility.ancestry ?? null;

  const entries = useMemo<AncestrySpellEntry[]>(() => {
    const ids = character.knownSpells.ancestry ?? [];
    if (ids.length === 0) return [];
    const ancestry = ancestries.find((a) => a.id === character.ancestryId);
    if (!ancestry) return [];
    return resolveAncestrySpellEntries(character, ancestry, spells);
  }, [ancestries, character, spells]);

  if (entries.length === 0) return null;

  const sourceTitleKey = sourceTitleKeyFor(character.ancestryId);

  return (
    <Card>
      <CardHeader>
        <h3>{t(sourceTitleKey)}</h3>
      </CardHeader>
      {ability ? (
        <p className="mb-3 font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
          Caract. d'incantation · {t(`ability.${ability}` as StringKey)}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => {
          const locked = character.totalLevel < entry.unlockedAt;
          const spellName = localize(entry.spell.name);
          return (
            <li key={entry.spell.id}>
              <button
                type="button"
                aria-label={spellName}
                onClick={() => onSpellSelect(entry.spell)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card-sm border px-3 py-2 text-left',
                  'transition-all duration-150 ease-base',
                  'hover:-translate-y-px hover:border-soft active:scale-[0.99]',
                  locked
                    ? 'border-white-8 bg-white/[0.02] opacity-60'
                    : 'border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.08] to-gold/[0.02]',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center font-display text-[13px]',
                    locked ? 'text-text-tertiary' : 'text-gold-bright',
                  )}
                  style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                >
                  {entry.spell.level === 0 ? '·' : entry.spell.level}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-serif text-body text-text">
                    {spellName}
                  </div>
                  <div className="font-ui text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                    {entry.sourceLabel}
                  </div>
                </div>
                {locked ? (
                  <span className="rounded-full border border-soft px-2 py-0.5 font-title text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                    Niv. {entry.unlockedAt}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function sourceTitleKeyFor(ancestryId: Character['ancestryId']): StringKey {
  switch (ancestryId) {
    case 'tiefling':
      return 'sheet.magie.ancestry.tieflingTitle';
    case 'elf':
      return 'sheet.magie.ancestry.elfTitle';
    case 'gnome':
      return 'sheet.magie.ancestry.gnomeTitle';
    default:
      return 'sheet.magie.ancestry.genericTitle';
  }
}

/**
 * Résout chaque sortId d'ascendance en `{ spell, unlockedAt, sourceLabel }`.
 *
 * Pour Tieffelin et Elfe : ordre canonique (cantrip = L1, level3 = L3,
 * level5 = L5). Pour Gnome : tous les cantrips sont L1.
 */
function resolveAncestrySpellEntries(
  character: Character,
  ancestry: Ancestry,
  allSpells: readonly Spell[],
): AncestrySpellEntry[] {
  const sc = character.ancestrySubChoices;
  const spellById = new Map(allSpells.map((s) => [s.id, s]));
  const out: AncestrySpellEntry[] = [];

  if (ancestry.id === 'tiefling' && sc.tieflingLegacy) {
    const legacy = ancestry.options.tieflingLegacies?.find(
      (o) => o.id === sc.tieflingLegacy,
    );
    if (!legacy) return [];
    const label = `Héritage ${localize(legacy.name)}`;
    pushIfSpell(out, spellById.get(legacy.cantripSpellId), 1, label);
    pushIfSpell(out, spellById.get(legacy.level3SpellId), 3, label);
    pushIfSpell(out, spellById.get(legacy.level5SpellId), 5, label);
  } else if (ancestry.id === 'elf' && sc.elfLineage) {
    const lineage = ancestry.options.elfLineages?.find((o) => o.id === sc.elfLineage);
    if (!lineage) return [];
    const label = `Lignage ${localize(lineage.name)}`;
    pushIfSpell(out, spellById.get(lineage.cantripSpellId), 1, label);
    pushIfSpell(out, spellById.get(lineage.level3SpellId), 3, label);
    pushIfSpell(out, spellById.get(lineage.level5SpellId), 5, label);
  } else if (ancestry.id === 'gnome' && sc.gnomeLineage) {
    const lineage = ancestry.options.gnomeLineages?.find(
      (o) => o.id === sc.gnomeLineage,
    );
    if (!lineage) return [];
    const label = `Lignage ${localize(lineage.name)}`;
    for (const id of lineage.cantripSpellIds) {
      pushIfSpell(out, spellById.get(id), 1, label);
    }
  }

  return out;
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
