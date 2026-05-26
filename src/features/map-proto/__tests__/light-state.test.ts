import { describe, it, expect } from 'vitest';

import { lightSourceSchema } from '@/shared/types/map';

import {
  addStaticLight,
  attachLightToToken,
  createLightFromPreset,
  LIGHT_PRESETS,
  lightRevealId,
  lightRevealRadius,
  removeLight,
  resolveLightPosition,
} from '../light-state';

describe('light-state — LIGHT_PRESETS', () => {
  it('inclut les 5 presets SRD attendus', () => {
    expect(Object.keys(LIGHT_PRESETS).sort()).toEqual([
      'candle',
      'lantern',
      'light-spell',
      'sunlight',
      'torch',
    ]);
  });

  it('torch = 200/200 px (20 ft + 20 ft à 1 case 50 px / 5 ft)', () => {
    expect(LIGHT_PRESETS.torch.brightRadius).toBe(200);
    expect(LIGHT_PRESETS.torch.dimRadius).toBe(200);
  });

  it('candle = 50/50 px (5 ft + 5 ft)', () => {
    expect(LIGHT_PRESETS.candle.brightRadius).toBe(50);
    expect(LIGHT_PRESETS.candle.dimRadius).toBe(50);
  });
});

describe('light-state — createLightFromPreset', () => {
  it('produit une source statique Zod-valide', () => {
    const light = createLightFromPreset('l1', 'torch', {
      type: 'static',
      position: { x: 100, y: 200 },
    });
    expect(() => lightSourceSchema.parse(light)).not.toThrow();
    expect(light.position).toEqual({ x: 100, y: 200 });
    expect(light.attachedTokenId).toBeUndefined();
  });

  it('produit une source attachée Zod-valide', () => {
    const light = createLightFromPreset('l1', 'lantern', {
      type: 'token',
      tokenId: 'pj-1',
    });
    expect(() => lightSourceSchema.parse(light)).not.toThrow();
    expect(light.attachedTokenId).toBe('pj-1');
    expect(light.position).toBeUndefined();
  });

  it('respecte le refine `position XOR attachedTokenId`', () => {
    // Le helper garantit que `position` et `attachedTokenId` ne coexistent
    // jamais — Zod refuserait l'objet hybride.
    const staticLight = createLightFromPreset('l1', 'torch', {
      type: 'static',
      position: { x: 0, y: 0 },
    });
    const hybrid = { ...staticLight, attachedTokenId: 't1' };
    expect(() => lightSourceSchema.parse(hybrid)).toThrow();
  });
});

describe('light-state — addStaticLight', () => {
  it('ajoute une lumière avec preset torch par défaut', () => {
    const next = addStaticLight([], { x: 100, y: 100 });
    expect(next).toHaveLength(1);
    expect(next[0]!.preset).toBe('torch');
    expect(next[0]!.position).toEqual({ x: 100, y: 100 });
  });

  it('génère des ids distincts entre appels', () => {
    const a = addStaticLight([], { x: 0, y: 0 }, 'torch', 1000);
    const b = addStaticLight(a, { x: 50, y: 50 }, 'torch', 1001);
    expect(b).toHaveLength(2);
    expect(b[0]!.id).not.toBe(b[1]!.id);
  });
});

describe('light-state — attachLightToToken', () => {
  it("ajoute une lumière attachée si le token n'en a pas", () => {
    const next = attachLightToToken([], 'pj-1', 'torch');
    expect(next).toHaveLength(1);
    expect(next[0]!.attachedTokenId).toBe('pj-1');
    expect(next[0]!.preset).toBe('torch');
  });

  it("remplace l'ancienne lumière du token (un slot par token)", () => {
    const torch = attachLightToToken([], 'pj-1', 'torch', 1000);
    const lantern = attachLightToToken(torch, 'pj-1', 'lantern', 2000);
    expect(lantern).toHaveLength(1);
    expect(lantern[0]!.preset).toBe('lantern');
  });

  it("toggle : re-clic même preset retire la lumière", () => {
    const torch = attachLightToToken([], 'pj-1', 'torch', 1000);
    const off = attachLightToToken(torch, 'pj-1', 'torch', 2000);
    expect(off).toHaveLength(0);
  });

  it("ne touche pas aux lumières d'autres tokens", () => {
    const a = attachLightToToken([], 'pj-1', 'torch', 1000);
    const b = attachLightToToken(a, 'pj-2', 'lantern', 1001);
    expect(b).toHaveLength(2);
    expect(b.map((l) => l.attachedTokenId).sort()).toEqual(['pj-1', 'pj-2']);
  });
});

describe('light-state — removeLight', () => {
  it("retire une lumière par id", () => {
    const seed = addStaticLight([], { x: 0, y: 0 }, 'torch', 1000);
    const next = removeLight(seed, seed[0]!.id);
    expect(next).toEqual([]);
  });

  it("est no-op si l'id n'existe pas", () => {
    const seed = addStaticLight([], { x: 0, y: 0 }, 'torch', 1000);
    const next = removeLight(seed, 'id-inexistant');
    expect(next).toEqual(seed);
  });
});

describe('light-state — resolveLightPosition', () => {
  it("retourne la position d'une source statique inchangée", () => {
    const light = createLightFromPreset('l1', 'torch', {
      type: 'static',
      position: { x: 100, y: 200 },
    });
    expect(resolveLightPosition(light, new Map())).toEqual({ x: 100, y: 200 });
  });

  it("suit la position du token attaché", () => {
    const light = createLightFromPreset('l1', 'lantern', {
      type: 'token',
      tokenId: 'pj-1',
    });
    const tokens = new Map([['pj-1', { x: 400, y: 500 }]]);
    expect(resolveLightPosition(light, tokens)).toEqual({ x: 400, y: 500 });
  });

  it("retourne null si le token attaché n'existe plus", () => {
    const light = createLightFromPreset('l1', 'torch', {
      type: 'token',
      tokenId: 'pj-disparu',
    });
    expect(resolveLightPosition(light, new Map())).toBeNull();
  });
});

describe('light-state — lightRevealId / lightRevealRadius', () => {
  it("produit un id préfixé light-reveal-*", () => {
    expect(lightRevealId('l1')).toBe('light-reveal-l1');
  });

  it("rayon total = bright + dim", () => {
    const torch = createLightFromPreset('l1', 'torch', {
      type: 'static',
      position: { x: 0, y: 0 },
    });
    expect(lightRevealRadius(torch)).toBe(400); // 200 + 200
  });
});
