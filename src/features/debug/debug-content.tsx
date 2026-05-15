import { useEffect, useState } from 'react';

import {
  loadContentIndex,
  loadPublicContent,
  type ContentIndex,
} from '@/shared/lib/content-loader';
import type { ContentTypeKey } from '@/shared/types/content';

/**
 * Overlay temporaire (plan 04 step 22) pour vérifier que les bundles publics
 * chargent correctement et que le content-loader applique sa validation Zod.
 *
 * Activation : ajouter `#debug-content` à l'URL (ex : http://localhost:5173/#debug-content).
 *
 * À retirer en plan 05 quand le router et la library view existeront pour de vrai.
 */

const TYPES: ContentTypeKey[] = [
  'spells',
  'monsters',
  'items',
  'magic-items',
  'classes',
  'subclasses',
  'ancestries',
  'subancestries',
  'backgrounds',
  'feats',
  'conditions',
  'rules',
];

const EXPECTED: Partial<Record<ContentTypeKey, number>> = {
  spells: 320,
  'magic-items': 150,
  feats: 50,
  monsters: 330,
  classes: 12,
  ancestries: 9,
  backgrounds: 13,
  conditions: 15,
};

interface RowState {
  type: ContentTypeKey;
  count: number | null;
  error: string | null;
}

export function DebugContent(): JSX.Element {
  const [index, setIndex] = useState<ContentIndex | null>(null);
  const [rows, setRows] = useState<RowState[]>(
    TYPES.map((type) => ({ type, count: null, error: null })),
  );

  useEffect(() => {
    let cancelled = false;
    void loadContentIndex()
      .then((idx) => {
        if (!cancelled) setIndex(idx);
      })
      .catch(() => {
        // l'index n'est pas critique, on continue avec les loaders
      });

    void Promise.all(
      TYPES.map(async (type): Promise<RowState> => {
        try {
          const entries = await loadPublicContent(type);
          return { type, count: entries.length, error: null };
        } catch (err) {
          return { type, count: null, error: (err as Error).message };
        }
      }),
    ).then((results) => {
      if (!cancelled) setRows(results);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative z-10 mx-auto min-h-screen max-w-3xl px-6 py-16 font-serif text-text-primary">
      <h1 className="font-display text-section-title text-gold-bright">
        Contenu public — debug
      </h1>
      <p className="mt-2 text-body text-text-tertiary">
        Vérification des bundles `public/data/*.json` chargés via
        `loadPublicContent`. À retirer en plan 05.
      </p>

      {index && (
        <p className="mt-4 text-body-sm text-text-tertiary">
          Index généré le : {new Date(index.generatedAt).toLocaleString('fr-FR')}
        </p>
      )}

      <table className="mt-6 w-full border-collapse text-body">
        <thead>
          <tr className="border-b border-gold-deep/30 text-left text-text-tertiary">
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4 text-right">Chargé</th>
            <th className="py-2 pr-4 text-right">Attendu</th>
            <th className="py-2 pr-4 text-right">État</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ type, count, error }) => {
            const expected = EXPECTED[type];
            const status = error
              ? 'erreur'
              : count === null
                ? '…'
                : expected === undefined
                  ? 'ok'
                  : count >= Math.floor(expected * 0.5)
                    ? 'ok'
                    : count === 0
                      ? 'vide (deferred)'
                      : 'partiel';

            return (
              <tr key={type} className="border-b border-gold-deep/10">
                <td className="py-2 pr-4 font-mono text-body-sm">{type}</td>
                <td className="py-2 pr-4 text-right font-mono">
                  {count === null ? '…' : count}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-text-tertiary">
                  {expected === undefined ? '—' : expected}
                </td>
                <td className="py-2 pr-4 text-right text-body-sm text-text-tertiary">
                  {status}
                  {error ? ` (${error})` : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
