import {
  ancestrySizeSchema,
  dragonAncestrySchema,
  elfLineageSchema,
  gnomeLineageSchema,
  goliathAncestrySchema,
  tieflingLegacySchema,
  type AncestrySize,
  type AncestrySubChoices,
  type DragonAncestry,
  type ElfLineage,
  type GnomeLineage,
  type GoliathAncestry,
  type TieflingLegacy,
} from '@/shared/types/character';

/**
 * Helpers de narrowing pour les chooser components (plan 13.8 commit 2).
 *
 * Chaque chooser reçoit une `string` du RadioCardGroup (les ids viennent du
 * bundle SRD) et doit la convertir en valeur typée du schema. On utilise les
 * enums Zod (sources de vérité) : `safeParse` rejette toute valeur hors-SRD
 * sans bruyance UI — le sous-choix simplement n'est pas écrit. En pratique
 * les options proviennent toujours du bundle canonique → le rejet n'arrive
 * jamais en runtime, mais le narrowing maintient le contrat de types côté
 * compileur.
 */

export function asDragonAncestry(raw: string): DragonAncestry | null {
  const p = dragonAncestrySchema.safeParse(raw);
  return p.success ? p.data : null;
}

export function asTieflingLegacy(raw: string): TieflingLegacy | null {
  const p = tieflingLegacySchema.safeParse(raw);
  return p.success ? p.data : null;
}

export function asElfLineage(raw: string): ElfLineage | null {
  const p = elfLineageSchema.safeParse(raw);
  return p.success ? p.data : null;
}

export function asGnomeLineage(raw: string): GnomeLineage | null {
  const p = gnomeLineageSchema.safeParse(raw);
  return p.success ? p.data : null;
}

export function asGoliathAncestry(raw: string): GoliathAncestry | null {
  const p = goliathAncestrySchema.safeParse(raw);
  return p.success ? p.data : null;
}

export function asAncestrySize(raw: string): AncestrySize | null {
  const p = ancestrySizeSchema.safeParse(raw);
  return p.success ? p.data : null;
}

/**
 * Helper de patch typé pour les setters de sous-choix. Évite que chaque
 * chooser réécrive `setField('ancestrySubChoices', { ...current, key: v })`.
 */
export function patchAncestrySubChoice<K extends keyof AncestrySubChoices>(
  current: AncestrySubChoices,
  key: K,
  value: AncestrySubChoices[K],
): AncestrySubChoices {
  return { ...current, [key]: value };
}
