import type { Npc, NpcRole } from '@/shared/types/npc';

/** Critères de filtrage de l'annuaire PNJ (plan 28 step 5). `null` = pas de filtre. */
export interface NpcFilter {
  role: NpcRole | null;
  tag: string | null;
  location: string | null;
}

export const EMPTY_NPC_FILTER: NpcFilter = { role: null, tag: null, location: null };

/** Facettes disponibles, dérivées de la liste courante (pour peupler les filtres). */
export interface NpcFacets {
  roles: NpcRole[];
  tags: string[];
  locations: string[];
}

/**
 * Collecte les valeurs distinctes de rôle / tag / lieu présentes dans la liste,
 * triées (locations/tags alpha FR, rôles dans l'ordre canonique d'apparition).
 * Une location vide est ignorée (un PNJ sans lieu n'ajoute pas de facette).
 */
export function collectNpcFacets(npcs: Npc[]): NpcFacets {
  const roles = new Set<NpcRole>();
  const tags = new Set<string>();
  const locations = new Set<string>();
  for (const npc of npcs) {
    roles.add(npc.role);
    for (const tag of npc.tags) tags.add(tag);
    const loc = npc.location.trim();
    if (loc.length > 0) locations.add(loc);
  }
  return {
    roles: [...roles],
    tags: [...tags].sort((a, b) => a.localeCompare(b, 'fr')),
    locations: [...locations].sort((a, b) => a.localeCompare(b, 'fr')),
  };
}

/**
 * Applique les filtres (ET logique : un PNJ doit satisfaire TOUS les critères
 * actifs). Un critère `null` est ignoré. La comparaison de lieu est exacte
 * (valeurs issues des facettes, donc déjà normalisées).
 */
export function filterNpcs(npcs: Npc[], filter: NpcFilter): Npc[] {
  return npcs.filter((npc) => {
    if (filter.role !== null && npc.role !== filter.role) return false;
    if (filter.tag !== null && !npc.tags.includes(filter.tag)) return false;
    if (filter.location !== null && npc.location.trim() !== filter.location) return false;
    return true;
  });
}
