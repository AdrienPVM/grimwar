import { useMemo, useState, type JSX } from 'react';

import { Card, CardAction, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import {
  resolveCharacterProficiencies,
  type ProficiencySourceClass,
} from '@/shared/lib/rules/equipment-proficiencies';
import type { Character } from '@/shared/types/character';

import { useSheetReadOnly } from '../../permissions-context';
import { useUpdateCharacter } from '../../use-update-character';
import { ExtraEntriesEditor } from './extra-entries-editor';

interface ProficienciesCardProps {
  character: Character;
}

type ExtraGroup = 'armor' | 'weapons' | 'tools';

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
 * (re-dérivables), de la même façon que la CA/Vitesse sont dérivées.
 *
 * M17 : `extraProficiencies` existait au schéma sans qu'aucun écran de fiche ne
 * l'écrive — « il maîtrise Survie depuis l'entraînement », « outils de
 * forgeron » n'avaient nulle part où aller. Le mode « Modifier » édite ce seul
 * tableau ; les maîtrises dérivées restent en lecture, elles se recalculent.
 */
export function ProficienciesCard({ character }: ProficienciesCardProps): JSX.Element | null {
  const { data: classes } = useContent('classes');
  const { data: backgrounds } = useContent('backgrounds');
  const { data: items } = useContent('items');
  const readOnly = useSheetReadOnly(character);
  const { updateCharacter } = useUpdateCharacter(character);
  const [editing, setEditing] = useState<boolean>(false);

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

  async function patchGroup(group: ExtraGroup, values: string[]): Promise<void> {
    await updateCharacter({
      extraProficiencies: { ...character.extraProficiencies, [group]: values },
    });
  }

  const rows: Array<{ group: ExtraGroup; label: string; values: string[] }> = [
    { group: 'armor', label: t('sheet.essence.proficiencies.armor'), values: resolved.armor },
    { group: 'weapons', label: t('sheet.essence.proficiencies.weapons'), values: resolved.weapons },
    { group: 'tools', label: t('sheet.essence.proficiencies.tools'), values: resolved.tools },
  ];
  const visibleRows = rows.filter((r) => r.values.length > 0);

  // Carte muette ET non éditable : rien à montrer. En édition on garde les trois
  // groupes, y compris les vides — c'est justement là qu'on veut ajouter.
  if (visibleRows.length === 0 && !editing) return null;

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.essence.proficiencies.title')}</h3>
        {readOnly ? null : (
          <CardAction
            aria-pressed={editing}
            aria-label={t('sheet.essence.prof.editGearAria')}
            onClick={() => setEditing((v) => !v)}
          >
            {t(editing ? 'sheet.essence.prof.done' : 'sheet.essence.prof.edit')}
          </CardAction>
        )}
      </CardHeader>

      <dl className="flex flex-col gap-3">
        {visibleRows.map((row) => (
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

      {editing ? (
        <div className="mt-5 flex flex-col gap-4 border-t border-white-8 pt-5">
          <p className="font-serif text-body-sm italic text-text-tertiary">
            {t('sheet.essence.proficiencies.editHint')}
          </p>
          {rows.map((row) => (
            <ExtraEntriesEditor
              key={row.group}
              label={row.label}
              entries={character.extraProficiencies[row.group]}
              placeholder={t('sheet.essence.proficiencies.addPlaceholder')}
              onAdd={(v) =>
                void patchGroup(row.group, [...character.extraProficiencies[row.group], v])
              }
              onRemove={(v) =>
                void patchGroup(
                  row.group,
                  character.extraProficiencies[row.group].filter((e) => e !== v),
                )
              }
            />
          ))}
        </div>
      ) : null}
    </Card>
  );
}
