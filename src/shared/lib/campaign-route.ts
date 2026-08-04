/**
 * Extraction de l'identifiant de campagne porté par une URL.
 *
 * POURQUOI une fonction pure plutôt que `useParams()` : les notifications se
 * montent AU-DESSUS des routes (cf. `campaign-notifications.tsx`), donc hors de
 * tout `<Route>` — `useParams()` y renverrait toujours `{}`. Le pathname est la
 * seule source disponible à ce niveau, et une fonction pure se teste sans
 * navigateur ni router.
 *
 * Même parti-pris que `parentRouteFor` : table explicite de motifs, pas de
 * découpage générique par segment. `/campaigns/join` doit être exclu — « join »
 * satisferait sinon `[^/]+` et se ferait passer pour un identifiant.
 */

const PATTERNS: readonly RegExp[] = [
  // Toutes les routes de campagne : détail, séances, rencontres, journal,
  // documents, PNJ, fiche d'un membre.
  /^\/campaigns\/([^/]+)(?:\/.*)?$/,
  // Les cartes vivent sous `/map-proto/cloud/:cid` mais appartiennent bien à
  // une campagne — un meneur en séance y passe l'essentiel de son temps.
  /^\/map-proto\/cloud\/([^/]+)(?:\/.*)?$/,
];

/** Segments réservés qui occupent la place d'un identifiant sans en être un. */
const RESERVED = new Set(['join', 'new']);

/**
 * Identifiant de campagne porté par `pathname`, ou `null` si l'URL n'appartient
 * à aucune campagne.
 */
export function campaignIdFromPath(pathname: string): string | null {
  for (const pattern of PATTERNS) {
    const match = pathname.match(pattern);
    if (!match) continue;
    const id = match[1];
    if (!id || RESERVED.has(id)) return null;
    return id;
  }
  return null;
}
