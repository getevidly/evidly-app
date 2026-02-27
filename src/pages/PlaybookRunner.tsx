import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
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
  ChevronRight,
  ChevronLeft,
  Download,
  Printer,
  Clock,
  MapPin,
  User,
  AlertOctagon,
  Pause,
  Play,
  SkipForward,
  X,
  MessageSquare,
  Bot,
  DollarSign,
  Search,
  Plus,
  Minus,
  Thermometer,
  Pen,
  Ban,
} from 'lucide-react';
import {
  playbookTemplates,
  activeIncidentPlaybooks,
  demoPlaybookAiMessages,
  demoFoodDisposition,
  commonTCSFoods,
  type PlaybookStep,
  type ActiveIncidentPlaybook,
  type PlaybookSeverity,
  type FoodDispositionEntry,
  type PlaybookAiMessage,
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
  .playbook-ai-drawer {
    width: 100% !important;
    right: 0 !important;
  }
}
`;

// ── Signature Pad Sub-component ─────────────────────────────
function SignaturePad({ onAccept, onCancel }: { onAccept: (dataUrl: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div style={{ marginBottom: 20, padding: 16, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Pen size={15} /> Signature Required
      </h4>
      <canvas
        ref={canvasRef}
        width={300}
        height={150}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        style={{ display: 'block', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'crosshair', touchAction: 'none' }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={clearCanvas} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          Clear
        </button>
        <button onClick={() => onAccept(canvasRef.current!.toDataURL())} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#22c55e', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          Accept Signature
        </button>
        <button onClick={onCancel} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Temperature Input Sub-component ─────────────────────────
function TemperatureInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const bgColor = value <= 40 ? '#dcfce7' : value <= 70 ? '#fef9c3' : '#fee2e2';
  const textColor = value <= 40 ? '#166534' : value <= 70 ? '#854d0e' : '#991b1b';
  return (
    <div style={{ marginBottom: 20, padding: 16, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Thermometer size={15} /> Temperature Reading
      </h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={() => onChange(Math.max(-20, value - 1))}
          style={{ width: 56, height: 56, borderRadius: 28, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Minus size={20} color="#374151" />
        </button>
        <div style={{ width: 120, height: 80, borderRadius: 12, background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid ' + textColor + '40' }}>
          <span style={{ fontSize: 40, fontWeight: 800, color: textColor, fontFamily: "'DM Sans', sans-serif" }}>{value}°</span>
        </div>
        <button
          onClick={() => onChange(Math.min(212, value + 1))}
          style={{ width: 56, height: 56, borderRadius: 28, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={20} color="#374151" />
        </button>
      </div>
      <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', margin: '8px 0 0' }}>
        Safe: ≤40°F (cold) or ≥140°F (hot) &bull; Danger Zone: 41–139°F
      </p>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
export function PlaybookRunner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

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
  const [isPaused, setIsPaused] = useState(false);
  const stepStartRef = useRef(Date.now());

  // AI Copilot
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiMessages, setAiMessages] = useState<PlaybookAiMessage[]>([]);

  // Food Disposition
  const [showFoodDisposition, setShowFoodDisposition] = useState(false);
  const [foodItems, setFoodItems] = useState<FoodDispositionEntry[]>([...demoFoodDisposition]);
  const [foodSearch, setFoodSearch] = useState('');

  // Skip / Abandon
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [abandonReason, setAbandonReason] = useState('');
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());

  // Signature
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Temperature
  const [tempValue, setTempValue] = useState(38);

  // Initialize from incident data
  useEffect(() => {
    if (incident && template) {
      const startStep = incident.currentStepNumber - 1;
      setCurrentStep(startStep);

      const done = new Set<number>();
      for (let i = 0; i < startStep; i++) done.add(i);
      setCompletedSteps(done);

      const preChecked: Record<string, Set<string>> = {};
      incident.stepLogs.forEach((log, idx) => {
        if (log.actionItemsCompleted.length > 0) {
          preChecked[idx.toString()] = new Set(log.actionItemsCompleted);
        }
      });
      setCheckedItems(preChecked);

      const preNotes: Record<string, string> = {};
      incident.stepLogs.forEach((log, idx) => {
        if (log.notes) preNotes[idx.toString()] = log.notes;
      });
      setStepNotes(preNotes);

      const prePhotos: Record<string, number> = {};
      incident.stepLogs.forEach((log, idx) => {
        if (log.photosTaken > 0) prePhotos[idx.toString()] = log.photosTaken;
      });
      setPhotosTaken(prePhotos);

      const elapsedSec = Math.floor((Date.now() - new Date(incident.initiatedAt).getTime()) / 1000);
      setTotalSeconds(Math.max(0, elapsedSec));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load AI messages for current playbook
  useEffect(() => {
    if (template) {
      const msgs = demoPlaybookAiMessages.filter(m => m.playbookType === template.id || m.playbookType === 'general');
      setAiMessages(msgs);
    }
  }, [template]);

  // Timer
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setTotalSeconds(s => s + 1);
      setStepSeconds(Math.floor((Date.now() - stepStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Reset step timer when step changes
  useEffect(() => {
    stepStartRef.current = Date.now();
    setStepSeconds(0);
  }, [currentStep]);

  // Food disposition total
  const foodTotalLoss = foodItems
    .filter(f => f.decision === 'discard')
    .reduce((sum, f) => sum + f.quantity * f.costPerUnit, 0);

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
    toast.success('Photo captured');
  };

  const handleCompleteStep = () => {
    setCompletedSteps(prev => new Set(prev).add(currentStep));
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowReport(true);
    }
  };

  const handleSkipStep = () => {
    if (!skipReason.trim()) return;
    setSkippedSteps(prev => new Set(prev).add(currentStep));
    setShowSkipModal(false);
    setSkipReason('');
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowReport(true);
    }
  };

  const handleAbandon = () => {
    if (!abandonReason.trim()) return;
    setShowAbandonModal(false);
    toast.success('Playbook abandoned. Partial report saved');
    navigate('/playbooks');
  };

  const handleFoodDecision = (idx: number, decision: FoodDispositionEntry['decision']) => {
    setFoodItems(prev => prev.map((f, i) => i === idx ? { ...f, decision } : f));
  };

  const handleAddFood = (name: string) => {
    setFoodItems(prev => [...prev, {
      foodName: name,
      category: 'Other',
      quantity: 1,
      unit: 'lb',
      costPerUnit: 5.00,
      currentTemp: 55,
      timeInDangerZone: 0,
      decision: 'keep',
    }]);
    setFoodSearch('');
  };

  // Filtered AI messages for current step
  const currentAiMessages = aiMessages.filter(
    m => m.stepNumber === step?.stepNumber || m.stepNumber === 0
  );

  // Is this a food evaluation step (step 6 of power outage)?
  const isFoodEvalStep = step?.title?.toLowerCase().includes('food') || step?.title?.toLowerCase().includes('inventory') || currentStep === 5;

  // Is this the final step (needs signature)?
  const isFinalStep = currentStep === steps.length - 1;

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
          <div style={{ padding: '16px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
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
          <div style={{ padding: '16px 16px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Step-by-Step Summary</h3>
            {steps.map((s, idx) => {
              const isDone = completedSteps.has(idx);
              const isSkipped = skippedSteps.has(idx);
              const notes = stepNotes[idx.toString()];
              const photos = photosTaken[idx.toString()] || 0;
              const checked = checkedItems[idx.toString()] || new Set();
              return (
                <div key={s.id} style={{ marginBottom: 16, padding: 16, borderRadius: 8, border: '1px solid #e5e7eb', background: isSkipped ? '#fefce8' : isDone ? '#f0fdf4' : '#f9fafb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {isSkipped
                      ? <SkipForward size={18} color="#d97706" />
                      : isDone
                        ? <CheckCircle2 size={18} color="#22c55e" />
                        : <Circle size={18} color="#d1d5db" />
                    }
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Step {s.stepNumber}: {s.title}</span>
                    {isSkipped && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: '#fef9c3', color: '#854d0e' }}>Skipped</span>}
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

            {/* Food disposition summary in report */}
            {foodItems.filter(f => f.decision === 'discard').length > 0 && (
              <div style={{ marginTop: 20, padding: 20, borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a' }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <DollarSign size={16} /> Food Disposition Summary
                </h4>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #fde68a' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: '#92400e', fontWeight: 600 }}>Item</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: '#92400e', fontWeight: 600 }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: '#92400e', fontWeight: 600 }}>Temp</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: '#92400e', fontWeight: 600 }}>Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foodItems.filter(f => f.decision === 'discard').map((f, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #fef3c7' }}>
                        <td style={{ padding: '6px 8px', color: '#78350f' }}>{f.foodName}</td>
                        <td style={{ padding: '6px 8px', color: '#78350f', textAlign: 'right' }}>{f.quantity} {f.unit}</td>
                        <td style={{ padding: '6px 8px', color: '#78350f', textAlign: 'right' }}>{f.currentTemp}°F</td>
                        <td style={{ padding: '6px 8px', color: '#991b1b', textAlign: 'right', fontWeight: 600 }}>${(f.quantity * f.costPerUnit).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #f59e0b' }}>
                      <td colSpan={3} style={{ padding: '8px 8px', fontWeight: 700, color: '#92400e' }}>Total Estimated Loss</td>
                      <td style={{ padding: '8px 8px', fontWeight: 700, color: '#991b1b', textAlign: 'right' }}>${foodTotalLoss.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              </div>
            )}

            {/* Compliance Narrative */}
            <div style={{ marginTop: 24, padding: 20, borderRadius: 10, background: '#eef4f8', border: '1px solid #b8d4e8' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e4d6b', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <EvidlyIcon size={16} /> Compliance Narrative
              </h4>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>
                On {new Date(incident.initiatedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, a {incident.templateTitle.toLowerCase()} incident was reported at {incident.location}. The response was initiated by {incident.initiatedBy} following the EvidLY standardized playbook protocol. {completedSteps.size} of {steps.length} steps were completed{skippedSteps.size > 0 ? ` (${skippedSteps.size} skipped)` : ''} with documented evidence, timestamped actions, and regulatory compliance references ({template.regulatoryBasis}). {foodTotalLoss > 0 ? `Estimated food loss: $${foodTotalLoss.toFixed(2)}. ` : ''}Total response time: {formatTimer(totalSeconds)}. This report serves as a legal defense file demonstrating proactive, protocol-driven incident management.
              </p>
            </div>

            {/* Signature display */}
            {signatureData && (
              <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Completion Signature</h4>
                <img src={signatureData} alt="Signature" style={{ maxWidth: 300, border: '1px solid #d1d5db', borderRadius: 6 }} />
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <button
                onClick={() => guardAction('download', 'Incident Playbooks', () => toast.success('PDF download started'))}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, fontFamily: "'DM Sans', sans-serif" }}
              >
                <Download size={14} /> Download PDF
              </button>
              <button
                onClick={() => guardAction('export', 'Incident Playbooks', () => toast.success('Insurance claim report generated'))}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d4af37', background: '#fffbeb', color: '#92400e', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, fontFamily: "'DM Sans', sans-serif" }}
              >
                <DollarSign size={14} /> Insurance Report
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

      {/* Paused overlay */}
      {isPaused && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '24px 20px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxWidth: '95vw' }}>
            <Pause size={48} color="#d97706" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>PAUSED</h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px' }}>Timer is paused. Resume to continue.</p>
            <button
              onClick={() => { setIsPaused(false); stepStartRef.current = Date.now() - stepSeconds * 1000; }}
              style={{ padding: '12px 32px', borderRadius: 8, border: 'none', background: '#22c55e', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 48, fontFamily: "'DM Sans', sans-serif" }}
            >
              <Play size={18} /> Resume
            </button>
          </div>
        </div>
      )}

      {/* Skip Step Modal */}
      {showSkipModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#991b1b', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <SkipForward size={18} /> Skip Step {step.stepNumber}?
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>
              Skipping a step will be flagged in the compliance report. A reason is required.
            </p>
            <textarea
              value={skipReason}
              onChange={e => setSkipReason(e.target.value)}
              placeholder="Enter reason for skipping this step (required)..."
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowSkipModal(false); setSkipReason(''); }} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
              <button
                onClick={() => guardAction('skip', 'Incident Playbooks', handleSkipStep)}
                disabled={!skipReason.trim()}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: skipReason.trim() ? '#dc2626' : '#d1d5db', color: 'white', fontSize: 13, fontWeight: 600, cursor: skipReason.trim() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif" }}
              >
                Skip Step
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abandon Playbook Modal */}
      {showAbandonModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#991b1b', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ban size={18} /> Abandon Playbook?
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>
              This will end the active response. A partial report will be saved and the regional manager will be notified. A reason is required.
            </p>
            <textarea
              value={abandonReason}
              onChange={e => setAbandonReason(e.target.value)}
              placeholder="Enter reason for abandoning (required)..."
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAbandonModal(false); setAbandonReason(''); }} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
              <button
                onClick={() => guardAction('abandon', 'Incident Playbooks', handleAbandon)}
                disabled={!abandonReason.trim()}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: abandonReason.trim() ? '#991b1b' : '#d1d5db', color: 'white', fontSize: 13, fontWeight: 600, cursor: abandonReason.trim() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif" }}
              >
                Abandon Playbook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <button
          onClick={() => navigate('/playbooks')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', background: 'none', border: 'none', color: '#6b7280', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
        >
          <ArrowLeft size={16} /> Back to Playbooks
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            style={{ padding: '8px 16px', borderRadius: 8, border: showAiPanel ? '2px solid #1e4d6b' : '1px solid #d1d5db', background: showAiPanel ? '#eef4f8' : 'white', color: showAiPanel ? '#1e4d6b' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 40, fontFamily: "'DM Sans', sans-serif" }}
          >
            <Bot size={15} /> AI Help
          </button>
          {isFoodEvalStep && (
            <button
              onClick={() => setShowFoodDisposition(!showFoodDisposition)}
              style={{ padding: '8px 16px', borderRadius: 8, border: showFoodDisposition ? '2px solid #d97706' : '1px solid #d1d5db', background: showFoodDisposition ? '#fffbeb' : 'white', color: showFoodDisposition ? '#92400e' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 40, fontFamily: "'DM Sans', sans-serif" }}
            >
              <DollarSign size={15} /> Food Disposition
            </button>
          )}
        </div>
      </div>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <Timer size={12} /> {formatTimer(totalSeconds)}
              </div>
              {/* Pause/Resume button */}
              <button
                onClick={() => setIsPaused(!isPaused)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: isPaused ? '#fef2f2' : 'white', color: isPaused ? '#991b1b' : '#374151', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}
              >
                {isPaused ? <><Play size={12} /> Resume</> : <><Pause size={12} /> Pause Timer</>}
              </button>
            </div>
          </div>

          {/* Step list */}
          <div style={{ padding: '12px 10px' }}>
            {steps.map((s, idx) => {
              const isDone = completedSteps.has(idx);
              const isSkippedStep = skippedSteps.has(idx);
              const isCurrent = idx === currentStep;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (isDone || isCurrent || isSkippedStep) setCurrentStep(idx);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 6,
                    marginBottom: 2,
                    cursor: isDone || isCurrent || isSkippedStep ? 'pointer' : 'default',
                    background: isCurrent ? '#eef4f8' : 'transparent',
                    border: isCurrent ? '1px solid #b8d4e8' : '1px solid transparent',
                    opacity: !isDone && !isCurrent && !isSkippedStep ? 0.5 : 1,
                  }}
                >
                  {isSkippedStep
                    ? <SkipForward size={16} color="#d97706" style={{ flexShrink: 0 }} />
                    : isDone
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
                    color: isSkippedStep ? '#d97706' : isDone ? '#22c55e' : isCurrent ? '#1e4d6b' : '#9ca3af',
                    lineHeight: 1.3,
                  }}>
                    {s.stepNumber}. {s.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Abandon button */}
          <div style={{ padding: '12px 18px', borderTop: '1px solid #e5e7eb' }}>
            <button
              onClick={() => setShowAbandonModal(true)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: 'none', background: 'transparent', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: "'DM Sans', sans-serif" }}
            >
              <Ban size={13} /> Abandon Playbook
            </button>
          </div>
        </div>

        {/* ── Main Content ───────────────────────────────── */}
        <div className="playbook-main" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {/* Step header */}
            <div style={{ padding: '16px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Step {step.stepNumber} of {steps.length}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {step.regulatoryReference && (
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: '#eef4f8', color: '#1e4d6b', fontWeight: 500, border: '1px solid #b8d4e8' }}>
                      <EvidlyIcon size={11} className="inline align-middle mr-0.5" />
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

            <div style={{ padding: '16px 16px' }}>
              {/* Critical warning */}
              {step.criticalWarning && (
                <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AlertOctagon size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', margin: 0, lineHeight: 1.5 }}>{step.criticalWarning}</p>
                </div>
              )}

              {/* Description */}
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: '0 0 20px' }}>{step.description}</p>

              {/* Temperature input (show on steps that mention temperature) */}
              {(step.title.toLowerCase().includes('temperature') || step.title.toLowerCase().includes('temp') || step.description.toLowerCase().includes('record temperature')) && (
                <TemperatureInput value={tempValue} onChange={setTempValue} />
              )}

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

              {/* Signature pad (final step) */}
              {isFinalStep && !signatureData && (
                showSignaturePad ? (
                  <SignaturePad
                    onAccept={(dataUrl) => { setSignatureData(dataUrl); setShowSignaturePad(false); }}
                    onCancel={() => setShowSignaturePad(false)}
                  />
                ) : (
                  <div style={{ marginBottom: 20 }}>
                    <button
                      onClick={() => setShowSignaturePad(true)}
                      style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <Pen size={14} /> Add Completion Signature
                    </button>
                  </div>
                )
              )}
              {isFinalStep && signatureData && (
                <div style={{ marginBottom: 20, padding: 12, borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={14} /> Signature captured
                    </span>
                    <button onClick={() => { setSignatureData(null); setShowSignaturePad(true); }} style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      Redo
                    </button>
                  </div>
                  <img src={signatureData} alt="Signature" style={{ maxWidth: 200, border: '1px solid #d1d5db', borderRadius: 4 }} />
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

              {/* Food Disposition Panel (inline) */}
              {showFoodDisposition && isFoodEvalStep && (
                <div style={{ marginBottom: 20, padding: 20, borderRadius: 10, background: '#fffbeb', border: '2px solid #fde68a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#92400e', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <DollarSign size={18} /> Food Disposition Tracker
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                      <span style={{ color: '#6b7280' }}>{foodItems.length} items</span>
                      <span style={{ fontWeight: 700, color: '#991b1b' }}>Loss: ${foodTotalLoss.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Quick-add search */}
                  <div style={{ marginBottom: 16, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid #fde68a', background: 'white' }}>
                      <Search size={14} color="#9ca3af" />
                      <input
                        value={foodSearch}
                        onChange={e => setFoodSearch(e.target.value)}
                        placeholder="Quick add TCS food item..."
                        style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: 'transparent' }}
                      />
                    </div>
                    {foodSearch.length > 1 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10 }}>
                        {commonTCSFoods
                          .filter(f => f.toLowerCase().includes(foodSearch.toLowerCase()))
                          .slice(0, 6)
                          .map(f => (
                            <div
                              key={f}
                              onClick={() => handleAddFood(f)}
                              style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#374151' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#fef9c3')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                            >
                              <Plus size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                              {f}
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>

                  {/* Food items list */}
                  {foodItems.map((item, idx) => {
                    const isDiscard = item.decision === 'discard';
                    const isKeep = item.decision === 'keep';
                    const isCookNow = item.decision === 'cook_now';
                    const isRefreeze = item.decision === 'refreeze';
                    return (
                      <div key={idx} style={{ padding: 12, borderRadius: 8, marginBottom: 8, background: isDiscard ? '#fef2f2' : isKeep ? '#f0fdf4' : isCookNow ? '#fefce8' : isRefreeze ? '#eff6ff' : '#f9fafb', border: `1px solid ${isDiscard ? '#fca5a5' : isKeep ? '#86efac' : isCookNow ? '#fde047' : isRefreeze ? '#93c5fd' : '#e5e7eb'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.foodName}</span>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>{item.quantity} {item.unit} &bull; ${(item.quantity * item.costPerUnit).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, color: '#6b7280' }}>
                          <Thermometer size={12} />
                          <span>{item.currentTemp}°F</span>
                          {item.timeInDangerZone > 0 && <span>&bull; {item.timeInDangerZone}h in danger zone</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(['keep', 'discard', 'cook_now', 'refreeze'] as const).map(dec => {
                            const labels: Record<string, { text: string; bg: string; border: string; color: string }> = {
                              keep:     { text: 'KEEP', bg: '#dcfce7', border: '#22c55e', color: '#166534' },
                              discard:  { text: 'DISCARD', bg: '#fee2e2', border: '#dc2626', color: '#991b1b' },
                              cook_now: { text: 'COOK NOW', bg: '#fef9c3', border: '#d97706', color: '#854d0e' },
                              refreeze: { text: 'REFREEZE', bg: '#dbeafe', border: '#3b82f6', color: '#1e40af' },
                            };
                            const l = labels[dec];
                            const isActive = item.decision === dec;
                            return (
                              <button
                                key={dec}
                                onClick={() => handleFoodDecision(idx, dec)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  border: `2px solid ${isActive ? l.border : 'transparent'}`,
                                  background: isActive ? l.bg : '#f3f4f6',
                                  color: isActive ? l.color : '#9ca3af',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  fontFamily: "'DM Sans', sans-serif",
                                  minHeight: 32,
                                }}
                              >
                                {l.text}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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
                  onClick={() => setShowSkipModal(true)}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: 'white', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, minHeight: 48, fontFamily: "'DM Sans', sans-serif" }}
                >
                  <SkipForward size={14} /> Skip
                </button>
                <button
                  onClick={() => guardAction('complete', 'Incident Playbooks', handleCompleteStep)}
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

        {/* ── AI Copilot Drawer ──────────────────────────── */}
        {showAiPanel && (
          <div
            className="playbook-ai-drawer"
            style={{
              width: 340,
              minWidth: 340,
              background: 'white',
              borderRadius: 12,
              border: '1px solid #b8d4e8',
              overflow: 'hidden',
              position: 'sticky',
              top: 16,
              maxHeight: 'calc(100vh - 120px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', background: '#eef4f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bot size={18} color="#1e4d6b" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e4d6b' }}>AI Copilot</span>
              </div>
              <button onClick={() => setShowAiPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={16} color="#6b7280" />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Context banner */}
              <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fefce8', border: '1px solid #fde68a', fontSize: 11, color: '#854d0e', lineHeight: 1.4 }}>
                <strong>Context:</strong> Step {step.stepNumber} — {step.title}
              </div>

              {currentAiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: '#374151',
                    ...(msg.role === 'assistant'
                      ? { background: '#eef4f8', border: '1px solid #b8d4e8', borderBottomLeftRadius: 2 }
                      : { background: '#fefce8', border: '1px solid #fde68a', borderBottomLeftRadius: 2 }
                    ),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11, fontWeight: 600, color: msg.role === 'assistant' ? '#1e4d6b' : '#92400e' }}>
                    {msg.role === 'assistant' ? <Bot size={12} /> : <AlertTriangle size={12} />}
                    {msg.role === 'assistant' ? 'AI Copilot' : 'System Alert'}
                  </div>
                  {msg.content}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {msg.suggestions.map((s, si) => (
                        <button
                          key={si}
                          onClick={() => toast.info(`AI suggestion: "${s}" — demo mode`)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #b8d4e8', background: 'white', color: '#1e4d6b', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {currentAiMessages.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  <Bot size={24} style={{ margin: '0 auto 8px', display: 'block' }} color="#d1d5db" />
                  AI assistance available for this step. Ask a question below.
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="Ask AI for help..."
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      toast.info('AI Copilot coming soon');
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
                />
                <button
                  onClick={() => toast.info('AI Copilot coming soon')}
                  style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <MessageSquare size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}

export default PlaybookRunner;
