import { Card, CardHeader } from '@/shared/components/card';
import { t } from '@/shared/lib/i18n';
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
        <h3>{t('sheet.combat.party.cardTitle')}</h3>
      </CardHeader>
      {hasCampaign ? (
        <p className="font-serif text-body-sm italic text-text-tertiary">
          {t('sheet.combat.party.comingSoon')}
        </p>
      ) : (
        <p className="font-serif text-body-sm italic text-text-tertiary">
          {t('sheet.combat.party.noCampaign')}
        </p>
      )}
    </Card>
  );
}
