import { type JSX } from 'react';
import { useNavigate } from 'react-router-dom';

import { PartyCard } from '@/features/dm-view/party-card';
import { useInventoryDerived } from '@/features/sheet/modes/avoir/use-inventory-derived';
import { useCharacter } from '@/features/sheet/use-character';
import { GlassPanel } from '@/shared/components/glass-panel';
import { computeDisplayedAc } from '@/shared/lib/rules/ac';
import { t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';
import type { Membership } from '@/shared/types/campaign';

import { formatUid } from './campaign-detail-screen';

interface PartyMemberCardProps {
  campaignId: string;
  /** Membership du joueur — DOIT porter un `characterId` non nul (le panneau filtre en amont). */
  member: Membership;
}

/**
 * Carte « compagnie » d'un joueur lié, vue MJ (JALON 4A.4) — wrapper temps réel
 * autour de `PartyCard` (proto MJ). S'abonne en LIVE à la fiche du joueur via
 * `useCharacter(characterId, ownerUid)` (rule A2 cross-owner, 4A.1/4A.3) : dès
 * qu'un joueur change ses PV / états sur sa fiche liée, la carte se met à jour
 * sans refresh (plan 21 step 9).
 *
 * Tap → ouvre la fiche du joueur en lecture seule MJ
 * (`/campaigns/:cid/members/:uid/sheet`, 4A.3) — PAS `/character/:id` (qui vit
 * sous le sous-arbre du MJ, pas du joueur).
 *
 * La CA affichée est la VRAIE CA (armure + Defense + magic items) calculée par
 * `computeDisplayedAc`, pas la valeur désarmée `character.ac`. Caveat cross-owner
 * connu : `useInventoryDerived` charge les items custom du USER COURANT (le MJ),
 * pas ceux du joueur — un objet `user`-scopé du joueur ne résout donc pas ici et
 * ne contribue pas à la CA (les armures SRD `public` résolvent normalement). C'est
 * une limite V1 acceptable : la quasi-totalité des armures sont du contenu public.
 */
export function PartyMemberCard({ campaignId, member }: PartyMemberCardProps): JSX.Element {
  const navigate = useNavigate();
  const { character, isLoading, error } = useCharacter(
    member.characterId ?? undefined,
    member.userId,
  );

  const openSheet = (): void =>
    navigate(`/campaigns/${campaignId}/members/${member.userId}/sheet`);

  if (isLoading) {
    return <PlaceholderCard uid={member.userId} message={t('campaigns.detail.party.cardLoading')} />;
  }
  if (error) {
    return <PlaceholderCard uid={member.userId} message={t('campaigns.detail.party.cardError')} tone="error" />;
  }
  if (!character) {
    return (
      <PlaceholderCard uid={member.userId} message={t('campaigns.detail.party.cardUnavailable')} />
    );
  }

  return <LoadedPartyMemberCard character={character} onOpen={openSheet} />;
}

/**
 * Sous-composant rendu uniquement quand la fiche est chargée : isole l'appel à
 * `useInventoryDerived` (qui exige un `Character` non nul) pour respecter les
 * règles des hooks — pas d'appel conditionnel dans le wrapper parent.
 */
function LoadedPartyMemberCard({
  character,
  onOpen,
}: {
  character: Character;
  onOpen: () => void;
}): JSX.Element {
  const derived = useInventoryDerived(character);
  const displayedAc = computeDisplayedAc({
    character,
    acFromArmor: derived.acFromArmor,
    hasEquippedBodyArmor: derived.hasEquippedBodyArmor,
    magicItemsAcBonus: derived.magicItemsAcBonus,
  });
  return <PartyCard character={character} displayedAc={displayedAc} onOpen={onOpen} />;
}

/** Carte compacte d'attente / d'erreur quand la fiche d'un membre n'est pas (encore) lisible. */
function PlaceholderCard({
  uid,
  message,
  tone = 'muted',
}: {
  uid: string;
  message: string;
  tone?: 'muted' | 'error';
}): JSX.Element {
  return (
    <GlassPanel className="flex items-center justify-between gap-3 px-4 py-5">
      <span className="truncate font-mono text-body-sm tracking-[0.16em] text-text-secondary">
        {formatUid(uid)}
      </span>
      <span
        className={
          tone === 'error'
            ? 'font-serif text-body-sm italic text-crimson'
            : 'font-serif text-body-sm italic text-text-tertiary'
        }
      >
        {message}
      </span>
    </GlassPanel>
  );
}
