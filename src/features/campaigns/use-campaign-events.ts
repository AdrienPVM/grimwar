import {
  collection,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getDb } from '@/shared/lib/firebase';
import { EventSchema, type GameEvent } from '@/shared/types/event';

/** Nombre d'événements récents retournés par le feed (plan 21 step 4 : « last 20 »). */
export const CAMPAIGN_EVENTS_LIMIT = 20;

interface UseCampaignEventsResult {
  events: GameEvent[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * S'abonne en temps réel aux derniers événements d'une campagne
 * (`campaigns/{cid}/events`) via `onSnapshot` — le feed se met à jour seul quand
 * un joueur joue (jet, dégât, sort…), sans refresh manuel (plan 21 step 9).
 *
 * CONTRAINTE DE QUERY (critique). La rule `events` filtre la lecture PAR DOC
 * selon `visibility`. Une query NON contrainte (`orderBy createdAt` seul) est
 * REJETÉE par Firestore : la rule peut deny un doc `self` d'un autre joueur, donc
 * la query entière échoue (même classe de bug que 4.0.4 — cf.
 * tests/firestore-rules.test.ts). On contraint donc à la visibilité que le
 * lecteur « provably-read » :
 *   - MJ    → `visibility in ['all','dm']` (il lit les deux quel que soit l'acteur) ;
 *   - membre → `visibility == 'all'` (sous-ensemble public).
 * Index composite requis `(visibility ASC, createdAt DESC)` — déclaré dans
 * `firestore.indexes.json`, déployé par Adrien avant la mise en prod.
 *
 * Le filtrage fin par visibilité (UX, plan 22 step 10) reste appliqué côté
 * consommateur via `canViewEvent` — la query est la barrière de sécurité, le
 * filtre client est l'affinage d'affichage.
 *
 * Un doc malformé (échec de parse Zod) est ignoré (warn greppable) sans vider le
 * feed : un événement corrompu ne doit pas masquer les autres.
 */
export function useCampaignEvents(
  campaignId: string | undefined,
  options: { isDM: boolean },
): UseCampaignEventsResult {
  const { isDM } = options;
  const { user } = useAuth();
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !campaignId) {
      setEvents([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);

    const visibilityConstraint = isDM
      ? where('visibility', 'in', ['all', 'dm'])
      : where('visibility', '==', 'all');

    const q = query(
      collection(getDb(), 'campaigns', campaignId, 'events'),
      visibilityConstraint,
      orderBy('createdAt', 'desc'),
      fbLimit(CAMPAIGN_EVENTS_LIMIT),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const parsed: GameEvent[] = [];
        for (const d of snap.docs) {
          const result = EventSchema.safeParse({ ...d.data(), id: d.id });
          if (result.success) {
            parsed.push(result.data);
          } else {
            console.warn(
              `[event-feed] event Firestore invalide ignoré (${d.id}): ${result.error.errors[0]?.message ?? 'parse error'}`,
            );
          }
        }
        setEvents(parsed);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, [user, campaignId, isDM]);

  return { events, isLoading, error };
}
