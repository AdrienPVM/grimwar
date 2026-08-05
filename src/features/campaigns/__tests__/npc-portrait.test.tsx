import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NpcPortrait } from '../npc-portrait';

describe('NpcPortrait', () => {
  it('rend la PHOTO quand le portrait en porte une (M39)', () => {
    const dataUrl = 'data:image/webp;base64,AAAA';
    render(<NpcPortrait portrait={{ type: 'image', value: dataUrl }} name="Aldric" />);
    expect((screen.getByTestId('npc-portrait-image') as HTMLImageElement).src).toBe(
      dataUrl,
    );
  });

  it('retombe sur le glyphe quand la photo est vide', () => {
    render(<NpcPortrait portrait={{ type: 'image', value: '' }} name="Aldric" />);
    expect(screen.queryByTestId('npc-portrait-image')).toBeNull();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('un portrait SVG retombe sur le glyphe — jamais d’injection de balisage', () => {
    render(
      <NpcPortrait
        portrait={{ type: 'svg', value: '<svg onload="alert(1)"/>' }}
        name="Belric"
      />,
    );
    expect(screen.queryByTestId('npc-portrait-image')).toBeNull();
    expect(document.querySelector('svg')).toBeNull();
  });

  it('rend les 2 premières lettres du glyphe, en capitales', () => {
    render(<NpcPortrait portrait={{ type: 'letter', value: 'ab' }} name="Aldric" />);
    expect(screen.getByText('AB')).toBeInTheDocument();
  });
});
