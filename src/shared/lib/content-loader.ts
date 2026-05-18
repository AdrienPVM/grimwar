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
 * a vécu le bug plusieurs fois (plans/DEBT.md > D7 — "Page Sorts vide pour
 * les lanceurs") : le bundle disque avait changé mais le cache Dexie servait
 * toujours l'ancienne version pendant 7j → SpellsStep filtrait dans le vide.
 *
 * Solution : `scripts/build-public-content.ts` écrit un sha-256 du bundle
 * dans `public/data/index.json` (clé `contentHash`). Au premier
 * `loadPublicContent` d'une session, on fetch `index.json`, on compare au
 * hash stocké dans Dexie. Différent → on vide les rows publiques.
 *
 * Mémoïsation — sémantique SUCCÈS UNIQUEMENT (cf. bug post-13.7 du
 * 2026-05-17) : un échec (fetch throw, HTTP ≠ 2xx, JSON invalide, hash
 * absent) NE doit PAS marquer le mécanisme comme "fait" — la promesse est
 * remise à null pour que le prochain appel re-tente réellement. Sinon un
 * hoquet réseau ponctuel fige le cache obsolète jusqu'au hard refresh.
 *
 * Comportement dev vs prod sur fail de fraîcheur :
 *   - PROD (PWA hors-ligne possible, "phone in a cave") : on `console.warn`
 *     et on sert le cache existant. Le fallback est légitime offline.
 *   - DEV : on `console.error` ET on jette une erreur visible. Un échec en
 *     dev est presque toujours un vrai bug (bundle en cours d'écriture, SW
 *     fantôme, mauvais chemin) qu'il faut voir tout de suite, pas un
 *     warning noyé dans la console.
 */
const PUBLIC_HASH_SETTINGS_KEY = 'public:contentHash';

let publicCacheFreshnessPromise: Promise<void> | null = null;

/**
 * `true` en dev (Vite `import.meta.env.DEV`), `false` en build prod. Lu via
 * un wrapper pour pouvoir le stubber dans les tests sans casser le bundle
 * Vite. En contexte test (vitest), `import.meta.env.DEV` est `true` — on
 * laisse les tests décider du mode via `__setFreshnessFailMode`.
 */
type FreshnessFailMode = 'dev' | 'prod';
let freshnessFailMode: FreshnessFailMode =
  import.meta.env.DEV && !import.meta.env.VITEST ? 'dev' : 'prod';

/** Reset hook — utilisé par les tests pour rejouer la freshness check entre cas. */
export function __resetPublicCacheFreshness(): void {
  publicCacheFreshnessPromise = null;
}

/** Test-only — force le mode dev/prod pour exercer les deux branches. */
export function __setFreshnessFailMode(mode: FreshnessFailMode): void {
  freshnessFailMode = mode;
}

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

/**
 * Émet un signal d'échec de fraîcheur. En prod, un `console.warn` non
 * bloquant (cache obsolète servi est légitime hors-ligne). En dev, on jette
 * une erreur visible — un échec en dev est presque toujours un vrai bug.
 *
 * Throw est rattrapé par l'appelant : le cache obsolète est servi quand même
 * (pas de régression de UX sur les composants), mais l'erreur remonte dans
 * la promesse rejetée → visible dans la console DevTools, plus un warning
 * noyé. Le `console.error` garantit un signal aussi en cas où l'appelant
 * avale la promesse rejetée.
 */
function signalFreshnessFailure(message: string): never {
  if (freshnessFailMode === 'dev') {
    console.error(`[content-loader] ${message}`);
    throw new Error(`[content-loader] ${message}`);
  }
  console.warn(`[content-loader] ${message} — cache public servi tel quel`);
  throw new Error(`[content-loader] ${message}`);
}

async function runFreshnessCheck(): Promise<void> {
  let response: Response;
  try {
    // `?v=<timestamp>` : cache-busting URL-level pour court-circuiter un
    // éventuel SW Workbox qui aurait `/data/index.json` en SWR (cf. Bug 1
    // post-13.7). Le fix principal vit dans vite.config.ts (NetworkFirst
    // pour index.json), ce cache-buster est une ceinture-bretelles côté
    // client si jamais un SW ancien traîne dans un navigateur installé.
    response = await fetch(`/data/index.json?v=${Date.now()}`, {
      cache: 'no-cache',
    });
  } catch {
    signalFreshnessFailure('index.json indisponible (offline ?)');
  }
  if (!response.ok) {
    signalFreshnessFailure(`index.json HTTP ${response.status}`);
  }
  let index: { contentHash?: unknown };
  try {
    index = (await response.json()) as { contentHash?: unknown };
  } catch {
    signalFreshnessFailure('index.json JSON invalide (build en cours ?)');
  }
  const remoteHash = typeof index.contentHash === 'string' ? index.contentHash : null;
  if (!remoteHash) {
    // Index sans contentHash : peut être un build legacy pré-fix D7, ou un
    // pipeline cassé. Ne pas rester silencieux — c'est un signal qu'il faut
    // voir (ce qui aurait évité de chasser le bug en aveugle).
    signalFreshnessFailure(
      'index.json sans contentHash — build legacy ou pipeline cassé',
    );
  }
  const stored = await dexie.settings.get(PUBLIC_HASH_SETTINGS_KEY);
  const localHash = typeof stored?.value === 'string' ? stored.value : null;
  if (localHash === remoteHash) return;
  await clearAllPublicContent();
  await dexie.settings.put({ key: PUBLIC_HASH_SETTINGS_KEY, value: remoteHash });
}

/**
 * Vérifie la fraîcheur du cache public — mémoïsation succès uniquement.
 *
 * Si la promesse précédente a échoué, on la jette et on rejoue. Si elle a
 * réussi (cache à jour ou purge effectuée), on la garde pour le reste de la
 * session — pas de re-fetch gratuit de `index.json` à chaque appel.
 *
 * L'erreur jetée n'est PAS propagée à l'appelant : `loadPublicContent`
 * l'avale et sert le cache existant (offline-safe en prod). Le log de la
 * fonction signale la fraîcheur ratée — invisible en prod (warn), bruyant
 * en dev (error).
 */
async function ensurePublicCacheFreshness(): Promise<void> {
  if (publicCacheFreshnessPromise) return publicCacheFreshnessPromise;
  const attempt = runFreshnessCheck();
  publicCacheFreshnessPromise = attempt;
  try {
    await attempt;
  } catch {
    // Échec : on remet la mémoïsation à null pour que le prochain appel
    // RÉ-essaie réellement (vs Bug 2 : la mémoïsation absorbait l'échec
    // comme un succès et figeait le cache obsolète jusqu'au hard refresh).
    if (publicCacheFreshnessPromise === attempt) {
      publicCacheFreshnessPromise = null;
    }
  }
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
    // Re-parser le cache via Zod : un schéma STRICT (plan 13.8 UAT Drakéide)
    // sur des données obsolètes échoue ici, déclenche l'invalidation et force
    // un fetch frais — la voie de sortie quand un cache pré-évolution-schéma
    // est piégé malgré la freshness check.
    //
    // Cas concret : `Ancestry` exige depuis le `superRefine` plan 13.8 que
    // dragonborn/goliath/elf/gnome/tiefling/human aient leurs sub-options non
    // vides. Un cache pré-13.7 (sans `options`) ou pré-extraction-complète
    // (`options: {}`) tombe ici → row supprimée → fetch `/data/<type>.json`
    // → bundle disque sain → cache reconstitué propre, transparent côté UI.
    const arraySchema = z.array(ContentTypeSchemas[type]);
    const reparsed = arraySchema.safeParse(cached.data);
    if (reparsed.success) {
      return reparsed.data as ContentEntityByKey[K][];
    }
    // Schéma cassé sur le cache : on vide la row pour qu'un retry ne reboucle
    // pas indéfiniment, puis on tombe sur le fetch frais.
    await invalidatePublicContent(type);
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
