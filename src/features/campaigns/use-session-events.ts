import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getDb } from '@/shared/lib/firebase';
import { EventSchema, type GameEvent } from '@/shared/types/event';

interface UseSessionEventsResult {
  events: GameEvent[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * S'abonne en temps réel aux événements d'UNE séance (`campaigns/{cid}/events`
 * filtrés `sessionId == sid`), pour l'onglet Events de l'écran de séance (plan
 * 26 step 7 — premier consommateur réel de cet onglet, jusque-là placeholder).
 *
 * MÊME contrainte de query que `useCampaignEvents` : la rule `events` filtre la
 * lecture PAR DOC selon `visibility`, donc une query non contrainte serait
 * rejetée. On contraint à la visibilité « provably-read » du rôle :
 *   - MJ    → `visibility in ['all','dm']`,
 *   - membre → `visibility == 'all'`.
 * Index composite requis `(sessionId ASC, visibility ASC, createdAt ASC)` — déjà
 * déclaré dans `firestore.indexes.json` (posé par le journal, plan 25), donc
 * AUCUN nouvel index pour cet onglet. Le filtre par `kind` (ex. `dm-edit`) est
 * appliqué CÔTÉ CLIENT par le composant — pas un 4ᵉ champ d'index.
 *
 * Ordre chronologique ASC (cohérent avec le compilateur de journal) ; le
 * composant peut réordonner pour l'affichage. Pas de `limit` : une séance est
 * bornée dans le temps (quelques dizaines à centaines d'events au plus).
 */
export function useSessionEvents(
  campaignId: string | undefined,
  sessionId: string | undefined,
  options: { isDM: boolean },
): UseSessionEventsResult {
  const { isDM } = options;
  const { user } = useAuth();
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !campaignId || !sessionId) {
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
      where('sessionId', '==', sessionId),
      visibilityConstraint,
      orderBy('createdAt', 'asc'),
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
              `[session-events] event Firestore invalide ignoré (${d.id}): ${result.error.errors[0]?.message ?? 'parse error'}`,
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
  }, [user, campaignId, sessionId, isDM]);

  return { events, isLoading, error };
}
