import { useId, useMemo, useState, type JSX, type ReactNode } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';

import {
  CodexEmpty,
  CodexLoading,
  CodexModalShell,
  CodexResultCount,
  CodexRow,
  CodexSearchField,
} from '../codex-ui';

/**
 * Entrée normalisée du Codex, agnostique du type de contenu source. Chaque
 * adaptateur (dons, états, invocations…) projette son entité de bundle vers
 * cette forme commune ; le browser ne connaît plus que `CodexEntry`.
 */
export interface CodexEntry {
  id: string;
  /** Nom localisé (déjà passé par `localize`). */
  name: string;
  /** Petite ligne de méta sous le titre (prérequis, catégorie…). */
  meta?: ReactNode;
  /** Sur-titre méta dans la modale (catégorie). */
  eyebrow?: ReactNode;
  /** Sous-titre de la modale (chips). */
  subtitle?: ReactNode;
  /** Texte minuscule servant au filtrage par recherche. */
  searchText: string;
  /** Corps de la modale détail. */
  body: ReactNode;
}

interface TextEntityBrowserProps {
  entries: readonly CodexEntry[];
  loading: boolean;
  searchPlaceholder: string;
}

/**
 * Navigateur générique pour les entités « nom + texte » du Codex (états, dons,
 * invocations). Recherche par nom/méta, liste alphabétique, tap → modale de
 * détail. Les browsers riches (sorts, objets) ont leur propre composant.
 */
export function TextEntityBrowser({
  entries,
  loading,
  searchPlaceholder,
}: TextEntityBrowserProps): JSX.Element {
  const [query, setQuery] = useState<string>('');
  const [active, setActive] = useState<CodexEntry | null>(null);
  const titleId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('fr');
    const list = q
      ? entries.filter((e) => e.searchText.includes(q))
      : entries.slice();
    return list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [entries, query]);

  if (loading) return <CodexLoading />;

  return (
    <div className="flex flex-col gap-3">
      <CodexSearchField
        value={query}
        onChange={setQuery}
        placeholder={searchPlaceholder}
      />
      <CodexResultCount count={filtered.length} />
      {filtered.length === 0 ? (
        <CodexEmpty />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <CodexRow
                title={entry.name}
                meta={entry.meta}
                onClick={() => setActive(entry)}
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
            title={active.name}
            eyebrow={active.eyebrow}
            subtitle={active.subtitle}
          >
            {active.body}
          </CodexModalShell>
        ) : null}
      </DetailModal>
    </div>
  );
}
