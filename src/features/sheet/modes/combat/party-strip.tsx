import { Card, CardHeader } from '@/shared/components/card';
import type { Character } from '@/shared/types/character';

interface PartyStripProps {
  character: Character;
}

/**
 * Aperçu compagnons. S1 ne supporte pas encore les campagnes, donc tant que
 * `presentInCampaigns` est vide on affiche un placeholder explicite. La forme
 * S2-ready (avatar, HP bar, rôle) est livrée en plan 16 — on garde le shell de
 * carte pour que le layout Combat soit déjà calibré.
 */
export function PartyStrip({ character }: PartyStripProps): JSX.Element {
  const hasCampaign = character.presentInCampaigns.length > 0;
  return (
    <Card>
      <CardHeader>
        <h3>Compagnons</h3>
      </CardHeader>
      {hasCampaign ? (
        <p className="font-serif text-body-sm italic text-text-tertiary">
          Liste des compagnons disponible quand la synchronisation de campagne arrivera (plan 16).
        </p>
      ) : (
        <p className="font-serif text-body-sm italic text-text-tertiary">
          Aucune campagne rejointe. Rejoins ou crée une campagne pour voir tes compagnons.
        </p>
      )}
    </Card>
  );
}
