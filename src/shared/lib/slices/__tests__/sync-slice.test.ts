import { beforeEach, describe, expect, it } from 'vitest';

import { useSyncStore } from '../sync-slice';

describe('useSyncStore', () => {
  beforeEach(() => {
    useSyncStore.getState().__reset();
  });

  it('démarre à 0', () => {
    expect(useSyncStore.getState().pendingWrites).toBe(0);
  });

  it('beginWrite incrémente', () => {
    useSyncStore.getState().beginWrite();
    expect(useSyncStore.getState().pendingWrites).toBe(1);
    useSyncStore.getState().beginWrite();
    expect(useSyncStore.getState().pendingWrites).toBe(2);
  });

  it('endWrite décrémente', () => {
    useSyncStore.getState().beginWrite();
    useSyncStore.getState().beginWrite();
    useSyncStore.getState().endWrite();
    expect(useSyncStore.getState().pendingWrites).toBe(1);
  });

  it("endWrite ne descend pas sous 0 (robustesse aux décrémentations parasites)", () => {
    useSyncStore.getState().endWrite();
    expect(useSyncStore.getState().pendingWrites).toBe(0);
  });
});
