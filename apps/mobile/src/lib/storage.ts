import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

const PHOTO_DIR = `${FileSystem.documentDirectory}photos/`;
const AUDIO_DIR = `${FileSystem.documentDirectory}audio/`;

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
}

export async function savePhotoLocally(uri: string, jobId: string): Promise<string> {
  await ensureDir(PHOTO_DIR);
  const filename = `${jobId}_${Date.now()}.jpg`;
  const dest = `${PHOTO_DIR}${filename}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export async function saveAudioLocally(uri: string, jobId: string): Promise<string> {
  await ensureDir(AUDIO_DIR);
  const filename = `${jobId}_${Date.now()}.m4a`;
  const dest = `${AUDIO_DIR}${filename}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export async function uploadToSupabase(localUri: string, bucket: string, path: string): Promise<string | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) return null;

    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const { data, error } = await supabase.storage.from(bucket).upload(path, decode(base64), {
      contentType: localUri.endsWith('.m4a') ? 'audio/mp4' : 'image/jpeg',
      upsert: true,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch {
    return null;
  }
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export async function getLocalPhotos(jobId: string): Promise<string[]> {
  await ensureDir(PHOTO_DIR);
  const files = await FileSystem.readDirectoryAsync(PHOTO_DIR);
  return files.filter(f => f.startsWith(jobId)).map(f => `${PHOTO_DIR}${f}`);
}
