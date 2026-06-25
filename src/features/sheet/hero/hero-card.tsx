import { useMemo } from 'react';

import { LevelUpButton } from '@/features/level-up/level-up-button';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { Icon } from '@/shared/components/icon';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { useFieldLocked, usePermissionContext } from '../permissions-context';
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
  const { data: backgrounds } = useContent('backgrounds');
  // Le passage de niveau / l'ajout de classe écrivent la fiche → réservés au
  // propriétaire. En lecture MJ (`!canEdit`, JALON 4A.3) le bouton disparaît :
  // le meneur consulte, il ne fait pas monter le joueur de niveau.
  const { canEdit } = usePermissionContext();
  // Omni-edit MJ (plan 26 step 3) : le nom est réservé au propriétaire. On le
  // signale sous le titre par un cadenas — la barrière réelle est la rule.
  const nameLocked = useFieldLocked('name');

  const ancestryName = useMemo(() => {
    const ancestry = ancestries.find((a) => a.id === character.ancestryId);
    return ancestry ? localize(ancestry.name) : character.ancestryId;
  }, [ancestries, character.ancestryId]);

  // Historique : présent sur la fiche aux côtés de l'espèce (« Humain · Soldat »).
  // L'id est stocké mais n'était affiché nulle part — le joueur perdait de vue
  // son historique après création. `null` si non résolu (le bundle peut ne pas
  // être encore chargé, ou un historique custom non présent) → segment omis,
  // jamais de slug brut affiché.
  const backgroundName = useMemo(() => {
    const background = backgrounds.find((b) => b.id === character.backgroundId);
    return background ? localize(background.name) : null;
  }, [backgrounds, character.backgroundId]);

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

      {nameLocked ? (
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-soft bg-bg-3/40 px-2.5 py-1 font-title text-meta uppercase tracking-[0.14em] text-text-tertiary">
          <Icon name="i-shield" className="h-3 w-3 text-gold-bright/70" />
          {t('sheet.dmEdit.fieldLocked')}
        </span>
      ) : null}

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
        {backgroundName ? <> · {backgroundName}</> : null}
      </p>

      <Chip variant="gold" className="mt-3">
        {character.alignment}
      </Chip>

      {canEdit ? (
        <div className="mt-4">
          <LevelUpButton character={character} />
        </div>
      ) : null}
    </section>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}
