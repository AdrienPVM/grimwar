import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import {
  SRD_CLASS_ORDER_REFERENCES,
  SRD_SPELL_REFERENCES,
} from './fixtures/srd-reference-entries';

/**
 * Cat. 3 — Fidélité bundle (politique « Vérité du contenu » 2026-05-19,
 * CLAUDE.md > Required at every commit > Vérité du contenu).
 *
 * Le test itère sur `tests/fixtures/srd-reference-entries.ts` et vérifie que
 * chaque entrée pinned correspond EXACTEMENT à la donnée dans
 * `public/data/*.json`. Détecte toute dérive (rename de slug, perte d'accent
 * FR, normalisation accidentelle d'école, prose summary modifiée).
 *
 * La vérification humaine contre le SRD officiel se fait UNE FOIS à l'ajout
 * d'une entrée (cf. commentaire dans la fixture). Le test garde la vérité
 * figée ensuite — zéro vérification répétée.
 */

interface SpellEntry {
  id: string;
  name: { fr: string; en?: string };
  level: number;
  school: string;
  classes?: string[];
}

interface ClassOrder {
  id: string;
  name: { fr: string; en?: string };
  summary: { fr: string; en?: string };
}

interface ClassEntry {
  id: string;
  divineOrders?: ClassOrder[];
  primalOrders?: ClassOrder[];
}

async function loadJson<T>(path: string): Promise<T> {
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw) as T;
}

describe('cat. 3 — Fidélité bundle SRD vs fixtures pinned', () => {
  it.each(SRD_SPELL_REFERENCES.map((s) => ({ ref: s, label: s.id })))(
    'spells.json contient EXACTEMENT le sort pinné : $label',
    async ({ ref }) => {
      const spells = await loadJson<SpellEntry[]>('public/data/spells.json');
      const found = spells.find((s) => s.id === ref.id);
      expect(found, `sort ${ref.id} absent de spells.json`).toBeDefined();
      if (!found) return;

      expect(found.name.fr, `${ref.id} : name.fr a dérivé`).toBe(ref.nameFr);
      expect(found.level, `${ref.id} : level a dérivé`).toBe(ref.level);
      expect(found.school, `${ref.id} : school a dérivé`).toBe(ref.school);
      // Comparaison ordre-indépendante pour les classes (le bundle peut
      // les sérialiser dans n'importe quel ordre selon le pipeline).
      const got = new Set(found.classes ?? []);
      for (const c of ref.classes) {
        expect(got.has(c), `${ref.id} : classe ${c} manquante`).toBe(true);
      }
      // Inverse : aucune classe inattendue dans le bundle vs la fixture.
      // Évite un Druid qui se serait ajouté à un sort Magicien-only.
      const refSet = new Set<string>(ref.classes);
      for (const c of got) {
        expect(refSet.has(c), `${ref.id} : classe ${c} présente côté bundle mais absente de la fixture`).toBe(true);
      }
    },
  );

  it.each(SRD_CLASS_ORDER_REFERENCES.map((o) => ({ ref: o, label: `${o.classId}/${o.id}` })))(
    'classes.json contient EXACTEMENT l\'ordre pinné : $label',
    async ({ ref }) => {
      const classes = await loadJson<ClassEntry[]>('public/data/classes.json');
      const cls = classes.find((c) => c.id === ref.classId);
      expect(cls, `classe ${ref.classId} absente du bundle`).toBeDefined();
      if (!cls) return;

      const list = ref.group === 'divineOrders' ? cls.divineOrders : cls.primalOrders;
      expect(list, `${ref.classId} n'a pas de groupe ${ref.group}`).toBeDefined();
      const order = (list ?? []).find((o) => o.id === ref.id);
      expect(
        order,
        `${ref.classId}/${ref.group}/${ref.id} introuvable`,
      ).toBeDefined();
      if (!order) return;

      expect(order.name.fr).toBe(ref.nameFr);
      expect(
        order.summary.fr,
        `summary.fr de ${ref.id} a dérivé du SRD (n'inclut plus « ${ref.summaryFrContains} »)`,
      ).toContain(ref.summaryFrContains);
    },
  );
});
