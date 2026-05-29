/**
 * Service Firestore pour `campaigns/{cid}` — minimal helper côté MJ.
 *
 * Périmètre actuel (CHANTIER D phase 2, tracer D.3) : un seul helper
 * `ensureCampaignExists` qui pose un doc campaign stub quand l'utilisateur
 * arrive sur `/map-proto/cloud/:cid` avec un cid qui n'existe pas encore.
 *
 * Pourquoi ici plutôt que dans un module S2 complet : la feature campaigns
 * n'est pas livrée (cf. `src/features/` qui ne contient pas `campaigns/`).
 * D.3 est explicitement un tracer-bullet UI MJ qui s'appuie sur Firestore
 * réel tout en restant indépendant de l'arborescence S2 à venir. Le module
 * s'étoffera proprement en S2 (selector, liste, memberships) ; pour
 * l'instant on garde une surface API minimale et nommée pour rendre la
 * frontière S1/S2 lisible.
 *
 * Rules : `campaigns/{cid}` accepte `create` pour tout utilisateur
 * signed-in qui pose `dmUserId == request.auth.uid`, c'est exactement ce
 * que fait `setDoc` ici. Voir `firestore.rules:154-162`.
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
  await trackPendingWrite(
    firestore,
    setDoc(ref, {
      name: campaignId,
      dmUserId: uid,
      status: 'active',
      schemaVersion: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  return true;
}
