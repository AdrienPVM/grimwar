import { useMemo } from 'react';

import { LevelUpButton } from '@/features/level-up/level-up-button';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { useContent } from '@/shared/hooks/use-content';
import { localize } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { HeroEmblem } from './hero-emblem';

interface HeroCardProps {
  character: Character;
}

/**
 * Carte héros : portrait diamant (HeroEmblem) + nom Cinzel Decorative +
 * subtitle classe·espèce·niveau + chip alignement. Largeur fluide mobile-first.
 *
 * Résolution name : les ids dans `character.classes/ancestryId/backgroundId`
 * sont des slugs ; on les résout via les bundles JSON publics chargés par
 * useContent (cache Dexie 7j). Pendant le chargement initial on affiche les
 * slugs en attendant — ASCII-safe, pas de "loading..." inutile.
 */
export function HeroCard({ character }: HeroCardProps): JSX.Element {
  const { data: ancestries } = useContent('ancestries');
  const { data: classes } = useContent('classes');

  const ancestryName = useMemo(() => {
    const ancestry = ancestries.find((a) => a.id === character.ancestryId);
    return ancestry ? localize(ancestry.name) : character.ancestryId;
  }, [ancestries, character.ancestryId]);

  const primaryClassName = useMemo(() => {
    const cls = classes.find((c) => c.id === character.primaryClassId);
    return cls ? localize(cls.name) : character.primaryClassId;
  }, [classes, character.primaryClassId]);

  // Subtitle classe : pour multi-class on liste toutes les classes avec leur niveau
  // (ex: "Magicienne 3 / Roublard 2"). Pour mono-class on affiche seulement la classe.
  const classSubtitle = useMemo(() => {
    if (character.classes.length <= 1) return primaryClassName;
    return character.classes
      .map((entry) => {
        const cls = classes.find((c) => c.id === entry.classId);
        const name = cls ? localize(cls.name) : entry.classId;
        return `${name} ${entry.level}`;
      })
      .join(' / ');
  }, [character.classes, classes, primaryClassName]);

  const portraitLetter = character.portrait.value || character.name[0] || '?';

  return (
    <section
      aria-labelledby="hero-name"
      className="relative z-10 mx-auto flex w-full max-w-[420px] flex-col items-center px-4 pt-8 lg:pt-3"
    >
      <HeroEmblem
        hp={character.hp.current}
        hpMax={character.hp.max}
        letter={portraitLetter.toUpperCase()}
      />

      <h1
        id="hero-name"
        className="mt-8 text-center font-display text-2xl font-bold uppercase tracking-[0.18em] text-gold-bright"
      >
        {character.name}
      </h1>

      <Divider className="my-3" />

      <p className="text-center font-serif text-body italic text-text-secondary">
        <strong className="not-italic font-semibold text-gold-bright">{classSubtitle}</strong>
        {character.classes.length <= 1 && (
          <> · {character.classes[0]?.subclassId ? capitalize(character.classes[0].subclassId) : ''}</>
        )}
        {character.classes.length <= 1 && ' · '}
        {character.classes.length <= 1 && `Niveau ${character.totalLevel}`}
      </p>
      <p className="mt-1 text-center font-serif text-body-sm italic text-text-tertiary">
        {ancestryName}
      </p>

      <Chip variant="gold" className="mt-3">
        {character.alignment}
      </Chip>

      <div className="mt-4">
        <LevelUpButton character={character} />
      </div>
    </section>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}
