import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSyncStore } from '../slices/sync-slice';

// Mocks AVANT l'import du module testé. `waitForPendingWrites` est moqué
// pour pouvoir contrôler son cycle (resolved/rejected) et observer les
// transitions du compteur.
const waitForPendingWritesMock = vi.fn<(fs: unknown) => Promise<void>>();
vi.mock('firebase/firestore', () => ({
  waitForPendingWrites: (fs: unknown) => waitForPendingWritesMock(fs),
}));

import { trackPendingWrite } from '../track-pending-write';

const fakeFirestore = { __id: 'fake-firestore' } as unknown as Parameters<
  typeof trackPendingWrite
>[0];

describe('trackPendingWrite', () => {
  beforeEach(() => {
    useSyncStore.getState().__reset();
    waitForPendingWritesMock.mockReset();
  });

  it('incrémente le compteur immédiatement', async () => {
    waitForPendingWritesMock.mockReturnValue(new Promise(() => undefined));
    const promise = trackPendingWrite(fakeFirestore, Promise.resolve('ok'));
    expect(useSyncStore.getState().pendingWrites).toBe(1);
    expect(await promise).toBe('ok');
  });

  it("décrémente quand waitForPendingWrites résout", async () => {
    let resolveWait: () => void = () => undefined;
    waitForPendingWritesMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveWait = resolve;
      }),
    );
    const promise = trackPendingWrite(fakeFirestore, Promise.resolve(42));
    expect(useSyncStore.getState().pendingWrites).toBe(1);
    await promise;
    // Pas encore ack backend
    expect(useSyncStore.getState().pendingWrites).toBe(1);
    resolveWait();
    // Laisser le microtask scheduler décrémenter
    await new Promise((r) => setTimeout(r, 0));
    expect(useSyncStore.getState().pendingWrites).toBe(0);
  });

  it("décrémente aussi quand waitForPendingWrites rejette", async () => {
    let rejectWait: (e: Error) => void = () => undefined;
    waitForPendingWritesMock.mockReturnValue(
      new Promise<void>((_, reject) => {
        rejectWait = reject;
      }),
    );
    trackPendingWrite(fakeFirestore, Promise.resolve(null));
    expect(useSyncStore.getState().pendingWrites).toBe(1);
    rejectWait(new Error('backend down'));
    await new Promise((r) => setTimeout(r, 0));
    expect(useSyncStore.getState().pendingWrites).toBe(0);
  });

  it('ne bloque pas la promesse principale sur waitForPendingWrites', async () => {
    // waitForPendingWrites ne résout jamais → la promesse principale doit
    // quand même résoudre rapidement.
    waitForPendingWritesMock.mockReturnValue(new Promise(() => undefined));
    const start = Date.now();
    const value = await trackPendingWrite(fakeFirestore, Promise.resolve('fast'));
    expect(value).toBe('fast');
    expect(Date.now() - start).toBeLessThan(100);
  });

  it('propage les erreurs de la promesse principale', async () => {
    waitForPendingWritesMock.mockResolvedValue(undefined);
    await expect(
      trackPendingWrite(fakeFirestore, Promise.reject(new Error('write KO'))),
    ).rejects.toThrow('write KO');
  });
});
