import { t } from '@/shared/lib/i18n';
import type { GameEvent } from '@/shared/types/event';

/**
 * Rendu LÉGER d'un événement pour le feed d'activité MJ (JALON 22.3).
 *
 * Ce n'est PAS le compilateur de journal (plan 25), qui produit de la prose FR
 * groupée par session. Ici on rend une ligne concise : un libellé de `kind`
 * (i18n) + un détail dérivé du payload (valeurs déjà lisibles : le `label`
 * du jet posé par le pivot de dés, des nombres, un niveau). On NE résout PAS de
 * slug de contenu (spellId, itemRef, conditionId) — ces identifiants machine ne
 * transitent pas par le feed ; leur résolution en nom FR appartient au
 * compilateur plan 25 (qui charge les bundles).
 *
 * Terminologie FR (source d'autorité : traductions officielles D&D 5e,
 * cf. CLAUDE.md) : « État » = condition (déjà utilisé par `dm.party.conditionsAria`),
 * « Emplacement » = spell slot, « Sort mineur » = cantrip (`spell.level.cantrip`),
 * « PV » = hit points.
 */

export interface EventLineParts {
  /** Libellé du type d'événement, traduit (jamais un identifiant machine). */
  kindLabel: string;
  /** Détail dérivé du payload (déjà lisible) ou `null` si aucun. */
  detail: string | null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Niveau de sort/emplacement → détail FR (« Sort mineur » pour 0, sinon « Niveau N »). */
function levelDetail(level: number | null): string | null {
  if (level === null) return null;
  if (level === 0) return t('spell.level.cantrip');
  return `${t('campaigns.detail.eventFeed.levelPrefix')}${level}`;
}

/**
 * Réduit un événement à `{ kindLabel, detail }`. Couvre les `kind` que
 * l'event-logger produit réellement aujourd'hui (22.1/22.2) + `dm-secret-roll`
 * (à venir, peu coûteux). Tout `kind` non mappé retombe sur un libellé générique
 * — jamais l'identifiant machine brut.
 */
export function summarizeEvent(
  event: Pick<GameEvent, 'kind' | 'payload'>,
): EventLineParts {
  const p = event.payload;
  switch (event.kind) {
    case 'roll': {
      const label = asString(p.label);
      const total = asNumber(p.total);
      const detail =
        label !== null && total !== null
          ? `${label} · ${total}`
          : (label ?? (total !== null ? String(total) : null));
      return { kindLabel: t('campaigns.detail.eventFeed.kind.roll'), detail };
    }
    case 'hp-change': {
      const before = asNumber(p.before);
      const after = asNumber(p.after);
      const detail =
        before !== null && after !== null ? `${before} → ${after}` : null;
      return { kindLabel: t('campaigns.detail.eventFeed.kind.hpChange'), detail };
    }
    case 'temp-hp': {
      const after = asNumber(p.after);
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.tempHp'),
        detail: after !== null ? String(after) : null,
      };
    }
    case 'condition-add':
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.conditionAdd'),
        detail: null,
      };
    case 'condition-remove':
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.conditionRemove'),
        detail: null,
      };
    case 'spell-cast':
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.spellCast'),
        detail: levelDetail(asNumber(p.level)),
      };
    case 'slot-consumed':
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.slotConsumed'),
        detail: levelDetail(asNumber(p.slotLevel)),
      };
    case 'slot-restored':
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.slotRestored'),
        detail: null,
      };
    case 'item-acquired':
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.itemAcquired'),
        detail: null,
      };
    case 'item-removed':
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.itemRemoved'),
        detail: null,
      };
    case 'dm-secret-roll': {
      const total = asNumber(p.total);
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.secretRoll'),
        detail: total !== null ? String(total) : null,
      };
    }
    default:
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.generic'),
        detail: null,
      };
  }
}

/**
 * Narrow un `createdAt` Firestore (typé `unknown` au schéma) en `Date`.
 * Accepte un `Timestamp` (`.toDate()`), une `Date`, ou un nombre de ms.
 */
export function eventCreatedAtToDate(createdAt: unknown): Date | null {
  if (createdAt instanceof Date) return createdAt;
  if (typeof createdAt === 'number' && Number.isFinite(createdAt)) {
    return new Date(createdAt);
  }
  if (
    typeof createdAt === 'object' &&
    createdAt !== null &&
    'toDate' in createdAt &&
    typeof (createdAt as { toDate: unknown }).toDate === 'function'
  ) {
    const d = (createdAt as { toDate: () => unknown }).toDate();
    return d instanceof Date ? d : null;
  }
  return null;
}

const TIME_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Heure absolue « HH:mm » d'un événement, ou `''` si le timestamp n'est pas
 * encore résolu (un `serverTimestamp()` est `null` localement le temps de
 * l'aller-retour serveur — le feed affiche alors juste l'événement sans heure).
 */
export function formatEventTime(createdAt: unknown): string {
  const date = eventCreatedAtToDate(createdAt);
  return date === null ? '' : TIME_FORMAT.format(date);
}
