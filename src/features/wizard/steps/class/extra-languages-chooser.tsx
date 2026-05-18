import { useMemo, type JSX } from 'react';

import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { LANGUAGES, type LanguageEntry } from '@/shared/lib/rules/languages';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { toggleBoundedSelection } from './chooser-utils';

/**
 * Chooser langues supplémentaires — composant générique racine (plan 13.9
 * step 7). Utilisé par Roublard (+1 langue racine SRD) et toute autre source
 * future (Background, Origin Feat Skilled). Pas dépendant d'une classe :
 * écrit dans `draft.extraLanguages` racine, pas dans `classes[].*`.
 *
 * Filtre le Commun (déjà connu de tous les personnages SRD) et toute langue
 * déjà connue (`alreadyKnown` — typiquement la langue d'ancestry, qui sera
 * branchée plus tard quand la sélection d'ancestry exposera ses langues).
 *
 * Le `count` est passé en prop pour rester générique : 1 pour le Roublard L1,
 * potentiellement plus pour d'autres sources.
 */
interface Props {
  /** Nombre exact à sélectionner. */
  count: number;
  /**
   * Langues déjà connues (à exclure du pool). Inclut le Commun par défaut +
   * tout ce que l'appelant veut filtrer (langue d'ancestry, background...).
   */
  alreadyKnown?: readonly string[];
}

export function ExtraLanguagesChooser({ count, alreadyKnown = [] }: Props): JSX.Element {
  const setField = useWizardStore((s) => s.setField);
  const selected = useWizardStore((s) => s.draft.extraLanguages);

  const known = useMemo(() => new Set<string>(['common', ...alreadyKnown]), [alreadyKnown]);

  const pool = useMemo<readonly LanguageEntry[]>(
    () => LANGUAGES.filter((l) => !known.has(l.id)),
    [known],
  );

  const remaining = count - selected.length;
  const reachedCap = selected.length >= count;

  return (
    <fieldset className="flex flex-col gap-3 border-0 p-0 m-0">
      <legend className="font-title text-meta text-text-secondary uppercase tracking-[0.16em]">
        {t('wizard.subchoice.extraLanguages.legend')}
      </legend>
      <p className="font-serif text-[13px] text-text-tertiary -mt-1">
        {t('wizard.subchoice.extraLanguages.helper').replace('{count}', String(count))}
      </p>
      <p className="font-serif text-[13px] text-text-secondary" aria-live="polite">
        {selected.length} / {count}
        {remaining > 0 ? (
          <span className="ml-2 text-text-tertiary">
            {t('wizard.subchoice.extraLanguages.remaining').replace(
              '{n}',
              String(remaining),
            )}
          </span>
        ) : null}
      </p>
      <div
        role="group"
        aria-label={t('wizard.subchoice.extraLanguages.legend')}
        className="grid gap-2.5 grid-cols-2 sm:grid-cols-3"
      >
        {pool.map((lang) => {
          const checked = selected.includes(lang.id);
          const disabled = !checked && reachedCap;
          return (
            <label
              key={lang.id}
              htmlFor={`extra-lang-${lang.id}`}
              className={cn(
                'group relative flex min-h-[48px] cursor-pointer flex-col gap-0.5 rounded-card border p-3',
                'transition-all duration-150 ease-base',
                'focus-within:ring-2 focus-within:ring-gold-bright/40',
                checked
                  ? 'border-gold-bright bg-gold-bright/10 shadow-gold-glow'
                  : 'border-soft bg-bg-3/30 hover:border-glow hover:bg-bg-3/50',
                disabled && 'cursor-not-allowed opacity-40',
              )}
            >
              <input
                id={`extra-lang-${lang.id}`}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  const next = toggleBoundedSelection(selected, lang.id, count);
                  setField('extraLanguages', next);
                }}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'font-display text-[15px]',
                  checked ? 'text-gold-bright' : 'text-gold',
                )}
              >
                {localize(lang.name)}
              </span>
              <span className="font-serif text-[12px] text-text-tertiary uppercase tracking-[0.12em]">
                {lang.tier === 'rare'
                  ? t('wizard.subchoice.extraLanguages.tierRare')
                  : t('wizard.subchoice.extraLanguages.tierStandard')}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
