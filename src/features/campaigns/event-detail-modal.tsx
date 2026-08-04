import { useId, useState, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { GameEvent } from '@/shared/types/event';

import {
  eventDetailRows,
  formatEventDateTime,
  summarizeEvent,
} from './event-line';

interface EventDetailModalProps {
  /** Événement à détailler, ou `null` quand la modale est fermée. */
  event: GameEvent | null;
  /** Map `characterId → nom` pour étiqueter acteur/cible (cf. useLinkedCharacterNames). */
  characterNames: Record<string, string>;
  /**
   * Retire l'événement du journal. Fourni UNIQUEMENT au MJ (`allow delete: if
   * isDMOf`) — absent ⇒ aucun bouton de retrait n'est rendu.
   */
  onDelete?: (event: GameEvent) => void;
  onClose: () => void;
}

/**
 * Détail au tap d'un événement du feed (JALON 22.4, plan 21 step 4). Réutilise
 * la primitive `DetailModal` partagée (portal body, Échap/backdrop/X, focus
 * piégé). Montre l'enveloppe (type, horodatage complet, acteur, cible) + les
 * lignes de détail FR-étiquetées dérivées du payload (`eventDetailRows`).
 *
 * Aucune résolution de slug : l'acteur/la cible sont résolus par NOM via la map
 * de noms (donnée joueur, lisible par le MJ via la rule A2) ; à défaut, libellé
 * générique. Le détail du payload n'expose que des valeurs déjà lisibles.
 */
export function EventDetailModal({
  event,
  characterNames,
  onDelete,
  onClose,
}: EventDetailModalProps): JSX.Element {
  const titleId = useId();
  return (
    <DetailModal
      open={event !== null}
      onClose={onClose}
      titleId={titleId}
      closeLabel={t('campaigns.detail.eventFeed.detail.close')}
      size="sm"
    >
      {event !== null ? (
        <EventDetailContent
          event={event}
          characterNames={characterNames}
          onDelete={onDelete}
          titleId={titleId}
        />
      ) : null}
    </DetailModal>
  );
}

/** Libellé de l'acteur d'un événement : nom du personnage, sinon meneur/système. */
function actorLabel(
  event: GameEvent,
  characterNames: Record<string, string>,
): string {
  if (event.actorCharacterId !== null) {
    return (
      characterNames[event.actorCharacterId] ??
      t('campaigns.detail.eventFeed.detail.unknownCharacter')
    );
  }
  // Pas de personnage acteur : un événement `dm` est l'œuvre du meneur, sinon
  // c'est un événement système (join/leave de campagne, etc.).
  return event.visibility === 'dm'
    ? t('campaigns.detail.eventFeed.detail.dmActor')
    : t('campaigns.detail.eventFeed.detail.systemActor');
}

function targetLabel(
  event: GameEvent,
  characterNames: Record<string, string>,
): string | null {
  if (event.targetCharacterId === null) return null;
  return (
    characterNames[event.targetCharacterId] ??
    t('campaigns.detail.eventFeed.detail.unknownCharacter')
  );
}

function EventDetailContent({
  event,
  characterNames,
  onDelete,
  titleId,
}: {
  event: GameEvent;
  characterNames: Record<string, string>;
  onDelete?: (event: GameEvent) => void;
  titleId: string;
}): JSX.Element {
  // Retrait à deux temps : un journal se corrige, mais pas par mégarde.
  const [confirming, setConfirming] = useState(false);
  const { kindLabel } = summarizeEvent(event);
  const dateTime = formatEventDateTime(event.createdAt);
  const actor = actorLabel(event, characterNames);
  const target = targetLabel(event, characterNames);
  const rows = eventDetailRows(event);

  return (
    <div className="px-6 pb-6 pt-7">
      <h2
        id={titleId}
        className="pr-10 font-title text-body uppercase tracking-[0.16em] text-gold-bright"
      >
        {kindLabel}
      </h2>
      {dateTime !== '' ? (
        <time className="mt-1 block font-mono text-meta tracking-[0.12em] text-text-tertiary">
          {dateTime}
        </time>
      ) : null}

      <dl className="mt-5 flex flex-col gap-3">
        <DetailLine label={t('campaigns.detail.eventFeed.detail.actor')} value={actor} />
        {target !== null ? (
          <DetailLine
            label={t('campaigns.detail.eventFeed.detail.target')}
            value={target}
          />
        ) : null}
        {rows.map((row) => (
          <DetailLine key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>

      {rows.length === 0 && target === null ? (
        <p className="mt-4 font-serif text-body-sm italic text-text-tertiary">
          {t('campaigns.detail.eventFeed.detail.noDetail')}
        </p>
      ) : null}

      {/* Retrait MJ — la rule `allow delete: if isDMOf` est déployée depuis
          l'origine, il n'existait simplement aucun appelant (M9). */}
      {onDelete ? (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => (confirming ? onDelete(event) : setConfirming(true))}
            className={cn(
              'rounded-pill border px-3 py-1.5 font-title text-[10px] font-bold uppercase tracking-[0.14em]',
              'transition-colors duration-200 ease-base',
              confirming
                ? 'border-crimson bg-crimson/15 text-crimson hover:bg-crimson/25'
                : 'border-white-8 bg-white/[0.03] text-text-tertiary hover:border-crimson/60 hover:text-crimson',
            )}
          >
            {confirming
              ? t('campaigns.detail.eventFeed.detail.deleteConfirm')
              : t('campaigns.detail.eventFeed.detail.delete')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Ligne « libellé / valeur » d'une liste de définition (terme + description). */
function DetailLine({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white-8 pb-2 last:border-b-0 last:pb-0">
      <dt className="font-title text-meta uppercase tracking-[0.14em] text-text-tertiary">
        {label}
      </dt>
      <dd className="text-right font-serif text-body-sm text-text-secondary">
        {value}
      </dd>
    </div>
  );
}
