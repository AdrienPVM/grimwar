import { useMemo } from 'react';

import { useContent } from '@/shared/hooks/use-content';
import { localize } from '@/shared/lib/i18n';
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

import { CODEX_CATEGORIES, type CodexCategory, type CodexCategoryId } from '../codex-categories';

/**
 * Index de recherche transverse aux dix bundles du SRD.
 *
 * Extrait de l'onglet « Tout » du Codex quand la palette de commandes (⌘K) a
 * eu besoin de la même chose : chercher « entrave » sans savoir si c'est un
 * sort, un état ou un objet. Deux hôtes, un seul index — sinon les deux
 * réponses divergent au premier bundle ajouté.
 *
 * L'index porte l'entité SOURCE et non une projection : ouvrir un résultat rend
 * EXACTEMENT la modale de sa catégorie (bloc de stats complet pour un monstre,
 * méta + montée en puissance pour un sort), sans reconstruire quoi que ce soit.
 */

/** Seuil sous lequel la recherche renverrait tout le SRD — un mur, pas une réponse. */
export const MIN_QUERY_LENGTH = 2;

/** Un résultat, discriminé par sa catégorie. */
export type CodexHit =
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

export interface IndexedHit {
  /** Unique tous bundles confondus : deux catégories peuvent partager un slug. */
  key: string;
  name: string;
  /** Nom + texte descriptif, normalisé (casse et accents), pour le filtrage. */
  searchText: string;
  hit: CodexHit;
}

export interface CodexHitGroup {
  category: CodexCategory;
  entries: IndexedHit[];
}

function join(...parts: Array<string | null | undefined>): string {
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
    searchText: join(name, describe),
    hit,
  };
}

/**
 * Pertinence d'une entrée face à une requête — plus petit est meilleur.
 *
 * Sans elle, chercher « entrave » répondait « Embruns prismatiques » : le texte
 * descriptif d'une entrée pesait autant que le NOM d'une autre, et l'ordre
 * final était alphabétique. Le nom prime donc, et un nom qui COMMENCE par la
 * requête prime sur un nom qui la contient au milieu.
 */
function relevance(entry: IndexedHit, needle: string): number {
  const name = normalizeForSearch(entry.name);
  if (name === needle) return 0;
  if (name.startsWith(needle)) return 1;
  // Début d'un mot du nom : « entrave » doit trouver « Baguette des entraves »
  // mieux qu'une entrée qui ne le mentionne qu'en description.
  if (new RegExp(`\\b${escapeRegExp(needle)}`).test(name)) return 2;
  if (name.includes(needle)) return 3;
  return 4;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Tri commun : pertinence d'abord, alphabétique à pertinence égale. */
function byRelevance(needle: string) {
  return (a: IndexedHit, b: IndexedHit): number => {
    const diff = relevance(a, needle) - relevance(b, needle);
    return diff !== 0 ? diff : a.name.localeCompare(b.name, 'fr');
  };
}

function matching(catalog: readonly IndexedHit[], needle: string): IndexedHit[] {
  return catalog.filter((entry) => entry.searchText.includes(needle));
}

/**
 * Filtre l'index et regroupe par catégorie, dans l'ordre du sélecteur d'onglets
 * du Codex — la réponse porte ainsi aussi son type (« Entrave, c'est un état »).
 * Sert la page du Codex, où l'on PARCOURT.
 *
 * `limitPerCategory` borne chaque groupe pour les hôtes compacts.
 */
export function searchCodexIndex(
  catalog: readonly IndexedHit[],
  query: string,
  limitPerCategory?: number,
): CodexHitGroup[] {
  const needle = normalizeForSearch(query);
  if (needle.length < MIN_QUERY_LENGTH) return [];
  const buckets = new Map<CodexCategoryId, IndexedHit[]>();
  for (const entry of matching(catalog, needle)) {
    const bucket = buckets.get(entry.hit.category) ?? [];
    bucket.push(entry);
    buckets.set(entry.hit.category, bucket);
  }
  return CODEX_CATEGORIES.flatMap((category) => {
    const bucket = buckets.get(category.id);
    if (!bucket || bucket.length === 0) return [];
    bucket.sort(byRelevance(needle));
    return [
      {
        category,
        entries:
          limitPerCategory === undefined
            ? bucket
            : bucket.slice(0, limitPerCategory),
      },
    ];
  });
}

/**
 * Les `limit` entrées les plus pertinentes, TOUTES CATÉGORIES MÊLÉES. Sert la
 * palette, où l'on ne parcourt pas : on pose une question et on veut la réponse
 * en tête. Grouper par catégorie y enterrerait l'état « Entravé » sous les
 * sorts, seulement parce que les états ferment la liste des onglets.
 */
export function rankedCodexHits(
  catalog: readonly IndexedHit[],
  query: string,
  limit: number,
): IndexedHit[] {
  const needle = normalizeForSearch(query);
  if (needle.length < MIN_QUERY_LENGTH) return [];
  return matching(catalog, needle).sort(byRelevance(needle)).slice(0, limit);
}

export interface CodexIndex {
  catalog: IndexedHit[];
  loading: boolean;
}

/**
 * Charge les dix bundles et en dérive l'index. À ne monter que quand la
 * recherche est réellement ouverte : dix bundles, c'est le plus gros chargement
 * de l'app, et il n'a aucune raison d'accompagner chaque écran.
 */
export function useCodexIndex(): CodexIndex {
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

  const catalog = useMemo<IndexedHit[]>(
    () => [
      ...spells.data.map((value) =>
        toIndexed({ category: 'spells', value }, localize(value.description)),
      ),
      ...magicItems.data.map((value) =>
        toIndexed(
          { category: 'magicItems', value },
          join(
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
          join(
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

  return {
    catalog,
    loading:
      spells.loading ||
      magicItems.loading ||
      items.loading ||
      monsters.loading ||
      ancestries.loading ||
      backgrounds.loading ||
      classes.loading ||
      feats.loading ||
      invocations.loading ||
      conditions.loading,
  };
}

/** Le catalogue des classes, pour la modale de sort (liste des lanceurs). */
export function classesOf(catalog: readonly IndexedHit[]): ClassEntity[] {
  return catalog
    .filter((e): e is IndexedHit & { hit: { category: 'classes'; value: ClassEntity } } =>
      e.hit.category === 'classes',
    )
    .map((e) => e.hit.value);
}
