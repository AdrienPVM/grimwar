import { localize } from '@/shared/lib/i18n';
import type { CreateTokenInput } from '@/shared/lib/services/maps';
import type { Monster } from '@/shared/types/content';

/**
 * Décalage diagonal (px viewBox) appliqué à chaque doublon d'un même monstre
 * déposé au centre. Sans lui, « 5 gobelins » se superposent pile au centre et
 * deviennent impossibles à saisir un par un. ~26 px ≈ le rayon d'un jeton →
 * une petite cascade lisible que le MJ écarte ensuite à la main.
 */
const DUPLICATE_OFFSET_PX = 26;

/** Libellé de repli si le monstre n'a pas de nom localisé exploitable. */
const FALLBACK_LABEL = 'Créature';

export interface MonsterTokenOptions {
  /** Centre du viewBox (point de dépôt de base). */
  center: { x: number; y: number };
  /** Couleur du jeton (palette PNJ). */
  color: string;
  /** Rayon de vision (pieds) appliqué si le monstre n'a PAS de vision dans le noir. */
  fallbackVisionFt: number;
  /** Libellés des jetons déjà présents — sert à numéroter les doublons. */
  existingLabels: readonly string[];
  /** Bornes du viewBox + rayon du jeton, pour clamper le décalage en bord de carte. */
  bounds: { width: number; height: number; radius: number };
}

/**
 * Échappe les métacaractères regex d'un libellé de monstre (« +1 », parenthèses
 * de variante…) avant de l'injecter dans le motif de déduplication.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Trouve le prochain libellé unique pour `base` parmi `existing`.
 *
 * Le premier exemplaire garde le nom nu (« Gobelin »), les suivants sont
 * suffixés (« Gobelin 2 », « Gobelin 3 »…). On lit l'indice le plus haut déjà
 * présent (nom nu = 1) et on renvoie le suivant. `index` (1-based) sert aussi à
 * calculer le décalage de dépôt.
 */
function nextUniqueLabel(
  base: string,
  existing: readonly string[],
): { label: string; index: number } {
  const re = new RegExp(`^${escapeRegExp(base)}(?: (\\d+))?$`);
  let max = 0;
  let seen = false;
  for (const raw of existing) {
    const match = re.exec(raw.trim());
    if (!match) continue;
    seen = true;
    const n = match[1] ? Number.parseInt(match[1], 10) : 1;
    if (n > max) max = n;
  }
  if (!seen) return { label: base, index: 1 };
  return { label: `${base} ${max + 1}`, index: max + 1 };
}

/** Borne une position dans le viewBox en gardant le jeton entièrement visible. */
function clampPosition(
  point: { x: number; y: number },
  bounds: MonsterTokenOptions['bounds'],
): { x: number; y: number } {
  const clamp = (v: number, max: number): number =>
    Math.min(Math.max(v, bounds.radius), max - bounds.radius);
  return { x: clamp(point.x, bounds.width), y: clamp(point.y, bounds.height) };
}

/**
 * Convertit un monstre du bestiaire en payload de création de jeton (autofill
 * carte, directive 2026-06-27).
 *
 * Ce qui est mappé depuis le bloc de stats :
 *   - `kind` = `'pnj'` (un monstre est toujours un jeton non-joueur) ;
 *   - `label` = nom localisé du monstre, dédoublonné (« Gobelin 2 »…) ;
 *   - `color` = couleur de la palette PNJ ;
 *   - `visionRadius` = vision dans le noir du monstre (pieds) ou la vision
 *     normale de repli — alimente directement la ligne de vue / le brouillard.
 *
 * Ce qui n'est PAS porté par le jeton : CA, PV, FP. Le schéma `MapToken` ne
 * stocke aucune stat de combat — elles vivent dans le suivi de rencontre
 * (plan 24). Le jeton reste un repère visuel ; on ne réclame aucun champ
 * supplémentaire (donc aucun changement de schéma).
 */
export function monsterToTokenInput(
  monster: Monster,
  opts: MonsterTokenOptions,
): CreateTokenInput {
  const base = localize(monster.name).trim() || FALLBACK_LABEL;
  const { label, index } = nextUniqueLabel(base, opts.existingLabels);
  const offset = (index - 1) * DUPLICATE_OFFSET_PX;
  const position = clampPosition(
    { x: opts.center.x + offset, y: opts.center.y + offset },
    opts.bounds,
  );
  return {
    kind: 'pnj',
    label,
    position,
    color: opts.color,
    visionRadius: monster.senses.darkvision ?? opts.fallbackVisionFt,
  };
}
