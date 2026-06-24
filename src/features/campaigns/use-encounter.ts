import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getDb } from '@/shared/lib/firebase';
import { EncounterSchema, type Encounter } from '@/shared/types/encounter';

interface UseEncounterResult {
  encounter: Encounter | null;
  isLoading: boolean;
  /**
   * `error` peut être :
   *   - `null` — chargement en cours ou réussi ;
   *   - `Error('encounter-not-found')` — doc absent (supprimé / ID invalide) ;
   *   - `Error` de parse Zod — doc présent mais forme invalide ;
   *   - `Error` `permission-denied` — non-membre (propagé par le listener).
   */
  error: Error | null;
}

/**
 * S'abonne EN TEMPS RÉEL au doc `campaigns/{cid}/encounters/{eid}` (step 10 du
 * plan 24, livraison 24.3). Contrairement à `useSession` (one-shot + refresh),
 * une rencontre EN COURS est partagée live entre le MJ et les joueurs : l'ordre
 * d'initiative, le round, le tour actif et les PV doivent se propager sans
 * action manuelle. D'où `onSnapshot`, pattern miroir de `useMap` / `useCharacter`.
 *
 * Le hook est READ-ONLY : toutes les écritures passent par `services/encounters.ts`
 * (start/advanceTurn/end/setParticipants), appelées dans les handlers de l'écran.
 * Cette séparation read/write évite qu'un rendu ne déclenche une boucle d'écriture.
 *
 * Rule de read consommée : `isMemberOf(cid) || isDMOf(cid)` (élargie en 24.1).
 *
 * Gating : tant que `user` ou `(campaignId, encounterId)` est absent, pas de
 * listener et `isLoading` repasse à `false` (rien à charger).
 */
export function useEncounter(
  campaignId: string | undefined,
  encounterId: string | undefined,
): UseEncounterResult {
  const { user } = useAuth();
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !campaignId || !encounterId) {
      setEncounter(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const ref = doc(getDb(), 'campaigns', campaignId, 'encounters', encounterId);
    setIsLoading(true);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setEncounter(null);
          setError(new Error('encounter-not-found'));
          setIsLoading(false);
          return;
        }
        const parsed = EncounterSchema.safeParse(snap.data());
        if (!parsed.success) {
          setEncounter(null);
          setError(new Error(`Encounter ${encounterId} invalid: ${parsed.error.message}`));
          setIsLoading(false);
          return;
        }
        setEncounter(parsed.data);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setEncounter(null);
        setError(err);
        setIsLoading(false);
      },
    );

    return () => unsub();
  }, [user, campaignId, encounterId]);

  return { encounter, isLoading, error };
}
