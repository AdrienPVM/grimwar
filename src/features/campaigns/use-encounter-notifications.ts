import { useEffect, useRef } from 'react';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';

import { getDb } from '@/shared/lib/firebase';
import { t } from '@/shared/lib/i18n';
import { showToast } from '@/shared/lib/slices/toast-slice';
import { EncounterSchema, type Encounter } from '@/shared/types/encounter';

/**
 * Notifications de combat (E13, étape 2) : « le combat commence » et surtout
 * « c'est à vous de jouer ».
 *
 * POURQUOI : le tracker de combat est temps réel depuis le plan 24, mais il ne
 * parle qu'à qui le regarde. Un joueur qui consulte sa fiche — le geste normal
 * pendant un combat — ne sait pas que son tour est arrivé ; à une table réelle
 * c'est le MJ qui le dit à voix haute. L'app a la donnée (`turnIndex` sur le doc
 * de rencontre) et ne s'en servait pas.
 *
 * QUI EST NOTIFIÉ : uniquement le joueur dont le personnage participe. Le
 * pointeur vient de sa propre membership (`campaigns/{cid}/members/{uid}
 * .characterId`), une lecture unique par changement de campagne. Un MJ pur n'a
 * pas de doc member ⇒ pas de `characterId` ⇒ AUCUN listener n'est ouvert : c'est
 * lui qui fait avancer les tours, se les faire annoncer serait du bruit.
 *
 * DEUX TOASTS, JAMAIS LES DEUX À LA FOIS : si le combat démarre et que
 * l'initiative vous place premier, seul « à vous de jouer » sort — il implique le
 * premier et il est le seul actionnable.
 *
 * Le premier snapshot est marqué « vu » sans bruit, comme
 * `useHandoutNotifications` : à l'arrivée sur un écran en plein combat on ne
 * re-notifie pas un tour déjà en cours. Conséquence assumée : changer d'écran au
 * moment exact où son tour arrive peut faire perdre le toast — le tracker, lui,
 * reste juste.
 *
 * Coût Firestore : un `getDoc` de membership + un listener sur
 * `where('status','==','active')` avec `limit(1)`. Single-field ⇒ index
 * automatique, comme `getActiveEncounter`. Les deux lectures sont déjà
 * autorisées par les rules en place (24.1 pour les rencontres, roster pour la
 * membership) — aucun déploiement nécessaire.
 */
export function useEncounterNotifications(
  campaignId: string | undefined,
  uid: string | undefined,
  enabled = true,
): void {
  // Dernier tour NOTIFIÉ (ou vu au premier snapshot) — un même
  // (rencontre, round, tour) ne doit jamais toaster deux fois, et le doc est
  // réécrit à chaque dégât appliqué.
  const seenTurnRef = useRef<string | null>(null);
  const seenEncounterRef = useRef<string | null>(null);
  const loadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!campaignId || !uid || !enabled) return;
    seenTurnRef.current = null;
    seenEncounterRef.current = null;
    loadedRef.current = false;

    let cancelled = false;
    let unsub: (() => void) | null = null;

    function handle(myCharacterId: string, snap: QuerySnapshot<DocumentData>): void {
      const firstLoad = !loadedRef.current;
      loadedRef.current = true;

      const docSnap = snap.docs[0];
      if (!docSnap) {
        // Plus aucun combat actif : on repart propre pour le prochain.
        seenEncounterRef.current = null;
        seenTurnRef.current = null;
        return;
      }
      const parsed = EncounterSchema.safeParse({ ...docSnap.data(), id: docSnap.id });
      if (!parsed.success) return;
      const encounter: Encounter = parsed.data;

      const iAmIn = encounter.participants.some((p) => p.characterId === myCharacterId);
      const isNewEncounter = seenEncounterRef.current !== encounter.id;
      seenEncounterRef.current = encounter.id;

      const active = encounter.participants[encounter.turnIndex];
      const isMyTurn = active?.characterId === myCharacterId;
      const turnKey = `${encounter.id}:${encounter.round}:${encounter.turnIndex}`;
      const isNewTurn = seenTurnRef.current !== turnKey;
      seenTurnRef.current = turnKey;

      if (firstLoad) return; // état déjà en cours à l'arrivée : pas une nouveauté

      if (isMyTurn && isNewTurn) {
        showToast({
          kind: 'info',
          title: t('encounters.toast.yourTurn.title'),
          sub: t('encounters.toast.yourTurn.sub')
            .replace('{n}', String(encounter.round))
            .replace('{name}', encounter.name),
          durationMs: 6000,
        });
        return; // « à vous de jouer » implique « le combat commence »
      }
      if (isNewEncounter && iAmIn) {
        showToast({
          kind: 'info',
          title: t('encounters.toast.started.title'),
          sub: encounter.name,
          durationMs: 5000,
        });
      }
    }

    // La membership porte le personnage joué à cette table. Lecture unique :
    // elle ne change qu'au (dé)liage d'une fiche, pas pendant une partie.
    void getDoc(doc(getDb(), 'campaigns', campaignId, 'members', uid))
      .then((memberSnap) => {
        if (cancelled) return;
        const myCharacterId = memberSnap.exists()
          ? ((memberSnap.data() as { characterId?: string | null }).characterId ?? null)
          : null;
        if (!myCharacterId) return; // MJ pur, ou joueur sans fiche liée
        unsub = onSnapshot(
          query(
            collection(getDb(), 'campaigns', campaignId, 'encounters'),
            where('status', '==', 'active'),
            limit(1),
          ),
          (snap) => handle(myCharacterId, snap),
        );
      })
      .catch(() => {
        // Un non-membre n'a pas à être notifié : l'échec de lecture est la
        // réponse, pas une erreur à remonter à l'utilisateur.
      });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [campaignId, uid, enabled]);
}
