import { Card, CardHeader } from '@/shared/components/card';
import { t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

interface PartyStripProps {
  character: Character;
}

/**
 * Aperçu compagnons. On lit `homeCampaignId` (posé au LINK d'une fiche à une
 * campagne, cf. linkCharacterToMembership) — PAS `presentInCampaigns`, qui n'est
 * jamais renseigné (champ réservé, toujours `[]`) et affichait donc à tort
 * « aucune campagne » même pour une fiche liée. Tant qu'aucune campagne n'est
 * liée → placeholder « aucune campagne » ; une fois liée → placeholder « aperçu
 * bientôt » (la carte compagnons riche — avatar, PV, rôle — reste différée).
 */
export function PartyStrip({ character }: PartyStripProps): JSX.Element {
  const hasCampaign = character.homeCampaignId != null;
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
