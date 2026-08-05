import { useMemo, useState, type JSX } from 'react';

import { Chip } from '@/shared/components/chip';
import { ScrollRow } from '@/shared/components/scroll-row';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { normalizeForSearch } from '@/shared/lib/search-normalize';
import type { Spell, SpellSchool } from '@/shared/types/content';

import {
  CodexEmpty,
  CodexLoading,
  CodexResultCount,
  CodexRow,
  CodexSearchField,
} from '../codex-ui';
import { SpellCodexModal } from './spell-codex-modal';

type LevelFilter = number | 'all';
type SchoolFilter = SpellSchool | 'all';

/**
 * Navigateur de sorts du Codex (plan 19) — le plus riche : recherche par nom +
 * filtre par niveau + filtre par école, liste groupée par niveau, losange de
 * niveau à gauche, tap → modale détail. Tout dérivé de `spells.json`.
 */
export function SpellBrowser(): JSX.Element {
  const { data: spells, loading } = useContent('spells');
  const { data: classCatalog } = useContent('classes');

  const [query, setQuery] = useState<string>('');
  const [level, setLevel] = useState<LevelFilter>('all');
  const [school, setSchool] = useState<SchoolFilter>('all');
  const [active, setActive] = useState<Spell | null>(null);

  const presentLevels = useMemo(() => {
    const set = new Set<number>();
    for (const s of spells) set.add(s.level);
    return Array.from(set).sort((a, b) => a - b);
  }, [spells]);

  const presentSchools = useMemo(() => {
    const set = new Set<SpellSchool>();
    for (const s of spells) set.add(s.school);
    return Array.from(set).sort((a, b) =>
      t(`school.${a}`).localeCompare(t(`school.${b}`), 'fr'),
    );
  }, [spells]);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query);
    return spells
      .filter((s) => {
        if (level !== 'all' && s.level !== level) return false;
        if (school !== 'all' && s.school !== school) return false;
        if (q && !normalizeForSearch(localize(s.name)).includes(q))
          return false;
        return true;
      })
      .sort((a, b) =>
        a.level !== b.level
          ? a.level - b.level
          : localize(a.name).localeCompare(localize(b.name), 'fr'),
      );
  }, [spells, query, level, school]);

  const grouped = useMemo(() => {
    const map = new Map<number, Spell[]>();
    for (const s of filtered) {
      const arr = map.get(s.level) ?? [];
      arr.push(s);
      map.set(s.level, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  if (loading) return <CodexLoading />;

  return (
    <div className="flex flex-col gap-3">
      <CodexSearchField
        value={query}
        onChange={setQuery}
        placeholder={t('codex.search.spells')}
      />

      <ScrollRow>
        <Chip active={level === 'all'} onToggle={() => setLevel('all')}>
          {t('codex.spell.allLevels')}
        </Chip>
        {presentLevels.map((lvl) => (
          <Chip
            key={lvl}
            active={level === lvl}
            onToggle={() => setLevel(lvl)}
            className="whitespace-nowrap"
          >
            {lvl === 0 ? t('spell.level.cantrip') : `${t('spell.level.prefix')} ${lvl}`}
          </Chip>
        ))}
      </ScrollRow>

      <ScrollRow>
        <Chip active={school === 'all'} onToggle={() => setSchool('all')}>
          {t('codex.spell.allSchools')}
        </Chip>
        {presentSchools.map((sc) => (
          <Chip
            key={sc}
            variant="magic"
            active={school === sc}
            onToggle={() => setSchool(sc)}
            className="whitespace-nowrap"
          >
            {t(`school.${sc}`)}
          </Chip>
        ))}
      </ScrollRow>

      <CodexResultCount count={filtered.length} />

      {filtered.length === 0 ? (
        <CodexEmpty />
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map(([lvl, items]) => (
            <section key={lvl}>
              <h3 className="mb-1 font-title text-[10px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
                {lvl === 0
                  ? t('spell.level.cantrip')
                  : `${t('spell.level.prefix')} ${lvl}`}
              </h3>
              <ul className="flex flex-col gap-2">
                {items.map((spell) => (
                  <li key={spell.id}>
                    <CodexRow
                      title={localize(spell.name)}
                      onClick={() => setActive(spell)}
                      badge={
                        <div
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-amethyst/30 bg-amethyst/10 font-display text-[14px] font-black text-amethyst"
                          style={{
                            clipPath:
                              'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                          }}
                          aria-hidden="true"
                        >
                          {spell.level === 0 ? '·' : spell.level}
                        </div>
                      }
                      meta={
                        <>
                          <span>{t(`school.${spell.school}`)}</span>
                          {spell.concentration ? (
                            <span className="text-amethyst">
                              {t('spell.flag.concentration')}
                            </span>
                          ) : null}
                          {spell.ritual ? (
                            <span className="text-teal">
                              {t('spell.flag.ritual')}
                            </span>
                          ) : null}
                        </>
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {active ? (
        <SpellCodexModal
          spell={active}
          classCatalog={classCatalog}
          onClose={() => setActive(null)}
        />
      ) : null}
    </div>
  );
}
