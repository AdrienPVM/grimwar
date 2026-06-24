import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { EncounterParticipant } from '@/shared/types/encounter';

import { EncounterPartyView } from '../encounter-party-view';

function mkParticipant(overrides: Partial<EncounterParticipant> = {}): EncounterParticipant {
  return {
    type: 'player',
    characterId: 'char-a',
    monsterContentId: null,
    instanceId: 'inst-a',
    name: 'Lyralei',
    initiative: 0,
    currentHp: 20,
    maxHp: 20,
    tempHp: 0,
    conditions: [],
    position: null,
    notes: '',
    ...overrides,
  };
}

const idLabel = (id: string): string => (id === 'poisoned' ? 'Empoisonné' : id);

describe('<EncounterPartyView>', () => {
  it('groupe les PJ sous « Votre groupe » et les monstres sous « Adversaires »', () => {
    render(
      <EncounterPartyView
        participants={[
          mkParticipant(),
          mkParticipant({
            type: 'monster',
            characterId: null,
            instanceId: 'inst-gob',
            name: 'Gobelin 1',
            currentHp: 7,
            maxHp: 7,
          }),
        ]}
        resolveConditionLabel={idLabel}
      />,
    );

    const allies = screen.getByText('Votre groupe').closest('div')!;
    const enemies = screen.getByText('Adversaires').closest('div')!;
    expect(within(allies).getByText('Lyralei')).toBeInTheDocument();
    expect(within(enemies).getByText('Gobelin 1')).toBeInTheDocument();
    // Pas de fuite inter-groupe.
    expect(within(allies).queryByText('Gobelin 1')).not.toBeInTheDocument();
  });

  it('affiche les PV exacts courant/max de chaque participant', () => {
    render(
      <EncounterPartyView
        participants={[mkParticipant({ currentHp: 12, maxHp: 20 })]}
        resolveConditionLabel={idLabel}
      />,
    );
    expect(screen.getByText('12/20')).toBeInTheDocument();
  });

  it('rend les chips d’états actifs avec leur libellé localisé', () => {
    render(
      <EncounterPartyView
        participants={[
          mkParticipant({
            type: 'monster',
            characterId: null,
            instanceId: 'inst-gob',
            name: 'Gobelin 1',
            currentHp: 7,
            maxHp: 7,
            conditions: ['poisoned'],
          }),
        ]}
        resolveConditionLabel={idLabel}
      />,
    );
    expect(screen.getByText('Empoisonné')).toBeInTheDocument();
  });

  it('un groupe vide n’est pas rendu (que des monstres → pas de section « Votre groupe »)', () => {
    render(
      <EncounterPartyView
        participants={[
          mkParticipant({
            type: 'monster',
            characterId: null,
            instanceId: 'inst-gob',
            name: 'Gobelin 1',
            currentHp: 7,
            maxHp: 7,
          }),
        ]}
        resolveConditionLabel={idLabel}
      />,
    );
    expect(screen.queryByText('Votre groupe')).not.toBeInTheDocument();
    expect(screen.getByText('Adversaires')).toBeInTheDocument();
  });

  it('aucun participant → message vide', () => {
    render(<EncounterPartyView participants={[]} resolveConditionLabel={idLabel} />);
    expect(screen.getByText('Aucun participant.')).toBeInTheDocument();
  });
});
