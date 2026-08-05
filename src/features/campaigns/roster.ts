import type { Campaign, Membership } from '@/shared/types/campaign';

/**
 * Construction de la liste des membres d'une campagne — logique pure, extraite
 * de `campaign-detail-screen.tsx` (audit UX, E7).
 *
 * POURQUOI un module à part : la rencontre a désormais besoin du même roster
 * pour ouvrir la compagnie en plein combat. Le faire importer depuis un ÉCRAN
 * ferait dépendre le tracker du hub de campagne — et de tout ce que cet écran
 * tire avec lui. Le roster est une donnée dérivée, pas un morceau d'écran.
 */

export interface RosterEntry {
  uid: string;
  label: string;
  /**
   * `true` quand `label` est un vrai nom d'affichage (displayName dénormalisé),
   * `false` quand c'est le repli UID tronqué. Pilote la typographie (serif pour
   * un nom, mono pour un identifiant technique).
   */
  hasName: boolean;
  role: 'gm' | 'member';
  /** L'entrée correspond à l'utilisateur connecté. */
  isSelf: boolean;
  /**
   * Fiche liée (`members/{uid}.characterId`), ou `null`. Sert au MJ à ouvrir la
   * fiche en lecture seule (4A.3). Un MENEUR peut désormais en avoir une (M67a,
   * il joue un PJ à sa propre table) : on la lit sur son doc member quand il en
   * a un, sans quoi sa ligne de roster resterait vide alors que sa fiche existe.
   */
  characterId: string | null;
}

/**
 * Construit la liste affichée du roster :
 *  - tous les UIDs de `gmIds` (rôle 'gm'),
 *  - puis tous les `members[]` qui ne sont PAS dans `gmIds` (rôle 'member').
 *
 * Le dédoublonnage est nécessaire : `promoteToGm` (4.0.3) garde le doc member
 * et lui passe `role: 'gm'`, donc un MJ peut apparaître DOUBLE (dans `gmIds`
 * ET dans `members`). On garde la priorité gmIds (source de vérité côté rules).
 *
 * Libellé : displayName dénormalisé du doc member → repli UID tronqué. Pour LA
 * ligne de l'utilisateur courant, le nom LIVE de son profil Auth (`myDisplayName`)
 * prime sur la valeur stockée — ainsi son propre nom s'affiche instantanément,
 * sans attendre l'écriture de self-heal (qui, elle, sert aux AUTRES membres).
 */
export function buildRoster(
  campaign: Campaign,
  members: Membership[],
  myUid: string | null,
  myDisplayName: string | null,
): RosterEntry[] {
  const byUid = new Map<string, Membership>(members.map((m) => [m.userId, m]));
  const seen = new Set<string>();
  const result: RosterEntry[] = [];

  function makeEntry(
    uid: string,
    role: 'gm' | 'member',
    characterId: string | null,
    storedName: string | null,
  ): RosterEntry {
    const isSelf = myUid !== null && uid === myUid;
    const name = (isSelf ? myDisplayName : null) ?? storedName;
    const trimmed = name?.trim() ?? '';
    const hasName = trimmed !== '';
    return {
      uid,
      label: hasName ? trimmed : formatUid(uid),
      hasName,
      role,
      isSelf,
      characterId,
    };
  }

  for (const uid of campaign.gmIds) {
    if (seen.has(uid)) continue;
    seen.add(uid);
    // Un MJ promu depuis un doc member porte un displayName → on le récupère.
    // Idem pour sa fiche liée : un meneur qui joue un PJ (M67a) doit apparaître
    // avec, comme n'importe qui à la table.
    const gmDoc = byUid.get(uid);
    result.push(
      makeEntry(uid, 'gm', gmDoc?.characterId ?? null, gmDoc?.displayName ?? null),
    );
  }
  for (const m of members) {
    if (seen.has(m.userId)) continue;
    seen.add(m.userId);
    result.push(makeEntry(m.userId, m.role, m.characterId, m.displayName ?? null));
  }
  return result;
}

/**
 * Tronquage UID — repli quand un membre n'a pas (encore) de displayName
 * dénormalisé (compte anonyme, ou doc antérieur au champ pas encore auto-soigné).
 * On affiche un préfixe lisible suivi d'une ellipsis pour rappeler que c'est un
 * identifiant technique. Tronqué à 8 chars (assez pour distinguer 99 % des
 * paires d'UIDs Firebase).
 */
export function formatUid(uid: string): string {
  if (uid.length <= 10) return uid;
  return `${uid.slice(0, 8)}…`;
}
