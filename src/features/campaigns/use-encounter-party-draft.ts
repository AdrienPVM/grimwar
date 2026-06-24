import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getDb } from '@/shared/lib/firebase';

/** Membre lié dont on veut tirer un participant joueur (characterId non nul). */
export interface LinkedMember {
  userId: string;
  characterId: string;
}

/**
 * Participant joueur prêt à être posé dans `createEncounter` — snapshot des PV à
 * l'instant de la création. `ownerUid` est conservé pour le câblage temps-réel
 * ultérieur (24.x : ré-synchroniser les PV de la fiche vers la rencontre).
 */
export interface PlayerParticipantDraft {
  characterId: string;
  ownerUid: string;
  name: string;
  maxHp: number;
  currentHp: number;
}

interface UseEncounterPartyDraftResult {
  drafts: PlayerParticipantDraft[];
  isLoading: boolean;
  /** Vrai si au moins une fiche liée n'a pas pu être lue (exclue des drafts). */
  hadReadError: boolean;
}

/**
 * Lit une fois les fiches liées des membres pour en tirer des participants
 * joueurs (nom + PV courants/max), à la création d'une rencontre (step 3 :
 * « all players auto-added »).
 *
 * Lecture cross-owner one-shot via `getDoc` sur `users/{ownerUid}/characters/{id}`
 * — autorisée par la rule `gmCanReadLinkedCharacter` (4A.1) tant que la fiche est
 * liée à la membership du joueur. On NE s'abonne PAS en live (contrairement à
 * `useCharacter`) : la rencontre fige les PV à sa création ; la ré-synchronisation
 * live fiche→rencontre est un sujet de l'écran de combat (24.x).
 *
 * Extraction DÉFENSIVE des 3 champs nécessaires (`name`, `hp.current`, `hp.max`)
 * plutôt qu'un parse complet `CharacterSchema` : ces champs sont stables entre v1
 * et v2 (l'upgrade v1→v2 porte sur `classes`/sorts, pas sur les PV) — on évite de
 * rejeter une fiche v1 non encore migrée qu'on saurait pourtant lire. Une fiche
 * illisible (absente, champs manquants) est exclue et lève `hadReadError`.
 *
 * `enabled` gate le fetch : la modale de création ne le passe à `true` qu'à son
 * ouverture, pour ne pas lire toute la table au simple affichage de la liste.
 */
export function useEncounterPartyDraft(
  linkedMembers: readonly LinkedMember[],
  enabled: boolean,
): UseEncounterPartyDraftResult {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<PlayerParticipantDraft[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [hadReadError, setHadReadError] = useState<boolean>(false);

  // Clé stable dérivée des membres liés — évite de re-fetcher sur une nouvelle
  // référence de tableau identique en contenu (le parent ne mémoïse pas forcément).
  const membersKey = useMemo(
    () => linkedMembers.map((m) => `${m.userId}:${m.characterId}`).join('|'),
    [linkedMembers],
  );

  useEffect(() => {
    if (!enabled || !user) {
      setDrafts([]);
      setIsLoading(false);
      setHadReadError(false);
      return;
    }
    if (linkedMembers.length === 0) {
      setDrafts([]);
      setIsLoading(false);
      setHadReadError(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHadReadError(false);

    Promise.all(
      linkedMembers.map(async (member): Promise<PlayerParticipantDraft | null> => {
        const ref = doc(getDb(), 'users', member.userId, 'characters', member.characterId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return extractPlayerDraft(snap.data(), member);
      }),
    )
      .then((results) => {
        if (cancelled) return;
        const ok = results.filter((r): r is PlayerParticipantDraft => r !== null);
        setDrafts(ok);
        setHadReadError(ok.length < linkedMembers.length);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Une erreur globale (réseau, permission) : aucun draft, on signale.
        setDrafts([]);
        setHadReadError(true);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // membersKey capture le contenu de linkedMembers ; eslint ne le voit pas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user, membersKey]);

  return { drafts, isLoading, hadReadError };
}

/**
 * Extraction défensive des champs combat d'une fiche brute Firestore. Renvoie
 * `null` si la forme est inexploitable (pas de nom ou PV non numériques) — la
 * fiche est alors exclue silencieusement (comptabilisée par `hadReadError`).
 */
function extractPlayerDraft(
  raw: unknown,
  member: LinkedMember,
): PlayerParticipantDraft | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as { name?: unknown; hp?: unknown };
  const name = typeof data.name === 'string' && data.name.trim().length > 0 ? data.name : null;
  if (name === null) return null;

  const hp = data.hp;
  if (typeof hp !== 'object' || hp === null) return null;
  const hpObj = hp as { current?: unknown; max?: unknown };
  if (typeof hpObj.max !== 'number' || typeof hpObj.current !== 'number') return null;

  return {
    characterId: member.characterId,
    ownerUid: member.userId,
    name,
    maxHp: hpObj.max,
    currentHp: hpObj.current,
  };
}
