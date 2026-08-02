import type { StringKey } from './i18n';

/**
 * Résolution du « cran au-dessus » d'une route — source unique du bouton Retour
 * global (`nav-shell.tsx`).
 *
 * POURQUOI : le bouton Retour du bandeau était un `<Link to="/">` en dur,
 * annoncé « Retour à la bibliothèque » sur les 23 routes de l'app. Depuis
 * `/campaigns/:cid/encounters/:eid`, il renvoyait donc à l'accueil, à côté d'un
 * second bouton « ← Retour aux rencontres » rendu dans la page : deux
 * affordances identiques, deux destinations différentes, et une annonce fausse
 * pour un lecteur d'écran.
 *
 * POURQUOI PAS `navigate(-1)` : l'historique du navigateur n'est pas la
 * hiérarchie de l'app. Un joueur qui arrive sur une rencontre par un lien
 * partagé n'a pas d'entrée précédente ; un aller-retour entre deux écrans
 * frères transformerait le bouton en bascule. On remonte donc dans la
 * HIÉRARCHIE, ce qui donne toujours le même résultat quel que soit le chemin
 * parcouru — comportement prévisible, et testable sans navigateur.
 *
 * Table explicite plutôt qu'un « retire le dernier segment » générique : la
 * règle générique produit des routes inexistantes (`/character/:id` donnerait
 * `/character`) et ne sait pas qu'une carte appartient à sa campagne.
 * L'ordre compte — le premier motif qui correspond gagne, donc les routes les
 * plus profondes viennent d'abord.
 */

export interface ParentRoute {
  /** Destination du bouton Retour. */
  to: string;
  /** Clé i18n décrivant la destination (libellé accessible). */
  labelKey: StringKey;
}

interface Rule {
  pattern: RegExp;
  /** `match` porte les groupes capturés du motif. */
  resolve: (match: RegExpMatchArray) => ParentRoute;
}

const RULES: readonly Rule[] = [
  // --- Carte (prototype) : la racine d'une carte remonte à SA campagne, pas au
  // prototype — c'est par la campagne que le meneur y est entré.
  {
    pattern: /^\/map-proto\/cloud\/([^/]+)\/maps\/[^/]+\/tv\/?$/,
    resolve: (m) => ({ to: `/map-proto/cloud/${m[1]}`, labelKey: 'nav.back.maps' }),
  },
  {
    pattern: /^\/map-proto\/cloud\/([^/]+)\/(?:maps\/[^/]+|import)\/?$/,
    resolve: (m) => ({ to: `/map-proto/cloud/${m[1]}`, labelKey: 'nav.back.maps' }),
  },
  {
    pattern: /^\/map-proto\/cloud\/([^/]+)\/?$/,
    resolve: (m) => ({ to: `/campaigns/${m[1]}`, labelKey: 'campaigns.memberSheet.back' }),
  },

  // --- Campagne : sous-écrans de second niveau.
  {
    pattern: /^\/campaigns\/([^/]+)\/sessions\/[^/]+\/?$/,
    resolve: (m) => ({
      to: `/campaigns/${m[1]}/sessions`,
      labelKey: 'sessions.detail.back',
    }),
  },
  {
    pattern: /^\/campaigns\/([^/]+)\/encounters\/[^/]+\/?$/,
    resolve: (m) => ({
      to: `/campaigns/${m[1]}/encounters`,
      labelKey: 'encounters.detail.back',
    }),
  },
  {
    pattern: /^\/campaigns\/([^/]+)\/npcs\/[^/]+\/?$/,
    resolve: (m) => ({ to: `/campaigns/${m[1]}/npcs`, labelKey: 'npcs.detail.back' }),
  },
  // La fiche d'un membre lue par le MJ appartient au roster de la campagne.
  {
    pattern: /^\/campaigns\/([^/]+)\/members\/[^/]+\/sheet\/?$/,
    resolve: (m) => ({
      to: `/campaigns/${m[1]}`,
      labelKey: 'campaigns.memberSheet.back',
    }),
  },
  // Rejoindre par code n'appartient à aucune campagne : la remontée est la
  // liste. Placé AVANT le motif générique `/campaigns/:cid`, que « join »
  // satisferait sinon en se faisant passer pour un identifiant.
  {
    pattern: /^\/campaigns\/join\/?$/,
    resolve: () => ({ to: '/campaigns', labelKey: 'nav.back.campaigns' }),
  },
  {
    pattern: /^\/campaigns\/([^/]+)\/[^/]+\/?$/,
    resolve: (m) => ({
      to: `/campaigns/${m[1]}`,
      labelKey: 'campaigns.memberSheet.back',
    }),
  },
  {
    pattern: /^\/campaigns\/[^/]+\/?$/,
    resolve: () => ({ to: '/campaigns', labelKey: 'nav.back.campaigns' }),
  },

  // --- Compte et contenu custom.
  {
    pattern: /^\/account\/content\/(?:new|edit\/[^/]+)\/?$/,
    resolve: () => ({ to: '/account/content', labelKey: 'nav.back.content' }),
  },
  {
    pattern: /^\/account\/content\/?$/,
    resolve: () => ({ to: '/account', labelKey: 'nav.back.account' }),
  },
];

/**
 * Route parente de `pathname`, ou `null` à la racine (le bouton Retour est alors
 * remplacé par la marque). Toute route non couverte remonte à la bibliothèque —
 * le comportement historique, qui reste juste pour les écrans de premier niveau
 * (`/create`, `/character/:id`, `/codex`, `/account`, `/campaigns`).
 */
export function parentRouteFor(pathname: string): ParentRoute | null {
  if (pathname === '/' || pathname === '') return null;

  for (const rule of RULES) {
    const match = pathname.match(rule.pattern);
    if (match) return rule.resolve(match);
  }

  return { to: '/', labelKey: 'nav.back.aria' };
}
