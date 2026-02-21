import React, { useState, useRef, useCallback } from 'react';

export interface PhotoItem {
  id: string;
  blob: Blob;
  url: string;
  filename: string;
}

interface Props {
  photos: PhotoItem[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  maxPhotos?: number;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const PhotoCapture: React.FC<Props> = ({ photos, onPhotosChange, maxPhotos = 5 }) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isFull = photos.length >= maxPhotos;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    if (isFull) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setError('Camera access denied. Please allow camera access or upload photos instead.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || isFull) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const url = URL.createObjectURL(blob);
      const newPhoto: PhotoItem = { id, blob, url, filename: `${id}.jpg` };
      const updated = [...photos, newPhoto];
      onPhotosChange(updated);
      if (updated.length >= maxPhotos) stopCamera();
    }, 'image/jpeg', 0.85);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setError(null);
    const remaining = maxPhotos - photos.length;
    const toProcess = Array.from(files).slice(0, remaining);
    const newPhotos: PhotoItem[] = [];

    for (const file of toProcess) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds 20MB limit.`);
        continue;
      }
      const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const url = URL.createObjectURL(file);
      newPhotos.push({ id, blob: file, url, filename: file.name });
    }

    if (newPhotos.length > 0) {
      onPhotosChange([...photos, ...newPhotos]);
    }
    // Reset input so the same file(s) can be re-selected
    e.target.value = '';
  };

  const removePhoto = (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    onPhotosChange(photos.filter(p => p.id !== id));
  };

  return (
    <div style={{
      background: '#EEF1F7', border: '1px solid #D1D9E6',
      borderRadius: '8px', padding: '14px', marginBottom: '12px',
    }}>
      <p style={{ color: '#A08C5A', fontSize: '11px', fontWeight: 700, margin: '0 0 10px', fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {'\uD83D\uDCF7'} Attach Photos (Optional {'\u2014'} Up to {maxPhotos})
      </p>

      {error && (
        <p style={{ color: '#f87171', fontSize: '11px', marginBottom: '8px', fontFamily: 'system-ui' }}>{error}</p>
      )}

      {/* Camera viewfinder */}
      {cameraActive && (
        <div style={{ marginBottom: '10px' }}>
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', maxHeight: '200px', borderRadius: '6px', marginBottom: '8px', background: '#000' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={capturePhoto} disabled={isFull} style={{
              background: '#1e4d6b', border: 'none',
              borderRadius: '6px', padding: '8px 14px',
              color: '#ffffff', fontSize: '12px', fontWeight: 600,
              cursor: isFull ? 'not-allowed' : 'pointer', fontFamily: 'system-ui',
              opacity: isFull ? 0.5 : 1,
            }}>
              {'\uD83D\uDCF7'} Capture
            </button>
            <button onClick={stopCamera} style={{
              background: 'transparent', border: '1px solid #D1D9E6',
              borderRadius: '6px', padding: '8px 14px',
              color: 'var(--text-secondary, #3D5068)', fontSize: '12px',
              cursor: 'pointer', fontFamily: 'system-ui',
            }}>
              Close Camera
            </button>
          </div>
        </div>
      )}

      {/* Action buttons (when camera is not active) */}
      {!cameraActive && !isFull && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={startCamera} style={{
            background: '#1e4d6b', border: '1px solid #1e4d6b',
            borderRadius: '6px', padding: '8px 14px',
            color: '#ffffff', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'system-ui',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {'\uD83D\uDCF7'} Take Photo
          </button>
          <button onClick={() => fileInputRef.current?.click()} style={{
            background: '#1e4d6b', border: '1px solid #1e4d6b',
            borderRadius: '6px', padding: '8px 14px',
            color: '#ffffff', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'system-ui',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {'\uD83D\uDCC1'} Upload Photos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Thumbnail grid */}
      {photos.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {photos.map(photo => (
              <div key={photo.id} style={{ position: 'relative', width: 80, height: 80 }}>
                <img
                  src={photo.url}
                  alt={photo.filename}
                  style={{
                    width: 80, height: 80, objectFit: 'cover',
                    borderRadius: '6px', border: '1px solid #D1D9E6',
                  }}
                />
                <button
                  onClick={() => removePhoto(photo.id)}
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#dc2626', border: '2px solid #ffffff',
                    color: '#ffffff', fontSize: '11px', fontWeight: 700,
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    padding: 0, lineHeight: 1,
                  }}
                  title="Remove photo"
                >
                  {'\u00D7'}
                </button>
              </div>
            ))}
          </div>
          <p style={{
            color: 'var(--text-secondary, #3D5068)', fontSize: '11px',
            margin: '6px 0 0', fontFamily: 'system-ui',
          }}>
            {photos.length}/{maxPhotos} photo{photos.length !== 1 ? 's' : ''} attached
          </p>
        </div>
      )}

      {isFull && !cameraActive && (
        <p style={{
          color: '#4ade80', fontSize: '12px',
          margin: '8px 0 0', fontFamily: 'system-ui',
        }}>
          {'\u2713'} Maximum photos reached
        </p>
      )}

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
