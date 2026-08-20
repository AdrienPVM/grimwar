import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { t } from '@/shared/lib/i18n';
import type { Campaign, Membership } from '@/shared/types/campaign';

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

const authHolder: { user: { uid: string } | null } = { user: { uid: 'uid-1' } };
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

const stateHolder: {
  campaign: Campaign | null;
  members: Membership[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
} = {
  campaign: null,
  members: [],
  isLoading: false,
  error: null,
  refresh: vi.fn(),
};
vi.mock('../use-campaign', () => ({
  useCampaign: () => stateHolder,
}));

// La notification de handouts ouvre un listener Firestore (`onSnapshot`) —
// hors périmètre de ce test d'écran, couverte par son propre test unitaire.
vi.mock('../use-handout-notifications', () => ({
  useHandoutNotifications: () => undefined,
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const leaveCampaignMock = vi.fn();
const promoteToGmMock = vi.fn();
const linkCharacterMock = vi.fn();
vi.mock('@/shared/lib/services/campaigns', () => {
  class FakeError extends Error {
    readonly kind: string;
    constructor(kind: string, message?: string) {
      super(message ?? kind);
      this.name = 'CampaignServiceError';
      this.kind = kind;
    }
  }
  return {
    leaveCampaign: (cid: string, uid: string) => leaveCampaignMock(cid, uid),
    promoteToGm: (cid: string, target: string) => promoteToGmMock(cid, target),
    linkCharacterToMembership: (cid: string, uid: string, charId: string | null) =>
      linkCharacterMock(cid, uid, charId),
    CampaignServiceError: FakeError,
  };
});

// La section « Mon personnage » (MyCharacterLink) abonne useCharactersList ;
// on le stube pour qu'il ne touche pas Firestore dans le test d'écran.
const charactersHolder: {
  characters: { id: string; name: string; totalLevel: number }[];
  isLoading: boolean;
} = { characters: [], isLoading: false };
vi.mock('@/features/library/use-characters-list', () => ({
  useCharactersList: () => ({ ...charactersHolder, error: null }),
}));

vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

// Le feed d'activité (JALON 22.3) abonne `useCampaignEvents` (onSnapshot
// Firestore) ; on le stube pour le test d'écran — la couverture de la query/du
// rendu vit dans use-campaign-events.test.tsx + campaign-event-feed.test.tsx.
const eventsHolder: {
  events: { id: string; kind: string; visibility: string; payload: Record<string, unknown>; actorUserId: string; actorCharacterId: string | null; targetCharacterId: string | null; createdAt: unknown }[];
  isLoading: boolean;
  error: Error | null;
} = { events: [], isLoading: false, error: null };
vi.mock('../use-campaign-events', () => ({
  CAMPAIGN_EVENTS_LIMIT: 20,
  useCampaignEvents: () => eventsHolder,
}));

// La carte live d'un membre lié (`CampaignMemberItem` → `PartyMemberCard`) abonne
// `useCharacter` (onSnapshot) ; on stube la carte pour le test d'écran — sa
// couverture (rendu live, CA dérivée, navigation cross-owner, gating) vit dans
// campaign-member-item.test.tsx. Le stub expose `onOpen` via un bouton « Ouvrir
// la fiche » pour vérifier le câblage de navigation côté écran.
vi.mock('../party-member-card', () => ({
  PartyMemberCard: ({ onOpen }: { onOpen: () => void }) => (
    <button type="button" onClick={onOpen}>
      Ouvrir la fiche
    </button>
  ),
}));

// L'agrégat compagnie (`usePartyAggregate`) ouvre N listeners Firestore ; on le
// stube pour le test d'écran (sa couverture — calcul, rendu, identité du contenu
// — vit dans use-party-aggregate.test.ts + party-aggregate-strip.test.tsx). Le
// holder contrôle l'agrégat renvoyé ; défaut vide → la bande se masque d'elle-même.
type AggregateShape = {
  count: number;
  averageLevel: number | null;
  minLevel: number | null;
  maxLevel: number | null;
  downedCount: number;
  isLoading: boolean;
};
const aggregateHolder: { aggregate: AggregateShape } = {
  aggregate: {
    count: 0,
    averageLevel: null,
    minLevel: null,
    maxLevel: null,
    downedCount: 0,
    isLoading: false,
  },
};
vi.mock('../use-party-aggregate', () => ({
  usePartyAggregate: () => aggregateHolder.aggregate,
}));

import { CampaignDetailScreen } from '../campaign-detail-screen';
import { buildRoster } from '../roster';

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

function mkCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c-1',
    name: 'Tempête sur Caer Dûn',
    description: 'Une cité brumeuse au bord d’un fjord glacé.',
    gmIds: ['uid-1'],
    createdBy: 'uid-1',
    inviteCode: 'ABC234',
    settings: {
      language: 'fr',
      diceMode: 'digital',
      variants: {
        featAtLevel1: false,
        flanking: false,
        slowHealing: false,
        grittyRealism: false,
      },
    },
    status: 'active',
    schemaVersion: 1,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function mkMember(overrides: Partial<Membership> = {}): Membership {
  return {
    userId: 'uid-2',
    role: 'member',
    characterId: null,
    joinedAt: null,
    schemaVersion: 1,
    ...overrides,
  };
}

afterEach(() => {
  stateHolder.campaign = null;
  stateHolder.members = [];
  stateHolder.isLoading = false;
  stateHolder.error = null;
  stateHolder.refresh = vi.fn();
  authHolder.user = { uid: 'uid-1' };
  navigateMock.mockReset();
  leaveCampaignMock.mockReset();
  promoteToGmMock.mockReset();
  linkCharacterMock.mockReset();
  charactersHolder.characters = [];
  charactersHolder.isLoading = false;
  eventsHolder.events = [];
  eventsHolder.isLoading = false;
  eventsHolder.error = null;
  aggregateHolder.aggregate = {
    count: 0,
    averageLevel: null,
    minLevel: null,
    maxLevel: null,
    downedCount: 0,
    isLoading: false,
  };
});

function renderScreen(cid = 'c-1'): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[`/campaigns/${cid}`]}>
      <Routes>
        <Route path="/campaigns/:cid" element={<CampaignDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────────
// buildRoster — fonction pure
// ─────────────────────────────────────────────────────────────────────

describe('buildRoster', () => {
  it('renvoie les MJ en premier, puis les joueurs', () => {
    const camp = mkCampaign({ gmIds: ['uid-1', 'uid-gm2'] });
    const members = [
      mkMember({ userId: 'uid-p1', role: 'member' }),
      mkMember({ userId: 'uid-p2', role: 'member' }),
    ];
    const roster = buildRoster(camp, members, 'uid-1', null);
    expect(roster.map((r) => r.uid)).toEqual([
      'uid-1',
      'uid-gm2',
      'uid-p1',
      'uid-p2',
    ]);
    expect(roster[0]?.role).toBe('gm');
    expect(roster[1]?.role).toBe('gm');
    expect(roster[2]?.role).toBe('member');
  });

  it("dédoublonne un MJ qui a aussi un doc member 'gm' (cas promoteToGm)", () => {
    const camp = mkCampaign({ gmIds: ['uid-1', 'uid-2'] });
    // uid-2 a son doc member avec role=gm (cas après promoteToGm 4.0.3).
    const members = [mkMember({ userId: 'uid-2', role: 'gm' })];
    const roster = buildRoster(camp, members, 'uid-1', null);
    expect(roster).toHaveLength(2);
    expect(roster.map((r) => r.uid)).toEqual(['uid-1', 'uid-2']);
  });

  it('un MENEUR qui joue un PJ apparaît AVEC sa fiche liée (M67a)', () => {
    // Le meneur fondateur n'a pas de doc member — son appartenance vient de
    // `gmIds[]`. Dès qu'il en pose un pour jouer, sa ligne doit porter sa fiche
    // comme celle de n'importe qui, sans quoi le roster ment sur la table.
    const camp = mkCampaign({ gmIds: ['uid-1'] });
    const members = [
      mkMember({ userId: 'uid-1', role: 'gm', characterId: 'char-mj' }),
      mkMember({ userId: 'uid-2', role: 'member', characterId: 'char-2' }),
    ];
    const roster = buildRoster(camp, members, 'uid-1', null);
    expect(roster).toHaveLength(2);
    expect(roster[0]).toMatchObject({
      uid: 'uid-1',
      role: 'gm',
      characterId: 'char-mj',
    });
  });

  it('un MENEUR sans doc member n’a toujours aucune fiche liée', () => {
    const camp = mkCampaign({ gmIds: ['uid-1'] });
    const roster = buildRoster(camp, [], 'uid-1', null);
    expect(roster[0]?.characterId).toBeNull();
  });

  it("flag isSelf=true sur l'entrée correspondant à myUid", () => {
    const camp = mkCampaign({ gmIds: ['uid-gm'] });
    const members = [mkMember({ userId: 'uid-me' })];
    const roster = buildRoster(camp, members, 'uid-me', null);
    expect(roster.find((r) => r.uid === 'uid-me')?.isSelf).toBe(true);
    expect(roster.find((r) => r.uid === 'uid-gm')?.isSelf).toBe(false);
  });

  it("tronque les UIDs longs avec ellipsis", () => {
    const camp = mkCampaign({ gmIds: ['aBcDeFgHiJkLmNoPqRsT'] });
    const roster = buildRoster(camp, [], null, null);
    expect(roster[0]?.label).toBe('aBcDeFgH…');
    expect(roster[0]?.hasName).toBe(false);
  });

  it("propage characterId du membre, null pour les entrées MJ", () => {
    const camp = mkCampaign({ gmIds: ['uid-gm'] });
    const members = [
      mkMember({ userId: 'uid-p1', characterId: 'char-7' }),
      mkMember({ userId: 'uid-p2', characterId: null }),
    ];
    const roster = buildRoster(camp, members, null, null);
    expect(roster.find((r) => r.uid === 'uid-gm')?.characterId).toBeNull();
    expect(roster.find((r) => r.uid === 'uid-p1')?.characterId).toBe('char-7');
    expect(roster.find((r) => r.uid === 'uid-p2')?.characterId).toBeNull();
  });

  it('libellé = displayName dénormalisé du membre (identité, pas UID)', () => {
    const camp = mkCampaign({ gmIds: ['uid-gm'] });
    const members = [mkMember({ userId: 'uid-p1', displayName: 'Galadriel' })];
    const roster = buildRoster(camp, members, null, null);
    const p1 = roster.find((r) => r.uid === 'uid-p1');
    expect(p1?.label).toBe('Galadriel');
    expect(p1?.hasName).toBe(true);
  });

  it('displayName null → repli UID tronqué (hasName=false)', () => {
    const camp = mkCampaign({ gmIds: ['uid-gm'] });
    const members = [mkMember({ userId: 'aBcDeFgHiJkLmNoPqRsT', displayName: null })];
    const roster = buildRoster(camp, members, null, null);
    const p = roster.find((r) => r.uid === 'aBcDeFgHiJkLmNoPqRsT');
    expect(p?.label).toBe('aBcDeFgH…');
    expect(p?.hasName).toBe(false);
  });

  it('ligne de soi : le nom LIVE du profil Auth prime sur la valeur stockée', () => {
    const camp = mkCampaign({ gmIds: ['uid-gm'] });
    // Le doc member stocke un ancien nom ; le profil Auth courant en a un neuf.
    const members = [mkMember({ userId: 'uid-me', displayName: 'Ancien Nom' })];
    const roster = buildRoster(camp, members, 'uid-me', 'Nouveau Nom');
    expect(roster.find((r) => r.uid === 'uid-me')?.label).toBe('Nouveau Nom');
  });

  it('MJ promu depuis un doc member → son displayName remonte sur la ligne gmIds', () => {
    const camp = mkCampaign({ gmIds: ['uid-gm'] });
    const members = [mkMember({ userId: 'uid-gm', role: 'gm', displayName: 'Le Meneur' })];
    const roster = buildRoster(camp, members, null, null);
    expect(roster).toHaveLength(1);
    expect(roster[0]?.label).toBe('Le Meneur');
    expect(roster[0]?.role).toBe('gm');
  });

  it('displayName vide/espaces → repli UID (pas un libellé blanc)', () => {
    const camp = mkCampaign({ gmIds: ['uid-gm'] });
    const members = [mkMember({ userId: 'aBcDeFgHiJkLmNoPqRsT', displayName: '   ' })];
    const roster = buildRoster(camp, members, null, null);
    expect(roster.find((r) => r.uid === 'aBcDeFgHiJkLmNoPqRsT')?.label).toBe('aBcDeFgH…');
  });
});

// ─────────────────────────────────────────────────────────────────────
// CampaignDetailScreen
// ─────────────────────────────────────────────────────────────────────

describe('<CampaignDetailScreen> — chargement et erreurs', () => {
  it('rend un Splash en loading', () => {
    stateHolder.isLoading = true;
    const { container } = renderScreen();
    expect(container.textContent ?? '').not.toContain('Tempête');
  });

  it('rend l’écran d’erreur générique avec Réessayer', () => {
    stateHolder.error = new Error('network down');
    renderScreen();
    expect(screen.getByText(/Lecture impossible/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Réessayer/i }));
    expect(stateHolder.refresh).toHaveBeenCalled();
  });

  it("rend l'écran 'Campagne introuvable' sur kind=campaign-not-found", () => {
    const err = Object.assign(new Error('gone'), {
      name: 'CampaignServiceError',
      kind: 'campaign-not-found',
    });
    stateHolder.error = err as Error;
    renderScreen('c-missing');
    expect(screen.getByText(/Campagne introuvable/i)).toBeInTheDocument();
    // Pas de bouton Réessayer sur ce cas.
    expect(screen.queryByRole('button', { name: /Réessayer/i })).not.toBeInTheDocument();
  });
});

describe('<CampaignDetailScreen> — viewer est MJ', () => {
  it("affiche le bloc invite + roster + bouton Quitter", () => {
    stateHolder.campaign = mkCampaign({
      id: 'c-1',
      name: 'Tempête sur Caer Dûn',
      gmIds: ['uid-1'],
      inviteCode: 'ABC234',
    });
    stateHolder.members = [mkMember({ userId: 'uid-2', role: 'member' })];
    renderScreen();

    expect(screen.getByRole('heading', { name: /Tempête sur Caer Dûn/i })).toBeInTheDocument();
    // Bloc invitation visible pour le MJ.
    expect(screen.getByText(/Inviter à la table/i)).toBeInTheDocument();
    expect(screen.getByText('ABC234')).toBeInTheDocument();
    // Roster avec un joueur.
    expect(screen.getByText(/La compagnie/i)).toBeInTheDocument();
    expect(screen.getByText(/uid-2/)).toBeInTheDocument();
    // Bouton Promouvoir visible (MJ → joueur).
    expect(screen.getByRole('button', { name: /Promouvoir meneur/i })).toBeInTheDocument();
    // Bouton Quitter en pied de page.
    expect(screen.getByRole('button', { name: /Quitter la campagne/i })).toBeInTheDocument();
  });

  it('affiche la bande agrégat compagnie (effectif + niveau moyen) au meneur', () => {
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-1'] });
    stateHolder.members = [
      mkMember({ userId: 'uid-2', role: 'member', characterId: 'char-9' }),
    ];
    aggregateHolder.aggregate = {
      count: 2,
      averageLevel: 4,
      minLevel: 3,
      maxLevel: 5,
      downedCount: 0,
      isLoading: false,
    };
    renderScreen();

    // Identité du contenu : les libellés ET les valeurs dérivées sont rendus.
    expect(screen.getByText('Effectif')).toBeInTheDocument();
    expect(screen.getByText('Niveau moyen')).toBeInTheDocument();
    expect(screen.getByText('Niveaux')).toBeInTheDocument();
    expect(screen.getByText('3–5')).toBeInTheDocument();
  });

  it('le MENEUR voit « Mon personnage » alors qu’il n’a aucun doc member (M67a)', () => {
    // Avant : la section n'était rendue que si `members[]` contenait le
    // lecteur. Un MJ fondateur n'en fait jamais partie — il ne pouvait donc
    // pas jouer un PJ à sa propre table, alors qu'un co-MJ promu depuis un
    // joueur, si. Asymétrie non voulue, corrigée sans toucher aux rules.
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-1'] });
    stateHolder.members = [];
    renderScreen();
    expect(
      screen.getByText(t('campaigns.detail.myCharacter.firstStepTitle')),
    ).toBeInTheDocument();
  });

  it('le JOUEUR a sa propre porte vers la carte, le MENEUR garde la sienne', () => {
    // M34 : les rules autorisent la lecture des cartes et des jetons par tout
    // membre depuis le plan 29 — seule l'entrée manquait, ce qui obligeait à
    // s'échanger une URL. Les deux publics n'ont pas le même libellé : le
    // joueur « voit », le meneur « ouvre » (il édite).
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-gm'] });
    stateHolder.members = [mkMember({ userId: 'uid-1', role: 'member' })];
    renderScreen();
    expect(
      screen.getByRole('button', { name: /Voir la carte/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Cartes$/i })).toBeNull();

    cleanup();
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-1'] });
    renderScreen();
    expect(screen.getByRole('button', { name: /^Cartes$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Voir la carte/i })).toBeNull();
  });

  it("campagne sans joueur → bloc invitation en mode « premier pas »", () => {
    // Un MJ qui vient de créer sa campagne atterrit ici : aucun joueur n'a
    // rejoint (roster = MJ seul). On lui présente l'invitation comme prochaine
    // action évidente, avec un cadre chaleureux « Invite tes joueurs ».
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-1'], inviteCode: 'ABC234' });
    stateHolder.members = [];
    renderScreen();

    expect(screen.getByText(/Invite tes joueurs/i)).toBeInTheDocument();
    // Le titre neutre « Inviter à la table » cède la place au cadre premier pas.
    expect(screen.queryByText('Inviter à la table')).not.toBeInTheDocument();
    // Le code reste affiché et copiable dans les deux états.
    expect(screen.getByText('ABC234')).toBeInTheDocument();
  });

  it('affiche le feed d’activité (JALON 22.3) avec un événement rendu', () => {
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-1'] });
    stateHolder.members = [mkMember({ userId: 'uid-2', role: 'member' })];
    eventsHolder.events = [
      {
        id: 'ev-1',
        kind: 'roll',
        visibility: 'all',
        payload: { label: 'Épée longue', total: 18 },
        actorUserId: 'uid-2',
        actorCharacterId: 'char-2',
        targetCharacterId: null,
        createdAt: null,
      },
    ];
    renderScreen();

    expect(
      screen.getByRole('region', { name: /Journal de bord de la campagne/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Activité récente')).toBeInTheDocument();
    expect(screen.getByText('Jet de dés')).toBeInTheDocument();
    expect(screen.getByText('Épée longue · 18')).toBeInTheDocument();
  });

  it("rend la carte live d'un joueur lié et le tap navigue vers la fiche cross-owner (4A.3)", () => {
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-1'] });
    stateHolder.members = [
      mkMember({ userId: 'uid-2', role: 'member', characterId: 'char-9' }),
    ];
    renderScreen();

    // La carte live (stub) expose l'ouverture de fiche — tap → route cross-owner.
    const viewBtn = screen.getByRole('button', { name: /Ouvrir la fiche/i });
    fireEvent.click(viewBtn);
    expect(navigateMock).toHaveBeenCalledWith(
      '/campaigns/c-1/members/uid-2/sheet',
    );
  });

  it("masque la carte live pour un joueur SANS fiche liée (ligne compacte seule)", () => {
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-1'] });
    stateHolder.members = [
      mkMember({ userId: 'uid-2', role: 'member', characterId: null }),
    ];
    renderScreen();

    expect(
      screen.queryByRole('button', { name: /Ouvrir la fiche/i }),
    ).not.toBeInTheDocument();
  });

  it("clic Promouvoir → ouvre la modale + clic Promouvoir confirme → appelle promoteToGm + refresh", async () => {
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-1'] });
    stateHolder.members = [mkMember({ userId: 'uid-2', role: 'member' })];
    promoteToGmMock.mockResolvedValueOnce(undefined);
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /Promouvoir meneur/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Le bouton "Promouvoir" dans la modale (variant primary).
    const confirmBtn = screen.getByRole('button', { name: 'Promouvoir' });
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(promoteToGmMock).toHaveBeenCalledWith('c-1', 'uid-2');
    });
    await waitFor(() => {
      expect(stateHolder.refresh).toHaveBeenCalled();
    });
  });
});

describe('<CampaignDetailScreen> — bannière d’état de campagne', () => {
  it('campagne active → aucune bannière d’état', () => {
    stateHolder.campaign = mkCampaign({ status: 'active' });
    renderScreen();
    expect(screen.queryByText(/est en pause/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/est archivée/i)).not.toBeInTheDocument();
  });

  it('campagne en pause → bannière « en pause » (séances suspendues)', () => {
    stateHolder.campaign = mkCampaign({ status: 'paused' });
    renderScreen();
    expect(screen.getByText(/Cette campagne est en pause/i)).toBeInTheDocument();
  });

  it('campagne archivée → bannière « archivée » (consultable en lecture)', () => {
    stateHolder.campaign = mkCampaign({ status: 'archived' });
    renderScreen();
    expect(screen.getByText(/Cette campagne est archivée/i)).toBeInTheDocument();
  });

  it('campagne archivée sans joueur → PAS de célébration « Invite tes joueurs »', () => {
    // Célébrer l'invitation sur une campagne archivée serait incongru : on
    // retombe sur le titre neutre « Inviter à la table », pas le cadre premier pas.
    stateHolder.campaign = mkCampaign({ status: 'archived' });
    stateHolder.members = [];
    renderScreen();
    expect(screen.queryByText(/Invite tes joueurs/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Inviter à la table/i)).toBeInTheDocument();
  });
});

describe('<CampaignDetailScreen> — viewer est joueur', () => {
  it("masque le bloc invite + masque le bouton Promouvoir", () => {
    authHolder.user = { uid: 'uid-2' };
    stateHolder.campaign = mkCampaign({
      id: 'c-1',
      gmIds: ['uid-1'],
      inviteCode: 'ABC234',
    });
    stateHolder.members = [
      mkMember({ userId: 'uid-2', role: 'member' }),
      // uid-3 a une fiche liée : si l'affordance MJ fuitait côté joueur, ce
      // membre la déclencherait — le test resterait donc rouge sur la régression.
      mkMember({ userId: 'uid-3', role: 'member', characterId: 'char-3' }),
    ];
    // Même si un agrégat non vide « existait », il ne doit jamais atteindre un
    // joueur : la bande compagnie est gardée par `isGm` (les métriques dérivent
    // de fiches que seul le MJ peut lire).
    aggregateHolder.aggregate = {
      count: 2,
      averageLevel: 4,
      minLevel: 3,
      maxLevel: 5,
      downedCount: 0,
      isLoading: false,
    };
    renderScreen();

    expect(screen.queryByText(/Inviter à la table/i)).not.toBeInTheDocument();
    expect(screen.queryByText('ABC234')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Promouvoir meneur/i })).not.toBeInTheDocument();
    // La bande agrégat compagnie est masquée côté joueur (gate isGm).
    expect(screen.queryByText('Effectif')).not.toBeInTheDocument();
    expect(screen.queryByText('Niveaux')).not.toBeInTheDocument();
    // Un joueur ne voit JAMAIS la carte live d'un autre membre, même lié (la
    // lecture cross-owner est réservée au MJ) → pas d'affordance d'ouverture.
    expect(
      screen.queryByRole('button', { name: /Ouvrir la fiche/i }),
    ).not.toBeInTheDocument();
    // Mais le bouton Quitter reste visible.
    expect(screen.getByRole('button', { name: /Quitter la campagne/i })).toBeInTheDocument();
    // Le feed d'activité est un outil MJ — masqué côté joueur (JALON 22.3).
    expect(
      screen.queryByRole('region', { name: /Journal de bord de la campagne/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Activité récente')).not.toBeInTheDocument();
  });

  it('accède aux espaces Séances et Rencontres (pas seulement le meneur)', () => {
    // Les deux écrans sont lisibles par tout membre (rules 23.1 / 24.1) et ont
    // chacun un état vide rédigé pour un joueur — mais leur seul point d'entrée
    // était enfermé dans le bloc MJ, ce qui rendait le suivi de combat
    // inaccessible aux joueurs. Cf. `docs/plans/UX-AUDIT-2026-08.md > B-2`.
    authHolder.user = { uid: 'uid-2' };
    stateHolder.campaign = mkCampaign({ id: 'c-1', gmIds: ['uid-1'] });
    stateHolder.members = [mkMember({ userId: 'uid-2', role: 'member' })];
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: /Séances/i }));
    expect(navigateMock).toHaveBeenCalledWith('/campaigns/c-1/sessions');

    fireEvent.click(screen.getByRole('button', { name: /Rencontres/i }));
    expect(navigateMock).toHaveBeenCalledWith('/campaigns/c-1/encounters');

    // En revanche, préparation et administration restent au meneur.
    expect(screen.queryByRole('button', { name: /^Cartes$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Réglages/i })).not.toBeInTheDocument();
  });

  it('clic retour navigue vers /campaigns', () => {
    authHolder.user = { uid: 'uid-2' };
    stateHolder.campaign = mkCampaign({ gmIds: ['uid-1'] });
    stateHolder.members = [mkMember({ userId: 'uid-2' })];
    renderScreen();

    // Le bouton de retour utilise le même label que aria-label.
    const backButtons = screen.getAllByRole('button', { name: /Mes campagnes/i });
    fireEvent.click(backButtons[0]!);
    expect(navigateMock).toHaveBeenCalledWith('/campaigns');
  });

  it('affiche le cadre « premier pas » joueur + CTA « Créer un personnage » quand aucune fiche liée', () => {
    authHolder.user = { uid: 'uid-2' };
    stateHolder.campaign = mkCampaign({ gmIds: ['uid-1'] });
    stateHolder.members = [mkMember({ userId: 'uid-2', characterId: null })];
    renderScreen();

    // Un joueur fraîchement arrivé sans fiche liée voit un cadre d'accueil
    // chaleureux (miroir du « Invite tes joueurs » MJ), pas un état vide neutre.
    expect(screen.getByText('Rejoins l’aventure')).toBeInTheDocument();
    expect(screen.getByText(/Bienvenue à la table/i)).toBeInTheDocument();
    // Chemin guidé : sans fiche existante, on propose de créer (le picker « Lier
    // un existant » serait vide → masqué).
    expect(
      screen.getByRole('button', { name: /Créer un personnage/i }),
    ).toBeInTheDocument();
  });

  it('affiche le nom de la fiche liée + CTA Changer quand une fiche est liée', () => {
    authHolder.user = { uid: 'uid-2' };
    charactersHolder.characters = [
      { id: 'char-9', name: 'Lyra du Crépuscule', totalLevel: 4 },
    ];
    stateHolder.campaign = mkCampaign({ gmIds: ['uid-1'] });
    stateHolder.members = [
      mkMember({ userId: 'uid-2', characterId: 'char-9' }),
    ];
    renderScreen();

    expect(screen.getByText('Lyra du Crépuscule')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Changer/i }),
    ).toBeInTheDocument();
  });
});

describe('<CampaignDetailScreen> — section Mon personnage masquée pour le MJ pur', () => {
  it("ne rend PAS la section pour un MJ sans doc member", () => {
    authHolder.user = { uid: 'uid-1' };
    stateHolder.campaign = mkCampaign({ gmIds: ['uid-1'] });
    stateHolder.members = [mkMember({ userId: 'uid-2', role: 'member' })];
    renderScreen();

    expect(screen.queryByText(/Mon personnage/i)).not.toBeInTheDocument();
  });
});
