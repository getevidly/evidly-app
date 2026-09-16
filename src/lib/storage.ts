import { toast } from 'sonner';
import { supabase } from './supabase';

// Canonical bucket names — matches Supabase storage exactly
export const BUCKETS = {
  DOCUMENTS:            'documents',
  VAULT:                'vault',
  UPLOADS:              'uploads',
  COMPLIANCE_PHOTOS:    'compliance-photos',
  REPORTS:              'reports',
  EQUIPMENT_DOCUMENTS:  'equipment-documents',
  EVIDENCE_ATTACHMENTS: 'evidence-attachments',
} as const;

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: File | Blob,
  options?: { upsert?: boolean; contentType?: string }
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: options?.upsert ?? false,
      contentType: options?.contentType,
    });

  if (error) {
    console.error(`Upload failed — bucket: ${bucket}, path: ${path}`, error);
    throw new Error(`Upload error: ${error.message}`);
  }
  if (!data) {
    throw new Error('Upload blocked — storage returned no data. Check demo mode.');
  }
  return data;
}

export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresIn = 3600
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw new Error(`Signed URL error: ${error.message}`);
  return data.signedUrl;
}

/**
 * Open a stored document from either a real URL or a `bucket:path` token.
 *
 * Sealed certificates arrive from the HoodOps bridge as
 * `documents:hoodops/<org>/document.cert:<job>.pdf` — a bucket:path token, not
 * a URL. Passing that straight to window.open does nothing: the browser treats
 * `documents:` as an unknown URI scheme and fails silently, which is how the
 * cert links looked "clickable" while never opening anything.
 *
 * The path itself contains a colon (`document.cert:<job>.pdf`), so the token
 * splits on the FIRST colon only — split(':')[1] would truncate the path and
 * drop the job id and extension.
 */
export async function openStorageDocument(
  token: string | null | undefined,
  expiresIn = 300
): Promise<void> {
  if (!token) return;

  // Already a real URL — open as-is (back-compat for records storing one).
  if (/^https?:\/\//i.test(token)) {
    window.open(token, '_blank', 'noopener,noreferrer');
    return;
  }

  const idx = token.indexOf(':');
  if (idx === -1) {
    console.error('[openStorageDocument] Unrecognized document reference:', token);
    return;
  }

  const bucket = token.slice(0, idx) as BucketName;
  const path = token.slice(idx + 1);

  try {
    const signedUrl = await getSignedUrl(bucket, path, expiresIn);
    window.open(signedUrl, '_blank', 'noopener,noreferrer');
  } catch (e) {
    // Never fail silently — that was the original bug. Swallowed here rather
    // than rethrown because every caller is an onClick, where a rejected
    // promise would go unhandled.
    console.error('[openStorageDocument] Failed to open document:', token, e);
    toast.error('Could not open the document');
  }
}

export async function deleteFile(bucket: BucketName, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete error: ${error.message}`);
}
