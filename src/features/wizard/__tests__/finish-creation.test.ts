import { describe, expect, it, vi } from 'vitest';

import { finishCharacterCreation } from '../finish-creation';

describe('finishCharacterCreation', () => {
  it('sans campaignId → ouvre la fiche, ne lie rien', async () => {
    const link = vi.fn();
    const navigate = vi.fn();
    await finishCharacterCreation({
      characterId: 'char-1',
      uid: 'uid-1',
      campaignId: null,
      link,
      navigate,
    });
    expect(link).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/character/char-1');
  });

  it('avec campaignId + liaison OK → lie puis renvoie sur la campagne', async () => {
    const link = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn();
    await finishCharacterCreation({
      characterId: 'char-1',
      uid: 'uid-1',
      campaignId: 'camp-9',
      link,
      navigate,
    });
    expect(link).toHaveBeenCalledWith('camp-9', 'uid-1', 'char-1');
    expect(navigate).toHaveBeenCalledWith('/campaigns/camp-9');
    expect(navigate).not.toHaveBeenCalledWith('/character/char-1');
  });

  it('avec campaignId mais liaison en échec → repli sur la fiche (perso non perdu)', async () => {
    const link = vi.fn().mockRejectedValue(new Error('permission-denied'));
    const navigate = vi.fn();
    await finishCharacterCreation({
      characterId: 'char-1',
      uid: 'uid-1',
      campaignId: 'camp-9',
      link,
      navigate,
    });
    expect(link).toHaveBeenCalledWith('camp-9', 'uid-1', 'char-1');
    expect(navigate).toHaveBeenCalledWith('/character/char-1');
    expect(navigate).not.toHaveBeenCalledWith('/campaigns/camp-9');
  });
});
