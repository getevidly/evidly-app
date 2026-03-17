import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock DemoContext and AuthContext before importing the hook
vi.mock('../../contexts/DemoContext', () => ({
  useDemo: () => ({ isDemoMode: true, presenterMode: false }),
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: null, loading: false }),
}));

import { useDemoGuard } from '../useDemoGuard';

describe('useDemoGuard', () => {
  it('guardAction calls callback immediately (passthrough)', () => {
    const { result } = renderHook(() => useDemoGuard());
    const callback = vi.fn();

    act(() => {
      result.current.guardAction('edit', 'test-feature', callback);
    });

    expect(callback).toHaveBeenCalledOnce();
  });

  it('exposes isDemoMode from context', () => {
    const { result } = renderHook(() => useDemoGuard());
    expect(result.current.isDemoMode).toBe(true);
  });

  it('showUpgrade defaults to false', () => {
    const { result } = renderHook(() => useDemoGuard());
    expect(result.current.showUpgrade).toBe(false);
  });
});
