import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MapMeta } from '@/shared/types/map';

import { MapSettingsModal } from '../map-settings-modal';

function mkMap(overrides: Partial<MapMeta> = {}): MapMeta {
  return {
    id: 'donjon-de-l-aube',
    name: "Donjon de l'aube",
    imageUrl: null,
    gridSize: 70,
    feetPerSquare: 5,
    showGrid: true,
    fogEnabled: false,
    lightingEnabled: false,
    fogPolygons: [],
    lightSources: [],
    aoeTemplates: [],
    schemaVersion: 1,
    createdAt: null,
    updatedAt: null,
    updatedBy: 'u1',
    ...overrides,
  };
}

describe('MapSettingsModal', () => {
  it('ne rend rien quand aucune carte n’est passée (panneau fermé)', () => {
    render(<MapSettingsModal map={null} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByTestId('map-settings-save')).toBeNull();
  });

  it('reflète le calibrage courant — 5 ft s’affiche « 1,5 » mètre', () => {
    render(<MapSettingsModal map={mkMap()} onSave={vi.fn()} onClose={vi.fn()} />);
    expect((screen.getByTestId('map-settings-name') as HTMLInputElement).value).toBe(
      "Donjon de l'aube",
    );
    expect(
      (screen.getByTestId('map-settings-grid-size') as HTMLInputElement).value,
    ).toBe('70');
    expect((screen.getByTestId('map-settings-scale') as HTMLInputElement).value).toBe(
      '1,5',
    );
  });

  it('enregistre l’échelle saisie en mètres sous forme de pieds entiers', () => {
    const onSave = vi.fn();
    render(<MapSettingsModal map={mkMap()} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId('map-settings-scale'), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByTestId('map-settings-grid-size'), {
      target: { value: '64' },
    });
    fireEvent.click(screen.getByTestId('map-settings-save'));
    expect(onSave).toHaveBeenCalledWith({
      name: "Donjon de l'aube",
      gridSize: 64,
      feetPerSquare: 10,
      imageUrl: null,
    });
  });

  it('accepte la virgule décimale française à la saisie', () => {
    const onSave = vi.fn();
    render(<MapSettingsModal map={mkMap()} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId('map-settings-scale'), {
      target: { value: '4,5' },
    });
    fireEvent.click(screen.getByTestId('map-settings-save'));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ feetPerSquare: 15 }),
    );
  });

  it('refuse d’enregistrer une échelle vide ou une grille hors bornes', () => {
    const onSave = vi.fn();
    render(<MapSettingsModal map={mkMap()} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId('map-settings-scale'), {
      target: { value: '' },
    });
    expect(
      (screen.getByTestId('map-settings-save') as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByTestId('map-settings-save'));
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('map-settings-scale'), {
      target: { value: '1,5' },
    });
    fireEvent.change(screen.getByTestId('map-settings-grid-size'), {
      target: { value: '2' },
    });
    expect(
      (screen.getByTestId('map-settings-save') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('une URL d’image vide repart en `null` (le schéma refuse la chaîne vide)', () => {
    const onSave = vi.fn();
    render(
      <MapSettingsModal
        map={mkMap({ imageUrl: 'https://exemple.test/plan.webp' })}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    expect(
      (screen.getByTestId('map-settings-image-url') as HTMLInputElement).value,
    ).toBe('https://exemple.test/plan.webp');
    fireEvent.change(screen.getByTestId('map-settings-image-url'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByTestId('map-settings-save'));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: null }),
    );
  });
});
