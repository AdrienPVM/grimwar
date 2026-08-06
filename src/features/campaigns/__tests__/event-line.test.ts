import { describe, expect, it } from 'vitest';

import type { GameEvent } from '@/shared/types/event';

import {
  eventCreatedAtToDate,
  eventDetailRows,
  formatEventDateTime,
  formatEventTime,
  summarizeEvent,
} from '../event-line';

function ev(
  kind: GameEvent['kind'],
  payload: Record<string, unknown> = {},
): Pick<GameEvent, 'kind' | 'payload'> {
  return { kind, payload };
}

describe('summarizeEvent — identité du libellé + détail (FR)', () => {
  it('roll avec label + total', () => {
    expect(summarizeEvent(ev('roll', { label: 'Épée longue', total: 18 }))).toEqual({
      kindLabel: 'Jet de dés',
      detail: 'Épée longue · 18',
    });
  });

  it('roll avec total seul', () => {
    expect(summarizeEvent(ev('roll', { total: 12 }))).toEqual({
      kindLabel: 'Jet de dés',
      detail: '12',
    });
  });

  it('roll avec label seul', () => {
    expect(summarizeEvent(ev('roll', { label: 'Sauvegarde de Force' }))).toEqual({
      kindLabel: 'Jet de dés',
      detail: 'Sauvegarde de Force',
    });
  });

  it('hp-change before → after', () => {
    expect(summarizeEvent(ev('hp-change', { before: 28, after: 21 }))).toEqual({
      kindLabel: 'Points de vie',
      detail: '28 → 21',
    });
  });

  it('temp-hp', () => {
    expect(summarizeEvent(ev('temp-hp', { after: 5 }))).toEqual({
      kindLabel: 'PV temporaires',
      detail: '5',
    });
  });

  it('condition-add / condition-remove (sans détail — slug non affiché)', () => {
    expect(summarizeEvent(ev('condition-add', { conditionId: 'poisoned' }))).toEqual({
      kindLabel: 'État ajouté',
      detail: null,
    });
    expect(summarizeEvent(ev('condition-remove', { conditionId: 'poisoned' }))).toEqual({
      kindLabel: 'État retiré',
      detail: null,
    });
  });

  it('spell-cast niveau > 0 → « Niveau N »', () => {
    expect(summarizeEvent(ev('spell-cast', { spellId: 'fireball', level: 3 }))).toEqual({
      kindLabel: 'Sort lancé',
      detail: 'Niveau 3',
    });
  });

  it('spell-cast niveau 0 → « Sort mineur » (terme officiel cantrip)', () => {
    expect(summarizeEvent(ev('spell-cast', { spellId: 'light', level: 0 }))).toEqual({
      kindLabel: 'Sort lancé',
      detail: 'Sort mineur',
    });
  });

  it('slot-consumed → « Niveau N »', () => {
    expect(summarizeEvent(ev('slot-consumed', { slotLevel: 2 }))).toEqual({
      kindLabel: 'Emplacement consommé',
      detail: 'Niveau 2',
    });
  });

  it('slot-restored / item-acquired / item-removed (sans détail)', () => {
    expect(summarizeEvent(ev('slot-restored', {})).kindLabel).toBe('Emplacement récupéré');
    expect(summarizeEvent(ev('item-acquired', {})).kindLabel).toBe('Objet obtenu');
    expect(summarizeEvent(ev('item-removed', {})).kindLabel).toBe('Objet retiré');
  });

  it('dm-secret-roll → total', () => {
    expect(summarizeEvent(ev('dm-secret-roll', { total: 14 }))).toEqual({
      kindLabel: 'Jet secret du meneur',
      detail: '14',
    });
  });

  it('session-start → libellé FR + titre de séance en détail (plan 23.4)', () => {
    expect(summarizeEvent(ev('session-start', { sessionNumber: 3, title: 'L’embuscade' }))).toEqual({
      kindLabel: 'Séance démarrée',
      detail: 'L’embuscade',
    });
  });

  it('session-end → libellé FR + titre de séance en détail (plan 23.4)', () => {
    expect(summarizeEvent(ev('session-end', { sessionNumber: 3, title: 'L’embuscade' }))).toEqual({
      kindLabel: 'Séance terminée',
      detail: 'L’embuscade',
    });
  });

  // L'exemple était `level-up` jusqu'à M44, qui lui a donné son propre libellé.
  // L'invariant protégé n'est pas ce kind-là mais le repli : un kind non mappé
  // affiche un libellé FR générique, jamais son identifiant machine.
  it('kind non mappé → libellé générique (jamais l’identifiant machine brut)', () => {
    const parts = summarizeEvent(ev('treasure-drop', { gold: 120 }));
    expect(parts.kindLabel).toBe('Événement de jeu');
    expect(parts.detail).toBeNull();
    // Garde-fou : aucun identifiant machine ne fuit dans le rendu.
    expect(parts.kindLabel).not.toContain('treasure-drop');
  });

  it('payload corrompu (types inattendus) → pas de crash, détail null', () => {
    expect(summarizeEvent(ev('roll', { label: 42, total: 'oops' }))).toEqual({
      kindLabel: 'Jet de dés',
      detail: null,
    });
    expect(summarizeEvent(ev('hp-change', { before: null, after: undefined }))).toEqual({
      kindLabel: 'Points de vie',
      detail: null,
    });
  });
});

describe('eventDetailRows — détail FR-étiqueté du payload (identité, pas slug)', () => {
  function rowMap(rows: { label: string; value: string }[]): Record<string, string> {
    return Object.fromEntries(rows.map((r) => [r.label, r.value]));
  }

  it('roll : intitulé, dés conservés, modificateur signé, total, crit', () => {
    const rows = eventDetailRows(
      ev('roll', {
        label: 'Épée longue',
        keptFaces: [18],
        modifier: 5,
        total: 23,
        crit: true,
      }),
    );
    const m = rowMap(rows);
    expect(m['Intitulé']).toBe('Épée longue');
    expect(m['Dés']).toBe('18');
    expect(m['Modificateur']).toBe('+5');
    expect(m['Total']).toBe('23');
    expect(m['Réussite critique']).toBe('Oui');
    // Le fumble absent ne produit aucune ligne.
    expect(m['Échec critique']).toBeUndefined();
  });

  it('roll : modificateur nul et négatif', () => {
    expect(rowMap(eventDetailRows(ev('roll', { modifier: 0 })))['Modificateur']).toBeUndefined();
    expect(rowMap(eventDetailRows(ev('roll', { modifier: -2 })))['Modificateur']).toBe('-2');
  });

  it('hp-change : avant / après / variation signée / cause traduite', () => {
    const m = rowMap(
      eventDetailRows(ev('hp-change', { before: 28, after: 7, delta: -21, reason: 'damage' })),
    );
    expect(m['Avant']).toBe('28');
    expect(m['Après']).toBe('7');
    expect(m['Variation']).toBe('-21');
    expect(m['Cause']).toBe('Dégâts');
  });

  it('hp-change : variation calculée si delta absent + cause soin', () => {
    const m = rowMap(eventDetailRows(ev('hp-change', { before: 10, after: 18, reason: 'heal' })));
    expect(m['Variation']).toBe('+8');
    expect(m['Cause']).toBe('Soin');
  });

  it('spell-cast : niveau + emplacement + composantes (lettres présentes)', () => {
    const m = rowMap(
      eventDetailRows(
        ev('spell-cast', {
          spellId: 'fireball',
          level: 3,
          slotConsumed: 3,
          components: { v: true, s: true, m: false },
        }),
      ),
    );
    expect(m['Niveau']).toBe('Niveau 3');
    expect(m['Emplacement']).toBe('Niveau 3');
    expect(m['Composantes']).toBe('V · S');
    // Garde-fou : le slug du sort ne fuit JAMAIS dans le détail.
    expect(rows(m)).not.toContain('fireball');
  });

  it('spell-cast d’un sort mineur : niveau « Sort mineur », pas d’emplacement', () => {
    const m = rowMap(
      eventDetailRows(ev('spell-cast', { spellId: 'light', level: 0, slotConsumed: null })),
    );
    expect(m['Niveau']).toBe('Sort mineur');
    expect(m['Emplacement']).toBeUndefined();
  });

  it('item-acquired : quantité (jamais le slug itemRef ni le contentScope)', () => {
    const r = eventDetailRows(
      ev('item-acquired', { itemRef: 'longsword', contentScope: 'srd', qty: 2 }),
    );
    const m = rowMap(r);
    expect(m['Quantité']).toBe('2');
    expect(rows(m)).not.toContain('longsword');
    expect(rows(m)).not.toContain('srd');
  });

  it('condition-add : aucune ligne (slug conditionId non affiché)', () => {
    expect(eventDetailRows(ev('condition-add', { conditionId: 'poisoned' }))).toEqual([]);
  });

  it('kind non mappé → aucune ligne', () => {
    expect(eventDetailRows(ev('level-up', { newLevel: 5 }))).toEqual([]);
  });

  // helper local — concatène toutes les valeurs pour les assertions « ne contient pas ».
  function rows(m: Record<string, string>): string {
    return Object.values(m).join(' ');
  }
});

describe('formatEventDateTime — date + heure complètes', () => {
  it('rend jour + heure pour une Date locale', () => {
    const out = formatEventDateTime(new Date(2026, 5, 23, 14, 5));
    expect(out).toContain('2026');
    expect(out).toContain('14:05');
  });

  it('rend "" quand le timestamp n’est pas encore résolu', () => {
    expect(formatEventDateTime(null)).toBe('');
  });
});

describe('eventCreatedAtToDate — narrow du Timestamp', () => {
  it('accepte une Date', () => {
    const d = new Date(2026, 5, 23, 14, 5);
    expect(eventCreatedAtToDate(d)).toBe(d);
  });

  it('accepte un nombre de ms', () => {
    const ms = Date.UTC(2026, 5, 23, 12, 0);
    expect(eventCreatedAtToDate(ms)?.getTime()).toBe(ms);
  });

  it('accepte un Timestamp Firestore (.toDate())', () => {
    const d = new Date(2026, 5, 23, 9, 30);
    expect(eventCreatedAtToDate({ toDate: () => d })).toBe(d);
  });

  it('null / objet sans toDate → null', () => {
    expect(eventCreatedAtToDate(null)).toBeNull();
    expect(eventCreatedAtToDate(undefined)).toBeNull();
    expect(eventCreatedAtToDate({ seconds: 1 })).toBeNull();
  });
});

describe('formatEventTime', () => {
  it('rend HH:mm pour une Date locale', () => {
    expect(formatEventTime(new Date(2026, 0, 1, 14, 5))).toBe('14:05');
  });

  it('rend "" quand le timestamp n’est pas encore résolu (serverTimestamp local null)', () => {
    expect(formatEventTime(null)).toBe('');
  });
});

describe('summarizeEvent — dm-edit (plan 26)', () => {
  it('libellé « Édition MJ » + détail « N champ·s modifié·s »', () => {
    expect(
      summarizeEvent(ev('dm-edit', { fieldsChanged: ['hp', 'conditions', 'status'] })),
    ).toEqual({
      kindLabel: 'Édition MJ',
      detail: '3 champ·s modifié·s',
    });
  });

  it('aucun champ → « 0 champ·s modifié·s » (jamais un identifiant brut)', () => {
    expect(summarizeEvent(ev('dm-edit', {}))).toEqual({
      kindLabel: 'Édition MJ',
      detail: '0 champ·s modifié·s',
    });
  });
});

describe('eventDetailRows — dm-edit (plan 26)', () => {
  it('liste les champs en FR (labels mappés) + before → after scalaire', () => {
    const rows = eventDetailRows(
      ev('dm-edit', {
        fieldsChanged: ['hp', 'status'],
        changes: { status: { before: 'alive', after: 'dead' } },
      }),
    );
    expect(rows).toEqual([
      { label: 'Champs modifiés', value: 'Points de vie · Statut' },
      { label: 'Statut', value: 'alive → dead' },
    ]);
  });

  it('un champ non mappé retombe sur « Autre champ » (jamais l’anglais brut)', () => {
    const rows = eventDetailRows(ev('dm-edit', { fieldsChanged: ['portrait'] }));
    expect(rows[0]).toEqual({ label: 'Champs modifiés', value: 'Autre champ' });
  });

  it('un booléen scalaire est rendu Oui/Non en FR', () => {
    const rows = eventDetailRows(
      ev('dm-edit', {
        fieldsChanged: ['inspiration'],
        changes: { inspiration: { before: false, after: true } },
      }),
    );
    expect(rows).toContainEqual({ label: 'Inspiration', value: 'Non → Oui' });
  });
});

/**
 * M44 — sans ces cas, les quatre jalons de vie tombaient sur le libellé
 * générique du feed MJ : « Événement », sans détail. Le journal les racontait
 * en prose mais le meneur, dans son feed temps réel, ne voyait rien.
 */
describe('summarizeEvent — jalons de vie (M44)', () => {
  it('level-up : niveau + nom de classe localisé (jamais le slug)', () => {
    expect(
      summarizeEvent(
        ev('level-up', { newLevel: 5, classId: 'rogue', className: 'Roublard', classLevel: 1 }),
      ),
    ).toEqual({ kindLabel: 'Montée de niveau', detail: 'Niveau 5 · Roublard' });
  });

  it('level-up sans nom de classe (payload legacy) → le niveau seul, pas de « null »', () => {
    expect(summarizeEvent(ev('level-up', { newLevel: 3 }))).toEqual({
      kindLabel: 'Montée de niveau',
      detail: 'Niveau 3',
    });
  });

  it('death : libellé dédié', () => {
    expect(summarizeEvent(ev('death', { cause: 'death-saves' }))).toEqual({
      kindLabel: 'Mort',
      detail: null,
    });
  });

  it('revival : libellé dédié', () => {
    expect(summarizeEvent(ev('revival', { source: 'nat20' }))).toEqual({
      kindLabel: 'Retour à la vie',
      detail: null,
    });
  });

  it('rest : le type distingue court et long dans le détail', () => {
    expect(summarizeEvent(ev('rest', { type: 'long', hpHealed: 12 }))).toEqual({
      kindLabel: 'Repos',
      detail: 'Repos long',
    });
    expect(summarizeEvent(ev('rest', { type: 'short' }))).toEqual({
      kindLabel: 'Repos',
      detail: 'Repos court',
    });
  });
});
