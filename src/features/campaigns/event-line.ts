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

/**
 * Libellé FR d'un champ de fiche édité par le MJ (plan 26). Mappe les chemins
 * machine (clés de premier niveau du `Character`) vers une clé i18n. Tout champ
 * non mappé retombe sur « Autre champ » (jamais l'identifiant anglais brut — cf.
 * garde-fou anti-anglais du contenu FR). La traduction des libellés métier
 * réutilise la terminologie officielle déjà figée dans le projet.
 */
const DM_EDIT_FIELD_KEYS = [
  'hp',
  'conditions',
  'exhaustion',
  'inspiration',
  'deathSaves',
  'abilities',
  'saveProficiencies',
  'skills',
  'ac',
  'speed',
  'initiative',
  'hitDice',
  'spellSlots',
  'classResources',
  'preparedSpells',
  'knownSpells',
  'inventory',
  'featureUsage',
  'extraProficiencies',
  'experience',
  'alignment',
  'totalLevel',
  'status',
  'stats',
] as const;

function dmEditFieldLabel(field: string): string {
  const known = (DM_EDIT_FIELD_KEYS as readonly string[]).includes(field);
  return t(
    `campaigns.detail.eventFeed.dmEditField.${known ? field : 'generic'}` as Parameters<
      typeof t
    >[0],
  );
}

/** Tableau de chaînes non vide (les `fieldsChanged` du payload `dm-edit`), ou `null`. */
function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const strs = value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return strs.length > 0 ? strs : null;
}

/** Scalaire d'un snapshot `dm-edit` rendu en FR (null → « — », booléen → Oui/Non). */
function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') {
    return value
      ? t('campaigns.detail.eventFeed.value.yes')
      : t('campaigns.detail.eventFeed.value.no');
  }
  return String(value);
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
    case 'session-start':
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.sessionStart'),
        detail: asString(p.title),
      };
    case 'session-end':
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.sessionEnd'),
        detail: asString(p.title),
      };
    case 'dm-edit': {
      const fields = asStringArray(p.fieldsChanged);
      const count = fields?.length ?? 0;
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.dmEdit'),
        detail: t('campaigns.detail.eventFeed.dmEdit.summary').replace(
          '{count}',
          String(count),
        ),
      };
    }
    case 'npc-introduced':
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.npcIntroduced'),
        detail: asString(p.name),
      };
    case 'npc-attitude-changed':
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.npcAttitudeChanged'),
        detail: null,
      };
    // Jalons de vie (M44). Le détail reste dérivé de valeurs déjà lisibles —
    // `className` est un nom localisé posé par le logger, pas un slug.
    case 'level-up': {
      const level = asNumber(p.newLevel);
      const className = asString(p.className);
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.levelUp'),
        detail:
          level === null
            ? className
            : className === null
              ? t('campaigns.detail.eventFeed.levelDetail').replace('{n}', String(level))
              : `${t('campaigns.detail.eventFeed.levelDetail').replace('{n}', String(level))} · ${className}`,
      };
    }
    case 'xp-gain': {
      const delta = asNumber(p.delta);
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.xpGain'),
        // Le signe est porté explicitement : un retrait du meneur doit se lire
        // comme tel, pas comme un gain.
        detail: delta === null ? null : `${delta >= 0 ? '+' : '−'}${Math.abs(delta)} PX`,
      };
    }
    case 'death':
      return { kindLabel: t('campaigns.detail.eventFeed.kind.death'), detail: null };
    case 'revival':
      return { kindLabel: t('campaigns.detail.eventFeed.kind.revival'), detail: null };
    case 'rest':
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.rest'),
        detail: t(
          asString(p.type) === 'long'
            ? 'campaigns.detail.eventFeed.restLong'
            : 'campaigns.detail.eventFeed.restShort',
        ),
      };
    default:
      return {
        kindLabel: t('campaigns.detail.eventFeed.kind.generic'),
        detail: null,
      };
  }
}

/** Une ligne de détail FR-étiquetée pour la modale d'événement (JALON 22.4). */
export interface EventDetailRow {
  /** Libellé FR de la donnée (jamais une clé machine de payload). */
  label: string;
  /** Valeur déjà lisible (nombre, signe, énumération traduite). */
  value: string;
}

/** Entier signé pour les variations (`+3`, `-7`). */
function signed(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

/** Tableau de nombres finis non vide, ou `null` (faces de dés brutes/conservées). */
function asNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const nums = value.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  return nums.length > 0 ? nums : null;
}

/** Composantes de sort `{v,s,m}` → « V · S · M » (lettres présentes), ou `null`. */
function formatComponents(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const c = value as Record<string, unknown>;
  const parts: string[] = [];
  if (c.v === true) parts.push('V');
  if (c.s === true) parts.push('S');
  if (c.m === true) parts.push('M');
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Détail STRUCTURÉ d'un événement pour la modale « voir le détail » (plan 21
 * step 4) — une expansion FR-étiquetée de `summarizeEvent`. Mêmes principes :
 * on rend les valeurs déjà lisibles du payload (nombres, signes, énumérations
 * traduites) et on NE résout AUCUN slug de contenu (spellId, conditionId,
 * itemRef ne transitent pas — leur nom FR appartient au compilateur plan 25).
 *
 * Un kind sans détail exploitable (états, objets sans quantité) renvoie `[]` :
 * la modale affiche alors juste l'enveloppe (type, heure, acteur).
 */
export function eventDetailRows(
  event: Pick<GameEvent, 'kind' | 'payload'>,
): EventDetailRow[] {
  const p = event.payload;
  const rows: EventDetailRow[] = [];
  const push = (label: string, value: string | null): void => {
    if (value !== null && value !== '') rows.push({ label, value });
  };
  const f = (k: string): string =>
    t(`campaigns.detail.eventFeed.field.${k}` as Parameters<typeof t>[0]);

  switch (event.kind) {
    case 'roll':
    case 'dm-secret-roll': {
      push(f('label'), asString(p.label));
      const kept = asNumberArray(p.keptFaces);
      push(f('dice'), kept !== null ? kept.join(' · ') : null);
      const mod = asNumber(p.modifier);
      push(f('modifier'), mod !== null && mod !== 0 ? signed(mod) : null);
      const total = asNumber(p.total);
      push(f('total'), total !== null ? String(total) : null);
      if (p.crit === true) push(f('crit'), t('campaigns.detail.eventFeed.value.yes'));
      if (p.fumble === true)
        push(f('fumble'), t('campaigns.detail.eventFeed.value.yes'));
      break;
    }
    case 'hp-change': {
      const before = asNumber(p.before);
      const after = asNumber(p.after);
      push(f('before'), before !== null ? String(before) : null);
      push(f('after'), after !== null ? String(after) : null);
      const delta = asNumber(p.delta);
      const effectiveDelta =
        delta !== null ? delta : before !== null && after !== null ? after - before : null;
      push(f('delta'), effectiveDelta !== null ? signed(effectiveDelta) : null);
      const reason = asString(p.reason);
      push(
        f('reason'),
        reason === 'damage'
          ? t('campaigns.detail.eventFeed.reason.damage')
          : reason === 'heal'
            ? t('campaigns.detail.eventFeed.reason.heal')
            : null,
      );
      break;
    }
    case 'temp-hp': {
      const before = asNumber(p.before);
      const after = asNumber(p.after);
      push(f('before'), before !== null ? String(before) : null);
      push(f('after'), after !== null ? String(after) : null);
      break;
    }
    case 'spell-cast': {
      push(f('level'), levelDetail(asNumber(p.level)));
      const slot = asNumber(p.slotConsumed);
      push(f('slot'), slot !== null ? levelDetail(slot) : null);
      push(f('components'), formatComponents(p.components));
      break;
    }
    case 'slot-consumed':
    case 'slot-restored': {
      push(f('slot'), levelDetail(asNumber(p.slotLevel)));
      const count = asNumber(p.count);
      push(f('count'), count !== null ? String(count) : null);
      break;
    }
    case 'item-acquired':
    case 'item-removed': {
      const qty = asNumber(p.qty);
      push(f('quantity'), qty !== null ? String(qty) : null);
      break;
    }
    case 'dm-edit': {
      // Récapitulatif d'audit (plan 26 step 6) : la liste FR des champs touchés,
      // puis un before → after par champ scalaire capturé (`changes`).
      const fields = asStringArray(p.fieldsChanged);
      if (fields !== null) {
        push(
          t('campaigns.detail.eventFeed.dmEdit.fieldsRow'),
          fields.map(dmEditFieldLabel).join(' · '),
        );
      }
      const changes = p.changes;
      if (typeof changes === 'object' && changes !== null) {
        for (const [field, change] of Object.entries(
          changes as Record<string, unknown>,
        )) {
          if (typeof change !== 'object' || change === null) continue;
          const c = change as { before?: unknown; after?: unknown };
          push(
            dmEditFieldLabel(field),
            `${formatScalar(c.before)} → ${formatScalar(c.after)}`,
          );
        }
      }
      break;
    }
    default:
      break;
  }
  return rows;
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

const DATETIME_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Date + heure complètes (« 23 juin 2026, 14:05 ») pour la modale de détail —
 * la ligne du feed ne montre que l'heure, le détail montre le jour. `''` si le
 * timestamp n'est pas encore résolu (serverTimestamp local null).
 */
export function formatEventDateTime(createdAt: unknown): string {
  const date = eventCreatedAtToDate(createdAt);
  return date === null ? '' : DATETIME_FORMAT.format(date);
}
