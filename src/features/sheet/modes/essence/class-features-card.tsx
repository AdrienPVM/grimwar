import { useMemo, useState, type JSX } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import type { I18nString } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { OrderDetailModal } from './order-detail-modal';

interface ClassFeaturesCardProps {
  character: Character;
}

interface ResolvedFeature {
  /** Clé stable (classId + level + nom) — unique même en multi-class. */
  key: string;
  level: number;
  name: I18nString;
  description: I18nString;
}

interface ClassGroup {
  classId: string;
  className: string;
  features: ResolvedFeature[];
}

/**
 * Carte « Aptitudes de classe » du mode Essence.
 *
 * Les aptitudes de classe (`classes.json[id].features[]` — Second souffle,
 * Attaque sournoise, Rage, Défense sans armure, Argot des voleurs…) étaient
 * stockées dans le bundle mais listées NULLE PART : seules quelques-unes
 * avaient une carte dédiée (Style de combat, Ordre divin/primordial,
 * Manifestations occultes) parce qu'elles portent un choix. La grande majorité
 * (passives / narratives) n'apparaissait pas. Cette carte les liste TOUTES,
 * filtrées à `feature.level <= niveau du PJ dans la classe`, multi-class aware.
 *
 * Chevauchement assumé : une poignée d'aptitudes (Style de combat, Ordre divin)
 * ont aussi leur carte spécialisée qui montre le CHOIX retenu ; ici on montre la
 * description de référence de l'aptitude. C'est le comportement des fiches
 * officielles (liste complète des aptitudes + widgets de raccourci séparés).
 *
 * Contenu dérivé du bundle (jamais de constante in-file) ; nom + description =
 * champs `name.fr` / `description.fr` exacts. Un tap = un détail (réutilise
 * `OrderDetailModal`). Disparaît (null) si aucune classe résolue n'a d'aptitude.
 */
export function ClassFeaturesCard({ character }: ClassFeaturesCardProps): JSX.Element | null {
  const { data: classes } = useContent('classes');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const groups = useMemo<ClassGroup[]>(() => {
    const result: ClassGroup[] = [];
    for (const entry of character.classes) {
      const cls = classes.find((c) => c.id === entry.classId);
      if (!cls) continue;
      const features = cls.features
        .filter((f) => f.level <= entry.level)
        .sort((a, b) => a.level - b.level)
        .map<ResolvedFeature>((f) => ({
          key: `${entry.classId}-${f.level}-${f.name.fr}`,
          level: f.level,
          name: f.name,
          description: f.description,
        }));
      if (features.length > 0) {
        result.push({ classId: entry.classId, className: localize(cls.name), features });
      }
    }
    return result;
  }, [classes, character.classes]);

  if (groups.length === 0) return null;

  const multiClass = groups.length > 1;
  const allFeatures = groups.flatMap((g) => g.features);
  const opened = openKey ? allFeatures.find((f) => f.key === openKey) ?? null : null;

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.essence.classFeatures.title')}</h3>
      </CardHeader>
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.classId} className="flex flex-col gap-2">
            {multiClass && (
              <p className="font-title text-[10px] font-bold uppercase tracking-[0.22em] text-amethyst">
                {group.className}
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {group.features.map((feature) => {
                const name = localize(feature.name);
                const description = localize(feature.description);
                const ariaLabel = t('sheet.essence.classFeatures.openLabel').replace(
                  '{name}',
                  name,
                );
                return (
                  <li key={feature.key}>
                    <button
                      type="button"
                      onClick={() => setOpenKey(feature.key)}
                      aria-label={ariaLabel}
                      aria-haspopup="dialog"
                      className="flex w-full flex-col gap-1.5 rounded-card-sm border border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.06] to-gold/[0.02] p-4 text-left transition-all duration-200 ease-base hover:-translate-y-px hover:border-gold-dim/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40"
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-display text-[16px] text-gold-bright">{name}</span>
                        <span className="shrink-0 font-title text-[9px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
                          {t('sheet.essence.classFeatures.level').replace(
                            '{level}',
                            String(feature.level),
                          )}
                        </span>
                      </span>
                      <p className="line-clamp-2 font-serif text-[13px] text-text-secondary">
                        {description}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <OrderDetailModal
        open={opened !== null}
        onClose={() => setOpenKey(null)}
        kindLabel={t('sheet.essence.classFeatures.title')}
        name={opened ? localize(opened.name) : ''}
        summary={opened ? localize(opened.description) : ''}
      />
    </Card>
  );
}
