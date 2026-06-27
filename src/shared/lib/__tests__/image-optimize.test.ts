import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  dataUrlByteSize,
  ImageOptimizeError,
  MAP_BACKGROUND_PRESET,
  nextEncodeStep,
  optimizeDataUrl,
  optimizeImageFile,
  PORTRAIT_PRESET,
} from '../image-optimize';

/**
 * Tests de l'optimiseur d'image centralisé. Le recadrage/ré-encodage canvas est
 * une capacité navigateur (couverte par les e2e chromium) ; ici on verrouille
 * tout ce qui est PUR et mécaniquement vérifiable : la mesure d'empreinte, la
 * machine à états de réduction (qualité puis dimension), la validation
 * synchrone, et le contrat de repli sans-canvas (jsdom n'a pas de contexte 2D).
 */

describe('dataUrlByteSize', () => {
  it("mesure la longueur de la chaîne (empreinte de stockage réelle)", () => {
    expect(dataUrlByteSize('')).toBe(0);
    expect(dataUrlByteSize('data:image/webp;base64,AAAA')).toBe(27);
  });

  it('croît avec un payload base64 plus long', () => {
    const small = 'data:image/webp;base64,' + 'A'.repeat(100);
    const big = 'data:image/webp;base64,' + 'A'.repeat(10_000);
    expect(dataUrlByteSize(big)).toBeGreaterThan(dataUrlByteSize(small));
  });
});

describe('nextEncodeStep — machine à états de réduction', () => {
  const opts = { minDim: 96, startQuality: 0.78, minQuality: 0.5 };

  it("baisse d'abord la qualité, à dimension constante", () => {
    const next = nextEncodeStep({ dim: 192, quality: 0.78 }, opts);
    expect(next).not.toBeNull();
    expect(next?.dim).toBe(192);
    expect(next?.quality).toBeCloseTo(0.66, 5);
  });

  it('ne descend jamais sous la qualité plancher', () => {
    const next = nextEncodeStep({ dim: 192, quality: 0.55 }, opts);
    expect(next?.quality).toBe(0.5);
    expect(next?.dim).toBe(192);
  });

  it('réduit la dimension et remonte la qualité une fois au plancher', () => {
    const next = nextEncodeStep({ dim: 192, quality: 0.5 }, opts);
    expect(next).not.toBeNull();
    expect(next?.dim).toBe(154); // round(192 * 0.8)
    expect(next?.quality).toBe(0.78);
  });

  it('respecte la dimension plancher', () => {
    const next = nextEncodeStep({ dim: 110, quality: 0.5 }, opts);
    expect(next?.dim).toBe(96);
  });

  it("renvoie null quand qualité ET dimension sont au plancher", () => {
    expect(nextEncodeStep({ dim: 96, quality: 0.5 }, opts)).toBeNull();
  });

  it('termine : depuis le départ, la suite des pas atteint null', () => {
    let state: { dim: number; quality: number } | null = {
      dim: PORTRAIT_PRESET.maxDim,
      quality: PORTRAIT_PRESET.startQuality,
    };
    let steps = 0;
    while (state && steps < 1000) {
      state = nextEncodeStep(state, PORTRAIT_PRESET);
      steps += 1;
    }
    expect(state).toBeNull();
    expect(steps).toBeLessThan(1000);
  });
});

describe('optimizeImageFile — validation synchrone', () => {
  it('rejette un fichier non-image avec un message FR', async () => {
    const notImage = new File(['{}'], 'data.json', { type: 'application/json' });
    await expect(
      optimizeImageFile(notImage, PORTRAIT_PRESET),
    ).rejects.toBeInstanceOf(ImageOptimizeError);
    await expect(
      optimizeImageFile(notImage, PORTRAIT_PRESET),
    ).rejects.toThrow(/fichier image/i);
  });

  it("rejette une image au-delà du plafond d'upload", async () => {
    const big = new File(['x'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', {
      value: PORTRAIT_PRESET.maxUploadBytes + 1,
    });
    await expect(optimizeImageFile(big, PORTRAIT_PRESET)).rejects.toThrow(
      /trop lourde/i,
    );
  });
});

describe('optimizeDataUrl — contrat de repli sans canvas (jsdom)', () => {
  const tiny = 'data:image/png;base64,AAAA';

  // jsdom lève « not implemented » sur getContext ET le journalise. On le stube
  // à `null` : `hasCanvas2d()` détecte alors proprement l'absence de canvas,
  // sans le bruit stderr, et la branche de repli est bien exercée.
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lève sans canvas quand le repli brut est interdit (chemin Firestore)', async () => {
    await expect(
      optimizeDataUrl(tiny, { ...PORTRAIT_PRESET, allowRawFallback: false }),
    ).rejects.toBeInstanceOf(ImageOptimizeError);
  });

  it('renvoie la chaîne brute mesurée quand le repli est autorisé (chemin local)', async () => {
    const out = await optimizeDataUrl(tiny, MAP_BACKGROUND_PRESET);
    expect(out.raw).toBe(true);
    expect(out.dataUrl).toBe(tiny);
    expect(out.bytes).toBe(tiny.length);
  });
});
