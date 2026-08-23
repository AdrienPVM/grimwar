import { describe, expect, it } from 'vitest';

import { parseCustomContentPack } from '@/shared/lib/custom-content/parse-pack';
import type { CustomContentPack } from '@/shared/types/custom-content-pack';

import {
  packExportFilename,
  serializeCustomContentPack,
} from '../export-pack';

/**
 * M29 — un pack fabriqué dans l'app ne ressortait jamais sous la forme JSON
 * qu'elle sait pourtant ingérer. L'invariant qui compte n'est pas « un fichier
 * est produit » mais « ce qui sort rentre » : l'aller-retour export → import
 * doit être fidèle, sinon donner son pack à l'autre MJ de la table échoue.
 */

function mkPack(over: Partial<CustomContentPack['meta']> = {}): CustomContentPack {
  return {
    meta: {
      id: 'dons-de-la-table',
      name: { fr: 'Dons de la table', en: 'Table feats' },
      version: '1.2.0',
      author: 'Adrien',
      createdAt: '2026-08-05T10:00:00Z',
      ...over,
    },
    entities: {
      feats: [
        {
          id: 'benediction-du-souffle',
          name: { fr: 'Bénédiction du Souffle', en: 'Breath Blessing' },
          prerequisite: null,
          summary: { fr: 'Vous exhalez une flamme brève.', en: 'You exhale a brief flame.' },
          description: {
            fr: 'Le dragon vous a marqué : vous exhalez une flamme brève.',
            en: 'The dragon marked you: you exhale a brief flame.',
          },
          source: 'aidedd-homebrew',
        },
      ],
    },
  } as unknown as CustomContentPack;
}

describe('export de pack', () => {
  it('ce qui sort rentre — l’aller-retour export → import est fidèle', () => {
    const pack = mkPack();
    const json = serializeCustomContentPack(pack);
    const result = parseCustomContentPack(JSON.parse(json));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.meta.id).toBe('dons-de-la-table');
    expect(result.pack.meta.name.fr).toBe('Dons de la table');
    // Identité du contenu, pas seulement sa présence.
    expect(result.pack.entities.feats?.[0]?.name.fr).toBe('Bénédiction du Souffle');
    expect(result.pack.entities.feats?.[0]?.description?.fr).toBe(
      'Le dragon vous a marqué : vous exhalez une flamme brève.',
    );
  });

  it('produit un JSON indenté, relisable et corrigeable à la main', () => {
    expect(serializeCustomContentPack(mkPack())).toContain('\n  "meta"');
  });

  it('n’exporte QUE meta et entities — pas de champ de stockage parasite', () => {
    const parsed = JSON.parse(serializeCustomContentPack(mkPack())) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(['entities', 'meta']);
  });

  it('le nom de fichier part de l’id slugifié, pas du nom affiché', () => {
    expect(packExportFilename(mkPack())).toBe('dons-de-la-table-v1.2.0.json');
  });

  it('un id exotique ne produit jamais un chemin de fichier', () => {
    const name = packExportFilename(mkPack({ id: '../../etc/passwd' }));
    expect(name).not.toContain('/');
    expect(name).toBe('..-..-etc-passwd-v1.2.0.json');
  });
});
