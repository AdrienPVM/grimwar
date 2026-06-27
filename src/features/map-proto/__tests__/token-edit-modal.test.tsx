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
        onDuplicate={vi.fn()}
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
        onDuplicate={vi.fn()}
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
        onDuplicate={vi.fn()}
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
      kind: 'pnj',
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
        onDuplicate={vi.fn()}
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
        onDuplicate={vi.fn()}
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
        onDuplicate={vi.fn()}
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
        onDuplicate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('token-vision-30')).toBeNull();
    fireEvent.click(screen.getByTestId('token-edit-save'));
    expect(onSave).toHaveBeenCalledWith({
      kind: 'marker',
      label: 'Coffre',
      color: '#f87171',
    });
  });

  it('désactive Enregistrer quand le nom est vide après trim', () => {
    const onSave = vi.fn();
    render(
      <TokenEditModal
        token={mkToken()}
        onSave={onSave}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
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

  it('Dupliquer le jeton remonte onDuplicate', () => {
    const onDuplicate = vi.fn();
    render(
      <TokenEditModal
        token={mkToken()}
        onSave={vi.fn()}
        onDuplicate={onDuplicate}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('token-edit-duplicate'));
    expect(onDuplicate).toHaveBeenCalledTimes(1);
  });

  it('Supprimer ce jeton remonte onDelete', () => {
    const onDelete = vi.fn();
    render(
      <TokenEditModal
        token={mkToken()}
        onSave={vi.fn()}
        onDelete={onDelete}
        onDuplicate={vi.fn()}
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
        onDuplicate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // Le sur-titre reflète la catégorie ; « PNJ / monstre » apparaît aussi dans
    // le sélecteur de type, d'où la cible explicite sur l'eyebrow.
    expect(screen.getByTestId('token-edit-kind-eyebrow').textContent).toBe(
      'PNJ / monstre',
    );
  });

  describe('type de jeton', () => {
    it('présélectionne le type courant du jeton', () => {
      render(
        <TokenEditModal
          token={mkToken({ kind: 'pnj' })}
          onSave={vi.fn()}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByTestId('token-kind-pnj').getAttribute('aria-checked')).toBe(
        'true',
      );
      expect(screen.getByTestId('token-kind-pj').getAttribute('aria-checked')).toBe(
        'false',
      );
      expect(
        screen.getByTestId('token-kind-marker').getAttribute('aria-checked'),
      ).toBe('false');
    });

    it('reclasser PNJ → PJ remonte le nouveau type dans le patch', () => {
      const onSave = vi.fn();
      render(
        <TokenEditModal
          token={mkToken({ kind: 'pnj', label: 'Bram' })}
          onSave={onSave}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('token-kind-pj'));
      fireEvent.click(screen.getByTestId('token-edit-save'));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'pj', label: 'Bram' }),
      );
    });

    it("reclasser en « repère » masque la section vision et n'émet plus visionRadius", () => {
      const onSave = vi.fn();
      render(
        <TokenEditModal
          token={mkToken({ kind: 'pnj', visionRadius: 60 })}
          onSave={onSave}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      // Avant : la vision est rendue pour un PNJ.
      expect(screen.getByTestId('token-vision-60')).toBeTruthy();
      fireEvent.click(screen.getByTestId('token-kind-marker'));
      // Après : la section vision a disparu (dérivée du type LOCAL).
      expect(screen.queryByTestId('token-vision-60')).toBeNull();
      fireEvent.click(screen.getByTestId('token-edit-save'));
      const patch = onSave.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(patch.kind).toBe('marker');
      expect(patch).not.toHaveProperty('visionRadius');
    });

    it('reclasser un repère en PNJ fait apparaître la vision (défaut 30 ft)', () => {
      const onSave = vi.fn();
      render(
        <TokenEditModal
          token={mkToken({ kind: 'marker', label: 'Coffre' })}
          onSave={onSave}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(screen.queryByTestId('token-vision-30')).toBeNull();
      fireEvent.click(screen.getByTestId('token-kind-pnj'));
      expect(
        screen.getByTestId('token-vision-30').getAttribute('aria-checked'),
      ).toBe('true');
      fireEvent.click(screen.getByTestId('token-edit-save'));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'pnj', visionRadius: 30 }),
      );
    });

    it("met à jour le sur-titre de catégorie au changement de type", () => {
      render(
        <TokenEditModal
          token={mkToken({ kind: 'pnj' })}
          onSave={vi.fn()}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByTestId('token-edit-kind-eyebrow').textContent).toBe(
        'PNJ / monstre',
      );
      fireEvent.click(screen.getByTestId('token-kind-pj'));
      expect(screen.getByTestId('token-edit-kind-eyebrow').textContent).toBe(
        'Personnage joueur',
      );
    });
  });

  describe('lumière portée', () => {
    it("n'affiche pas la section quand le caller ne la câble pas", () => {
      render(
        <TokenEditModal
          token={mkToken()}
          onSave={vi.fn()}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(screen.queryByTestId('token-light-torch')).toBeNull();
    });

    it('présélectionne « Aucune » quand le jeton ne porte rien', () => {
      render(
        <TokenEditModal
          token={mkToken()}
          carriedLight={null}
          onCarriedLightChange={vi.fn()}
          onSave={vi.fn()}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByTestId('token-light-none').getAttribute('aria-checked')).toBe(
        'true',
      );
      expect(screen.getByTestId('token-light-torch').getAttribute('aria-checked')).toBe(
        'false',
      );
    });

    it('présélectionne le preset porté courant', () => {
      render(
        <TokenEditModal
          token={mkToken()}
          carriedLight="lantern"
          onCarriedLightChange={vi.fn()}
          onSave={vi.fn()}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(
        screen.getByTestId('token-light-lantern').getAttribute('aria-checked'),
      ).toBe('true');
      // Le rayon total est affiché en mètres FR (lanterne 60 ft → 18 m).
      expect(screen.getByTestId('token-light-lantern').textContent).toContain('18 m');
    });

    it('choisir un preset déclenche onCarriedLightChange IMMÉDIATEMENT', () => {
      const onCarriedLightChange = vi.fn();
      render(
        <TokenEditModal
          token={mkToken()}
          carriedLight={null}
          onCarriedLightChange={onCarriedLightChange}
          onSave={vi.fn()}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('token-light-torch'));
      expect(onCarriedLightChange).toHaveBeenCalledWith('torch');
      // La sélection optimiste suit sans attendre le round-trip.
      expect(screen.getByTestId('token-light-torch').getAttribute('aria-checked')).toBe(
        'true',
      );
    });

    it('« Aucune » détache (onCarriedLightChange(null))', () => {
      const onCarriedLightChange = vi.fn();
      render(
        <TokenEditModal
          token={mkToken()}
          carriedLight="torch"
          onCarriedLightChange={onCarriedLightChange}
          onSave={vi.fn()}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('token-light-none'));
      expect(onCarriedLightChange).toHaveBeenCalledWith(null);
    });
  });

  describe('portrait', () => {
    it("n'affiche pas la section portrait quand l'upload n'est pas câblé", () => {
      render(
        <TokenEditModal
          token={mkToken()}
          onSave={vi.fn()}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(screen.queryByTestId('token-image-input')).toBeNull();
    });

    it('propose « Ajouter une image » + pastille de repli quand aucun portrait', () => {
      render(
        <TokenEditModal
          token={mkToken()}
          imageUrl={null}
          onSave={vi.fn()}
          onUploadImage={vi.fn()}
          onRemoveImage={vi.fn()}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByTestId('token-image-input')).toBeTruthy();
      expect(screen.getByTestId('token-image-placeholder')).toBeTruthy();
      expect(screen.queryByTestId('token-image-preview')).toBeNull();
      expect(screen.getByText('Ajouter une image')).toBeTruthy();
    });

    it('affiche la vignette + « Retirer » quand un portrait existe', () => {
      render(
        <TokenEditModal
          token={mkToken()}
          imageUrl="data:image/webp;base64,ZZZ"
          onSave={vi.fn()}
          onUploadImage={vi.fn()}
          onRemoveImage={vi.fn()}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      const preview = screen.getByTestId('token-image-preview') as HTMLImageElement;
      expect(preview.src).toBe('data:image/webp;base64,ZZZ');
      expect(screen.queryByTestId('token-image-placeholder')).toBeNull();
      expect(screen.getByText('Remplacer')).toBeTruthy();
      expect(screen.getByTestId('token-image-remove')).toBeTruthy();
    });

    it('« Retirer l’image » remonte onRemoveImage', () => {
      const onRemoveImage = vi.fn();
      render(
        <TokenEditModal
          token={mkToken()}
          imageUrl="data:image/webp;base64,ZZZ"
          onSave={vi.fn()}
          onUploadImage={vi.fn()}
          onRemoveImage={onRemoveImage}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('token-image-remove'));
      expect(onRemoveImage).toHaveBeenCalledTimes(1);
    });

    it('un fichier non-image affiche une erreur et n’upload pas', async () => {
      const onUploadImage = vi.fn();
      render(
        <TokenEditModal
          token={mkToken()}
          imageUrl={null}
          onSave={vi.fn()}
          onUploadImage={onUploadImage}
          onRemoveImage={vi.fn()}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      const notImage = new File(['{}'], 'data.json', {
        type: 'application/json',
      });
      fireEvent.change(screen.getByTestId('token-image-input'), {
        target: { files: [notImage] },
      });
      const error = await screen.findByTestId('token-image-error');
      expect(error.textContent).toMatch(/fichier image/i);
      expect(onUploadImage).not.toHaveBeenCalled();
    });
  });
});
