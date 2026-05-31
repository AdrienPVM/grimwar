import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { AbilitiesStep } from '../abilities-step';

/**
 * JALON 2E — méthode `rolled` (4d6 keep-3) avec sub-toggle « app » vs « manuel ».
 *
 * Couvre les invariants UX :
 *   1. 4ème radio « 4d6 (garde les 3 meilleurs) » présent à l'écran.
 *   2. Sélection de `'rolled'` fait apparaître le sub-toggle de source.
 *   3. Source « app » + bouton « Lancer » → 6 valeurs poussées dans le draft,
 *      breakdown rendu, l'autofill « Choisir pour moi » est masqué.
 *   4. Source « manuel » → 6 NumberInputs editables (3-18), aucun bouton roll.
 *   5. Reroll (2e clic) écrase les valeurs précédentes.
 *
 * On mocke `useContent` parce que `AbilitiesStep` lit la classe pour calculer
 * la stat recommandée (★). Le test n'a pas besoin de bundle complet — un
 * fixture minimal suffit.
 */

const WIZARD_FIXTURE = {
  id: 'wizard',
  name: { fr: 'Magicien', en: 'Wizard' },
  hitDie: 'd6',
  primaryAbility: ['int'],
  saveProficiencies: ['int', 'sag'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoices: { count: 2, from: ['Arcana'] },
  spellcasting: { ability: 'int', progression: 'full' },
  startingEquipment: { options: [{ items: [], coins: null }] },
  description: { fr: '.', en: '.' },
  features: [],
  source: 'srd-5.2.1',
} as const;

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') return { data: [WIZARD_FIXTURE], loading: false, error: null };
    return { data: [], loading: false, error: null };
  },
}));

// crypto.getRandomValues est utilisé par rollDieCrypto. On le seed pour rendre
// les jets déterministes : chaque appel renvoie un U32 qui modulo 6 donne 5
// → face 6 (valeur uniforme : la suite de faces sera 6,6,6,6 partout → score 18).
beforeEach(() => {
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((buf) => {
    // 5 % 6 = 5 → rejection sampling renvoie ((5 % 6) + 1) = 6. Toutes les faces = 6.
    const view = buf as Uint32Array;
    for (let i = 0; i < view.length; i += 1) view[i] = 5;
    return buf;
  });
  useWizardStore.getState().reset();
});

afterEach(() => {
  useWizardStore.getState().reset();
  vi.restoreAllMocks();
});

function selectRolledMethod(): void {
  const rolledRadio = screen.getByRole('radio', { name: /4d6 \(garde les 3 meilleurs\)/i });
  fireEvent.click(rolledRadio);
}

describe('AbilitiesStep — méthode rolled (JALON 2E)', () => {
  it('expose une 4e méthode « 4d6 (garde les 3 meilleurs) »', () => {
    render(<AbilitiesStep />);
    expect(
      screen.getByRole('radio', { name: /4d6 \(garde les 3 meilleurs\)/i }),
    ).toBeInTheDocument();
  });

  it('selecting rolled affiche le sub-toggle de source app vs manuel', () => {
    render(<AbilitiesStep />);
    selectRolledMethod();
    expect(screen.getByRole('radio', { name: /L'app lance les dés/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Je lance avec mes dés/i })).toBeInTheDocument();
  });

  it('app-rolled + clic Lancer → 6 abilities = 18 (RNG figé sur 6) + breakdown rendu', () => {
    render(<AbilitiesStep />);
    selectRolledMethod();
    // Source par défaut = 'app' → bouton « Lancer » visible.
    const rollBtn = screen.getByRole('button', { name: /Lancer 4d6/i });
    fireEvent.click(rollBtn);

    const { abilities } = useWizardStore.getState().draft;
    expect(abilities.for).toBe(18);
    expect(abilities.dex).toBe(18);
    expect(abilities.con).toBe(18);
    expect(abilities.int).toBe(18);
    expect(abilities.sag).toBe(18);
    expect(abilities.cha).toBe(18);

    // Le breakdown est rendu (« Détail du jet » apparaît dans le DOM pour
    // chaque ability).
    const breakdowns = screen.getAllByText(/Détail du jet/i);
    expect(breakdowns.length).toBe(6);
  });

  it('app-rolled : 2e clic = Reroll + masque l\'autofill « Choisir pour moi »', () => {
    render(<AbilitiesStep />);
    selectRolledMethod();
    fireEvent.click(screen.getByRole('button', { name: /Lancer 4d6/i }));

    // Le bouton bascule en « Relancer » au 2e affichage.
    const rerollBtn = screen.getByRole('button', { name: /Relancer/i });
    expect(rerollBtn).toBeInTheDocument();

    // L'autofill du wizard standard ne doit PAS apparaître quand on est en mode rolled.
    expect(screen.queryByRole('button', { name: /Choisir pour moi/i })).toBeNull();
  });

  it('manuel : NumberInputs editables 3-18, pas de bouton « Lancer »', () => {
    render(<AbilitiesStep />);
    selectRolledMethod();
    fireEvent.click(screen.getByRole('radio', { name: /Je lance avec mes dés/i }));

    // Plus de bouton « Lancer » en mode manuel.
    expect(screen.queryByRole('button', { name: /Lancer 4d6/i })).toBeNull();

    // Les 6 inputs sont navigables — on en pioche un et on tape une valeur.
    const forceInput = screen.getByRole('spinbutton', { name: /Force/i });
    expect(forceInput).toBeInTheDocument();
    // Confirme les bornes via les attributs HTML — fidèles aux constantes
    // ROLLED_MIN / ROLLED_MAX.
    expect(forceInput).toHaveAttribute('min', '3');
    expect(forceInput).toHaveAttribute('max', '18');
  });

  it('le breakdown disparaît quand on change de méthode (UI propre)', () => {
    render(<AbilitiesStep />);
    selectRolledMethod();
    fireEvent.click(screen.getByRole('button', { name: /Lancer 4d6/i }));
    expect(screen.getAllByText(/Détail du jet/i).length).toBe(6);

    // Retour sur 'point-buy' : le breakdown ne doit plus être affiché.
    fireEvent.click(screen.getByRole('radio', { name: /Achat de points/i }));
    expect(screen.queryByText(/Détail du jet/i)).toBeNull();
  });
});
