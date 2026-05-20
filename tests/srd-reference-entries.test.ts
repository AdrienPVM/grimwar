import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { expectIdentityRender } from './helpers/content-truth';
import {
  SRD_CLASS_ORDER_REFERENCES,
  SRD_SPELL_REFERENCES,
  SRD_WEAPON_REFERENCES,
} from './fixtures/srd-reference-entries';

/**
 * Cat. 3 — Fidélité bundle (politique « Vérité du contenu » 2026-05-19,
 * CLAUDE.md > Required at every commit > Vérité du contenu).
 *
 * Le test itère sur `tests/fixtures/srd-reference-entries.ts` et vérifie que
 * chaque entrée pinned correspond EXACTEMENT à la donnée dans
 * `public/data/*.json`. Détecte toute dérive (rename de slug, perte d'accent
 * FR, dérive EN, normalisation accidentelle d'école, prose summary modifiée).
 *
 * Fédération 13.12 commit 2 : l'identité de NOM (FR + EN) passe par
 * `expectIdentityRender` (helper cat. 2 du commit 1) — comparaison après
 * normalisation des espaces, source unique de vérité d'identité textuelle. Les
 * champs MÉCANIQUES (niveau, école, classes, dés, type, maîtrise) restent en
 * asserts numériques/ensemblistes : ce sont des valeurs discrètes, pas du texte
 * rendu.
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

interface WeaponEntry {
  id: string;
  name: { fr: string; en?: string };
  damage?: { dice: string; type: string };
  masteryProperty?: string;
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

      // Identité de nom (FR + EN) via le helper cat. 2 — détecte une dérive
      // de nom ou une modale qui afficherait le mauvais sort.
      expectIdentityRender({
        slug: ref.id,
        fields: [
          { label: 'name.fr', expected: ref.nameFr, rendered: found.name.fr },
          { label: 'name.en', expected: ref.nameEn, rendered: found.name.en ?? '' },
        ],
      });

      // Champs mécaniques : asserts discrets.
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

  it.each(SRD_WEAPON_REFERENCES.map((w) => ({ ref: w, label: w.id })))(
    'items.json contient EXACTEMENT l\'arme pinnée : $label',
    async ({ ref }) => {
      const items = await loadJson<WeaponEntry[]>('public/data/items.json');
      const found = items.find((w) => w.id === ref.id);
      expect(found, `arme ${ref.id} absente de items.json`).toBeDefined();
      if (!found) return;

      // Identité de nom (FR + EN) via le helper cat. 2.
      expectIdentityRender({
        slug: ref.id,
        fields: [
          { label: 'name.fr', expected: ref.nameFr, rendered: found.name.fr },
          { label: 'name.en', expected: ref.nameEn, rendered: found.name.en ?? '' },
        ],
      });

      // Champs mécaniques : asserts discrets.
      expect(found.damage?.dice, `${ref.id} : dé de dégâts a dérivé`).toBe(ref.dice);
      expect(found.damage?.type, `${ref.id} : type de dégâts a dérivé`).toBe(ref.damageType);
      expect(
        found.masteryProperty,
        `${ref.id} : propriété de maîtrise a dérivé`,
      ).toBe(ref.masteryProperty);
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

      // Identité de nom via le helper cat. 2.
      expectIdentityRender({
        slug: `${ref.classId}/${ref.id}`,
        fields: [{ label: 'name.fr', expected: ref.nameFr, rendered: order.name.fr }],
      });

      // summary : substring sémantique délibéré (pas une identité de prose
      // complète, qui peut être éditée par typo-fix).
      expect(
        order.summary.fr,
        `summary.fr de ${ref.id} a dérivé du SRD (n'inclut plus « ${ref.summaryFrContains} »)`,
      ).toContain(ref.summaryFrContains);
    },
  );
});
