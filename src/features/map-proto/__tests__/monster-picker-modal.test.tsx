import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Monster } from '@/shared/types/content';

import { MonsterPickerModal } from '../monster-picker-modal';

/**
 * Sélecteur de bestiaire pour l'autofill carte. Tests : tri par FP, filtre par
 * nom, sélection au tap (onPick avec le BON monstre), état vide explicite.
 */

const GOBLIN: Monster = {
  id: 'gobelin',
  name: { fr: 'Gobelin', en: 'Goblin' },
  size: 'small',
  type: 'humanoïde',
  alignment: { fr: 'Neutre mauvais', en: 'Neutral Evil' },
  ac: 15,
  acDetail: null,
  hp: { avg: 7, formula: '2d6' },
  speed: { walk: 30 },
  abilities: { for: 8, dex: 14, con: 10, int: 10, sag: 8, cha: 8 },
  saves: {},
  skills: {},
  resistances: [],
  immunities: [],
  vulnerabilities: [],
  conditionImmunities: [],
  senses: { darkvision: 60, passivePerception: 9 },
  languages: [],
  cr: 0.25,
  xp: 50,
  traits: [],
  actions: [],
  reactions: null,
  legendaryActions: null,
  source: 'srd-5.2.1',
};

const DRAGON: Monster = {
  ...GOBLIN,
  id: 'dragon-rouge',
  name: { fr: 'Dragon rouge', en: 'Red Dragon' },
  size: 'huge',
  cr: 17,
};

const contentState: { data: Monster[]; loading: boolean } = {
  data: [DRAGON, GOBLIN],
  loading: false,
};

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'monsters'
      ? { data: contentState.data, loading: contentState.loading, error: null }
      : { data: [], loading: false, error: null },
}));

function reset(data: Monster[], loading = false): void {
  contentState.data = data;
  contentState.loading = loading;
}

describe('MonsterPickerModal', () => {
  it('ne rend rien quand open=false', () => {
    reset([GOBLIN]);
    render(<MonsterPickerModal open={false} onClose={vi.fn()} onPick={vi.fn()} />);
    expect(screen.queryByText('Ajouter depuis le bestiaire')).not.toBeInTheDocument();
  });

  it('liste les monstres triés par FP croissant (Gobelin avant Dragon)', () => {
    reset([DRAGON, GOBLIN]);
    render(<MonsterPickerModal open onClose={vi.fn()} onPick={vi.fn()} />);
    const items = screen.getAllByRole('button', { name: /Gobelin|Dragon rouge/ });
    expect(items[0]).toHaveTextContent('Gobelin');
    expect(items[1]).toHaveTextContent('Dragon rouge');
  });

  it('filtre par nom', () => {
    reset([DRAGON, GOBLIN]);
    render(<MonsterPickerModal open onClose={vi.fn()} onPick={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Rechercher un monstre'), {
      target: { value: 'dragon' },
    });
    expect(screen.queryByText('Gobelin')).not.toBeInTheDocument();
    expect(screen.getByText('Dragon rouge')).toBeInTheDocument();
  });

  it('appelle onPick avec le monstre choisi au tap', () => {
    reset([GOBLIN, DRAGON]);
    const onPick = vi.fn();
    render(<MonsterPickerModal open onClose={vi.fn()} onPick={onPick} />);
    fireEvent.click(screen.getByTestId('monster-pick-dragon-rouge'));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0]![0]).toMatchObject({ id: 'dragon-rouge' });
  });

  it('état vide : oriente vers l’import de pack quand le bestiaire est vide', () => {
    reset([]);
    render(<MonsterPickerModal open onClose={vi.fn()} onPick={vi.fn()} />);
    expect(screen.getByText('Votre bestiaire est vide.')).toBeInTheDocument();
    expect(screen.getByText(/Mon compte/)).toBeInTheDocument();
  });
});
