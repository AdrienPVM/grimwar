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

// Index file — counts per type, useful for the debug route + dashboards.
export interface ContentIndex {
  generatedAt: string;
  counts: Record<string, number>;
}

export async function loadContentIndex(): Promise<ContentIndex> {
  const response = await fetch('/data/index.json', { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`[content-loader] index.json indisponible (${response.status})`);
  }
  return (await response.json()) as ContentIndex;
}
