import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface VendorNetworkFilters {
  search: string;
  county: string;
  serviceType: string;
  tier: string[];
  credentials: { ikeca: boolean; nfpa: boolean; insured: boolean };
  availability: string;
}

export interface VendorNetworkSort {
  key: 'tier_gold_first' | 'rating' | 'newest';
}

export interface VendorNetworkItem {
  id: string;
  name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  service_types: string[];
  county_primary: string;
  service_area_counties: string[];
  tier: 'gold' | 'silver' | 'bronze';
  credentials: { ikeca: boolean; nfpa: boolean; insured: boolean };
  availability: 'available' | 'wait_list';
  rating: number | null;
  joined_at: string;
  contactState: 'none' | 'contacted' | 'replied';
  contactDate: string | null;
}

interface UseVendorNetworkReturn {
  vendors: VendorNetworkItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVendorNetwork(
  filters: VendorNetworkFilters,
  sort: VendorNetworkSort
): UseVendorNetworkReturn {
  const { profile } = useAuth();
  const [vendors, setVendors] = useState<VendorNetworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = profile?.organization_id;

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('vendor_network')
        .select('*')
        .eq('is_active', true);

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%`);
      }
      if (filters.county) {
        query = query.or(`county_primary.eq.${filters.county},service_area_counties.cs.{"${filters.county}"}`);
      }
      if (filters.serviceType) {
        query = query.contains('service_types', [filters.serviceType]);
      }
      if (filters.tier.length > 0) {
        query = query.in('tier', filters.tier);
      }
      if (filters.availability) {
        query = query.eq('availability', filters.availability);
      }

      if (sort.key === 'rating') {
        query = query.order('rating', { ascending: false, nullsFirst: false });
      } else if (sort.key === 'newest') {
        query = query.order('joined_at', { ascending: false });
      } else {
        query = query.order('tier', { ascending: true }).order('rating', { ascending: false, nullsFirst: false });
      }

      const { data, error: queryErr } = await query;

      if (queryErr) {
        setError('Failed to load vendor network');
        setVendors([]);
        return;
      }

      let vendorRows = (data || []) as Array<Record<string, unknown>>;

      // Custom sort for tier_gold_first (gold=1, silver=2, bronze=3)
      if (sort.key === 'tier_gold_first') {
        const tierOrder: Record<string, number> = { gold: 1, silver: 2, bronze: 3 };
        vendorRows = vendorRows.sort((a, b) => {
          const ta = tierOrder[a.tier as string] || 3;
          const tb = tierOrder[b.tier as string] || 3;
          if (ta !== tb) return ta - tb;
          return ((b.rating as number) || 0) - ((a.rating as number) || 0);
        });
      }

      // Filter by credentials client-side (jsonb filter)
      if (filters.credentials.ikeca || filters.credentials.nfpa || filters.credentials.insured) {
        vendorRows = vendorRows.filter(v => {
          const creds = v.credentials as { ikeca: boolean; nfpa: boolean; insured: boolean };
          if (filters.credentials.ikeca && !creds.ikeca) return false;
          if (filters.credentials.nfpa && !creds.nfpa) return false;
          if (filters.credentials.insured && !creds.insured) return false;
          return true;
        });
      }

      // Fetch contact states for all vendors (batch query)
      const contactStates: Record<string, { state: 'contacted' | 'replied'; date: string }> = {};
      if (orgId && vendorRows.length > 0) {
        const vendorIds = vendorRows.map(v => v.id as string);
        const { data: threads } = await supabase
          .from('message_threads')
          .select('entity_id, id')
          .eq('entity_type', 'vendor_network_contact')
          .eq('organization_id', orgId)
          .in('entity_id', vendorIds);

        if (threads && threads.length > 0) {
          const threadIds = threads.map(t => t.id);
          const { data: msgs } = await supabase
            .from('messages')
            .select('thread_id, direction, created_at')
            .in('thread_id', threadIds)
            .order('created_at', { ascending: false });

          if (msgs) {
            const threadToEntity: Record<string, string> = {};
            for (const t of threads) {
              threadToEntity[t.id] = t.entity_id;
            }

            for (const msg of msgs) {
              const entityId = threadToEntity[msg.thread_id];
              if (!entityId || contactStates[entityId]) continue;
              if (msg.direction === 'inbound') {
                contactStates[entityId] = { state: 'replied', date: msg.created_at };
              } else {
                contactStates[entityId] = { state: 'contacted', date: msg.created_at };
              }
            }
          }
        }
      }

      const mapped: VendorNetworkItem[] = vendorRows.map(v => ({
        id: v.id as string,
        name: v.name as string,
        contact_name: (v.contact_name as string) || null,
        email: v.email as string,
        phone: (v.phone as string) || null,
        service_types: (v.service_types as string[]) || [],
        county_primary: v.county_primary as string,
        service_area_counties: (v.service_area_counties as string[]) || [],
        tier: v.tier as 'gold' | 'silver' | 'bronze',
        credentials: v.credentials as { ikeca: boolean; nfpa: boolean; insured: boolean },
        availability: v.availability as 'available' | 'wait_list',
        rating: (v.rating as number) || null,
        joined_at: v.joined_at as string,
        contactState: contactStates[v.id as string]?.state || 'none',
        contactDate: contactStates[v.id as string]?.date || null,
      }));

      setVendors(mapped);
    } catch {
      setError('Failed to load vendor network');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [filters, sort, orgId]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return { vendors, loading, error, refetch: fetchVendors };
}
