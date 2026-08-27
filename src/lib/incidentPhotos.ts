/**
 * incidentPhotos.ts - dual-mode reader for incident photo arrays.
 *
 * incidents.photos, incidents.resolution_photos and incident_timeline.photos
 * hold plain strings. Two forms coexist in the same array:
 *
 *   - legacy  "data:image/jpeg;base64,..."  written before the storage cutover
 *   - current "<org>/<loc>/incident/<id>/<ts>_<rand>.jpg"  a compliance-photos path
 *
 * A third form appears only in memory: a freshly captured PhotoRecord, which
 * still carries its preview dataUrl plus the storagePath the upload returned.
 *
 * The compliance-photos bucket is private (see 20260505600000_storage_buckets.sql),
 * so a storage path has to be signed before it can be rendered. Legacy data: URLs
 * are self-contained and pass through untouched.
 */

import { useEffect, useState } from 'react';
import { getPhotoUrl } from './photoUpload';
import type { PhotoRecord } from '../components/PhotoEvidence';

export type PhotoEntry = string | PhotoRecord;

/** Already renderable as-is - no signing round-trip needed. */
function isDirectlyRenderable(v: string): boolean {
  return v.startsWith('data:')
    || v.startsWith('blob:')
    || v.startsWith('http://')
    || v.startsWith('https://');
}

/** The stored value behind an entry, whichever form it takes. */
export function entryValue(entry: PhotoEntry): string {
  if (typeof entry === 'string') return entry;
  return entry.storagePath || entry.dataUrl || '';
}

/** Resolve one entry to something an <img src> accepts. */
export async function resolvePhotoSrc(entry: PhotoEntry): Promise<string> {
  const value = entryValue(entry);
  if (!value) return '';
  if (isDirectlyRenderable(value)) return value;
  try {
    return await getPhotoUrl(value);
  } catch {
    return '';
  }
}

/** Shape the gallery and thumbnail renderers consume. */
export interface DisplayPhoto {
  id: string;
  src: string;
  displayTime: string;
  timestamp: string;
  lat: number | null;
  address: string;
}

/**
 * Resolve a mixed array to renderable photos. Signing is async, so this returns
 * [] on the first render and fills in once the URLs come back.
 */
export function useResolvedPhotos(entries: PhotoEntry[] | undefined): DisplayPhoto[] {
  const list = entries ?? [];
  const key = list.map(entryValue).join('|');
  const [resolved, setResolved] = useState<DisplayPhoto[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out = await Promise.all(
        list.map(async (entry, i): Promise<DisplayPhoto> => {
          const meta = typeof entry === 'string' ? null : entry;
          const value = entryValue(entry);
          return {
            id: meta?.id || `photo-${i}-${value.slice(-24)}`,
            src: await resolvePhotoSrc(entry),
            displayTime: meta?.displayTime ?? '',
            timestamp: meta?.timestamp ?? '',
            lat: meta?.lat ?? null,
            address: meta?.address ?? '',
          };
        }),
      );
      if (!cancelled) setResolved(out);
    })();
    return () => { cancelled = true; };
    // `key` is the value-identity of the array; `list` is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return resolved;
}
