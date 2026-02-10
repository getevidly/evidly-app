import { useState, useRef, useCallback } from 'react';
import { Camera, X, RotateCcw, MapPin, Clock, Plus } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────
export interface PhotoRecord {
  id: string;
  dataUrl: string;
  timestamp: string;
  displayTime: string;
  lat: number | null;
  lng: number | null;
  address: string;
}

interface PhotoEvidenceProps {
  photos: PhotoRecord[];
  onChange: (photos: PhotoRecord[]) => void;
  maxPhotos?: number;
  required?: boolean;
  highlight?: boolean;
  highlightText?: string;
  label?: string;
  compact?: boolean;
  /** Enhances contrast/brightness and desaturates — ideal for photographing physical documents */
  documentMode?: boolean;
}

// TODO: Production — upload to Supabase Storage bucket "compliance-photos"
// Path: /{org_id}/{location_id}/{record_type}/{record_id}/{filename}
// Replace dataUrl with public URL from Supabase after upload.

// ── Font ───────────────────────────────────────────────────────────
const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

// ── Helpers ────────────────────────────────────────────────────────
function generateId(): string {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatCoords(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}\u00B0${latDir}, ${Math.abs(lng).toFixed(4)}\u00B0${lngDir}`;
}

// ── EXIF Extraction ────────────────────────────────────────────────
// Minimal JPEG EXIF parser — reads DateTimeOriginal + GPS coordinates
interface ExifData {
  dateTime: Date | null;
  lat: number | null;
  lng: number | null;
}

function readGpsRationals(view: DataView, ts: number, entryOff: number, le: boolean): number[] {
  const off = view.getUint32(entryOff + 8, le);
  const result: number[] = [];
  for (let i = 0; i < 3; i++) {
    const num = view.getUint32(ts + off + i * 8, le);
    const den = view.getUint32(ts + off + i * 8 + 4, le);
    result.push(den === 0 ? 0 : num / den);
  }
  return result;
}

function parseExifSegment(view: DataView, start: number): ExifData {
  const empty: ExifData = { dateTime: null, lat: null, lng: null };
  try {
    // Verify "Exif\0\0" header
    if (view.getUint32(start) !== 0x45786966 || view.getUint16(start + 4) !== 0x0000) return empty;

    const ts = start + 6; // TIFF header start
    const le = view.getUint16(ts) === 0x4949; // little-endian byte order
    const ifd0Off = view.getUint32(ts + 4, le);

    // Walk IFD0 to find ExifIFD and GPS IFD pointers
    let exifOff = 0, gpsOff = 0;
    const n0 = view.getUint16(ts + ifd0Off, le);
    for (let i = 0; i < n0; i++) {
      const e = ts + ifd0Off + 2 + i * 12;
      const tag = view.getUint16(e, le);
      if (tag === 0x8769) exifOff = view.getUint32(e + 8, le);
      if (tag === 0x8825) gpsOff = view.getUint32(e + 8, le);
    }

    // ExifIFD → DateTimeOriginal (tag 0x9003)
    let dateTime: Date | null = null;
    if (exifOff) {
      const ne = view.getUint16(ts + exifOff, le);
      for (let i = 0; i < ne; i++) {
        const e = ts + exifOff + 2 + i * 12;
        if (view.getUint16(e, le) === 0x9003) {
          const vOff = view.getUint32(e + 8, le);
          const bytes = new Uint8Array(view.buffer, ts + vOff, 19);
          const str = String.fromCharCode(...bytes); // "2026:02:10 14:34:00"
          const m = str.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
          if (m) dateTime = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
        }
      }
    }

    // GPS IFD → Latitude + Longitude
    let lat: number | null = null, lng: number | null = null;
    if (gpsOff) {
      let latRef = '', lngRef = '';
      let latVals: number[] | null = null, lngVals: number[] | null = null;
      const ng = view.getUint16(ts + gpsOff, le);
      for (let i = 0; i < ng; i++) {
        const e = ts + gpsOff + 2 + i * 12;
        const tag = view.getUint16(e, le);
        if (tag === 1) latRef = String.fromCharCode(view.getUint8(e + 8));
        if (tag === 2) latVals = readGpsRationals(view, ts, e, le);
        if (tag === 3) lngRef = String.fromCharCode(view.getUint8(e + 8));
        if (tag === 4) lngVals = readGpsRationals(view, ts, e, le);
      }
      if (latVals && lngVals) {
        lat = (latVals[0] + latVals[1] / 60 + latVals[2] / 3600) * (latRef === 'S' ? -1 : 1);
        lng = (lngVals[0] + lngVals[1] / 60 + lngVals[2] / 3600) * (lngRef === 'W' ? -1 : 1);
      }
    }

    return { dateTime, lat, lng };
  } catch {
    return empty;
  }
}

async function extractExifData(file: File): Promise<ExifData> {
  const empty: ExifData = { dateTime: null, lat: null, lng: null };
  if (!file.type.includes('jpeg') && !file.type.includes('jpg') && !file.name.toLowerCase().endsWith('.jpg')) return empty;
  try {
    const buf = await file.arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xFFD8) return empty;
    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      if (marker === 0xFFE1) return parseExifSegment(view, offset + 4);
      if ((marker & 0xFF00) !== 0xFF00) break;
      offset += 2 + view.getUint16(offset + 2);
    }
    return empty;
  } catch {
    return empty;
  }
}

// ── Geolocation (fallback when no EXIF GPS) ────────────────────────
function getGeolocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, enableHighAccuracy: true },
    );
  });
}

/**
 * Reverse geocode coordinates to a short address via free Nominatim API.
 * Falls back to lat/lng string on failure.
 */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`,
      { headers: { 'Accept-Language': 'en' } },
    );
    if (!res.ok) return formatCoords(lat, lng);
    const data = await res.json();
    const addr = data.address;
    if (addr) {
      const parts = [addr.road, addr.city || addr.town || addr.village].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
    return formatCoords(lat, lng);
  } catch {
    return formatCoords(lat, lng);
  }
}

// ── Image Compression + Overlay ────────────────────────────────────
interface OverlayInfo {
  timestamp: Date;
  lat?: number;
  lng?: number;
}

/**
 * Compress image via canvas. Overlays timestamp + GPS bar at bottom.
 * Targets max 1 MB by scaling down and reducing JPEG quality.
 * documentMode applies contrast(1.4) brightness(1.1) saturate(0) for physical docs.
 */
function compressImage(
  file: File,
  overlay: OverlayInfo,
  opts: { maxSizeKB?: number; documentMode?: boolean } = {},
): Promise<string> {
  const { maxSizeKB = 1024, documentMode = false } = opts;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Scale down if too large
        const MAX_DIM = 1600;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Document mode: auto-enhance for readability
        if (documentMode) {
          ctx.filter = 'contrast(1.4) brightness(1.1) saturate(0)';
        }
        ctx.drawImage(img, 0, 0, width, height);
        ctx.filter = 'none';

        // Build overlay text: "Feb 10, 2026 2:34 PM · 36.7378°N, 119.7871°W"
        const timeText = formatTimestamp(overlay.timestamp);
        const gpsText = overlay.lat != null && overlay.lng != null
          ? ` \u00B7 ${formatCoords(overlay.lat, overlay.lng)}`
          : '';
        const overlayText = timeText + gpsText;

        const barHeight = 30;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, height - barHeight, width, barHeight);
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px "DM Sans", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(overlayText, 10, height - barHeight / 2);

        // Reduce quality to hit target size
        let quality = 0.85;
        let result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > maxSizeKB * 1370 && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── Main Component ─────────────────────────────────────────────────
export function PhotoEvidence({
  photos, onChange, maxPhotos = 5, required = false,
  highlight = false, highlightText, label = 'Photo Evidence',
  compact = false, documentMode = false,
}: PhotoEvidenceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturing, setCapturing] = useState(false);

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCapturing(true);
    try {
      const file = files[0];

      // 1) Extract EXIF data (timestamp + GPS) from JPEG
      const exif = await extractExifData(file);
      const photoDate = exif.dateTime || new Date();
      const displayTime = formatTimestamp(photoDate);

      // 2) GPS: prefer EXIF, fall back to browser Geolocation API
      let lat = exif.lat;
      let lng = exif.lng;
      if (lat == null || lng == null) {
        const geo = await getGeolocation();
        if (geo) { lat = geo.lat; lng = geo.lng; }
      }

      // 3) Reverse geocode to street address
      let address = 'Location unavailable';
      if (lat != null && lng != null) {
        address = await reverseGeocode(lat, lng);
      }

      // 4) Compress with timestamp + GPS overlay baked into image
      const dataUrl = await compressImage(
        file,
        { timestamp: photoDate, lat: lat ?? undefined, lng: lng ?? undefined },
        { documentMode },
      );

      const newPhoto: PhotoRecord = {
        id: generateId(), dataUrl, timestamp: photoDate.toISOString(),
        displayTime, lat: lat ?? null, lng: lng ?? null, address,
      };
      onChange([...photos, newPhoto]);
    } finally {
      setCapturing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [photos, onChange, documentMode]);

  const removePhoto = (id: string) => {
    onChange(photos.filter(p => p.id !== id));
  };

  const retakePhoto = (id: string) => {
    removePhoto(id);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const canAddMore = photos.length < maxPhotos;
  const borderColor = highlight ? '#d97706' : '#d1d5db';
  const bgColor = highlight ? '#fffbeb' : '#f9fafb';

  return (
    <div style={{ ...F }}>
      {/* Label */}
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <Camera className="h-4 w-4" style={{ color: highlight ? '#d97706' : '#6b7280' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: highlight ? '#92400e' : '#374151', ...F }}>
            {label}
            {required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}
          </span>
          {highlightText && (
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#d97706', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '6px', ...F }}>
              {highlightText}
            </span>
          )}
          {documentMode && (
            <span style={{ fontSize: '10px', fontWeight: 500, color: '#1e4d6b', backgroundColor: '#eef4f8', padding: '2px 8px', borderRadius: '6px', ...F }}>
              Auto-enhance ON
            </span>
          )}
        </div>
      )}

      {/* Hidden file input — uses capture="environment" for mobile rear camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        style={{ display: 'none' }}
      />

      {/* Photo thumbnails + add button */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {photos.map(photo => (
          <div key={photo.id} style={{ position: 'relative', width: compact ? '64px' : '96px', height: compact ? '64px' : '96px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e5e7eb' }}>
            <img src={photo.dataUrl} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Timestamp + location badge */}
            {!compact && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 4px' }}>
                <div style={{ fontSize: '8px', color: 'white', lineHeight: '1.2', ...F }}>
                  <Clock className="inline h-2 w-2 mr-0.5" style={{ verticalAlign: 'middle' }} />
                  {photo.displayTime}
                </div>
                {photo.lat && (
                  <div style={{ fontSize: '7px', color: '#d1d5db', lineHeight: '1.2', ...F }}>
                    <MapPin className="inline h-2 w-2 mr-0.5" style={{ verticalAlign: 'middle' }} />
                    {photo.address.length > 28 ? photo.address.slice(0, 26) + '\u2026' : photo.address}
                  </div>
                )}
              </div>
            )}
            {/* Remove button */}
            <button
              type="button"
              onClick={() => removePhoto(photo.id)}
              style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
            >
              <X className="h-3 w-3" />
            </button>
            {/* Retake button */}
            {!compact && (
              <button
                type="button"
                onClick={() => retakePhoto(photo.id)}
                style={{ position: 'absolute', top: '2px', left: '2px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {/* Add photo button */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={capturing}
            style={{
              width: compact ? '64px' : '96px',
              height: compact ? '64px' : '96px',
              borderRadius: '8px',
              border: `2px dashed ${borderColor}`,
              backgroundColor: bgColor,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: capturing ? 'wait' : 'pointer',
              gap: '4px',
              ...F,
            }}
          >
            {capturing ? (
              <div style={{ width: '20px', height: '20px', border: '2px solid #d1d5db', borderTopColor: '#1e4d6b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                {photos.length === 0 ? (
                  <Camera className="h-5 w-5" style={{ color: highlight ? '#d97706' : '#9ca3af' }} />
                ) : (
                  <Plus className="h-4 w-4" style={{ color: '#9ca3af' }} />
                )}
                <span style={{ fontSize: '10px', color: highlight ? '#92400e' : '#9ca3af', fontWeight: 500, textAlign: 'center', lineHeight: '1.2' }}>
                  {compact ? '' : photos.length === 0 ? 'Take Photo' : 'Add'}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Photo count */}
      {photos.length > 0 && !compact && (
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', ...F }}>
          {photos.length} of {maxPhotos} photos
        </div>
      )}

      {/* CSS for spinner animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Inline photo button for compact use ────────────────────────────
export function PhotoButton({
  photos,
  onChange,
  highlight = false,
  highlightText,
}: {
  photos: PhotoRecord[];
  onChange: (photos: PhotoRecord[]) => void;
  highlight?: boolean;
  highlightText?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ ...F }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          borderRadius: '6px',
          border: `1px solid ${highlight ? '#fde68a' : '#e5e7eb'}`,
          backgroundColor: highlight ? '#fffbeb' : photos.length > 0 ? '#f0fdf4' : '#f9fafb',
          color: highlight ? '#92400e' : photos.length > 0 ? '#166534' : '#6b7280',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          ...F,
        }}
      >
        <Camera className="h-3.5 w-3.5" />
        {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''}` : 'Photo'}
        {highlight && highlightText && (
          <span style={{ fontSize: '10px', color: '#d97706', marginLeft: '2px' }}>!</span>
        )}
      </button>
      {expanded && (
        <div style={{ marginTop: '8px' }}>
          <PhotoEvidence
            photos={photos}
            onChange={onChange}
            compact
            highlight={highlight}
            highlightText={highlightText}
          />
        </div>
      )}
    </div>
  );
}
