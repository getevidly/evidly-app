/**
 * useVendorContact — Fetches vendor network entry detail + delegates
 * messaging to useThreadedConversation.
 * Existing imports/interface preserved for backward compatibility.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useThreadedConversation } from './useThreadedConversation';
import type { ThreadMessage } from './useThreadedConversation';

export type { ThreadMessage };

export interface VendorContactDetail {
  id: string;
  name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  county_primary: string;
  service_area_counties: string[];
  service_types: string[];
  tier: 'gold' | 'silver' | 'bronze';
  credentials: { ikeca: boolean; nfpa: boolean; insured: boolean };
  availability: 'available' | 'wait_list';
}

interface UseVendorContactReturn {
  vendor: VendorContactDetail | null;
  messages: ThreadMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (subject: string, body: string) => Promise<boolean>;
  refetch: () => void;
}

export function useVendorContact(vendorNetworkId: string | null): UseVendorContactReturn {
  const { profile } = useAuth();
  const [vendor, setVendor] = useState<VendorContactDetail | null>(null);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [vendorError, setVendorError] = useState<string | null>(null);

  const orgId = profile?.organization_id || null;

  const {
    messages,
    loading: threadLoading,
    error: threadError,
    sendMessage,
    refetch: threadRefetch,
  } = useThreadedConversation({
    entityType: 'vendor_network_contact',
    entityId: vendorNetworkId,
    organizationId: orgId,
    sendVia: 'vendor-network-send-message',
  });

  const fetchVendor = useCallback(async () => {
    if (!vendorNetworkId) {
      setVendor(null);
      setVendorLoading(false);
      return;
    }

    setVendorLoading(true);
    setVendorError(null);

    try {
      const { data: vendorData, error: vendorErr } = await supabase
        .from('vendor_network')
        .select('*')
        .eq('id', vendorNetworkId)
        .single();

      if (vendorErr || !vendorData) {
        setVendorError('Vendor not found');
        setVendorLoading(false);
        return;
      }

      setVendor({
        id: vendorData.id as string,
        name: vendorData.name as string,
        contact_name: (vendorData.contact_name as string) || null,
        email: vendorData.email as string,
        phone: (vendorData.phone as string) || null,
        county_primary: vendorData.county_primary as string,
        service_area_counties: (vendorData.service_area_counties as string[]) || [],
        service_types: (vendorData.service_types as string[]) || [],
        tier: vendorData.tier as 'gold' | 'silver' | 'bronze',
        credentials: vendorData.credentials as { ikeca: boolean; nfpa: boolean; insured: boolean },
        availability: vendorData.availability as 'available' | 'wait_list',
      });
    } catch {
      setVendorError('Failed to load vendor details');
    } finally {
      setVendorLoading(false);
    }
  }, [vendorNetworkId]);

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  const refetch = useCallback(() => {
    fetchVendor();
    threadRefetch();
  }, [fetchVendor, threadRefetch]);

  return {
    vendor,
    messages,
    loading: vendorLoading || threadLoading,
    error: vendorError || threadError,
    sendMessage,
    refetch,
  };
}
