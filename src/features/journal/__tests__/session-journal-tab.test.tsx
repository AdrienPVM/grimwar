import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionJournalTab } from '../session-journal-tab';

/**
 * Tests de l'onglet Journal (plan 25.2) : état vide (joueur vs MJ), flux de
 * compilation MJ (bouton → orchestrateur → rendu du Markdown retourné), gating
 * pending, et lecture seule côté joueur.
 */

const compileMock = vi.fn();
vi.mock('../compile-session-journal', () => ({
  compileSessionJournal: (args: unknown) => compileMock(args),
}));

const updateJournalMock = vi.fn();
vi.mock('@/shared/lib/services/sessions', () => ({
  updateSessionJournal: (cid: string, sid: string, md: string) =>
    updateJournalMock(cid, sid, md),
}));

const baseProps = {
  campaignId: 'camp1',
  sessionId: 'sess1',
  linkedMembers: [{ userId: 'u1', characterId: 'c1' }],
  spells: [],
  items: [],
  conditions: [],
  onCompiled: vi.fn(),
};

beforeEach(() => {
  compileMock.mockReset();
  updateJournalMock.mockReset();
  updateJournalMock.mockResolvedValue(undefined);
  baseProps.onCompiled = vi.fn();
});

describe('SessionJournalTab — état vide', () => {
  it('joueur, journal null → message lecture seule, PAS de bouton compiler', () => {
    render(<SessionJournalTab {...baseProps} journalCompiled={null} canEdit={false} />);
    expect(screen.getByText('Aucun journal compilé')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Compiler/ })).not.toBeInTheDocument();
  });

  it('MJ, journal null → bouton « Compiler le journal »', () => {
    render(<SessionJournalTab {...baseProps} journalCompiled={null} canEdit />);
    expect(screen.getByRole('button', { name: 'Compiler le journal' })).toBeInTheDocument();
  });
});

describe('SessionJournalTab — compilation MJ', () => {
  it('clic « Compiler » → orchestrateur appelé + Markdown rendu + onCompiled', async () => {
    compileMock.mockResolvedValue('## Exploration\n\n- La séance commence.');
    const user = userEvent.setup();
    render(<SessionJournalTab {...baseProps} journalCompiled={null} canEdit />);

    await user.click(screen.getByRole('button', { name: 'Compiler le journal' }));

    await waitFor(() => {
      expect(compileMock).toHaveBeenCalledWith(
        expect.objectContaining({ campaignId: 'camp1', sessionId: 'sess1' }),
      );
    });
    // Le Markdown retourné est rendu (titre H2 + puce).
    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent('Exploration');
    expect(screen.getByText('La séance commence.')).toBeInTheDocument();
    expect(baseProps.onCompiled).toHaveBeenCalledOnce();
  });

  it('échec de compilation → message d’erreur, pas de crash', async () => {
    compileMock.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    render(<SessionJournalTab {...baseProps} journalCompiled={null} canEdit />);

    await user.click(screen.getByRole('button', { name: 'Compiler le journal' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/compilation du journal a échoué/i);
  });
});

describe('SessionJournalTab — journal existant', () => {
  it('rend le Markdown persisté + boutons « Éditer » et « Re-compiler » pour le MJ', () => {
    render(
      <SessionJournalTab
        {...baseProps}
        journalCompiled={'## Combat — Embuscade\n\n- **Gobelin 1** subit 7 dégâts — PV : 7 → 0.'}
        canEdit
      />,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Combat — Embuscade');
    expect(screen.getByText('Gobelin 1').tagName).toBe('STRONG');
    expect(screen.getByRole('button', { name: 'Éditer' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Re-compiler depuis les événements' }),
    ).toBeInTheDocument();
  });

  it('joueur : rend le Markdown mais AUCUN bouton (ni éditer ni compiler)', () => {
    render(
      <SessionJournalTab
        {...baseProps}
        journalCompiled={'## Exploration\n\n- La séance commence.'}
        canEdit={false}
      />,
    );
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('SessionJournalTab — édition manuelle (step 6)', () => {
  it('« Éditer » → textarea pré-remplie du Markdown courant', async () => {
    const user = userEvent.setup();
    render(
      <SessionJournalTab {...baseProps} journalCompiled={'## Exploration\n\n- Ligne A.'} canEdit />,
    );
    await user.click(screen.getByRole('button', { name: 'Éditer' }));
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('## Exploration\n\n- Ligne A.');
  });

  it('édition + « Enregistrer » → updateSessionJournal + rendu du texte édité', async () => {
    const user = userEvent.setup();
    render(<SessionJournalTab {...baseProps} journalCompiled={'## Exploration\n\n- A.'} canEdit />);
    await user.click(screen.getByRole('button', { name: 'Éditer' }));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, '## Exploration\n\n- Texte édité à la main.');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(updateJournalMock).toHaveBeenCalledWith(
        'camp1',
        'sess1',
        '## Exploration\n\n- Texte édité à la main.',
      );
    });
    expect(await screen.findByText('Texte édité à la main.')).toBeInTheDocument();
    expect(baseProps.onCompiled).toHaveBeenCalledOnce();
  });

  it('« Annuler » sort de l’édition sans écrire', async () => {
    const user = userEvent.setup();
    render(<SessionJournalTab {...baseProps} journalCompiled={'## Exploration\n\n- A.'} canEdit />);
    await user.click(screen.getByRole('button', { name: 'Éditer' }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(updateJournalMock).not.toHaveBeenCalled();
  });

  it('échec d’enregistrement → message d’erreur', async () => {
    updateJournalMock.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    render(<SessionJournalTab {...baseProps} journalCompiled={'## A\n\n- x'} canEdit />);
    await user.click(screen.getByRole('button', { name: 'Éditer' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/enregistrement du journal a échoué/i);
  });
});

describe('SessionJournalTab — confirmation de re-compilation (step 7)', () => {
  it('« Re-compiler » demande confirmation AVANT de compiler', async () => {
    const user = userEvent.setup();
    render(<SessionJournalTab {...baseProps} journalCompiled={'## A\n\n- x'} canEdit />);
    await user.click(screen.getByRole('button', { name: 'Re-compiler depuis les événements' }));
    // L'orchestrateur n'est PAS encore appelé : on est sur l'écran de confirmation.
    expect(compileMock).not.toHaveBeenCalled();
    expect(screen.getByText('Re-compiler le journal ?')).toBeInTheDocument();
  });

  it('confirmation → compile + écrase ; « Annuler » abandonne', async () => {
    compileMock.mockResolvedValue('## Exploration\n\n- Re-compilé.');
    const user = userEvent.setup();
    render(<SessionJournalTab {...baseProps} journalCompiled={'## A\n\n- Édité.'} canEdit />);

    // Annuler d'abord : pas d'appel.
    await user.click(screen.getByRole('button', { name: 'Re-compiler depuis les événements' }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(compileMock).not.toHaveBeenCalled();

    // Re-ouvrir puis confirmer : compile.
    await user.click(screen.getByRole('button', { name: 'Re-compiler depuis les événements' }));
    await user.click(screen.getByRole('button', { name: 'Re-compiler et écraser' }));
    await waitFor(() => expect(compileMock).toHaveBeenCalledOnce());
    expect(await screen.findByText('Re-compilé.')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────
// M14 — cadrer ce que le récit embarque
// ─────────────────────────────────────────────────────────────────────

describe('SessionJournalTab — cadrage du récit (M14)', () => {
  it('par défaut, TOUT est embarqué : aucune régression de compilation', async () => {
    compileMock.mockResolvedValue('## Exploration\n\n- x');
    const user = userEvent.setup();
    render(<SessionJournalTab {...baseProps} journalCompiled={null} canEdit />);
    await user.click(screen.getByRole('button', { name: 'Compiler le journal' }));
    await waitFor(() => expect(compileMock).toHaveBeenCalledOnce());
    expect(compileMock.mock.calls[0]![0]).toMatchObject({
      options: { excludedKinds: [], includeDmOnly: true },
    });
  });

  it('décocher les jets et les PV de monstre les exclut du récit', async () => {
    compileMock.mockResolvedValue('## Exploration\n\n- x');
    const user = userEvent.setup();
    render(<SessionJournalTab {...baseProps} journalCompiled={null} canEdit />);

    await user.click(screen.getByLabelText('Les jets de dés'));
    await user.click(screen.getByLabelText('Les points de vie des monstres'));
    await user.click(screen.getByRole('button', { name: 'Compiler le journal' }));

    await waitFor(() => expect(compileMock).toHaveBeenCalledOnce());
    const { options } = compileMock.mock.calls[0]![0] as {
      options: { excludedKinds: string[]; includeDmOnly: boolean };
    };
    expect(options.excludedKinds).toEqual(['roll', 'monster-hp-change']);
    expect(options.includeDmOnly).toBe(true);
  });

  it('décocher les coulisses du meneur retire les événements « dm »', async () => {
    compileMock.mockResolvedValue('## Exploration\n\n- x');
    const user = userEvent.setup();
    render(<SessionJournalTab {...baseProps} journalCompiled={null} canEdit />);

    await user.click(screen.getByLabelText('Les coulisses du meneur'));
    await user.click(screen.getByRole('button', { name: 'Compiler le journal' }));

    await waitFor(() => expect(compileMock).toHaveBeenCalledOnce());
    expect(compileMock.mock.calls[0]![0]).toMatchObject({
      options: { excludedKinds: [], includeDmOnly: false },
    });
  });

  it('le cadrage est aussi offert à la RE-compilation, pas seulement à la première', async () => {
    compileMock.mockResolvedValue('## Exploration\n\n- Re-compilé.');
    const user = userEvent.setup();
    render(<SessionJournalTab {...baseProps} journalCompiled={'## A\n\n- x'} canEdit />);

    await user.click(screen.getByRole('button', { name: 'Re-compiler depuis les événements' }));
    await user.click(screen.getByLabelText('Les jets de dés'));
    await user.click(screen.getByRole('button', { name: 'Re-compiler et écraser' }));

    await waitFor(() => expect(compileMock).toHaveBeenCalledOnce());
    expect(compileMock.mock.calls[0]![0]).toMatchObject({
      options: { excludedKinds: ['roll'] },
    });
  });

  it('un joueur ne voit aucune case de cadrage (la compilation est MJ-only)', () => {
    render(<SessionJournalTab {...baseProps} journalCompiled={null} canEdit={false} />);
    expect(screen.queryByLabelText('Les jets de dés')).not.toBeInTheDocument();
  });
});
