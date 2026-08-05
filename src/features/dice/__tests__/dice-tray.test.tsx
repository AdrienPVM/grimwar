import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useDevicePrefsStore } from '@/shared/lib/slices/device-prefs-slice';
import {
  trayRollFromResult,
  useDiceTrayStore,
} from '@/shared/lib/slices/dice-tray-slice';
import type { RollResult } from '@/shared/lib/dice/types';

import { DiceTrayOverlay } from '../dice-tray-overlay';
import { Die3D } from '../die-3d';

/**
 * Le plateau doit montrer EXACTEMENT ce que le moteur a tiré. Un dé décoratif
 * qui affiche autre chose que la face jouée serait pire que pas de dé du tout :
 * le joueur croirait à un bug de calcul.
 */

function makeResult(over: Partial<RollResult> = {}): RollResult {
  return {
    kind: 'check',
    label: 'Test',
    mode: 'digital',
    dice: [{ count: 1, sides: 20 }],
    rawFaces: [14],
    keptFaces: [14],
    modifier: 3,
    total: 17,
    crit: false,
    fumble: false,
    advantage: 'normal',
    characterId: 'c1',
    timestamp: 1234,
    ...over,
  };
}

describe('trayRollFromResult', () => {
  it('traduit un d20 simple en un dé portant la face tirée', () => {
    const roll = trayRollFromResult(makeResult())!;
    expect(roll.dice).toHaveLength(1);
    expect(roll.dice[0]).toMatchObject({ sides: 20, face: 14, kept: true });
  });

  it('ne montre RIEN sur un jet physique — les vrais dés sont sur la table', () => {
    expect(trayRollFromResult(makeResult({ mode: 'physical' }))).toBeNull();
  });

  it('marque le dé écarté par l’avantage sans le faire disparaître', () => {
    const roll = trayRollFromResult(
      makeResult({
        dice: [{ count: 2, sides: 20, kh: 1 }],
        rawFaces: [7, 18],
        keptFaces: [18],
      }),
    )!;
    expect(roll.dice.map((d) => d.face)).toEqual([7, 18]);
    expect(roll.dice.map((d) => d.kept)).toEqual([false, true]);
  });

  it('marque le dé écarté par le désavantage (on garde le plus bas)', () => {
    const roll = trayRollFromResult(
      makeResult({
        dice: [{ count: 2, sides: 20, kl: 1 }],
        rawFaces: [7, 18],
        keptFaces: [7],
      }),
    )!;
    expect(roll.dice.map((d) => d.kept)).toEqual([true, false]);
  });

  it('découpe correctement une formule à plusieurs termes', () => {
    const roll = trayRollFromResult(
      makeResult({
        dice: [
          { count: 2, sides: 6 },
          { count: 1, sides: 8 },
        ],
        rawFaces: [3, 5, 7],
        keptFaces: [3, 5, 7],
      }),
    )!;
    expect(roll.dice.map((d) => [d.sides, d.face])).toEqual([
      [6, 3],
      [6, 5],
      [8, 7],
    ]);
  });

  it('ignore les dés dont on n’a pas la forme plutôt que d’en inventer une', () => {
    // Un d100 n'a pas de solide : mieux vaut ne pas le montrer que le montrer
    // sous la forme d'un autre dé.
    const roll = trayRollFromResult(
      makeResult({
        dice: [
          { count: 1, sides: 100 },
          { count: 1, sides: 6 },
        ],
        rawFaces: [42, 4],
        keptFaces: [42, 4],
      }),
    )!;
    expect(roll.dice.map((d) => d.sides)).toEqual([6]);
  });

  it('rend `null` quand aucun dé n’est représentable', () => {
    expect(
      trayRollFromResult(
        makeResult({ dice: [{ count: 1, sides: 100 }], rawFaces: [42] }),
      ),
    ).toBeNull();
  });
});

describe('useDiceTrayStore', () => {
  beforeEach(() => {
    useDiceTrayStore.setState({ current: null });
  });

  it('n’efface pas un jet arrivé après celui qu’on retire', () => {
    // Deux jets rapprochés : le minuteur du premier ne doit pas emporter le
    // second, sinon les dés du second disparaissent en plein vol.
    useDiceTrayStore.getState().presentRoll(trayRollFromResult(makeResult())!);
    useDiceTrayStore
      .getState()
      .presentRoll(trayRollFromResult(makeResult({ timestamp: 9999 }))!);
    useDiceTrayStore.getState().clearRoll(1234);
    expect(useDiceTrayStore.getState().current?.id).toBe(9999);
    useDiceTrayStore.getState().clearRoll(9999);
    expect(useDiceTrayStore.getState().current).toBeNull();
  });
});

describe('<Die3D>', () => {
  it('rend une facette par face du solide, et une seule allumée', () => {
    const { container } = render(<Die3D sides={20} face={17} />);
    expect(container.querySelectorAll('.die3d-facet')).toHaveLength(20);
    expect(container.querySelectorAll('.die3d-facet--lit')).toHaveLength(1);
    // La facette allumée porte bien le chiffre tiré.
    expect(container.querySelector('.die3d-pip--lit')?.textContent).toBe('17');
  });

  it.each([4, 6, 8, 10, 12, 20])(
    'd%i : chaque face porte un chiffre distinct de 1 à N',
    (sides) => {
      const { container } = render(<Die3D sides={sides} face={1} />);
      const pips = Array.from(container.querySelectorAll('.die3d-pip')).map(
        (n) => Number(n.textContent),
      );
      expect([...pips].sort((a, b) => a - b)).toEqual(
        Array.from({ length: sides }, (_, i) => i + 1),
      );
    },
  );

  it('ne rend rien pour un dé sans solide connu', () => {
    const { container } = render(<Die3D sides={100} face={42} />);
    expect(container.querySelector('[data-testid="die-3d"]')).toBeNull();
  });

  it('reste hors de l’arbre d’accessibilité (le toast annonce déjà le total)', () => {
    render(<Die3D sides={6} face={4} />);
    expect(screen.getByTestId('die-3d').getAttribute('aria-hidden')).toBe('true');
  });
});

describe('<DiceTrayOverlay>', () => {
  beforeEach(() => {
    useDiceTrayStore.setState({ current: null });
    useDevicePrefsStore.setState({ dice3d: true });
  });

  it('n’affiche rien tant qu’aucun jet n’est en cours', () => {
    render(<DiceTrayOverlay />);
    expect(screen.queryByTestId('dice-tray')).toBeNull();
  });

  it('affiche un dé par dé du jet', () => {
    useDiceTrayStore.getState().presentRoll(
      trayRollFromResult(
        makeResult({
          dice: [{ count: 3, sides: 6 }],
          rawFaces: [1, 4, 6],
          keptFaces: [1, 4, 6],
        }),
      )!,
    );
    render(<DiceTrayOverlay />);
    expect(screen.getAllByTestId('die-3d')).toHaveLength(3);
  });

  it('plafonne l’affichage et ANNONCE le surplus au lieu de le taire', () => {
    // Une troncature muette laisserait croire que le jet portait moins de dés.
    useDiceTrayStore.getState().presentRoll(
      trayRollFromResult(
        makeResult({
          dice: [{ count: 20, sides: 6 }],
          rawFaces: Array.from({ length: 20 }, () => 3),
          keptFaces: [],
        }),
      )!,
    );
    render(<DiceTrayOverlay />);
    expect(screen.getAllByTestId('die-3d')).toHaveLength(12);
    expect(screen.getByText('+ 8')).toBeTruthy();
  });

  it('se tait quand le joueur a coupé les dés en relief', () => {
    useDevicePrefsStore.setState({ dice3d: false });
    useDiceTrayStore.getState().presentRoll(trayRollFromResult(makeResult())!);
    render(<DiceTrayOverlay />);
    expect(screen.queryByTestId('dice-tray')).toBeNull();
  });
});
