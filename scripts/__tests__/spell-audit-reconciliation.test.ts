import { describe, expect, it } from 'vitest';

import { SRD_SPELLS } from '../data/srd-spells';
import { LEGACY_SPELL_IDS_2014 } from '../data/legacy-spell-ids-2014';
import {
  SPELL_RENAMES_2014_TO_2024,
  SPELL_REMOVALS_NON_SRD,
} from '../maps/spell-renames-2014-to-2024';

/**
 * Plan 13.10 commit 2 — réconciliation du diff `bundle AideDD 2014` → `bundle SRD
 * 5.2.1` contre l'oracle de l'audit (`docs/AUDIT-SRD-COMPLETUDE.md > D.3`).
 *
 * Invariant DUR (rouge avant vert) : la transition se partitionne EXACTEMENT en
 * {renames ∪ retraits ∪ inchangés} côté legacy et {renames ∪ ajouts ∪ inchangés}
 * côté SRD. Tout ID non classé fait échouer le test — interdit la dérive
 * silencieuse (un sort ajouté/renommé sans entrée de map casse ici).
 *
 * Cross-check audit : l'audit D.3 ESTIMAIT 44 renames / 21 ajouts / 18 retraits.
 * La réconciliation réelle donne 50 / 16 / 7. L'écart est catalogué (pas étendu en
 * douce) — voir `plans/DEBT.md > D16`. Le test fige les nombres réels : toute
 * nouvelle dérive vis-à-vis de cette vérité réconciliée échoue et force un flag.
 */

const legacy = new Set(LEGACY_SPELL_IDS_2014);
const srd = new Set(SRD_SPELLS.map((s) => s.id));
const renameSrc = new Set(SPELL_RENAMES_2014_TO_2024.map((r) => r.oldId));
const renameDst = new Set(SPELL_RENAMES_2014_TO_2024.map((r) => r.newId));
const removalIds = new Set(SPELL_REMOVALS_NON_SRD.map((r) => r.oldId));

const legacyOnly = [...legacy].filter((id) => !srd.has(id)).sort();
const srdOnly = [...srd].filter((id) => !legacy.has(id)).sort();
const additions = srdOnly.filter((id) => !renameDst.has(id)).sort();

// Les 16 ajouts réels SRD 5.2.1 (sorts absents de l'ancien bundle sous toute forme).
const EXPECTED_ADDITIONS = [
  'aura-de-vie', // Aura of Life
  'charme-monstre', // Charm Monster
  'chatiment-de-fournaise', // Searing Smite
  'chatiment-divin', // Divine Smite
  'convocation-de-dragon', // Summon Dragon
  'couteau-de-glace', // Ice Knife
  'elementalisme', // Elementalism — absent de l'estimation D.3 (cantrip 2024)
  'epine-mentale', // Mind Spike
  'eruption-ensorcelee', // Sorcerous Burst — absent de l'estimation D.3 (cantrip 2024)
  'frappe-piegeuse', // Ensnaring Strike
  'mot-de-pouvoir-guerisseur', // Power Word Heal
  'poussiere-d-etoile', // Starry Wisp
  'rayon-empoisonne', // Ray of Sickness (sort D9)
  'souffle-du-dragon', // Dragon’s Breath
  'sphere-de-vitriol', // Vitriolic Sphere
  'tsunami', // Tsunami
].sort();

describe('spell audit reconciliation — diff 2014 ↔ SRD 5.2.1', () => {
  it('snapshots de référence figés (330 legacy / 339 SRD)', () => {
    expect(LEGACY_SPELL_IDS_2014.length).toBe(330);
    expect(SRD_SPELLS.length).toBe(339);
    expect(legacy.size).toBe(330); // pas de doublon dans le snapshot
    expect(srd.size).toBe(339);
  });

  it('rename map cohérente : src ∈ legacy, dst ∈ SRD, aucune collision', () => {
    const bad: string[] = [];
    for (const r of SPELL_RENAMES_2014_TO_2024) {
      if (!legacy.has(r.oldId)) bad.push(`src absent du legacy: ${r.oldId}`);
      if (!srd.has(r.newId)) bad.push(`dst absent du SRD: ${r.newId}`);
      if (srd.has(r.oldId)) bad.push(`src encore dans le SRD (pas un rename): ${r.oldId}`);
    }
    expect(bad).toEqual([]);
    expect(renameSrc.size).toBe(SPELL_RENAMES_2014_TO_2024.length); // pas de src dupliqué
    expect(renameDst.size).toBe(SPELL_RENAMES_2014_TO_2024.length); // pas de dst dupliqué
  });

  it('retraits cohérents : présents dans legacy, absents du SRD', () => {
    const bad = SPELL_REMOVALS_NON_SRD.filter((r) => !legacy.has(r.oldId) || srd.has(r.oldId));
    expect(bad.map((r) => r.oldId)).toEqual([]);
  });

  it('partition EXHAUSTIVE legacy-only = renames.src ∪ retraits (aucun ID orphelin)', () => {
    const unaccounted = legacyOnly.filter((id) => !renameSrc.has(id) && !removalIds.has(id));
    expect(unaccounted, `IDs legacy non classés (rename ou retrait manquant): ${unaccounted.join(', ')}`).toEqual([]);
  });

  it('partition EXHAUSTIVE SRD-only = renames.dst ∪ ajouts (aucun ID orphelin)', () => {
    const unaccounted = srdOnly.filter((id) => !renameDst.has(id) && !EXPECTED_ADDITIONS.includes(id));
    expect(unaccounted, `IDs SRD non classés (rename ou ajout manquant): ${unaccounted.join(', ')}`).toEqual([]);
  });

  it('ajouts = identité figée des 16 sorts réellement nouveaux', () => {
    expect(additions).toEqual(EXPECTED_ADDITIONS);
  });

  it('comptes réconciliés : 273 inchangés + 50 renames + 7 retraits + 16 ajouts', () => {
    const common = [...legacy].filter((id) => srd.has(id)).length;
    expect(common).toBe(273);
    expect(SPELL_RENAMES_2014_TO_2024.length).toBe(50);
    expect(SPELL_REMOVALS_NON_SRD.length).toBe(7);
    expect(additions.length).toBe(16);
    // Conservation : legacy 330 = 273 inchangés + 50 renommés + 7 retirés.
    expect(common + SPELL_RENAMES_2014_TO_2024.length + SPELL_REMOVALS_NON_SRD.length).toBe(330);
    // Conservation : SRD 339 = 273 inchangés + 50 renommés (dst) + 16 ajouts.
    expect(common + renameDst.size + additions.length).toBe(339);
  });

  it('cross-check audit D.3 : écart catalogué vs estimation 44/21/18 (voir DEBT D16)', () => {
    // Estimation D.3 (heuristique, non vérifiée entrée par entrée).
    const AUDIT_ESTIMATE = { renames: 44, additions: 21, removals: 18 } as const;
    const RECONCILED = { renames: 50, additions: 16, removals: 7 } as const;
    // On NE force PAS l'audit à matcher : on fige la réalité réconciliée et on
    // documente l'écart. Le module SRD est la source de vérité (dérivé du SRD CC).
    expect(RECONCILED).toEqual({
      renames: SPELL_RENAMES_2014_TO_2024.length,
      additions: additions.length,
      removals: SPELL_REMOVALS_NON_SRD.length,
    });
    // L'écart attendu (réconcilié − estimé) est figé pour détecter toute dérive.
    expect({
      renames: RECONCILED.renames - AUDIT_ESTIMATE.renames,
      additions: RECONCILED.additions - AUDIT_ESTIMATE.additions,
      removals: RECONCILED.removals - AUDIT_ESTIMATE.removals,
    }).toEqual({ renames: 6, additions: -5, removals: -11 });
  });
});
