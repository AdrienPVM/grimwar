/**
 * Service Firestore pour Mode Carte phase 2 (CHANTIER D — marathon nuit 3).
 *
 * Couvre toutes les écritures côté MJ sur `campaigns/{cid}/maps/{mid}` et la
 * sous-collection `tokens/{tid}` (cf. schémas dans `src/shared/types/map.ts`).
 *
 * Pattern :
 *   - Lecture = `useMap()` hook (read-only listener).
 *   - Écriture = ce module (write-only, sans state local — toute consommation
 *     UI doit re-render via le snapshot du hook après la confirmation Firestore).
 *
 * Toutes les écritures forcent `updatedAt: serverTimestamp()` + `updatedBy: uid`
 * pour permettre last-write-wins inter-clients. Les CREATE positionnent en plus
 * `createdAt: serverTimestamp()` + `schemaVersion: 1`.
 *
 * Le module ne valide PAS les payloads contre Zod : la responsabilité est aux
 * appelants (composants UI typés strict via TS). Les rules Firestore + le test
 * `tests/firestore-rules.test.ts` font le 2ᵉ niveau de défense.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { getDb } from '@/shared/lib/firebase';
import type {
  AoeTemplate,
  FogPolygon,
  LightSource,
  MapMeta,
  MapToken,
} from '@/shared/types/map';

/** Payload de création d'une carte : `id`/`createdAt`/`updatedAt` posés par le service. */
export type CreateMapInput = Omit<
  MapMeta,
  'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'schemaVersion'
>;

/** Patch partiel pour une carte ; les sous-collections (tokens) ont leurs propres setters. */
export type UpdateMapPatch = Partial<
  Omit<MapMeta, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'schemaVersion'>
>;

/** Payload de création de token : `id` posé par le service via `addDoc`. */
export type CreateTokenInput = Omit<MapToken, 'id' | 'updatedAt' | 'updatedBy'>;

/** Patch partiel pour un token. */
export type UpdateTokenPatch = Partial<
  Omit<MapToken, 'id' | 'updatedAt' | 'updatedBy'>
>;

// ─── Maps (doc racine) ─────────────────────────────────────────────────────

/**
 * Crée une carte à `campaigns/{cid}/maps/{mapId}`. Le `mapId` est passé par
 * l'appelant (slug humain stable du genre `donjon-de-l-aube`), ce qui permet
 * un partage facile en URL et une déduplication explicite.
 */
export async function createMap(
  campaignId: string,
  mapId: string,
  input: CreateMapInput,
  uid: string,
): Promise<string> {
  const ref = doc(getDb(), 'campaigns', campaignId, 'maps', mapId);
  const payload: Omit<MapMeta, 'id'> = {
    ...input,
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  await setDoc(ref, payload);
  return mapId;
}

export async function updateMap(
  campaignId: string,
  mapId: string,
  patch: UpdateMapPatch,
  uid: string,
): Promise<void> {
  const ref = doc(getDb(), 'campaigns', campaignId, 'maps', mapId);
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

export async function deleteMap(campaignId: string, mapId: string): Promise<void> {
  const ref = doc(getDb(), 'campaigns', campaignId, 'maps', mapId);
  await deleteDoc(ref);
}

// ─── Tokens (sous-collection) ──────────────────────────────────────────────

/**
 * Crée un token via `addDoc` (Firestore génère l'ID). On retourne l'ID pour
 * que l'UI puisse le suivre côté local immédiatement (avant le snapshot).
 */
export async function createToken(
  campaignId: string,
  mapId: string,
  input: CreateTokenInput,
  uid: string,
): Promise<string> {
  const col = collection(getDb(), 'campaigns', campaignId, 'maps', mapId, 'tokens');
  const docRef = await addDoc(col, {
    ...input,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
  return docRef.id;
}

export async function updateToken(
  campaignId: string,
  mapId: string,
  tokenId: string,
  patch: UpdateTokenPatch,
  uid: string,
): Promise<void> {
  const ref = doc(
    getDb(),
    'campaigns',
    campaignId,
    'maps',
    mapId,
    'tokens',
    tokenId,
  );
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

export async function deleteToken(
  campaignId: string,
  mapId: string,
  tokenId: string,
): Promise<void> {
  const ref = doc(
    getDb(),
    'campaigns',
    campaignId,
    'maps',
    mapId,
    'tokens',
    tokenId,
  );
  await deleteDoc(ref);
}

// ─── Fog polygons (inline sur MapMeta) ─────────────────────────────────────

/**
 * Append d'un nouveau polygone de fog. Les polygones étant peu fréquents et
 * peu nombreux par carte, on les garde inline (cf. arbitrage `MapMeta`).
 */
export async function addFogPolygon(
  campaignId: string,
  mapId: string,
  current: readonly FogPolygon[],
  polygon: FogPolygon,
  uid: string,
): Promise<void> {
  await updateMap(
    campaignId,
    mapId,
    { fogPolygons: [...current, polygon] },
    uid,
  );
}

export async function removeFogPolygon(
  campaignId: string,
  mapId: string,
  current: readonly FogPolygon[],
  polygonId: string,
  uid: string,
): Promise<void> {
  await updateMap(
    campaignId,
    mapId,
    { fogPolygons: current.filter((p) => p.id !== polygonId) },
    uid,
  );
}

// ─── Light sources (inline) ────────────────────────────────────────────────

export async function addLightSource(
  campaignId: string,
  mapId: string,
  current: readonly LightSource[],
  light: LightSource,
  uid: string,
): Promise<void> {
  await updateMap(
    campaignId,
    mapId,
    { lightSources: [...current, light] },
    uid,
  );
}

export async function removeLightSource(
  campaignId: string,
  mapId: string,
  current: readonly LightSource[],
  lightId: string,
  uid: string,
): Promise<void> {
  await updateMap(
    campaignId,
    mapId,
    { lightSources: current.filter((l) => l.id !== lightId) },
    uid,
  );
}

// ─── AoE templates (inline) ────────────────────────────────────────────────

export async function addAoeTemplate(
  campaignId: string,
  mapId: string,
  current: readonly AoeTemplate[],
  template: AoeTemplate,
  uid: string,
): Promise<void> {
  await updateMap(
    campaignId,
    mapId,
    { aoeTemplates: [...current, template] },
    uid,
  );
}

export async function removeAoeTemplate(
  campaignId: string,
  mapId: string,
  current: readonly AoeTemplate[],
  templateId: string,
  uid: string,
): Promise<void> {
  await updateMap(
    campaignId,
    mapId,
    { aoeTemplates: current.filter((t) => t.id !== templateId) },
    uid,
  );
}
