/**
 * AUDIT-FIX-04 / FIX 4 — Demo lead capture mutation hook
 *
 * Extracted from LeadCaptureModal to remove direct supabase.from() calls.
 * Fire-and-forget insert to demo_leads table.
 */

import { useCallback } from 'react';

export function useDemoLeadCapture() {
  const captureLead = useCallback(async (lead: {
    fullName: string;
    email: string;
    companyName: string;
    businessType: string;
  }) => {
    try {
      const { supabase } = await import('../lib/supabase');
      await supabase.from('demo_leads').insert([{
        full_name: lead.fullName,
        email: lead.email,
        organization_name: lead.companyName,
        industry_type: lead.businessType,
      }]);
    } catch {
      // Silent fail — lead capture is non-blocking
    }
  }, []);

  return { captureLead };
}
