/**
 * Langue effective — résolution utilisateur ↔ table (mur M46/M54 de l'audit de
 * malléabilité 2026-08).
 *
 * `campaigns/{cid}.settings.language` était au schéma depuis le plan 14, décrit
 * comme « langue par défaut de la table », et n'avait **aucun lecteur** : ni UI
 * pour le régler, ni code pour l'appliquer. Un réglage fantôme crée une attente
 * que rien ne satisfait — d'où ce résolveur, calqué à l'identique sur
 * `effectiveDiceMode` (même forme, même ordre de priorité, même défaut).
 *
 * Règle :
 *   1. L'utilisateur a tranché lui-même (Compte → Langue) → son choix gagne,
 *      partout, y compris à une table qui parle une autre langue.
 *   2. Sinon, si une campagne active porte une langue → la table gagne.
 *   3. Sinon → FR (défaut verrouillé du projet).
 *
 * Le marqueur « l'utilisateur a tranché » n'a coûté aucun champ : `users/{uid}
 * .locale` n'est écrit que par le sélecteur du compte (`setUserLocale`), jamais
 * spéculativement à la création — son absence EST le « je n'ai rien choisi ».
 */
import type { Locale } from '@/shared/lib/slices/locale-slice';

export const DEFAULT_LOCALE: Locale = 'fr';

export function effectiveLocale(
  /** Choix explicite du compte, ou `null` si l'utilisateur n'a jamais tranché. */
  userLocale: Locale | null,
  /** Langue de la campagne active, ou `null` hors table / avant chargement. */
  tableLocale: Locale | null,
): Locale {
  if (userLocale) return userLocale;
  if (tableLocale) return tableLocale;
  return DEFAULT_LOCALE;
}
