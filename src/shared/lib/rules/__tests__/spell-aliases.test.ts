import { describe, expect, it } from 'vitest';

import spellsBundle from '../../../../../public/data/spells.json';
import {
  SPELL_REMOVALS_NON_SRD,
  SPELL_RENAMES_2014_TO_2024,
  migrateSpellIds,
  migrateSpellRecord,
} from '../spell-aliases';

/**
 * Migration des IDs de sort « PHB 2014 (AideDD) » → « SRD 5.2.1 » (plan 13.10
 * commit 4). On vérifie l'IDENTITÉ du résultat (pas seulement « ça change »),
 * et la cohérence des tables d'alias avec le bundle SRD régénéré.
 */
const bundleIds = new Set((spellsBundle as Array<{ id: string }>).map((s) => s.id));

describe('migrateSpellIds — renames / retraits / no-op', () => {
  it('remappe un ID renommé vers son ID SRD 2024', () => {
    const r = migrateSpellIds(['main-de-mage']);
    expect(r.migrated).toEqual(['main-du-mage']);
    expect(r.removed).toEqual([]);
    expect(r.changed).toBe(true);
  });

  it('retire un sort hors-SRD et le signale dans `removed` (jamais remappé)', () => {
    const r = migrateSpellIds(['armure-d-agathys']);
    expect(r.migrated).toEqual([]);
    expect(r.removed).toEqual(['armure-d-agathys']);
    expect(r.changed).toBe(true);
  });

  it('laisse intact un ID déjà SRD 2024 (no-op)', () => {
    const r = migrateSpellIds(['bouclier', 'projectile-magique']);
    expect(r.migrated).toEqual(['bouclier', 'projectile-magique']);
    expect(r.removed).toEqual([]);
    expect(r.changed).toBe(false);
  });

  it('gère une liste mixte renames + retrait + déjà-2024 en préservant l’ordre', () => {
    const r = migrateSpellIds([
      'armure-de-mage', // rename → armure-du-mage
      'amis', // retiré (Friends)
      'bouclier', // déjà 2024
      'peur', // rename → terreur
    ]);
    expect(r.migrated).toEqual(['armure-du-mage', 'bouclier', 'terreur']);
    expect(r.removed).toEqual(['amis']);
    expect(r.changed).toBe(true);
  });

  it('dé-duplique quand un rename collisionne avec un ID déjà présent', () => {
    // `main-de-mage` → `main-du-mage`, déjà dans la liste : pas de doublon.
    const r = migrateSpellIds(['main-du-mage', 'main-de-mage']);
    expect(r.migrated).toEqual(['main-du-mage']);
    expect(r.changed).toBe(true);
  });

  it('est idempotente : ré-appliquer ne change plus rien', () => {
    const once = migrateSpellIds(['main-de-mage', 'armure-de-mage']);
    const twice = migrateSpellIds(once.migrated);
    expect(twice.migrated).toEqual(once.migrated);
    expect(twice.changed).toBe(false);
    expect(twice.removed).toEqual([]);
  });
});

describe('migrateSpellRecord — Record<classId, string[]>', () => {
  it('migre chaque classe et agrège les retraits avec leur classe', () => {
    const { record, removed, changed } = migrateSpellRecord({
      wizard: ['main-de-mage', 'bouclier'],
      warlock: ['armure-d-agathys', 'malefice'],
    });
    expect(record.wizard).toEqual(['main-du-mage', 'bouclier']);
    expect(record.warlock).toEqual(['malefice']);
    expect(removed).toEqual([{ classId: 'warlock', spellId: 'armure-d-agathys' }]);
    expect(changed).toBe(true);
  });

  it('no-op global quand tous les IDs sont déjà SRD', () => {
    const { record, removed, changed } = migrateSpellRecord({
      wizard: ['bouclier', 'projectile-magique'],
    });
    expect(record.wizard).toEqual(['bouclier', 'projectile-magique']);
    expect(removed).toEqual([]);
    expect(changed).toBe(false);
  });
});

describe('cohérence des tables d’alias avec le bundle SRD régénéré', () => {
  it('tout `newId` de rename résout dans spells.json', () => {
    const unresolved = SPELL_RENAMES_2014_TO_2024.filter((r) => !bundleIds.has(r.newId));
    expect(
      unresolved.map((r) => `${r.oldId} → ${r.newId}`),
      'renames dont la cible n’existe pas dans le bundle',
    ).toEqual([]);
  });

  it('aucun `oldId` de rename ne subsiste dans le bundle (les anciens IDs sont bien morts)', () => {
    const stillPresent = SPELL_RENAMES_2014_TO_2024.filter((r) => bundleIds.has(r.oldId));
    expect(
      stillPresent.map((r) => r.oldId),
      'anciens IDs 2014 encore présents dans le bundle SRD',
    ).toEqual([]);
  });

  it('aucun sort « retiré hors-SRD » ne réapparaît dans le bundle', () => {
    const resurrected = SPELL_REMOVALS_NON_SRD.filter((r) => bundleIds.has(r.oldId));
    expect(
      resurrected.map((r) => r.oldId),
      'sorts marqués hors-SRD mais présents dans le bundle',
    ).toEqual([]);
  });
});
