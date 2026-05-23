import { useMemo, useState } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { Chip } from '@/shared/components/chip';
import { Icon } from '@/shared/components/icon';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

interface SpellListProps {
  character: Character;
  spells: readonly Spell[];
  /** IDs des classes lanceuses du perso, utilisé pour résoudre "préparé". */
  spellcasterClassIds: readonly string[];
  /**
   * Label de source PAR sortId, pré-calculé par le parent
   * (`buildAncestrySourceLabelMap`). Un sort absent de la map ne vient pas de
   * l'ascendance. Map par-sort (et non label global) pour que thaumaturgie
   * (trait commun) ne porte plus le label « Héritage X » du sous-choix.
   */
  ancestrySourceLabels: ReadonlyMap<string, string>;
  onSpellSelect: (spell: Spell) => void;
}

type FilterKey = 'all' | 'prep' | 'cantrip' | 'ritual';

/**
 * Source du sort dans la liste générale. Un sort peut cumuler des classes
 * lanceuses ET l'ascendance — la collision rend UNE seule entrée avec les
 * deux sources (plan 13.8b commit 1).
 */
interface SpellSource {
  /** Noms localisés des classes lanceuses qui connaissent le sort. */
  classNames: string[];
  /** `true` si le sort vient aussi de `knownSpells.ancestry`. */
  fromAncestry: boolean;
}

/**
 * Liste des sorts connus du personnage groupée par niveau. Recherche, filtres,
 * et tap → ouvre le détail (modal géré par le parent).
 *
 * Plan 09 step 6-9 — un sort est "connu" s'il apparaît dans `knownSpells[classId]`
 * ou `preparedSpells[classId]` (les casters known-list n'ont rien dans prepared
 * mais tout dans known ; les préparateurs ont l'inverse). Un sort est visuel-
 * lement "préparé" si présent dans `preparedSpells` OU si c'est un cantrip
 * (les cantrips sont toujours actifs une fois connus).
 *
 * Plan 13.8b — étendu à `knownSpells.ancestry`. Sources visibles via des
 * chips distincts (ascendance améthyste vs classe doré). Collision : une
 * entrée unique avec les deux chips.
 */
export function SpellList({
  character,
  spells,
  spellcasterClassIds,
  ancestrySourceLabels,
  onSpellSelect,
}: SpellListProps): JSX.Element {
  const { data: classCatalog } = useContent('classes');
  const [query, setQuery] = useState<string>('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of classCatalog) map.set(c.id, localize(c.name));
    return map;
  }, [classCatalog]);

  const { knownSet, preparedSet, sourceMap } = useMemo(() => {
    const known = new Set<string>();
    const prepared = new Set<string>();
    const sources = new Map<string, SpellSource>();

    function ensure(spellId: string): SpellSource {
      let src = sources.get(spellId);
      if (!src) {
        src = { classNames: [], fromAncestry: false };
        sources.set(spellId, src);
      }
      return src;
    }

    for (const classId of spellcasterClassIds) {
      const className = classNameById.get(classId) ?? classId;
      for (const id of character.knownSpells[classId] ?? []) {
        known.add(id);
        const src = ensure(id);
        if (!src.classNames.includes(className)) src.classNames.push(className);
      }
      for (const id of character.preparedSpells[classId] ?? []) {
        known.add(id);
        prepared.add(id);
        const src = ensure(id);
        if (!src.classNames.includes(className)) src.classNames.push(className);
      }
    }

    for (const id of character.knownSpells.ancestry ?? []) {
      known.add(id);
      ensure(id).fromAncestry = true;
    }

    return { knownSet: known, preparedSet: prepared, sourceMap: sources };
  }, [
    character.knownSpells,
    character.preparedSpells,
    spellcasterClassIds,
    classNameById,
  ]);

  const knownSpells = useMemo(
    () => spells.filter((s) => knownSet.has(s.id)),
    [spells, knownSet],
  );

  const hasClassCaster = spellcasterClassIds.length > 0;

  const counts = useMemo(() => {
    let prepCount = 0;
    let cantripCount = 0;
    let ritualCount = 0;
    for (const s of knownSpells) {
      if (s.level === 0) cantripCount += 1;
      if (preparedSet.has(s.id) || s.level === 0) prepCount += 1;
      if (s.ritual) ritualCount += 1;
    }
    return { all: knownSpells.length, prep: prepCount, cantrip: cantripCount, ritual: ritualCount };
  }, [knownSpells, preparedSet]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('fr');
    return knownSpells.filter((s) => {
      if (filter === 'prep' && !preparedSet.has(s.id) && s.level !== 0) return false;
      if (filter === 'cantrip' && s.level !== 0) return false;
      if (filter === 'ritual' && !s.ritual) return false;
      if (q && !localize(s.name).toLocaleLowerCase('fr').includes(q)) return false;
      return true;
    });
  }, [knownSpells, filter, query, preparedSet]);

  const grouped = useMemo(() => groupByLevel(filtered), [filtered]);

  return (
    <Card>
      <CardHeader>
        <h3>GrimWar</h3>
      </CardHeader>

      <label className="mb-3 flex items-center gap-2 rounded-card-sm border border-white-8 bg-bg-2/60 px-3 py-2">
        <Icon name="i-search" className="h-4 w-4 text-text-tertiary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un sort…"
          className="w-full bg-transparent font-serif text-body text-text placeholder:text-text-faint focus:outline-none"
          aria-label="Rechercher un sort"
        />
      </label>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        <Chip active={filter === 'all'} onToggle={() => setFilter('all')}>
          Tous · {counts.all}
        </Chip>
        {hasClassCaster && (
          <Chip active={filter === 'prep'} onToggle={() => setFilter('prep')}>
            Préparés · {counts.prep}
          </Chip>
        )}
        <Chip active={filter === 'cantrip'} onToggle={() => setFilter('cantrip')}>
          Tours · {counts.cantrip}
        </Chip>
        <Chip active={filter === 'ritual'} onToggle={() => setFilter('ritual')}>
          Rituels · {counts.ritual}
        </Chip>
      </div>

      <div className="flex flex-col gap-3">
        {grouped.map(([level, items]) => (
          <section key={level}>
            <h4 className="mb-1 font-title text-[10px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
              {level === 0 ? 'Sorts mineurs' : `Niveau ${level}`}
            </h4>
            <ul className="flex flex-col gap-2">
              {items.map((spell) => {
                const src = sourceMap.get(spell.id) ?? { classNames: [], fromAncestry: false };
                // « Visuel préparé » réservé aux sources de classe (cantrip
                // d'ascendance seul → variante améthyste plus sobre, pas le
                // doré des sorts préparés).
                const preparedVisual =
                  preparedSet.has(spell.id) ||
                  (spell.level === 0 && src.classNames.length > 0);
                return (
                  <li key={spell.id}>
                    <SpellRow
                      spell={spell}
                      prepared={preparedVisual}
                      sourceClassNames={src.classNames}
                      ancestrySourceLabel={
                        src.fromAncestry ? ancestrySourceLabels.get(spell.id) ?? null : null
                      }
                      onClick={() => onSpellSelect(spell)}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {grouped.length === 0 && (
          <p className="font-serif text-body-sm italic text-text-tertiary">
            Aucun sort ne correspond à ces filtres.
          </p>
        )}
      </div>
    </Card>
  );
}

interface SpellRowProps {
  spell: Spell;
  prepared: boolean;
  /** Classes lanceuses qui connaissent ce sort (chip doré). */
  sourceClassNames: readonly string[];
  /** Label ascendance — `null` si le sort ne vient pas de `knownSpells.ancestry`. */
  ancestrySourceLabel: string | null;
  onClick: () => void;
}

function SpellRow({
  spell,
  prepared,
  sourceClassNames,
  ancestrySourceLabel,
  onClick,
}: SpellRowProps): JSX.Element {
  const schoolLabel = t(`school.${spell.school}`);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-card-sm border px-4 py-3 text-left transition-all',
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
        <div className="truncate font-serif text-body text-text">{localize(spell.name)}</div>
        <div className="flex flex-wrap items-center gap-2 font-ui text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
          <span>{schoolLabel}</span>
          <ComponentChips components={spell.components} />
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
          {sourceClassNames.map((name) => (
            <span
              key={`class-${name}`}
              className="rounded-full border border-gold-dim/40 bg-gold/[0.08] px-1.5 py-0.5 text-[8px] text-gold-bright"
            >
              {name}
            </span>
          ))}
          {ancestrySourceLabel ? (
            <span className="rounded-full border border-amethyst/40 bg-amethyst/10 px-1.5 py-0.5 text-[8px] text-amethyst">
              {ancestrySourceLabel}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ComponentChips({
  components,
}: {
  components: Spell['components'];
}): JSX.Element {
  const parts: string[] = [];
  if (components.v) parts.push('V');
  if (components.s) parts.push('S');
  if (components.m) parts.push('M');
  return <span className="text-text-secondary">{parts.join(' · ')}</span>;
}

function groupByLevel(spells: readonly Spell[]): Array<[number, Spell[]]> {
  const map = new Map<number, Spell[]>();
  for (const s of spells) {
    const arr = map.get(s.level) ?? [];
    arr.push(s);
    map.set(s.level, arr);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => localize(a.name).localeCompare(localize(b.name), 'fr'));
  }
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
}

