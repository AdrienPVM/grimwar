import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Condition, Monster } from '@/shared/types/content';
import type { EncounterParticipant } from '@/shared/types/encounter';

import { ParticipantControlModal } from '../participant-control-modal';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function mkParticipant(over: Partial<EncounterParticipant> = {}): EncounterParticipant {
  return {
    type: 'monster',
    characterId: null,
    monsterContentId: null,
    instanceId: 'm1',
    name: 'Gobelin 1',
    initiative: 12,
    currentHp: 7,
    maxHp: 7,
    tempHp: 0,
    conditions: [],
    position: null,
    notes: '',
    ...over,
  };
}

const CONDITIONS: Condition[] = [
  {
    id: 'prone',
    name: { fr: 'À terre', en: 'Prone' },
    description: { fr: '…', en: '…' },
    source: 'srd-5.2.1',
  },
  {
    id: 'poisoned',
    name: { fr: 'Empoisonné', en: 'Poisoned' },
    description: { fr: '…', en: '…' },
    source: 'srd-5.2.1',
  },
];

const GOBLIN: Monster = {
  id: 'gobelin',
  name: { fr: 'Gobelin', en: 'Goblin' },
  size: 'small',
  type: 'humanoïde',
  alignment: { fr: 'Neutre mauvais', en: 'Neutral Evil' },
  ac: 15,
  acDetail: { fr: 'armure de cuir, bouclier', en: 'leather, shield' },
  hp: { avg: 7, formula: '2d6' },
  speed: { walk: 30 },
  abilities: { for: 8, dex: 14, con: 10, int: 10, sag: 8, cha: 8 },
  saves: {},
  skills: { stealth: 6 },
  resistances: [],
  immunities: [],
  vulnerabilities: [],
  conditionImmunities: [],
  senses: { darkvision: 60, passivePerception: 9 },
  languages: ['commun', 'gobelin'],
  cr: 0.25,
  xp: 50,
  traits: [
    {
      name: { fr: 'Fuite agile', en: 'Nimble Escape' },
      description: { fr: 'Se désengage ou se cache en action bonus.', en: '' },
    },
  ],
  actions: [
    {
      name: { fr: 'Cimeterre', en: 'Scimitar' },
      description: { fr: 'Mêlée +4, 1d6+2 tranchant.', en: '' },
    },
  ],
  reactions: null,
  legendaryActions: null,
  source: 'srd-5.2.1',
};

function renderModal(
  over: {
    participant?: Partial<EncounterParticipant>;
    monster?: Monster | null;
    pending?: boolean;
    onApplyHp?: (delta: number) => void;
    onGrantTempHp?: (amount: number) => void;
    onToggleCondition?: (condition: string, action: 'add' | 'remove') => void;
    onSaveNote?: (note: string) => void;
    onClose?: () => void;
  } = {},
): {
  onApplyHp: ReturnType<typeof vi.fn>;
  onGrantTempHp: ReturnType<typeof vi.fn>;
  onToggleCondition: ReturnType<typeof vi.fn>;
  onSaveNote: ReturnType<typeof vi.fn>;
  onClose: ReturnType<typeof vi.fn>;
} {
  const onApplyHp = vi.fn(over.onApplyHp);
  const onGrantTempHp = vi.fn(over.onGrantTempHp);
  const onToggleCondition = vi.fn(over.onToggleCondition);
  const onSaveNote = vi.fn(over.onSaveNote);
  const onClose = vi.fn(over.onClose);
  render(
    <ParticipantControlModal
      participant={mkParticipant(over.participant)}
      conditions={CONDITIONS}
      monster={over.monster ?? null}
      pending={over.pending ?? false}
      onApplyHp={onApplyHp}
      onGrantTempHp={onGrantTempHp}
      onToggleCondition={onToggleCondition}
      onSaveNote={onSaveNote}
      onClose={onClose}
    />,
  );
  return { onApplyHp, onGrantTempHp, onToggleCondition, onSaveNote, onClose };
}

afterEach(() => {
  document.body.style.overflow = '';
});

// ─────────────────────────────────────────────────────────────────────
// Suites
// ─────────────────────────────────────────────────────────────────────

describe('<ParticipantControlModal>', () => {
  it('affiche le nom + les PV courants/max', () => {
    renderModal({ participant: { name: 'Gobelin 1', currentHp: 4, maxHp: 7 } });
    expect(screen.getByRole('heading', { name: 'Gobelin 1' })).toBeInTheDocument();
    expect(screen.getByText('4/7')).toBeInTheDocument();
  });

  it('« Dégâts » applique le montant saisi en NÉGATIF', () => {
    const { onApplyHp } = renderModal();
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /Dégâts/ }));
    expect(onApplyHp).toHaveBeenCalledWith(-3);
  });

  it('« Soin » applique le montant saisi en POSITIF', () => {
    const { onApplyHp } = renderModal();
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /Soin/ }));
    expect(onApplyHp).toHaveBeenCalledWith(4);
  });

  it('les boutons rapides appliquent ±montant en un tap', () => {
    const { onApplyHp } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: '−5' }));
    expect(onApplyHp).toHaveBeenCalledWith(-5);
    fireEvent.click(screen.getByRole('button', { name: '+5' }));
    expect(onApplyHp).toHaveBeenCalledWith(5);
  });

  it('Dégâts/Soin désactivés tant que le montant est ≤ 0', () => {
    const { onApplyHp } = renderModal();
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: /Dégâts/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Soin/ }));
    expect(onApplyHp).not.toHaveBeenCalled();
  });

  it('un état inactif → toggle add ; un état actif → toggle remove + aria-pressed', () => {
    const { onToggleCondition } = renderModal({ participant: { conditions: ['poisoned'] } });
    // « À terre » inactif → add.
    fireEvent.click(screen.getByRole('button', { name: 'À terre', pressed: false }));
    expect(onToggleCondition).toHaveBeenCalledWith('prone', 'add');
    // « Empoisonné » actif (aria-pressed) → remove.
    const active = screen.getByRole('button', { name: 'Empoisonné', pressed: true });
    fireEvent.click(active);
    expect(onToggleCondition).toHaveBeenCalledWith('poisoned', 'remove');
  });

  // ─── M6 — PV temporaires accordables ───────────────────────────────────
  it('« + PV temp. » accorde le montant saisi', () => {
    const { onGrantTempHp, onApplyHp } = renderModal();
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: /PV temp/ }));
    expect(onGrantTempHp).toHaveBeenCalledWith(8);
    // Les PV RÉELS ne bougent pas : ce n'est pas un soin.
    expect(onApplyHp).not.toHaveBeenCalled();
  });

  it('affiche les PV temporaires actifs à côté des PV réels', () => {
    renderModal({ participant: { currentHp: 4, maxHp: 7, tempHp: 5 } });
    // Le bouclier se lit SUR la ligne de PV — pas ailleurs dans la modale
    // (« +5 » existe aussi comme palier de soin rapide).
    expect(
      screen.getByText((_, el) => el?.tagName === 'SPAN' && el.textContent === '4/7+5'),
    ).toBeInTheDocument();
  });

  // ─── M6 — note libre du combattant ─────────────────────────────────────
  it('la note se saisit et s’enregistre', () => {
    const { onSaveNote } = renderModal();
    fireEvent.change(screen.getByLabelText('Note du combattant'), {
      target: { value: 'Celui-ci porte la clé.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
    expect(onSaveNote).toHaveBeenCalledWith('Celui-ci porte la clé.');
  });

  it('« Enregistrer la note » reste désactivé tant que rien n’a changé', () => {
    renderModal({ participant: { notes: 'Déjà écrit' } });
    expect(screen.getByRole('button', { name: 'Enregistrer la note' })).toBeDisabled();
  });

  // ─── M8 — états maison ─────────────────────────────────────────────────
  it('pose un état maison, libellé préservé verbatim (accents et casse)', () => {
    const { onToggleCondition } = renderModal();
    fireEvent.change(screen.getByLabelText('Autre état'), {
      target: { value: 'Marqué par le Chasseur' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Poser' }));
    expect(onToggleCondition).toHaveBeenCalledWith('custom:Marqué par le Chasseur', 'add');
  });

  it('un état maison déjà posé s’affiche en clair et se retire d’un tap', () => {
    const { onToggleCondition } = renderModal({
      participant: { conditions: ['custom:Corrompu'] },
    });
    const chip = screen.getByRole('button', { name: 'Corrompu', pressed: true });
    fireEvent.click(chip);
    expect(onToggleCondition).toHaveBeenCalledWith('custom:Corrompu', 'remove');
  });

  it('« Poser » reste désactivé sur une saisie vide', () => {
    const { onToggleCondition } = renderModal();
    expect(screen.getByRole('button', { name: 'Poser' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Autre état'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Poser' })).toBeDisabled();
    expect(onToggleCondition).not.toHaveBeenCalled();
  });

  // ─── M37 — paliers rapides à l'échelle de la créature ───────────────────
  it('un dragon à 250 PV propose des paliers utiles, pas −1/−5/−10', () => {
    renderModal({ participant: { name: 'Dragon', currentHp: 250, maxHp: 250 } });
    expect(screen.getByRole('button', { name: '−80' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '−1' })).not.toBeInTheDocument();
  });

  it('pending désactive tous les contrôles', () => {
    renderModal({ pending: true });
    expect(screen.getByRole('button', { name: '−5' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'À terre' })).toBeDisabled();
  });

  // ─── Fiche de créature liée (monsterContentId → bestiaire) ──────────────
  it('sans `monster` : pas de bouton « Voir la fiche de créature »', () => {
    renderModal({ monster: null });
    expect(
      screen.queryByRole('button', { name: 'Voir la fiche de créature' }),
    ).not.toBeInTheDocument();
  });

  it('avec `monster` : le bouton ouvre la fiche (identité exacte du bloc de stats)', () => {
    // Participant nommé différemment du monstre lié pour lever l'ambiguïté du titre.
    renderModal({ participant: { name: 'Gobelin 2' }, monster: GOBLIN });
    // La fiche est fermée par défaut : son contenu n'est pas dans le DOM.
    expect(screen.queryByText('Petite · humanoïde · FP 1/4')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Voir la fiche de créature' }));

    // Bloc de stats ouvert : eyebrow + CA + PV + trait/action EXACTS (pas présence).
    const dialogs = screen.getAllByRole('dialog');
    const statDialog = dialogs[dialogs.length - 1];
    if (!statDialog) throw new Error('La fiche de créature (dialog) est absente du DOM.');
    expect(within(statDialog).getByText('Petite · humanoïde · FP 1/4')).toBeInTheDocument();
    expect(within(statDialog).getByText(/15/)).toBeInTheDocument();
    expect(within(statDialog).getByText(/7 \(2d6\)/)).toBeInTheDocument();
    expect(within(statDialog).getByText(/Fuite agile/)).toBeInTheDocument();
    expect(within(statDialog).getByText(/Cimeterre/)).toBeInTheDocument();
  });
});
