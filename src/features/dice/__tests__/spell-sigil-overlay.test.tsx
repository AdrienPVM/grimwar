import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { SpellSigilOverlay } from '../spell-sigil-overlay';
import { _clearSigilCache, SCHOOL_COLORS } from '../sigils';
import { useCastFxStore, triggerCastSigil } from '@/shared/lib/slices/cast-fx-slice';

function resetStore(): void {
  useCastFxStore.setState({ sigil: null, nonce: 0 });
}

describe('<SpellSigilOverlay>', () => {
  beforeEach(() => {
    resetStore();
    _clearSigilCache();
    // jsdom n'implémente pas matchMedia → non-reduced par défaut (anims actives).
    // @ts-expect-error — nettoyage du mock éventuel d'un test précédent.
    delete window.matchMedia;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ne rend rien tant qu\'aucun sort n\'est lancé', () => {
    render(<SpellSigilOverlay />);
    expect(screen.queryByTestId('spell-sigil-overlay')).toBeNull();
  });

  it('rend le sceau aux couleurs de l\'école après déclenchement', () => {
    render(<SpellSigilOverlay />);
    act(() => {
      triggerCastSigil({ spellId: 'boule-de-feu', school: 'evocation', level: 3, components: { v: true, s: true, m: true } });
    });
    const overlay = screen.getByTestId('spell-sigil-overlay');
    expect(overlay).toHaveAttribute('data-school', 'evocation');
    // Le halo et l'éclat portent la couleur d'école (crimson).
    const html = overlay.innerHTML;
    expect(html).toContain(SCHOOL_COLORS.evocation);
    // Le cœur est tracé en or vif.
    expect(html).toContain('#fde9b4');
  });

  it('décoratif : aria-hidden + pointer-events-none (n\'intercepte rien)', () => {
    render(<SpellSigilOverlay />);
    act(() => {
      triggerCastSigil({ spellId: 'x', school: 'illusion', level: 1, components: { v: true, s: false, m: false } });
    });
    const overlay = screen.getByTestId('spell-sigil-overlay');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(overlay.className).toContain('pointer-events-none');
  });

  it('anime le tracé hors mouvement réduit', () => {
    render(<SpellSigilOverlay />);
    act(() => {
      triggerCastSigil({ spellId: 'x', school: 'abjuration', level: 2, components: { v: false, s: false, m: false } });
    });
    const overlay = screen.getByTestId('spell-sigil-overlay');
    const traced = overlay.querySelectorAll('path.animate-trace-sigil');
    expect(traced.length).toBeGreaterThan(0);
  });

  it('mouvement réduit : sceau statique, aucun tracé animé', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    render(<SpellSigilOverlay />);
    act(() => {
      triggerCastSigil({ spellId: 'x', school: 'abjuration', level: 2, components: { v: false, s: false, m: false } });
    });
    const overlay = screen.getByTestId('spell-sigil-overlay');
    expect(overlay.querySelectorAll('path.animate-trace-sigil').length).toBe(0);
    // Les chemins sont tracés complets (dashoffset 0).
    const firstPath = overlay.querySelector('path');
    expect(firstPath?.getAttribute('style') ?? '').toContain('stroke-dashoffset: 0');
  });

  it('se retire automatiquement après la durée de vie', () => {
    vi.useFakeTimers();
    render(<SpellSigilOverlay />);
    act(() => {
      triggerCastSigil({ spellId: 'x', school: 'evocation', level: 1, components: { v: true, s: false, m: false } });
    });
    expect(screen.getByTestId('spell-sigil-overlay')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(screen.queryByTestId('spell-sigil-overlay')).toBeNull();
  });
});
