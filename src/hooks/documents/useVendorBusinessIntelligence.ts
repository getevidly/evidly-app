import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export interface VendorBusinessRow {
  vendor_id: string;
  vendor_name: string;
  docs: {
    id: string;
    name: string;
    type: string | null;
    status: string;
    expiry_date: string | null;
    days_until_expiry: number | null;
    request_stage: string | null;
    request_token_days_remaining: number | null;
    created_at: string;
  }[];
  /** Computed signals */
  expiring_count: number;
  expired_count: number;
  missing_coi: boolean;
  request_in_flight: boolean;
}

export interface VendorBusinessIntelligence {
  vendors: VendorBusinessRow[];
  /** 'empty' = no vendors, 'no_docs' = vendors but 0 business docs, 'populated' = has docs */
  state: 'loading' | 'empty' | 'no_docs' | 'populated';
  urgentCount: number;
  loading: boolean;
  refetch: () => void;
}

export function useVendorBusinessIntelligence(orgId: string | undefined): VendorBusinessIntelligence {
  const [vendors, setVendors] = useState<VendorBusinessRow[]>([]);
  const [hasAnyVendors, setHasAnyVendors] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);

    // Check if org has ANY vendors
    const { count: vendorCount } = await supabase
      .from('vendor_client_relationships')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'active');

    setHasAnyVendors((vendorCount || 0) > 0);

    // Get business docs from enriched view
    const { data: docs } = await supabase
      .from('v_documents_enriched')
      .select('id, name, type, status, expiry_date, days_until_expiry, request_stage, request_token_days_remaining, created_at, vendor_id, vendor_name')
      .eq('organization_id', orgId)
      .eq('category', 'business')
      .order('vendor_name');

    if (!docs || docs.length === 0) {
      setVendors([]);
      setLoading(false);
      return;
    }

    // Group by vendor
    const map = new Map<string, VendorBusinessRow>();
    for (const d of docs) {
      const vid = d.vendor_id || '__unassigned__';
      const vname = d.vendor_name || 'Unassigned';
      if (!map.has(vid)) {
        map.set(vid, {
          vendor_id: vid,
          vendor_name: vname,
          docs: [],
          expiring_count: 0,
          expired_count: 0,
          missing_coi: true,
          request_in_flight: false,
        });
      }
      const row = map.get(vid)!;
      row.docs.push({
        id: d.id,
        name: d.name,
        type: d.type,
        status: d.status,
        expiry_date: d.expiry_date,
        days_until_expiry: d.days_until_expiry,
        request_stage: d.request_stage,
        request_token_days_remaining: d.request_token_days_remaining,
        created_at: d.created_at,
      });
      if (d.status === 'expiring') row.expiring_count++;
      if (d.status === 'expired') row.expired_count++;
      if (d.type?.toLowerCase().includes('coi') && (d.status === 'current' || d.status === 'expiring')) {
        row.missing_coi = false;
      }
      if (d.request_stage === 'sent' || d.request_stage === 'viewed') {
        row.request_in_flight = true;
      }
    }

    setVendors(Array.from(map.values()));
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetch(); }, [fetch]);

  const urgentCount = vendors.reduce((sum, v) => sum + v.expiring_count + v.expired_count, 0);

  let state: VendorBusinessIntelligence['state'];
  if (loading) state = 'loading';
  else if (!hasAnyVendors) state = 'empty';
  else if (vendors.length === 0) state = 'no_docs';
  else state = 'populated';

  return { vendors, state, urgentCount, loading, refetch: fetch };
}
