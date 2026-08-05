import { useMemo, useState, type JSX } from 'react';

import { Card, CardAction, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { resolveCharacterLanguages } from '@/shared/lib/rules/character-languages';
import { LANGUAGES } from '@/shared/lib/rules/languages';
import type { Character } from '@/shared/types/character';

import { useSheetReadOnly } from '../../permissions-context';
import { useUpdateCharacter } from '../../use-update-character';
import { ExtraEntriesEditor } from './extra-entries-editor';

interface LanguagesCardProps {
  character: Character;
}

/**
 * Carte « Langues » du mode Essence.
 *
 * Dérive la liste des langues à l'affichage (cf. resolveCharacterLanguages) :
 * langues d'ascendance (bundle `ancestries.json`) ∪ langues bonus choisies au
 * wizard (`character.extraLanguages`) ∪ langues issues d'autres sources
 * (`extraProficiencies.languages`). Aucune dénormalisation : la source de
 * vérité reste le contenu + les champs persistés.
 *
 * Cat. 5 (cohérence wizard → fiche) : la langue bonus sélectionnée au wizard
 * apparaît ici À L'IDENTIQUE.
 *
 * M17 : une langue apprise en jeu (« il parle le thayen ») s'ajoute désormais
 * ici. On n'écrit que `extraProficiencies.languages` — les langues d'ascendance
 * sont dérivées du bundle et n'ont nulle part où être retirées.
 */
export function LanguagesCard({ character }: LanguagesCardProps): JSX.Element | null {
  const { data: ancestries } = useContent('ancestries');
  const readOnly = useSheetReadOnly(character);
  const { updateCharacter } = useUpdateCharacter(character);
  const [editing, setEditing] = useState<boolean>(false);

  const languages = useMemo(() => {
    const ancestry = ancestries.find((a) => a.id === character.ancestryId);
    return resolveCharacterLanguages({
      ancestryLanguages: ancestry?.languages ?? ['common'],
      extraLanguages: character.extraLanguages,
      proficiencyLanguages: character.extraProficiencies.languages,
    });
  }, [ancestries, character.ancestryId, character.extraLanguages, character.extraProficiencies.languages]);

  const known = useMemo(() => new Set(languages.map((l) => l.id)), [languages]);
  // Registre SRD moins ce que le personnage parle déjà — inutile de proposer
  // « Commun », que tout le monde a.
  const suggestions = useMemo(
    () =>
      LANGUAGES.filter((l) => !known.has(l.id)).map((l) => ({
        value: l.id,
        label: localize(l.name),
      })),
    [known],
  );

  async function patchLanguages(values: string[]): Promise<void> {
    await updateCharacter({
      extraProficiencies: { ...character.extraProficiencies, languages: values },
    });
  }

  if (languages.length === 0 && !editing) return null;

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.essence.languages.title')}</h3>
        {readOnly ? null : (
          <CardAction aria-pressed={editing} onClick={() => setEditing((v) => !v)}>
            {t(editing ? 'sheet.essence.prof.done' : 'sheet.essence.prof.edit')}
          </CardAction>
        )}
      </CardHeader>
      <ul className="flex flex-wrap gap-2">
        {languages.map((lang) => (
          <li
            key={lang.id}
            className="rounded-pill border border-white-8 bg-white/[0.04] px-3 py-1.5 font-title text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary"
          >
            {localize(lang.name)}
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="mt-5 border-t border-white-8 pt-5">
          <ExtraEntriesEditor
            label={t('sheet.essence.languages.title')}
            entries={character.extraProficiencies.languages}
            suggestions={suggestions}
            placeholder={t('sheet.essence.languages.addPlaceholder')}
            onAdd={(v) => void patchLanguages([...character.extraProficiencies.languages, v])}
            onRemove={(v) =>
              void patchLanguages(
                character.extraProficiencies.languages.filter((e) => e !== v),
              )
            }
          />
        </div>
      ) : null}
    </Card>
  );
}
