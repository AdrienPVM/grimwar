import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Campaign } from '@/shared/types/campaign';

// updateCampaign — spy (le service touche Firestore, on l'isole).
const updateCampaignMock = vi.fn();
vi.mock('@/shared/lib/services/campaigns', () => ({
  updateCampaign: (cid: string, patch: unknown) => updateCampaignMock(cid, patch),
}));

import { CampaignSettingsModal } from '../campaign-settings-modal';

function mkCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c-1',
    name: 'Les Compagnons du Crépuscule',
    description: 'Une longue route.',
    gmIds: ['uid-1'],
    createdBy: 'uid-1',
    inviteCode: 'ABC234',
    settings: {
      language: 'fr',
      diceMode: 'digital',
      variants: {
        featAtLevel1: false,
        flanking: false,
        slowHealing: false,
        grittyRealism: false,
      },
    },
    status: 'active',
    schemaVersion: 1,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const onClose = vi.fn();
const onSaved = vi.fn();

afterEach(() => {
  updateCampaignMock.mockReset();
  onClose.mockReset();
  onSaved.mockReset();
});

function renderModal(campaign: Campaign = mkCampaign()): void {
  render(
    <CampaignSettingsModal campaign={campaign} onClose={onClose} onSaved={onSaved} />,
  );
}

describe('<CampaignSettingsModal>', () => {
  it('préremplit le nom, la description et les toggles depuis la campagne', () => {
    renderModal(
      mkCampaign({
        name: 'Tempête sur Caer Dûn',
        description: 'Le sel et la pierre.',
        settings: {
          language: 'fr',
          diceMode: 'physical',
          variants: {
            featAtLevel1: true,
            flanking: false,
            slowHealing: false,
            grittyRealism: false,
          },
        },
      }),
    );
    expect(screen.getByDisplayValue('Tempête sur Caer Dûn')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Le sel et la pierre.')).toBeInTheDocument();
    // Sélection par nom accessible (robuste à l'ordre des radiogroups status/dés).
    expect(screen.getByRole('radio', { name: /Numérique/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('radio', { name: /Physique/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // L'état par défaut « Active » est présélectionné (mkCampaign → status active).
    expect(screen.getByRole('radio', { name: /^Active/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // Don au niveau 1 coché, les 3 autres décochés.
    expect(screen.getByRole('checkbox', { name: 'Don au niveau 1' })).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Prise en tenaille' }),
    ).not.toBeChecked();
  });

  it('bascule une variante + le mode de dés + l’état puis enregistre → updateCampaign reçoit le bon patch', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Prise en tenaille' }));
    // Sélection par nom accessible (robuste à l'ordre des radiogroups) : mode de
    // dés « physique » + état « En pause ».
    fireEvent.click(screen.getByRole('radio', { name: /Physique/i }));
    fireEvent.click(screen.getByRole('radio', { name: /En pause/i }));
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));
    await waitFor(() => {
      expect(updateCampaignMock).toHaveBeenCalledWith('c-1', {
        name: 'Les Compagnons du Crépuscule',
        description: 'Une longue route.',
        status: 'paused',
        settings: {
          diceMode: 'physical',
          variants: {
            featAtLevel1: false,
            flanking: true,
            slowHealing: false,
            grittyRealism: false,
          },
        },
      });
    });
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('nom vidé → erreur de champ, service jamais appelé', async () => {
    renderModal();
    const nameInput = screen.getByDisplayValue('Les Compagnons du Crépuscule');
    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));
    await waitFor(() => {
      expect(screen.getByText(/Le nom est obligatoire/i)).toBeInTheDocument();
    });
    expect(updateCampaignMock).not.toHaveBeenCalled();
  });

  it('échec du service → message d’erreur, modale non fermée', async () => {
    updateCampaignMock.mockRejectedValueOnce(new Error('boom'));
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
