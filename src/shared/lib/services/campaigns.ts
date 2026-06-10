/**
 * Service Firestore pour `campaigns/{cid}` — minimal helper côté MJ.
 *
 * Périmètre actuel (CHANTIER D phase 2, tracer D.3) : un seul helper
 * `ensureCampaignExists` qui pose un doc campaign stub quand l'utilisateur
 * arrive sur `/map-proto/cloud/:cid` avec un cid qui n'existe pas encore.
 *
 * JALON 4.0.2 — adaptation minimale au nouveau schéma campaign (gmIds[] +
 * createdBy + sous-collection `members/`). Le module ne génère pas encore
 * d'inviteCode ni de settings (champs facultatifs côté rules, exigés côté
 * Zod V1 — leur génération est du périmètre 4.0.3 / 4.0.4 qui livre un
 * vrai `createCampaign`). Le proto map continue de fonctionner avec ce
 * payload minimal parce que les rules ne durcissent que la forme structurelle
 * (`gmIds is list`, `createdBy == auth.uid`, `status == 'active'`).
 *
 * Rules : `campaigns/{cid}` accepte `create` pour tout signed-in qui pose
 * `auth.uid in gmIds && createdBy == auth.uid && status == 'active'`. Voir
 * `firestore.rules` (helpers `isDMOf` + match `/campaigns/{cid}` create).
 */
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

import { getDb } from '@/shared/lib/firebase';
import { trackPendingWrite } from '@/shared/lib/track-pending-write';

/**
 * Crée le doc `campaigns/{cid}` si absent, avec l'utilisateur courant
 * comme MJ. No-op si le doc existe déjà ET que l'utilisateur est DM.
 *
 * Subtilité Firestore rules : `campaigns/{cid}` n'autorise la `read` qu'aux
 * DMs et membres (firestore.rules:156). Un signed-in qui veut juste tester
 * l'existence d'une campagne pour un cid arbitraire reçoit
 * `permission-denied` au `getDoc` — c'est attendu, ça protège le doc des
 * non-membres. Stratégie :
 *   1. On tente `getDoc` — si ça passe (snap.exists()), on est déjà DM ou
 *      membre, no-op.
 *   2. Si `permission-denied`, le doc existe peut-être mais on n'est pas
 *      autorisé, OU il n'existe pas et le get a évalué une rule qui
 *      référence un doc absent (les `get()` de rules sur un doc absent
 *      tombent comme deny par défaut). On tente alors `setDoc` create.
 *   3. Si setDoc passe, la campagne n'existait pas → on en est DM. Si
 *      setDoc échoue à son tour avec permission-denied, le doc existe avec
 *      un autre DM → on propage l'erreur (l'UI devra afficher un message
 *      « cette campagne ne vous appartient pas »).
 *
 * Retourne `true` si le doc a été créé, `false` s'il existait déjà
 * (et qu'on en est DM ou membre).
 */
export async function ensureCampaignExists(
  campaignId: string,
  uid: string,
): Promise<boolean> {
  const firestore = getDb();
  const ref = doc(firestore, 'campaigns', campaignId);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return false;
  } catch (err: unknown) {
    // `permission-denied` est attendu si l'utilisateur n'est pas DM/membre,
    // ou si la campagne n'existe pas (rules avec get() sur un doc absent
    // évaluent à deny). On enchaîne sur le create — si la campagne existe
    // déjà avec un autre DM, le setDoc échouera à son tour.
    if (!(err instanceof FirebaseError) || err.code !== 'permission-denied') {
      throw err;
    }
  }
  // Création de campagne = écriture user-initiated bloquante hors-ligne
  // (JALON 1D.3) — la bannière OfflineBanner doit refléter l'attente d'ack.
  // JALON 4.0.2 — `gmIds: [uid]` + `createdBy: uid` remplacent `dmUserId: uid`.
  // Pas de doc `members/{uid}` créé : la membership MJ est sous-entendue par
  // gmIds[] (cf. helper `isDMOf` dans firestore.rules). description/inviteCode/
  // settings sont facultatifs côté rules ; ils seront ajoutés par le vrai
  // `createCampaign` du sous-jalon 4.0.3.
  await trackPendingWrite(
    firestore,
    setDoc(ref, {
      name: campaignId,
      gmIds: [uid],
      createdBy: uid,
      status: 'active',
      schemaVersion: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  return true;
}
