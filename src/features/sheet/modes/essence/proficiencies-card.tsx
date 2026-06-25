import { useMemo } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import {
  resolveCharacterProficiencies,
  type ProficiencySourceClass,
} from '@/shared/lib/rules/equipment-proficiencies';
import type { Character } from '@/shared/types/character';

interface ProficienciesCardProps {
  character: Character;
}

/**
 * Carte « Maîtrises » (armures / armes / outils) du mode Essence.
 *
 * Dérivée du contenu à l'affichage (cf. resolveCharacterProficiencies) :
 *   • maîtrises de classe (bundle `classes.json`, chaînes normalisées FR) ;
 *   • outils de background (bundle `backgrounds.json` → slugs résolus via
 *     `items.json`) ;
 *   • maîtrises « extra » persistées (`character.extraProficiencies`).
 *
 * Aucune dénormalisation : le personnage ne stocke pas les maîtrises de classe
 * (re-dérivables), de la même façon que la CA/Vitesse sont dérivées. La carte
 * disparaît si aucune maîtrise n'est résolue (perso sans armure ni outil).
 */
export function ProficienciesCard({ character }: ProficienciesCardProps): JSX.Element | null {
  const { data: classes } = useContent('classes');
  const { data: backgrounds } = useContent('backgrounds');
  const { data: items } = useContent('items');

  const resolved = useMemo(() => {
    const sourceClasses: ProficiencySourceClass[] = character.classes
      .map((c) => classes.find((cc) => cc.id === c.classId))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({
        armorProficiencies: c.armorProficiencies,
        weaponProficiencies: c.weaponProficiencies,
        toolProficiencies: c.toolProficiencies,
      }));
    const background = backgrounds.find((b) => b.id === character.backgroundId);
    const itemNameById = new Map(items.map((i) => [i.id, localize(i.name)]));
    return resolveCharacterProficiencies({
      classes: sourceClasses,
      backgroundToolSlugs: background?.toolProficiencies ?? [],
      resolveItemName: (slug) => itemNameById.get(slug) ?? null,
      extra: character.extraProficiencies,
    });
  }, [classes, backgrounds, items, character.classes, character.backgroundId, character.extraProficiencies]);

  const rows: Array<{ label: string; values: string[] }> = [
    { label: t('sheet.essence.proficiencies.armor'), values: resolved.armor },
    { label: t('sheet.essence.proficiencies.weapons'), values: resolved.weapons },
    { label: t('sheet.essence.proficiencies.tools'), values: resolved.tools },
  ].filter((r) => r.values.length > 0);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.essence.proficiencies.title')}</h3>
      </CardHeader>
      <dl className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1.5">
            <dt className="font-title text-[9px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
              {row.label}
            </dt>
            <dd className="flex flex-wrap gap-2">
              {row.values.map((value) => (
                <span
                  key={value}
                  className="rounded-pill border border-white-8 bg-white/[0.04] px-3 py-1.5 text-[12px] text-text-secondary"
                >
                  {value}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
