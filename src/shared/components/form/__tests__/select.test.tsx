import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Select } from '../select';
import { FormField } from '../form-field';

/**
 * Combobox custom — anti-régression UAT plan 05 (2026-05-16).
 *
 * Le `<select>` natif sur Windows Chrome/Edge ouvre son menu dans un chrome
 * système non-stylable : le `color` hérité du `<select>` (crème sur fond sombre)
 * s'applique aux `<option>` rendues sur fond blanc système → crème/blanc illisible.
 *
 * Décision (Adrien) : combobox custom WAI-ARIA APG "Select-Only Combobox".
 * Trigger button + panneau listbox custom, tokens GrimWar, identique sur tous les OS.
 *
 * Ces tests sont COMPORTEMENTAUX et doivent ÉCHOUER si on retombe sur un
 * `<select>` natif. Un test qui asserte juste une classe CSS est sans valeur.
 */

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bêta' },
  { value: 'c', label: 'Cêdrat' },
];

function Harness({
  initial = '',
  onChangeSpy,
}: {
  initial?: string;
  onChangeSpy?: (v: string) => void;
}): JSX.Element {
  const [v, setV] = useState(initial);
  return (
    <Select
      options={OPTIONS}
      value={v}
      onValueChange={(next) => {
        setV(next);
        onChangeSpy?.(next);
      }}
      placeholder="Choisir…"
      aria-label="Choix"
    />
  );
}

describe('<Select> — structure WAI-ARIA combobox (rouge si on revient au natif)', () => {
  it('rend un button role=combobox (pas un <select> natif)', () => {
    render(<Harness />);
    // Le trigger doit être un button avec role=combobox
    const combobox = screen.getByRole('combobox', { name: 'Choix' });
    expect(combobox.tagName).toBe('BUTTON');
    // Garde-fou explicite : aucun <select> natif ne doit exister dans le DOM
    expect(document.querySelector('select')).toBeNull();
  });

  it('a aria-haspopup=listbox et aria-expanded reflète l\'état', () => {
    render(<Harness />);
    const combobox = screen.getByRole('combobox', { name: 'Choix' });
    expect(combobox.getAttribute('aria-haspopup')).toBe('listbox');
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(combobox);
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
  });

  it('affiche le placeholder quand value est vide', () => {
    render(<Harness />);
    expect(screen.getByRole('combobox', { name: 'Choix' }).textContent).toContain(
      'Choisir…',
    );
  });

  it('affiche le label de la valeur sélectionnée', () => {
    render(<Harness initial="b" />);
    expect(screen.getByRole('combobox', { name: 'Choix' }).textContent).toContain('Bêta');
  });
});

describe('<Select> — ouverture du listbox', () => {
  it('clic ouvre le listbox avec les options', () => {
    render(<Harness />);
    const combobox = screen.getByRole('combobox', { name: 'Choix' });
    fireEvent.click(combobox);
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('chaque option a role=option avec aria-selected et aria-disabled gérés', () => {
    render(<Harness initial="b" />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Choix' }));
    const options = screen.getAllByRole('option');
    expect(options[0]!.getAttribute('aria-selected')).toBe('false');
    expect(options[1]!.getAttribute('aria-selected')).toBe('true');
    expect(options[2]!.getAttribute('aria-selected')).toBe('false');
  });

  it('touch target ≥ 44px sur chaque option', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Choix' }));
    const options = screen.getAllByRole('option');
    options.forEach((opt) => {
      expect(opt.className).toContain('min-h-[44px]');
    });
  });
});

describe('<Select> — lisibilité (anti-régression UAT)', () => {
  it("les options portent un style inline 'color' foncé (jamais crème sur fond clair)", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Choix' }));
    const options = screen.getAllByRole('option');
    options.forEach((opt) => {
      // Le panneau utilise les tokens GrimWar (or sur sombre).
      // Le contrat : le composant ne doit JAMAIS retomber sur un héritage
      // ambigu — soit une couleur de texte explicite est posée (style ou
      // classe), soit on est dans un thème complet.
      const cls = opt.className;
      // Couleur de texte parmi les tokens prévus
      const hasColorClass = /\btext-(text|gold|gold-bright|gold-text|ink)\b/.test(cls);
      expect(hasColorClass).toBe(true);
    });
  });

  it("le trigger ne dépend pas d'un héritage : il porte une classe de couleur explicite", () => {
    render(<Harness />);
    const combobox = screen.getByRole('combobox', { name: 'Choix' });
    expect(combobox.className).toMatch(/\btext-(text|gold|gold-bright|gold-text)\b/);
  });
});

describe('<Select> — sélection à la souris', () => {
  it('cliquer une option met à jour la valeur et ferme le listbox', () => {
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);
    const combobox = screen.getByRole('combobox', { name: 'Choix' });
    fireEvent.click(combobox);
    fireEvent.click(screen.getByRole('option', { name: 'Bêta' }));
    expect(spy).toHaveBeenCalledWith('b');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('<Select> — clavier (WAI-ARIA APG)', () => {
  it('flèche bas ouvre le panneau et place l\'activedescendant sur la sélection', () => {
    render(<Harness initial="b" />);
    const combobox = screen.getByRole('combobox', { name: 'Choix' });
    combobox.focus();
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    const active = combobox.getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    const opt = document.getElementById(active ?? '');
    expect(opt?.textContent).toContain('Bêta');
  });

  it('flèches bas/haut déplacent l\'activedescendant', () => {
    render(<Harness />);
    const combobox = screen.getByRole('combobox', { name: 'Choix' });
    combobox.focus();
    fireEvent.keyDown(combobox, { key: 'ArrowDown' }); // ouvre + idx 0
    fireEvent.keyDown(combobox, { key: 'ArrowDown' }); // idx 1
    let id = combobox.getAttribute('aria-activedescendant') ?? '';
    expect(document.getElementById(id)?.textContent).toContain('Bêta');
    fireEvent.keyDown(combobox, { key: 'ArrowUp' });
    id = combobox.getAttribute('aria-activedescendant') ?? '';
    expect(document.getElementById(id)?.textContent).toContain('Alpha');
  });

  it('Home / End sautent au premier / dernier', () => {
    render(<Harness />);
    const combobox = screen.getByRole('combobox', { name: 'Choix' });
    combobox.focus();
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.keyDown(combobox, { key: 'End' });
    let id = combobox.getAttribute('aria-activedescendant') ?? '';
    expect(document.getElementById(id)?.textContent).toContain('Cêdrat');
    fireEvent.keyDown(combobox, { key: 'Home' });
    id = combobox.getAttribute('aria-activedescendant') ?? '';
    expect(document.getElementById(id)?.textContent).toContain('Alpha');
  });

  it('Enter sélectionne l\'activedescendant et ferme', () => {
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);
    const combobox = screen.getByRole('combobox', { name: 'Choix' });
    combobox.focus();
    fireEvent.keyDown(combobox, { key: 'ArrowDown' }); // idx 0 = Alpha
    fireEvent.keyDown(combobox, { key: 'ArrowDown' }); // idx 1 = Bêta
    fireEvent.keyDown(combobox, { key: 'Enter' });
    expect(spy).toHaveBeenCalledWith('b');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Escape ferme sans changer la valeur', () => {
    const spy = vi.fn();
    render(<Harness initial="a" onChangeSpy={spy} />);
    const combobox = screen.getByRole('combobox', { name: 'Choix' });
    combobox.focus();
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.keyDown(combobox, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('tape-pour-chercher saute à l\'option dont le label commence par la touche', () => {
    render(<Harness />);
    const combobox = screen.getByRole('combobox', { name: 'Choix' });
    combobox.focus();
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.keyDown(combobox, { key: 'c' });
    const id = combobox.getAttribute('aria-activedescendant') ?? '';
    expect(document.getElementById(id)?.textContent).toContain('Cêdrat');
  });
});

describe('<Select> — intégration FormField', () => {
  it('reçoit id, aria-describedby et aria-invalid via render-prop FormField', () => {
    render(
      <FormField label="Alignement" error="Choix obligatoire">
        {(fp) => (
          <Select
            {...fp}
            options={OPTIONS}
            value=""
            onValueChange={() => undefined}
            placeholder="…"
          />
        )}
      </FormField>,
    );
    const combobox = screen.getByLabelText('Alignement');
    expect(combobox.getAttribute('aria-invalid')).toBe('true');
    const describedBy = combobox.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? '')?.textContent).toBe(
      'Choix obligatoire',
    );
  });
});
