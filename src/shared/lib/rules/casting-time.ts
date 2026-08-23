/**
 * Classement d'un temps d'incantation SRD par ÉCONOMIE D'ACTION.
 *
 * POURQUOI : le bundle porte le temps d'incantation en texte libre localisé
 * (« action Bonus », « Réaction, que vous jouez lorsqu'un jet d'attaque vous
 * touche… », « 1 minute ou rituel »). Utile à lire, inexploitable pour
 * regrouper. Cette fonction en tire la seule information dont le combat a
 * besoin : ce sort se joue-t-il sur l'action, sur l'action Bonus, ou en
 * Réaction.
 *
 * On classe sur la chaîne EN et non FR, délibérément : le FR de certaines
 * entrées porte encore les coupures de mots de l'extraction PDF (« entre-
 * prenez », « lors- qu'un »), tandis que l'EN commence toujours par le terme
 * d'économie d'action, nu et non coupé. Le FR reste la chaîne AFFICHÉE.
 */

export type ActionEconomy = 'action' | 'bonus' | 'reaction' | 'other';

export function classifyCastingTime(castingTimeEn: string): ActionEconomy {
  const s = castingTimeEn.trim().toLowerCase();
  if (s.startsWith('bonus action')) return 'bonus';
  if (s.startsWith('reaction')) return 'reaction';
  if (s.startsWith('action')) return 'action';
  // « 1 minute », « 10 minutes », « 1 hour » (avec ou sans « or Ritual ») : ces
  // sorts ne se lancent pas dans un tour de combat. Les ranger avec les actions
  // ferait promettre au joueur une option qu'il n'a pas.
  return 'other';
}
