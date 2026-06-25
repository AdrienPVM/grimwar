import { z } from 'zod';

/**
 * Handout MJ→joueur — `campaigns/{campaignId}/handouts/{handoutId}` (plan 27).
 * Source de vérité du schéma : docs/DATA-MODEL.md.
 *
 * Un handout est un document que le MJ envoie à tout ou partie de la table
 * pendant une séance (carte, lettre, indice, illustration). En V1 (plan 27,
 * Option A) seuls les documents TEXTE/Markdown sont créables — l'upload d'image
 * (Firebase Storage) est différé en sous-plan 27b. Le champ `content.imageUrl`
 * reste néanmoins dans le schéma et le viewer le rend déjà : un handout image
 * pré-existant (import futur) ou mixte s'affichera sans changement de modèle.
 *
 * `recipients` : tableau d'UIDs destinataires, OU la chaîne littérale `'all'`
 * (= tous les joueurs sauf le MJ). Le filtrage de lecture est porté par
 * `firestore.rules` (un joueur ne lit que les handouts où son UID figure dans
 * `recipients`, ou `recipients === 'all'`).
 *
 * `revealedTo` : UIDs ayant ouvert le document. Le joueur s'y ajoute lui-même à
 * l'ouverture (rule update « self-reveal » : un membre ne peut modifier QUE ce
 * champ, et uniquement pour y appendre son propre UID).
 */
export const HANDOUT_TYPES = ['image', 'text', 'mixed'] as const;
export type HandoutType = (typeof HANDOUT_TYPES)[number];

/**
 * État du document. `sent` à la création ; `revealed` réservé à un usage futur
 * (au moins un destinataire a ouvert) ; `archived` = retiré du flux actif mais
 * conservé dans l'historique (le MJ archive, plan 27 step 11).
 */
export const HANDOUT_VISIBILITIES = ['sent', 'revealed', 'archived'] as const;
export type HandoutVisibility = (typeof HANDOUT_VISIBILITIES)[number];

/** Valeur littérale « tous les joueurs » de `recipients`. */
export const HANDOUT_RECIPIENTS_ALL = 'all' as const;

export const HandoutSchema = z.object({
  id: z.string().min(1).max(128),
  title: z.string().min(1).max(200),
  type: z.enum(HANDOUT_TYPES),
  content: z.object({
    /** Markdown FR (sous-ensemble rendu par `JournalMarkdown`). */
    text: z.string().optional(),
    /** URL Firebase Storage — différé 27b ; absent en V1. */
    imageUrl: z.string().url().optional(),
  }),
  recipients: z.union([z.literal(HANDOUT_RECIPIENTS_ALL), z.array(z.string().min(1))]),
  revealedTo: z.array(z.string()),
  visibility: z.enum(HANDOUT_VISIBILITIES),
  createdBy: z.string().min(1),
  /** Firestore `Timestamp` — typé `unknown`, narrowé au point d'usage. */
  createdAt: z.unknown(),
});

export type Handout = z.infer<typeof HandoutSchema>;

/**
 * Renvoie `true` si un handout s'adresse (au moins en partie) à `uid` :
 * destinataire explicite ou diffusion `'all'`. Pur helper de présentation —
 * l'autorité reste les rules Firestore.
 */
export function handoutTargetsUser(handout: Handout, uid: string): boolean {
  if (handout.recipients === HANDOUT_RECIPIENTS_ALL) return true;
  return handout.recipients.includes(uid);
}

/**
 * Millisecondes du `createdAt` Firestore pour le tri client-side (le service
 * trie en mémoire — volume bas, cf. `useSessions`). Tolère le `Timestamp`
 * Firestore (`.toMillis()` / `.seconds`) et le pending `serverTimestamp()`
 * (null avant résolution serveur → 0, donc en queue de tri desc).
 */
export function handoutCreatedAtMillis(handout: Handout): number {
  const ts = handout.createdAt as { toMillis?: () => number; seconds?: number } | null;
  if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts && typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}
