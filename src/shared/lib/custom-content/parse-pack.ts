import type { ZodIssue } from 'zod';

import {
  CUSTOM_CONTENT_PACK_CATEGORIES,
  CustomContentPackSchema,
  type CustomContentPack,
  type CustomContentPackCategory,
} from '@/shared/types/custom-content-pack';

// ─────────────────────────────────────────────────────────────────────
// JALON 3B.1 — Couche structurée au-dessus de CustomContentPackSchema.
//
// Le schéma Zod (3A) rejette correctement les packs invalides mais ses
// `ZodIssue` bruts ne sont pas directement consommables par l'UI d'import
// (chemins en `(string | number)[]`, messages en anglais, pas de notion de
// « scope » meta/entity/root). Cette couche fait le travail de classement et
// produit un message FR lisible par le MJ — c'est ce que l'écran d'import
// (3B.2) injecte dans la liste d'erreurs sans re-traiter.
// ─────────────────────────────────────────────────────────────────────

export type PackErrorScope = 'meta' | 'entity' | 'root';

/**
 * Une erreur structurée prête à l'affichage. Chaque champ est dérivé du
 * `ZodIssue.path` et de la catégorie correspondante :
 *  - `scope` : où l'erreur se situe (méta, entité, racine).
 *  - `category` : pour `scope='entity'`, la catégorie concernée (`spells`, etc.).
 *  - `index` : pour `scope='entity'`, l'index de l'entrée fautive dans son tableau.
 *  - `entityId` : pour `scope='entity'`, l'id récupéré de l'entrée (best-effort,
 *    `null` si l'entrée n'expose pas de `id` lisible).
 *  - `field` : sous-chemin restant après le segment de catégorie/index/scope.
 *  - `message` : message FR (provient du schema quand assez clair, sinon traduit).
 */
export type PackParseError = {
  scope: PackErrorScope;
  category: CustomContentPackCategory | null;
  index: number | null;
  entityId: string | null;
  field: string | null;
  message: string;
};

export type PackParseResult =
  | {
      ok: true;
      pack: CustomContentPack;
      countByCategory: Record<CustomContentPackCategory, number>;
      totalEntities: number;
    }
  | {
      ok: false;
      errors: PackParseError[];
    };

type EntityCandidate = { id?: unknown };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKnownCategory(value: unknown): value is CustomContentPackCategory {
  return (
    typeof value === 'string' &&
    (CUSTOM_CONTENT_PACK_CATEGORIES as readonly string[]).includes(value)
  );
}

/**
 * Récupère best-effort l'id de l'entrée à `(category, index)` dans l'input
 * brut. Utilisé pour enrichir `PackParseError.entityId` même quand l'entrée
 * est rejetée — l'UI peut alors afficher « Sort feu-magique : level invalide »
 * plutôt que « entry #0 ».
 */
function lookupEntityId(
  input: unknown,
  category: CustomContentPackCategory,
  index: number,
): string | null {
  if (!isObject(input)) return null;
  const entities = (input as { entities?: unknown }).entities;
  if (!isObject(entities)) return null;
  const list = entities[category];
  if (!Array.isArray(list)) return null;
  const entry = list[index] as EntityCandidate | undefined;
  if (!entry || typeof entry.id !== 'string' || entry.id.length === 0) {
    return null;
  }
  return entry.id;
}

function translateMessage(issue: ZodIssue): string {
  const { message } = issue;
  if (message.includes('at least one non-empty category')) {
    return 'Le pack doit contenir au moins une catégorie non vide.';
  }
  if (message.startsWith('duplicate id')) {
    const match = message.match(/"([^"]+)"/);
    const id = match ? match[1] : 'inconnu';
    return `Doublon d'id "${id}" : deux entrées partagent le même id dans la même catégorie.`;
  }
  if (message.includes('pack id must be kebab-case')) {
    return 'L\'id du pack doit être en kebab-case (lettres minuscules, chiffres, tirets).';
  }
  if (message.includes('pack version must be semver')) {
    return 'La version du pack doit suivre semver MAJOR.MINOR.PATCH (ex. 1.0.0).';
  }
  if (message.includes('createdAt must be ISO 8601')) {
    return 'createdAt doit être une date ISO 8601 UTC (ex. 2026-05-31T12:00:00Z).';
  }
  return message;
}

function classifyIssue(input: unknown, issue: ZodIssue): PackParseError {
  const path = issue.path;
  const message = translateMessage(issue);

  // Racine — schema reject (input non-objet, refine superRefine au niveau racine).
  if (path.length === 0) {
    return {
      scope: 'root',
      category: null,
      index: null,
      entityId: null,
      field: null,
      message,
    };
  }

  const head = path[0];

  if (head === 'meta') {
    const fieldPath = path.slice(1).map(String).join('.');
    return {
      scope: 'meta',
      category: null,
      index: null,
      entityId: null,
      field: fieldPath.length > 0 ? fieldPath : null,
      message,
    };
  }

  if (head === 'entities') {
    // Cas 1 : refine racine sur entities (vide global) — path = ['entities'].
    if (path.length === 1) {
      return {
        scope: 'root',
        category: null,
        index: null,
        entityId: null,
        field: null,
        message,
      };
    }
    const rawCategory = path[1];
    if (!isKnownCategory(rawCategory)) {
      // Catégorie inconnue côté schéma — remonte tel quel comme erreur racine.
      return {
        scope: 'root',
        category: null,
        index: null,
        entityId: null,
        field: path.map(String).join('.'),
        message,
      };
    }
    const category = rawCategory;
    const index = typeof path[2] === 'number' ? path[2] : null;
    const fieldPath = path.slice(3).map(String).join('.');
    return {
      scope: 'entity',
      category,
      index,
      entityId: index !== null ? lookupEntityId(input, category, index) : null,
      field: fieldPath.length > 0 ? fieldPath : null,
      message,
    };
  }

  // Fallback — chemin inattendu : ramène à root pour ne rien perdre.
  return {
    scope: 'root',
    category: null,
    index: null,
    entityId: null,
    field: path.map(String).join('.'),
    message,
  };
}

function makeEmptyCounts(): Record<CustomContentPackCategory, number> {
  return Object.fromEntries(
    CUSTOM_CONTENT_PACK_CATEGORIES.map((cat) => [cat, 0]),
  ) as Record<CustomContentPackCategory, number>;
}

/**
 * Point d'entrée du validateur de packs. Consomme un JSON déjà parsé
 * (l'UI lit `File` → `JSON.parse` → passe ici). Garantit un retour
 * exhaustif `{ok: true, pack, countByCategory, totalEntities}` ou
 * `{ok: false, errors}` — jamais d'exception levée pour input invalide.
 */
export function parseCustomContentPack(input: unknown): PackParseResult {
  const parsed = CustomContentPackSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) =>
      classifyIssue(input, issue),
    );
    return { ok: false, errors };
  }

  const counts = makeEmptyCounts();
  let total = 0;
  for (const category of CUSTOM_CONTENT_PACK_CATEGORIES) {
    const list = parsed.data.entities[category];
    const n = list ? list.length : 0;
    counts[category] = n;
    total += n;
  }

  return {
    ok: true,
    pack: parsed.data,
    countByCategory: counts,
    totalEntities: total,
  };
}
