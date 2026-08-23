/**
 * Visibilité de la barre de navigation basse — source unique, partagée entre le
 * composant qui la rend (`bottom-nav.tsx`) et le conteneur de page qui réserve
 * la gouttière correspondante (`page-container.tsx`). Deux lectures du même
 * prédicat : si elles divergeaient, soit la barre masquerait le bas du contenu,
 * soit une page garderait un blanc de 80 px sous elle sans rien dedans.
 *
 * POURQUOI PAS « visible partout » : trois familles d'écrans perdent à
 * l'afficher.
 *   - La FICHE porte déjà le menu radial en bas à droite. Deux surfaces
 *     flottantes qui se chevauchent au pouce, c'est un tap sur deux qui part
 *     ailleurs que voulu.
 *   - La CARTE est un canevas : chaque pixel de hauteur sert au plateau, et la
 *     barre couvrirait la ligne de jetons du bas.
 *   - Les ÉDITEURS (assistant de création, éditeur de pack) sont des tâches
 *     tunnélisées — en sortir d'un tap au milieu d'une saisie perd le travail
 *     en cours. Le bouton Retour du bandeau haut reste la sortie, volontairement
 *     plus coûteuse à viser.
 *
 * Tout le reste — bibliothèque, campagnes et leurs sous-écrans, Codex, compte —
 * est de la CONSULTATION : y sauter d'un espace à l'autre est le geste normal.
 */

/**
 * Préfixes de chemin où la barre disparaît. Comparés par égalité stricte ou par
 * préfixe suivi d'un `/`, jamais par `startsWith` nu : `/creations` ne doit pas
 * être masqué parce qu'il commence par `/create`.
 */
const HIDDEN_PREFIXES: readonly string[] = [
  '/character', // fiche du propriétaire — menu radial en bas à droite
  '/create', // assistant de création
  '/map-proto', // canevas de carte (et sa vue TV)
  '/account/content', // éditeur de packs de contenu
];

/**
 * Suffixes de chemin où la barre disparaît, quel que soit le préfixe. La fiche
 * d'un membre lue par le meneur vit sous `/campaigns/:cid/members/:uid/sheet` :
 * c'est une fiche, avec le même chevauchement de menu radial, mais son chemin
 * commence par un espace où la barre doit rester.
 */
const HIDDEN_SUFFIXES: readonly string[] = ['/sheet', '/tv'];

/** Hauteur réservée sous une page quand la barre est visible (barre + marge). */
export const BOTTOM_NAV_SPACER_CLASS = 'pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-8';

export function shouldShowBottomNav(pathname: string): boolean {
  // Normalise le slash final : `/codex/` et `/codex` sont le même écran.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  for (const prefix of HIDDEN_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return false;
  }
  for (const suffix of HIDDEN_SUFFIXES) {
    if (path.endsWith(suffix)) return false;
  }
  return true;
}
