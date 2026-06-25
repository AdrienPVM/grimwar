import { describe, expect, it } from 'vitest';

import {
  HandoutSchema,
  handoutCreatedAtMillis,
  handoutTargetsUser,
  type Handout,
} from '../handout';

function make(overrides: Partial<Handout> = {}): Handout {
  return {
    id: 'h-1',
    title: 'Doc',
    type: 'text',
    content: { text: 'abc' },
    recipients: 'all',
    revealedTo: [],
    visibility: 'sent',
    createdBy: 'dm-1',
    createdAt: { seconds: 10 },
    ...overrides,
  };
}

describe('handoutTargetsUser', () => {
  it("renvoie true pour une diffusion 'all'", () => {
    expect(handoutTargetsUser(make({ recipients: 'all' }), 'p-9')).toBe(true);
  });

  it("renvoie true si l'UID est destinataire explicite", () => {
    expect(handoutTargetsUser(make({ recipients: ['p-1', 'p-2'] }), 'p-2')).toBe(true);
  });

  it("renvoie false si l'UID n'est pas destinataire", () => {
    expect(handoutTargetsUser(make({ recipients: ['p-1'] }), 'p-9')).toBe(false);
  });
});

describe('handoutCreatedAtMillis', () => {
  it('lit .toMillis() en priorité', () => {
    const h = make({ createdAt: { toMillis: () => 1234, seconds: 1 } as never });
    expect(handoutCreatedAtMillis(h)).toBe(1234);
  });

  it('retombe sur .seconds * 1000', () => {
    expect(handoutCreatedAtMillis(make({ createdAt: { seconds: 5 } }))).toBe(5000);
  });

  it('renvoie 0 pour un createdAt pending (serverTimestamp non résolu)', () => {
    expect(handoutCreatedAtMillis(make({ createdAt: null }))).toBe(0);
  });
});

describe('HandoutSchema', () => {
  it('accepte un handout texte valide adressé à une liste', () => {
    const r = HandoutSchema.safeParse(make({ recipients: ['p-1'] }));
    expect(r.success).toBe(true);
  });

  it('rejette un type hors énum', () => {
    const r = HandoutSchema.safeParse(make({ type: 'video' as never }));
    expect(r.success).toBe(false);
  });

  it('rejette un titre vide', () => {
    const r = HandoutSchema.safeParse(make({ title: '' }));
    expect(r.success).toBe(false);
  });
});
