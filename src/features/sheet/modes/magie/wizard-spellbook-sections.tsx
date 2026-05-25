import { useMemo } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { SpellDamageChip } from './spell-damage-chip';

interface WizardSpellbookSectionsProps {
  character: Character;
  /** Catalogue de sorts (typiquement `useContent('spells').data`). */
  spells: readonly Spell[];
  onSpellSelect: (spell: Spell) => void;
}

/**
 * Sections « Sorts préparés » et « Grimoire » pour le Magicien (plan 13.9
 * commit 4c — décision Adrien UAT 4b).
 *
 * Pourquoi un composant dédié au lieu d'étendre <SpellList> :
 * - L'UX cible est DEUX cartes visuellement distinctes, pas un filtre dans
 *   la même carte. Le grimoire n'est pas un sous-état des préparés ; les
 *   inscrits-non-préparés sont juste « lisibles le matin » mais inutilisables
 *   aujourd'hui (règle 5e). C'est sémantiquement deux listes, pas une.
 * - <SpellList> embarque une barre de recherche + des filtres chip. À L1
 *   avec 6 sorts c'est du bruit ; ces sections vont au plus simple.
 * - Aux niveaux supérieurs (S2+), on pourra ajouter une recherche au niveau
 *   du composant parent qui filtre les deux sections en parallèle.
 *
 * Cohabitation avec <SpellList> : ce composant est utilisé EN PLUS de la
 * SpellList dans MagieMode (pas à la place), pour un Magicien mono-class L1.
 * Tap sur un sort propage `onSpellSelect` comme `SpellList` — la modale
 * détail (gérée par MagieMode) s'ouvre identiquement.
 *
 * Catégorie 6 (intersections) : `Préparés ⊂ Grimoire`. Un sort dans
 * `preparedSpells.wizard` apparaît UNIQUEMENT dans la section Préparés. Un
 * sort dans `knownSpells.wizard \ preparedSpells.wizard` apparaît UNIQUEMENT
 * dans la section Grimoire. Aucun sort hors `knownSpells.wizard` n'apparaît
 * dans une des deux sections.
 */
export function WizardSpellbookSections({
  character,
  spells,
  onSpellSelect,
}: WizardSpellbookSectionsProps): JSX.Element | null {
  const { prepared, grimoireOnly } = useMemo(() => {
    const knownIds = new Set(character.knownSpells.wizard ?? []);
    const preparedIds = new Set(character.preparedSpells.wizard ?? []);
    const byId = new Map<string, Spell>();
    for (const s of spells) byId.set(s.id, s);

    const preparedList: Spell[] = [];
    const grimoireList: Spell[] = [];
    // Tri stable : on suit l'ordre des knownIds, puis on regroupe par niveau
    // ASC, puis par name.fr ASC à l'intérieur de chaque niveau.
    for (const id of knownIds) {
      const spell = byId.get(id);
      if (!spell) continue;
      if (preparedIds.has(id)) preparedList.push(spell);
      else grimoireList.push(spell);
    }
    const sortFn = (a: Spell, b: Spell): number => {
      if (a.level !== b.level) return a.level - b.level;
      return localize(a.name).localeCompare(localize(b.name), 'fr');
    };
    preparedList.sort(sortFn);
    grimoireList.sort(sortFn);
    return { prepared: preparedList, grimoireOnly: grimoireList };
  }, [character.knownSpells.wizard, character.preparedSpells.wizard, spells]);

  // Si le perso n'est pas un Magicien (knownSpells.wizard absent ou vide), on
  // ne rend rien : MagieMode bascule sur la SpellList générique.
  if (prepared.length === 0 && grimoireOnly.length === 0) return null;

  return (
    <>
      <section role="region" aria-label={`Sorts préparés · ${prepared.length}`}>
        <Card>
          <CardHeader>
            <h3>Sorts préparés · {prepared.length}</h3>
          </CardHeader>
          <SpellRows spells={prepared} prepared onSpellSelect={onSpellSelect} />
        </Card>
      </section>
      <section role="region" aria-label={`Grimoire · ${grimoireOnly.length}`}>
        <Card>
          <CardHeader>
            <h3>Grimoire · {grimoireOnly.length}</h3>
          </CardHeader>
          {grimoireOnly.length === 0 ? (
            <p className="font-serif text-body-sm italic text-text-tertiary">
              Tous vos sorts inscrits sont préparés aujourd'hui.
            </p>
          ) : (
            <SpellRows
              spells={grimoireOnly}
              prepared={false}
              onSpellSelect={onSpellSelect}
            />
          )}
        </Card>
      </section>
    </>
  );
}

interface SpellRowsProps {
  spells: readonly Spell[];
  prepared: boolean;
  onSpellSelect: (spell: Spell) => void;
}

function SpellRows({ spells, prepared, onSpellSelect }: SpellRowsProps): JSX.Element {
  return (
    <ul className="flex flex-col gap-2">
      {spells.map((spell) => (
        <li key={spell.id}>
          <button
            type="button"
            onClick={() => onSpellSelect(spell)}
            className={cn(
              'flex w-full items-center gap-3 rounded-card-sm border px-4 py-3 text-left transition-all duration-200 ease-base',
              'hover:-translate-y-px hover:border-soft active:scale-[0.99]',
              prepared
                ? 'border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.08] to-gold/[0.02]'
                : 'border-white-8 bg-white/[0.025] opacity-80',
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center border font-display text-[14px] font-black',
                prepared
                  ? 'border-gold-dim bg-gradient-to-br from-gold-bright/25 to-gold/5 text-gold-bright'
                  : 'border-amethyst/30 bg-amethyst/10 text-amethyst',
              )}
              style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
              aria-hidden="true"
            >
              {spell.level === 0 ? '·' : spell.level}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-serif text-body text-text">
                {localize(spell.name)}
              </div>
              <div className="flex flex-wrap items-center gap-2 font-ui text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                <span>{t(`school.${spell.school}`)}</span>
                {spell.concentration && (
                  <span className="rounded-full border border-amethyst/40 px-1.5 py-0.5 text-[8px] text-amethyst">
                    Concentr.
                  </span>
                )}
                {spell.ritual && (
                  <span className="rounded-full border border-teal/40 px-1.5 py-0.5 text-[8px] text-teal">
                    Rituel
                  </span>
                )}
                <SpellDamageChip spell={spell} />
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
