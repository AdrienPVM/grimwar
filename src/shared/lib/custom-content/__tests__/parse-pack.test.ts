import { describe, expect, it } from 'vitest';

import { parseCustomContentPack } from '../parse-pack';

// ─────────────────────────────────────────────────────────────────────
// Tests JALON 3B.1 — Couche structurée au-dessus de CustomContentPackSchema.
//
// La couche `parseCustomContentPack` transforme les `ZodIssue[]` bruts en
// `PackParseError[]` exploitables par l'UI d'import : chaque erreur expose
// `scope` (meta | entity | root), `category`, `index`, `entityId` (best-effort),
// `field` (chemin restant) + un `message` lisible. La forme `{ ok, pack | errors }`
// est consommée telle quelle par 3B.2 (UI) sans re-formatage.
// ─────────────────────────────────────────────────────────────────────

const validSpell = {
  id: 'feu-magique',
  name: { fr: 'Feu magique', en: 'Magic fire' },
  level: 1,
  school: 'evocation' as const,
  castingTime: { fr: '1 action', en: '1 action' },
  range: { fr: '30 mètres', en: '120 feet' },
  components: { v: true, s: true, m: false },
  duration: { fr: 'Instantanée', en: 'Instantaneous' },
  concentration: false,
  ritual: false,
  description: {
    fr: 'Un trait de feu jaillit de ta main.',
    en: 'A bolt of fire shoots from your hand.',
  },
  atHigherLevels: null,
  classes: ['wizard'],
  source: 'srd-5.2.1' as const,
};

const validMeta = {
  id: 'pack-test',
  name: { fr: 'Pack de test', en: 'Test pack' },
  version: '1.0.0',
  author: 'MJ Adrien',
  createdAt: '2026-05-31T12:00:00Z',
};

describe('parseCustomContentPack — happy path', () => {
  it('retourne ok=true avec le pack typé sur input valide', () => {
    const result = parseCustomContentPack({
      meta: validMeta,
      entities: { spells: [validSpell] },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pack.meta.id).toBe('pack-test');
      expect(result.pack.entities.spells?.[0]?.id).toBe('feu-magique');
    }
  });
});

describe('parseCustomContentPack — input invalide non-objet', () => {
  it('retourne une erreur scope=root quand input est null', () => {
    const result = parseCustomContentPack(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.scope).toBe('root');
    }
  });

  it('retourne une erreur scope=root quand input est un tableau', () => {
    const result = parseCustomContentPack([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.scope).toBe('root');
    }
  });

  it('retourne une erreur scope=root quand input est une string', () => {
    const result = parseCustomContentPack('not a pack');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.scope).toBe('root');
    }
  });
});

describe('parseCustomContentPack — erreurs meta', () => {
  it('scope=meta + field=id quand meta.id est non kebab-case', () => {
    const result = parseCustomContentPack({
      meta: { ...validMeta, id: 'Pack_INVALID' },
      entities: { spells: [validSpell] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const metaIdErr = result.errors.find((err) => err.scope === 'meta');
      expect(metaIdErr).toBeDefined();
      expect(metaIdErr?.field).toBe('id');
    }
  });

  it('scope=meta + field=version quand semver est malformé', () => {
    const result = parseCustomContentPack({
      meta: { ...validMeta, version: '1.0' },
      entities: { spells: [validSpell] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const versionErr = result.errors.find(
        (err) => err.scope === 'meta' && err.field === 'version',
      );
      expect(versionErr).toBeDefined();
    }
  });
});

describe('parseCustomContentPack — erreurs entité', () => {
  it('scope=entity + category=spells + index=0 + entityId="feu-magique" + field=level quand level=12', () => {
    const result = parseCustomContentPack({
      meta: validMeta,
      entities: { spells: [{ ...validSpell, level: 12 }] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const levelErr = result.errors.find(
        (err) => err.scope === 'entity' && err.field === 'level',
      );
      expect(levelErr).toBeDefined();
      expect(levelErr?.category).toBe('spells');
      expect(levelErr?.index).toBe(0);
      expect(levelErr?.entityId).toBe('feu-magique');
    }
  });

  it('entityId est null quand l\'entrée n\'a pas de id récupérable', () => {
    const result = parseCustomContentPack({
      meta: validMeta,
      entities: { spells: [{ ...validSpell, id: undefined as unknown as string, level: 12 }] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const entityErr = result.errors.find((err) => err.scope === 'entity');
      expect(entityErr?.entityId).toBeNull();
    }
  });
});

describe('parseCustomContentPack — pack vide', () => {
  it('retourne une erreur scope=root avec message lisible quand toutes catégories vides', () => {
    const result = parseCustomContentPack({
      meta: validMeta,
      entities: { spells: [] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const emptyErr = result.errors.find((err) =>
        err.message.toLowerCase().includes('au moins une'),
      );
      expect(emptyErr).toBeDefined();
      expect(emptyErr?.scope).toBe('root');
    }
  });
});

describe('parseCustomContentPack — doublon id', () => {
  it('scope=entity + category=spells + index=1 quand id en double', () => {
    const result = parseCustomContentPack({
      meta: validMeta,
      entities: { spells: [validSpell, validSpell] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const dupErr = result.errors.find((err) =>
        err.message.toLowerCase().includes('doublon'),
      );
      expect(dupErr).toBeDefined();
      expect(dupErr?.scope).toBe('entity');
      expect(dupErr?.category).toBe('spells');
      expect(dupErr?.index).toBe(1);
      expect(dupErr?.entityId).toBe('feu-magique');
    }
  });
});

describe('parseCustomContentPack — comptage par catégorie', () => {
  it('expose `countByCategory` quand ok=true pour servir l\'UI d\'aperçu', () => {
    const result = parseCustomContentPack({
      meta: validMeta,
      entities: {
        spells: [validSpell, { ...validSpell, id: 'autre-sort' }],
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.countByCategory.spells).toBe(2);
      expect(result.countByCategory.feats).toBe(0);
      expect(result.totalEntities).toBe(2);
    }
  });
});
