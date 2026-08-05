import { useId, useMemo, useState, type JSX, type ReactNode } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { formatCr } from '@/shared/lib/rules/challenge-rating';
import { normalizeForSearch } from '@/shared/lib/search-normalize';
import type {
  Ancestry,
  Background,
  ClassEntity,
  Condition,
  Feat,
  Invocation,
  Item,
  MagicItem,
  Monster,
  Spell,
} from '@/shared/types/content';

import { CODEX_CATEGORIES, type CodexCategoryId } from '../codex-categories';
import {
  CodexEmpty,
  CodexLoading,
  CodexModalShell,
  CodexResultCount,
  CodexRow,
  CodexSearchField,
} from '../codex-ui';
import {
  buildAncestryEntries,
  buildBackgroundEntries,
  buildClassEntries,
} from './codex-build-browsers';
import {
  buildConditionEntries,
  buildFeatEntries,
  buildInvocationEntries,
} from './codex-text-browsers';
import { ItemCodexDetail, formatItemDamage } from './item-codex-detail';
import {
  MagicItemCodexDetail,
  RARITY_COLOR,
} from './magic-item-codex-detail';
import { MonsterStatBlock } from './monster-stat-block';
import { SpellCodexModal } from './spell-codex-modal';
import type { CodexEntry } from './text-entity-browser';

/**
 * Recherche transverse du Codex — l'onglet qu'on ouvre quand on ne sait PAS
 * dans quelle catégorie chercher. En pleine partie, la question est « c'est
 * quoi, Entrave ? » : un sort ? un état ? un objet ? Obliger à deviner l'onglet
 * avant de pouvoir chercher, c'est faire porter au joueur le classement interne
 * du SRD.
 *
 * Trois partis pris :
 *  - **Un seul champ, dix bundles.** Aucun filtre : les filtres (niveau, école,
 *    rareté, taille) restent l'affaire des onglets dédiés, qui savent de quoi
 *    ils parlent.
 *  - **Résultats groupés par catégorie**, dans l'ordre du sélecteur d'onglets,
 *    pour que la réponse porte aussi son type — « Entrave, c'est un sort ».
 *  - **La même fiche que l'onglet dédié.** Ouvrir un résultat rend EXACTEMENT
 *    la modale de sa catégorie (bloc de stats complet pour un monstre, méta +
 *    montée en puissance pour un sort). Pas de fiche appauvrie propre à la
 *    recherche — d'où les corps de modale extraits et partagés.
 *
 * Seuil de 2 caractères : en dessous, la recherche renverrait l'intégralité du
 * SRD, ce qui n'est pas une réponse mais un mur.
 */

const MIN_QUERY_LENGTH = 2;

/**
 * Un résultat, discriminé par sa catégorie. L'union porte l'entité SOURCE (et
 * non une projection), pour que le rendu du détail délègue au composant de la
 * catégorie sans reconstruire quoi que ce soit.
 */
type CodexHit =
  | { category: 'spells'; value: Spell }
  | { category: 'magicItems'; value: MagicItem }
  | { category: 'items'; value: Item }
  | { category: 'monsters'; value: Monster }
  | { category: 'ancestries'; value: Ancestry }
  | { category: 'backgrounds'; value: Background }
  | { category: 'classes'; value: ClassEntity }
  | { category: 'feats'; value: Feat }
  | { category: 'invocations'; value: Invocation }
  | { category: 'conditions'; value: Condition };

interface IndexedHit {
  /** Unique tous bundles confondus : deux catégories peuvent partager un slug. */
  key: string;
  name: string;
  /** Nom + texte descriptif, en minuscules, pour le filtrage. */
  searchText: string;
  hit: CodexHit;
}

function lower(...parts: Array<string | null | undefined>): string {
  // Normalisation accents comprise : le `searchText` est la moitié CONTENU de
  // la comparaison, et normaliser la seule requête ne servirait à rien.
  return normalizeForSearch(
    parts.filter((part): part is string => Boolean(part)).join(' '),
  );
}

/**
 * Projette un résultat vers son entrée d'index. `describe` est le texte
 * secondaire fouillé en plus du nom — chercher « paralysé » doit trouver l'état
 * ET les sorts qui l'infligent.
 */
function toIndexed(hit: CodexHit, describe: string): IndexedHit {
  const name = localize(hit.value.name);
  return {
    key: `${hit.category}:${hit.value.id}`,
    name,
    searchText: lower(name, describe),
    hit,
  };
}

/** Ligne de méta d'un résultat : ce qui distingue l'entrée DANS sa catégorie. */
function hitMeta(hit: CodexHit): ReactNode {
  switch (hit.category) {
    case 'spells':
      return (
        <>
          <span>
            {hit.value.level === 0
              ? t('spell.level.cantrip')
              : `${t('spell.level.prefix')} ${hit.value.level}`}
          </span>
          <span>{t(`school.${hit.value.school}`)}</span>
        </>
      );
    case 'magicItems':
      return (
        <span className={RARITY_COLOR[hit.value.rarity]}>
          {t(`rarity.${hit.value.rarity}`)}
        </span>
      );
    case 'items':
      return (
        <>
          <span>{t(`item.category.${hit.value.category}`)}</span>
          {formatItemDamage(hit.value) ? (
            <span className="text-crimson">{formatItemDamage(hit.value)}</span>
          ) : null}
        </>
      );
    case 'monsters':
      return (
        <>
          <span>{t(`size.${hit.value.size}` as 'size.medium')}</span>
          <span className="text-gold">FP {formatCr(hit.value.cr)}</span>
        </>
      );
    case 'classes':
      return <span>{hit.value.hitDie}</span>;
    case 'ancestries':
      return <span>{t(`size.${hit.value.size}` as 'size.medium')}</span>;
    case 'backgrounds':
    case 'feats':
    case 'invocations':
    case 'conditions':
      return null;
  }
}

/**
 * Entrée `CodexEntry` d'un résultat « texte », reconstruite à la demande pour
 * le SEUL résultat ouvert. Construire les entrées des dix bundles d'avance
 * fabriquerait des milliers d'arbres React à chaque frappe pour n'en afficher
 * qu'un.
 */
function textEntry(hit: CodexHit): CodexEntry | null {
  switch (hit.category) {
    case 'ancestries':
      return buildAncestryEntries([hit.value])[0] ?? null;
    case 'backgrounds':
      return buildBackgroundEntries([hit.value])[0] ?? null;
    case 'classes':
      return buildClassEntries([hit.value])[0] ?? null;
    case 'feats':
      return buildFeatEntries([hit.value])[0] ?? null;
    case 'invocations':
      return buildInvocationEntries([hit.value])[0] ?? null;
    case 'conditions':
      return buildConditionEntries([hit.value])[0] ?? null;
    default:
      return null;
  }
}

export function GlobalSearchBrowser(): JSX.Element {
  const spells = useContent('spells');
  const magicItems = useContent('magic-items');
  const items = useContent('items');
  const monsters = useContent('monsters');
  const ancestries = useContent('ancestries');
  const backgrounds = useContent('backgrounds');
  const classes = useContent('classes');
  const feats = useContent('feats');
  const invocations = useContent('invocations');
  const conditions = useContent('conditions');

  const [query, setQuery] = useState<string>('');
  const [active, setActive] = useState<CodexHit | null>(null);
  const titleId = useId();

  const catalog = useMemo<IndexedHit[]>(
    () => [
      ...spells.data.map((value) =>
        toIndexed({ category: 'spells', value }, localize(value.description)),
      ),
      ...magicItems.data.map((value) =>
        toIndexed(
          { category: 'magicItems', value },
          lower(
            localize(value.magicDescription),
            value.description ? localize(value.description) : null,
          ),
        ),
      ),
      ...items.data.map((value) =>
        toIndexed(
          { category: 'items', value },
          value.description ? localize(value.description) : '',
        ),
      ),
      ...monsters.data.map((value) =>
        toIndexed({ category: 'monsters', value }, value.type),
      ),
      ...ancestries.data.map((value) =>
        toIndexed({ category: 'ancestries', value }, localize(value.description)),
      ),
      ...backgrounds.data.map((value) =>
        toIndexed({ category: 'backgrounds', value }, localize(value.description)),
      ),
      ...classes.data.map((value) =>
        toIndexed({ category: 'classes', value }, localize(value.description)),
      ),
      ...feats.data.map((value) =>
        toIndexed(
          { category: 'feats', value },
          lower(
            value.summary ? localize(value.summary) : null,
            value.prerequisite ? localize(value.prerequisite) : null,
          ),
        ),
      ),
      ...invocations.data.map((value) =>
        toIndexed({ category: 'invocations', value }, localize(value.summary)),
      ),
      ...conditions.data.map((value) =>
        toIndexed({ category: 'conditions', value }, localize(value.description)),
      ),
    ],
    [
      spells.data,
      magicItems.data,
      items.data,
      monsters.data,
      ancestries.data,
      backgrounds.data,
      classes.data,
      feats.data,
      invocations.data,
      conditions.data,
    ],
  );

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY_LENGTH;

  const grouped = useMemo(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) return [];
    const needle = normalizeForSearch(trimmed);
    const buckets = new Map<CodexCategoryId, IndexedHit[]>();
    for (const entry of catalog) {
      if (!entry.searchText.includes(needle)) continue;
      const bucket = buckets.get(entry.hit.category) ?? [];
      bucket.push(entry);
      buckets.set(entry.hit.category, bucket);
    }
    // Ordre du sélecteur d'onglets : la recherche ne réinvente pas un classement.
    return CODEX_CATEGORIES.flatMap((category) => {
      const bucket = buckets.get(category.id);
      if (!bucket || bucket.length === 0) return [];
      bucket.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      return [{ category, entries: bucket }];
    });
  }, [catalog, trimmed]);

  const total = grouped.reduce((sum, group) => sum + group.entries.length, 0);

  const loading =
    spells.loading ||
    magicItems.loading ||
    items.loading ||
    monsters.loading ||
    ancestries.loading ||
    backgrounds.loading ||
    classes.loading ||
    feats.loading ||
    invocations.loading ||
    conditions.loading;

  if (loading) return <CodexLoading />;

  const entry = active ? textEntry(active) : null;

  return (
    <div className="flex flex-col gap-3">
      <CodexSearchField
        value={query}
        onChange={setQuery}
        placeholder={t('codex.search.all')}
      />

      {tooShort ? (
        <p className="rounded-card-sm border border-white-8 bg-white/[0.02] px-5 py-8 text-center font-serif italic text-text-tertiary">
          {t('codex.search.allHint')}
        </p>
      ) : (
        <>
          <CodexResultCount count={total} />
          {total === 0 ? (
            <CodexEmpty />
          ) : (
            <div className="flex flex-col gap-4">
              {grouped.map(({ category, entries }) => (
                <section key={category.id}>
                  <h3 className="mb-1 font-title text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                    {t(category.labelKey)} · {entries.length}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {entries.map((indexed) => (
                      <li key={indexed.key}>
                        <CodexRow
                          title={indexed.name}
                          meta={hitMeta(indexed.hit)}
                          onClick={() => setActive(indexed.hit)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {active?.category === 'spells' ? (
        <SpellCodexModal
          spell={active.value}
          classCatalog={classes.data}
          onClose={() => setActive(null)}
        />
      ) : null}

      <DetailModal
        open={active !== null && active.category !== 'spells'}
        onClose={() => setActive(null)}
        titleId={titleId}
        size="lg"
      >
        {active?.category === 'monsters' ? (
          <MonsterStatBlock monster={active.value} titleId={titleId} />
        ) : active?.category === 'items' ? (
          <ItemCodexDetail item={active.value} titleId={titleId} />
        ) : active?.category === 'magicItems' ? (
          <MagicItemCodexDetail item={active.value} titleId={titleId} />
        ) : entry ? (
          <CodexModalShell
            titleId={titleId}
            title={entry.name}
            eyebrow={entry.eyebrow}
            subtitle={entry.subtitle}
          >
            {entry.body}
          </CodexModalShell>
        ) : null}
      </DetailModal>
    </div>
  );
}
