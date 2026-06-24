import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getSession, SessionServiceError } from '@/shared/lib/services/sessions';
import type { Session } from '@/shared/types/session';

interface UseSessionResult {
  session: Session | null;
  isLoading: boolean;
  /**
   * `error` peut être :
   *   - `null` — chargement en cours ou réussi ;
   *   - `SessionServiceError` (`kind === 'session-not-found'`) — séance supprimée
   *     ou ID invalide ;
   *   - `Error` générique avec `permission-denied` — non-membre.
   */
  error: Error | null;
  refresh: () => void;
}

/**
 * Charge un doc `campaigns/{cid}/sessions/{sid}` unique. Stratégie identique aux
 * autres hooks campaigns (`useCampaign`, `useSessions`) : **fetch one-shot +
 * refresh manuel**, pas d'`onSnapshot`.
 *
 * Justification spécifique à l'écran séance : le MJ édite localement (notes,
 * présence) et POUSSE — il est la seule source d'écriture pendant qu'il regarde
 * l'écran, donc un re-fetch au montage + après mutation suffit. Le seul état
 * réellement « live » d'une partie est `activeSessionId` (Zustand), câblé en 23.4.
 *
 * Contract : { session, isLoading, error, refresh } — mirror de `useCampaign`.
 */
export function useSession(
  campaignId: string | undefined,
  sessionId: string | undefined,
): UseSessionResult {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  useEffect(() => {
    if (!user || !campaignId || !sessionId) {
      setSession(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getSession(campaignId, sessionId)
      .then((s) => {
        if (cancelled) return;
        setSession(s);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof SessionServiceError || err instanceof Error) {
          setError(err);
        } else {
          setError(new Error(String(err)));
        }
        setSession(null);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, campaignId, sessionId, refreshCounter]);

  const refresh = useCallback(() => {
    setRefreshCounter((n) => n + 1);
  }, []);

  return { session, isLoading, error, refresh };
}
