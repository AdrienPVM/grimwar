import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Button } from '../button';
import { cn } from '@/shared/lib/cn';

/**
 * Anti-régression — UAT navigateur a révélé "texte crème sur bouton or".
 *
 * Cause racine : `tailwind-merge` traite par défaut `text-ink` (couleur custom
 * du thème) et `text-meta` (taille de police custom du thème) dans le même
 * groupe `text-*` et garde le DERNIER. `cva` concatène `primary` (text-ink)
 * AVANT `size:md` (text-meta) → `text-ink` est évincé → fallback héritage
 * `color: var(--text)` crème → contraste cassé sur fond or.
 *
 * Les tests suivants DOIVENT échouer tant que `cn()` n'est pas configuré avec
 * le thème custom (`extendTailwindMerge`).
 */

describe('cn() — thème custom (anti-régression UAT)', () => {
  it('ne fusionne PAS text-ink (couleur) avec text-meta (taille de police)', () => {
    const out = cn('text-ink', 'text-meta');
    expect(out).toContain('text-ink');
    expect(out).toContain('text-meta');
  });

  it('ne fusionne PAS text-text (couleur) avec text-body (taille de police)', () => {
    const out = cn('text-text', 'text-body');
    expect(out).toContain('text-text');
    expect(out).toContain('text-body');
  });

  it('fusionne quand même les vrais conflits (text-ink + text-text → garde le dernier)', () => {
    const out = cn('text-ink', 'text-text');
    expect(out).not.toContain('text-ink');
    expect(out).toContain('text-text');
  });

  it('fusionne quand même text-meta + text-body (deux tailles → garde la dernière)', () => {
    const out = cn('text-meta', 'text-body');
    expect(out).not.toContain('text-meta');
    expect(out).toContain('text-body');
  });
});

describe('<Button variant="primary"> — lisibilité (anti-régression UAT)', () => {
  it('conserve text-ink (encre foncée) sur fond or — pas de fallback crème', () => {
    render(
      <Button variant="primary" size="md">
        Suivant
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-ink');
    // Garde-fou explicite : la couleur crème NE DOIT PAS être posée sur primary
    expect(btn.className).not.toMatch(/(^|\s)text-text(\s|$)/);
  });

  it('compose proprement primary + size avec taille text-meta préservée', () => {
    render(
      <Button variant="primary" size="md">
        Suivant
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-ink');
    expect(btn.className).toContain('text-meta');
  });
});
