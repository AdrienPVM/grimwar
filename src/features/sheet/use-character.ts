import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { getDb } from '@/shared/lib/firebase';
import { CharacterSchema, type Character } from '@/shared/types/character';
import { migrateSpellRecord } from '@/shared/lib/rules/spell-aliases';
import { trackPendingWrite } from '@/shared/lib/track-pending-write';
import {
  needsV1ToV2Upgrade,
  upgradeCharacterV1ToV2,
} from './upgrade-character-v1-to-v2';

interface UseCharacterResult {
  character: Character | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * S'abonne en temps réel à `users/{uid}/characters/{id}` via onSnapshot.
 * - `character: null` + `isLoading: false` ⇒ document inexistant.
 * - Toute erreur de parsing Zod est remontée en `error` (et pas avalée), pour
 *   surfacer un schéma corrompu plutôt que d'afficher une fiche vide silencieuse.
 *
 * En S1 l'ownership = chemin Firestore (sous /users/{uid}/) : on lit toujours
 * dans le sous-arbre du user courant. La lecture cross-owner (DM) arrive en S2
 * (plan 16) via Cloud Function.
 */
export function useCharacter(characterId: string | undefined): UseCharacterResult {
  const { user } = useAuth();
  const [character, setCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !characterId) {
      setCharacter(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    const ref = doc(getDb(), 'users', user.uid, 'characters', characterId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setCharacter(null);
          setIsLoading(false);
          return;
        }
        const raw = snap.data();
        // Migration lazy v1 → v2 (plan 13.7 §0.2). Si on détecte un doc v1, on
        // l'upgrade en mémoire pour l'affichage, puis on écrit immédiatement la
        // version v2 dans Firestore (idempotent, one-shot). Pas de step de
        // rattrapage UI : la fiche tolère les sentinelles, et le wizard 13.8/13.9
        // refusera de submit si un sous-choix requis manque.
        const needsUpgrade = needsV1ToV2Upgrade(raw);
        const upgraded = needsUpgrade ? upgradeCharacterV1ToV2(raw) : raw;
        const parsed = CharacterSchema.safeParse({
          ...(upgraded as object),
          id: snap.id,
        });
        if (!parsed.success) {
          const first = parsed.error.errors[0];
          setError(
            new Error(
              `[sheet] Document Firestore invalide pour ${snap.id}: ${first?.path.join('.')} — ${first?.message}`,
            ),
          );
          setCharacter(null);
        } else {
          // Migration des IDs de sort « PHB 2014 (AideDD) » → « SRD 5.2.1 »
          // (plan 13.10 commit 4). Le bundle `spells.json` est régénéré
          // strict SRD : un perso seedé avant 13.10 peut porter des IDs 2014
          // (renommés) ou des sorts retirés du SRD. On remappe à la lecture
          // pour que la fiche les résolve, et on signale les retraits au MJ.
          const knownMig = migrateSpellRecord(parsed.data.knownSpells);
          const preparedMig = migrateSpellRecord(parsed.data.preparedSpells);
          const spellsChanged = knownMig.changed || preparedMig.changed;
          const finalCharacter = spellsChanged
            ? {
                ...parsed.data,
                knownSpells: knownMig.record,
                preparedSpells: preparedMig.record,
              }
            : parsed.data;

          setCharacter(finalCharacter);
          setError(null);

          // Visibilité MJ : un sort retiré du SRD 5.2.1 disparaît de la fiche.
          // En S1 l'event-logger n'existe pas encore (cf. docs/EVENT-LOG.md, S3) ;
          // on émet un log structuré greppable, repris par le logger plus tard.
          for (const r of [...knownMig.removed, ...preparedMig.removed]) {
            console.warn(
              `[sheet] spell.removed-not-in-srd character=${snap.id} class=${r.classId} spell=${r.spellId}`,
            );
          }

          if (needsUpgrade || spellsChanged) {
            // Persiste l'upgrade (v2 + migration sorts) en Firestore —
            // fire-and-forget, on log l'échec sans bloquer l'affichage (la
            // version migrée est déjà en mémoire). One-shot idempotent.
            if (needsUpgrade) {
              console.info(
                `[sheet] schema.upgraded character=${snap.id} v1 → v2 (plan 13.7)`,
              );
            }
            if (spellsChanged) {
              console.info(
                `[sheet] spell.ids-migrated character=${snap.id} (2014 → SRD 5.2.1, plan 13.10)`,
              );
            }
            // Fire-and-forget mais tracké : la migration peut tomber offline,
            // l'utilisateur doit voir « Synchronisation » via OfflineBanner
            // jusqu'à l'ack backend (JALON 1D.3).
            void trackPendingWrite(
              getDb(),
              setDoc(ref, finalCharacter),
            ).catch((err) => {
              console.warn(
                `[sheet] character upgrade write failed for ${snap.id}:`,
                err,
              );
            });
          }
        }
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, [user, characterId]);

  return { character, isLoading, error };
}
