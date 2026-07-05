/**
 * Orchestration post-création d'un personnage au wizard.
 *
 * Séparé de `RecapStep` pour être testable sans monter tout le wizard : c'est
 * la logique « où va-t-on après la création » qui porte les cas mécaniques
 * intéressants (création simple vs création « en campagne » avec liaison
 * automatique, et repli si la liaison échoue).
 *
 * Cas :
 *  - Pas de `campaignId` (création normale depuis la bibliothèque) → on ouvre la
 *    fiche fraîche.
 *  - `campaignId` présent (wizard ouvert depuis « Mon personnage » avec
 *    `?campaignId=`) → on lie la fiche à la membership du joueur et on renvoie
 *    sur la campagne.
 *  - `campaignId` présent mais la liaison échoue (membership absente, réseau) →
 *    la fiche EST créée ; on l'ouvre quand même pour ne pas la perdre. Le joueur
 *    pourra la lier à la main depuis « Mon personnage ».
 */
export interface FinishCreationParams {
  characterId: string;
  uid: string;
  campaignId: string | null;
  /** Injecté (= `linkCharacterToMembership`) pour rester testable. */
  link: (campaignId: string, uid: string, characterId: string) => Promise<void>;
  navigate: (to: string) => void;
}

export async function finishCharacterCreation({
  characterId,
  uid,
  campaignId,
  link,
  navigate,
}: FinishCreationParams): Promise<void> {
  if (campaignId) {
    try {
      await link(campaignId, uid, characterId);
      navigate(`/campaigns/${campaignId}`);
      return;
    } catch {
      navigate(`/character/${characterId}`);
      return;
    }
  }
  navigate(`/character/${characterId}`);
}
