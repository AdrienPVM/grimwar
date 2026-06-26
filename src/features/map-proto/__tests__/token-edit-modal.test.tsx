import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MapToken } from '@/shared/types/map';

import { TokenEditModal } from '../token-edit-modal';

function mkToken(overrides: Partial<MapToken> = {}): MapToken {
  return {
    id: 't1',
    kind: 'pnj',
    label: 'PNJ',
    position: { x: 0, y: 0 },
    color: '#f87171',
    updatedAt: null,
    updatedBy: 'u',
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('TokenEditModal', () => {
  it('ne rend rien quand token est null (modale fermée)', () => {
    render(
      <TokenEditModal
        token={null}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('token-edit-save')).toBeNull();
  });

  it('reflète le nom + la couleur courants du jeton', () => {
    render(
      <TokenEditModal
        token={mkToken({ label: 'Gobelin', color: '#4ade80' })}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect((screen.getByTestId('token-edit-label') as HTMLInputElement).value).toBe(
      'Gobelin',
    );
    expect(
      screen.getByTestId('token-color-4ade80').getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      screen.getByTestId('token-color-f87171').getAttribute('aria-checked'),
    ).toBe('false');
  });

  it('Enregistrer remonte le nom (trimmé) + la couleur choisie + la vision', () => {
    const onSave = vi.fn();
    render(
      <TokenEditModal
        token={mkToken()}
        onSave={onSave}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByTestId('token-edit-label'), {
      target: { value: '  Chef gobelin  ' },
    });
    fireEvent.click(screen.getByTestId('token-color-c084fc')); // violet
    fireEvent.click(screen.getByTestId('token-edit-save'));
    // Un PNJ porte une vision : le patch inclut le défaut 30 ft (jamais touché).
    expect(onSave).toHaveBeenCalledWith({
      label: 'Chef gobelin',
      color: '#c084fc',
      visionRadius: 30,
    });
  });

  it('présélectionne la portée de vision courante (60 ft → « 18 m »)', () => {
    render(
      <TokenEditModal
        token={mkToken({ visionRadius: 60 })}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId('token-vision-60').getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      screen.getByTestId('token-vision-30').getAttribute('aria-checked'),
    ).toBe('false');
    // Affiché en mètres (×0,3), pas en pieds bruts.
    expect(screen.getByTestId('token-vision-60').textContent).toContain('18 m');
  });

  it('défaut 30 ft (« 9 m ») présélectionné quand le jeton n’a pas de vision', () => {
    render(
      <TokenEditModal
        token={mkToken()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId('token-vision-30').getAttribute('aria-checked'),
    ).toBe('true');
    expect(screen.getByTestId('token-vision-30').textContent).toContain('9 m');
  });

  it('changer la portée de vision remonte le nouveau rayon (en pieds)', () => {
    const onSave = vi.fn();
    render(
      <TokenEditModal
        token={mkToken()}
        onSave={onSave}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('token-vision-120')); // étendue
    fireEvent.click(screen.getByTestId('token-edit-save'));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ visionRadius: 120 }),
    );
  });

  it('un repère (marker) n’a pas de section vision et n’émet pas visionRadius', () => {
    const onSave = vi.fn();
    render(
      <TokenEditModal
        token={mkToken({ kind: 'marker', label: 'Coffre' })}
        onSave={onSave}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('token-vision-30')).toBeNull();
    fireEvent.click(screen.getByTestId('token-edit-save'));
    expect(onSave).toHaveBeenCalledWith({ label: 'Coffre', color: '#f87171' });
  });

  it('désactive Enregistrer quand le nom est vide après trim', () => {
    const onSave = vi.fn();
    render(
      <TokenEditModal
        token={mkToken()}
        onSave={onSave}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByTestId('token-edit-label'), {
      target: { value: '   ' },
    });
    const save = screen.getByTestId('token-edit-save') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Supprimer ce jeton remonte onDelete', () => {
    const onDelete = vi.fn();
    render(
      <TokenEditModal
        token={mkToken()}
        onSave={vi.fn()}
        onDelete={onDelete}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('token-edit-delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('affiche le libellé de catégorie du jeton (PNJ / monstre)', () => {
    render(
      <TokenEditModal
        token={mkToken({ kind: 'pnj' })}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('PNJ / monstre')).toBeTruthy();
  });
});
