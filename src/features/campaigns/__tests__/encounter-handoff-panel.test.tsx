import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EncounterHandoffPanel, type HandoffTarget } from '../encounter-handoff-panel';
import type { HandoffRow } from '../encounter-handoff';

const TARGETS: HandoffTarget[] = [
  { instanceId: 'inst-gob1', name: 'Gobelin 1' },
  { instanceId: 'inst-gob2', name: 'Gobelin 2' },
];

const damageRow: HandoffRow = {
  eventId: 'ev-dmg',
  actorName: 'Lyralei',
  weaponLabel: 'Épée longue',
  rollKind: 'damage',
  total: 11,
};

const attackRow: HandoffRow = {
  eventId: 'ev-atk',
  actorName: 'Lyralei',
  weaponLabel: 'Arc',
  rollKind: 'attack',
  total: 17,
};

function renderPanel(
  rows: HandoffRow[],
  overrides: Partial<React.ComponentProps<typeof EncounterHandoffPanel>> = {},
) {
  const onApply = vi.fn();
  const onDismiss = vi.fn();
  render(
    <EncounterHandoffPanel
      rows={rows}
      targets={TARGETS}
      pending={false}
      onApply={onApply}
      onDismiss={onDismiss}
      {...overrides}
    />,
  );
  return { onApply, onDismiss };
}

afterEach(() => vi.clearAllMocks());

describe('<EncounterHandoffPanel>', () => {
  it('rend une ligne de dégâts avec acteur, arme et total', () => {
    renderPanel([damageRow]);
    expect(screen.getByText('Lyralei')).toBeInTheDocument();
    expect(screen.getByText(/Épée longue/)).toBeInTheDocument();
    expect(screen.getByText('11 dégâts')).toBeInTheDocument();
  });

  it('« Appliquer à… » révèle les cibles ; un tap applique le total à la cible et n’ouvre pas avant', () => {
    const { onApply } = renderPanel([damageRow]);
    // Les cibles ne sont pas visibles tant qu'on n'a pas déplié.
    expect(screen.queryByRole('button', { name: 'Gobelin 1' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Appliquer à…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gobelin 2' }));
    expect(onApply).toHaveBeenCalledWith('ev-dmg', 11, 'inst-gob2');
  });

  it('« Ignorer » appelle onDismiss avec l’eventId', () => {
    const { onDismiss } = renderPanel([damageRow]);
    fireEvent.click(screen.getByRole('button', { name: /Ignorer — Lyralei/ }));
    expect(onDismiss).toHaveBeenCalledWith('ev-dmg');
  });

  it('une ligne d’attaque est informative : « Att N », pas de bouton « Appliquer à… »', () => {
    renderPanel([attackRow]);
    expect(screen.getByText('Att 17')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Appliquer à…' })).not.toBeInTheDocument();
    expect(screen.getByText(/compare à la CA/i)).toBeInTheDocument();
  });

  it('actorName null → libellé générique « Joueur »', () => {
    renderPanel([{ ...damageRow, actorName: null }]);
    expect(screen.getByText('Joueur')).toBeInTheDocument();
  });

  it('pending désactive « Appliquer à… » et « Ignorer »', () => {
    renderPanel([damageRow], { pending: true });
    expect(screen.getByRole('button', { name: 'Appliquer à…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Ignorer/ })).toBeDisabled();
  });

  it('sans cible disponible, le sélecteur affiche un message dédié', () => {
    renderPanel([damageRow], { targets: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Appliquer à…' }));
    expect(screen.getByText('Aucune cible disponible.')).toBeInTheDocument();
  });
});
