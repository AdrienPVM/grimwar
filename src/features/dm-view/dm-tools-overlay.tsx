import { useId, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { t } from '@/shared/lib/i18n';

import { QuickNotes } from './quick-notes';
import { SecretRollButton } from './secret-roll-button';

/**
 * Les outils du meneur en superposition — E12 de l'audit UX (défaut D-9,
 * scénario M8).
 *
 * Jet secret et bloc-notes n'existaient qu'en BAS du détail de campagne. En
 * séance ou en plein combat, les atteindre demandait de quitter l'écran de jeu,
 * de faire défiler un écran long, puis de refaire le chemin en sens inverse —
 * pour un geste qu'un meneur pose plusieurs fois par heure.
 *
 * POURQUOI une superposition et non une duplication de la section : le
 * bloc-notes est cloisonné par campagne (`scopeKey`), donc c'est le MÊME
 * bloc-notes des trois côtés. Le dupliquer en dur inviterait la divergence ;
 * l'ouvrir par-dessus l'écran de jeu préserve la position de défilement du
 * tracker, exactement comme la superposition du Codex livrée en E6.
 *
 * MJ-only par construction : l'appelant ne monte le déclencheur que si `isGm`.
 * Le jet secret ne doit jamais fuiter aux joueurs.
 */
export function DmToolsOverlay({
  open,
  onClose,
  campaignId,
}: {
  open: boolean;
  onClose: () => void;
  /** Cloisonne le bloc-notes — même clé que le détail de campagne. */
  campaignId: string;
}): JSX.Element {
  const titleId = useId();

  return (
    <DetailModal open={open} onClose={onClose} titleId={titleId} size="lg">
      <div className="px-4 py-4 sm:px-6">
        <header className="pr-14">
          <h2
            id={titleId}
            className="font-display text-[20px] font-black uppercase tracking-[0.18em] text-gold-bright"
          >
            {t('campaigns.detail.dmTools.title')}
          </h2>
        </header>

        <div className="mt-4 flex flex-col gap-6">
          <SecretRollButton />
          <QuickNotes scopeKey={campaignId} />
        </div>
      </div>
    </DetailModal>
  );
}
