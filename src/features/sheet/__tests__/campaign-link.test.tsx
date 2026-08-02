import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { Character } from '@/shared/types/character';

import { CampaignLink } from '../campaign-link';
import { PermissionProvider } from '../permissions-context';

/**
 * Le raccourci « ma campagne » ferme le cul-de-sac de la fiche
 * (`plans/UX-AUDIT-2026-08.md > J5`). Trois cas décident de sa présence.
 */

function mkCharacter(homeCampaignId: string | null): Character {
  return { id: 'char-1', name: 'Sigrid', homeCampaignId } as unknown as Character;
}

function renderLink(
  character: Character,
  permission: { canEdit: boolean; isDM: boolean; isDMEdit: boolean },
): void {
  render(
    <MemoryRouter>
      <PermissionProvider value={{ ...permission, lockedFields: [] }}>
        <CampaignLink character={character} />
      </PermissionProvider>
    </MemoryRouter>,
  );
}

const OWNER = { canEdit: true, isDM: false, isDMEdit: false };
const DM_READ = { canEdit: false, isDM: true, isDMEdit: false };

describe('<CampaignLink>', () => {
  it('pointe vers la campagne d’attache de la fiche', () => {
    renderLink(mkCharacter('camp-42'), OWNER);
    const link = screen.getByRole('link', { name: /Ma campagne/i });
    expect(link).toHaveAttribute('href', '/campaigns/camp-42');
  });

  it('ne rend rien pour une fiche non liée', () => {
    // Le conteneur parent porte `data-hide-if-empty` : rendre `null` suffit à
    // le faire disparaître, aucune garde à dupliquer côté appelant.
    renderLink(mkCharacter(null), OWNER);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('ne rend rien en lecture MJ (l’écran parent porte déjà son retour)', () => {
    renderLink(mkCharacter('camp-42'), DM_READ);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
