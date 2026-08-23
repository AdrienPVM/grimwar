import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { StatusStrip } from '../status-strip';

const { updateCharacterMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
  }),
}));

/**
 * Plan 13.14b — D19/D20, gate de wiring de prop.
 *
 * `StatusStrip` lisait `character.ac` directement, ce qui rendait toute
 * dérivation d'inventaire (acFromArmor + Defense +1) invisible à l'écran —
 * exactement la dette D20. La prop `displayedAc` route maintenant la valeur
 * combinée. Ces tests blindent le contrat : le cell CA reflète la prop, pas
 * le champ raw du personnage. Une régression qui rebrancherait `character.ac`
 * sur ce cell échouerait ici.
 */

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test',
    name: 'Test',
    status: 'alive',
    classes: [],
    totalLevel: 1,
    primaryClassId: 'fighter',
    ancestryId: 'human',
    ancestrySubChoices: {
      dragonAncestry: null,
      tieflingLegacy: null,
      elfLineage: null,
      gnomeLineage: null,
      goliathAncestry: null,
      ancestryCastingAbility: null,
      ancestryExtraSkill: null,
      ancestrySize: null,
    },
    backgroundId: 'soldier',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 16, dex: 12, con: 14, int: 10, sag: 10, cha: 10 },
    saves: { for: true, dex: false, con: true, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 12, max: 12, temp: 0 },
    ac: 11,
    // Valeur SRD canonique en PIEDS (ancestries.json : Humain = 30), PAS la
    // valeur déjà-en-mètres : c'est précisément l'écart qui masquait le bug
    // « 30 m » (chiffre en pieds affiché sous le label « m »).
    speed: 30,
    initiative: 1,
    hitDice: [],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: {},
    knownSpells: {},
    spellcastingAbility: {},
    inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'T' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'test-uid',
    ...overrides,
  };
}

/**
 * Le cell CA est la 2e cellule du `aria-label="…statusStrip…"`. On le résout
 * via le label "CA" (cf. `i18n.fr.sheet.stat.ac`) puis on lit la valeur de
 * son parent — robuste à un repositionnement éventuel.
 */
function readAcCell(): string {
  const acLabel = screen.getByText('CA');
  const cell = acLabel.closest('div');
  if (!cell) throw new Error('CA cell parent introuvable');
  // Le cell contient `<span label>CA</span>` puis `<span value>…</span>`.
  const valueSpans = within(cell).getAllByText(
    (_, el) =>
      el?.tagName === 'SPAN' &&
      el.parentElement === cell &&
      el.textContent !== 'CA' &&
      !!el.textContent?.match(/^\d+$/),
  );
  const [valueSpan] = valueSpans;
  if (!valueSpan) throw new Error('CA value span introuvable');
  return valueSpan.textContent ?? '';
}

describe('<StatusStrip>', () => {
  it('affiche displayedAc=17 même quand character.ac=11 (cas Guerrier·defense + cotte)', () => {
    // Le test capture le bug D20 : avant le fix, StatusStrip rendait
    // character.ac=11 alors que la CA effective vaut 17.
    render(<StatusStrip character={buildCharacter({ ac: 11 })} displayedAc={17} />);
    expect(readAcCell()).toBe('17');
  });

  it('affiche displayedAc=12 en valeur désarmée (cas Guerrier·defense sans armure)', () => {
    render(<StatusStrip character={buildCharacter({ ac: 12 })} displayedAc={12} />);
    expect(readAcCell()).toBe('12');
  });

  it('affiche displayedAc=16 (cas Magicien + armure, pas de Defense)', () => {
    // character.ac=12 (désarmé wizard), displayedAc=16 (armure portée sans bonus).
    render(<StatusStrip character={buildCharacter({ ac: 12 })} displayedAc={16} />);
    expect(readAcCell()).toBe('16');
  });

  it('ne lit jamais character.ac pour le cell CA (catch régression de wiring)', () => {
    // Si quelqu'un re-câblait par erreur le cell sur character.ac, ce test
    // verrait `99` à la place de `42`.
    render(<StatusStrip character={buildCharacter({ ac: 99 })} displayedAc={42} />);
    expect(readAcCell()).toBe('42');
    expect(screen.queryByText('99')).toBeNull();
  });

  it('affiche la Vitesse en MÈTRES, pas le chiffre brut en pieds (30 ft → « 9 m »)', () => {
    // Rouge avant vert : `character.speed` vaut 30 (pieds, SRD). Le cell était
    // étiqueté « m » mais montrait « 30 » → « 30 m », un non-sens. La conversion
    // FR (×0,3) doit afficher « 9 ». Sans le fix, ce test verrait « 30 ».
    render(<StatusStrip character={buildCharacter({ speed: 30 })} displayedAc={11} />);
    const speedCell = screen.getByText('Vit.').closest('div');
    if (!speedCell) throw new Error('cellule Vitesse introuvable');
    // value « 9 » + sub « m » sont concaténés dans le span de valeur.
    expect(speedCell.textContent).toContain('9m');
    expect(speedCell.textContent).not.toContain('30');
  });

  it('convertit aussi displayedSpeed (pieds → mètres) et gère les fractions (35 ft → « 10,5 m »)', () => {
    // displayedSpeed prime sur character.speed et reste en pieds (bonus d'effets
    // « speed-bonus » en ft). 35 ft → 10,5 m, virgule décimale française.
    render(
      <StatusStrip
        character={buildCharacter({ speed: 30 })}
        displayedAc={11}
        displayedSpeed={35}
      />,
    );
    const speedCell = screen.getByText('Vit.').closest('div');
    if (!speedCell) throw new Error('cellule Vitesse introuvable');
    expect(speedCell.textContent).toContain('10,5m');
  });

  it('affiche la Perception passive calculée (SAG 14 + maîtrise, niveau 1 → 14)', () => {
    // Rouge avant vert : avant ce plan, la cellule Perception passive n'existait
    // pas. On asserte le NOMBRE exact (10 + mod SAG +2 + PB 2), pas sa présence.
    render(
      <StatusStrip
        character={buildCharacter({
          classes: [
            { classId: 'fighter', subclassId: null, level: 1 } as Character['classes'][number],
          ],
          abilities: { for: 16, dex: 12, con: 14, int: 10, sag: 14, cha: 10 },
          skills: { perception: 1 },
        })}
        displayedAc={17}
      />,
    );
    const label = screen.getByText('Perc. passive');
    const cell = label.closest('div');
    if (!cell) throw new Error('cellule Perception passive introuvable');
    expect(within(cell).getByText('14')).toBeInTheDocument();
  });

  it('ne rend PLUS les PV — anti-duplication (les PV sont portés par l’emblème)', () => {
    // Rouge avant vert : sur l'ancien code, la cellule PV existait ici ET sur le
    // badge de l'emblème ET (en Combat) sur la HpMegaCard → triple affichage. La
    // cellule PV est retirée ; ce test échouerait si on la réintroduisait.
    render(
      <StatusStrip
        character={buildCharacter({ hp: { current: 7, max: 23, temp: 0 } })}
        displayedAc={15}
      />,
    );
    // Les vitales secondaires restent.
    expect(screen.getByText('CA')).toBeInTheDocument();
    expect(screen.getByText('Init')).toBeInTheDocument();
    expect(screen.getByText('Vit.')).toBeInTheDocument();
    // Mais plus de cellule PV (label « PV » + le « / 23 » du sub).
    expect(screen.queryByText('PV')).toBeNull();
    expect(screen.queryByText('/ 23')).toBeNull();
  });
});

/**
 * M16 — l'initiative et la vitesse étaient posées au wizard et plus jamais
 * réécrites. Une table les change tout le temps (« +2 avec Alerte »,
 * « 12 m sous Hâte »).
 */
describe('<StatusStrip> — initiative et vitesse éditables', () => {
  beforeEach(() => {
    updateCharacterMock.mockClear();
  });

  it('écrit l’initiative saisie', () => {
    render(
      <StatusStrip character={buildCharacter({ initiative: 2 })} displayedAc={15} />,
    );
    fireEvent.click(screen.getByTestId('status-init'));
    const input = screen.getByTestId('status-init-input');
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.blur(input);
    expect(updateCharacterMock).toHaveBeenCalledWith({ initiative: 4 });
  });

  it('accepte une initiative négative', () => {
    render(
      <StatusStrip character={buildCharacter({ initiative: 0 })} displayedAc={15} />,
    );
    fireEvent.click(screen.getByTestId('status-init'));
    const input = screen.getByTestId('status-init-input');
    fireEvent.change(input, { target: { value: '-2' } });
    fireEvent.blur(input);
    expect(updateCharacterMock).toHaveBeenCalledWith({ initiative: -2 });
  });

  it('SAISIT des mètres et STOCKE des pieds', () => {
    // C'est l'invariant qui compte : l'utilisateur voit des mètres, le contenu
    // SRD et la carte continuent de raisonner en pieds.
    render(
      <StatusStrip character={buildCharacter({ speed: 30 })} displayedAc={15} />,
    );
    fireEvent.click(screen.getByTestId('status-speed'));
    const input = screen.getByTestId('status-speed-input');
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.blur(input);
    expect(updateCharacterMock).toHaveBeenCalledWith({ speed: 40 });
  });

  it('pré-remplit la saisie avec la vitesse courante EN MÈTRES', () => {
    render(
      <StatusStrip character={buildCharacter({ speed: 30 })} displayedAc={15} />,
    );
    fireEvent.click(screen.getByTestId('status-speed'));
    expect(screen.getByTestId('status-speed-input')).toHaveValue(9);
  });

  it('borne une faute de frappe au lieu de l’enregistrer', () => {
    render(
      <StatusStrip character={buildCharacter({ initiative: 0 })} displayedAc={15} />,
    );
    fireEvent.click(screen.getByTestId('status-init'));
    const input = screen.getByTestId('status-init-input');
    fireEvent.change(input, { target: { value: '900' } });
    fireEvent.blur(input);
    expect(updateCharacterMock).toHaveBeenCalledWith({ initiative: 20 });
  });

  it('Échap referme sans rien écrire', () => {
    render(
      <StatusStrip character={buildCharacter({ initiative: 2 })} displayedAc={15} />,
    );
    fireEvent.click(screen.getByTestId('status-init'));
    fireEvent.keyDown(screen.getByTestId('status-init-input'), { key: 'Escape' });
    expect(screen.queryByTestId('status-init-input')).toBeNull();
    expect(updateCharacterMock).not.toHaveBeenCalled();
  });

  it('en lecture seule, aucune cellule n’est cliquable', () => {
    render(
      <StatusStrip
        character={buildCharacter({ initiative: 2 })}
        displayedAc={15}
        readOnly
      />,
    );
    expect(screen.queryByTestId('status-init')).toBeNull();
    expect(screen.queryByTestId('status-speed')).toBeNull();
  });

  it('la CA reste dérivée — pas d’édition promise sans terme de surcharge', () => {
    render(<StatusStrip character={buildCharacter()} displayedAc={17} />);
    const label = screen.getByText('CA');
    expect(label.closest('button')).toBeNull();
  });
});
