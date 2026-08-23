import { beforeEach, describe, expect, it } from 'vitest';

import { effectiveLocale } from '@/shared/lib/rules/table-language';
import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';
import { useLocaleStore } from '@/shared/lib/slices/locale-slice';
import type { CampaignSettings } from '@/shared/types/campaign';

function settings(language: 'fr' | 'en'): CampaignSettings {
  return {
    language,
    diceMode: 'digital',
    variants: {
      featAtLevel1: false,
      flanking: false,
      slowHealing: false,
      grittyRealism: false,
    },
  };
}

beforeEach(() => {
  useLocaleStore.setState({ locale: 'fr', userLocale: null, tableLocale: null });
  useActiveCampaignStore.getState().clearActiveCampaign();
  useLocaleStore.setState({ locale: 'fr', userLocale: null, tableLocale: null });
});

describe('effectiveLocale', () => {
  it('rend FR quand rien n’est posé', () => {
    expect(effectiveLocale(null, null)).toBe('fr');
  });

  it('la table s’applique quand l’utilisateur n’a jamais tranché', () => {
    expect(effectiveLocale(null, 'en')).toBe('en');
  });

  it('le choix du compte l’emporte sur la table', () => {
    expect(effectiveLocale('fr', 'en')).toBe('fr');
    expect(effectiveLocale('en', 'fr')).toBe('en');
  });

  it('le choix du compte s’applique hors de toute table', () => {
    expect(effectiveLocale('en', null)).toBe('en');
  });
});

describe('câblage campagne active → locale', () => {
  it('charger les réglages d’une table anglophone bascule la locale effective', () => {
    const store = useActiveCampaignStore.getState();
    store.setActiveCampaign('c-1');
    store.setActiveCampaignSettings(settings('en'));
    expect(useLocaleStore.getState().locale).toBe('en');
  });

  it('quitter la table rend la locale au défaut', () => {
    const store = useActiveCampaignStore.getState();
    store.setActiveCampaign('c-1');
    store.setActiveCampaignSettings(settings('en'));
    useActiveCampaignStore.getState().clearActiveCampaign();
    expect(useLocaleStore.getState().locale).toBe('fr');
  });

  it('changer de table oublie la langue de la précédente sans attendre le fetch', () => {
    const store = useActiveCampaignStore.getState();
    store.setActiveCampaign('c-1');
    store.setActiveCampaignSettings(settings('en'));
    // Seconde fiche, autre table : les réglages ne sont pas encore chargés.
    useActiveCampaignStore.getState().setActiveCampaign('c-2');
    expect(useLocaleStore.getState().locale).toBe('fr');
  });

  it('une table anglophone ne bouscule pas un joueur qui a choisi le français', () => {
    useLocaleStore.getState().setLocale('fr');
    const store = useActiveCampaignStore.getState();
    store.setActiveCampaign('c-1');
    store.setActiveCampaignSettings(settings('en'));
    expect(useLocaleStore.getState().locale).toBe('fr');
  });
});
