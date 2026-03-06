import { supabase } from './supabase';

// Canonical bucket names — matches Supabase storage exactly
export const BUCKETS = {
  DOCUMENTS:         'documents',
  VAULT:             'vault',
  UPLOADS:           'uploads',
  COMPLIANCE_PHOTOS: 'compliance-photos',
  REPORTS:           'reports',
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

export async function deleteFile(bucket: BucketName, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete error: ${error.message}`);
}
