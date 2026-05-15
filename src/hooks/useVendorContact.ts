import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface ThreadMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  sender_identifier: string | null;
  created_at: string;
}

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
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = profile?.organization_id;

  const fetchData = useCallback(async () => {
    if (!vendorNetworkId) {
      setVendor(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: vendorData, error: vendorErr } = await supabase
        .from('vendor_network')
        .select('*')
        .eq('id', vendorNetworkId)
        .single();

      if (vendorErr || !vendorData) {
        setError('Vendor not found');
        setLoading(false);
        return;
      }

      setVendor({
        id: vendorData.id,
        name: vendorData.name,
        contact_name: vendorData.contact_name,
        email: vendorData.email,
        phone: vendorData.phone,
        county_primary: vendorData.county_primary,
        service_area_counties: vendorData.service_area_counties || [],
        service_types: vendorData.service_types || [],
        tier: vendorData.tier,
        credentials: vendorData.credentials,
        availability: vendorData.availability,
      });

      if (orgId) {
        const { data: thread } = await supabase
          .from('message_threads')
          .select('id')
          .eq('entity_type', 'vendor_network_contact')
          .eq('entity_id', vendorNetworkId)
          .eq('organization_id', orgId)
          .maybeSingle();

        if (thread) {
          const { data: msgs } = await supabase
            .from('messages')
            .select('id, direction, subject, body_text, body_html, sender_identifier, created_at')
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: true });

          setMessages((msgs || []) as ThreadMessage[]);
        } else {
          setMessages([]);
        }
      }
    } catch {
      setError('Failed to load vendor details');
    } finally {
      setLoading(false);
    }
  }, [vendorNetworkId, orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sendMessage = useCallback(async (subject: string, body: string): Promise<boolean> => {
    if (!vendorNetworkId || !orgId || !profile?.id) return false;

    try {
      const res = await supabase.functions.invoke('vendor-network-send-message', {
        body: {
          vendorNetworkId,
          subject,
          body,
          organizationId: orgId,
        },
      });

      if (res.error) return false;
      await fetchData();
      return true;
    } catch {
      return false;
    }
  }, [vendorNetworkId, orgId, profile, fetchData]);

  return { vendor, messages, loading, error, sendMessage, refetch: fetchData };
}
