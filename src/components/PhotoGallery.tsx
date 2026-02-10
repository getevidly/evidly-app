import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, MapPin, Clock, Camera } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import type { PhotoRecord } from './PhotoEvidence';

interface PhotoGalleryProps {
  photos: PhotoRecord[];
  title?: string;
}

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export function PhotoGallery({ photos, title = 'Photo Evidence' }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { userRole } = useRole();
  const canDownload = userRole === 'executive';

  if (photos.length === 0) return null;

  const selected = selectedIndex !== null ? photos[selectedIndex] : null;

  const goNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const goPrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleDownload = (photo: PhotoRecord) => {
    if (!canDownload) {
      alert('Download restricted to executive-level accounts for privacy compliance.');
      return;
    }
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = `evidence-${photo.timestamp}.jpg`;
    link.click();
  };

  return (
    <div style={{ ...F }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <Camera className="h-4 w-4" style={{ color: '#6b7280' }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', ...F }}>{title}</span>
        <span style={{ fontSize: '11px', color: '#9ca3af', ...F }}>({photos.length})</span>
      </div>

      {/* Thumbnail Grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {photos.map((photo, idx) => (
          <div
            key={photo.id}
            onClick={() => setSelectedIndex(idx)}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '2px solid #e5e7eb',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <img
              src={photo.dataUrl}
              alt={`Evidence ${idx + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: 'rgba(0,0,0,0.55)', padding: '2px 4px',
            }}>
              <div style={{ fontSize: '7px', color: 'white', lineHeight: '1.2', ...F }}>
                {photo.displayTime}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full-Size Modal */}
      {selected && selectedIndex !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999,
          }}
          onClick={() => setSelectedIndex(null)}
        >
          <div
            style={{
              position: 'relative', maxWidth: '90vw', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedIndex(null)}
              style={{
                position: 'absolute', top: '-40px', right: '0',
                backgroundColor: 'transparent', border: 'none', color: 'white',
                cursor: 'pointer', padding: '4px',
              }}
            >
              <X className="h-6 w-6" />
            </button>

            {/* Nav arrows */}
            {selectedIndex > 0 && (
              <button
                onClick={goPrev}
                style={{
                  position: 'absolute', left: '-48px', top: '50%', transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                  borderRadius: '50%', width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {selectedIndex < photos.length - 1 && (
              <button
                onClick={goNext}
                style={{
                  position: 'absolute', right: '-48px', top: '50%', transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                  borderRadius: '50%', width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}

            {/* Image */}
            <img
              src={selected.dataUrl}
              alt="Evidence full size"
              style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '8px', objectFit: 'contain' }}
            />

            {/* Info bar */}
            <div style={{
              marginTop: '12px', display: 'flex', alignItems: 'center', gap: '16px',
              color: 'white', fontSize: '13px', ...F,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock className="h-4 w-4" style={{ color: '#d4af37' }} />
                {selected.displayTime}
              </div>
              {selected.lat && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin className="h-4 w-4" style={{ color: '#d4af37' }} />
                  {selected.address}
                </div>
              )}
              <span style={{ color: '#9ca3af' }}>
                {selectedIndex + 1} / {photos.length}
              </span>
              {canDownload && (
                <button
                  onClick={() => handleDownload(selected)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    backgroundColor: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
                    padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
                    fontSize: '12px', ...F,
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
