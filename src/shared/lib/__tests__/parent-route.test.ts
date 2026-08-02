import { describe, expect, it } from 'vitest';

import { parentRouteFor } from '../parent-route';

/**
 * Le bouton Retour global remonte dans la HIÉRARCHIE de l'app. Ces cas figent
 * la table de correspondance : chaque route déclarée dans `src/routes.tsx` doit
 * ramener là où l'utilisateur pense revenir, et l'annonce accessible doit
 * nommer cette destination — pas « la bibliothèque » par défaut.
 */
describe('parentRouteFor', () => {
  it('ne propose aucun retour depuis la racine', () => {
    expect(parentRouteFor('/')).toBeNull();
    expect(parentRouteFor('')).toBeNull();
  });

  it('ramène les écrans de premier niveau à la bibliothèque', () => {
    for (const path of ['/create', '/character/abc123', '/codex', '/account', '/campaigns']) {
      expect(parentRouteFor(path), path).toEqual({
        to: '/',
        labelKey: 'nav.back.aria',
      });
    }
  });

  it('remonte une campagne à la liste des campagnes', () => {
    expect(parentRouteFor('/campaigns/cid1')).toEqual({
      to: '/campaigns',
      labelKey: 'nav.back.campaigns',
    });
  });

  it('remonte « rejoindre par code » à la liste, pas à une campagne fantôme', () => {
    // Piège : « join » ressemble à un identifiant de campagne. Sans son motif
    // dédié placé en amont, le retour pointerait `/campaigns/join` → `/campaigns`
    // par le motif générique — juste ici par accident, mais faux dès qu'un
    // segment supplémentaire s'ajouterait.
    expect(parentRouteFor('/campaigns/join')).toEqual({
      to: '/campaigns',
      labelKey: 'nav.back.campaigns',
    });
  });

  it('remonte les sous-écrans de campagne à la campagne', () => {
    for (const leaf of ['sessions', 'encounters', 'journal', 'handouts', 'npcs']) {
      expect(parentRouteFor(`/campaigns/cid1/${leaf}`), leaf).toEqual({
        to: '/campaigns/cid1',
        labelKey: 'campaigns.memberSheet.back',
      });
    }
  });

  it('remonte un détail à SA liste, et non à la campagne', () => {
    expect(parentRouteFor('/campaigns/cid1/sessions/s1')).toEqual({
      to: '/campaigns/cid1/sessions',
      labelKey: 'sessions.detail.back',
    });
    expect(parentRouteFor('/campaigns/cid1/encounters/e1')).toEqual({
      to: '/campaigns/cid1/encounters',
      labelKey: 'encounters.detail.back',
    });
    expect(parentRouteFor('/campaigns/cid1/npcs/n1')).toEqual({
      to: '/campaigns/cid1/npcs',
      labelKey: 'npcs.detail.back',
    });
  });

  it('remonte la fiche lue par le MJ à la campagne (son roster)', () => {
    expect(parentRouteFor('/campaigns/cid1/members/uid9/sheet')).toEqual({
      to: '/campaigns/cid1',
      labelKey: 'campaigns.memberSheet.back',
    });
  });

  it('remonte une carte à sa campagne, pas au prototype', () => {
    expect(parentRouteFor('/map-proto/cloud/cid1')).toEqual({
      to: '/campaigns/cid1',
      labelKey: 'campaigns.memberSheet.back',
    });
    for (const leaf of ['import', 'maps/m1']) {
      expect(parentRouteFor(`/map-proto/cloud/cid1/${leaf}`), leaf).toEqual({
        to: '/map-proto/cloud/cid1',
        labelKey: 'nav.back.maps',
      });
    }
    // La vue TV masque le bandeau, mais la résolution doit rester cohérente si
    // un jour on l'y remonte.
    expect(parentRouteFor('/map-proto/cloud/cid1/maps/m1/tv')).toEqual({
      to: '/map-proto/cloud/cid1',
      labelKey: 'nav.back.maps',
    });
  });

  it('remonte la chaîne du contenu custom cran par cran', () => {
    expect(parentRouteFor('/account/content')).toEqual({
      to: '/account',
      labelKey: 'nav.back.account',
    });
    expect(parentRouteFor('/account/content/new')).toEqual({
      to: '/account/content',
      labelKey: 'nav.back.content',
    });
    expect(parentRouteFor('/account/content/edit/pack1')).toEqual({
      to: '/account/content',
      labelKey: 'nav.back.content',
    });
  });

  it('tolère une barre oblique finale', () => {
    expect(parentRouteFor('/campaigns/cid1/encounters/e1/')).toEqual({
      to: '/campaigns/cid1/encounters',
      labelKey: 'encounters.detail.back',
    });
  });

  it('rabat une route inconnue sur la bibliothèque', () => {
    expect(parentRouteFor('/route/qui/nexiste/pas')).toEqual({
      to: '/',
      labelKey: 'nav.back.aria',
    });
  });
});
