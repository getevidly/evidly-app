import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mail, MessageSquare, CheckSquare, Phone, Plus, Trash2, Save, Zap, ArrowDown,
} from 'lucide-react';
import { useSequence, useCreateSequence } from '@/hooks/api/useMarketing';

type ActionType = 'email' | 'sms' | 'task' | 'call_reminder';
type SkipCondition = 'none' | 'responded' | 'converted' | 'unsubscribed';

interface SequenceStep {
  id: string;
  action_type: ActionType;
  delay_days: number;
  subject: string;
  message: string;
  skip_if: SkipCondition;
}

const ACTION_CONFIG: Record<ActionType, { label: string; icon: typeof Mail; bg: string; text: string }> = {
  email: { label: 'Email', icon: Mail, bg: '#DBEAFE', text: '#1E40AF' },
  sms: { label: 'SMS', icon: MessageSquare, bg: '#DCFCE7', text: '#166534' },
  task: { label: 'Task', icon: CheckSquare, bg: '#EDE9FE', text: '#6D28D9' },
  call_reminder: { label: 'Call Reminder', icon: Phone, bg: '#FFEDD5', text: '#C2410C' },
};

const TRIGGER_OPTIONS = [
  { value: 'new_lead', label: 'New Lead Created' },
  { value: 'form_submit', label: 'Form Submitted' },
  { value: 'tag_added', label: 'Tag Added' },
  { value: 'manual', label: 'Manual Enrollment' },
  { value: 'violation_found', label: 'Violation Found' },
  { value: 'appointment_booked', label: 'Appointment Booked' },
  { value: 'job_completed', label: 'Job Completed' },
];

const SKIP_OPTIONS: { value: SkipCondition; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'responded', label: 'If Responded' },
  { value: 'converted', label: 'If Converted' },
  { value: 'unsubscribed', label: 'If Unsubscribed' },
];

let nextStepId = 1;
function makeId() { return 'step-' + nextStepId++ + '-' + Date.now(); }
function createEmptyStep(): SequenceStep {
  return { id: makeId(), action_type: 'email', delay_days: 1, subject: '', message: '', skip_if: 'none' };
}

export function SequenceBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const { data: existingSequence, isLoading } = useSequence(isNew ? undefined : id);
  const createSequence = useCreateSequence();

  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('new_lead');
  const [steps, setSteps] = useState<SequenceStep[]>([]);

  useEffect(() => {
    if (existingSequence) {
      setName(existingSequence.name ?? '');
      setTriggerType(existingSequence.trigger_type ?? 'new_lead');
      setSteps(existingSequence.steps?.map((s: SequenceStep) => ({ ...s, id: s.id || makeId() })) ?? []);
    }
  }, [existingSequence]);

  const addStep = () => { setSteps((prev) => [...prev, createEmptyStep()]); };
  const removeStep = (stepId: string) => { setSteps((prev) => prev.filter((s) => s.id !== stepId)); };
  const updateStep = (stepId: string, field: keyof SequenceStep, value: string | number) => {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, [field]: value } : s)));
  };

  const handleSave = async (activate = false) => {
    await createSequence.mutateAsync({
      id: isNew ? undefined : id,
      name,
      trigger_type: triggerType,
      is_active: activate,
      steps: steps.map((s, i) => ({
        order: i + 1, action_type: s.action_type, delay_days: s.delay_days,
        subject: s.subject, message: s.message, skip_if: s.skip_if,
      })),
    });
    navigate('/marketing/sequences');
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#F4F6FA' }}>
        <p className="text-sm" style={{ color: '#6B7F96' }}>Loading sequence...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6FA' }}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold" style={{ color: '#0B1628' }}>{isNew ? 'New Sequence' : 'Edit Sequence'}</h1>
          <div className="flex gap-2">
            <button onClick={() => handleSave(false)} disabled={createSequence.isPending || !name.trim()} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}><Save className="h-4 w-4" /> Save</button>
            <button onClick={() => handleSave(true)} disabled={createSequence.isPending || !name.trim() || steps.length === 0} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50" style={{ backgroundColor: '#1e4d6b' }}><Zap className="h-4 w-4" /> Save & Activate</button>
          </div>
        </div>

        <div className="mb-6 space-y-4 rounded-lg border bg-white p-5" style={{ borderColor: '#D1D9E6' }}>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: '#0B1628' }}>Sequence Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New Lead Follow-up" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: '#0B1628' }}>Trigger</label>
            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}>
              {TRIGGER_OPTIONS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </div>
        </div>

        <div className="space-y-0">
          {steps.length === 0 ? (
            <div className="mb-4 flex flex-col items-center justify-center rounded-lg border bg-white py-12" style={{ borderColor: '#D1D9E6' }}>
              <p className="text-sm font-medium" style={{ color: '#0B1628' }}>Add your first step to begin building the sequence.</p>
            </div>
          ) : (
            steps.map((stepItem, index) => {
              const config = ACTION_CONFIG[stepItem.action_type];
              const Icon = config.icon;
              return (
                <div key={stepItem.id}>
                  {index > 0 && (
                    <div className="flex justify-center py-2">
                      <div className="flex flex-col items-center">
                        <div className="h-6 w-0.5" style={{ backgroundColor: '#D1D9E6' }} />
                        <ArrowDown className="h-4 w-4" style={{ color: '#D1D9E6' }} />
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border bg-white p-5" style={{ borderColor: '#D1D9E6' }}>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: '#1e4d6b' }}>{index + 1}</div>
                        <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: config.bg }}>
                          <Icon className="h-3.5 w-3.5" style={{ color: config.text }} />
                          <span className="text-xs font-semibold" style={{ color: config.text }}>{config.label}</span>
                        </div>
                      </div>
                      <button onClick={() => removeStep(stepItem.id)} className="rounded p-1 transition-colors hover:bg-red-50" title="Delete step">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium" style={{ color: '#6B7F96' }}>Action Type</label>
                          <select value={stepItem.action_type} onChange={(e) => updateStep(stepItem.id, 'action_type', e.target.value)} className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}>
                            {Object.entries(ACTION_CONFIG).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium" style={{ color: '#6B7F96' }}>Delay (days)</label>
                          <input type="number" min={0} value={stepItem.delay_days} onChange={(e) => updateStep(stepItem.id, 'delay_days', parseInt(e.target.value) || 0)} className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium" style={{ color: '#6B7F96' }}>Subject</label>
                        <input type="text" value={stepItem.subject} onChange={(e) => updateStep(stepItem.id, 'subject', e.target.value)} placeholder="Step subject..." className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium" style={{ color: '#6B7F96' }}>Message</label>
                        <textarea value={stepItem.message} onChange={(e) => updateStep(stepItem.id, 'message', e.target.value)} placeholder="Write your message..." rows={3} className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium" style={{ color: '#6B7F96' }}>Skip If</label>
                        <select value={stepItem.skip_if} onChange={(e) => updateStep(stepItem.id, 'skip_if', e.target.value)} className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}>
                          {SKIP_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button onClick={addStep} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-4 text-sm font-medium transition-colors hover:border-solid" style={{ borderColor: '#D1D9E6', color: '#6B7F96' }}>
          <Plus className="h-4 w-4" /> Add Step
        </button>
      </div>
    </div>
  );
}

export default SequenceBuilderPage;
