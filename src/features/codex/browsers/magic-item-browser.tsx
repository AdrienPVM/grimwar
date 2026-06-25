import { useMemo, useState, type JSX } from 'react';
import { useId } from 'react';

import { Chip } from '@/shared/components/chip';
import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import type { MagicItem, Rarity } from '@/shared/types/content';

import {
  CodexEmpty,
  CodexField,
  CodexLoading,
  CodexModalShell,
  CodexResultCount,
  CodexRow,
  CodexSearchField,
} from '../codex-ui';

type RarityFilter = Rarity | 'all';

/** Ordre canonique des raretés (SRD). */
const RARITY_ORDER: readonly Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'very rare',
  'legendary',
  'artifact',
];

/** Couleur de rareté (tokens existants), du plus commun au plus rare. */
const RARITY_COLOR: Record<Rarity, string> = {
  common: 'text-text-secondary',
  uncommon: 'text-teal',
  rare: 'text-gold',
  'very rare': 'text-amethyst',
  legendary: 'text-crimson',
  artifact: 'text-gold-bright',
};

function attunementText(item: MagicItem): string | null {
  if (item.attunement === true) return t('codex.item.attunementRequired');
  if (item.attunement && typeof item.attunement === 'object') {
    return localize(item.attunement);
  }
  return null;
}

/**
 * Navigateur d'objets magiques du Codex (plan 19). Recherche par nom + filtre
 * par rareté ; rangées colorées par rareté ; modale = catégorie · rareté,
 * harmonisation, description magique + description physique. Tout dérivé de
 * `magic-items.json`.
 */
export function MagicItemBrowser(): JSX.Element {
  const { data: items, loading } = useContent('magic-items');
  const [query, setQuery] = useState<string>('');
  const [rarity, setRarity] = useState<RarityFilter>('all');
  const [active, setActive] = useState<MagicItem | null>(null);
  const titleId = useId();

  const presentRarities = useMemo(() => {
    const set = new Set<Rarity>();
    for (const item of items) set.add(item.rarity);
    return RARITY_ORDER.filter((r) => set.has(r));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('fr');
    return items
      .filter((item) => {
        if (rarity !== 'all' && item.rarity !== rarity) return false;
        if (q && !localize(item.name).toLocaleLowerCase('fr').includes(q))
          return false;
        return true;
      })
      .sort((a, b) => localize(a.name).localeCompare(localize(b.name), 'fr'));
  }, [items, query, rarity]);

  if (loading) return <CodexLoading />;

  return (
    <div className="flex flex-col gap-3">
      <CodexSearchField
        value={query}
        onChange={setQuery}
        placeholder={t('codex.search.magicItems')}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        <Chip active={rarity === 'all'} onToggle={() => setRarity('all')}>
          {t('codex.item.allRarities')}
        </Chip>
        {presentRarities.map((r) => (
          <Chip
            key={r}
            active={rarity === r}
            onToggle={() => setRarity(r)}
            className={cn('whitespace-nowrap', RARITY_COLOR[r])}
          >
            {t(`rarity.${r}`)}
          </Chip>
        ))}
      </div>

      <CodexResultCount count={filtered.length} />

      {filtered.length === 0 ? (
        <CodexEmpty />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <CodexRow
                title={localize(item.name)}
                onClick={() => setActive(item)}
                meta={
                  <>
                    <span>{t(`item.category.${item.category}`)}</span>
                    <span className={RARITY_COLOR[item.rarity]}>
                      {t(`rarity.${item.rarity}`)}
                    </span>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <DetailModal
        open={active !== null}
        onClose={() => setActive(null)}
        titleId={titleId}
        size="lg"
      >
        {active ? (
          <CodexModalShell
            titleId={titleId}
            title={localize(active.name)}
            eyebrow={`${t(`item.category.${active.category}`)} · ${t(
              `rarity.${active.rarity}`,
            )}`}
          >
            {attunementText(active) ? (
              <CodexField label={t('codex.item.attunement')}>
                {attunementText(active)}
              </CodexField>
            ) : null}
            <p className="whitespace-pre-line text-amethyst">
              {localize(active.magicDescription)}
            </p>
            {active.description ? (
              <p className="whitespace-pre-line">{localize(active.description)}</p>
            ) : null}
          </CodexModalShell>
        ) : null}
      </DetailModal>
    </div>
  );
}
