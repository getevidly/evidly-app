import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;
const AUDIO_DIR = `${FileSystem.documentDirectory}audio/`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ensure a local directory exists before writing to it.
 */
async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/**
 * Generate a unique filename based on a timestamp and random suffix.
 */
function uniqueName(ext: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `${ts}_${rand}.${ext}`;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Copy a captured photo to the app's local document directory.
 * Returns the new local URI.
 */
export async function savePhotoLocally(uri: string): Promise<string> {
  await ensureDir(PHOTOS_DIR);
  const ext = uri.split('.').pop() ?? 'jpg';
  const dest = `${PHOTOS_DIR}${uniqueName(ext)}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

/**
 * Copy a recorded audio file to the app's local document directory.
 * Returns the new local URI.
 */
export async function saveAudioLocally(uri: string): Promise<string> {
  await ensureDir(AUDIO_DIR);
  const ext = uri.split('.').pop() ?? 'm4a';
  const dest = `${AUDIO_DIR}${uniqueName(ext)}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

/**
 * Upload a local file to a Supabase Storage bucket.
 * Returns the public URL of the uploaded file.
 */
export async function uploadToSupabase(
  localPath: string,
  bucket: string,
  remotePath: string,
): Promise<string> {
  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(localPath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Determine MIME type from extension
  const ext = localPath.split('.').pop()?.toLowerCase() ?? '';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aac: 'audio/aac',
  };
  const contentType = mimeMap[ext] ?? 'application/octet-stream';

  // Convert base64 to Uint8Array for upload
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(remotePath, bytes, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(remotePath);

  return urlData.publicUrl;
}

/**
 * Get all locally-saved photos for a given job, by convention stored
 * in a sub-directory named after the jobId.
 */
export async function getLocalPhotos(jobId: string): Promise<string[]> {
  const jobDir = `${PHOTOS_DIR}${jobId}/`;
  const info = await FileSystem.getInfoAsync(jobDir);
  if (!info.exists) {
    return [];
  }
  const files = await FileSystem.readDirectoryAsync(jobDir);
  return files.map((f) => `${jobDir}${f}`);
}
