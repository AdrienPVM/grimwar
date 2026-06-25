import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit test pour `useHandoutNotifications` (plan 27). On mocke `onSnapshot` pour
 * CAPTURER le handler et le piloter à la main — on prouve la logique du toast
 * (skip du premier snapshot = chargement initial ; toast sur tout `added`
 * ultérieur ; jamais sur un archivé ; rien si `enabled` est false).
 */

type DocChange = { type: string; doc: { id: string; data: () => Record<string, unknown> } };
type SnapHandler = (snap: { docChanges: () => DocChange[] }) => void;

const handlers: SnapHandler[] = [];
const showToast = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => ({ __type: 'col', args }),
  query: (...args: unknown[]) => ({ __type: 'query', args }),
  where: (...args: unknown[]) => ({ __type: 'where', args }),
  onSnapshot: (_q: unknown, handler: SnapHandler) => {
    handlers.push(handler);
    return () => undefined;
  },
}));
vi.mock('@/shared/lib/firebase', () => ({ getDb: () => ({ __type: 'db' }) }));
vi.mock('@/shared/lib/slices/toast-slice', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}));

import { useHandoutNotifications } from '../use-handout-notifications';

function snap(changes: DocChange[]): { docChanges: () => DocChange[] } {
  return { docChanges: () => changes };
}

function added(id: string, data: Record<string, unknown>): DocChange {
  return {
    type: 'added',
    doc: {
      id,
      data: () => ({
        id,
        title: `Doc ${id}`,
        type: 'text',
        content: { text: 'x' },
        recipients: 'all',
        revealedTo: [],
        visibility: 'sent',
        createdBy: 'dm-1',
        createdAt: { seconds: 1 },
        ...data,
      }),
    },
  };
}

beforeEach(() => {
  handlers.length = 0;
  showToast.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useHandoutNotifications', () => {
  it('ne toast PAS sur le snapshot initial, puis toast sur un nouvel ajout', () => {
    renderHook(() => useHandoutNotifications('c-1', 'p-1', true));
    // Premier handler = listener « mine ». Snapshot initial (doc préexistant).
    handlers[0]!(snap([added('h-old', { recipients: ['p-1'] })]));
    expect(showToast).not.toHaveBeenCalled();
    // Ajout ultérieur → toast.
    handlers[0]!(snap([added('h-new', { recipients: ['p-1'], title: 'Nouvelle carte' })]));
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast.mock.calls[0]![0]).toMatchObject({ kind: 'info', sub: 'Nouvelle carte' });
  });

  it('ne toast jamais pour un handout archivé', () => {
    renderHook(() => useHandoutNotifications('c-1', 'p-1', true));
    handlers[0]!(snap([])); // marque le chargement initial
    handlers[0]!(snap([added('h-arch', { visibility: 'archived' })]));
    expect(showToast).not.toHaveBeenCalled();
  });

  it("n'ouvre aucun listener quand enabled=false (cas MJ)", () => {
    renderHook(() => useHandoutNotifications('c-1', 'dm-1', false));
    expect(handlers).toHaveLength(0);
  });
});
