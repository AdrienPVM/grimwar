import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Button } from '../button';
import { Tooltip } from '../tooltip';

/**
 * Infobulle accessible — garde-fous comportementaux.
 *
 * Le layout (position/débordement) n'est pas mesurable sous jsdom : ces tests
 * couvrent l'ARIA, l'ouverture/fermeture par focus/survol/Échap, la suppression
 * au toucher, et le câblage nom-vs-description selon la variante de bouton.
 */
describe('<Tooltip>', () => {
  it("rend la cible et l'infobulle (role=tooltip) avec le texte", () => {
    render(
      <Tooltip label="Lancer un dé">
        <button type="button">D20</button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'D20' })).toBeTruthy();
    expect(screen.getByRole('tooltip', { hidden: true }).textContent).toBe('Lancer un dé');
  });

  it('câble aria-describedby par défaut (infobulle = description)', () => {
    render(
      <Tooltip label="Aide">
        <button type="button">OK</button>
      </Tooltip>,
    );
    const btn = screen.getByRole('button');
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(btn.getAttribute('aria-describedby')).toBe(tip.id);
  });

  it('câble aria-labelledby quand nameTrigger et pas de nom propre (infobulle = nom)', () => {
    render(
      <Tooltip label="Supprimer" nameTrigger>
        <button type="button" aria-hidden="false" />
      </Tooltip>,
    );
    const btn = screen.getByRole('button', { name: 'Supprimer' });
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(btn.getAttribute('aria-labelledby')).toBe(tip.id);
    expect(btn.getAttribute('aria-describedby')).toBeNull();
  });

  it("préserve un aria-label existant : retombe sur describedby même si nameTrigger", () => {
    render(
      <Tooltip label="Fermer la fenêtre" nameTrigger>
        <button type="button" aria-label="Fermer" />
      </Tooltip>,
    );
    const btn = screen.getByRole('button', { name: 'Fermer' });
    const tip = screen.getByRole('tooltip', { hidden: true });
    // Le nom propre gagne ; l'infobulle ne devient qu'une description.
    expect(btn.getAttribute('aria-labelledby')).toBeNull();
    expect(btn.getAttribute('aria-describedby')).toBe(tip.id);
  });

  it('est masquée par défaut, visible au focus, re-masquée au blur', () => {
    render(
      <Tooltip label="Aide">
        <button type="button">OK</button>
      </Tooltip>,
    );
    const tip = screen.getByRole('tooltip', { hidden: true });
    const btn = screen.getByRole('button');
    expect(tip.className).toContain('opacity-0');

    fireEvent.focus(btn);
    expect(tip.className).toContain('opacity-100');

    fireEvent.blur(btn);
    expect(tip.className).toContain('opacity-0');
  });

  it('apparaît au survol souris, disparaît à la sortie', () => {
    render(
      <Tooltip label="Aide">
        <button type="button">OK</button>
      </Tooltip>,
    );
    const wrapper = screen.getByRole('button').parentElement as HTMLElement;
    const tip = screen.getByRole('tooltip', { hidden: true });

    fireEvent.pointerEnter(wrapper, { pointerType: 'mouse' });
    expect(tip.className).toContain('opacity-100');

    fireEvent.pointerLeave(wrapper);
    expect(tip.className).toContain('opacity-0');
  });

  it('ne se déclenche PAS au toucher (un tap = action, pas de flash)', () => {
    render(
      <Tooltip label="Aide">
        <button type="button">OK</button>
      </Tooltip>,
    );
    const wrapper = screen.getByRole('button').parentElement as HTMLElement;
    const tip = screen.getByRole('tooltip', { hidden: true });

    // jsdom n'expose pas PointerEvent → `fireEvent.pointerEnter(el, { pointerType })`
    // perd `pointerType`. On force la propriété sur l'événement natif pour que
    // l'event synthétique de React la lise (cf. note jsdom du projet).
    const ev = createEvent.pointerEnter(wrapper);
    Object.defineProperty(ev, 'pointerType', { value: 'touch', configurable: true });
    fireEvent(wrapper, ev);
    expect(tip.className).toContain('opacity-0');
  });

  it('se ferme sur Échap', () => {
    render(
      <Tooltip label="Aide">
        <button type="button">OK</button>
      </Tooltip>,
    );
    const btn = screen.getByRole('button');
    const tip = screen.getByRole('tooltip', { hidden: true });

    fireEvent.focus(btn);
    expect(tip.className).toContain('opacity-100');

    fireEvent.keyDown(btn, { key: 'Escape' });
    expect(tip.className).toContain('opacity-0');
  });
});

describe('<Button tooltip>', () => {
  it("sans tooltip : rend un <button> nu sans enveloppe d'infobulle", () => {
    render(<Button>Valider</Button>);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('variante icon : tooltip devient le nom accessible', () => {
    render(
      <Button variant="icon" tooltip="Dupliquer le jeton">
        ⧉
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Dupliquer le jeton' });
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(btn.getAttribute('aria-labelledby')).toBe(tip.id);
  });

  it('variante texte : tooltip décrit le bouton (nom = texte)', () => {
    render(
      <Button variant="secondary" tooltip="Crée une nouvelle campagne">
        Nouvelle campagne
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Nouvelle campagne' });
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(btn.getAttribute('aria-describedby')).toBe(tip.id);
  });
});
