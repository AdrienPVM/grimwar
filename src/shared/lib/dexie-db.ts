import Dexie, { type Table } from 'dexie';

/**
 * Base IndexedDB locale (Dexie). Schéma figé dans docs/DATA-MODEL.md.
 *
 * Trois tables :
 *  - `content`     : cache offline du contenu public (sorts, monstres…), clé composite [type+id]
 *  - `diceHistory` : historique des jets locaux pour la pile de dés
 *  - `settings`    : key-value pour préférences locales (volume, thème dés…)
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
  rolls: number[];
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
  }
}

export const db = new GrimWarDB();
