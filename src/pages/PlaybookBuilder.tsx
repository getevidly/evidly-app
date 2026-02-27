import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import {
  Siren, ArrowLeft, ChevronRight, ChevronLeft, Plus, Trash2,
  ChevronUp, ChevronDown, CheckCircle2, Camera, Thermometer,
  PenLine, FileText, Bell, Building2,
} from 'lucide-react';

type Step = 'basics' | 'steps' | 'notifications' | 'review';

const STEPS: { id: Step; label: string; number: number }[] = [
  { id: 'basics', label: 'Basics', number: 1 },
  { id: 'steps', label: 'Steps', number: 2 },
  { id: 'notifications', label: 'Notifications', number: 3 },
  { id: 'review', label: 'Review & Publish', number: 4 },
];

const CATEGORIES = [
  { value: 'environmental', label: 'Environmental' },
  { value: 'health_safety', label: 'Health & Safety' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'equipment', label: 'Equipment' },
] as const;

const SEVERITIES = [
  { value: 'critical', label: 'Critical', color: '#dc2626' },
  { value: 'high', label: 'High', color: '#ea580c' },
  { value: 'medium', label: 'Medium', color: '#d4af37' },
  { value: 'low', label: 'Low', color: '#16a34a' },
] as const;

const COLOR_OPTIONS = ['#dc2626', '#1e4d6b', '#15803d', '#7c3aed', '#d4af37', '#0369a1'];

const LOCATIONS = [
  { id: 'loc-downtown', name: 'Downtown Kitchen' },
  { id: 'loc-airport', name: 'Airport Terminal' },
  { id: 'loc-university', name: 'University Campus' },
];

interface StepDraft {
  id: string;
  stepNumber: number;
  title: string;
  instructions: string;
  requirePhoto: boolean;
  requireTemp: boolean;
  requireSignature: boolean;
  requireText: boolean;
  checklistItems: string[];
  timeLimitMinutes: number | null;
  escalationContact: string;
  escalationMinutes: number | null;
}

export function PlaybookBuilder() {
  const navigate = useNavigate();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const [step, setStep] = useState<Step>('basics');

  // Step 1: Basics
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'environmental' | 'health_safety' | 'regulatory' | 'equipment'>('health_safety');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [selectedColor, setSelectedColor] = useState('#dc2626');
  const [reviewSchedule, setReviewSchedule] = useState<'monthly' | 'quarterly' | 'annually'>('quarterly');

  // Step 2: Steps
  const [steps, setSteps] = useState<StepDraft[]>([{
    id: '1', stepNumber: 1, title: '', instructions: '', requirePhoto: false,
    requireTemp: false, requireSignature: false, requireText: false,
    checklistItems: [], timeLimitMinutes: null, escalationContact: '', escalationMinutes: null,
  }]);

  // Step 3: Notifications
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [notifyRegional, setNotifyRegional] = useState(true);
  const [notifyInsurance, setNotifyInsurance] = useState(false);
  const [notifyLocationMgr, setNotifyLocationMgr] = useState(true);

  // Step 4: Review
  const [assignLocations, setAssignLocations] = useState<string[]>([]);

  const stepIdx = STEPS.findIndex(s => s.id === step);

  const canNext = () => {
    if (step === 'basics') return title.trim().length > 0;
    if (step === 'steps') return steps.length >= 1;
    return true;
  };

  const goNext = () => { if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1].id); };
  const goBack = () => { if (stepIdx > 0) setStep(STEPS[stepIdx - 1].id); };

  const addStep = () => {
    const nextNum = steps.length + 1;
    setSteps([...steps, {
      id: String(nextNum), stepNumber: nextNum, title: '', instructions: '',
      requirePhoto: false, requireTemp: false, requireSignature: false, requireText: false,
      checklistItems: [], timeLimitMinutes: null, escalationContact: '', escalationMinutes: null,
    }]);
  };

  const updateStep = (idx: number, update: Partial<StepDraft>) => {
    const next = [...steps];
    next[idx] = { ...next[idx], ...update };
    setSteps(next);
  };

  const removeStep = (idx: number) => {
    if (steps.length <= 1) return;
    const next = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(next);
  };

  const moveStep = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === steps.length - 1) return;
    const next = [...steps];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setSteps(next.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const addChecklistItem = (stepIdx: number) => {
    const s = steps[stepIdx];
    updateStep(stepIdx, { checklistItems: [...s.checklistItems, ''] });
  };

  const updateChecklistItem = (stepIdx: number, itemIdx: number, value: string) => {
    const s = steps[stepIdx];
    const items = [...s.checklistItems];
    items[itemIdx] = value;
    updateStep(stepIdx, { checklistItems: items });
  };

  const removeChecklistItem = (stepIdx: number, itemIdx: number) => {
    const s = steps[stepIdx];
    updateStep(stepIdx, { checklistItems: s.checklistItems.filter((_, i) => i !== itemIdx) });
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: "'DM Sans', sans-serif" } as const;
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 } as const;

  const toggleSwitch = (value: boolean, onChange: () => void, label: string, icon: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <button onClick={onChange}
        style={{ width: 40, height: 22, borderRadius: 11, background: value ? '#1e4d6b' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: '#fff', position: 'absolute', top: 3, left: value ? 21 : 3, transition: 'left 0.2s' }} />
      </button>
      {icon}
      <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
    </div>
  );

  const severityColor = SEVERITIES.find(s => s.value === severity)?.color || '#ea580c';
  const categoryLabel = CATEGORIES.find(c => c.value === category)?.label || category;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <button onClick={() => navigate('/playbooks')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#1e4d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
        <ArrowLeft size={16} /> Back to Playbooks
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Siren size={24} color="#1e4d6b" /> Playbook Builder
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Create a custom incident response playbook with steps, checklists, and escalation rules</p>
        </div>
      </div>

      {/* Step Progress */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, overflowX: 'auto' }}>
        {STEPS.map((s, i) => {
          const isCurrent = s.id === step;
          const isDone = i < stepIdx;
          return (
            <button key={s.id} onClick={() => setStep(s.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', minHeight: 48, whiteSpace: 'nowrap' as const,
                borderRadius: 8, border: isCurrent ? '2px solid #1e4d6b' : '1px solid #e5e7eb',
                background: isDone ? '#eef4f8' : isCurrent ? '#fff' : '#f9fafb',
                color: isCurrent ? '#1e4d6b' : isDone ? '#1e4d6b' : '#9ca3af',
                fontSize: 13, fontWeight: isCurrent ? 700 : 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}>
              <span style={{
                width: 22, height: 22, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? '#1e4d6b' : isCurrent ? '#1e4d6b' : '#e5e7eb',
                color: isDone || isCurrent ? '#fff' : '#9ca3af', fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {isDone ? '\u2713' : s.number}
              </span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16, marginBottom: 20 }}>

        {/* Step 1: Basics */}
        {step === 'basics' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Playbook Basics</h2>
            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={labelStyle}>Playbook Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Kitchen Fire Response Protocol"
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  placeholder="Describe the purpose of this playbook and when it should be activated..."
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value as typeof category)} style={inputStyle}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Severity</label>
                  <select value={severity} onChange={e => setSeverity(e.target.value as typeof severity)} style={inputStyle}>
                    {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLOR_OPTIONS.map(c => (
                    <button key={c} onClick={() => setSelectedColor(c)}
                      style={{ width: 36, height: 36, borderRadius: 8, background: c, border: selectedColor === c ? '3px solid #111827' : '2px solid #e5e7eb', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Review Schedule</label>
                <select value={reviewSchedule} onChange={e => setReviewSchedule(e.target.value as typeof reviewSchedule)} style={inputStyle}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Steps */}
        {step === 'steps' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Playbook Steps ({steps.length})</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {steps.map((s, idx) => (
                <div key={s.id} style={{ padding: 20, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fafbfc' }}>
                  {/* Step header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 14, background: selectedColor, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>{s.stepNumber}</span>
                    <input value={s.title} onChange={e => updateStep(idx, { title: e.target.value })}
                      placeholder={`Step ${s.stepNumber} title`}
                      style={{ ...inputStyle, fontWeight: 600 }} />
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => moveStep(idx, 'up')} disabled={idx === 0}
                        style={{ padding: 4, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}>
                        <ChevronUp size={14} color="#6b7280" />
                      </button>
                      <button onClick={() => moveStep(idx, 'down')} disabled={idx === steps.length - 1}
                        style={{ padding: 4, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: idx === steps.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === steps.length - 1 ? 0.4 : 1 }}>
                        <ChevronDown size={14} color="#6b7280" />
                      </button>
                      {steps.length > 1 && (
                        <button onClick={() => removeStep(idx)}
                          style={{ padding: 4, borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', cursor: 'pointer' }}>
                          <Trash2 size={14} color="#dc2626" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Instructions</label>
                    <textarea value={s.instructions} onChange={e => updateStep(idx, { instructions: e.target.value })}
                      rows={3} placeholder="Detailed instructions for this step..."
                      style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>

                  {/* Toggle switches */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1" style={{ marginBottom: 14 }}>
                    {toggleSwitch(s.requirePhoto, () => updateStep(idx, { requirePhoto: !s.requirePhoto }), 'Require Photo', <Camera size={14} color="#6b7280" />)}
                    {toggleSwitch(s.requireTemp, () => updateStep(idx, { requireTemp: !s.requireTemp }), 'Require Temperature', <Thermometer size={14} color="#6b7280" />)}
                    {toggleSwitch(s.requireSignature, () => updateStep(idx, { requireSignature: !s.requireSignature }), 'Require Signature', <PenLine size={14} color="#6b7280" />)}
                    {toggleSwitch(s.requireText, () => updateStep(idx, { requireText: !s.requireText }), 'Require Text Notes', <FileText size={14} color="#6b7280" />)}
                  </div>

                  {/* Checklist items */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Checklist Items</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {s.checklistItems.map((item, itemIdx) => (
                        <div key={itemIdx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle2 size={14} color="#9ca3af" />
                          <input value={item} onChange={e => updateChecklistItem(idx, itemIdx, e.target.value)}
                            placeholder={`Checklist item ${itemIdx + 1}`}
                            style={{ ...inputStyle, padding: '6px 10px', fontSize: 13 }} />
                          <button onClick={() => removeChecklistItem(idx, itemIdx)}
                            style={{ padding: 4, borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', cursor: 'pointer', flexShrink: 0 }}>
                            <Trash2 size={12} color="#dc2626" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addChecklistItem(idx)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px dashed #d1d5db', background: 'transparent', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", width: 'fit-content' }}>
                        <Plus size={12} /> Add Item
                      </button>
                    </div>
                  </div>

                  {/* Time limit & escalation */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label style={labelStyle}>Time Limit (min)</label>
                      <input type="number" value={s.timeLimitMinutes ?? ''} min={1}
                        onChange={e => updateStep(idx, { timeLimitMinutes: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Optional" style={{ ...inputStyle, padding: '6px 10px', fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Escalation Contact</label>
                      <input value={s.escalationContact} onChange={e => updateStep(idx, { escalationContact: e.target.value })}
                        placeholder="e.g. Regional Mgr" style={{ ...inputStyle, padding: '6px 10px', fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Escalate After (min)</label>
                      <input type="number" value={s.escalationMinutes ?? ''} min={1}
                        onChange={e => updateStep(idx, { escalationMinutes: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Optional" style={{ ...inputStyle, padding: '6px 10px', fontSize: 13 }} />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Step button */}
              <button onClick={addStep}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '14px 16px', borderRadius: 8, border: '2px dashed #d1d5db', background: '#f9fafb', color: '#6b7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
                <Plus size={16} /> Add Step
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Notifications */}
        {step === 'notifications' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Notification Settings</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Configure who gets automatically notified when this playbook is activated</p>

            <div style={{ marginBottom: 28 }}>
              <label style={{ ...labelStyle, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={16} color="#1e4d6b" /> Auto-Notify
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Owner', value: notifyOwner, onChange: () => setNotifyOwner(!notifyOwner), desc: 'Playbook owner / creator' },
                  { label: 'Regional Manager', value: notifyRegional, onChange: () => setNotifyRegional(!notifyRegional), desc: 'Regional operations manager' },
                  { label: 'Insurance Provider', value: notifyInsurance, onChange: () => setNotifyInsurance(!notifyInsurance), desc: 'Insurance carrier contact' },
                  { label: 'Location Manager', value: notifyLocationMgr, onChange: () => setNotifyLocationMgr(!notifyLocationMgr), desc: 'On-site location manager' },
                ].map(n => (
                  <label key={n.label}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', background: n.value ? '#eef4f8' : '#fff' }}>
                    <input type="checkbox" checked={n.value} onChange={n.onChange}
                      style={{ width: 18, height: 18, accentColor: '#1e4d6b' }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{n.label}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{n.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 10, background: '#eef4f8', border: '1px solid #b8d4e8' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e4d6b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <EvidlyIcon size={16} /> Review Schedule
              </div>
              <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                This playbook is set to be reviewed <strong>{reviewSchedule}</strong>. All assigned reviewers will receive a reminder when a review is due.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Review & Publish */}
        {step === 'review' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Review & Publish</h2>

            {/* Summary card */}
            <div style={{ padding: 20, borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', marginBottom: 20 }}>
              <div style={{ height: 6, background: selectedColor, borderRadius: 3, marginBottom: 14 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Siren size={20} color={selectedColor} />
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{title || 'Untitled Playbook'}</div>
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>{description || 'No description provided'}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, fontSize: 13, color: '#374151' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <EvidlyIcon size={14} />
                  Category: <strong style={{ marginLeft: 4 }}>{categoryLabel}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: severityColor, display: 'inline-block' }} />
                  Severity: <strong style={{ marginLeft: 4 }}>{severity}</strong>
                </div>
                <div>Review: <strong>{reviewSchedule}</strong></div>
                <div>Steps: <strong>{steps.length}</strong></div>
                <div>Checklist items: <strong>{steps.reduce((sum, s) => sum + s.checklistItems.length, 0)}</strong></div>
                <div>
                  Notifications: <strong>
                    {[notifyOwner && 'Owner', notifyRegional && 'Regional', notifyInsurance && 'Insurance', notifyLocationMgr && 'Location Mgr'].filter(Boolean).join(', ') || 'None'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Steps list */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ ...labelStyle, fontSize: 14, marginBottom: 10 }}>Steps Overview</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {steps.map((s, idx) => {
                  const reqCount = [s.requirePhoto, s.requireTemp, s.requireSignature, s.requireText].filter(Boolean).length;
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: 12, background: selectedColor, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>{idx + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{s.title || `Step ${idx + 1} (untitled)`}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                          {s.checklistItems.length} checklist items
                          {reqCount > 0 && ` \u00B7 ${reqCount} requirement${reqCount > 1 ? 's' : ''}`}
                          {s.timeLimitMinutes && ` \u00B7 ${s.timeLimitMinutes}min limit`}
                          {s.escalationContact && ` \u00B7 Escalate: ${s.escalationContact}`}
                        </div>
                      </div>
                      <CheckCircle2 size={16} color="#16a34a" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Location assignment */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ ...labelStyle, fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={16} color="#1e4d6b" /> Assign to Locations
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {LOCATIONS.map(loc => (
                  <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', background: assignLocations.includes(loc.id) ? '#eef4f8' : '#fff', minHeight: 48 }}>
                    <input type="checkbox" checked={assignLocations.includes(loc.id)}
                      onChange={() => {
                        setAssignLocations(prev =>
                          prev.includes(loc.id) ? prev.filter(id => id !== loc.id) : [...prev, loc.id]
                        );
                      }}
                      style={{ width: 18, height: 18, accentColor: '#1e4d6b' }} />
                    <span style={{ fontSize: 14, color: '#374151' }}>{loc.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Publish buttons */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => guardAction('publish', 'Playbook Builder', () => toast.success(`Playbook published to ${assignLocations.length} location(s)`))}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 24px', borderRadius: 8, border: 'none', background: '#15803d', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
                <CheckCircle2 size={16} /> Publish Playbook
              </button>
              <button onClick={() => guardAction('save', 'Playbook Builder', () => toast.success("Playbook saved as draft"))}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 24px', borderRadius: 8, border: '1px solid #1e4d6b', background: '#fff', color: '#1e4d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
                <FileText size={16} /> Save as Draft
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={goBack} disabled={stepIdx === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db',
            background: '#fff', color: stepIdx === 0 ? '#d1d5db' : '#374151', fontSize: 14, fontWeight: 600,
            cursor: stepIdx === 0 ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48,
          }}>
          <ChevronLeft size={14} /> Previous
        </button>
        {stepIdx < STEPS.length - 1 && (
          <button onClick={goNext} disabled={!canNext()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none',
              background: canNext() ? '#1e4d6b' : '#d1d5db', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: canNext() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif", minHeight: 48,
            }}>
            Next Step <ChevronRight size={14} />
          </button>
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

export default PlaybookBuilder;
