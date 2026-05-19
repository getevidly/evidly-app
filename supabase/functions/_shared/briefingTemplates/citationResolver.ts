// briefingTemplates/citationResolver.ts — resolve regulatory citation IDs to display text

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { CitationResolution } from './types.ts';

/**
 * Look up a regulatory_citations row by ID.
 * Falls back to plain text when ID is null or row not found.
 * regulatory_citations is currently empty on PROD — every call hits fallback.
 */
export async function resolveCitation(
  supabase: SupabaseClient,
  citation_id: string | null,
  fallback_text: string,
): Promise<CitationResolution> {
  if (!citation_id) {
    return { text: fallback_text, source_url: null, verified: false };
  }

  try {
    const { data, error } = await supabase
      .from('regulatory_citations')
      .select('display_text, source_pdf_url')
      .eq('id', citation_id)
      .maybeSingle();

    if (error || !data) {
      return { text: fallback_text, source_url: null, verified: false };
    }

    return {
      text: data.display_text,
      source_url: data.source_pdf_url || null,
      verified: true,
    };
  } catch {
    return { text: fallback_text, source_url: null, verified: false };
  }
}

/**
 * Format a citation for inclusion in briefing text.
 * Verified citations use a citation: URI scheme for downstream rendering.
 */
export function formatCitation(
  resolution: CitationResolution,
  citation_id: string | null,
): string {
  if (resolution.verified && citation_id) {
    return `[${resolution.text}](citation:${citation_id})`;
  }
  return resolution.text;
}
