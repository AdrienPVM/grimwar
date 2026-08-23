import Dexie, { type Table } from 'dexie';

import type { DiceTerm } from './dice/types';

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
  /**
   * Formule du jet, telle que rejouable (M49). Optionnelle : les lignes
   * écrites avant l'ajout du champ n'en ont pas, et l'historique local n'est
   * pas migré — un jet d'hier n'a pas à disparaître pour gagner un bouton.
   * Non indexée ⇒ aucun bump de version Dexie.
   */
  dice?: DiceTerm[];
  /** Modificateur effectif appliqué (post-maîtrise, épuisement, bonus). */
  modifier?: number;
};

export type SettingsRow = {
  key: string;
  value: unknown;
};

/**
 * Image de fond d'une carte importée (`.dd2vtt`), stockée localement sur
 * l'appareil. Une image de donjon dépasse la limite de 1 Mo d'un doc Firestore
 * et Firebase Storage n'est pas activé (décision bundle-vs-Blaze parquée), donc
 * on persiste l'image en IndexedDB : elle survit au reload sur CE device
 * (« phone in a cave », offline-first). La synchro cross-device viendra avec
 * Storage. Clé = `${campaignId}/${mapId}`.
 */
export type MapImageRow = {
  id: string;
  dataUrl: string;
  importedAt: number;
};

/**
 * Portrait (image) d'un jeton de carte, stocké localement comme l'image de fond
 * (`MapImageRow`) et pour la MÊME raison : une image dépasse vite la limite de
 * 1 Mo d'un doc Firestore et Firebase Storage n'est pas activé. Le portrait vit
 * donc sur l'appareil — il survit au reload, ne se synchronise PAS cross-device
 * (ça viendra avec Storage). Le doc Firestore du jeton est INCHANGÉ : on n'ajoute
 * aucun champ au schéma cloud, l'image est juste indexée par l'`id` (slug) que le
 * jeton porte déjà. Clé `id` = `${campaignId}/${mapId}/${tokenId}` ; index
 * secondaire `mapKey` = `${campaignId}/${mapId}` pour charger tous les portraits
 * d'une carte en une requête.
 */
export type TokenImageRow = {
  id: string;
  mapKey: string;
  tokenId: string;
  dataUrl: string;
  updatedAt: number;
};

export class GrimWarDB extends Dexie {
  content!: Table<ContentRow, [string, string]>;
  diceHistory!: Table<DiceHistoryRow, string>;
  settings!: Table<SettingsRow, string>;
  mapImages!: Table<MapImageRow, string>;
  tokenImages!: Table<TokenImageRow, string>;

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
    // v3 (mode carte — import .dd2vtt) : ajoute la table `mapImages`. Ajout
    // d'une nouvelle table = additif et sûr — Dexie la crée, les tables
    // existantes ne sont pas touchées, aucune fonction d'upgrade requise.
    this.version(3).stores({
      content: '[type+id], type',
      diceHistory: 'id, characterId, timestamp',
      settings: 'key',
      mapImages: 'id',
    });
    // v4 (portraits de jeton) : ajoute la table `tokenImages`, indexée par
    // `mapKey` pour charger d'un coup tous les portraits d'une carte. Additif et
    // sûr (cf. v3) — aucune table existante n'est touchée.
    this.version(4).stores({
      content: '[type+id], type',
      diceHistory: 'id, characterId, timestamp',
      settings: 'key',
      mapImages: 'id',
      tokenImages: 'id, mapKey',
    });
  }
}

export const db = new GrimWarDB();
