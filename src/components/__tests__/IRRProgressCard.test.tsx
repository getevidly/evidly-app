import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IRRProgressCard } from '../dashboard/IRRProgressCard';

// Mock useIRRSubmission — controls the card's render state
const mockUseIRRSubmission = vi.fn();
vi.mock('../../hooks/useIRRSubmission', () => ({
  useIRRSubmission: () => mockUseIRRSubmission(),
}));

function renderCard() {
  return render(
    <MemoryRouter>
      <IRRProgressCard />
    </MemoryRouter>
  );
}

describe('IRRProgressCard', () => {
  it('returns null when loading', () => {
    mockUseIRRSubmission.mockReturnValue({ submission: null, isLoading: true });
    const { container } = renderCard();
    expect(container.firstChild).toBeNull();
  });

  it('renders empty state when no submission', () => {
    mockUseIRRSubmission.mockReturnValue({ submission: null, isLoading: false });
    renderCard();
    expect(screen.getByText(/Operations Check/)).toBeInTheDocument();
    expect(screen.getByText(/See how your readiness improves/)).toBeInTheDocument();
  });

  it('renders posture badge with submission', () => {
    mockUseIRRSubmission.mockReturnValue({
      isLoading: false,
      submission: {
        posture: 'moderate',
        created_at: '2026-01-15T12:00:00Z',
        q1_receiving_temps: 1,
        q2_cold_hot_holding: 2,
        q3_cooldown_logs: 3,
        q4_checklists_haccp: 1,
        q5_food_handler_cards: 2,
        q6_staff_cert_tracking: 3,
        q7_hood_cleaning: 1,
        q8_fire_suppression: 2,
        q9_vendor_performance: 1,
        q10_vendor_records: 3,
        q11_vendor_coi: 2,
      },
    });
    renderCard();
    expect(screen.getByText('Some Areas Need Attention')).toBeInTheDocument();
    expect(screen.getByText('Your Operations Check')).toBeInTheDocument();
  });

  it('never shows a compliance score or percentage', () => {
    mockUseIRRSubmission.mockReturnValue({
      isLoading: false,
      submission: {
        posture: 'strong',
        created_at: '2026-01-15T12:00:00Z',
        q1_receiving_temps: 1, q2_cold_hot_holding: 1, q3_cooldown_logs: 1,
        q4_checklists_haccp: 1, q5_food_handler_cards: 1, q6_staff_cert_tracking: 1,
        q7_hood_cleaning: 1, q8_fire_suppression: 1, q9_vendor_performance: 1,
        q10_vendor_records: 1, q11_vendor_coi: 1,
      },
    });
    const { container } = renderCard();
    const text = container.textContent || '';
    // Must never contain a percentage or "score"
    expect(text).not.toMatch(/\d+%/);
    expect(text.toLowerCase()).not.toContain('score');
  });
});
