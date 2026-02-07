import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// =============================================
// Vendor Contact (SMS / Email from dashboard)
// =============================================
export async function sendVendorContact(params: {
  vendor_id: string;
  contact_type: 'email' | 'sms';
  subject?: string;
  body: string;
  recipient_email?: string;
  recipient_phone?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const res = await fetch(`${SUPABASE_URL}/functions/v1/vendor-contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(params),
  });
  
  return res.json();
}

// =============================================
// Auto Request Settings
// =============================================
export async function getAutoRequestSettings(organizationId: string) {
  const { data, error } = await supabase
    .from('auto_request_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function saveAutoRequestSettings(settings: {
  organization_id: string;
  enabled: boolean;
  days_before_expiration: number;
  reminder_day_4: boolean;
  reminder_day_7: boolean;
  reminder_day_14: boolean;
  notify_via: 'email' | 'sms' | 'both';
  link_expires_days: number;
}) {
  const { data, error } = await supabase
    .from('auto_request_settings')
    .upsert(settings, { onConflict: 'organization_id' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// =============================================
// Auto Request Log
// =============================================
export async function getAutoRequestLog(organizationId: string, limit = 50) {
  const { data, error } = await supabase
    .from('auto_request_log')
    .select('*, vendors(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

// =============================================
// Vendor Upload Requests (with secure tokens)
// =============================================
export async function getVendorUploadRequests(organizationId: string) {
  const { data, error } = await supabase
    .from('vendor_upload_requests')
    .select('*, vendors(name, email, phone, contact_name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createManualUploadRequest(params: {
  organization_id: string;
  vendor_id: string;
  document_type: string;
  description?: string;
  expires_days?: number;
  vendor_email?: string;
  vendor_phone?: string;
}) {
  const { data, error } = await supabase.rpc('create_vendor_upload_request', {
    p_organization_id: params.organization_id,
    p_vendor_id: params.vendor_id,
    p_document_type: params.document_type,
    p_description: params.description || null,
    p_expires_days: params.expires_days || 14,
    p_vendor_email: params.vendor_email || null,
    p_vendor_phone: params.vendor_phone || null,
  });

  if (error) throw error;
  return data;
}

// =============================================
// Vendor Secure Upload (public, token-based)
// =============================================
export async function validateSecureToken(token: string) {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/vendor-secure-upload?token=${token}`,
    { method: 'GET' }
  );
  return res.json();
}

export async function uploadViaSecureToken(token: string, file: File, notes?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (notes) formData.append('notes', notes);

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/vendor-secure-upload?token=${token}`,
    { method: 'POST', body: formData }
  );
  return res.json();
}

// =============================================
// AI Document Analysis
// =============================================
export async function analyzeDocument(file: File, documentId?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const formData = new FormData();
  formData.append('file', file);
  if (documentId) formData.append('document_id', documentId);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-document-analysis`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: formData,
  });
  
  return res.json();
}

// =============================================
// Compliance Package
// =============================================
export async function generateCompliancePackage(params: {
  package_type: 'inspection' | 'insurance' | 'landlord' | 'custom';
  location_id?: string;
  document_ids: string[];
  include_score_report: boolean;
  include_temp_summary: boolean;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-compliance-package`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(params),
  });
  
  return res.json();
}

// =============================================
// Vendor Contact Log
// =============================================
export async function getVendorContactLog(vendorId: string) {
  const { data, error } = await supabase
    .from('vendor_contact_log')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw error;
  return data || [];
}
