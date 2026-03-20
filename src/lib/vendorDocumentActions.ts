/**
 * vendorDocumentActions.ts — VENDOR-COMPLIANCE-01
 *
 * Shared functions for vendor document review workflows:
 * approve, decline, request re-upload.
 */

import { supabase } from './supabase';

/**
 * Generate a random secure token (48 chars)
 */
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const values = crypto.getRandomValues(new Uint8Array(48));
  for (const v of values) {
    token += chars[v % chars.length];
  }
  return token;
}

/**
 * Request a vendor to re-upload a document.
 * Creates a secure upload token and returns the upload URL.
 */
export async function requestReupload(
  vendorDocumentId: string,
  options?: {
    expiryTrackingId?: string;
    context?: 'document_expiry' | 'service_due' | 'manual';
  }
): Promise<{ success: boolean; uploadUrl?: string; error?: string }> {
  try {
    // Fetch the vendor document to get org_id, vendor_id, document_type
    const { data: doc, error: docError } = await supabase
      .from('vendor_documents')
      .select('id, organization_id, vendor_id, document_type')
      .eq('id', vendorDocumentId)
      .single();

    if (docError || !doc) {
      return { success: false, error: 'Document not found' };
    }

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const { error: tokenError } = await supabase
      .from('vendor_secure_tokens')
      .insert({
        token,
        vendor_id: doc.vendor_id,
        organization_id: doc.organization_id,
        document_type: doc.document_type,
        expires_at: expiresAt.toISOString(),
        upload_context: options?.context || 'manual',
        expiry_tracking_id: options?.expiryTrackingId || null,
      });

    if (tokenError) {
      return { success: false, error: 'Failed to create upload token' };
    }

    const uploadUrl = `https://app.getevidly.com/vendor/upload/${token}`;
    return { success: true, uploadUrl };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
