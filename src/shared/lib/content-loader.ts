import { db } from './dexie-db';

/**
 * Charge un type de contenu public (`spells`, `monsters`, etc.) avec cache
 * IndexedDB. Le cache expire à 7 jours pour qu'un déploiement frais propage
 * dans la semaine, sans bombarder le réseau à chaque ouverture d'app.
 *
 * Le fichier vit dans `/public/data/<type>.json` (servi par Vite + le SW).
 */
const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;
const CACHE_ID = '__bundle__';

export async function loadPublicContent<T = unknown>(type: string): Promise<T> {
  const cached = await db.content.get([type, CACHE_ID]);
  if (cached && Date.now() - cached.fetchedAt < SEVEN_DAYS_MS) {
    return cached.data as T;
  }

  const response = await fetch(`/data/${type}.json`, { cache: 'no-cache' });
  if (!response.ok) {
    // Fallback : si on a un cache même expiré, mieux vaut le servir que de
    // planter (cas offline / 404 réseau temporaire).
    if (cached) return cached.data as T;
    throw new Error(
      `[content-loader] /data/${type}.json indisponible (status ${response.status}).`,
    );
  }

  const data = (await response.json()) as T;
  await db.content.put({
    id: CACHE_ID,
    type,
    data,
    fetchedAt: Date.now(),
  });
  return data;
}

/** Force un refetch en supprimant l'entrée cache du type donné. */
export async function invalidatePublicContent(type: string): Promise<void> {
  await db.content.delete([type, CACHE_ID]);
}
