import Dexie, { type Table } from 'dexie';

/**
 * Base IndexedDB locale (Dexie). Schéma figé dans docs/DATA-MODEL.md.
 *
 * Trois tables :
 *  - `content`     : cache offline du contenu public (sorts, monstres…), clé composite [type+id]
 *  - `diceHistory` : historique des jets locaux pour la pile de dés
 *  - `settings`    : key-value pour préférences locales (volume, thème dés…)
 *
 * Version 2 (plan 12) : ajoute `mode + rawFaces + keptFaces + crit + fumble` à
 * `diceHistory` pour supporter le shape unifié `RollResult`. Le champ `mode`
 * est forcé `'digital'` en plan 12 ; plan 12.5 élargira à `'digital' | 'physical'`.
 */
export type ContentRow = {
  id: string;
  type: string;
  data: unknown;
  fetchedAt: number;
};

export type DiceHistoryRow = {
  id: string;
  characterId: string;
  label: string;
  total: number;
  /** Legacy field — alias de `rawFaces` pour la rétrocompat lecture. */
  rolls: number[];
  rawFaces: number[];
  keptFaces: number[];
  /** `'digital'` en plan 12. Élargi en plan 12.5 (`| 'physical'`). */
  mode: 'digital' | 'physical';
  crit: boolean;
  fumble: boolean;
  kind: string;
  timestamp: number;
};

export type SettingsRow = {
  key: string;
  value: unknown;
};

export class GrimWarDB extends Dexie {
  content!: Table<ContentRow, [string, string]>;
  diceHistory!: Table<DiceHistoryRow, string>;
  settings!: Table<SettingsRow, string>;

  constructor() {
    super('grimwar');
    this.version(1).stores({
      content: '[type+id], type',
      diceHistory: 'id, characterId, timestamp',
      settings: 'key',
    });
    // v2 : pas de changement d'index ; on upgrade les rows existantes avec les
    // défauts du mode digital. Les nouveaux champs sont écrits par le pivot.
    this.version(2)
      .stores({
        content: '[type+id], type',
        diceHistory: 'id, characterId, timestamp',
        settings: 'key',
      })
      .upgrade(async (tx) => {
        const table = tx.table('diceHistory');
        await table.toCollection().modify((row) => {
          const r = row as Partial<DiceHistoryRow> & { rolls?: number[] };
          if (r.mode === undefined) r.mode = 'digital';
          if (r.rawFaces === undefined) r.rawFaces = r.rolls ?? [];
          if (r.keptFaces === undefined) r.keptFaces = r.rolls ?? [];
          if (r.crit === undefined) r.crit = false;
          if (r.fumble === undefined) r.fumble = false;
        });
      });
  }
}

export const db = new GrimWarDB();
