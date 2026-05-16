import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import {
  FormField,
  TextInput,
  NumberInput,
  Select,
  Checkbox,
  RadioGroup,
} from '../form';

/**
 * Tests a11y du form-kit (plan 05 §B.7).
 *
 * Ils gardent quatre invariants structurels :
 *  1. `htmlFor`/`id` correctement liés (cliquer le label focus le contrôle).
 *  2. `aria-invalid="true"` + erreur lue par AT quand `error` fourni.
 *  3. `aria-describedby` chaîne helper et error correctement quand les deux existent.
 *  4. Composants neutres : pas de classes Tailwind "blanc/blanc" qui ressusciteraient
 *     le bug du plan 05 v1.
 */

describe('<FormField>', () => {
  it("lie le label à l'input via htmlFor/id (cliquer focus)", () => {
    render(
      <FormField label="Nom">
        {(fieldProps) => <TextInput defaultValue="" {...fieldProps} />}
      </FormField>,
    );
    const label = screen.getByText('Nom');
    const input = screen.getByLabelText('Nom') as HTMLInputElement;
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.id).toBeTruthy();
  });

  it('marque aria-invalid=true + lie aria-describedby vers le message d\'erreur', () => {
    render(
      <FormField label="Niveau" error="Doit être ≥ 1">
        {(fieldProps) => <TextInput defaultValue="0" {...fieldProps} />}
      </FormField>,
    );
    const input = screen.getByLabelText('Niveau');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const errorEl = document.getElementById(describedBy ?? '');
    expect(errorEl?.textContent).toBe('Doit être ≥ 1');
    expect(errorEl?.getAttribute('role')).toBe('alert');
  });

  it("affiche le helper neutre quand pas d'erreur, l'erreur sinon (pas les deux)", () => {
    const { rerender } = render(
      <FormField label="Email" helper="Optionnel.">
        {(fieldProps) => <TextInput {...fieldProps} />}
      </FormField>,
    );
    expect(screen.getByText('Optionnel.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(
      <FormField label="Email" helper="Optionnel." error="Format invalide">
        {(fieldProps) => <TextInput {...fieldProps} />}
      </FormField>,
    );
    expect(screen.queryByText('Optionnel.')).not.toBeInTheDocument();
    expect(screen.getByRole('alert').textContent).toBe('Format invalide');
  });
});

describe('<TextInput>', () => {
  it('utilise les tokens lisibles (bg-bg-3/40, text-text) — anti-régression plan 05 §0.3', () => {
    render(<TextInput defaultValue="x" data-testid="ti" />);
    const input = screen.getByTestId('ti');
    expect(input.className).toContain('bg-bg-3/40');
    expect(input.className).toContain('text-text');
    // Garde-fou : aucune classe morte ne doit revenir
    expect(input.className).not.toContain('text-text-primary');
    expect(input.className).not.toContain('bg-bg-deep');
  });

  it('touche target min-h-[44px]', () => {
    render(<TextInput defaultValue="x" data-testid="ti" />);
    expect(screen.getByTestId('ti').className).toContain('min-h-[44px]');
  });
});

describe('<NumberInput>', () => {
  function Harness({ initial }: { initial: number }): JSX.Element {
    const [v, setV] = useState(initial);
    return (
      <NumberInput
        value={v}
        min={1}
        max={20}
        onValueChange={setV}
        decrementLabel="Diminuer"
        incrementLabel="Augmenter"
      />
    );
  }

  it('+/− steppers incrémente/décrémente et respecte min/max', () => {
    render(<Harness initial={1} />);
    const dec = screen.getByLabelText('Diminuer');
    const inc = screen.getByLabelText('Augmenter');
    // On est au min, dec doit être disabled
    expect(dec).toBeDisabled();
    fireEvent.click(inc);
    expect(screen.getByRole('spinbutton')).toHaveValue(2);
    expect(dec).not.toBeDisabled();
  });

  it("expose aria-valuemin/max/now sur l'input", () => {
    render(<Harness initial={5} />);
    const input = screen.getByRole('spinbutton');
    expect(input.getAttribute('aria-valuemin')).toBe('1');
    expect(input.getAttribute('aria-valuemax')).toBe('20');
    expect(input.getAttribute('aria-valuenow')).toBe('5');
  });
});

describe('<Select>', () => {
  it('rend les options et le placeholder désactivé', () => {
    render(
      <Select
        defaultValue=""
        placeholder="Choisir…"
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
        aria-label="Test"
      />,
    );
    const placeholder = screen.getByRole('option', { name: 'Choisir…' });
    expect(placeholder).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument();
  });
});

describe('<Checkbox>', () => {
  it('toute la ligne (label + box) est cliquable, hauteur ≥ 44px', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Checkbox label="Concentration" onChange={onChange} />,
    );
    const label = container.querySelector('label');
    expect(label?.className).toContain('min-h-[44px]');
    const input = screen.getByRole('checkbox');
    fireEvent.click(input);
    expect(onChange).toHaveBeenCalled();
  });
});

describe('<RadioGroup>', () => {
  function Harness({ initial }: { initial: 'a' | 'b' }): JSX.Element {
    const [v, setV] = useState<'a' | 'b'>(initial);
    return (
      <RadioGroup
        legend="Méthode"
        name="method"
        value={v}
        onValueChange={setV}
        options={[
          { value: 'a', label: 'Alpha', helper: 'aide A' },
          { value: 'b', label: 'Beta' },
        ]}
      />
    );
  }

  it('rend fieldset + legend + radios, sélection contrôlée', () => {
    render(<Harness initial="a" />);
    expect(screen.getByText('Méthode').tagName).toBe('LEGEND');
    const radioA = screen.getByLabelText(/Alpha/);
    const radioB = screen.getByLabelText(/Beta/);
    expect(radioA).toBeChecked();
    expect(radioB).not.toBeChecked();
    fireEvent.click(radioB);
    expect(radioB).toBeChecked();
  });

  it("le helper d'une option est lié à son radio via aria-describedby", () => {
    render(<Harness initial="a" />);
    const radioA = screen.getByLabelText(/Alpha/);
    const desc = radioA.getAttribute('aria-describedby');
    expect(desc).toBeTruthy();
    expect(document.getElementById(desc ?? '')?.textContent).toBe('aide A');
  });
});
