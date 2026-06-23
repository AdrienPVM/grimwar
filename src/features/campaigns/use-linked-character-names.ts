import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getDb } from '@/shared/lib/firebase';
import type { Membership } from '@/shared/types/campaign';

/**
 * Résout le NOM des personnages liés des membres d'une campagne (JALON 22.4),
 * pour étiqueter le filtre par joueur du feed et l'acteur/cible dans la modale
 * de détail d'un événement.
 *
 * Lecture cross-owner ONE-SHOT (`getDoc`) sur `users/{ownerUid}/characters/{id}`,
 * autorisée par la rule A2 `gmCanReadLinkedCharacter` (4A.1) — la même qui ouvre
 * la lecture MJ d'une fiche liée. On préfère `getDoc` à `onSnapshot` car un nom
 * de personnage est quasi-statique : un renommage côté joueur ne se reflétera
 * qu'au prochain montage de l'écran (acceptable V1), et on évite d'empiler N
 * écouteurs live en plus de ceux du panneau compagnie (4A.4).
 *
 * Tolérant : un personnage qui ne résout pas (rule deny, doc absent, parse,
 * réseau) est simplement absent de la map. Le consommateur retombe alors sur un
 * libellé générique — jamais un crash, jamais un identifiant machine affiché.
 */
export function useLinkedCharacterNames(
  members: Membership[],
): Record<string, string> {
  const { user } = useAuth();
  const [names, setNames] = useState<Record<string, string>>({});

  // Clé stable de l'ensemble lié (`ownerUid:characterId`, triée) : l'effet ne
  // relance ses lectures que quand l'ensemble change réellement, pas à chaque
  // nouvelle référence du tableau `members` renvoyé par `useCampaign`.
  const linkedKey = members
    .filter((m) => m.characterId)
    .map((m) => `${m.userId}:${m.characterId}`)
    .sort()
    .join(',');

  useEffect(() => {
    if (!user || linkedKey === '') {
      setNames({});
      return;
    }
    let cancelled = false;
    const pairs = linkedKey.split(',').map((entry) => {
      const sep = entry.indexOf(':');
      return { uid: entry.slice(0, sep), charId: entry.slice(sep + 1) };
    });

    void Promise.all(
      pairs.map(async ({ uid, charId }) => {
        try {
          const snap = await getDoc(
            doc(getDb(), 'users', uid, 'characters', charId),
          );
          const name = snap.exists()
            ? (snap.data() as { name?: unknown }).name
            : undefined;
          return typeof name === 'string' && name.length > 0
            ? ([charId, name] as const)
            : null;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const e of entries) if (e) map[e[0]] = e[1];
      setNames(map);
    });

    return () => {
      cancelled = true;
    };
  }, [user, linkedKey]);

  return names;
}
