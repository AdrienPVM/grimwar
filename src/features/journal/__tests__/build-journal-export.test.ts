import { describe, expect, it } from 'vitest';

import type { Session } from '@/shared/types/session';

import { buildJournalExport, journalExportFilename } from '../build-journal-export';

/**
 * Tests de l'export Markdown du journal de campagne (plan 25.4) — fonction PURE.
 * Vérifie la structure exacte du document concaténé et le slug de fichier.
 */

const labels = { sessionPrefix: 'Séance ', notCompiled: 'Non compilé.' };

function session(partial: Partial<Session> & Pick<Session, 'number' | 'title'>): Session {
  return {
    id: `s${partial.number}`,
    plannedDate: null,
    startedAt: null,
    endedAt: null,
    status: 'completed',
    attendance: [],
    notes: '',
    journalCompiled: null,
    createdAt: null,
    updatedAt: null,
    ...partial,
  } as Session;
}

describe('buildJournalExport', () => {
  it('document vide (0 séance) → titre de campagne seul', () => {
    expect(buildJournalExport('Ma campagne', [], labels)).toBe('# Ma campagne\n');
  });

  it('concatène les séances sous le titre de campagne, dans l’ordre fourni', () => {
    const md = buildJournalExport(
      'La Couronne Brisée',
      [
        session({ number: 1, title: 'Le départ', journalCompiled: '## Exploration\n\n- A.' }),
        session({ number: 2, title: 'La crypte', journalCompiled: '## Combat — X\n\n- B.' }),
      ],
      labels,
    );
    expect(md).toBe(
      [
        '# La Couronne Brisée',
        '',
        '## Séance 1 — Le départ',
        '',
        '## Exploration',
        '',
        '- A.',
        '',
        '## Séance 2 — La crypte',
        '',
        '## Combat — X',
        '',
        '- B.',
        '',
      ].join('\n'),
    );
  });

  it('séance sans journal compilé → note en italique', () => {
    const md = buildJournalExport(
      'C',
      [session({ number: 3, title: 'Vide', journalCompiled: null })],
      labels,
    );
    expect(md).toContain('## Séance 3 — Vide');
    expect(md).toContain('_Non compilé._');
  });
});

describe('journalExportFilename', () => {
  it('slugifie le nom de campagne (accents, espaces, ponctuation)', () => {
    expect(journalExportFilename('La Couronne Brisée !')).toBe('la-couronne-brisee-journal.md');
  });

  it('nom vide / non-alphanumérique → repli « journal »', () => {
    expect(journalExportFilename('???')).toBe('journal-journal.md');
  });
});
