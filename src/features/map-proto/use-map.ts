import { collection, doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getDb } from '@/shared/lib/firebase';
import {
  mapMetaSchema,
  mapTokenSchema,
  type MapMeta,
  type MapToken,
} from '@/shared/types/map';

interface UseMapResult {
  map: MapMeta | null;
  tokens: readonly MapToken[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * S'abonne en temps réel au doc `campaigns/{cid}/maps/{mid}` et à sa sous-
 * collection `tokens/{tid}`. Pattern miroir de `useCharacter` (single doc
 * + collection) — deux listeners `onSnapshot`, last-write-wins via
 * `updatedAt` (champ Firestore Timestamp posé côté service).
 *
 * Le hook ne pousse aucune écriture — c'est `services/maps.ts` (créé sur
 * mesure pour chaque action MJ) qui appelle `setDoc(... { merge: true })`
 * avec `serverTimestamp()`. Cette séparation read-only/write-only évite
 * qu'un composant ne déclenche une boucle d'écriture par erreur.
 *
 * Gating : tant que `user` ou `(campaignId, mapId)` est absent, le hook
 * reste en `isLoading=true` et n'établit pas de listener.
 *
 * Tokens : les docs invalides au parse Zod sont filtrés (pas de toute-fail
 * façon parallèle à `use-characters-list.ts`), sans throw — un token
 * cassé ne doit pas masquer les 59 autres. Erreur racine (map elle-même)
 * → `error`.
 *
 * CHANTIER D nuit 3 — data-layer minimal. L'UI consommatrice
 * (`MapProtoScreen` actuel = local-only) sera migrée vers ce hook en
 * chantier UI dédié.
 */
export function useMap(
  campaignId: string | undefined,
  mapId: string | undefined,
): UseMapResult {
  const { user } = useAuth();
  const [map, setMap] = useState<MapMeta | null>(null);
  const [tokens, setTokens] = useState<readonly MapToken[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !campaignId || !mapId) {
      setMap(null);
      setTokens([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const db = getDb();
    const mapRef = doc(db, 'campaigns', campaignId, 'maps', mapId);
    const tokensRef = collection(
      db,
      'campaigns',
      campaignId,
      'maps',
      mapId,
      'tokens',
    );

    setIsLoading(true);

    const unsubMap = onSnapshot(
      mapRef,
      (snap) => {
        if (!snap.exists()) {
          setMap(null);
          setIsLoading(false);
          return;
        }
        const parsed = mapMetaSchema.safeParse({ id: snap.id, ...snap.data() });
        if (!parsed.success) {
          setError(new Error(`Map ${mapId} invalid: ${parsed.error.message}`));
          setMap(null);
          setIsLoading(false);
          return;
        }
        setMap(parsed.data);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
    );

    const unsubTokens = onSnapshot(
      tokensRef,
      (snap) => {
        const next: MapToken[] = [];
        for (const docSnap of snap.docs) {
          const parsed = mapTokenSchema.safeParse({
            id: docSnap.id,
            ...docSnap.data(),
          });
          // Un token invalide ne casse pas le rendu — on l'ignore.
          if (parsed.success) next.push(parsed.data);
        }
        setTokens(next);
      },
      (err) => {
        // Tokens en sous-collection : si lire échoue, c'est probablement
        // un problème de rules sur la map parent ; l'erreur racine
        // remontera via `unsubMap`. On ne double-signale pas ici.
        console.warn('useMap tokens listener error', err);
      },
    );

    return () => {
      unsubMap();
      unsubTokens();
    };
  }, [user, campaignId, mapId]);

  return { map, tokens, isLoading, error };
}
