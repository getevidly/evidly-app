// briefingTemplates/citationResolver.ts — resolve citations from the citations table
// and statute deltas from jurisdictions.grading_config.statute_deltas_vs_calcode[]
//
// Section number normalization:
//   - citations table stores WITHOUT § prefix (e.g. "113996")
//   - statute_deltas_vs_calcode stores WITH § prefix (e.g. "§113996")
//   - This module accepts either format and normalizes before querying.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Types ────────────────────────────────────────────────────────────

export interface ResolvedCitation {
  found: boolean;
  citation_id: string;
  section_number: string; // bare number, no § prefix (e.g. "113996")
  short_title: string;
  full_text: string | null;
  source_url: string | null;
  metadata: Record<string, unknown>;
}

export interface StatuteDelta {
  cites_section: string;
  cites_code_family: string;
  delta_type: string;
  local_text: string;
  local_authority_name: string;
  local_source_url?: string;
  local_ordinance_number?: string;
  effective_date?: string;
  operational_delta?: string;
  notes?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Strip § prefix if present: "§113996" → "113996", "113996" → "113996" */
function stripSection(s: string): string {
  return s.replace(/^§/, '');
}

/** Add § prefix if absent: "113996" → "§113996", "§113996" → "§113996" */
function ensureSection(s: string): string {
  return s.startsWith('§') ? s : `§${s}`;
}

// ── resolveCitation ──────────────────────────────────────────────────

/**
 * Look up a citation from the citations table by code_family + section_number.
 * Accepts section_number with or without § prefix — normalizes before query.
 * Returns null if not found. Never throws — returns null on error.
 */
export async function resolveCitation(
  supabase: SupabaseClient,
  code_family: string,
  section_number: string,
  edition_year = 2026,
): Promise<ResolvedCitation | null> {
  const normalized = stripSection(section_number);

  try {
    const { data, error } = await supabase
      .from('citations')
      .select('id, section_number, short_title, full_text, source_url, metadata')
      .eq('code_family', code_family)
      .eq('section_number', normalized)
      .eq('current_edition_year', edition_year)
      .maybeSingle();

    if (error || !data) return null;

    return {
      found: true,
      citation_id: data.id as string,
      section_number: data.section_number as string,
      short_title: data.short_title as string,
      full_text: (data.full_text as string) || null,
      source_url: (data.source_url as string) || null,
      metadata: (data.metadata as Record<string, unknown>) || {},
    };
  } catch {
    return null;
  }
}

// ── resolveStatuteDelta ──────────────────────────────────────────────

/**
 * Look up a matching statute delta from the jurisdiction's
 * grading_config.statute_deltas_vs_calcode[] array.
 * Matches on cites_code_family + cites_section (§-prefixed in DB).
 * Returns null if jurisdiction has no delta for this section.
 */
export async function resolveStatuteDelta(
  supabase: SupabaseClient,
  jurisdiction_id: string,
  code_family: string,
  section_number: string,
): Promise<StatuteDelta | null> {
  const sectionWithPrefix = ensureSection(section_number);

  try {
    const { data, error } = await supabase
      .from('jurisdictions')
      .select('grading_config')
      .eq('id', jurisdiction_id)
      .maybeSingle();

    if (error || !data) return null;

    const config = data.grading_config as Record<string, unknown> | null;
    if (!config) return null;

    const deltas = config.statute_deltas_vs_calcode as StatuteDelta[] | undefined;
    if (!Array.isArray(deltas) || deltas.length === 0) return null;

    const match = deltas.find(
      (d) => d.cites_code_family === code_family && d.cites_section === sectionWithPrefix,
    );

    return match || null;
  } catch {
    return null;
  }
}

// ── renderCitationReference ──────────────────────────────────────────

/**
 * Format a citation for inclusion in briefing prose.
 * No delta:   "CalCode §113996 (Hot and cold holding, potentially hazardous food)"
 * With delta: "CalCode §113996 (Hot and cold holding, potentially hazardous food) — Berkeley Environmental Health BMC §11.28.220 is stricter"
 */
export function renderCitationReference(
  citation: ResolvedCitation,
  delta?: StatuteDelta | null,
): string {
  const base = `CalCode §${citation.section_number} (${citation.short_title})`;

  if (delta) {
    const authority = delta.local_authority_name || 'local authority';
    const ordinance = delta.local_ordinance_number || '';
    const type = delta.delta_type || 'different';
    const ordStr = ordinance ? ` ${ordinance}` : '';
    return `${base} \u2014 ${authority}${ordStr} is ${type}`;
  }

  return base;
}

/**
 * Format a resolved citation as a markdown link for downstream rendering.
 * BriefCard (Step 6) will make [text](citation:uuid) links clickable.
 */
export function formatCitation(citation: ResolvedCitation): string {
  return `[CalCode \u00A7${citation.section_number}](citation:${citation.citation_id})`;
}
