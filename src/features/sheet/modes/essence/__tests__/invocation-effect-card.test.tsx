import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InvocationEffectCard } from '../invocation-effect-card';

/**
 * D13a + D13b + D13c — InvocationEffectCard. Tests d'identité (cat. 2) +
 * cas-limites (cat. 6).
 *
 *  - Pour `armor-of-shadows`, la carte rend EXACTEMENT le label canonique
 *    « CA = 13 + modificateur de Dextérité » + la condition d'application
 *    « sans armure équipée, bouclier cumulable » (vocabulaire WotC FR officiel).
 *  - Pour `eldritch-mind` (D13b), la carte rend EXACTEMENT le label
 *    « Avantage aux jets de Constitution pour la Concentration » + la
 *    condition d'application.
 *  - Pour `pact-of-the-blade` (D13c), la carte rend le label
 *    « Arme de pacte invoquée » + 4 lignes structurées (action / arme /
 *    caractéristique d'attaque / types de dégâts) + caveat « différé ».
 *  - Pour les 2 autres invocations L1 (`pact-of-the-chain`,
 *    `pact-of-the-tome`) la carte ne rend rien (effet runtime pas câblé —
 *    D13d-e). Pas de placeholder trompeur.
 *  - Pour un slug inconnu (seed corrompu) la carte ne rend rien sans crash.
 */
describe('<InvocationEffectCard>', () => {
  it('cat. 2 — armor-of-shadows rend le label « CA = 13 + modificateur de Dextérité »', () => {
    const { container } = render(
      <InvocationEffectCard slug="armor-of-shadows" />,
    );
    expect(container.firstChild).not.toBeNull();
    expect(
      screen.getByTestId('invocation-effect-label'),
    ).toHaveTextContent(/CA = 13 \+ modificateur de Dextérité/);
    expect(
      screen.getByText(
        /S'applique uniquement sans armure équipée. Le bouclier reste cumulable./,
      ),
    ).toBeInTheDocument();
  });

  it('cat. 2 — armor-of-shadows rend le titre « Mécanique »', () => {
    render(<InvocationEffectCard slug="armor-of-shadows" />);
    expect(screen.getByText('Mécanique')).toBeInTheDocument();
  });

  it('cat. 2 — eldritch-mind rend le label « Avantage aux jets de Constitution pour la Concentration »', () => {
    const { container } = render(
      <InvocationEffectCard slug="eldritch-mind" />,
    );
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByTestId('invocation-effect-label')).toHaveTextContent(
      /Avantage aux jets de Constitution pour la Concentration/,
    );
    expect(
      screen.getByText(
        /S'applique à chaque jet de sauvegarde de Constitution effectué pour maintenir la Concentration sur un sort\./,
      ),
    ).toBeInTheDocument();
  });

  it('cat. 2 — eldritch-mind rend le titre « Mécanique »', () => {
    render(<InvocationEffectCard slug="eldritch-mind" />);
    expect(screen.getByText('Mécanique')).toBeInTheDocument();
  });

  it('cat. 2 — pact-of-the-blade rend le label « Arme de pacte invoquée » + 4 lignes structurées', () => {
    const { container } = render(
      <InvocationEffectCard slug="pact-of-the-blade" />,
    );
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByTestId('invocation-effect-label')).toHaveTextContent(
      /Arme de pacte invoquée/,
    );
    // Les 4 lignes structurées (action / arme / capacité / dégâts).
    expect(
      screen.getByText(
        /Action bonus pour invoquer ou rappeler l'arme de pacte\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Arme de corps à corps simple ou de guerre, au choix au moment du lien\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Vous pouvez utiliser votre modificateur de Charisme aux jets d’attaque et de dégâts\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Type de dégâts au choix : nécrotiques, psychiques, radiants, ou le type normal de l’arme\./,
      ),
    ).toBeInTheDocument();
    // Caveat « différé » présent.
    expect(
      screen.getByText(
        /Annoncez votre choix au MJ — l'intégration moteur de combat est différée à un plan ultérieur\./,
      ),
    ).toBeInTheDocument();
  });

  it('cat. 2 — pact-of-the-blade rend le titre « Mécanique »', () => {
    render(<InvocationEffectCard slug="pact-of-the-blade" />);
    expect(screen.getByText('Mécanique')).toBeInTheDocument();
  });

  it('cat. 2 — pact-of-the-chain rend le label « Appel de familier amélioré » + 3 lignes structurées', () => {
    const { container } = render(
      <InvocationEffectCard slug="pact-of-the-chain" />,
    );
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByTestId('invocation-effect-label')).toHaveTextContent(
      /Appel de familier amélioré/,
    );
    expect(
      screen.getByText(/Action magique pour lancer Appel de familier/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Aucun emplacement de sort consommé à chaque incantation\./,
      ),
    ).toBeInTheDocument();
    // D13d-followup-summary résolu 2026-05-28 : terminologie WotC FR
    // officielle (SRD FR 5.2.1 p. 142) — 7 formes spéciales.
    expect(
      screen.getByText(
        /Formes spéciales au choix : Diablotin, esprit follet, pseudodragon, quasit, sphinx merveilleux, serpent venimeux ou squelette/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Profils complets bundlés à ce jour/),
    ).toBeInTheDocument();
  });

  it('cat. 2 — pact-of-the-chain rend le titre « Mécanique »', () => {
    render(<InvocationEffectCard slug="pact-of-the-chain" />);
    expect(screen.getByText('Mécanique')).toBeInTheDocument();
  });

  it('cat. 2 — pact-of-the-tome rend le label « Codex des Ombres » + 3 lignes structurées', () => {
    const { container } = render(
      <InvocationEffectCard slug="pact-of-the-tome" />,
    );
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByTestId('invocation-effect-label')).toHaveTextContent(
      /Codex des Ombres/,
    );
    expect(
      screen.getByText(
        /Apprenez 3 sorts mineurs au choix de n'importe quelle classe\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Apprenez 2 sorts du 1ᵉʳ niveau marqués « Rituel » au choix de n'importe quelle classe\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Le grimoire sert de focaliseur d'incantation pour vos sorts d'Occultiste\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Choisissez vos 5 sorts avec votre MJ/),
    ).toBeInTheDocument();
  });

  it('cat. 2 — pact-of-the-tome rend le titre « Mécanique »', () => {
    render(<InvocationEffectCard slug="pact-of-the-tome" />);
    expect(screen.getByText('Mécanique')).toBeInTheDocument();
  });

  it('cat. 6 — séquence D13a-e CLOSE : aucune invocation L1 ne renvoie null', () => {
    for (const slug of [
      'armor-of-shadows',
      'eldritch-mind',
      'pact-of-the-blade',
      'pact-of-the-chain',
      'pact-of-the-tome',
    ]) {
      const { container } = render(<InvocationEffectCard slug={slug} />);
      expect(
        container.firstChild,
        `${slug} doit rendre la section Mécanique (séquence D13a-e close)`,
      ).not.toBeNull();
    }
  });

  it('cat. 6 — slug inconnu (seed corrompu) ne rend rien sans crash', () => {
    const { container } = render(
      <InvocationEffectCard slug="invocation-fantome-inexistante" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
