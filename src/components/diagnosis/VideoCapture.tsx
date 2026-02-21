import React, { useState, useRef } from 'react';

interface Props {
  onVideoReady: (videoBlob: Blob | null, videoUrl: string | null) => void;
}

const MAX_DURATION = 30;

export const VideoCapture: React.FC<Props> = ({ onVideoReady }) => {
  const [mode, setMode] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [secondsLeft, setSecondsLeft] = useState(MAX_DURATION);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopRecording = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    mediaRecorderRef.current?.stop();
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setMode('preview');
        onVideoReady(blob, url);
        streamRef.current?.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setMode('recording');
      setSecondsLeft(MAX_DURATION);

      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) { stopRecording(); return 0; }
          return s - 1;
        });
      }, 1000);

      timerRef.current = setTimeout(() => stopRecording(), MAX_DURATION * 1000);
    } catch {
      setError('Camera access denied. Please allow camera access or upload a video instead.');
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setError('File too large. Maximum 100MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setMode('preview');
    onVideoReady(file, url);
  };

  const reset = () => {
    setMode('idle');
    setVideoUrl(null);
    setSecondsLeft(MAX_DURATION);
    onVideoReady(null, null);
  };

  return (
    <div style={{
      background: '#EEF1F7', border: '1px solid #D1D9E6',
      borderRadius: '8px', padding: '14px', marginBottom: '12px',
    }}>
      <p style={{ color: '#A08C5A', fontSize: '11px', fontWeight: 700, margin: '0 0 10px', fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {'\uD83D\uDCF9'} Attach Video (Optional {'\u2014'} Max 30 seconds)
      </p>

      {error && (
        <p style={{ color: '#f87171', fontSize: '11px', marginBottom: '8px', fontFamily: 'system-ui' }}>{error}</p>
      )}

      {mode === 'idle' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={startRecording} style={{
            background: '#1e4d6b', border: '1px solid #1e4d6b',
            borderRadius: '6px', padding: '8px 14px',
            color: '#ffffff', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'system-ui',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {'\uD83D\uDCF7'} Record Video
          </button>
          <button onClick={() => fileInputRef.current?.click()} style={{
            background: '#1e4d6b', border: '1px solid #1e4d6b',
            borderRadius: '6px', padding: '8px 14px',
            color: '#ffffff', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'system-ui',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {'\uD83D\uDCC1'} Upload Video
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/mov,video/webm,video/*"
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {mode === 'recording' && (
        <div>
          <video
            ref={videoRef}
            muted
            style={{ width: '100%', maxHeight: '200px', borderRadius: '6px', marginBottom: '8px', background: '#000' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#f87171', fontSize: '12px', fontWeight: 700, fontFamily: 'system-ui' }}>
                {'\u25CF'} REC
              </span>
              <span style={{ color: 'var(--text-primary, #0B1628)', fontSize: '12px', fontFamily: 'system-ui' }}>
                {secondsLeft}s remaining
              </span>
            </div>
            <button onClick={stopRecording} style={{
              background: '#dc2626', border: 'none',
              borderRadius: '6px', padding: '6px 14px',
              color: '#ffffff', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'system-ui',
            }}>
              Stop
            </button>
          </div>
        </div>
      )}

      {mode === 'preview' && videoUrl && (
        <div>
          <video
            src={videoUrl}
            controls
            style={{ width: '100%', maxHeight: '200px', borderRadius: '6px', marginBottom: '8px' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#4ade80', fontSize: '12px', fontFamily: 'system-ui' }}>{'\u2713'} Video attached</span>
            <button onClick={reset} style={{
              background: 'transparent', border: '1px solid #D1D9E6',
              borderRadius: '4px', padding: '4px 10px',
              color: 'var(--text-secondary, #3D5068)', fontSize: '11px', cursor: 'pointer', fontFamily: 'system-ui',
            }}>
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
