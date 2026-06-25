import { useMemo } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import { resolveCharacterLanguages } from '@/shared/lib/rules/character-languages';
import type { Character } from '@/shared/types/character';

interface LanguagesCardProps {
  character: Character;
}

/**
 * Carte « Langues » du mode Essence.
 *
 * Dérive la liste des langues à l'affichage (cf. resolveCharacterLanguages) :
 * langues d'ascendance (bundle `ancestries.json`) ∪ langues bonus choisies au
 * wizard (`character.extraLanguages`, ex. langue supplémentaire du Roublard) ∪
 * langues issues d'autres sources (`extraProficiencies.languages`). Aucune
 * dénormalisation : la source de vérité reste le contenu + les champs persistés.
 *
 * Cat. 5 (cohérence wizard → fiche) : la langue bonus sélectionnée au wizard
 * apparaît ici À L'IDENTIQUE. Avant le fix `submit-from-wizard`, ce choix était
 * perdu et la carte n'affichait que « Commun ».
 */
export function LanguagesCard({ character }: LanguagesCardProps): JSX.Element | null {
  const { data: ancestries } = useContent('ancestries');

  const languages = useMemo(() => {
    const ancestry = ancestries.find((a) => a.id === character.ancestryId);
    return resolveCharacterLanguages({
      ancestryLanguages: ancestry?.languages ?? ['common'],
      extraLanguages: character.extraLanguages,
      proficiencyLanguages: character.extraProficiencies.languages,
    });
  }, [ancestries, character.ancestryId, character.extraLanguages, character.extraProficiencies.languages]);

  if (languages.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.essence.languages.title')}</h3>
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
    </Card>
  );
}
