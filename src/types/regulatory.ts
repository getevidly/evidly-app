// ── DB Row Types (match Supabase schema: 20260224000000_regulatory_change_tables.sql) ──

export interface DbRegulatorySource {
  id: string;
  code_name: string;
  code_short: string;
  jurisdiction_type: 'federal' | 'state' | 'county' | 'city' | 'industry';
  jurisdiction_code: string | null;
  current_edition: string | null;
  issuing_body: string;
  monitoring_url: string | null;
  last_checked: string | null;
  last_change_detected: string | null;
  active: boolean;
  created_at: string;
}

export interface DbRegulatoryChange {
  id: string;
  source_id: string;
  change_type: string;
  title: string;
  summary: string;
  impact_description: string;
  impact_level: 'critical' | 'moderate' | 'informational';
  affected_pillars: string[];
  affected_equipment_types: string[];
  affected_states: string[] | null;
  effective_date: string | null;
  source_url: string | null;
  raw_input_text: string | null;
  ai_generated: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published: boolean;
  published_at: string | null;
  affected_location_count: number;
  created_at: string;
}

export interface DbRegulatoryChangeRead {
  id: string;
  change_id: string;
  user_id: string;
  organization_id: string;
  read_at: string;
}

export interface DbChangeWithSource extends DbRegulatoryChange {
  regulatory_sources: DbRegulatorySource;
  regulatory_change_reads?: DbRegulatoryChangeRead[];
}

// ── Impact Level Mapping ────────────────────────────────
// DB: critical | moderate | informational
// UI: action_required | awareness | informational

import type { ImpactLevel, RegulatorySource } from '../lib/regulatoryMonitor';

export function dbImpactToUiImpact(dbLevel: string | null | undefined): ImpactLevel {
  switch (dbLevel) {
    case 'critical': return 'action_required';
    case 'moderate': return 'awareness';
    case 'informational': return 'informational';
    default: return 'informational';
  }
}

// ── Source Category Mapping ─────────────────────────────
// Maps DB regulatory_sources → UI RegulatorySource union

export function dbSourceToUiSource(source: DbRegulatorySource | null | undefined): RegulatorySource {
  if (!source) return 'FDA';
  const cs = source.code_short ?? '';
  if (cs === 'fda_food_code') return 'FDA';
  if (cs.startsWith('nfpa_')) return 'NFPA';
  if (cs === 'cal_osha') return 'OSHA';
  if (source.jurisdiction_type === 'county') return 'County';
  if (source.jurisdiction_type === 'state') return 'California';
  // Industry fallback (IMC, IFC)
  return 'NFPA';
}
