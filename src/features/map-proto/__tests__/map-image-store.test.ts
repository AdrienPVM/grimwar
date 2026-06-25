import { describe, expect, it } from 'vitest';

import {
  deleteMapImage,
  loadMapImage,
  mapImageKey,
  saveMapImage,
} from '../map-image-store';

/**
 * Round-trip du stockage local d'images de carte (IndexedDB via Dexie). Le
 * setup de test charge `fake-indexeddb/auto`, donc Dexie fonctionne en jsdom.
 * Clés uniques par test pour éviter toute fuite d'état inter-tests.
 */

describe('map-image-store', () => {
  it('compose une clé `${cid}/${mid}`', () => {
    expect(mapImageKey('camp-1', 'donjon')).toBe('camp-1/donjon');
  });

  it('save puis load renvoie le data URL', async () => {
    await saveMapImage('c-save', 'm-save', 'data:image/png;base64,AAA');
    const url = await loadMapImage('c-save', 'm-save');
    expect(url).toBe('data:image/png;base64,AAA');
  });

  it('load renvoie null pour une carte inconnue', async () => {
    const url = await loadMapImage('c-none', 'm-none');
    expect(url).toBeNull();
  });

  it('delete retire l’image (load → null ensuite)', async () => {
    await saveMapImage('c-del', 'm-del', 'data:image/png;base64,BBB');
    await deleteMapImage('c-del', 'm-del');
    const url = await loadMapImage('c-del', 'm-del');
    expect(url).toBeNull();
  });

  it('save écrase une image existante (put idempotent)', async () => {
    await saveMapImage('c-up', 'm-up', 'data:image/png;base64,first');
    await saveMapImage('c-up', 'm-up', 'data:image/png;base64,second');
    const url = await loadMapImage('c-up', 'm-up');
    expect(url).toBe('data:image/png;base64,second');
  });
});
