import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Icon } from '../icon';
import { Chip } from '../chip';
import { GlassPanel } from '../glass-panel';

describe('<Icon>', () => {
  it('renders an <svg> referencing the named sprite symbol', () => {
    const { container } = render(<Icon name="i-flame" data-testid="ico" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const use = svg?.querySelector('use');
    expect(use?.getAttribute('href')).toBe('#i-flame');
  });

  it('forwards className while preserving the .ic reset', () => {
    const { container } = render(<Icon name="i-dice" className="w-5 h-5" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('ic');
    expect(svg?.getAttribute('class')).toContain('w-5');
  });
});

describe('<Chip>', () => {
  it('applies the damage variant classes', () => {
    render(<Chip variant="damage">Choc</Chip>);
    const chip = screen.getByText('Choc');
    expect(chip.className).toContain('text-crimson');
    expect(chip.className).toContain('border-crimson/35');
  });

  it('exposes role=button + keyboard handling when onToggle is provided', () => {
    const { getByText } = render(
      <Chip variant="magic" onToggle={() => undefined}>
        Concentration
      </Chip>,
    );
    const chip = getByText('Concentration');
    expect(chip.getAttribute('role')).toBe('button');
    expect(chip.getAttribute('tabindex')).toBe('0');
  });
});

describe('<GlassPanel>', () => {
  it('renders children inside a glass surface', () => {
    render(
      <GlassPanel>
        <span data-testid="inside">Hello</span>
      </GlassPanel>,
    );
    expect(screen.getByTestId('inside').textContent).toBe('Hello');
  });

  it('respects the `as` tag override', () => {
    const { container } = render(
      <GlassPanel as="section">
        <span>x</span>
      </GlassPanel>,
    );
    expect(container.firstElementChild?.tagName).toBe('SECTION');
  });
});
