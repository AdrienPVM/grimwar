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
import { trackPendingWrite } from '@/shared/lib/track-pending-write';
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
  const firestore = getDb();
  const ref = doc(firestore, 'campaigns', campaignId, 'maps', mapId);
  const payload: Omit<MapMeta, 'id'> = {
    ...input,
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  // Écriture MJ bloquante hors-ligne (JALON 1D.3).
  await trackPendingWrite(firestore, setDoc(ref, payload));
  return mapId;
}

export async function updateMap(
  campaignId: string,
  mapId: string,
  patch: UpdateMapPatch,
  uid: string,
): Promise<void> {
  const firestore = getDb();
  const ref = doc(firestore, 'campaigns', campaignId, 'maps', mapId);
  // Wrapper transitif : addFogPolygon/addLightSource/addAoeTemplate (et
  // leurs symétriques) passent par updateMap → tous trackés (JALON 1D.3).
  await trackPendingWrite(
    firestore,
    updateDoc(ref, {
      ...patch,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    }),
  );
}

export async function deleteMap(campaignId: string, mapId: string): Promise<void> {
  const firestore = getDb();
  const ref = doc(firestore, 'campaigns', campaignId, 'maps', mapId);
  // Suppression = écriture user-initiated comme une autre côté SDK.
  await trackPendingWrite(firestore, deleteDoc(ref));
}

// ─── Tokens (sous-collection) ──────────────────────────────────────────────

/**
 * Crée un token via `addDoc` (Firestore génère l'ID).
 *
 * ⚠ ATTENTION : l'ID auto-généré contient des MAJUSCULES, donc il échoue au
 * parse Zod de `mapTokenSchema.id` (slug `[a-z0-9-]+`) et le token est filtré
 * par `useMap` (jamais affiché). Pour une création depuis l'UI, préférer
 * `createTokenWithId` avec un slug. `createToken` reste pour un usage futur où
 * l'ID serait normalisé en amont.
 */
export async function createToken(
  campaignId: string,
  mapId: string,
  input: CreateTokenInput,
  uid: string,
): Promise<string> {
  const firestore = getDb();
  const col = collection(firestore, 'campaigns', campaignId, 'maps', mapId, 'tokens');
  const docRef = await trackPendingWrite(
    firestore,
    addDoc(col, {
      ...input,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    }),
  );
  return docRef.id;
}

/**
 * Crée un token avec un ID SLUG explicite (kebab-case), via `setDoc`.
 *
 * Pourquoi pas `createToken`/`addDoc` : Firestore génère des IDs auto qui
 * contiennent des MAJUSCULES, alors que `mapTokenSchema.id` impose un slug
 * `[a-z0-9-]+`. Un token créé par `addDoc` est donc silencieusement rejeté au
 * parse Zod du listener `useMap` (jamais affiché). Pour toute création de token
 * depuis l'UI, utiliser CE helper avec un slug (ex. `token-ab12cd34`).
 */
export async function createTokenWithId(
  campaignId: string,
  mapId: string,
  tokenId: string,
  input: CreateTokenInput,
  uid: string,
): Promise<string> {
  const firestore = getDb();
  const ref = doc(
    firestore,
    'campaigns',
    campaignId,
    'maps',
    mapId,
    'tokens',
    tokenId,
  );
  await trackPendingWrite(
    firestore,
    setDoc(ref, {
      ...input,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    }),
  );
  return tokenId;
}

export async function updateToken(
  campaignId: string,
  mapId: string,
  tokenId: string,
  patch: UpdateTokenPatch,
  uid: string,
): Promise<void> {
  const firestore = getDb();
  const ref = doc(
    firestore,
    'campaigns',
    campaignId,
    'maps',
    mapId,
    'tokens',
    tokenId,
  );
  await trackPendingWrite(
    firestore,
    updateDoc(ref, {
      ...patch,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    }),
  );
}

export async function deleteToken(
  campaignId: string,
  mapId: string,
  tokenId: string,
): Promise<void> {
  const firestore = getDb();
  const ref = doc(
    firestore,
    'campaigns',
    campaignId,
    'maps',
    mapId,
    'tokens',
    tokenId,
  );
  await trackPendingWrite(firestore, deleteDoc(ref));
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

/**
 * Repositionne un seul template AoE (drag MJ sur la carte live). `position`
 * est en pixels viewBox (même espace que les tokens) ; les `dimensions` du
 * template (en pieds) restent inchangées. Idempotent : si l'id est absent, la
 * liste est réécrite à l'identique (no-op de facto). On garde l'inline
 * (peu de templates par carte, cf. arbitrage `MapMeta`).
 */
export async function moveAoeTemplate(
  campaignId: string,
  mapId: string,
  current: readonly AoeTemplate[],
  templateId: string,
  position: AoeTemplate['position'],
  uid: string,
): Promise<void> {
  await updateMap(
    campaignId,
    mapId,
    {
      aoeTemplates: current.map((t) =>
        t.id === templateId ? { ...t, position } : t,
      ),
    },
    uid,
  );
}

/**
 * Pivote un seul template AoE de `deltaDeg` (drag MJ — boutons ±15° sur la
 * carte live). `rotationDeg` est normalisé dans [0, 360) pour respecter le
 * schéma Zod (`min(0).lt(360)`). Idempotent : id absent → liste réécrite à
 * l'identique. La normalisation est volontairement INLINE ici (jumelle de la
 * version tableau `rotateAoe` côté feature `aoe-state.ts`) pour ne pas créer
 * de dépendance service → feature ; les 3 lignes de modulo sont triviales.
 */
export async function rotateAoeTemplate(
  campaignId: string,
  mapId: string,
  current: readonly AoeTemplate[],
  templateId: string,
  deltaDeg: number,
  uid: string,
): Promise<void> {
  await updateMap(
    campaignId,
    mapId,
    {
      aoeTemplates: current.map((t) => {
        if (t.id !== templateId) return t;
        let next = ((t.rotationDeg ?? 0) + deltaDeg) % 360;
        if (next < 0) next += 360;
        return { ...t, rotationDeg: next };
      }),
    },
    uid,
  );
}

/**
 * Clé de dimension « principale » redimensionnable par forme (sphere/cone →
 * radius, line → length, cube → side). Déclaré INLINE ici (jumeau de
 * `AOE_PRIMARY_DIMENSION_KEY` côté feature `aoe-state.ts`) pour ne pas créer de
 * dépendance service → feature, comme la normalisation de `rotateAoeTemplate`.
 * `Record<shape, …>` force la complétude au compile-time des deux côtés.
 */
const AOE_PRIMARY_DIMENSION_KEY: Record<AoeTemplate['shape'], string> = {
  sphere: 'radius',
  cone: 'radius',
  line: 'length',
  cube: 'side',
};

/**
 * Redimensionne la dimension principale du gabarit `templateId` de `deltaFt`
 * pieds (plancher `minFt` — jamais sous une case). L'angle d'un cône et
 * l'épaisseur d'une ligne sont préservés. Idempotent : id absent → liste
 * réécrite à l'identique. Jumelle de `resizeAoe` côté feature.
 */
export async function resizeAoeTemplate(
  campaignId: string,
  mapId: string,
  current: readonly AoeTemplate[],
  templateId: string,
  deltaFt: number,
  uid: string,
  minFt = 5,
): Promise<void> {
  await updateMap(
    campaignId,
    mapId,
    {
      aoeTemplates: current.map((t) => {
        if (t.id !== templateId) return t;
        const key = AOE_PRIMARY_DIMENSION_KEY[t.shape];
        const cur = t.dimensions[key] ?? 0;
        const next = Math.max(minFt, cur + deltaFt);
        return { ...t, dimensions: { ...t.dimensions, [key]: next } };
      }),
    },
    uid,
  );
}
