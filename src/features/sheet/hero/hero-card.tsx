import { useMemo } from 'react';

import { LevelUpButton } from '@/features/level-up/level-up-button';
import { Chip } from '@/shared/components/chip';
import { Divider } from '@/shared/components/divider';
import { Icon } from '@/shared/components/icon';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { useFieldLocked, usePermissionContext } from '../permissions-context';
import { CharacterSwitcher } from './character-switcher';
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
  const { data: subclasses } = useContent('subclasses');
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

  // Sous-classe (mono-classe uniquement) résolue À L'IDENTIQUE du bundle —
  // avant, le slug brut était capitalisé (« path-of-the-berserker » → « Path of
  // the berserker »), ce qui fuitait l'anglais en FR et ne correspondait pas au
  // nom officiel. `null` si non choisie (niveaux 1-2) ou non résolue → segment omis.
  const subclassName = useMemo(() => {
    if (character.classes.length > 1) return null;
    const subId = character.classes[0]?.subclassId;
    if (!subId) return null;
    const sub = subclasses.find((s) => s.id === subId);
    return sub ? localize(sub.name) : null;
  }, [character.classes, subclasses]);

  // Segments de la ligne d'identité APRÈS la classe (dorée). Joints par « · »
  // via filtre — plus de double séparateur « · · » quand la sous-classe manque.
  // Le niveau n'est ajouté qu'en mono-classe (en multi-classe il est déjà porté
  // par `classSubtitle` : « Magicien 3 / Roublard 2 »). Localisé (plus de
  // « Niveau » codé en dur → couvre l'EN).
  const identityTail = useMemo(() => {
    if (character.classes.length > 1) return [];
    return [subclassName, t('sheet.hero.level').replace('{n}', String(character.totalLevel))].filter(
      (seg): seg is string => Boolean(seg),
    );
  }, [character.classes.length, subclassName, character.totalLevel]);

  const portraitLetter = character.portrait.value || character.name[0] || '?';

  return (
    <section
      aria-labelledby="hero-name"
      className="relative z-10 mx-auto flex w-full max-w-[420px] flex-col items-center px-4 pt-8 lg:pt-2"
    >
      <HeroEmblem
        hp={character.hp.current}
        hpMax={character.hp.max}
        letter={portraitLetter.toUpperCase()}
      />

      <h1
        id="hero-name"
        className="mt-8 text-center font-display text-2xl font-bold uppercase tracking-[0.18em] text-gold-bright lg:mt-4"
      >
        {/* Le nom devient la porte vers les autres fiches — c'est l'endroit où
            l'on s'attend à pouvoir changer de personnage. Le composant se
            replie sur un simple texte s'il n'y a rien vers quoi basculer. */}
        <CharacterSwitcher currentId={character.id}>
          {character.name}
        </CharacterSwitcher>
      </h1>

      {nameLocked ? (
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-soft bg-bg-3/40 px-2.5 py-1 font-title text-meta uppercase tracking-[0.14em] text-text-tertiary">
          <Icon name="i-shield" className="h-3 w-3 text-gold-bright/70" />
          {t('sheet.dmEdit.fieldLocked')}
        </span>
      ) : null}

      <Divider className="my-3 lg:my-2" />

      <p className="text-center font-serif text-body italic text-text-secondary">
        <strong className="not-italic font-semibold text-gold-bright">{classSubtitle}</strong>
        {identityTail.map((seg) => (
          <span key={seg}> · {seg}</span>
        ))}
      </p>
      <p className="mt-1 text-center font-serif text-body-sm italic text-text-tertiary">
        {ancestryName}
        {backgroundName ? <> · {backgroundName}</> : null}
      </p>

      <Chip variant="gold" className="mt-3 lg:mt-2">
        {character.alignment}
      </Chip>

      {canEdit ? (
        <div className="mt-4 lg:mt-3">
          <LevelUpButton character={character} />
        </div>
      ) : null}
    </section>
  );
}
