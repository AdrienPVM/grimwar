import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

import { db as dexie } from './dexie-db';
import { getDb } from './firebase';
import {
  ContentTypeSchemas,
  type ContentEntityByKey,
  type ContentTypeKey,
  type I18n,
} from '../types/content';
import { z } from 'zod';

/**
 * Loader de contenu — trois portées :
 *  - public  : `public/data/<type>.json`, mêmes pour tout le monde, cache Dexie 7 jours
 *  - user    : `users/{uid}/customContent/{type}/*` Firestore, cache Dexie courte (1h)
 *  - campaign: `campaigns/{cid}/customContent/{type}/*` Firestore, cache Dexie courte (1h)
 *
 * Les bundles publics sont validés par Zod au chargement (défense en profondeur :
 * une corruption silencieuse de public/data ne doit pas crasher l'app, juste
 * exclure les entrées invalides avec un warning console).
 */

const PUBLIC_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 jours
const PRIVATE_TTL_MS = 1000 * 60 * 60; // 1h pour user/campaign

const PUBLIC_CACHE_ID = '__public__';

/**
 * Invalidation du cache public par hash de contenu.
 *
 * Pourquoi : le TTL 7 jours ne détecte pas les changements de bundle. Adrien
 * a vécu le bug une fois (plans/DEBT.md > D7 — "Page Sorts vide pour les
 * lanceurs") : le bundle disque avait été régénéré FR → EN, mais le cache
 * Dexie servait toujours l'ancien FR pendant 7j → SpellsStep filtrait sur
 * `'wizard'` contre des `classes: ['magicien']` → liste vide.
 *
 * Solution : `scripts/build-public-content.ts` écrit un sha-256 du bundle
 * dans `public/data/index.json` (clé `contentHash`). Au premier
 * `loadPublicContent` d'une session, on fetch `index.json`, on compare au
 * hash stocké dans Dexie. Différent → on vide les rows publiques.
 *
 * Mémoisé par module — un seul round-trip réseau par session, partagé entre
 * tous les appels concurrents. Le TTL 7j reste comme garde-fou secondaire.
 *
 * Offline-safe : si `fetch('/data/index.json')` échoue (réseau coupé), on
 * sert le cache existant sans crasher. C'est une PWA, le boot doit marcher
 * sur "phone in a cave" (CLAUDE.md > Project overview).
 */
const PUBLIC_HASH_SETTINGS_KEY = 'public:contentHash';

let publicCacheFreshnessPromise: Promise<void> | null = null;

async function clearAllPublicContent(): Promise<void> {
  // On ne peut pas filtrer par `where('id').equals(PUBLIC_CACHE_ID)` parce que
  // la PK composite est `[type+id]`. On scanne toutes les rows et on supprime
  // celles dont l'id correspond au scope public — c'est borné par le nombre
  // de types (~12), pas de souci de perf.
  const rows = await dexie.content.toArray();
  const toDelete: [string, string][] = [];
  for (const row of rows) {
    if (row.id === PUBLIC_CACHE_ID) toDelete.push([row.type, row.id]);
  }
  if (toDelete.length > 0) {
    await dexie.content.bulkDelete(toDelete);
  }
}

async function ensurePublicCacheFreshness(): Promise<void> {
  if (publicCacheFreshnessPromise) return publicCacheFreshnessPromise;
  publicCacheFreshnessPromise = (async (): Promise<void> => {
    let response: Response;
    try {
      response = await fetch('/data/index.json', { cache: 'no-cache' });
    } catch {
      // Réseau coupé — on garde le cache existant. C'est une PWA, le boot
      // hors-ligne doit fonctionner.
      console.warn('[content-loader] index.json indisponible (offline?) — cache public servi tel quel');
      return;
    }
    if (!response.ok) {
      console.warn(
        `[content-loader] index.json HTTP ${response.status} — cache public servi tel quel`,
      );
      return;
    }
    let index: { contentHash?: unknown };
    try {
      index = (await response.json()) as { contentHash?: unknown };
    } catch {
      console.warn('[content-loader] index.json JSON invalide — cache public servi tel quel');
      return;
    }
    const remoteHash = typeof index.contentHash === 'string' ? index.contentHash : null;
    if (!remoteHash) {
      // Index sans contentHash — fallback comportement legacy (TTL only).
      // Garde-fou pour les déploiements pré-fix.
      return;
    }
    const stored = await dexie.settings.get(PUBLIC_HASH_SETTINGS_KEY);
    const localHash = typeof stored?.value === 'string' ? stored.value : null;
    if (localHash === remoteHash) return;
    await clearAllPublicContent();
    await dexie.settings.put({ key: PUBLIC_HASH_SETTINGS_KEY, value: remoteHash });
  })();
  return publicCacheFreshnessPromise;
}

/** Reset hook — utilisé par les tests pour rejouer la freshness check entre cas. */
export function __resetPublicCacheFreshness(): void {
  publicCacheFreshnessPromise = null;
}

export type ContentScope = 'public' | 'user' | 'campaign';

function cacheKey(scope: ContentScope, type: ContentTypeKey, scopeId?: string): [string, string] {
  if (scope === 'public') return [type, PUBLIC_CACHE_ID];
  return [type, `${scope}:${scopeId ?? ''}`];
}

function ttlFor(scope: ContentScope): number {
  return scope === 'public' ? PUBLIC_TTL_MS : PRIVATE_TTL_MS;
}

function readCache(
  scope: ContentScope,
  type: ContentTypeKey,
  scopeId?: string,
): Promise<{ data: unknown; fetchedAt: number } | undefined> {
  return dexie.content.get(cacheKey(scope, type, scopeId));
}

async function writeCache(
  scope: ContentScope,
  type: ContentTypeKey,
  data: unknown,
  scopeId?: string,
): Promise<void> {
  const [keyType, keyId] = cacheKey(scope, type, scopeId);
  await dexie.content.put({ id: keyId, type: keyType, data, fetchedAt: Date.now() });
}

// ─────────────────────────────────────────────────────────────────────
// Public bundles
// ─────────────────────────────────────────────────────────────────────

export async function loadPublicContent<K extends ContentTypeKey>(
  type: K,
): Promise<ContentEntityByKey[K][]> {
  // Première étape de chaque session : vérifier qu'un build récent ne nous a
  // pas laissés sur un cache obsolète. Si le hash a changé, on vide tout le
  // scope public avant de servir la moindre requête (cf. plans/DEBT.md > D7).
  await ensurePublicCacheFreshness();

  const cached = await readCache('public', type);
  if (cached && Date.now() - cached.fetchedAt < ttlFor('public')) {
    return cached.data as ContentEntityByKey[K][];
  }

  const response = await fetch(`/data/${type}.json`, { cache: 'no-cache' });
  if (!response.ok) {
    if (cached) return cached.data as ContentEntityByKey[K][];
    throw new Error(
      `[content-loader] /data/${type}.json indisponible (status ${response.status}).`,
    );
  }

  const raw = (await response.json()) as unknown;
  const arraySchema = z.array(ContentTypeSchemas[type]);
  const parsed = arraySchema.safeParse(raw);
  if (!parsed.success) {
    // Validation defense-in-depth : on filtre les invalides plutôt que de
    // faire planter toute l'app si un build a glissé une entrée corrompue.
    const items = (Array.isArray(raw) ? raw : []) as unknown[];
    const valid = items.filter((item) => ContentTypeSchemas[type].safeParse(item).success);
    console.warn(
      `[content-loader] ${type}: ${items.length - valid.length} entrée(s) invalide(s) ignorée(s)`,
    );
    await writeCache('public', type, valid);
    return valid as ContentEntityByKey[K][];
  }

  await writeCache('public', type, parsed.data);
  return parsed.data as ContentEntityByKey[K][];
}

export async function invalidatePublicContent(type: ContentTypeKey): Promise<void> {
  await dexie.content.delete(cacheKey('public', type));
}

/** Invalide le cache user (utile après création d'un objet maison). */
export async function invalidateUserContent(
  type: ContentTypeKey,
  userId: string,
): Promise<void> {
  await dexie.content.delete(cacheKey('user', type, userId));
}

// ─────────────────────────────────────────────────────────────────────
// User & campaign content (Firestore)
// ─────────────────────────────────────────────────────────────────────

async function loadFromFirestore<K extends ContentTypeKey>(
  collectionPath: string,
  type: K,
): Promise<ContentEntityByKey[K][]> {
  const firestore = getDb();
  const colRef = collection(firestore, collectionPath);
  const snapshot = await getDocs(colRef);
  const entities: ContentEntityByKey[K][] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as unknown;
    const parsed = ContentTypeSchemas[type].safeParse(data);
    if (parsed.success) {
      entities.push(parsed.data as ContentEntityByKey[K]);
    } else {
      console.warn(
        `[content-loader] ${collectionPath}/${docSnap.id}: schema invalide, ignoré`,
        parsed.error.errors,
      );
    }
  });
  return entities;
}

export async function loadUserContent<K extends ContentTypeKey>(
  type: K,
  userId: string,
): Promise<ContentEntityByKey[K][]> {
  const cached = await readCache('user', type, userId);
  if (cached && Date.now() - cached.fetchedAt < ttlFor('user')) {
    return cached.data as ContentEntityByKey[K][];
  }
  const path = `users/${userId}/customContent/${type}`;
  const entities = await loadFromFirestore(path, type);
  await writeCache('user', type, entities, userId);
  return entities;
}

export async function loadCampaignContent<K extends ContentTypeKey>(
  type: K,
  campaignId: string,
): Promise<ContentEntityByKey[K][]> {
  const cached = await readCache('campaign', type, campaignId);
  if (cached && Date.now() - cached.fetchedAt < ttlFor('campaign')) {
    return cached.data as ContentEntityByKey[K][];
  }
  const path = `campaigns/${campaignId}/customContent/${type}`;
  const entities = await loadFromFirestore(path, type);
  await writeCache('campaign', type, entities, campaignId);
  return entities;
}

// ─────────────────────────────────────────────────────────────────────
// Resolution + search
// ─────────────────────────────────────────────────────────────────────

interface ResolveOptions {
  scope: ContentScope;
  scopeId?: string;
}

export async function resolveContent<K extends ContentTypeKey>(
  type: K,
  contentId: string,
  options: ResolveOptions,
): Promise<ContentEntityByKey[K] | null> {
  if (options.scope === 'public') {
    const entries = await loadPublicContent(type);
    return entries.find((e) => (e as { id: string }).id === contentId) ?? null;
  }
  if (options.scope === 'user') {
    if (!options.scopeId) throw new Error('resolveContent: scopeId required for user scope');
    // Fast-path : si l'entrée existe, on la retourne sans charger toute la collection.
    const firestore = getDb();
    const docRef = doc(firestore, `users/${options.scopeId}/customContent/${type}/${contentId}`);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const parsed = ContentTypeSchemas[type].safeParse(snap.data());
    return parsed.success ? (parsed.data as ContentEntityByKey[K]) : null;
  }
  // campaign
  if (!options.scopeId) throw new Error('resolveContent: scopeId required for campaign scope');
  const firestore = getDb();
  const docRef = doc(
    firestore,
    `campaigns/${options.scopeId}/customContent/${type}/${contentId}`,
  );
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const parsed = ContentTypeSchemas[type].safeParse(snap.data());
  return parsed.success ? (parsed.data as ContentEntityByKey[K]) : null;
}

function localizedName(name: I18n, locale: 'fr' | 'en'): string {
  return name[locale] ?? name.fr;
}

export async function searchContent<K extends ContentTypeKey>(
  type: K,
  query: string,
  locale: 'fr' | 'en' = 'fr',
): Promise<ContentEntityByKey[K][]> {
  const normalized = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (!normalized) return [];

  const entries = await loadPublicContent(type);
  return entries.filter((entry) => {
    const e = entry as { id: string; name: I18n };
    if (e.id.includes(normalized)) return true;
    const display = localizedName(e.name, locale)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    return display.includes(normalized);
  });
}

// Index file — counts per type + contentHash for cache invalidation, also used
// by the debug route + dashboards.
export interface ContentIndex {
  generatedAt: string;
  counts: Record<string, number>;
  /** sha-256 du bundle (cf. ensurePublicCacheFreshness). Optionnel pour
   * compat avec les builds antérieurs au fix D7. */
  contentHash?: string;
}

export async function loadContentIndex(): Promise<ContentIndex> {
  const response = await fetch('/data/index.json', { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`[content-loader] index.json indisponible (${response.status})`);
  }
  return (await response.json()) as ContentIndex;
}
