import { useMemo } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { localize, t } from '@/shared/lib/i18n';
import { getSkill } from '@/shared/lib/rules/skills';
import type { Character } from '@/shared/types/character';

interface StatsDashboardProps {
  character: Character;
}

interface Tile {
  label: string;
  value: string;
}

/**
 * Tableau de bord des statistiques de jeu (mode Âme).
 *
 * Lit `character.stats` (cumulé à vie, alimenté par le moteur de dés via
 * `persist-history` / event-logger) : nombre de jets, moyenne au d20, critiques,
 * échecs critiques, compétence la plus sollicitée. AUCUN calcul de règle ici —
 * pure agrégation d'affichage. La compétence fétiche résout son nom FR via le
 * registre `SKILLS` (`getSkill`), jamais une constante in-file.
 *
 * Tant qu'aucun jet n'a été lancé (`totalRolls === 0`), on affiche une ligne
 * d'état neutre plutôt que des « 0 » trompeurs partout.
 */
export function StatsDashboard({ character }: StatsDashboardProps): JSX.Element {
  const tiles = useMemo<Tile[]>(() => {
    const s = character.stats;
    const avg = s.totalRolls > 0 ? (s.totalD20Sum / s.totalRolls).toFixed(1) : '—';

    // Compétence fétiche : entrée de `skillUses` au compteur le plus élevé.
    let topSkill = '—';
    let topCount = 0;
    for (const [skillId, count] of Object.entries(s.skillUses)) {
      if (count > topCount) {
        topCount = count;
        const entry = getSkill(skillId);
        topSkill = entry ? localize(entry.name) : skillId;
      }
    }

    return [
      { label: t('sheet.ame.stats.totalRolls'), value: String(s.totalRolls) },
      { label: t('sheet.ame.stats.avgD20'), value: avg },
      { label: t('sheet.ame.stats.crits'), value: String(s.crits) },
      { label: t('sheet.ame.stats.fumbles'), value: String(s.fumbles) },
      { label: t('sheet.ame.stats.topSkill'), value: topSkill },
    ];
  }, [character.stats]);

  const hasRolls = character.stats.totalRolls > 0;

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.ame.stats.title')}</h3>
      </CardHeader>
      {hasRolls ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="flex flex-col items-center gap-1 rounded-card-sm border border-white-8 bg-white/[0.02] px-3 py-4 text-center"
            >
              <span className="font-display text-[26px] leading-none text-gold-bright">
                {tile.value}
              </span>
              <span className="font-title text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
                {tile.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-serif text-body-sm italic text-text-faint">
          {t('sheet.ame.stats.noRolls')}
        </p>
      )}
    </Card>
  );
}
