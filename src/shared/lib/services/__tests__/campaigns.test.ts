import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests pour `src/shared/lib/services/campaigns.ts`.
 *
 * Pattern miroir de `maps.test.ts` : mock `firebase/firestore` + getDb.
 * On vérifie que `ensureCampaignExists` no-op si le doc existe et qu'il
 * pose un payload campaign-stub conforme aux rules sinon.
 */

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => 'MOCK_SERVER_TS');
const mockDoc = vi.fn((_db, ...path: string[]) => ({ __type: 'doc', path: path.join('/') }));

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as Parameters<typeof mockDoc>)),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  // `waitForPendingWrites` est appelé par `trackPendingWrite` (JALON 1D.3) pour
  // décrémenter le compteur quand l'écriture est ack backend. Le mock résout
  // immédiatement — la sémantique offline réelle est testée dans
  // `track-pending-write.test.ts` (qui mocke proprement la latence d'ack).
  waitForPendingWrites: () => Promise.resolve(),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({ __type: 'mock-db' }),
}));

import { ensureCampaignExists } from '../campaigns';

const CID = 'demo-cid';
const UID = 'user-alice';

beforeEach(() => {
  mockGetDoc.mockReset();
  mockSetDoc.mockReset().mockResolvedValue(undefined);
  mockDoc.mockClear();
});

describe('ensureCampaignExists', () => {
  it('no-op when campaign already exists (returns false)', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true });
    const created = await ensureCampaignExists(CID, UID);
    expect(created).toBe(false);
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockDoc).toHaveBeenCalledTimes(1);
    expect(mockDoc.mock.calls[0]).toBeDefined();
    const [, ...path] = mockDoc.mock.calls[0]!;
    expect(path.join('/')).toBe(`campaigns/${CID}`);
  });

  it('creates campaign stub when missing (returns true)', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const created = await ensureCampaignExists(CID, UID);
    expect(created).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, payload] = mockSetDoc.mock.calls[0]!;
    expect(payload).toMatchObject({
      name: CID,
      dmUserId: UID,
      status: 'active',
      schemaVersion: 1,
      createdAt: 'MOCK_SERVER_TS',
      updatedAt: 'MOCK_SERVER_TS',
    });
  });

  it('writes to campaigns/{cid} path', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    await ensureCampaignExists(CID, UID);
    expect(mockDoc.mock.calls[0]).toBeDefined();
    const [, ...path] = mockDoc.mock.calls[0]!;
    expect(path.join('/')).toBe(`campaigns/${CID}`);
  });

  it('propagates non-permission getDoc errors', async () => {
    mockGetDoc.mockRejectedValue(new Error('quota-exceeded'));
    await expect(ensureCampaignExists(CID, UID)).rejects.toThrow('quota-exceeded');
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('falls through to setDoc on permission-denied getDoc (doc absent or non-DM read)', async () => {
    // Simule un permission-denied — soit la campagne n'existe pas, soit
    // l'utilisateur n'est ni DM ni membre. Dans les deux cas on tente le
    // create (qui passera si la campagne n'existe pas).
    const { FirebaseError } = await import('firebase/app');
    mockGetDoc.mockRejectedValue(new FirebaseError('permission-denied', 'denied'));
    const created = await ensureCampaignExists(CID, UID);
    expect(created).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('propagates setDoc errors (transport / rules) after fall-through', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockRejectedValue(new Error('quota-exceeded'));
    await expect(ensureCampaignExists(CID, UID)).rejects.toThrow('quota-exceeded');
  });
});
