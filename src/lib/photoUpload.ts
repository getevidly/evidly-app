import { supabase } from './supabase';

// ── Types ──────────────────────────────────────────────────
export interface PhotoUploadParams {
  dataUrl: string;
  orgId: string;
  locationId: string;
  recordType: 'temp_log' | 'checklist' | 'incident' | 'vendor_delivery' | 'equipment' | 'self_audit' | 'inspection' | 'corrective_action' | 'general';
  recordId?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  caption?: string;
  tags?: string[];
  overlayTimestamp?: string;
  overlayGps?: string;
}

export interface PhotoUploadResult {
  id: string;
  storagePath: string;
  publicUrl: string;
  thumbnailUrl?: string;
}

const BUCKET = 'compliance-photos';

// ── Helpers ────────────────────────────────────────────────

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function generatePath(orgId: string, locationId: string, recordType: string, recordId?: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const folder = recordId ? `${recordType}/${recordId}` : recordType;
  return `${orgId}/${locationId}/${folder}/${ts}_${rand}.jpg`;
}

// ── Upload ─────────────────────────────────────────────────

export async function uploadCompliancePhoto(params: PhotoUploadParams): Promise<PhotoUploadResult> {
  const blob = dataUrlToBlob(params.dataUrl);
  const storagePath = generatePath(params.orgId, params.locationId, params.recordType, params.recordId);

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

  // 2. Get signed URL (private bucket)
  const { data: urlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

  const publicUrl = urlData?.signedUrl ?? '';

  // 3. Insert metadata record
  const { data: record, error: dbError } = await supabase
    .from('compliance_photos')
    .insert({
      organization_id: params.orgId,
      location_id: params.locationId,
      record_type: params.recordType,
      record_id: params.recordId ?? null,
      storage_path: storagePath,
      file_size_bytes: blob.size,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      address: params.address ?? null,
      caption: params.caption ?? null,
      tags: params.tags ?? [],
      overlay_timestamp: params.overlayTimestamp ?? null,
      overlay_gps: params.overlayGps ?? null,
    })
    .select('id')
    .single();

  if (dbError) throw new Error(`Photo record insert failed: ${dbError.message}`);

  return {
    id: record.id,
    storagePath,
    publicUrl,
  };
}

// ── Retrieve ───────────────────────────────────────────────

export async function getPhotoUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60); // 1 hour
  return data?.signedUrl ?? '';
}

export async function getPhotosByRecord(recordType: string, recordId: string) {
  const { data, error } = await supabase
    .from('compliance_photos')
    .select('*')
    .eq('record_type', recordType)
    .eq('record_id', recordId)
    .is('deleted_at', null)
    .order('captured_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getPhotosByLocation(locationId: string, limit = 50) {
  const { data, error } = await supabase
    .from('compliance_photos')
    .select('*')
    .eq('location_id', locationId)
    .is('deleted_at', null)
    .order('captured_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// ── Delete (soft) ──────────────────────────────────────────

export async function softDeletePhoto(photoId: string) {
  const { error } = await supabase
    .from('compliance_photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', photoId);

  if (error) throw error;
}
