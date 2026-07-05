import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CampaignStatusChip } from '../campaign-status-chip';

describe('<CampaignStatusChip>', () => {
  it("ne rend rien pour une campagne active (pas de bruit visuel)", () => {
    const { container } = render(<CampaignStatusChip status="active" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("rend « En pause » pour une campagne en pause", () => {
    render(<CampaignStatusChip status="paused" />);
    expect(screen.getByText('En pause')).toBeInTheDocument();
  });

  it("rend « Archivée » pour une campagne archivée", () => {
    render(<CampaignStatusChip status="archived" />);
    expect(screen.getByText('Archivée')).toBeInTheDocument();
  });
});
