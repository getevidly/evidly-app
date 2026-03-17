import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBell } from '../notifications/NotificationBell';

// Mock useNotifications from NotificationContext
const mockUseNotifications = vi.fn();
vi.mock('../../contexts/NotificationContext', () => ({
  useNotifications: () => mockUseNotifications(),
}));

describe('NotificationBell', () => {
  it('does not render badge when unreadCount is 0', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 0,
      unifiedNotifications: [],
    });
    const { container } = render(<NotificationBell onClick={() => {}} />);
    // Button exists, but no badge span inside
    const button = container.querySelector('button');
    expect(button).toBeTruthy();
    // Badge is the span with absolute positioning — should not exist
    const badge = container.querySelector('span.absolute, span[class*="absolute"]');
    expect(badge).toBeNull();
  });

  it('renders badge showing count for small numbers', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 3,
      unifiedNotifications: [
        { readAt: null, severity: 'normal' },
        { readAt: null, severity: 'normal' },
        { readAt: null, severity: 'normal' },
      ],
    });
    render(<NotificationBell onClick={() => {}} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders "9+" for counts above 9', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 15,
      unifiedNotifications: Array.from({ length: 15 }, () => ({
        readAt: null,
        severity: 'normal',
      })),
    });
    render(<NotificationBell onClick={() => {}} />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('fires onClick callback', () => {
    mockUseNotifications.mockReturnValue({
      unreadCount: 0,
      unifiedNotifications: [],
    });
    const handleClick = vi.fn();
    render(<NotificationBell onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
