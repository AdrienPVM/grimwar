import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { ExperienceCard } from '../experience-card';

/**
 * M45 — la carte d'expérience.
 *
 * `character.experience` était écrit à 0 à la création puis jamais relu ni
 * réécrit : jouer à l'XP était impossible. Ce qui compte ici n'est pas « la
 * carte s'affiche » mais **ce qui part à l'écriture** et **ce qui est
 * journalisé** — et surtout que la divergence entre le niveau déduit de l'XP et
 * le niveau de la fiche INFORME sans jamais bloquer.
 */

const { updateCharacterMock, showToastMock, logXpGainMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
  showToastMock: vi.fn(),
  logXpGainMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
    error: null,
  }),
}));

vi.mock('@/shared/lib/slices/toast-slice', () => ({ showToast: showToastMock }));

vi.mock('@/shared/lib/event-logger', () => ({
  logXpGain: (...args: unknown[]) => logXpGainMock(...args),
}));

beforeEach(() => {
  updateCharacterMock.mockClear();
  showToastMock.mockClear();
  logXpGainMock.mockClear();
});

function buildCharacter(experience: number, totalLevel: number): Character {
  return {
    id: 'xp-1',
    name: 'Astrid',
    experience,
    totalLevel,
  } as unknown as Character;
}

/** Passe la carte en édition et saisit une nouvelle valeur, validée par Entrée. */
async function setXp(value: string): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Modifier les points d’expérience' }));
  const input = screen.getByRole('spinbutton');
  await user.clear(input);
  await user.type(input, `${value}{Enter}`);
}

describe('<ExperienceCard>', () => {
  it('écrit le nouveau total et journalise le delta', async () => {
    render(<ExperienceCard character={buildCharacter(2700, 4)} readOnly={false} />);
    await setXp('3150');

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).toHaveBeenCalledWith({ experience: 3150 });
    // 450 PX de fin de séance : le delta, pas le total, est ce qui se raconte.
    expect(logXpGainMock).toHaveBeenCalledWith('xp-1', 450, 3150);
  });

  it('un retrait journalise un delta NÉGATIF (correction du meneur)', async () => {
    render(<ExperienceCard character={buildCharacter(3000, 4)} readOnly={false} />);
    await setXp('2500');

    await waitFor(() => expect(logXpGainMock).toHaveBeenCalledTimes(1));
    expect(logXpGainMock).toHaveBeenCalledWith('xp-1', -500, 2500);
  });

  it('une valeur inchangée n’écrit rien et ne journalise rien', async () => {
    render(<ExperienceCard character={buildCharacter(2700, 4)} readOnly={false} />);
    await setXp('2700');

    await waitFor(() =>
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument(),
    );
    expect(updateCharacterMock).not.toHaveBeenCalled();
    expect(logXpGainMock).not.toHaveBeenCalled();
  });

  it('une valeur négative est ramenée à 0 (pas d’XP négatif)', async () => {
    render(<ExperienceCard character={buildCharacter(500, 2)} readOnly={false} />);
    await setXp('-200');

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    expect(updateCharacterMock).toHaveBeenCalledWith({ experience: 0 });
  });

  it('affiche le reste exact avant le niveau suivant (chiffre SRD, pas une approximation)', () => {
    // 2 700 XP = niveau 4 ; le niveau 5 est à 6 500 → 3 800 restants.
    render(<ExperienceCard character={buildCharacter(2700, 4)} readOnly={false} />);
    expect(screen.getByText(/3 800 PX avant le niveau 5/)).toBeInTheDocument();
  });

  it('niveau 20 : plus de palier suivant, jauge pleine', () => {
    render(<ExperienceCard character={buildCharacter(360000, 20)} readOnly={false} />);
    expect(screen.getByText(/Niveau 20 atteint/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('divergence XP / fiche : la carte INFORME et ne bloque rien', () => {
    // 6 500 XP place au niveau 5, la fiche est restée au 3 (table aux jalons,
    // ou meneur qui n'a pas encore fait monter). Rien ne doit être désactivé.
    render(<ExperienceCard character={buildCharacter(6500, 3)} readOnly={false} />);
    expect(screen.getByText(/niveau 5, la fiche au niveau 3/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Modifier les points d’expérience' }),
    ).toBeEnabled();
  });

  it('aucune note de divergence quand les deux niveaux concordent', () => {
    render(<ExperienceCard character={buildCharacter(2700, 4)} readOnly={false} />);
    expect(screen.queryByText(/la fiche au niveau/)).not.toBeInTheDocument();
  });

  it('lecture seule : l’édition est refusée', async () => {
    const user = userEvent.setup();
    render(<ExperienceCard character={buildCharacter(2700, 4)} readOnly />);

    const button = screen.getByRole('button', { name: 'Modifier les points d’expérience' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });
});
