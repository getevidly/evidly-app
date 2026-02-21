import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { DIAGNOSIS_CATEGORIES, DECISION_TREE, DIAGNOSIS_PRIORITY_MAP, type DiagnosisCategory, type DiagnosisResult, type DiagnosisNode } from '../../data/diagnosisData';
import { VideoCapture } from './VideoCapture';
import { PhotoCapture, type PhotoItem } from './PhotoCapture';
import { VendorNotification } from './VendorNotification';
import { useNotifications } from '../../contexts/NotificationContext';

type Step = 'category' | 'question' | 'result';

interface HistoryEntry {
  node: DiagnosisNode;
  selectedLabel: string;
}

export const DiagnosisWizard: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, setNotifications } = useNotifications();
  const [step, setStep] = useState<Step>('category');
  const [selectedCategory, setSelectedCategory] = useState<DiagnosisCategory | null>(null);
  const [currentNode, setCurrentNode] = useState<DiagnosisNode | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const selectCategory = useCallback((cat: DiagnosisCategory) => {
    const tree = DECISION_TREE[cat.id];
    if (!tree) return;
    setSelectedCategory(cat);
    setCurrentNode(tree);
    setHistory([]);
    setStep('question');
  }, []);

  const selectOption = useCallback((optionLabel: string, next: DiagnosisResult | DiagnosisNode) => {
    if ('id' in next && 'severity' in next) {
      setResult(next as DiagnosisResult);
      setStep('result');
    } else {
      if (currentNode) {
        setHistory(prev => [...prev, { node: currentNode, selectedLabel: optionLabel }]);
      }
      setCurrentNode(next as DiagnosisNode);
    }
  }, [currentNode]);

  const goBack = useCallback(() => {
    if (step === 'result') {
      setResult(null);
      setStep('question');
      return;
    }
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setCurrentNode(prev.node);
      setHistory(h => h.slice(0, -1));
      return;
    }
    setStep('category');
    setSelectedCategory(null);
    setCurrentNode(null);
  }, [step, history]);

  const reset = useCallback(() => {
    setStep('category');
    setSelectedCategory(null);
    setCurrentNode(null);
    setResult(null);
    setHistory([]);
    setVideoBlob(null);
    setVideoUrl(null);
    photos.forEach(p => URL.revokeObjectURL(p.url));
    setPhotos([]);
  }, [photos]);

  const handleVideoReady = useCallback((blob: Blob | null, url: string | null) => {
    setVideoBlob(blob);
    setVideoUrl(url);
  }, []);

  const severityConfig = {
    critical: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', label: 'CRITICAL' },
    urgent:   { bg: '#fff7ed', border: '#ea580c', text: '#ea580c', label: 'URGENT' },
    warning:  { bg: '#fffbeb', border: '#d97706', text: '#d97706', label: 'WARNING' },
    info:     { bg: '#f0f9ff', border: '#0284c7', text: '#0284c7', label: 'INFO' },
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Navigation Bar */}
      {step !== 'category' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={goBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: '1px solid #e5e7eb',
              borderRadius: 8, padding: '6px 14px',
              color: '#6b7280', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui',
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          {selectedCategory && (
            <span style={{ color: '#9ca3af', fontSize: 12, fontFamily: 'system-ui' }}>
              {selectedCategory.icon} {selectedCategory.label}
              {result && ` \u2192 ${result.title}`}
            </span>
          )}
          <button
            onClick={reset}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: '1px solid #e5e7eb',
              borderRadius: 8, padding: '6px 14px',
              color: '#6b7280', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui',
            }}
          >
            <RotateCcw size={14} /> Start Over
          </button>
        </div>
      )}

      {/* ── STEP: Category Selection ── */}
      {step === 'category' && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', marginBottom: 4, fontFamily: 'system-ui' }}>
            What type of issue are you experiencing?
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary, #3D5068)', marginBottom: 20, fontFamily: 'system-ui' }}>
            Select the category that best matches your kitchen problem.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {DIAGNOSIS_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => selectCategory(cat)}
                style={{
                  background: '#ffffff', border: '1px solid #e5e7eb',
                  borderRadius: 12, padding: '16px 14px',
                  textAlign: 'left', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#d4af37';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(212,175,55,0.15)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>{cat.icon}</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1e3a5f', marginBottom: 4, fontFamily: 'system-ui' }}>{cat.label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary, #3D5068)', lineHeight: 1.4, fontFamily: 'system-ui', margin: 0 }}>{cat.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP: Question / Decision Tree ── */}
      {step === 'question' && currentNode && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e3a5f', marginBottom: 16, fontFamily: 'system-ui' }}>
            {currentNode.question}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentNode.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => selectOption(opt.label, opt.next)}
                style={{
                  background: '#ffffff', border: '1px solid #e5e7eb',
                  borderRadius: 10, padding: '14px 16px',
                  textAlign: 'left', cursor: 'pointer',
                  fontSize: 14, color: '#1e3a5f', fontFamily: 'system-ui',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#1e4d6b';
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafb';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#ffffff';
                }}
              >
                <span>{opt.label}</span>
                <span style={{ color: '#9ca3af', fontSize: 18 }}>{'\u203A'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP: Result Display ── */}
      {step === 'result' && result && selectedCategory && (
        <div>
          {/* Severity Banner */}
          <div style={{
            background: severityConfig[result.severity].bg,
            border: `2px solid ${severityConfig[result.severity].border}`,
            borderRadius: 12, padding: '16px 20px', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{
                background: severityConfig[result.severity].border,
                color: '#ffffff', fontSize: 10, fontWeight: 800,
                padding: '3px 10px', borderRadius: 4, fontFamily: 'system-ui',
                letterSpacing: '0.5px',
              }}>
                {severityConfig[result.severity].label}
              </span>
              <span style={{ color: 'var(--text-secondary, #3D5068)', fontSize: 11, fontFamily: 'system-ui' }}>{result.equipment}</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', margin: 0, fontFamily: 'system-ui' }}>
              {result.title}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #3D5068)', marginTop: 8, lineHeight: 1.5, fontFamily: 'system-ui' }}>
              {result.description}
            </p>
          </div>

          {/* Immediate Steps */}
          <div style={{
            background: '#ffffff', border: '1px solid #e5e7eb',
            borderRadius: 10, padding: 16, marginBottom: 12,
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 10, fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Immediate Steps
            </h3>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {result.immediateSteps.map((s, i) => (
                <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary, #3D5068)', lineHeight: 1.6, fontFamily: 'system-ui', marginBottom: 4 }}>
                  {s.replace(/^\d+\.\s*/, '')}
                </li>
              ))}
            </ol>
          </div>

          {/* Likely Causes */}
          <div style={{
            background: '#ffffff', border: '1px solid #e5e7eb',
            borderRadius: 10, padding: 16, marginBottom: 12,
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 10, fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Likely Causes
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {result.likelyCauses.map((c, i) => (
                <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary, #3D5068)', lineHeight: 1.6, fontFamily: 'system-ui', marginBottom: 4 }}>
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Cost & Time */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12,
          }}>
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 10, padding: 14,
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary, #3D5068)', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'system-ui' }}>DIY Time</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1e3a5f', margin: 0, fontFamily: 'system-ui' }}>{result.estimatedDIYTime}</p>
            </div>
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 10, padding: 14,
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary, #3D5068)', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'system-ui' }}>Est. Repair Cost</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1e3a5f', margin: 0, fontFamily: 'system-ui' }}>{result.estimatedRepairCost}</p>
            </div>
          </div>

          {/* When to Call Professional */}
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: 10, padding: 14, marginBottom: 12,
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#1e4d6b', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'system-ui' }}>When to Call a Professional</p>
            <p style={{ fontSize: 13, color: '#1e3a5f', margin: 0, fontFamily: 'system-ui', lineHeight: 1.5 }}>{result.whenToCallProfessional}</p>
          </div>

          {/* Regulatory Note */}
          {result.regulatoryNote && (
            <div style={{
              background: '#fefce8', border: '1px solid #fde68a',
              borderRadius: 10, padding: 14, marginBottom: 12,
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'system-ui' }}>Regulatory Note</p>
              <p style={{ fontSize: 12, color: '#78350f', margin: 0, fontFamily: 'system-ui', lineHeight: 1.5 }}>{result.regulatoryNote}</p>
            </div>
          )}

          {/* Prevention Steps */}
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 10, padding: 16, marginBottom: 12,
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 10, fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Prevention
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {result.preventionSteps.map((s, i) => (
                <li key={i} style={{ fontSize: 13, color: '#15803d', lineHeight: 1.6, fontFamily: 'system-ui', marginBottom: 4 }}>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* CPP Service Cross-Reference */}
          {result.cppService && (
            <div style={{
              background: '#EEF1F7', border: '1px solid #A08C5A40',
              borderRadius: 10, padding: 14, marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#A08C5A', fontFamily: 'system-ui' }}>
                {'\u2605'} EvidLY Partner Service:
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-primary, #0B1628)', fontFamily: 'system-ui' }}>{result.cppService}</span>
              <button
                onClick={() => navigate('/vendors')}
                style={{
                  marginLeft: 'auto', background: '#A08C5A', border: 'none',
                  borderRadius: 6, padding: '5px 12px',
                  color: '#ffffff', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'system-ui',
                }}
              >
                View Vendor {'\u2192'}
              </button>
            </div>
          )}

          {/* Video Capture */}
          <VideoCapture onVideoReady={handleVideoReady} />

          {/* Photo Capture */}
          <PhotoCapture photos={photos} onPhotosChange={setPhotos} />

          {/* Vendor Notification */}
          <VendorNotification
            result={result}
            categoryId={selectedCategory.id}
            hasVideo={!!videoBlob}
            hasPhotos={photos.length > 0}
            photoCount={photos.length}
          />

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={() => {
                // Notification forwarding to Manager + Owner/Operator
                const priority = DIAGNOSIS_PRIORITY_MAP[selectedCategory.id] || 'medium';
                const priorityLabel = priority === 'critical' ? 'CRITICAL' : priority === 'high' ? 'HIGH' : 'MEDIUM';
                const notifTitle = `[${priorityLabel}] ${selectedCategory.label}: ${result.title}`;
                const notifType = priority === 'critical' ? 'alert' : 'info';
                const now = new Date();
                const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

                const newNotif = {
                  id: `diag_${Date.now()}`,
                  title: notifTitle,
                  time: timeStr,
                  link: '/incidents',
                  type: notifType as 'alert' | 'info',
                  locationId: 'downtown',
                  read: false,
                };
                setNotifications([newNotif, ...notifications]);

                const evidence: string[] = [];
                if (videoBlob) evidence.push('video');
                if (photos.length > 0) evidence.push(`${photos.length} photo${photos.length !== 1 ? 's' : ''}`);
                const evidenceNote = evidence.length > 0 ? ` Evidence: ${evidence.join(', ')}.` : '';

                toast.success(`Notification sent to Manager and Owner/Operator.${evidenceNote}`);
                alert('Incident logged in EvidLY. In production, this creates a corrective action record with the diagnosis details and any attached evidence.');
              }}
              style={{
                flex: 1, background: '#1e4d6b', border: 'none',
                borderRadius: 8, padding: '12px 20px',
                color: '#ffffff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'system-ui',
              }}
            >
              Log as Incident
            </button>
            <button
              onClick={reset}
              style={{
                background: 'transparent', border: '1px solid #e5e7eb',
                borderRadius: 8, padding: '12px 20px',
                color: '#6b7280', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui',
              }}
            >
              New Diagnosis
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
