import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JournalMarkdown } from '../journal-markdown';

/**
 * Tests du renderer Markdown minimal (plan 25.2). Vérifie que le sous-ensemble
 * émis par le compilateur est rendu dans les bons éléments (H2, puces, gras,
 * italique) — pas de fuite de marqueurs `##`/`**`/`_` dans le texte affiché.
 */

describe('JournalMarkdown', () => {
  it('rend un titre de section en <h2> sans le préfixe ##', () => {
    render(<JournalMarkdown markdown={'## Combat — Embuscade'} />);
    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2).toHaveTextContent('Combat — Embuscade');
    expect(h2.textContent).not.toContain('#');
  });

  it('rend les puces en <li> dans une <ul>', () => {
    render(<JournalMarkdown markdown={'- Première ligne\n- Deuxième ligne'} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Première ligne');
    expect(items[1]).toHaveTextContent('Deuxième ligne');
  });

  it('rend le gras **…** en <strong> sans les astérisques', () => {
    render(<JournalMarkdown markdown={'- Au tour de **Gobelin 1** (round 1).'} />);
    const strong = screen.getByText('Gobelin 1');
    expect(strong.tagName).toBe('STRONG');
    // Le texte de la puce ne contient plus les marqueurs.
    expect(screen.getByRole('listitem').textContent).not.toContain('**');
  });

  it('rend l’italique _…_ en <em> sans les underscores', () => {
    render(<JournalMarkdown markdown={'_Aucun événement enregistré pour cette séance._'} />);
    const em = screen.getByText('Aucun événement enregistré pour cette séance.');
    expect(em.tagName).toBe('EM');
  });

  it('rend une ligne simple (pied d’issue) en paragraphe', () => {
    render(<JournalMarkdown markdown={'Issue : victoire.'} />);
    expect(screen.getByText('Issue : victoire.').tagName).toBe('P');
  });

  it('document complet : titre + puces + pied, structure correcte', () => {
    const md = [
      '## Combat — Embuscade',
      '',
      '- Au tour de **Lyralei** (round 1).',
      '- **Gobelin 1** subit 7 dégâts — PV : 7 → 0.',
      '',
      'Issue : victoire.',
    ].join('\n');
    render(<JournalMarkdown markdown={md} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Combat — Embuscade');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Issue : victoire.').tagName).toBe('P');
  });
});
