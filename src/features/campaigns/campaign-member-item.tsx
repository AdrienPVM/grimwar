import { type JSX } from 'react';

import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

import type { RosterEntry } from './roster';
import { PartyMemberCard } from './party-member-card';

interface CampaignMemberItemProps {
  entry: RosterEntry;
  /** Le spectateur est MJ de la campagne — débloque l'état live + les actions d'autorité. */
  viewerIsGm: boolean;
  /**
   * Affiche l'affordance « Promouvoir MJ ». Faux en pleine partie (roster ouvert
   * depuis une rencontre) : promouvoir quelqu'un relève de l'administration de la
   * table, pas d'un tour de jeu, et ça n'a rien à faire à côté des PV.
   */
  showPromote?: boolean;
  onPromote: () => void;
  onViewSheet: () => void;
}

/**
 * Représentation UNIQUE d'un membre dans la section « La compagnie » (plan 27 —
 * fusion roster + état). Avant, deux sections empilées affichaient les MÊMES
 * joueurs deux fois : le roster (UID + rôle + actions) et l'état de la compagnie
 * (nom + PV/CA live). C'était de la duplication pure — corrigée ici.
 *
 * Chaque membre apparaît exactement une fois, dans sa représentation la plus
 * riche disponible :
 *  - MJ + joueur avec fiche liée → carte LIVE (`PartyMemberCard`) : nom, PV, CA,
 *    états, tap → fiche en lecture seule MJ. Affordance « Promouvoir » en pied.
 *  - sinon (lignes MJ, joueurs sans fiche, OU tout spectateur non-MJ) → ligne
 *    compacte : libellé UID + chip rôle + « Promouvoir » si applicable.
 *
 * Pourquoi ce découpage : la lecture cross-owner (rule A2) n'est ouverte qu'au
 * MJ. Un joueur ne peut donc pas voir l'état live des autres → il ne voit que
 * des lignes compactes. Et une entrée MJ (issue de `gmIds`) n'a jamais de fiche
 * liée par cette UI → toujours compacte. Les cartes live sont donc toujours des
 * joueurs (`role === 'member'`).
 */
export function CampaignMemberItem({
  entry,
  viewerIsGm,
  showPromote = true,
  onPromote,
  onViewSheet,
}: CampaignMemberItemProps): JSX.Element {
  const canPromote = showPromote && viewerIsGm && entry.role === 'member';
  const showLiveCard = viewerIsGm && entry.characterId !== null;

  if (showLiveCard) {
    return (
      <div className="flex flex-col gap-2">
        <PartyMemberCard
          characterId={entry.characterId!}
          ownerUid={entry.uid}
          onOpen={onViewSheet}
        />
        {canPromote ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onPromote}
              tooltip={t('campaigns.tip.promoteGm')}
            >
              {t('campaigns.detail.roster.promote')}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-card-sm border border-white-8 bg-bg-3/40 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            'truncate text-body text-text',
            // Nom réel → serif lisible ; repli UID technique → mono + tracking.
            entry.hasName ? 'font-serif' : 'font-mono tracking-[0.16em]',
          )}
        >
          {entry.label}
        </span>
        {entry.isSelf ? (
          <span className="font-title text-meta uppercase tracking-[0.18em] text-text-tertiary">
            {t('campaigns.detail.roster.youSuffix')}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {entry.role === 'gm' ? (
          <Chip variant="gold">{t('campaigns.card.roleGm')}</Chip>
        ) : (
          <Chip variant="magic">{t('campaigns.card.roleMember')}</Chip>
        )}
        {canPromote ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onPromote}
            tooltip={t('campaigns.tip.promoteGm')}
          >
            {t('campaigns.detail.roster.promote')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
