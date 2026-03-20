/**
 * CPP-VENDOR-CONNECT-01 — Vendor Connect type definitions
 */

export type VCPartnerTier = 'preferred' | 'elite' | 'founding';
export type VCApplicationStatus = 'pending' | 'approved' | 'rejected' | 'waitlisted';
export type VCLeadStatus = 'new' | 'contacted' | 'quoted' | 'won' | 'lost';
export type VendorTier = 'my_vendors' | 'vendor_connect';

export interface VendorConnectProfile {
  id: string;
  vendor_id: string;
  partner_tier: VCPartnerTier;
  is_founding_partner: boolean;
  verified_by: string | null;
  verified_at: string | null;
  application_status: string;
  rejection_reason: string | null;
  company_name: string;
  logo_url: string | null;
  tagline: string | null;
  description: string | null;
  service_types: string[];
  service_areas: string[];
  website: string | null;
  phone: string | null;
  email: string;
  ikeca_certified: boolean;
  ikeca_member_id: string | null;
  license_number: string | null;
  primary_county: string | null;
  performance_score: number | null;
  total_jobs_completed: number;
  avg_response_hours: number | null;
  cert_quality_score: number | null;
  on_time_rate: number | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorConnectSpot {
  id: string;
  county: string;
  service_type: string;
  max_spots: number;
  filled_spots: number;
  waitlist_count: number;
  created_at: string;
}

export interface VendorConnectApplication {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  service_types: string[];
  service_areas: string[];
  ikeca_certified: boolean;
  years_in_business: number | null;
  why_apply: string | null;
  referred_by: string | null;
  status: VCApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface VendorConnectLead {
  id: string;
  vendor_id: string;
  org_id: string;
  location_id: string | null;
  service_type: string;
  operator_name: string | null;
  operator_phone: string | null;
  location_address: string | null;
  notes: string | null;
  status: VCLeadStatus;
  created_at: string;
}
