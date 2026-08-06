import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ContentEntryScope } from '@/shared/hooks/use-content';
import type { Feat } from '@/shared/types/content';

const feats: Feat[] = [
  {
    id: 'alerte',
    name: { fr: 'Alerte', en: 'Alert' },
    prerequisite: null,
    summary: { fr: 'Toujours prêt.', en: 'Always ready.' },
    description: { fr: 'Toujours prêt.', en: 'Always ready.' },
    category: 'origin',
    source: 'srd-5.2.1',
  } as unknown as Feat,
  {
    id: 'don-maison',
    name: { fr: 'Souffle du dragon', en: 'Dragon breath' },
    prerequisite: null,
    summary: { fr: 'Un cadeau.', en: 'A gift.' },
    description: { fr: 'Un cadeau.', en: 'A gift.' },
    category: 'general',
    source: 'custom',
  } as unknown as Feat,
];

const scopes: Record<string, ContentEntryScope> = {
  alerte: { scope: 'public' },
  'don-maison': { scope: 'user', scopeId: 'u-1', originLabel: 'Xanathar' },
};

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: () => ({
    data: feats,
    loading: false,
    error: null,
    scopeOf: (id: string): ContentEntryScope => scopes[id] ?? { scope: 'public' },
  }),
}));

import { CataloguePickerModal } from '../catalogue-picker-modal';

/**
 * M50 — le point d'entrée « partir d'une entrée existante ». Rouge avant vert :
 * le composant n'existait pas, l'éditeur ne savait démarrer que d'une page
 * blanche ou d'une entrée déjà dans le pack.
 */
describe('<CataloguePickerModal>', () => {
  it('liste le catalogue fusionné et étiquette la provenance des entrées maison', () => {
    render(
      <CataloguePickerModal type="feats" onPick={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByTestId('catalogue-pick-alerte')).toBeInTheDocument();
    const custom = screen.getByTestId('catalogue-pick-don-maison');
    expect(custom).toHaveTextContent('Xanathar');
    // L'entrée SRD est la base : elle ne s'annonce pas.
    expect(screen.getByTestId('catalogue-pick-alerte')).not.toHaveTextContent(
      'Xanathar',
    );
  });

  it('rend l’entité choisie avec le mode « copie » par défaut', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(
      <CataloguePickerModal type="feats" onPick={onPick} onClose={vi.fn()} />,
    );

    await user.click(screen.getByTestId('catalogue-pick-alerte'));

    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'alerte' }),
      'copy',
    );
  });

  it('le mode « remplacer » doit être choisi explicitement', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(
      <CataloguePickerModal type="feats" onPick={onPick} onClose={vi.fn()} />,
    );

    await user.click(screen.getByTestId('catalogue-picker-mode-replace'));
    await user.click(screen.getByTestId('catalogue-pick-alerte'));

    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'alerte' }),
      'replace',
    );
  });

  it('filtre par nom, accents ignorés', async () => {
    const user = userEvent.setup();
    render(
      <CataloguePickerModal type="feats" onPick={vi.fn()} onClose={vi.fn()} />,
    );

    await user.type(
      screen.getByRole('searchbox', { name: /dupliquer/i }),
      'souffle',
    );

    expect(screen.queryByTestId('catalogue-pick-alerte')).not.toBeInTheDocument();
    expect(screen.getByTestId('catalogue-pick-don-maison')).toBeInTheDocument();
  });
});
