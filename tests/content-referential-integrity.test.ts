import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

/**
 * Bug 1 (UAT 2026-05-18) — sorts d'ascendance absents sur la fiche.
 *
 * Cause-racine : `ancestries.json` référençait des slugs **EN**
 * (`dancing-lights`, `fire-bolt`, …) alors que `spells.json` ne contient
 * que des slugs **FR** (`lumieres-dansantes`, `trait-de-feu`, …). Le
 * runtime `AncestrySpellsCard > resolveAncestrySpellEntries` skipait
 * silencieusement chaque sort non résolu → carte d'ascendance vide.
 *
 * Le bug est resté caché parce que :
 *   - le test d'intégrité disque ancien ne croisait pas les bundles ;
 *   - les e2e ancestry étaient skip (Java absent jusqu'au plan 13.5) ;
 *   - l'UAT pnpm dev a un cache Dexie tiède masquant la régression.
 *
 * Ce test est la GARDE PERMANENTE post-fix : toute référence de sort dans
 * `ancestries.json` doit résoudre dans `spells.json`. La sous-dette D9 (2
 * sorts d'ascendance pointant des slugs fantômes) est RÉSOLUE au plan 13.10
 * commit 4 — `abyssal.level3SpellId` → `rayon-empoisonne` (Ray of Sickness),
 * `chthonic.level3SpellId` → `simulacre-de-vie` (False Life), tous deux
 * présents dans le bundle SRD 5.2.1. La dérogation et son tripwire sont donc
 * retirés : plus aucune référence n'est excusée.
 */

async function loadJson<T>(path: string): Promise<T> {
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw) as T;
}

interface SpellEntry {
  id: string;
}

interface TieflingLegacy {
  id: string;
  cantripSpellId: string;
  level3SpellId: string;
  level5SpellId: string;
}

interface ElfLineage {
  id: string;
  cantripSpellId: string | null;
  level3SpellId: string;
  level5SpellId: string;
}

interface GnomeLineage {
  id: string;
  cantripSpellIds: string[];
  spellIds?: string[];
}

interface AncestryEntry {
  id: string;
  /** Sorts de trait communs à toute l'ascendance (D18, plan 13.14b). */
  commonSpellIds?: string[];
  options?: {
    tieflingLegacies?: TieflingLegacy[];
    elfLineages?: ElfLineage[];
    gnomeLineages?: GnomeLineage[];
  };
}

function collectAncestrySpellRefs(
  ancestries: AncestryEntry[],
): Array<{ ancestry: string; sub: string; slot: string; spellId: string }> {
  const refs: Array<{ ancestry: string; sub: string; slot: string; spellId: string }> = [];
  for (const a of ancestries) {
    // Sorts de trait communs à l'ascendance (D18 — ex. Tieffelin thaumaturgie).
    for (const sid of a.commonSpellIds ?? []) {
      refs.push({ ancestry: a.id, sub: '(common)', slot: 'common', spellId: sid });
    }
    const opts = a.options;
    if (!opts) continue;
    for (const t of opts.tieflingLegacies ?? []) {
      refs.push({ ancestry: a.id, sub: t.id, slot: 'cantrip', spellId: t.cantripSpellId });
      refs.push({ ancestry: a.id, sub: t.id, slot: 'level3', spellId: t.level3SpellId });
      refs.push({ ancestry: a.id, sub: t.id, slot: 'level5', spellId: t.level5SpellId });
    }
    for (const e of opts.elfLineages ?? []) {
      if (e.cantripSpellId != null) {
        refs.push({ ancestry: a.id, sub: e.id, slot: 'cantrip', spellId: e.cantripSpellId });
      }
      refs.push({ ancestry: a.id, sub: e.id, slot: 'level3', spellId: e.level3SpellId });
      refs.push({ ancestry: a.id, sub: e.id, slot: 'level5', spellId: e.level5SpellId });
    }
    for (const g of opts.gnomeLineages ?? []) {
      for (const sid of g.cantripSpellIds) {
        refs.push({ ancestry: a.id, sub: g.id, slot: 'cantrip', spellId: sid });
      }
      // Sorts de trait spécifiques au lignage (D18 — ex. Gnome forêts speak-with-animals).
      for (const sid of g.spellIds ?? []) {
        refs.push({ ancestry: a.id, sub: g.id, slot: 'lineage-spell', spellId: sid });
      }
    }
  }
  return refs;
}

describe('Intégrité référentielle des bundles SRD (Bug 1 UAT 2026-05-18)', () => {
  it('toute référence de sort dans ancestries.json résout dans spells.json (D9 résolu, plan 13.10)', async () => {
    const ancestries = await loadJson<AncestryEntry[]>('public/data/ancestries.json');
    const spells = await loadJson<SpellEntry[]>('public/data/spells.json');
    const spellIds = new Set(spells.map((s) => s.id));

    const refs = collectAncestrySpellRefs(ancestries);
    expect(refs.length, 'refs trouvées dans ancestries.json').toBeGreaterThan(0);

    const unresolved = refs.filter((r) => !spellIds.has(r.spellId));

    expect(
      unresolved,
      `Références cassées (slug-language drift ou nouveau bug) :\n${unresolved
        .map((r) => `  ${r.ancestry}/${r.sub}/${r.slot} → ${r.spellId}`)
        .join('\n')}`,
    ).toEqual([]);
  });

  // Garde explicite D9 — les 2 slugs fantômes historiques (`rayon-de-maladie`,
  // `feinte-vie`) ne doivent JAMAIS réapparaître dans ancestries.json : le SRD
  // 5.2.1 nomme ces sorts `rayon-empoisonne` (Ray of Sickness) et
  // `simulacre-de-vie` (False Life). Cf. FR_SRD_CC_v5.2.1.txt l.9459/9463.
  it('D9 — aucun slug fantôme (rayon-de-maladie / feinte-vie) ne subsiste dans ancestries.json', async () => {
    const ancestries = await loadJson<AncestryEntry[]>('public/data/ancestries.json');
    const refs = collectAncestrySpellRefs(ancestries);
    const phantoms = refs.filter((r) =>
      r.spellId === 'rayon-de-maladie' || r.spellId === 'feinte-vie',
    );
    expect(
      phantoms.map((r) => `${r.ancestry}/${r.sub}/${r.slot} → ${r.spellId}`),
      'slugs fantômes D9 résiduels (doivent être rayon-empoisonne / simulacre-de-vie)',
    ).toEqual([]);
  });
});

/**
 * Bug 2 (UAT 2026-05-18) — Barde non créable (0 compétence sélectionnable).
 *
 * Cause-racine : `classes.json > bard.skillChoices.from = []` (parser PDF a
 * raté le motif SRD 2024 « Choose 3 : any »). Conséquence : pool de picks vide
 * → toutes les checkboxes désactivées → bouton Suivant verrouillé pour
 * l'éternité.
 *
 * Garde permanente : aucune classe ne peut avoir un pool de picks vide. Si le
 * SRD veut « any X skills », il faut matérialiser les 18 IDs (cf. fix Bug 2
 * via `SRD_CLASS_SKILL_CHOICES_OVERRIDE`).
 */
describe('Intégrité du pool de compétences par classe (Bug 2 UAT 2026-05-18)', () => {
  interface ClassEntry {
    id: string;
    skillChoices: { count: number; from: string[] };
  }

  it('aucune classe SRD n\'a un pool de picks vide (Bug 2)', async () => {
    const classes = await loadJson<ClassEntry[]>('public/data/classes.json');
    const empty = classes.filter((c) => (c.skillChoices?.from?.length ?? 0) === 0);
    expect(
      empty.map((c) => c.id),
      `Classes avec pool de picks vide (incréable) : ${empty.map((c) => c.id).join(', ')}`,
    ).toEqual([]);
  });

  it('chaque classe a au moins `count` items dans le pool (sinon la sélection est impossible)', async () => {
    const classes = await loadJson<ClassEntry[]>('public/data/classes.json');
    const broken = classes.filter(
      (c) => (c.skillChoices?.from?.length ?? 0) < (c.skillChoices?.count ?? 0),
    );
    expect(
      broken.map((c) => `${c.id} (count=${c.skillChoices.count}, from.length=${c.skillChoices.from.length})`),
      'Classes dont le pool est plus petit que le nombre de picks requis',
    ).toEqual([]);
  });
});

/**
 * Cat. 1 — Cohérence référentielle étendue (politique « Vérité du contenu »
 * 2026-05-19, cf. CLAUDE.md > Required at every commit > Vérité du contenu).
 *
 * Les enums TypeScript des sous-choix de classe (`clericDivineOrder`,
 * `druidPrimalOrder`) doivent EXACTEMENT correspondre aux `id` du bundle SRD
 * `classes.json`. Si on rename un slug côté bundle sans rebrancher l'enum
 * (ou vice-versa), le wizard pose un slug que la fiche ne saura pas résoudre.
 *
 * Liste figée : les 2 Cleric divine orders (`protector`, `thaumaturge`) + les
 * 2 Druid primal orders (`magician`, `warden`). Plan 13.9 a livré ces choosers
 * — le plan 13.9 commit 4b ajoute les cartes Sheet correspondantes.
 */
describe('Intégrité référentielle — sous-choix de classe enum ↔ bundle (plan 13.9 commit 4b)', () => {
  interface Order {
    id: string;
    name: { fr: string; en?: string };
    summary: { fr: string; en?: string };
  }
  interface ClassWithOrders {
    id: string;
    divineOrders?: Order[];
    primalOrders?: Order[];
  }

  const CLERIC_DIVINE_ORDER_ENUM = ['protector', 'thaumaturge'] as const;
  const DRUID_PRIMAL_ORDER_ENUM = ['magician', 'warden'] as const;

  it('les 2 Cleric divine orders enum résolvent dans classes.json[cleric].divineOrders', async () => {
    const classes = await loadJson<ClassWithOrders[]>('public/data/classes.json');
    const cleric = classes.find((c) => c.id === 'cleric');
    expect(cleric, 'classe cleric absente du bundle').toBeDefined();
    const ids = new Set((cleric?.divineOrders ?? []).map((o) => o.id));
    const unresolved = CLERIC_DIVINE_ORDER_ENUM.filter((slug) => !ids.has(slug));
    expect(
      unresolved,
      `enum divineOrder slugs non résolus dans classes.json : ${unresolved.join(', ')}`,
    ).toEqual([]);
  });

  it('les 2 Druid primal orders enum résolvent dans classes.json[druid].primalOrders', async () => {
    const classes = await loadJson<ClassWithOrders[]>('public/data/classes.json');
    const druid = classes.find((c) => c.id === 'druid');
    expect(druid, 'classe druid absente du bundle').toBeDefined();
    const ids = new Set((druid?.primalOrders ?? []).map((o) => o.id));
    const unresolved = DRUID_PRIMAL_ORDER_ENUM.filter((slug) => !ids.has(slug));
    expect(
      unresolved,
      `enum primalOrder slugs non résolus dans classes.json : ${unresolved.join(', ')}`,
    ).toEqual([]);
  });

  it('aucun divine/primal order orphelin dans le bundle (entrée sans pendant enum)', async () => {
    const classes = await loadJson<ClassWithOrders[]>('public/data/classes.json');
    const cleric = classes.find((c) => c.id === 'cleric');
    const druid = classes.find((c) => c.id === 'druid');
    const divineEnumSet = new Set<string>(CLERIC_DIVINE_ORDER_ENUM);
    const primalEnumSet = new Set<string>(DRUID_PRIMAL_ORDER_ENUM);

    const divineOrphans = (cleric?.divineOrders ?? [])
      .map((o) => o.id)
      .filter((id) => !divineEnumSet.has(id));
    const primalOrphans = (druid?.primalOrders ?? [])
      .map((o) => o.id)
      .filter((id) => !primalEnumSet.has(id));

    expect(divineOrphans, `divine orders bundle sans pendant enum : ${divineOrphans.join(', ')}`).toEqual([]);
    expect(primalOrphans, `primal orders bundle sans pendant enum : ${primalOrphans.join(', ')}`).toEqual([]);
  });
});
