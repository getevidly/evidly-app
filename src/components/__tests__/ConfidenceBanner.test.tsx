import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidenceBanner } from '../dashboard/shared/ConfidenceBanner';

describe('ConfidenceBanner', () => {
  it('returns null when locationCount is 0', () => {
    const { container } = render(
      <ConfidenceBanner status="covered" headline="Test" locationCount={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders "All Clear" for covered status', () => {
    render(
      <ConfidenceBanner status="covered" headline="All locations covered" locationCount={3} />
    );
    expect(screen.getByText('All Clear')).toBeInTheDocument();
    expect(screen.getByText('All locations covered')).toBeInTheDocument();
  });

  it('renders badge with attention count', () => {
    render(
      <ConfidenceBanner
        status="attention"
        headline="Some need review"
        locationCount={3}
        attentionCount={1}
      />
    );
    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('renders "Action Required" for risk status', () => {
    render(
      <ConfidenceBanner status="risk" headline="Immediate action needed" locationCount={3} />
    );
    expect(screen.getByText('Action Required')).toBeInTheDocument();
  });

  it('does not render badge when attentionCount is 0', () => {
    render(
      <ConfidenceBanner
        status="attention"
        headline="Review needed"
        locationCount={3}
        attentionCount={0}
      />
    );
    expect(screen.queryByText('0/3')).not.toBeInTheDocument();
  });
});
