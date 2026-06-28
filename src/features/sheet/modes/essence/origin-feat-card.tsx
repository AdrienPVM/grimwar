import { useMemo, useState } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { Tooltip } from '@/shared/components/tooltip';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { OrderDetailModal } from './order-detail-modal';

interface OriginFeatCardProps {
  character: Character;
}

/**
 * Carte « Don d'origines » du mode Essence.
 *
 * En 5.2.1, chaque historique octroie un don d'origines (Origin Feat). La fiche
 * ne le surfaçait nulle part : un Acolyte « reçoit Initié à la magie (Clerc) »
 * sans qu'aucun écran ne le montre au joueur. La carte résout le don depuis
 * `backgrounds.json[backgroundId].feature` (JAMAIS de constante in-file) et
 * affiche son nom + description. Tap = détail (cohérence « un tap = un détail »,
 * cf. DivineOrderCard).
 *
 * Le nom affiché est `feature.name.fr` du bundle (ex. « Don : Initié à la magie
 * (Clerc) ») ; le TITRE de la carte est le terme de catégorie officiel du SRD FR
 * « Don d'origines » (FR_SRD_CC_v5.2.1.txt, titres de section l. 9500/9506/9534).
 *
 * Note de périmètre : la carte montre QUEL don l'historique octroie, pas ses
 * effets joués. Les sorts d'« Initié à la magie » (2 sorts mineurs + 1 sort
 * niv.1 à choisir) relèvent du chooser plan 14 — hors scope ici.
 *
 * Disparaît (null) si l'historique n'est pas résolu ou ne porte pas de don.
 */
export function OriginFeatCard({ character }: OriginFeatCardProps): JSX.Element | null {
  const { data: backgrounds } = useContent('backgrounds');
  const [open, setOpen] = useState<boolean>(false);

  const feature = useMemo(() => {
    const background = backgrounds.find((b) => b.id === character.backgroundId);
    return background?.feature ?? null;
  }, [backgrounds, character.backgroundId]);

  if (!feature) return null;

  const name = localize(feature.name);
  const description = localize(feature.description);
  const ariaLabel = t('sheet.essence.originFeat.openLabel').replace('{name}', name);

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.essence.originFeat.title')}</h3>
      </CardHeader>
      <Tooltip label={t('sheet.tip.openDetail')} decorative className="w-full">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          className="flex w-full flex-col gap-2 rounded-card-sm border border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.06] to-gold/[0.02] p-4 text-left transition-all duration-200 ease-base hover:-translate-y-px hover:border-gold-dim/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/40"
        >
          <span className="font-display text-[16px] text-gold-bright">{name}</span>
          <p className="font-serif text-[13px] text-text-secondary">{description}</p>
        </button>
      </Tooltip>
      <OrderDetailModal
        open={open}
        onClose={() => setOpen(false)}
        kindLabel={t('sheet.essence.originFeat.title')}
        name={name}
        summary={description}
      />
    </Card>
  );
}
