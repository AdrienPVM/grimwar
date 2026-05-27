import {
  Timestamp,
  collection,
  onSnapshot,
  orderBy,
  query,
  type QuerySnapshot,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getDb } from '@/shared/lib/firebase';
import { mapMetaSchema, type MapMeta } from '@/shared/types/map';

interface UseMapsListResult {
  maps: readonly MapMeta[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * S'abonne en temps réel à `campaigns/{cid}/maps/*` via onSnapshot.
 *
 * Pattern miroir de `useCharactersList` (liste filtrée + parse Zod tolérant)
 * et complément de `useMap` (single doc + sous-collection tokens). Le doc
 * invalide vis-à-vis de `mapMetaSchema` n'écroule pas la liste : on logge un
 * warning et on filtre l'entrée, parité avec la même garde sur les
 * personnages — une carte ancienne ou partiellement migrée ne doit pas
 * masquer les autres.
 *
 * Tri Firestore par `updatedAt desc` (champ écrit par tous les setters de
 * `services/maps.ts`). Fallback côté client `name asc` (locale FR) si
 * `updatedAt` manque ou est égal.
 *
 * Gating : tant que `user` ou `campaignId` est absent, le hook reste en
 * `isLoading=true` et n'établit pas de listener.
 *
 * `error` n'est levé que pour une erreur de transport Firestore (rules,
 * réseau). Un doc Zod-invalide n'est pas une erreur de listing, juste un
 * warning console — comme pour `useCharactersList`.
 *
 * CHANTIER D phase 2 (tracer D.2) — préalable à l'UI MJ liste de cartes.
 */
export function useMapsList(campaignId: string | undefined): UseMapsListResult {
  const { user } = useAuth();
  const [maps, setMaps] = useState<readonly MapMeta[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !campaignId) {
      setMaps([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    const ref = collection(getDb(), 'campaigns', campaignId, 'maps');
    // orderBy('updatedAt', 'desc') : si le champ manque sur une vieille carte,
    // Firestore l'omet du résultat — c'est l'effet voulu (priorité aux cartes
    // récemment touchées). Le fallback name asc se fait côté client après filtre.
    const q = query(ref, orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snap: QuerySnapshot) => {
        const valid: MapMeta[] = [];
        snap.forEach((docSnap) => {
          const raw = docSnap.data();
          const parsed = mapMetaSchema.safeParse({ ...raw, id: docSnap.id });
          if (!parsed.success) {
            const first = parsed.error.errors[0];
            console.warn(
              `[maps] Doc Firestore invalide ignoré ${docSnap.id}: ${
                first?.path.join('.') ?? '?'
              } — ${first?.message ?? 'unknown'}`,
            );
            return;
          }
          valid.push(parsed.data);
        });
        // Fallback de tri si updatedAt manque/égalité : name asc, locale FR.
        valid.sort((a, b) => {
          const ua = (a.updatedAt as Timestamp | undefined)?.toMillis?.() ?? 0;
          const ub = (b.updatedAt as Timestamp | undefined)?.toMillis?.() ?? 0;
          if (ua !== ub) return ub - ua;
          return a.name.localeCompare(b.name, 'fr');
        });
        setMaps(valid);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, [user, campaignId]);

  return { maps, isLoading, error };
}
