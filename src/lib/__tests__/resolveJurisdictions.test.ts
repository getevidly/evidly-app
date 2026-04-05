// CASINO-JIE-01 — Tests for resolveJurisdictions utility
import { describe, it, expect } from 'vitest';
import { resolveJurisdictions, type TribalOrg } from '../resolveJurisdictions';

describe('resolveJurisdictions', () => {
  const tribalOrg: TribalOrg = {
    is_tribal: true,
    tribal_jurisdiction_id: 'tribal-j-001',
    county_jurisdiction_id: 'county-j-001',
    food_safety_mode: 'advisory',
    food_safety_authority: 'TEHO',
    food_safety_advisory_text: 'Custom advisory text for this tribe.',
  };

  it('resolves tribal org → tribal food + county fire', () => {
    const result = resolveJurisdictions(tribalOrg);
    expect(result).not.toBeNull();
    expect(result!.foodJurisdictionId).toBe('tribal-j-001');
    expect(result!.fireJurisdictionId).toBe('county-j-001');
    expect(result!.isAdvisory).toBe(true);
    expect(result!.foodSafetyAuthority).toBe('TEHO');
  });

  it('returns null for non-tribal org', () => {
    const nonTribal: TribalOrg = {
      is_tribal: false,
      tribal_jurisdiction_id: null,
      county_jurisdiction_id: null,
      food_safety_mode: null,
    };
    expect(resolveJurisdictions(nonTribal)).toBeNull();
  });

  it('returns null for tribal org missing tribal_jurisdiction_id', () => {
    const incomplete: TribalOrg = {
      is_tribal: true,
      tribal_jurisdiction_id: null,
      county_jurisdiction_id: 'county-j-001',
      food_safety_mode: 'advisory',
    };
    expect(resolveJurisdictions(incomplete)).toBeNull();
  });

  it('returns null for tribal org missing county_jurisdiction_id', () => {
    const incomplete: TribalOrg = {
      is_tribal: true,
      tribal_jurisdiction_id: 'tribal-j-001',
      county_jurisdiction_id: null,
      food_safety_mode: 'advisory',
    };
    expect(resolveJurisdictions(incomplete)).toBeNull();
  });

  it('returns null when is_tribal is undefined', () => {
    const empty: TribalOrg = {};
    expect(resolveJurisdictions(empty)).toBeNull();
  });

  it('advisory mode is always true for resolved tribal orgs', () => {
    const result = resolveJurisdictions(tribalOrg);
    expect(result!.isAdvisory).toBe(true);
  });

  it('defaults food safety authority to TEHO when not specified', () => {
    const noAuthority: TribalOrg = {
      is_tribal: true,
      tribal_jurisdiction_id: 'tribal-j-002',
      county_jurisdiction_id: 'county-j-002',
      food_safety_mode: 'advisory',
      food_safety_authority: null,
    };
    const result = resolveJurisdictions(noAuthority);
    expect(result!.foodSafetyAuthority).toBe('TEHO');
  });

  it('passes through advisory text from org', () => {
    const result = resolveJurisdictions(tribalOrg);
    expect(result!.advisoryText).toBe('Custom advisory text for this tribe.');
  });

  it('food and fire jurisdiction IDs are always different for tribal orgs', () => {
    const result = resolveJurisdictions(tribalOrg);
    expect(result!.foodJurisdictionId).not.toBe(result!.fireJurisdictionId);
  });

  it('multi-outlet tribal org resolves same jurisdiction for all outlets', () => {
    // Same org record for all outlets — resolver is org-level, not location-level
    const outlets = Array.from({ length: 8 }, () => resolveJurisdictions(tribalOrg));
    const unique = new Set(outlets.map(r => `${r!.foodJurisdictionId}|${r!.fireJurisdictionId}`));
    expect(unique.size).toBe(1);
  });
});
