import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { listSessions } from '@/shared/lib/services/sessions';
import type { Session } from '@/shared/types/session';

interface UseSessionsResult {
  sessions: Session[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Liste les sessions d'une campagne (`campaigns/{cid}/sessions`), triées par
 * numéro décroissant côté service (`listSessions`, 23.1). Wrap fin, même
 * stratégie que `useMyCampaigns` / `useCampaign` : **fetch one-shot + refresh
 * manuel**, pas de `onSnapshot`.
 *
 * Justification (identique aux hooks campagnes 4.0.4/4.0.5) : volume bas (une
 * campagne a typiquement quelques dizaines de séances sur sa vie), mutations
 * user-initiated (le MJ planifie/démarre/clôt depuis l'UI), refresh appelé après
 * chaque mutation réussie. Le temps-réel sur la liste viendra si l'usage le
 * justifie ; 23.4 câblera le pointeur `activeSessionId` (Zustand) qui est la
 * seule donnée de session réellement « live » pendant une partie.
 *
 * Rule de read consommée : `isMemberOf(cid) || isDMOf(cid)` (élargie en 23.1).
 * Un non-membre reçoit `permission-denied` propagé tel quel dans `error`.
 *
 * Contract : { sessions, isLoading, error, refresh } — mirror de `useMyCampaigns`.
 */
export function useSessions(campaignId: string | undefined): UseSessionsResult {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  useEffect(() => {
    if (!user || !campaignId) {
      setSessions([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listSessions(campaignId)
      .then((list) => {
        if (cancelled) return;
        setSessions(list);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setSessions([]);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, campaignId, refreshCounter]);

  const refresh = useCallback(() => {
    setRefreshCounter((n) => n + 1);
  }, []);

  return { sessions, isLoading, error, refresh };
}
