import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import {
  CampaignContentProvider,
  useCampaignContent,
  type CampaignContentContextValue,
} from '../campaign-content-context';

/**
 * Petite sonde qui rend le campaignId courant dans le DOM. Sert à asserter
 * la propagation Provider → useCampaignContent sans dépendre d'un wrapper
 * de plus haut niveau.
 */
function ContextProbe({
  capture,
}: {
  capture: (value: CampaignContentContextValue) => void;
}): JSX.Element {
  const value = useCampaignContent();
  capture(value);
  return <span data-testid="campaign-id">{value.campaignId ?? 'null'}</span>;
}

describe('CampaignContentContext', () => {
  it('retourne campaignId=null sans Provider monté', () => {
    let captured: CampaignContentContextValue | null = null;
    const { getByTestId } = render(
      <ContextProbe capture={(v) => (captured = v)} />,
    );
    expect(captured).not.toBeNull();
    expect(captured!.campaignId).toBeNull();
    expect(getByTestId('campaign-id').textContent).toBe('null');
  });

  it('propage campaignId="abc" quand Provider monté', () => {
    let captured: CampaignContentContextValue | null = null;
    const { getByTestId } = render(
      <CampaignContentProvider campaignId="abc">
        <ContextProbe capture={(v) => (captured = v)} />
      </CampaignContentProvider>,
    );
    expect(captured).not.toBeNull();
    expect(captured!.campaignId).toBe('abc');
    expect(getByTestId('campaign-id').textContent).toBe('abc');
  });

  it('propage campaignId=null quand Provider monté avec null explicite', () => {
    let captured: CampaignContentContextValue | null = null;
    render(
      <CampaignContentProvider campaignId={null}>
        <ContextProbe capture={(v) => (captured = v)} />
      </CampaignContentProvider>,
    );
    expect(captured).not.toBeNull();
    expect(captured!.campaignId).toBeNull();
  });

  it('mémoïse la valeur — la référence reste stable entre re-renders avec même campaignId', () => {
    const captures: CampaignContentContextValue[] = [];
    const { rerender } = render(
      <CampaignContentProvider campaignId="stable">
        <ContextProbe capture={(v) => captures.push(v)} />
      </CampaignContentProvider>,
    );
    rerender(
      <CampaignContentProvider campaignId="stable">
        <ContextProbe capture={(v) => captures.push(v)} />
      </CampaignContentProvider>,
    );
    expect(captures.length).toBe(2);
    // Même référence d'objet — preuve que useMemo n'a pas recréé la value.
    expect(captures[0]).toBe(captures[1]);
  });

  it('produit une nouvelle référence quand campaignId change', () => {
    const captures: CampaignContentContextValue[] = [];
    const { rerender } = render(
      <CampaignContentProvider campaignId="a">
        <ContextProbe capture={(v) => captures.push(v)} />
      </CampaignContentProvider>,
    );
    rerender(
      <CampaignContentProvider campaignId="b">
        <ContextProbe capture={(v) => captures.push(v)} />
      </CampaignContentProvider>,
    );
    const [first, second] = captures;
    expect(first?.campaignId).toBe('a');
    expect(second?.campaignId).toBe('b');
    expect(first).not.toBe(second);
  });
});
