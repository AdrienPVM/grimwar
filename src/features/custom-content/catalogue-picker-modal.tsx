import { useId, useMemo, useState, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { normalizeForSearch } from '@/shared/lib/search-normalize';
import type { ContentEntityByKey, ContentTypeKey } from '@/shared/types/content';

/**
 * Que faire de l'entrée dupliquée :
 *  - `copy` : nouvel identifiant, l'original reste servi à la table.
 *  - `replace` : on garde l'identifiant du catalogue — l'entrée maison
 *    ÉCRASE l'originale partout (le merger applique déjà `user > public`).
 */
export type DuplicateMode = 'copy' | 'replace';

interface Props<K extends ContentTypeKey> {
  type: K;
  onPick: (entity: ContentEntityByKey[K], mode: DuplicateMode) => void;
  onClose: () => void;
}

const MODES: readonly {
  mode: DuplicateMode;
  labelKey: 'customContent.duplicate.modeCopy' | 'customContent.duplicate.modeReplace';
  hintKey:
    | 'customContent.duplicate.modeCopyHint'
    | 'customContent.duplicate.modeReplaceHint';
}[] = [
  {
    mode: 'copy',
    labelKey: 'customContent.duplicate.modeCopy',
    hintKey: 'customContent.duplicate.modeCopyHint',
  },
  {
    mode: 'replace',
    labelKey: 'customContent.duplicate.modeReplace',
    hintKey: 'customContent.duplicate.modeReplaceHint',
  },
];

/**
 * « Dupliquer une entrée existante » — le point d'entrée qui manquait (M50).
 *
 * L'éditeur de packs ne savait partir que d'une page blanche ou d'une entrée
 * DÉJÀ dans le pack : « chez moi la Boule de feu fait 6d6 » obligeait à
 * ressaisir un sort SRD champ par champ. Ce sélecteur ouvre le catalogue
 * FUSIONNÉ (`useContent` → SRD ∪ packs de l'utilisateur) et rend l'entrée
 * choisie au formulaire, pré-remplie.
 *
 * Le choix « copie » / « remplacement » est posé AVANT le clic, pas après :
 * remplacer une entrée SRD est légitime (le merger le fait déjà proprement) mais
 * ce n'est pas ce qu'on veut par défaut, et découvrir l'écrasement à la table
 * serait pénible. Le mode `replace` est donc explicite et averti.
 */
export function CataloguePickerModal<K extends ContentTypeKey>({
  type,
  onPick,
  onClose,
}: Props<K>): JSX.Element {
  const { data, loading, scopeOf } = useContent(type);
  const [query, setQuery] = useState<string>('');
  const [mode, setMode] = useState<DuplicateMode>('copy');
  const titleId = useId();

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query);
    const named = data as readonly { id: string; name: { fr: string; en?: string } }[];
    return named
      .filter((e) => !q || normalizeForSearch(localize(e.name)).includes(q))
      .slice()
      .sort((a, b) => localize(a.name).localeCompare(localize(b.name), 'fr'));
  }, [data, query]);

  return (
    <DetailModal open onClose={onClose} titleId={titleId} size="md">
      <div className="flex flex-col gap-3 p-5 pt-12" data-testid="catalogue-picker">
        <h2
          id={titleId}
          className="font-title text-[12px] uppercase tracking-[0.18em] text-gold-bright"
        >
          {t('customContent.duplicate.title')}
        </h2>

        <div
          role="radiogroup"
          aria-label={t('customContent.duplicate.modeLegend')}
          className="grid grid-cols-2 gap-2"
        >
          {MODES.map(({ mode: value, labelKey, hintKey }) => {
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMode(value)}
                data-testid={`catalogue-picker-mode-${value}`}
                className={cn(
                  'flex flex-col gap-1 rounded-card-sm border p-3 text-left transition-all duration-200 ease-base',
                  active
                    ? 'border-gold-dim bg-gradient-to-b from-gold-bright/[0.1] to-gold/[0.02]'
                    : 'border-white-8 bg-white/[0.02] hover:border-soft',
                )}
              >
                <span
                  className={cn(
                    'font-title text-[11px] font-bold uppercase tracking-[0.14em]',
                    active ? 'text-gold-bright' : 'text-text-secondary',
                  )}
                >
                  {t(labelKey)}
                </span>
                <span className="font-serif text-[12px] text-text-tertiary">
                  {t(hintKey)}
                </span>
              </button>
            );
          })}
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('customContent.duplicate.searchPlaceholder')}
          aria-label={t('customContent.duplicate.searchAria')}
          className="w-full rounded-pill border border-gold-dim/40 bg-glass-2 px-4 py-2 font-serif text-body text-text placeholder:text-text-tertiary transition-colors duration-200 ease-base focus:border-gold-bright focus:outline-none"
        />

        {loading ? (
          <p className="py-6 text-center font-serif text-[13px] text-text-tertiary">
            {t('customContent.duplicate.loading')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center font-serif text-[13px] text-text-tertiary">
            {t('customContent.duplicate.empty')}
          </p>
        ) : (
          <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
            {filtered.map((entry) => {
              const origin = scopeOf(entry.id);
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    data-testid={`catalogue-pick-${entry.id}`}
                    onClick={() =>
                      onPick(
                        data.find(
                          (e) => (e as { id: string }).id === entry.id,
                        ) as ContentEntityByKey[K],
                        mode,
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-card border border-transparent px-3 py-2 text-left transition-colors duration-200 ease-base hover:border-gold-dim/40 hover:bg-gold/[0.06]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-body text-text">
                        {localize(entry.name)}
                      </span>
                      <span className="block truncate font-meta text-meta uppercase tracking-[0.18em] text-text-tertiary">
                        {entry.id}
                      </span>
                    </span>
                    {origin.scope !== 'public' ? (
                      <span className="shrink-0 rounded-pill border border-gold-dim/40 px-2 py-0.5 font-title text-[10px] uppercase tracking-[0.14em] text-gold">
                        {origin.originLabel ?? t('customContent.origin.custom')}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DetailModal>
  );
}
