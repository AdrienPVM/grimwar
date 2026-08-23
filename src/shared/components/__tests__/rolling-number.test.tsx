import { act, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RollingNumber } from '../rolling-number';
import { ToastHost } from '../toast-host';
import { showToast, useToastStore } from '../../lib/slices/toast-slice';

function setReducedMotion(reduce: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
}

describe('<RollingNumber />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    useToastStore.setState({ toasts: [] });
  });

  it('annonce la vraie valeur dès la première image, jamais les faces intermédiaires', () => {
    // La pile de toasts est une région `aria-live`. Sans texte hors écran
    // stable, un lecteur d'écran énoncerait sept nombres FAUX avant le bon.
    render(<RollingNumber value="18" />);
    // Sélecteur explicite : pendant la culbute, la face visible PEUT tomber par
    // hasard sur la valeur finale — un `getByText` nu serait alors ambigu, donc
    // rouge une fois sur sept sans qu'aucun code n'ait bougé.
    const announced = screen.getByText('18', { selector: '.sr-only' });
    expect(announced).toHaveClass('sr-only');
    // La face visible pendant la culbute est retirée de l'arbre d'accessibilité.
    const visible = announced.nextElementSibling;
    expect(visible).toHaveAttribute('aria-hidden', 'true');
  });

  it('se pose sur la valeur exacte à la fin de la culbute', () => {
    render(<RollingNumber value="18" />);
    const visible = screen.getByText('18', { selector: '.sr-only' }).nextElementSibling;

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(visible).toHaveTextContent('18');
  });

  it('se pose aussi sous StrictMode, qui monte deux fois', () => {
    // L'app tourne sous `<StrictMode>` : React monte l'effet, le démonte, puis
    // le remonte. Une version antérieure gardait la dernière valeur culbutée
    // dans une `ref` et sortait tôt au second montage — sans relancer les
    // minuteurs que le démontage venait d'arrêter. Le total restait alors figé
    // À JAMAIS sur une face intermédiaire tirée au hasard, et le joueur lisait
    // « 22 » au-dessus d'un détail qui totalisait 25. Trouvé sur une capture
    // d'UAT, pas par un test : les autres cas de ce fichier montent une seule
    // fois et ne pouvaient pas le voir.
    render(
      <StrictMode>
        <RollingNumber value="25" />
      </StrictMode>,
    );
    const visible = screen.getByText('25', { selector: '.sr-only' })
      .nextElementSibling;

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(visible).toHaveTextContent('25');
  });

  it('ne culbute pas un résultat composite', () => {
    // « 18 → 7 » (chaîne attaque → dégâts) n'a pas de face intermédiaire qui
    // veuille dire quoi que ce soit.
    render(<RollingNumber value="18 → 7" />);
    const visible = screen.getByText('18 → 7', { selector: '.sr-only' }).nextElementSibling;
    expect(visible).toHaveTextContent('18 → 7');
  });

  it('ne culbute pas un libellé', () => {
    render(<RollingNumber value="✗ Raté" />);
    const visible = screen.getByText('✗ Raté', { selector: '.sr-only' }).nextElementSibling;
    expect(visible).toHaveTextContent('✗ Raté');
  });

  it('affiche directement le résultat en mouvement réduit', () => {
    setReducedMotion(true);
    render(<RollingNumber value="18" />);
    const visible = screen.getByText('18', { selector: '.sr-only' }).nextElementSibling;
    expect(visible).toHaveTextContent('18');
  });

  it("est câblé dans la pile de toasts, pas seulement disponible", () => {
    render(<ToastHost />);
    act(() => {
      showToast({ kind: 'roll', title: 'Perception', big: '17' });
    });
    expect(screen.getByText('17', { selector: '.sr-only' })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
  });
});
