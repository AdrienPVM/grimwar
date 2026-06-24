import { doc, getDoc } from 'firebase/firestore';

import type { LinkedMember } from '@/features/campaigns/use-encounter-party-draft';
import { getDb } from '@/shared/lib/firebase';
import type { GameEvent } from '@/shared/types/event';

/**
 * Résout les NOMS de personnages référencés par les événements d'une séance, au
 * moment de la compilation du journal (plan 25.2), sous forme de
 * `Map<characterId, name>`.
 *
 * Pourquoi à la volée : les événements ne portent que `actorCharacterId` /
 * `targetCharacterId` (un id), jamais le nom — et le roster de campagne n'a pas
 * de displayName partagé en V1 (cf. décision UI). On reconstruit donc le nom en
 * joignant `characterId` → `userId` (roster lié) puis en lisant
 * `users/{userId}/characters/{id}.name` en cross-owner (rule
 * `gmCanReadLinkedCharacter`, 4A.1) — même pattern que
 * `resolveInitiativeModifiers` (24.3).
 *
 * Repli (jamais throw) : un personnage non lié au roster, une fiche introuvable,
 * un `name` non-chaîne, ou une lecture qui échoue ⇒ ABSENT de la map. Le
 * template applique alors son repli générique (« Quelqu'un »). Une lecture par
 * personnage est isolée — une fiche illisible n'empêche pas de résoudre les
 * autres.
 *
 * Seuls les ids DISTINCTS réellement présents dans les événements sont lus (1
 * lecture max par personnage), pas tout le roster.
 */
export async function resolveJournalCharacterNames(
  events: readonly GameEvent[],
  linkedMembers: readonly LinkedMember[],
): Promise<Map<string, string>> {
  const ownerByCharacter = new Map(linkedMembers.map((m) => [m.characterId, m.userId]));

  // Ids de personnages distincts effectivement cités (acteur ou cible).
  const characterIds = new Set<string>();
  for (const ev of events) {
    if (ev.actorCharacterId) characterIds.add(ev.actorCharacterId);
    if (ev.targetCharacterId) characterIds.add(ev.targetCharacterId);
  }

  const entries = await Promise.all(
    [...characterIds].map(async (characterId): Promise<[string, string] | null> => {
      const name = await resolveOne(characterId, ownerByCharacter);
      return name === null ? null : [characterId, name];
    }),
  );

  return new Map(entries.filter((e): e is [string, string] => e !== null));
}

async function resolveOne(
  characterId: string,
  ownerByCharacter: ReadonlyMap<string, string>,
): Promise<string | null> {
  const ownerUid = ownerByCharacter.get(characterId);
  if (ownerUid === undefined) return null;

  try {
    const snap = await getDoc(doc(getDb(), 'users', ownerUid, 'characters', characterId));
    if (!snap.exists()) return null;
    const raw = snap.data() as { name?: unknown };
    return typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name : null;
  } catch {
    // Lecture isolée : une fiche illisible ne casse pas la résolution des autres.
    return null;
  }
}
