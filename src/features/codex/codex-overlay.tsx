import { useId, type JSX } from 'react';

import { DetailModal } from '@/shared/components/detail-modal';
import { t } from '@/shared/lib/i18n';

import { CodexBrowser } from './codex-browser';
import type { CodexCategoryId } from './codex-categories';

/**
 * Le Codex en superposition — réponse à E6 de l'audit UX (scénarios J9 et M6).
 *
 * Le Codex n'avait qu'un point d'entrée, le hub de l'accueil. Chercher la règle
 * d'un état en plein combat coûtait 4 à 5 gestes depuis la fiche, et autant
 * depuis la rencontre : il fallait QUITTER l'écran de jeu pour consulter, puis
 * refaire le chemin en sens inverse.
 *
 * POURQUOI une superposition et non une navigation vers `/codex` : on consulte
 * une règle SANS quitter ce qu'on est en train de faire. Naviguer perdrait la
 * position de défilement du tracker, et le bouton Retour du Codex ramènerait à
 * la bibliothèque (`parentRouteFor` le classe au premier niveau) — pas au
 * combat qu'on vient de quitter.
 *
 * Le corps est le MÊME que celui de la page (`CodexBrowser`) : une seule
 * implémentation des 10 navigateurs, deux présentations.
 *
 * Les navigateurs ouvrent leur propre modale de détail PAR-DESSUS celle-ci —
 * d'où le garde « modale du dessus » de `detail-modal.tsx`, sans lequel Échap
 * refermait le Codex en même temps que le détail consulté.
 */

interface CodexOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Catégorie ouverte à l'arrivée (cf. `CodexBrowser`). */
  initialCategory?: CodexCategoryId;
}

export function CodexOverlay({
  open,
  onClose,
  initialCategory,
}: CodexOverlayProps): JSX.Element | null {
  const titleId = useId();

  return (
    <DetailModal
      open={open}
      onClose={onClose}
      titleId={titleId}
      size="xl"
      closeLabel={t('codex.overlay.close')}
    >
      <div className="px-4 py-4 sm:px-6">
        <header className="pr-14">
          <h2
            id={titleId}
            className="font-display text-[20px] font-black uppercase tracking-[0.18em] text-gold-bright"
          >
            {t('codex.title')}
          </h2>
          <p className="mt-1 font-serif text-body-sm italic text-text-tertiary">
            {t('codex.overlay.subtitle')}
          </p>
        </header>

        <div className="mt-4">
          {/* Remonté à chaque ouverture : la recherche et la catégorie
              repartent à zéro plutôt que de rouvrir sur la question d'avant. */}
          {open ? <CodexBrowser initialCategory={initialCategory} /> : null}
        </div>
      </div>
    </DetailModal>
  );
}
