import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { HeroEmblem } from '@/features/sheet/hero/hero-emblem';
import { Chip } from '@/shared/components/chip';
import { GlassPanel } from '@/shared/components/glass-panel';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

interface CharacterCardProps {
  character: Character;
}

/**
 * Card de la grille library : tap → /character/{id}. Affiche emblème HP,
 * nom Cinzel Decorative, subtitle multi-class (« Magicien 5 / Roublard 2 »),
 * espèce, chip statut alive (or sourd) ou dead (crimson + label).
 *
 * Réutilise le pattern de subtitle multi-class de `hero-card.tsx` (plan 06).
 */
export function CharacterCard({ character }: CharacterCardProps): JSX.Element {
  const navigate = useNavigate();
  const { data: classes } = useContent('classes');
  const { data: ancestries } = useContent('ancestries');

  const subtitle = useMemo(() => {
    if (character.classes.length <= 1) {
      const only = character.classes[0];
      if (!only) return '';
      const cls = classes.find((c) => c.id === only.classId);
      const name = cls ? localize(cls.name) : only.classId;
      return `${name} · ${t('library.card.level')} ${character.totalLevel}`;
    }
    return character.classes
      .map((entry) => {
        const cls = classes.find((c) => c.id === entry.classId);
        const name = cls ? localize(cls.name) : entry.classId;
        return `${name} ${entry.level}`;
      })
      .join(' / ');
  }, [character.classes, character.totalLevel, classes]);

  const ancestryName = useMemo(() => {
    const a = ancestries.find((x) => x.id === character.ancestryId);
    return a ? localize(a.name) : character.ancestryId;
  }, [ancestries, character.ancestryId]);

  const portraitLetter = (character.portrait.value || character.name[0] || '?').toUpperCase();
  const isDead = character.status === 'dead';

  return (
    <GlassPanel
      as="article"
      role="button"
      tabIndex={0}
      aria-label={`${t('library.card.open')} ${character.name}`}
      onClick={() => navigate(`/character/${character.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/character/${character.id}`);
        }
      }}
      className={cn(
        'group relative flex cursor-pointer items-center gap-4 p-4 transition-all duration-150',
        'hover:border-gold-bright hover:shadow-[0_0_24px_rgba(220,184,108,0.22)]',
        'active:scale-[0.98]',
        isDead && 'opacity-70 grayscale-[0.5]',
      )}
    >
      <div className="flex-shrink-0 scale-[0.5] origin-center">
        <HeroEmblem
          hp={character.hp.current}
          hpMax={character.hp.max}
          letter={portraitLetter}
        />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-lg font-bold uppercase tracking-[0.14em] text-gold-bright">
          {character.name}
        </h2>
        <p className="mt-1 truncate font-serif text-body-sm text-text-secondary">
          <strong className="font-semibold text-gold">{subtitle}</strong>
        </p>
        <p className="mt-0.5 truncate font-serif text-meta italic text-text-tertiary">
          {ancestryName}
        </p>
        <div className="mt-2 flex items-center gap-2">
          {isDead ? (
            <Chip variant="damage">{t('library.card.deadLabel')}</Chip>
          ) : (
            <Chip variant="gold">{t('library.card.aliveLabel')}</Chip>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
