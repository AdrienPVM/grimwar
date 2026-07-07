import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  needsV1ToV2Upgrade,
  upgradeCharacterV1ToV2,
} from '@/features/sheet/upgrade-character-v1-to-v2';
import { getDb } from '@/shared/lib/firebase';
import { CharacterSchema } from '@/shared/types/character';

/** Fiche liée d'un joueur que le MJ peut lire (rule A2 cross-owner). */
export interface PartyMemberRef {
  characterId: string;
  ownerUid: string;
}

/**
 * Agrégat « compagnie » calculé pour le meneur — les métriques d'un coup d'œil
 * qui servent à jauger un groupe et à budgéter une rencontre (SRD 5.2.1 §
 * « Combat Encounters » : la difficulté se dérive de l'effectif et des niveaux).
 */
export interface PartyAggregate {
  /** Nombre de fiches liées effectivement chargées (lisibles). */
  count: number;
  /** Niveau moyen arrondi de la compagnie ; `null` si aucune fiche chargée. */
  averageLevel: number | null;
  /** Niveau le plus bas ; `null` si aucune fiche. */
  minLevel: number | null;
  /** Niveau le plus haut ; `null` si aucune fiche. */
  maxLevel: number | null;
  /** Nombre de personnages à terre (`status === 'dead'`). */
  downedCount: number;
  /** Au moins une fiche liée n'est pas encore résolue. */
  isLoading: boolean;
}

export interface CharacterSummary {
  totalLevel: number;
  status: 'alive' | 'dead';
}

const EMPTY_AGGREGATE: PartyAggregate = {
  count: 0,
  averageLevel: null,
  minLevel: null,
  maxLevel: null,
  downedCount: 0,
  isLoading: false,
};

/**
 * Dérive l'agrégat à partir des fiches résolues. Fonction pure (testable sans
 * Firestore) : `summaries` = fiches effectivement chargées, `loadedCount` =
 * nombre de fiches dont la première réponse (ou l'erreur) est arrivée,
 * `refCount` = nombre de fiches attendues. `isLoading` reste vrai tant qu'une
 * fiche n'a pas répondu.
 */
export function computePartyAggregate(
  summaries: CharacterSummary[],
  loadedCount: number,
  refCount: number,
): PartyAggregate {
  const count = summaries.length;
  const isLoading = loadedCount < refCount;
  if (count === 0) {
    return { ...EMPTY_AGGREGATE, isLoading };
  }
  const levels = summaries.map((s) => s.totalLevel);
  const totalLevels = levels.reduce((sum, lvl) => sum + lvl, 0);
  return {
    count,
    averageLevel: Math.round(totalLevels / count),
    minLevel: Math.min(...levels),
    maxLevel: Math.max(...levels),
    downedCount: summaries.filter((s) => s.status === 'dead').length,
    isLoading,
  };
}

/**
 * S'abonne en temps réel à toutes les fiches liées d'une compagnie et en dérive
 * un agrégat pour le meneur (effectif, niveau moyen, éventail de niveaux, morts).
 *
 * Pourquoi un hook dédié plutôt que de « remonter » les `Character` déjà chargés
 * par chaque `PartyMemberCard` : lever l'état à travers l'arbre de cartes (N
 * callbacks + état parent) serait plus fragile qu'un lecteur autonome. Les
 * listeners lisent le cache local Firestore partagé avec les cartes — pour une
 * compagnie de ~4-6 fiches, le coût est négligeable.
 *
 * MJ-only en pratique : seule la rule A2 (`gmCanReadLinkedCharacter`) ouvre la
 * lecture cross-owner. Un spectateur non-MJ passera `refs = []` (aucune fiche
 * d'autrui lisible) et obtiendra l'agrégat vide. Une fiche corrompue ou dont la
 * lecture échoue est simplement exclue de l'agrégat (la carte la signale déjà).
 *
 * On ne persiste RIEN ici (ni migration v1→v2, ni sorts) — c'est une lecture
 * pure d'agrégation, le propriétaire de la fiche gère ses propres migrations.
 */
export function usePartyAggregate(refs: PartyMemberRef[]): PartyAggregate {
  // Clé stable de composition : on ne recrée les listeners que si l'ensemble
  // (propriétaire + fiche) change réellement, pas à chaque render. Les IDs
  // Firebase (UID, doc auto-id) sont alphanumériques → séparateurs sûrs.
  const key = useMemo(
    () =>
      refs
        .map((r) => `${r.ownerUid}/${r.characterId}`)
        .sort()
        .join('|'),
    [refs],
  );

  // Composition courante lue DANS l'effet sans l'ajouter aux deps : `key` pilote
  // le re-abonnement, la ref fournit les valeurs à jour au moment de l'exécution.
  const refsRef = useRef<PartyMemberRef[]>(refs);
  refsRef.current = refs;

  const [summaries, setSummaries] = useState<Map<string, CharacterSummary>>(
    () => new Map(),
  );
  const [loadedIds, setLoadedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const current = refsRef.current;
    if (current.length === 0) {
      setSummaries(new Map());
      setLoadedIds(new Set());
      return;
    }
    // Repart d'un état vierge à chaque changement de composition pour ne pas
    // garder les métriques d'une fiche qui a quitté la compagnie.
    setSummaries(new Map());
    setLoadedIds(new Set());

    const db = getDb();
    const markLoaded = (id: string): void =>
      setLoadedIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    const dropSummary = (id: string): void =>
      setSummaries((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });

    const unsubs = current.map((r) => {
      const ref = doc(db, 'users', r.ownerUid, 'characters', r.characterId);
      return onSnapshot(
        ref,
        (snap) => {
          markLoaded(r.characterId);
          if (!snap.exists()) {
            dropSummary(r.characterId);
            return;
          }
          // Même pipeline de lecture que `useCharacter` : on upgrade en mémoire
          // les fiches v1 (per-class fields manquants) AVANT le parse, sinon une
          // fiche encore v1 (migrée à la prochaine ouverture par son
          // propriétaire) échouerait le schéma et serait exclue → agrégat qui
          // sous-compte silencieusement les joueurs pas encore migrés. On ne
          // PERSISTE rien (le MJ ne possède pas la fiche) — upgrade d'affichage.
          const raw = snap.data();
          const upgraded = needsV1ToV2Upgrade(raw) ? upgradeCharacterV1ToV2(raw) : raw;
          const parsed = CharacterSchema.safeParse({
            ...(upgraded as object),
            id: snap.id,
          });
          if (!parsed.success) {
            // Fiche corrompue : exclue de l'agrégat (la carte la signale déjà).
            dropSummary(r.characterId);
            return;
          }
          setSummaries((prev) => {
            const next = new Map(prev);
            next.set(r.characterId, {
              totalLevel: parsed.data.totalLevel,
              status: parsed.data.status,
            });
            return next;
          });
        },
        () => {
          // Lecture refusée (permission perdue, fiche déliée) : on débloque le
          // chargement et on exclut la fiche plutôt que de rester en attente.
          markLoaded(r.characterId);
          dropSummary(r.characterId);
        },
      );
    });
    return () => unsubs.forEach((u) => u());
  }, [key]);

  return useMemo<PartyAggregate>(
    () => computePartyAggregate([...summaries.values()], loadedIds.size, refs.length),
    [summaries, loadedIds, refs.length],
  );
}
