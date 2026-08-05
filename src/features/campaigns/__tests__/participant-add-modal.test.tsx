import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * M2 de l'audit de malléabilité — le renfort qui arrive au round 3.
 *
 * Jusqu'ici la liste des participants était figée à la création : faire entrer
 * une créature obligeait à clôturer et refaire la rencontre, donc à perdre
 * l'initiative, les PV et les états de toute la table.
 */

const bestiary: { data: unknown[] } = { data: [] };

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'monsters'
      ? { data: bestiary.data, loading: false, error: null }
      : { data: [], loading: false, error: null },
}));

import { ParticipantAddModal } from '../participant-add-modal';

/** Fixture bestiaire — Gobelin SRD (PV moyens 7, DEX 14). */
const GOBLIN = {
  id: 'gobelin',
  name: { fr: 'Gobelin', en: 'Goblin' },
  size: 'small',
  type: 'humanoïde',
  alignment: { fr: 'Neutre mauvais', en: '' },
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

function renderModal(): { onAdd: ReturnType<typeof vi.fn>; onClose: ReturnType<typeof vi.fn> } {
  const onAdd = vi.fn();
  const onClose = vi.fn();
  render(<ParticipantAddModal open pending={false} onAdd={onAdd} onClose={onClose} />);
  return { onAdd, onClose };
}

beforeEach(() => {
  bestiary.data = [GOBLIN];
});

afterEach(() => {
  vi.clearAllMocks();
  document.body.style.overflow = '';
});

describe('<ParticipantAddModal>', () => {
  it('ajoute un combattant saisi à la main (aucune dépendance au bestiaire)', () => {
    const { onAdd, onClose } = renderModal();
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Chef gobelin' } });
    fireEvent.change(screen.getByLabelText('PV'), { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter au combat' }));

    expect(onAdd).toHaveBeenCalledWith({
      type: 'monster',
      name: 'Chef gobelin',
      maxHp: 21,
      monsterContentId: null,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('refuse un combattant sans nom, avec un message explicite', () => {
    const { onAdd } = renderModal();
    fireEvent.change(screen.getByLabelText('PV'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter au combat' }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Donne un nom à ce combattant.');
  });

  it('refuse des PV absents ou nuls', () => {
    const { onAdd } = renderModal();
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Ombre' } });
    fireEvent.change(screen.getByLabelText('PV'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter au combat' }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Indique des PV valides (au moins 1).');
  });

  it('le type PNJ est retenu tel quel', () => {
    const { onAdd } = renderModal();
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Aldric' } });
    fireEvent.change(screen.getByLabelText('PV'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'PNJ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter au combat' }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ type: 'npc', name: 'Aldric' }));
  });

  it('le bestiaire préremplit nom + PV moyens ET conserve le lien de créature', () => {
    const { onAdd } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Depuis le bestiaire' }));
    fireEvent.click(screen.getByRole('button', { name: /Gobelin/ }));

    // Identité exacte de l'entrée du bundle, pas une simple présence.
    expect(screen.getByLabelText('Nom')).toHaveValue('Gobelin');
    expect(screen.getByLabelText('PV')).toHaveValue(7);

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter au combat' }));
    expect(onAdd).toHaveBeenCalledWith({
      type: 'monster',
      name: 'Gobelin',
      maxHp: 7,
      monsterContentId: 'gobelin',
    });
  });

  it('un nom retapé décroche du bestiaire — c’est une créature à part', () => {
    const { onAdd } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Depuis le bestiaire' }));
    fireEvent.click(screen.getByRole('button', { name: /Gobelin/ }));
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Grishnak' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter au combat' }));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Grishnak', monsterContentId: null }),
    );
  });
});
