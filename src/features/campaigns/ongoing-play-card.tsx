import type { JSX } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/shared/components/icon';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';

import type { OngoingCandidate } from './ongoing-play';

/**
 * Bandeau « En cours » — le raccourci de reprise de table.
 *
 * POURQUOI il existe : `SESSION_STATUSES` et `ENCOUNTER_STATUSES` portent tous
 * les deux `'active'` depuis les plans 23/24, mais aucun écran ne répondait à
 * « qu'est-ce qui se passe MAINTENANT ? ». Pour rejoindre le combat en cours, il
 * fallait accueil → Campagnes → la campagne → Rencontres → la bonne ligne :
 * quatre écrans, à la table, pendant que les autres attendent le tour. C'est le
 * défaut le plus structurant relevé par l'audit UX de `docs/plans/UX-AUDIT-2026-08.md`.
 *
 * Composant PRÉSENTATIONNEL : il ne lit rien, il reçoit `ongoing`. Le sondage
 * Firestore vit dans `useOngoingPlay`, la règle de priorité dans `selectOngoing`
 * — les trois se testent séparément.
 *
 * Rend `null` quand rien n'est en cours : c'est le cas nominal (hors séance,
 * l'accueil ne doit pas porter une carte vide « aucune partie en cours »).
 */
export function OngoingPlayCard({
  ongoing,
  className,
}: {
  ongoing: OngoingCandidate | null;
  className?: string;
}): JSX.Element | null {
  if (!ongoing) return null;
  const { campaign, session, encounter } = ongoing;

  // Le combat prime sur la séance (cf. `selectOngoing`) : quand les deux sont
  // ouverts, on emmène au combat, et la séance devient la ligne de contexte.
  const target = encounter
    ? `/campaigns/${campaign.id}/encounters/${encounter.id}`
    : `/campaigns/${campaign.id}/sessions/${session?.id ?? ''}`;

  // Le TYPE monte dans le sur-titre et le NOM devient le titre. « Combat :
  // Embuscade gobeline » sur une ligne de titre en capitales prenait trois
  // lignes sur un téléphone ; le nom seul en prend une, et « Combat » se lit
  // aussi bien à côté de « En cours ».
  const kind = encounter
    ? t('home.ongoing.kindEncounter')
    : t('home.ongoing.kindSession');
  const title = encounter ? encounter.name : (session?.title ?? '');
  const context = encounter
    ? t('home.ongoing.round').replace('{n}', String(encounter.round))
    : t('home.ongoing.sessionNumber').replace('{n}', String(session?.number ?? ''));

  return (
    <Link
      to={target}
      // Nom accessible complet : « Reprendre » seul ne dit pas QUOI on reprend
      // quand le lecteur d'écran énumère les liens de la page.
      aria-label={`${t('home.ongoing.cta')} · ${title}`}
      className={cn(
        'group flex w-full items-center gap-4 rounded-card border border-gold-bright/45 bg-gold-bright/[0.07] p-4',
        'transition-all duration-200 ease-base hover:-translate-y-px hover:border-gold-bright hover:bg-gold-bright/[0.12]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40',
        className,
      )}
    >
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-card-sm border border-gold-bright/40 bg-gold-bright/10 text-gold-bright"
        aria-hidden="true"
      >
        <Icon name={encounter ? 'i-sword' : 'i-book'} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {/*
            Pastille de présence — `animate-pulse` est le seul mouvement continu
            de l'accueil, réservé à l'état « ça se joue là, tout de suite ».
          */}
          <span
            className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-gold-bright"
            aria-hidden="true"
          />
          <span className="font-title text-meta font-bold uppercase tracking-[0.2em] text-gold-bright">
            {t('home.ongoing.label')} · {kind}
          </span>
        </span>
        {/*
          `line-clamp-2` et non `truncate` : le nom est ce qui permet de
          reconnaître sa table, le couper au premier mot le rend inutile. Deux
          lignes suffisent à tout nom réaliste et bornent la hauteur de la carte.
          Pas de `block` à côté : `line-clamp` pose son propre `display`, et les
          deux classes se disputeraient la même propriété.
        */}
        <span className="mt-1 line-clamp-2 font-display text-body font-bold uppercase tracking-[0.12em] text-text">
          {title}
        </span>
        <span className="mt-0.5 block truncate font-serif text-[12px] text-text-tertiary">
          {campaign.name} · {context}
        </span>
      </span>
      <span className="flex-shrink-0 font-title text-meta font-bold uppercase tracking-[0.18em] text-gold-bright">
        {t('home.ongoing.cta')}
      </span>
    </Link>
  );
}
