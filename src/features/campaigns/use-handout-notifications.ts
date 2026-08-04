import { useEffect, useRef } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';

import { getDb } from '@/shared/lib/firebase';
import { t } from '@/shared/lib/i18n';
import { showToast } from '@/shared/lib/slices/toast-slice';
import { HANDOUT_RECIPIENTS_ALL, HandoutSchema } from '@/shared/types/handout';

/**
 * Écoute en temps réel les handouts adressés à `uid` et déclenche un toast
 * « Le MJ vous a envoyé un document : … » à chaque NOUVEAU document reçu après
 * le montage. Le premier snapshot (chargement initial des documents déjà
 * présents) est marqué « vu » sans toast — on ne notifie que les ajouts
 * postérieurs.
 *
 * Monté AU-DESSUS des routes depuis E13/1 (`campaign-notifications.tsx`), plus
 * dans le seul hub de campagne : le joueur reçoit désormais le toast depuis sa
 * fiche, c'est-à-dire pendant la partie — le moment où le MJ envoie un document.
 *
 * NE PAS SE NOTIFIER SOI-MÊME : la query `recipients == 'all'` matche aussi pour
 * le MJ (la rule l'autorise en tant qu'`isDMOf`), qui recevrait donc un toast
 * pour ses propres diffusions « toute la table ». Le filtre porte sur
 * `createdBy`, pas sur « est-ce que je suis MJ » : au point de montage global on
 * ne connaît pas les `gmIds` sans une lecture supplémentaire, et l'auteur est la
 * vraie question. Conséquence assumée : un co-MJ est notifié des documents
 * diffusés par l'autre MJ — de l'information, pas du bruit.
 *
 * `enabled` reste disponible pour couper les deux listeners sans casser l'ordre
 * des hooks.
 */
export function useHandoutNotifications(
  campaignId: string | undefined,
  uid: string | undefined,
  enabled = true,
): void {
  // Ids déjà notifiés/vus — évite un re-toast si un doc est re-livré (ex. un
  // `revealedTo` modifié émet un `modified`, pas un `added`, mais ceinture+
  // bretelles). Réinitialisé à chaque changement de campagne/joueur.
  const seenRef = useRef<Set<string>>(new Set());
  const loadedRef = useRef<{ mine: boolean; all: boolean }>({ mine: false, all: false });

  useEffect(() => {
    if (!campaignId || !uid || !enabled) return;
    seenRef.current = new Set();
    loadedRef.current = { mine: false, all: false };
    const col = collection(getDb(), 'campaigns', campaignId, 'handouts');

    function makeHandler(which: 'mine' | 'all') {
      return (snap: QuerySnapshot<DocumentData>): void => {
        const firstLoad = !loadedRef.current[which];
        snap.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const id = change.doc.id;
          if (seenRef.current.has(id)) return;
          seenRef.current.add(id);
          if (firstLoad) return; // documents préexistants → pas une nouveauté
          const parsed = HandoutSchema.safeParse({ ...change.doc.data(), id });
          if (!parsed.success || parsed.data.visibility === 'archived') return;
          if (parsed.data.createdBy === uid) return; // ses propres envois

          showToast({
            kind: 'info',
            title: t('handouts.toast.title'),
            sub: parsed.data.title,
            durationMs: 5000,
          });
        });
        loadedRef.current[which] = true;
      };
    }

    const unsubMine = onSnapshot(
      query(col, where('recipients', 'array-contains', uid)),
      makeHandler('mine'),
    );
    const unsubAll = onSnapshot(
      query(col, where('recipients', '==', HANDOUT_RECIPIENTS_ALL)),
      makeHandler('all'),
    );
    return () => {
      unsubMine();
      unsubAll();
    };
  }, [campaignId, uid, enabled]);
}
