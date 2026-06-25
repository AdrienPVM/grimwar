import { describe, expect, it } from 'vitest';

import { SHEET_MODES } from '@/features/sheet/use-sheet-mode';

import { buildWedges, type Wedge } from '../wedge-config';

/**
 * Invariants de la config data-driven des wedges (plan 11). Couvre la matrice de
 * gating (canEdit × showHistory) — la couche gestuelle future consommera la même
 * config, donc ces invariants la protègent aussi.
 */

function ids(wedges: readonly Wedge[]): string[] {
  return wedges.map((w) => w.id);
}

describe('buildWedges', () => {
  it('propriétaire (canEdit + historique) : 5 wedges dans l’ordre du proto', () => {
    const w = buildWedges({ canEdit: true, showHistory: true });
    expect(ids(w)).toEqual(['go', 'spells', 'rest', 'roll', 'tools']);
  });

  it('« Aller à » expose exactement les 5 modes de fiche dans l’ordre', () => {
    const go = buildWedges({ canEdit: true, showHistory: true }).find((w) => w.id === 'go');
    expect(go?.action.kind).toBe('submenu');
    expect(go?.children?.map((c) => c.id)).toEqual(SHEET_MODES.map((m) => `go-${m}`));
    // Chaque enfant bascule vers son mode.
    for (const child of go?.children ?? []) {
      expect(child.action).toMatchObject({ kind: 'switch-mode' });
    }
  });

  it('« Sorts » et « Lancer » sont toujours présents', () => {
    const w = buildWedges({ canEdit: false, showHistory: false });
    expect(ids(w)).toContain('spells');
    expect(ids(w)).toContain('roll');
  });

  it('« Sorts » saute vers le mode Magie ; « Lancer » fait un d20', () => {
    const w = buildWedges({ canEdit: true, showHistory: true });
    expect(w.find((x) => x.id === 'spells')?.action).toEqual({ kind: 'switch-mode', mode: 'magie' });
    expect(w.find((x) => x.id === 'roll')?.action).toEqual({ kind: 'quick-d20' });
  });

  it('lecture seule (!canEdit) : pas de « Repos », pas d’« Inspiration »', () => {
    const w = buildWedges({ canEdit: false, showHistory: true });
    expect(ids(w)).not.toContain('rest');
    const tools = w.find((x) => x.id === 'tools');
    // Outils reste présent grâce à l'Historique, mais sans Inspiration.
    expect(tools?.children?.map((c) => c.id)).toEqual(['tool-history']);
  });

  it('« Outils » absent si aucun enfant (lecture seule + historique masqué)', () => {
    const w = buildWedges({ canEdit: false, showHistory: false });
    expect(ids(w)).not.toContain('tools');
    expect(ids(w)).not.toContain('rest');
    // Restent : navigation (go), sorts, lancer.
    expect(ids(w)).toEqual(['go', 'spells', 'roll']);
  });

  it('« Repos » contient court (short-rest) et long (long-rest)', () => {
    const rest = buildWedges({ canEdit: true, showHistory: true }).find((w) => w.id === 'rest');
    expect(rest?.children?.map((c) => c.action.kind)).toEqual(['short-rest', 'long-rest']);
  });

  it('« Outils » propriétaire : Inspiration puis Historique', () => {
    const tools = buildWedges({ canEdit: true, showHistory: true }).find((w) => w.id === 'tools');
    expect(tools?.children?.map((c) => c.action.kind)).toEqual([
      'toggle-inspiration',
      'open-history',
    ]);
  });
});
