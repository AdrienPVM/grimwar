import { describe, expect, it } from 'vitest';

import { campaignIdFromPath } from '../campaign-route';

/**
 * `campaignIdFromPath` est la seule source de « dans quelle campagne suis-je ? »
 * pour les écouteurs montés au-dessus des routes (`campaign-notifications.tsx`),
 * là où `useParams()` ne renvoie rien. Un faux positif y abonnerait un listener
 * Firestore sur un identifiant qui n'existe pas.
 */
describe('campaignIdFromPath', () => {
  it('reconnaît le détail de campagne et tous ses sous-écrans', () => {
    expect(campaignIdFromPath('/campaigns/c-1')).toBe('c-1');
    expect(campaignIdFromPath('/campaigns/c-1/')).toBe('c-1');
    expect(campaignIdFromPath('/campaigns/c-1/journal')).toBe('c-1');
    expect(campaignIdFromPath('/campaigns/c-1/handouts')).toBe('c-1');
    expect(campaignIdFromPath('/campaigns/c-1/sessions/s-9')).toBe('c-1');
    expect(campaignIdFromPath('/campaigns/c-1/encounters/e-3')).toBe('c-1');
    expect(campaignIdFromPath('/campaigns/c-1/npcs/n-2')).toBe('c-1');
    expect(campaignIdFromPath('/campaigns/c-1/members/u-7/sheet')).toBe('c-1');
  });

  it('reconnaît les cartes, qui appartiennent à leur campagne', () => {
    expect(campaignIdFromPath('/map-proto/cloud/c-2')).toBe('c-2');
    expect(campaignIdFromPath('/map-proto/cloud/c-2/import')).toBe('c-2');
    expect(campaignIdFromPath('/map-proto/cloud/c-2/maps/m-1')).toBe('c-2');
    expect(campaignIdFromPath('/map-proto/cloud/c-2/maps/m-1/tv')).toBe('c-2');
  });

  it('rejette les segments réservés qui occupent la place d’un identifiant', () => {
    expect(campaignIdFromPath('/campaigns/join')).toBeNull();
    expect(campaignIdFromPath('/campaigns/new')).toBeNull();
  });

  it('rejette les routes qui n’appartiennent à aucune campagne', () => {
    expect(campaignIdFromPath('/')).toBeNull();
    expect(campaignIdFromPath('/campaigns')).toBeNull();
    expect(campaignIdFromPath('/campaigns/')).toBeNull();
    expect(campaignIdFromPath('/character/x-1')).toBeNull();
    expect(campaignIdFromPath('/codex')).toBeNull();
    expect(campaignIdFromPath('/account/content')).toBeNull();
    expect(campaignIdFromPath('/map-proto')).toBeNull();
  });
});
