import { useId, useState, type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { DetailModal } from '@/shared/components/detail-modal';
import { Divider } from '@/shared/components/divider';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import { linkCharacterToMembership } from '@/shared/lib/services/campaigns';
import type { Character } from '@/shared/types/character';

interface Props {
  campaignId: string;
  /** UID du joueur courant — c'est SA membership et SA fiche qui sont écrites. */
  uid: string;
  /** Fiche actuellement liée (ou `null` si aucune). Sert d'état initial du choix. */
  currentCharacterId: string | null;
  /** Liste des fiches du joueur, chargée par le parent (`useCharactersList`). */
  characters: Character[];
  charactersLoading: boolean;
  onClose: () => void;
  /** Appelé après un link/unlink réussi — le parent rafraîchit le détail campagne. */
  onLinked: () => void;
}

/**
 * Picker « lier un personnage » — consomme le service `linkCharacterToMembership`
 * livré au JALON 4A.1 (jusqu'ici sans aucun appelant UI).
 *
 * C'est une écriture **owner-only** : le joueur estampille `members/{uid}.characterId`
 * + `homeCampaignId` sur SA propre fiche (les 2 docs lui appartiennent). Aucune rule
 * nouvelle, aucun accès cross-user — c'est précisément la donnée que la rule de lecture
 * MJ (A2) suit en live pour autoriser le meneur à consulter la fiche.
 *
 * Présentationnel : la liste des fiches + l'état de chargement sont fournis par le
 * parent (`MyCharacterLink`) qui détient l'unique abonnement `useCharactersList`. La
 * modale est montée conditionnellement par le parent (`{open && <LinkCharacterModal/>}`)
 * — chaque ouverture remonte le composant, donc `useState(currentCharacterId)` se
 * réinitialise proprement sans `useEffect` de synchro.
 */
export function LinkCharacterModal({
  campaignId,
  uid,
  currentCharacterId,
  characters,
  charactersLoading,
  onClose,
  onLinked,
}: Props): JSX.Element {
  const titleId = useId();
  const [selected, setSelected] = useState<string | null>(currentCharacterId);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Le bouton de confirmation ne s'active que si le choix diffère du lien courant
  // (évite un write Firestore inutile quand on rouvre puis valide sans changer).
  const dirty = selected !== currentCharacterId;

  function requestClose(): void {
    if (submitting) return;
    onClose();
  }

  async function handleConfirm(): Promise<void> {
    if (submitting || !dirty) return;
    setSubmitting(true);
    setError(null);
    try {
      await linkCharacterToMembership(campaignId, uid, selected);
      onLinked();
      onClose();
    } catch {
      // Toute erreur (réseau, rules) est traitée de façon générique — l'écriture
      // est offline-safe (file d'attente Firestore), donc un échec ici est rare.
      setError(t('campaigns.linkCharacter.error.generic'));
      setSubmitting(false);
    }
  }

  return (
    <DetailModal
      open
      onClose={requestClose}
      titleId={titleId}
      closeLabel={t('campaigns.linkCharacter.close')}
      size="md"
    >
      <div className="flex flex-col gap-5 p-6">
        <header className="text-center">
          <h2
            id={titleId}
            className="font-display text-xl uppercase tracking-[0.18em] text-gold-bright"
          >
            {t('campaigns.linkCharacter.title')}
          </h2>
          <Divider className="my-3" />
          <p className="mx-auto max-w-[40ch] font-serif text-body-sm text-text-tertiary">
            {t('campaigns.linkCharacter.intro')}
          </p>
        </header>

        {charactersLoading ? (
          <p className="text-center font-serif text-body-sm text-text-tertiary">
            {t('campaigns.linkCharacter.loading')}
          </p>
        ) : characters.length === 0 ? (
          <p className="text-center font-serif text-body-sm italic text-text-secondary">
            {t('campaigns.linkCharacter.empty')}
          </p>
        ) : (
          <ul
            role="radiogroup"
            aria-label={t('campaigns.linkCharacter.listAria')}
            className="flex flex-col gap-2"
          >
            <CharacterOption
              selected={selected === null}
              label={t('campaigns.linkCharacter.noneOption')}
              onSelect={() => setSelected(null)}
            />
            {characters.map((c) => (
              <CharacterOption
                key={c.id}
                selected={selected === c.id}
                label={c.name}
                sublabel={`${t('campaigns.linkCharacter.levelPrefix')} ${c.totalLevel}`}
                isCurrent={c.id === currentCharacterId}
                onSelect={() => setSelected(c.id)}
              />
            ))}
          </ul>
        )}

        {error ? (
          <p
            role="alert"
            className="rounded-card-sm border border-crimson/40 bg-crimson/[0.08] px-3 py-2 font-serif text-body-sm text-crimson"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={requestClose}
            disabled={submitting}
          >
            {t('campaigns.linkCharacter.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={submitting || !dirty}
          >
            {submitting
              ? t('campaigns.linkCharacter.submitting')
              : t('campaigns.linkCharacter.confirm')}
          </Button>
        </div>
      </div>
    </DetailModal>
  );
}

interface CharacterOptionProps {
  selected: boolean;
  label: string;
  sublabel?: string;
  isCurrent?: boolean;
  onSelect: () => void;
}

/**
 * Option sélectionnable façon radio (bouton plein pour la cible tactile 44px).
 * `aria-checked` + `role="radio"` portent l'état au lecteur d'écran.
 */
function CharacterOption({
  selected,
  label,
  sublabel,
  isCurrent,
  onSelect,
}: CharacterOptionProps): JSX.Element {
  return (
    <li>
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-card-sm border px-4 py-3 text-left',
          'transition-colors duration-200 ease-base',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
          selected
            ? 'border-gold-bright bg-gold-bright/[0.08]'
            : 'border-white-8 bg-bg-3/40 hover:border-soft',
        )}
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-display text-body uppercase tracking-[0.12em] text-text">
            {label}
          </span>
          {sublabel ? (
            <span className="font-serif text-meta text-text-tertiary">
              {sublabel}
            </span>
          ) : null}
        </span>
        <span className="flex flex-shrink-0 items-center gap-2">
          {isCurrent ? (
            <Chip variant="gold">{t('campaigns.linkCharacter.currentSuffix')}</Chip>
          ) : null}
          <span
            aria-hidden="true"
            className={cn(
              'inline-flex h-5 w-5 items-center justify-center rounded-full border',
              selected
                ? 'border-gold-bright text-gold-bright'
                : 'border-white-8 text-transparent',
            )}
          >
            ●
          </span>
        </span>
      </button>
    </li>
  );
}
