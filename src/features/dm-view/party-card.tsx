import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { HeroEmblem } from '@/features/sheet/hero/hero-emblem';
import { Chip } from '@/shared/components/chip';
import { GlassPanel } from '@/shared/components/glass-panel';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

interface PartyCardProps {
  character: Character;
}

/**
 * Carte de la « party » vue MJ — plus dense que `library/CharacterCard` :
 * affiche en un coup d'œil l'état combat (PV barre + chiffres, CA, INIT,
 * niveau, conditions actives) pour permettre au meneur de jauger le groupe
 * sans ouvrir chaque fiche. Tap → ouvre la fiche en mode DM.
 *
 * Lecture seule en S1 — pas d'inline-edit ici (le DM clique sur la card et
 * édite dans la fiche). L'édition inline arrivera plus tard si l'UAT le
 * réclame.
 */
export function PartyCard({ character }: PartyCardProps): JSX.Element {
  const navigate = useNavigate();
  const { data: classes } = useContent('classes');
  const { data: ancestries } = useContent('ancestries');
  const { data: conditions } = useContent('conditions');

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

  const activeConditions = useMemo(() => {
    const byId = new Map(conditions.map((c) => [c.id, c]));
    return character.conditions.map((id) => {
      const c = byId.get(id);
      return c ? localize(c.name) : id;
    });
  }, [character.conditions, conditions]);

  const portraitLetter = (character.portrait.value || character.name[0] || '?').toUpperCase();
  const isDead = character.status === 'dead';

  // Barre PV — pourcentage borné [0,100] pour éviter une barre qui dépasse
  // visuellement quand `hp.current > hp.max` (cas rare en pratique : DM qui
  // overheal sans contraindre côté input).
  const hpPercent = character.hp.max > 0
    ? Math.min(100, Math.max(0, Math.round((character.hp.current / character.hp.max) * 100)))
    : 0;
  // Couleur de la barre selon le pourcentage — palette tokens design system.
  // < 25 % : crimson (danger) · < 60 % : ruby (alerte) · sinon : emerald (sain).
  const hpTone =
    hpPercent < 25
      ? 'bg-crimson'
      : hpPercent < 60
        ? 'bg-ruby'
        : 'bg-emerald';

  const initSign = character.initiative >= 0 ? '+' : '';

  return (
    <GlassPanel
      as="article"
      role="button"
      tabIndex={0}
      aria-label={`${t('dm.party.openSheet')} ${character.name}`}
      onClick={() => navigate(`/character/${character.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/character/${character.id}`);
        }
      }}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-3 p-4 transition-all duration-150',
        'hover:border-gold-bright hover:shadow-[0_0_24px_rgba(220,184,108,0.22)]',
        'active:scale-[0.98]',
        isDead && 'opacity-70 grayscale-[0.5]',
      )}
    >
      <header className="flex items-center gap-3">
        <div className="flex-shrink-0 scale-[0.45] origin-center">
          <HeroEmblem
            hp={character.hp.current}
            hpMax={character.hp.max}
            letter={portraitLetter}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-bold uppercase tracking-[0.14em] text-gold-bright">
            {character.name}
          </h3>
          <p className="mt-0.5 truncate font-serif text-body-sm text-text-secondary">
            <strong className="font-semibold text-gold">{subtitle}</strong>
          </p>
          <p className="truncate font-serif text-meta italic text-text-tertiary">
            {ancestryName}
          </p>
        </div>
        {isDead && (
          <Chip variant="damage">{t('library.card.deadLabel')}</Chip>
        )}
      </header>

      {/* Stat strip MJ — PV barre + 3 chips CA / INIT */}
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <span className="font-title text-[9px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
              {t('dm.party.hpLabel')}
            </span>
            <span className="font-display text-[14px] font-semibold tracking-tight text-text">
              {character.hp.current}
              <span className="text-text-tertiary"> / </span>
              <span className="text-text-tertiary">{character.hp.max}</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-3/60">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-300 ease-base',
                hpTone,
              )}
              style={{ width: `${hpPercent}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
        <PartyStat label={t('dm.party.acLabel')} value={`${character.ac}`} />
        <PartyStat label={t('dm.party.initLabel')} value={`${initSign}${character.initiative}`} />
      </div>

      {/* Conditions actives — rangée de chips compacte ; absente si rien */}
      {activeConditions.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t('dm.party.conditionsAria')}>
          {activeConditions.map((label) => (
            <li key={label}>
              <span className="inline-flex rounded-pill border border-crimson/40 bg-crimson/10 px-2 py-0.5 font-title text-[9px] font-bold uppercase tracking-[0.14em] text-crimson">
                {label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}

function PartyStat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex min-w-[48px] flex-col items-center rounded-card-sm border border-white-8 bg-ink/40 px-2.5 py-1.5">
      <span className="font-title text-[9px] font-bold uppercase tracking-[0.14em] text-text-tertiary">
        {label}
      </span>
      <span className="font-display text-[15px] font-semibold leading-tight text-gold-bright">
        {value}
      </span>
    </div>
  );
}
