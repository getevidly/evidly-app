import { describe, it, expect, beforeEach } from 'vitest';
import {
  setDemoGuardMode,
  getDemoGuardMode,
  isDemoWriteGuardActive,
} from '../supabaseGuard';

describe('supabaseGuard', () => {
  beforeEach(() => {
    // Reset to live mode before each test
    setDemoGuardMode('live');
  });

  it('defaults to live mode after reset', () => {
    expect(getDemoGuardMode()).toBe('live');
    expect(isDemoWriteGuardActive()).toBe(false);
  });

  it('anonymous_demo activates write guard', () => {
    setDemoGuardMode('anonymous_demo');
    expect(getDemoGuardMode()).toBe('anonymous_demo');
    expect(isDemoWriteGuardActive()).toBe(true);
  });

  it('authenticated_demo activates write guard', () => {
    setDemoGuardMode('authenticated_demo');
    expect(getDemoGuardMode()).toBe('authenticated_demo');
    expect(isDemoWriteGuardActive()).toBe(true);
  });

  it('transitions back to live correctly', () => {
    setDemoGuardMode('anonymous_demo');
    expect(isDemoWriteGuardActive()).toBe(true);

    setDemoGuardMode('live');
    expect(isDemoWriteGuardActive()).toBe(false);
    expect(getDemoGuardMode()).toBe('live');
  });

  it('transitions between demo modes', () => {
    setDemoGuardMode('anonymous_demo');
    expect(getDemoGuardMode()).toBe('anonymous_demo');

    setDemoGuardMode('authenticated_demo');
    expect(getDemoGuardMode()).toBe('authenticated_demo');
    expect(isDemoWriteGuardActive()).toBe(true);
  });
});
