import { useState, type JSX } from 'react';

import { useCharactersList } from '@/features/library/use-characters-list';
import { Button } from '@/shared/components/button';
import { t } from '@/shared/lib/i18n';

import { LinkCharacterModal } from './link-character-modal';

interface Props {
  campaignId: string;
  /** UID du joueur courant (sa propre membership). */
  uid: string;
  /** `characterId` actuellement lié sur `members/{uid}` (ou `null`). */
  currentCharacterId: string | null;
  /** Rafraîchit le détail campagne après un link/unlink (re-fetch members). */
  onChanged: () => void;
}

/**
 * Section « Mon personnage » de l'écran détail campagne — visible uniquement
 * pour le joueur (un user qui possède un doc `members/{uid}`). Le MJ pur
 * (présent seulement dans `gmIds`) ne lie pas de fiche : il LIT celles des
 * joueurs (rule A2, JALON 4A.1).
 *
 * Détient l'unique abonnement `useCharactersList` (fiches du joueur courant) et
 * le passe à la modale présentationnelle. Résout le nom de la fiche liée pour
 * l'afficher dans la section sans second fetch.
 */
export function MyCharacterLink({
  campaignId,
  uid,
  currentCharacterId,
  onChanged,
}: Props): JSX.Element {
  const { characters, isLoading } = useCharactersList();
  const [open, setOpen] = useState<boolean>(false);

  const linked =
    currentCharacterId !== null
      ? (characters.find((c) => c.id === currentCharacterId) ?? null)
      : null;

  return (
    <section className="mt-10" aria-label={t('campaigns.detail.myCharacter.aria')}>
      <h2 className="text-center font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
        {t('campaigns.detail.myCharacter.title')}
      </h2>
      <div className="mt-4 flex flex-col items-center gap-3 rounded-card-sm border border-white-8 bg-bg-3/40 px-4 py-4 sm:flex-row sm:justify-between">
        <div className="min-w-0 text-center sm:text-left">
          {currentCharacterId === null ? (
            <p className="font-serif text-body-sm italic text-text-secondary">
              {t('campaigns.detail.myCharacter.none')}
            </p>
          ) : linked ? (
            <>
              <p className="truncate font-display text-body uppercase tracking-[0.14em] text-gold-bright">
                {linked.name}
              </p>
              <p className="mt-0.5 font-serif text-meta text-text-tertiary">
                {t('campaigns.detail.myCharacter.levelPrefix')} {linked.totalLevel}
              </p>
            </>
          ) : (
            <p className="font-serif text-body-sm italic text-text-tertiary">
              {isLoading
                ? t('campaigns.detail.myCharacter.loading')
                : t('campaigns.detail.myCharacter.unknown')}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
          tooltip={t('campaigns.tip.linkCharacter')}
        >
          {currentCharacterId === null
            ? t('campaigns.detail.myCharacter.link')
            : t('campaigns.detail.myCharacter.change')}
        </Button>
      </div>

      {open ? (
        <LinkCharacterModal
          campaignId={campaignId}
          uid={uid}
          currentCharacterId={currentCharacterId}
          characters={characters}
          charactersLoading={isLoading}
          onClose={() => setOpen(false)}
          onLinked={() => {
            setOpen(false);
            onChanged();
          }}
        />
      ) : null}
    </section>
  );
}
