import { useMemo, useState, type JSX } from 'react';

import { t } from '@/shared/lib/i18n';

import {
  CodexEmpty,
  CodexLoading,
  CodexResultCount,
  CodexRow,
  CodexSearchField,
} from '../codex-ui';
import { CodexHitDetail, hitMeta } from './codex-hit-view';
import {
  MIN_QUERY_LENGTH,
  classesOf,
  searchCodexIndex,
  useCodexIndex,
  type CodexHit,
} from './codex-search-index';

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
 *    la modale de sa catégorie.
 *
 * L'index et les modales vivent à côté (`codex-search-index`, `codex-hit-view`)
 * : la palette de commandes (⌘K) pose exactement la même question depuis
 * n'importe quel écran, et deux implémentations divergeraient au premier
 * bundle ajouté.
 */
export function GlobalSearchBrowser(): JSX.Element {
  const { catalog, loading } = useCodexIndex();
  const [query, setQuery] = useState<string>('');
  const [active, setActive] = useState<CodexHit | null>(null);

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY_LENGTH;

  const grouped = useMemo(
    () => searchCodexIndex(catalog, trimmed),
    [catalog, trimmed],
  );
  const classCatalog = useMemo(() => classesOf(catalog), [catalog]);

  const total = grouped.reduce((sum, group) => sum + group.entries.length, 0);

  if (loading) return <CodexLoading />;

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

      <CodexHitDetail
        hit={active}
        onClose={() => setActive(null)}
        classCatalog={classCatalog}
      />
    </div>
  );
}
