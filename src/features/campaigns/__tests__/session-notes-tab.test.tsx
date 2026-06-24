import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const updateNotesMock = vi.fn<(cid: string, sid: string, notes: string) => Promise<void>>();
vi.mock('@/shared/lib/services/sessions', () => ({
  updateSessionNotes: (cid: string, sid: string, notes: string) =>
    updateNotesMock(cid, sid, notes),
}));

import { SessionNotesTab } from '../session-notes-tab';

beforeEach(() => {
  updateNotesMock.mockReset();
  updateNotesMock.mockResolvedValue(undefined);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderTab(props: Partial<React.ComponentProps<typeof SessionNotesTab>> = {}): ReturnType<typeof render> {
  return render(
    <SessionNotesTab
      campaignId="c-1"
      sessionId="s-1"
      initialNotes=""
      canEdit
      {...props}
    />,
  );
}

describe('<SessionNotesTab> — auto-save (MJ)', () => {
  it('ne sauvegarde PAS avant 5s (debounce)', async () => {
    renderTab();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Embuscade au pont' } });
    await vi.advanceTimersByTimeAsync(4000);
    expect(updateNotesMock).not.toHaveBeenCalled();
    // L'indicateur « Modifié » est visible tant que le debounce n'a pas flush.
    expect(screen.getByText(/Modifié/i)).toBeInTheDocument();
  });

  it('sauvegarde après 5s avec la valeur saisie + passe à « Enregistré »', async () => {
    renderTab();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Embuscade au pont' } });
    // act() englobe le flush du timer ET de la microtask du .then (setStatus).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(updateNotesMock).toHaveBeenCalledWith('c-1', 's-1', 'Embuscade au pont');
    expect(screen.getByText(/Enregistré/i)).toBeInTheDocument();
  });

  it('le debounce ne sauvegarde que la dernière valeur (frappe continue)', async () => {
    renderTab();
    const box = screen.getByRole('textbox');
    fireEvent.change(box, { target: { value: 'a' } });
    await vi.advanceTimersByTimeAsync(3000);
    fireEvent.change(box, { target: { value: 'ab' } });
    await vi.advanceTimersByTimeAsync(3000);
    // 6s écoulées MAIS reset à chaque frappe → pas encore sauvé.
    expect(updateNotesMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(updateNotesMock).toHaveBeenCalledTimes(1);
    expect(updateNotesMock).toHaveBeenCalledWith('c-1', 's-1', 'ab');
  });

  it('flush au démontage si modifications en attente', async () => {
    const { unmount } = renderTab();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Notes non flushées' } });
    // Démontage AVANT la fin du debounce.
    unmount();
    expect(updateNotesMock).toHaveBeenCalledWith('c-1', 's-1', 'Notes non flushées');
  });

  it('aucune sauvegarde si le texte est inchangé', async () => {
    renderTab({ initialNotes: 'inchangé' });
    await vi.advanceTimersByTimeAsync(6000);
    expect(updateNotesMock).not.toHaveBeenCalled();
  });
});

describe('<SessionNotesTab> — lecture seule (membre)', () => {
  it('rend les notes avec retours à la ligne, pas de textarea', () => {
    renderTab({ canEdit: false, initialNotes: 'Ligne 1\nLigne 2' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(/Ligne 1/)).toBeInTheDocument();
  });

  it('affiche l’état vide quand aucune note', () => {
    renderTab({ canEdit: false, initialNotes: '' });
    expect(screen.getByText(/Aucune note pour cette séance/i)).toBeInTheDocument();
  });
});
