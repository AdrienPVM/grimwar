import { useState, type JSX } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { Tooltip } from '@/shared/components/tooltip';
import { cn } from '@/shared/lib/cn';
import { logXpGain } from '@/shared/lib/event-logger';
import { t } from '@/shared/lib/i18n';
import { xpProgress } from '@/shared/lib/rules/experience';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

interface ExperienceCardProps {
  character: Character;
  readOnly: boolean;
}

/**
 * Carte des points d'expérience (M45).
 *
 * `character.experience` était écrit à 0 par le wizard de création puis **jamais
 * relu ni réécrit** : jouer à l'XP était impossible, et le seul mode de
 * progression disponible était « le joueur monte quand il veut ». Cette carte
 * lui donne enfin une porte, dans les deux sens — le meneur attribue les 450 PX
 * de fin de séance via l'omni-edit, qui passe par le même chemin d'écriture.
 *
 * Elle N'IMPOSE RIEN. Le niveau d'XP est affiché à côté du niveau réel, et une
 * note apparaît quand les deux divergent, mais rien n'est bloqué : une table
 * joue aux jalons, une autre à l'XP, et le meneur reste souverain. Un blocage
 * dur transformerait une aide en obstacle.
 *
 * Édition : même geste que la bourse de pièces (tap pour éditer, Entrée valide,
 * Échap annule) — le patron est déjà connu du joueur.
 */
export function ExperienceCard({ character, readOnly }: ExperienceCardProps): JSX.Element {
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);
  const [editing, setEditing] = useState<boolean>(false);

  const current = character.experience;
  const progress = xpProgress(current);
  // Le niveau réel de la fiche fait foi ; celui déduit de l'XP n'est qu'une
  // information. Ils divergent légitimement (table aux jalons, meneur généreux).
  const levelMismatch = progress.level !== character.totalLevel;

  async function applyXp(value: number): Promise<void> {
    if (readOnly) return;
    const safe = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
    if (safe === current) {
      setEditing(false);
      return;
    }
    await updateCharacter({ experience: safe });
    // `xp-gain` était déclaré au schéma et explicitement listé comme non
    // journalisé — il l'est désormais, delta compris (négatif = correction).
    await logXpGain(character.id, safe - current, safe);
    setEditing(false);
    showToast({
      kind: 'roll',
      title: t('sheet.ame.xp.toastTitle'),
      big: `${safe > current ? '+' : '−'}${Math.abs(safe - current)}`,
      sub: t('sheet.ame.xp.toastSub').replace('{total}', String(safe)),
    });
  }

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.ame.xp.title')}</h3>
      </CardHeader>

      <Tooltip label={t('sheet.tip.editXp')} decorative className="w-full">
        <button
          type="button"
          disabled={readOnly || isUpdating}
          onClick={() => !editing && setEditing(true)}
          aria-label={t('sheet.ame.xp.editAria')}
          className={cn(
            'flex w-full flex-col items-center gap-1 rounded-card-sm border border-white-8 bg-ink/40 px-3 py-4',
            'transition-all duration-200 ease-base hover:-translate-y-0.5 hover:border-gold-dim',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0',
            editing && 'border-gold-bright bg-gold-bright/10',
          )}
        >
          {editing ? (
            <input
              autoFocus
              type="number"
              min={0}
              defaultValue={current}
              onBlur={(e) => void applyXp(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void applyXp(Number((e.target as HTMLInputElement).value));
                } else if (e.key === 'Escape') {
                  setEditing(false);
                }
              }}
              className="w-full bg-transparent text-center font-display text-[28px] font-bold tracking-[-0.03em] text-gold-bright outline-none"
            />
          ) : (
            <span className="font-display text-[28px] font-bold tracking-[-0.03em] text-text">
              {current.toLocaleString('fr-FR')}
            </span>
          )}
          <span className="font-title text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
            {t('sheet.ame.xp.unit')}
          </span>
        </button>
      </Tooltip>

      {/* Jauge du palier courant. Au niveau 20 elle est pleine et le libellé
          bascule — afficher « encore 0 PX » serait faux. */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.ratio * 100)}
        aria-label={t('sheet.ame.xp.progressAria')}
        className="mt-3 h-1.5 w-full overflow-hidden rounded-pill bg-white/[0.06]"
      >
        <div
          className="h-full rounded-pill bg-gold-bright/70 transition-[width] duration-300 ease-base"
          style={{ width: `${progress.ratio * 100}%` }}
        />
      </div>

      <p className="mt-2 text-center font-serif text-body-sm italic text-text-tertiary">
        {progress.toNext === null
          ? t('sheet.ame.xp.maxLevel')
          : t('sheet.ame.xp.toNext')
              .replace('{n}', progress.toNext.toLocaleString('fr-FR'))
              .replace('{level}', String(progress.level + 1))}
      </p>

      {levelMismatch ? (
        <p className="mt-2 text-center font-serif text-[11px] italic text-text-faint">
          {t('sheet.ame.xp.levelMismatch')
            .replace('{xpLevel}', String(progress.level))
            .replace('{sheetLevel}', String(character.totalLevel))}
        </p>
      ) : null}
    </Card>
  );
}
