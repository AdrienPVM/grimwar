import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { useWizardStore, EMPTY_DRAFT } from '@/shared/lib/slices/wizard-slice';
import { createEmptyClassSubChoices } from '@/shared/types/character';

import { ClassSubChoicesSection } from '../class-sub-choices-section';

/**
 * Garde visible "0 option" pour les choosers de classe (plan 13.9 exigence
 * héritée 13.8 #4 — UAT 2026-05-17 généralisée).
 *
 * Mocke `useContent` pour retourner des bundles vides → chaque chooser tombe
 * sur sa bannière `ChooserMissingDataBanner` avec `role="alert"` + marker
 * `data-chooser-empty="..."`. Aucun `return null` silencieux toléré.
 *
 * C'est le filet de défense en profondeur quand le schéma strict + freshness
 * mechanism n'ont pas suffi (cache piégé, autre profil navigateur, hoquet
 * réseau). Pattern identique à `steps/ancestry/__tests__/chooser-stale-options`.
 */

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (_type: string) => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('@/shared/lib/content-loader', () => ({
  invalidatePublicContent: vi.fn().mockResolvedValue(undefined),
}));

function setPrimary(classId: string): void {
  useWizardStore.setState({
    draft: {
      ...EMPTY_DRAFT,
      classes: [{ classId, level: 1, ...createEmptyClassSubChoices() }],
      primaryClassId: classId,
    },
    currentStep: 'class',
    visitedSteps: ['identity', 'class'],
  });
}

beforeEach(() => {
  useWizardStore.setState({ draft: { ...EMPTY_DRAFT } });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Class choosers — bannière visible quand 0 option (durcissement A généralisé)', () => {
  it('Cleric sans divineOrders → bannière visible, marker cleric-divine-order', () => {
    setPrimary('cleric');
    render(<ClassSubChoicesSection />);
    expect(
      document.querySelector('[data-chooser-empty="cleric-divine-order"]'),
    ).not.toBeNull();
  });

  it('Druid sans primalOrders → bannière visible, marker druid-primal-order', () => {
    setPrimary('druid');
    render(<ClassSubChoicesSection />);
    expect(
      document.querySelector('[data-chooser-empty="druid-primal-order"]'),
    ).not.toBeNull();
  });

  it('Fighter sans feats fighting-style → bannière style + bannière mastery', () => {
    setPrimary('fighter');
    render(<ClassSubChoicesSection />);
    expect(
      document.querySelector('[data-chooser-empty="fighter-fighting-style"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-chooser-empty="weapon-mastery-fighter"]'),
    ).not.toBeNull();
  });

  it('Barbarian / Paladin / Ranger / Rogue sans items → bannière mastery par classe', () => {
    for (const classId of ['barbarian', 'paladin', 'ranger', 'rogue'] as const) {
      setPrimary(classId);
      const { unmount } = render(<ClassSubChoicesSection />);
      expect(
        document.querySelector(`[data-chooser-empty="weapon-mastery-${classId}"]`),
      ).not.toBeNull();
      unmount();
    }
  });

  it('Warlock sans invocations → bannière visible, marker warlock-invocation', () => {
    setPrimary('warlock');
    render(<ClassSubChoicesSection />);
    expect(
      document.querySelector('[data-chooser-empty="warlock-invocation"]'),
    ).not.toBeNull();
  });

  it('Wizard sans spells → bannière visible, marker wizard-spellbook', () => {
    setPrimary('wizard');
    render(<ClassSubChoicesSection />);
    expect(
      document.querySelector('[data-chooser-empty="wizard-spellbook"]'),
    ).not.toBeNull();
  });
});
