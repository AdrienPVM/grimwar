import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useActiveTurnStore } from '@/shared/lib/slices/active-turn-slice';

import { PermissionProvider } from '../permissions-context';
import { TurnBanner } from '../turn-banner';

/**
 * Le bandeau est le signal PERSISTANT du tour — le toast, lui, dure six
 * secondes. Ce qui décide de sa présence : c'est mon tour, et je ne suis pas le
 * meneur en train de lire la fiche de quelqu'un d'autre.
 */

function renderBanner(permission: { canEdit: boolean; isDM: boolean; isDMEdit: boolean }): void {
  render(
    <MemoryRouter>
      <PermissionProvider value={{ ...permission, lockedFields: [] }}>
        <TurnBanner />
      </PermissionProvider>
    </MemoryRouter>,
  );
}

const OWNER = { canEdit: true, isDM: false, isDMEdit: false };
const DM_READ = { canEdit: false, isDM: true, isDMEdit: false };

function setTurn(isMyTurn: boolean): void {
  useActiveTurnStore.getState().setTurn({
    campaignId: 'camp-42',
    encounterId: 'enc-7',
    encounterName: 'Embuscade au col',
    round: 3,
    isMyTurn,
  });
}

beforeEach(() => {
  useActiveTurnStore.getState().clearTurn();
});

describe('<TurnBanner>', () => {
  it('mène au combat en cours quand c’est le tour du joueur', () => {
    setTurn(true);
    renderBanner(OWNER);
    const link = screen.getByRole('link', { name: /Rejoindre le combat en cours/i });
    expect(link).toHaveAttribute('href', '/campaigns/camp-42/encounters/enc-7');
    expect(screen.getByText('C’est à vous de jouer')).toBeInTheDocument();
    // Le round et le nom du combat situent le tour — sans eux, le bandeau ne
    // dit pas DE QUOI il parle quand plusieurs combats se succèdent.
    expect(screen.getByText('Round 3 · Embuscade au col')).toBeInTheDocument();
  });

  it('ne s’affiche pas quand le tour est celui de quelqu’un d’autre', () => {
    setTurn(false);
    renderBanner(OWNER);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('ne s’affiche pas hors combat', () => {
    renderBanner(OWNER);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('ne s’affiche pas en lecture MJ — le meneur n’a pas de tour à lui', () => {
    setTurn(true);
    renderBanner(DM_READ);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
