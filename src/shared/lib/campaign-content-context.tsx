import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * Contexte de campagne pour le chargement de contenu agnostique-de-source.
 *
 * Pourquoi : le futur JALON 3 ajoutera du contenu custom par campagne
 * (`campaigns/{cid}/customContent/{type}/*` en Firestore). Le moteur de
 * création/level-up doit pouvoir charger l'union SRD + custom sans que
 * chaque call site connaisse explicitement le campaignId — sinon les 65
 * `useContent()` du wizard/sheet devraient tous absorber une signature
 * supplémentaire.
 *
 * Solution : un Context React qui expose le campaignId courant. Monté à
 * la frontière route (`/character/:id` quand un perso est lié à une
 * campagne, plus tard `/campaign/:id/...` pour le mode MJ). Les hooks
 * de contenu (`useContent`, futur `useContentResolver`) le lisent en
 * interne. En l'absence de Provider, `campaignId === null` et le
 * comportement est strictement public-seul.
 *
 * État JALON 2A.2 : Context posé, Provider exposé, hook `useCampaignContent`
 * disponible. Les call sites consommateurs sont migrés en 2A.3+. Le merge
 * réel SRD + custom est posé en stub en 2A et opérationnalisé en JALON 3
 * (cf. plans/2A-AGNOSTIC-SOURCE-INVENTORY.md).
 */

export interface CampaignContentContextValue {
  /**
   * Identifiant de la campagne courante, ou `null` si aucun contexte de
   * campagne actif (création hors campagne, library, settings). Lu par les
   * hooks de chargement pour décider du merge SRD + custom.
   */
  campaignId: string | null;
}

const CampaignContentContext = createContext<CampaignContentContextValue>({
  campaignId: null,
});

interface CampaignContentProviderProps {
  campaignId: string | null;
  children: ReactNode;
}

/**
 * Provider à monter à la frontière d'une route liée à une campagne. Le
 * `useMemo` garantit qu'un re-render parent avec le même `campaignId` ne
 * propage pas un re-render à tous les consommateurs.
 */
export function CampaignContentProvider({
  campaignId,
  children,
}: CampaignContentProviderProps): JSX.Element {
  const value = useMemo<CampaignContentContextValue>(
    () => ({ campaignId }),
    [campaignId],
  );
  return (
    <CampaignContentContext.Provider value={value}>
      {children}
    </CampaignContentContext.Provider>
  );
}

/**
 * Hook pour lire le contexte de campagne courant. Retourne `{ campaignId:
 * null }` quand aucun Provider n'est monté — comportement attendu hors
 * route campagne (library, settings, création hors campagne).
 */
export function useCampaignContent(): CampaignContentContextValue {
  return useContext(CampaignContentContext);
}
