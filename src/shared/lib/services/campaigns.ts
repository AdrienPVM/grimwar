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

import { getDb } from '@/shared/lib/firebase';

/**
 * Crée le doc `campaigns/{cid}` si absent, avec l'utilisateur courant
 * comme MJ. No-op si le doc existe déjà (même MJ ou autre — pas de check
 * `dmUserId === uid` ici : les rules refuseront le write si l'utilisateur
 * n'est pas le DM).
 *
 * Retourne `true` si le doc a été créé, `false` s'il existait déjà.
 */
export async function ensureCampaignExists(
  campaignId: string,
  uid: string,
): Promise<boolean> {
  const ref = doc(getDb(), 'campaigns', campaignId);
  const snap = await getDoc(ref);
  if (snap.exists()) return false;
  await setDoc(ref, {
    name: campaignId,
    dmUserId: uid,
    status: 'active',
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return true;
}
