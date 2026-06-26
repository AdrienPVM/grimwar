import { describe, expect, it } from 'vitest';

import {
  deleteTokenImage,
  deleteTokenImagesForMap,
  loadTokenImagesForMap,
  saveTokenImage,
  tokenImageKey,
  tokenImageMapKey,
} from '../token-image-store';

/**
 * Round-trip du stockage local des portraits de jeton (IndexedDB via Dexie).
 * Le setup de test charge `fake-indexeddb/auto`. Clés uniques par test pour
 * éviter toute fuite d'état inter-tests.
 */

describe('token-image-store', () => {
  it('compose les clés `${cid}/${mid}` et `${cid}/${mid}/${tid}`', () => {
    expect(tokenImageMapKey('c1', 'm1')).toBe('c1/m1');
    expect(tokenImageKey('c1', 'm1', 'tok-a')).toBe('c1/m1/tok-a');
  });

  it('save puis loadForMap renvoie une Map tokenId → dataUrl', async () => {
    await saveTokenImage('c-s', 'm-s', 'tok-1', 'data:image/webp;base64,AAA');
    await saveTokenImage('c-s', 'm-s', 'tok-2', 'data:image/webp;base64,BBB');
    const images = await loadTokenImagesForMap('c-s', 'm-s');
    expect(images.get('tok-1')).toBe('data:image/webp;base64,AAA');
    expect(images.get('tok-2')).toBe('data:image/webp;base64,BBB');
    expect(images.size).toBe(2);
  });

  it('loadForMap ne renvoie QUE les jetons de la carte demandée', async () => {
    await saveTokenImage('c-iso', 'm-x', 'tok-x', 'data:image/webp;base64,X');
    await saveTokenImage('c-iso', 'm-y', 'tok-y', 'data:image/webp;base64,Y');
    const onlyX = await loadTokenImagesForMap('c-iso', 'm-x');
    expect(onlyX.size).toBe(1);
    expect(onlyX.get('tok-x')).toBe('data:image/webp;base64,X');
    expect(onlyX.has('tok-y')).toBe(false);
  });

  it('loadForMap renvoie une Map vide pour une carte inconnue', async () => {
    const images = await loadTokenImagesForMap('c-none', 'm-none');
    expect(images.size).toBe(0);
  });

  it('save écrase un portrait existant (put idempotent)', async () => {
    await saveTokenImage('c-up', 'm-up', 'tok', 'data:image/webp;base64,first');
    await saveTokenImage('c-up', 'm-up', 'tok', 'data:image/webp;base64,second');
    const images = await loadTokenImagesForMap('c-up', 'm-up');
    expect(images.get('tok')).toBe('data:image/webp;base64,second');
  });

  it('delete retire UN portrait (les autres restent)', async () => {
    await saveTokenImage('c-d', 'm-d', 'keep', 'data:image/webp;base64,K');
    await saveTokenImage('c-d', 'm-d', 'gone', 'data:image/webp;base64,G');
    await deleteTokenImage('c-d', 'm-d', 'gone');
    const images = await loadTokenImagesForMap('c-d', 'm-d');
    expect(images.has('gone')).toBe(false);
    expect(images.get('keep')).toBe('data:image/webp;base64,K');
  });

  it('deleteForMap purge tous les portraits de la carte', async () => {
    await saveTokenImage('c-all', 'm-all', 'a', 'data:image/webp;base64,A');
    await saveTokenImage('c-all', 'm-all', 'b', 'data:image/webp;base64,B');
    await deleteTokenImagesForMap('c-all', 'm-all');
    const images = await loadTokenImagesForMap('c-all', 'm-all');
    expect(images.size).toBe(0);
  });
});
