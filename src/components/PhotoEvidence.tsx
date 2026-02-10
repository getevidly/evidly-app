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
}

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
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

/**
 * Compress image using canvas. Returns base64 data URL.
 * Targets max 1MB by scaling down dimensions and reducing quality.
 */
function compressImage(file: File, maxSizeKB = 1024): Promise<string> {
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
        ctx.drawImage(img, 0, 0, width, height);

        // Overlay timestamp + location bar at bottom
        const now = new Date();
        const timeText = formatTimestamp(now);
        const barHeight = 28;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, height - barHeight, width, barHeight);
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px "DM Sans", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(timeText, 8, height - barHeight / 2);

        // Try decreasing quality to hit target size
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

/**
 * Get current GPS position via browser Geolocation API.
 */
function getGeolocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, enableHighAccuracy: false },
    );
  });
}

/**
 * Reverse geocode coordinates to a short address.
 * Uses free Nominatim API. Falls back to lat/lng string.
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

// ── Component ──────────────────────────────────────────────────────
export function PhotoEvidence({
  photos,
  onChange,
  maxPhotos = 5,
  required = false,
  highlight = false,
  highlightText,
  label = 'Photo Evidence',
  compact = false,
}: PhotoEvidenceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturing, setCapturing] = useState(false);

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCapturing(true);
    try {
      const file = files[0];
      const dataUrl = await compressImage(file);
      const now = new Date();
      const displayTime = formatTimestamp(now);

      // Get location
      const geo = await getGeolocation();
      let address = 'Location unavailable';
      if (geo) {
        address = await reverseGeocode(geo.lat, geo.lng);
      }

      const newPhoto: PhotoRecord = {
        id: generateId(),
        dataUrl,
        timestamp: now.toISOString(),
        displayTime,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        address,
      };

      onChange([...photos, newPhoto]);
    } finally {
      setCapturing(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [photos, onChange]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
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
            {/* Timestamp badge */}
            {!compact && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 4px' }}>
                <div style={{ fontSize: '8px', color: 'white', lineHeight: '1.2', ...F }}>{photo.displayTime}</div>
                {photo.lat && <div style={{ fontSize: '7px', color: '#d1d5db', lineHeight: '1.2', ...F }}>📍 {photo.address.slice(0, 25)}</div>}
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
