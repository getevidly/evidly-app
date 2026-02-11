import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Siren,
  Zap,
  AlertTriangle,
  Flame,
  ClipboardCheck,
  Wrench,
  UserX,
  Droplets,
  Wind,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Camera,
  FileText,
  Timer,
  Shield,
  ChevronRight,
  ChevronLeft,
  Download,
  Printer,
  Clock,
  MapPin,
  User,
  AlertOctagon,
} from 'lucide-react';
import {
  playbookTemplates,
  activeIncidentPlaybooks,
  type PlaybookStep,
  type ActiveIncidentPlaybook,
  type PlaybookSeverity,
} from '../data/demoData';

// ── Icon map ────────────────────────────────────────────────
const ICON_MAP: Record<string, typeof Zap> = {
  Zap, AlertTriangle, Flame, ClipboardCheck, Wrench, UserX, Droplets, Wind,
};

const SEVERITY_CONFIG: Record<PlaybookSeverity, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'Critical', bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  high:     { label: 'High',     bg: '#fff7ed', text: '#9a3412', border: '#fdba74' },
  medium:   { label: 'Medium',   bg: '#fefce8', text: '#854d0e', border: '#fde047' },
  low:      { label: 'Low',      bg: '#f0fdf4', text: '#166534', border: '#86efac' },
};

// ── Timer formatting ────────────────────────────────────────
function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatShortTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Responsive style ────────────────────────────────────────
const RESPONSIVE_STYLES = `
@media (max-width: 768px) {
  .playbook-runner-layout {
    flex-direction: column !important;
  }
  .playbook-sidebar {
    width: 100% !important;
    min-width: 0 !important;
    max-height: 200px !important;
    overflow-y: auto !important;
  }
  .playbook-main {
    min-width: 0 !important;
  }
}
`;

// ── Main Component ──────────────────────────────────────────
export function PlaybookRunner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Find the active incident
  const incident = activeIncidentPlaybooks.find(i => i.id === id);
  const template = incident ? playbookTemplates.find(t => t.id === incident.templateId) : null;

  // Step state
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<string>>>({});
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});
  const [photosTaken, setPhotosTaken] = useState<Record<string, number>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showReport, setShowReport] = useState(false);

  // Timers
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [stepSeconds, setStepSeconds] = useState(0);
  const stepStartRef = useRef(Date.now());

  // Initialize from incident data
  useEffect(() => {
    if (incident && template) {
      const startStep = incident.currentStepNumber - 1; // 0-indexed
      setCurrentStep(startStep);

      // Mark earlier steps as completed
      const done = new Set<number>();
      for (let i = 0; i < startStep; i++) done.add(i);
      setCompletedSteps(done);

      // Preload checked items from demo step logs
      const preChecked: Record<string, Set<string>> = {};
      incident.stepLogs.forEach((log, idx) => {
        if (log.actionItemsCompleted.length > 0) {
          preChecked[idx.toString()] = new Set(log.actionItemsCompleted);
        }
      });
      setCheckedItems(preChecked);

      // Preload notes
      const preNotes: Record<string, string> = {};
      incident.stepLogs.forEach((log, idx) => {
        if (log.notes) preNotes[idx.toString()] = log.notes;
      });
      setStepNotes(preNotes);

      // Preload photos
      const prePhotos: Record<string, number> = {};
      incident.stepLogs.forEach((log, idx) => {
        if (log.photosTaken > 0) prePhotos[idx.toString()] = log.photosTaken;
      });
      setPhotosTaken(prePhotos);

      // Set initial elapsed time
      const elapsedSec = Math.floor((Date.now() - new Date(incident.initiatedAt).getTime()) / 1000);
      setTotalSeconds(Math.max(0, elapsedSec));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalSeconds(s => s + 1);
      setStepSeconds(Math.floor((Date.now() - stepStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset step timer when step changes
  useEffect(() => {
    stepStartRef.current = Date.now();
    setStepSeconds(0);
  }, [currentStep]);

  if (!incident || !template) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", textAlign: 'center', padding: 48 }}>
        <AlertTriangle size={32} color="#9ca3af" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: '#6b7280', fontSize: 14 }}>Incident not found.</p>
        <button onClick={() => navigate('/playbooks')} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          Back to Playbooks
        </button>
      </div>
    );
  }

  const steps = template.steps;
  const step = steps[currentStep];
  const Icon = ICON_MAP[template.icon] || Siren;
  const sev = SEVERITY_CONFIG[incident.severity];
  const stepKey = currentStep.toString();

  // Check if current step can be completed
  const requiredItems = step?.actionItems.filter(a => a.required) || [];
  const checkedForStep = checkedItems[stepKey] || new Set();
  const allRequiredChecked = requiredItems.every(item => checkedForStep.has(item.id));
  const hasPhotoIfRequired = !step?.photoRequired || (photosTaken[stepKey] || 0) > 0;
  const canComplete = allRequiredChecked && hasPhotoIfRequired;

  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => {
      const current = new Set(prev[stepKey] || []);
      if (current.has(itemId)) current.delete(itemId);
      else current.add(itemId);
      return { ...prev, [stepKey]: current };
    });
  };

  const handleTakePhoto = () => {
    setPhotosTaken(prev => ({
      ...prev,
      [stepKey]: (prev[stepKey] || 0) + 1,
    }));
    alert('Photo captured! (Demo — in production, opens device camera)');
  };

  const handleCompleteStep = () => {
    setCompletedSteps(prev => new Set(prev).add(currentStep));
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowReport(true);
    }
  };

  // ── Report View ─────────────────────────────────────────
  if (showReport) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: 900, margin: '0 auto' }}>
        <style>{RESPONSIVE_STYLES}</style>

        <button
          onClick={() => navigate('/playbooks')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', background: 'none', border: 'none', color: '#6b7280', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}
        >
          <ArrowLeft size={16} /> Back to Playbooks
        </button>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {/* Report header */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Icon size={24} color={template.color} />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Incident Report</h1>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: '0 0 12px' }}>{incident.templateTitle} — {incident.location}</h2>
            <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#6b7280', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={14} /> {incident.initiatedBy}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> Total: {formatTimer(totalSeconds)}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>{sev.label}</span>
              </span>
            </div>
          </div>

          {/* Steps summary */}
          <div style={{ padding: '24px 28px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Step-by-Step Summary</h3>
            {steps.map((s, idx) => {
              const isDone = completedSteps.has(idx);
              const notes = stepNotes[idx.toString()];
              const photos = photosTaken[idx.toString()] || 0;
              const checked = checkedItems[idx.toString()] || new Set();
              return (
                <div key={s.id} style={{ marginBottom: 16, padding: 16, borderRadius: 8, border: '1px solid #e5e7eb', background: isDone ? '#f0fdf4' : '#f9fafb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {isDone
                      ? <CheckCircle2 size={18} color="#22c55e" />
                      : <Circle size={18} color="#d1d5db" />
                    }
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Step {s.stepNumber}: {s.title}</span>
                  </div>
                  <div style={{ marginLeft: 26, fontSize: 13, color: '#6b7280' }}>
                    <p style={{ margin: '0 0 6px', lineHeight: 1.5 }}>{s.description.substring(0, 120)}...</p>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                      <span>{checked.size}/{s.actionItems.length} items checked</span>
                      {photos > 0 && <span>{photos} photo(s)</span>}
                      {notes && <span>Notes added</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Compliance Narrative */}
            <div style={{ marginTop: 24, padding: 20, borderRadius: 10, background: '#eef4f8', border: '1px solid #b8d4e8' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e4d6b', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={16} /> Compliance Narrative
              </h4>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>
                On {new Date(incident.initiatedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, a {incident.templateTitle.toLowerCase()} incident was reported at {incident.location}. The response was initiated by {incident.initiatedBy} following the EvidLY standardized playbook protocol. All {steps.length} steps were executed with documented evidence, timestamped actions, and regulatory compliance references ({template.regulatoryBasis}). Total response time: {formatTimer(totalSeconds)}. This report serves as a legal defense file demonstrating proactive, protocol-driven incident management.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <button
                onClick={() => alert('Download PDF — complete incident report with all timestamped evidence, photos, action items, and compliance narrative.')}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, fontFamily: "'DM Sans', sans-serif" }}
              >
                <Download size={14} /> Download PDF
              </button>
              <button
                onClick={() => window.print()}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, fontFamily: "'DM Sans', sans-serif" }}
              >
                <Printer size={14} /> Print Report
              </button>
              <button
                onClick={() => navigate('/playbooks')}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44, fontFamily: "'DM Sans', sans-serif" }}
              >
                Back to Playbooks
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Runner View ────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{RESPONSIVE_STYLES}</style>

      {/* Top nav */}
      <button
        onClick={() => navigate('/playbooks')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', background: 'none', border: 'none', color: '#6b7280', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}
      >
        <ArrowLeft size={16} /> Back to Playbooks
      </button>

      <div className="playbook-runner-layout" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* ── Left Sidebar ───────────────────────────────── */}
        <div className="playbook-sidebar" style={{ width: 280, minWidth: 280, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', position: 'sticky', top: 16 }}>
          {/* Incident header */}
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #e5e7eb', background: template.color + '0a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon size={20} color={template.color} />
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>{sev.label}</span>
            </div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>{incident.templateTitle}</h2>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <MapPin size={12} /> {incident.location}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Timer size={12} /> {formatTimer(totalSeconds)}
              </div>
            </div>
          </div>

          {/* Step list */}
          <div style={{ padding: '12px 10px' }}>
            {steps.map((s, idx) => {
              const isDone = completedSteps.has(idx);
              const isCurrent = idx === currentStep;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (isDone || isCurrent) setCurrentStep(idx);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 6,
                    marginBottom: 2,
                    cursor: isDone || isCurrent ? 'pointer' : 'default',
                    background: isCurrent ? '#eef4f8' : 'transparent',
                    border: isCurrent ? '1px solid #b8d4e8' : '1px solid transparent',
                    opacity: !isDone && !isCurrent ? 0.5 : 1,
                  }}
                >
                  {isDone
                    ? <CheckCircle2 size={16} color="#22c55e" style={{ flexShrink: 0 }} />
                    : isCurrent
                      ? <div style={{ width: 16, height: 16, borderRadius: 8, border: '2px solid #1e4d6b', background: '#1e4d6b', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 6, height: 6, borderRadius: 3, background: 'white' }} />
                        </div>
                      : <Circle size={16} color="#d1d5db" style={{ flexShrink: 0 }} />
                  }
                  <span style={{
                    fontSize: 12,
                    fontWeight: isCurrent ? 600 : 400,
                    color: isDone ? '#22c55e' : isCurrent ? '#1e4d6b' : '#9ca3af',
                    lineHeight: 1.3,
                  }}>
                    {s.stepNumber}. {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Main Content ───────────────────────────────── */}
        <div className="playbook-main" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {/* Step header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Step {step.stepNumber} of {steps.length}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {step.regulatoryReference && (
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: '#eef4f8', color: '#1e4d6b', fontWeight: 500, border: '1px solid #b8d4e8' }}>
                      <Shield size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                      {step.regulatoryReference}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Timer size={13} /> {formatShortTimer(stepSeconds)}
                  </span>
                </div>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>{step.title}</h2>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Critical warning */}
              {step.criticalWarning && (
                <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AlertOctagon size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', margin: 0, lineHeight: 1.5 }}>{step.criticalWarning}</p>
                </div>
              )}

              {/* Description */}
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: '0 0 20px' }}>{step.description}</p>

              {/* Action items */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>Action Items</h3>
                {step.actionItems.map(item => {
                  const isChecked = checkedForStep.has(item.id);
                  return (
                    <label
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        marginBottom: 6,
                        cursor: 'pointer',
                        background: isChecked ? '#f0fdf4' : '#f9fafb',
                        border: `1px solid ${isChecked ? '#86efac' : '#e5e7eb'}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItem(item.id)}
                        style={{ marginTop: 2, accentColor: '#22c55e', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 13, color: isChecked ? '#166534' : '#374151', lineHeight: 1.4, textDecoration: isChecked ? 'line-through' : 'none' }}>
                        {item.label}
                        {item.required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Photo capture */}
              {(step.photoRequired || step.photoPrompt) && (
                <div style={{ marginBottom: 20, padding: 16, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Camera size={15} />
                      Photo Evidence
                      {step.photoRequired && <span style={{ color: '#dc2626' }}>*</span>}
                    </h4>
                    {(photosTaken[stepKey] || 0) > 0 && (
                      <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>{photosTaken[stepKey]} captured</span>
                    )}
                  </div>
                  {step.photoPrompt && (
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px', lineHeight: 1.4 }}>{step.photoPrompt}</p>
                  )}
                  <button
                    onClick={handleTakePhoto}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 40, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Camera size={14} /> Take Photo
                  </button>
                </div>
              )}

              {/* Notes */}
              {step.notePrompt && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={15} /> Notes
                  </h4>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>{step.notePrompt}</p>
                  <textarea
                    value={stepNotes[stepKey] || ''}
                    onChange={e => setStepNotes(prev => ({ ...prev, [stepKey]: e.target.value }))}
                    rows={3}
                    placeholder="Enter notes..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {/* Timer display (for steps with timerMinutes) */}
              {step.timerMinutes && (
                <div style={{ marginBottom: 20, padding: 16, borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Timer size={20} color="#d97706" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>Timed Step — {step.timerMinutes} minutes recommended</div>
                    <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>Elapsed: {formatShortTimer(stepSeconds)}</div>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, minHeight: 48, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                )}
                <button
                  onClick={handleCompleteStep}
                  disabled={!canComplete}
                  style={{
                    flex: 1,
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: canComplete ? '#22c55e' : '#d1d5db',
                    color: canComplete ? 'white' : '#9ca3af',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: canComplete ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    minHeight: 48,
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'background 0.15s ease',
                  }}
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      <CheckCircle2 size={16} /> Complete & Generate Report
                    </>
                  ) : (
                    <>
                      Complete Step <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </div>

              {/* Completion hint */}
              {!canComplete && (
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
                  {!allRequiredChecked && 'Complete all required (*) action items'}
                  {!allRequiredChecked && !hasPhotoIfRequired && ' and '}
                  {!hasPhotoIfRequired && 'take required photo'}
                  {' to continue.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlaybookRunner;
