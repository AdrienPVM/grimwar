import type { Campaign } from '@/shared/types/campaign';
import type { Encounter } from '@/shared/types/encounter';
import type { Session } from '@/shared/types/session';

/** Ce qui est en cours dans UNE campagne, tel que sondé par `useOngoingPlay`. */
export interface OngoingCandidate {
  campaign: Campaign;
  session: Session | null;
  encounter: Encounter | null;
}

/**
 * La table que l'app doit proposer de reprendre, choisie parmi les campagnes du
 * joueur.
 *
 * Règle de priorité : un COMBAT en cours passe devant une séance en cours. Une
 * séance dure une soirée, un combat dure quelques minutes et tout le monde
 * attend son tour — c'est l'état le plus périssable, donc celui qu'on propose
 * de rejoindre en premier. À défaut, une séance ouverte suffit.
 *
 * Fonction pure et séparée du hook exprès : c'est la seule règle métier de la
 * fonctionnalité, et elle se teste sans Firestore ni React.
 */
export function selectOngoing(
  candidates: readonly OngoingCandidate[],
): OngoingCandidate | null {
  const withEncounter = candidates.find((c) => c.encounter !== null);
  if (withEncounter) return withEncounter;
  return candidates.find((c) => c.session !== null) ?? null;
}
