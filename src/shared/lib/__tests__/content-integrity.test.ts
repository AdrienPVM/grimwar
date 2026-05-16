import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Test d'intégrité référentielle cross-bundle pour public/data/*.json.
 *
 * Pourquoi : plans/DEBT.md > D3 bug #2 a révélé que `spell.classes[*]` était
 * en FR tandis que `classes.json[*].id` était en EN. La triple gate était
 * verte (Zod valide chaque entité isolément) mais le filtre runtime
 * `spell.classes.includes(class.id)` ne matchait jamais. Cette classe de
 * bug doit être détectée en CI, pas en UAT navigateur.
 *
 * Toute relation cross-bundle (une entité qui référence l'`id` d'une autre)
 * doit avoir ici une assertion. Si un futur bundle ajoute une nouvelle
 * relation, étendre ce test. Si un re-build casse une référence, ce test
 * doit échouer dans `pnpm test`.
 */

interface WithId {
  id: string;
}
interface Class extends WithId {}
interface Spell extends WithId {
  classes?: string[];
}
interface Subclass extends WithId {
  classId: string;
}
interface Background extends WithId {
  equipment?: Array<{ itemId: string; qty: number }>;
  toolProficiencies?: string[];
}
interface Item extends WithId {}
interface MagicItem extends WithId {}

function load<T>(file: string): T[] {
  const path = join(process.cwd(), 'public', 'data', `${file}.json`);
  return JSON.parse(readFileSync(path, 'utf8')) as T[];
}

const classes = load<Class>('classes');
const spells = load<Spell>('spells');
const subclasses = load<Subclass>('subclasses');
const backgrounds = load<Background>('backgrounds');
const items = load<Item>('items');
const magicItems = load<MagicItem>('magic-items');

const classIds = new Set(classes.map((c) => c.id));
const itemIds = new Set(items.map((i) => i.id));
const magicItemIds = new Set(magicItems.map((m) => m.id));

describe('content integrity — cross-bundle references', () => {
  it('classes.json: aucun ID en doublon', () => {
    expect(classes.length).toBe(classIds.size);
  });

  it('spell.classes[*] référence des classes existantes (D3 bug #2 — fix EN canonique)', () => {
    const orphans: Array<{ spellId: string; classRef: string }> = [];
    for (const spell of spells) {
      for (const ref of spell.classes ?? []) {
        if (!classIds.has(ref)) {
          orphans.push({ spellId: spell.id, classRef: ref });
        }
      }
    }
    expect(orphans, `Refs orphelines: ${JSON.stringify(orphans.slice(0, 5))}`).toEqual([]);
  });

  it('au moins une classe lanceuse (wizard) a un volume non nul de sorts (fail-loud vs mismatch FR/EN)', () => {
    // Garde explicite : si le mapping FR→EN se recasse, le wizard "magicien"
    // (wizard) repasse à 0 sort et l'utilisateur revoit l'écran vide.
    const wizardSpells = spells.filter((s) => (s.classes ?? []).includes('wizard'));
    expect(wizardSpells.length).toBeGreaterThan(50);
  });

  it('subclass.classId référence une classe existante', () => {
    const orphans = subclasses.filter((sc) => !classIds.has(sc.classId));
    expect(orphans, `Sous-classes orphelines: ${orphans.map((o) => o.id).join(', ')}`).toEqual([]);
  });

  it('background.equipment[*].itemId référence un item ou magic-item existant', () => {
    const orphans: Array<{ backgroundId: string; itemId: string }> = [];
    for (const bg of backgrounds) {
      for (const e of bg.equipment ?? []) {
        if (!itemIds.has(e.itemId) && !magicItemIds.has(e.itemId)) {
          orphans.push({ backgroundId: bg.id, itemId: e.itemId });
        }
      }
    }
    expect(orphans).toEqual([]);
  });

  it('background.toolProficiencies[*] référence un item existant (les outils sont des items)', () => {
    const orphans: Array<{ backgroundId: string; tool: string }> = [];
    for (const bg of backgrounds) {
      for (const t of bg.toolProficiencies ?? []) {
        if (!itemIds.has(t)) {
          orphans.push({ backgroundId: bg.id, tool: t });
        }
      }
    }
    expect(orphans).toEqual([]);
  });

  it('class.startingEquipment[*].items[*] référence des items existants', () => {
    const orphans: Array<{ classId: string; itemRef: string }> = [];
    for (const cls of classes as Array<
      Class & {
        startingEquipment?: {
          options?: Array<{ items?: Array<unknown> }>;
        };
      }
    >) {
      const opts = cls.startingEquipment?.options ?? [];
      for (const opt of opts) {
        for (const it of opt.items ?? []) {
          let ref: string | null = null;
          if (typeof it === 'string') ref = it;
          else if (
            typeof it === 'object' &&
            it !== null &&
            'itemId' in it &&
            typeof (it as { itemId: unknown }).itemId === 'string'
          )
            ref = (it as { itemId: string }).itemId;
          else if (
            typeof it === 'object' &&
            it !== null &&
            'id' in it &&
            typeof (it as { id: unknown }).id === 'string'
          )
            ref = (it as { id: string }).id;
          if (ref && !itemIds.has(ref) && !magicItemIds.has(ref)) {
            orphans.push({ classId: cls.id, itemRef: ref });
          }
        }
      }
    }
    expect(orphans).toEqual([]);
  });
});
