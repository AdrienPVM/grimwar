import type { JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';

interface OrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Catégorie d'Ordre rendue en tête de modale (titre). Ex. « Ordre divin »
   * pour le Clerc, « Ordre primordial » pour le Druide. Sert d'aria-label
   * via `aria-labelledby`.
   */
  kindLabel: string;
  /** Nom FR localisé déjà résolu depuis le bundle classes.json. */
  name: string;
  /** Summary FR localisé déjà résolu depuis le bundle classes.json. */
  summary: string;
}

/**
 * Modale détail générique pour les Ordres de classe (Divine Order Clerc,
 * Primal Order Druide). Composant volontairement « bête » : il rend ce qu'on
 * lui donne, sans aller relire le bundle. La résolution slug → name + summary
 * vit dans les cartes parentes (`<DivineOrderCard>` / `<PrimalOrderCard>`),
 * ce qui garde le contenu testable via identité contre `classes.json` à un
 * seul endroit.
 *
 * Plan 13.9 commit 4c — décision Adrien : un tap = un détail. Cohérence
 * d'interaction avec les sorts (modale sort) et les maîtrises d'armes (modale
 * d'attaque équipée), au lieu de laisser les cartes Ordre comme un texte
 * fixe.
 */
export function OrderDetailModal({
  open,
  onClose,
  kindLabel,
  name,
  summary,
}: OrderDetailModalProps): JSX.Element | null {
  const titleId = 'order-detail-title';
  return (
    <DetailModal open={open} onClose={onClose} titleId={titleId} closeLabel="Fermer">
      <header className="border-b border-white-8 px-6 py-4 pr-14">
        <p
          id={titleId}
          className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-tertiary"
        >
          {kindLabel}
        </p>
        <h2 className="mt-1 font-display text-[20px] font-black tracking-[-0.02em] text-gold-bright">
          {name}
        </h2>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <p className="font-serif text-body text-text-secondary">{summary}</p>
      </div>
    </DetailModal>
  );
}
