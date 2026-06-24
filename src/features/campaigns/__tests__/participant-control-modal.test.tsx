import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Condition } from '@/shared/types/content';
import type { EncounterParticipant } from '@/shared/types/encounter';

import { ParticipantControlModal } from '../participant-control-modal';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function mkParticipant(over: Partial<EncounterParticipant> = {}): EncounterParticipant {
  return {
    type: 'monster',
    characterId: null,
    monsterContentId: null,
    instanceId: 'm1',
    name: 'Gobelin 1',
    initiative: 12,
    currentHp: 7,
    maxHp: 7,
    tempHp: 0,
    conditions: [],
    position: null,
    notes: '',
    ...over,
  };
}

const CONDITIONS: Condition[] = [
  {
    id: 'prone',
    name: { fr: 'À terre', en: 'Prone' },
    description: { fr: '…', en: '…' },
    source: 'srd-5.2.1',
  },
  {
    id: 'poisoned',
    name: { fr: 'Empoisonné', en: 'Poisoned' },
    description: { fr: '…', en: '…' },
    source: 'srd-5.2.1',
  },
];

function renderModal(
  over: {
    participant?: Partial<EncounterParticipant>;
    pending?: boolean;
    onApplyHp?: (delta: number) => void;
    onToggleCondition?: (condition: string, action: 'add' | 'remove') => void;
    onClose?: () => void;
  } = {},
): {
  onApplyHp: ReturnType<typeof vi.fn>;
  onToggleCondition: ReturnType<typeof vi.fn>;
  onClose: ReturnType<typeof vi.fn>;
} {
  const onApplyHp = vi.fn(over.onApplyHp);
  const onToggleCondition = vi.fn(over.onToggleCondition);
  const onClose = vi.fn(over.onClose);
  render(
    <ParticipantControlModal
      participant={mkParticipant(over.participant)}
      conditions={CONDITIONS}
      pending={over.pending ?? false}
      onApplyHp={onApplyHp}
      onToggleCondition={onToggleCondition}
      onClose={onClose}
    />,
  );
  return { onApplyHp, onToggleCondition, onClose };
}

afterEach(() => {
  document.body.style.overflow = '';
});

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('<ParticipantControlModal>', () => {
  it('affiche le nom + les PV courants/max', () => {
    renderModal({ participant: { name: 'Gobelin 1', currentHp: 4, maxHp: 7 } });
    expect(screen.getByRole('heading', { name: 'Gobelin 1' })).toBeInTheDocument();
    expect(screen.getByText('4/7')).toBeInTheDocument();
  });

  it('« Dégâts » applique le montant saisi en NÉGATIF', () => {
    const { onApplyHp } = renderModal();
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /Dégâts/ }));
    expect(onApplyHp).toHaveBeenCalledWith(-3);
  });

  it('« Soin » applique le montant saisi en POSITIF', () => {
    const { onApplyHp } = renderModal();
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /Soin/ }));
    expect(onApplyHp).toHaveBeenCalledWith(4);
  });

  it('les boutons rapides appliquent ±montant en un tap', () => {
    const { onApplyHp } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: '−5' }));
    expect(onApplyHp).toHaveBeenCalledWith(-5);
    fireEvent.click(screen.getByRole('button', { name: '+5' }));
    expect(onApplyHp).toHaveBeenCalledWith(5);
  });

  it('Dégâts/Soin désactivés tant que le montant est ≤ 0', () => {
    const { onApplyHp } = renderModal();
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: /Dégâts/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Soin/ }));
    expect(onApplyHp).not.toHaveBeenCalled();
  });

  it('un état inactif → toggle add ; un état actif → toggle remove + aria-pressed', () => {
    const { onToggleCondition } = renderModal({ participant: { conditions: ['poisoned'] } });
    // « À terre » inactif → add.
    fireEvent.click(screen.getByRole('button', { name: 'À terre', pressed: false }));
    expect(onToggleCondition).toHaveBeenCalledWith('prone', 'add');
    // « Empoisonné » actif (aria-pressed) → remove.
    const active = screen.getByRole('button', { name: 'Empoisonné', pressed: true });
    fireEvent.click(active);
    expect(onToggleCondition).toHaveBeenCalledWith('poisoned', 'remove');
  });

  it('pending désactive tous les contrôles', () => {
    renderModal({ pending: true });
    expect(screen.getByRole('button', { name: '−5' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'À terre' })).toBeDisabled();
  });
});
