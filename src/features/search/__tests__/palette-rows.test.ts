import { describe, expect, it } from 'vitest';

import { normalizeForSearch } from '@/shared/lib/search-normalize';

import { DESTINATIONS, filterRows, nextIndex, type PaletteRow } from '../palette-rows';

/**
 * Le filtrage et le parcours clavier de la palette, testés sans DOM : c'est la
 * partie où se logent les vrais pièges (une liste vide, une requête accentuée,
 * un bord de liste).
 */

function row(label: string, extra = ''): PaletteRow {
  return {
    key: `k:${label}`,
    label,
    haystack: normalizeForSearch(`${label} ${extra}`),
    activate: () => undefined,
  };
}

const ROWS: PaletteRow[] = [
  row('Kaelen l’Éveillé', 'Magicien niv. 5'),
  row('Brok', 'Barbare niv. 3'),
  row('La Mort du Roi', 'Tu es MJ'),
];

describe('Palette — filtrage des rangées', () => {
  it('une requête vide rend tout : la palette dit ce qu’elle sait faire', () => {
    expect(filterRows(ROWS, '')).toHaveLength(3);
    expect(filterRows(ROWS, '   ')).toHaveLength(3);
  });

  it('trouve un personnage sans son accent', () => {
    expect(filterRows(ROWS, 'eveille').map((r) => r.label)).toEqual([
      'Kaelen l’Éveillé',
    ]);
  });

  it('fouille aussi la méta, pas seulement le nom', () => {
    expect(filterRows(ROWS, 'barbare').map((r) => r.label)).toEqual(['Brok']);
  });

  it('rend une liste vide quand rien ne correspond', () => {
    expect(filterRows(ROWS, 'zzz')).toEqual([]);
  });
});

describe('Palette — destinations', () => {
  it('chaque destination répond à un mot que l’utilisateur taperait vraiment', () => {
    const rows = DESTINATIONS.map((d) => ({
      ...row(d.to),
      haystack: normalizeForSearch(`${d.to} ${d.keywords.join(' ')}`),
    }));
    // « sort » doit mener au Codex même si le mot « sort » n'est pas son nom.
    expect(filterRows(rows, 'sorts').map((r) => r.label)).toContain('/codex');
    // « creer » mène au wizard.
    expect(filterRows(rows, 'creer').map((r) => r.label)).toContain('/create');
    // « des » (réglage de dés) mène au compte.
    expect(filterRows(rows, 'haptique').map((r) => r.label)).toContain('/account');
  });

  it('aucune destination ne pointe deux fois au même endroit', () => {
    const targets = DESTINATIONS.map((d) => d.to);
    expect(new Set(targets).size).toBe(targets.length);
  });
});

describe('Palette — parcours clavier', () => {
  it('descend, remonte, et boucle aux deux bouts', () => {
    expect(nextIndex(0, 3, 1)).toBe(1);
    expect(nextIndex(2, 3, 1)).toBe(0);
    expect(nextIndex(0, 3, -1)).toBe(2);
    expect(nextIndex(1, 3, -1)).toBe(0);
  });

  it('sur une liste vide, aucune rangée n’est sélectionnée', () => {
    expect(nextIndex(0, 0, 1)).toBe(-1);
    expect(nextIndex(-1, 0, -1)).toBe(-1);
  });

  it('depuis « rien de sélectionné », descendre prend la première et monter la dernière', () => {
    expect(nextIndex(-1, 4, 1)).toBe(0);
    expect(nextIndex(-1, 4, -1)).toBe(3);
  });
});
