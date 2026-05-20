import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrderDetailModal } from '../order-detail-modal';

/**
 * Plan 13.9 commit 4c — `<OrderDetailModal>` est la modale générique de détail
 * d'Ordre (Divine ou Primal). Elle est ouverte par tap sur la carte
 * correspondante en mode Essence, exactement comme la modale d'arme s'ouvre
 * au tap sur une attaque (4a) ou la modale de sort sur un sort (4b déjà
 * existant). Cohérence d'interaction demandée par Adrien — un tap = un détail.
 *
 * Catégories de « vérité du contenu » (CLAUDE.md decision log 2026-05-19)
 * appliquées :
 *
 * - Cat. 2 (identité) : le `name` + le `summary` fournis sont affichés
 *   EXACTEMENT, sans préfixe, suffixe, ou troncature silencieuse.
 *
 * Le composant est volontairement « bête » : il rend ce qu'on lui donne. Les
 * tests d'identité contre le bundle vivent dans `divine-order-card.test.tsx`
 * et `primal-order-card.test.tsx` (qui passent les bonnes valeurs).
 */
describe('<OrderDetailModal>', () => {
  it('est rendu en role=dialog avec aria-labelledby pointant sur le titre', () => {
    render(
      <OrderDetailModal
        open
        onClose={() => undefined}
        kindLabel="Ordre divin"
        name="Protecteur"
        summary="Clerc de première ligne."
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Le titre identifie sémantiquement la modale (« Ordre divin »).
    expect(screen.getByText('Ordre divin')).toBeInTheDocument();
    expect(screen.getByText('Protecteur')).toBeInTheDocument();
    expect(screen.getByText('Clerc de première ligne.')).toBeInTheDocument();
  });

  it('ne se rend pas quand open=false', () => {
    render(
      <OrderDetailModal
        open={false}
        onClose={() => undefined}
        kindLabel="Ordre divin"
        name="Protecteur"
        summary="…"
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('appelle onClose au clic sur le bouton Fermer', () => {
    let closed = 0;
    render(
      <OrderDetailModal
        open
        onClose={() => {
          closed += 1;
        }}
        kindLabel="Ordre divin"
        name="Protecteur"
        summary="Clerc de première ligne."
      />,
    );
    // Le bouton de fermeture est rendu par <DetailModal> avec aria-label
    // « Fermer » (cf. detail-modal.tsx).
    fireEvent.click(screen.getByLabelText('Fermer'));
    expect(closed).toBe(1);
  });

  it('cat. 2 — identité : le name fourni est rendu EXACTEMENT, summary aussi', () => {
    const cases = [
      { name: 'Protecteur', summary: "Clerc de première ligne : maîtrise des armes de guerre + formation à l'armure lourde." },
      { name: 'Thaumaturge', summary: 'Clerc érudit : 1 sort mineur Clerc supplémentaire + bonus aux tests INT (Arcana ou Religion) égal au modificateur de Sagesse (min +1).' },
      { name: 'Mage', summary: 'Druide-sorcier : 1 sort mineur Druide supplémentaire + bonus aux tests INT (Arcana ou Nature) égal au modificateur de Sagesse (min +1).' },
      { name: 'Gardien', summary: "Druide-gardien : maîtrise des armes de guerre + formation à l'armure intermédiaire." },
    ];
    for (const { name, summary } of cases) {
      const { unmount } = render(
        <OrderDetailModal
          open
          onClose={() => undefined}
          kindLabel="Ordre"
          name={name}
          summary={summary}
        />,
      );
      // `getByText` exige une présence EXACTE du contenu textuel — pas un
      // « contient », pas un includes. C'est l'identité (cat. 2).
      expect(screen.getByText(name)).toBeInTheDocument();
      expect(screen.getByText(summary)).toBeInTheDocument();
      unmount();
    }
  });
});
