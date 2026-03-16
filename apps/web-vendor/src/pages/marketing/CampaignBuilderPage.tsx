import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, MessageSquare, FileText, DoorOpen, Phone, AlertTriangle,
  ChevronLeft, ChevronRight, Rocket, Save, Check, Calendar,
  Users, PenTool, Clock, ClipboardCheck,
} from 'lucide-react';
import { useCreateCampaign } from '@/hooks/api/useMarketing';

const STEPS = [
  { label: 'Campaign Type', icon: PenTool },
  { label: 'Audience', icon: Users },
  { label: 'Content', icon: FileText },
  { label: 'Schedule', icon: Clock },
  { label: 'Review & Launch', icon: ClipboardCheck },
];

const CAMPAIGN_TYPES = [
  { id: 'email', label: 'Email', icon: Mail, description: 'Send targeted email campaigns' },
  { id: 'sms', label: 'SMS', icon: MessageSquare, description: 'Text message outreach' },
  { id: 'direct_mail', label: 'Direct Mail', icon: FileText, description: 'Physical mailers and postcards' },
  { id: 'door_knock', label: 'Door Knock', icon: DoorOpen, description: 'In-person visit campaigns' },
  { id: 'cold_call', label: 'Cold Call', icon: Phone, description: 'Phone outreach campaigns' },
  { id: 'violation_outreach', label: 'Violation Outreach', icon: AlertTriangle, description: 'Target businesses with violations' },
];

const AUDIENCES = [
  { id: 'all_leads', label: 'All Leads' },
  { id: 'past_customers', label: 'Past Customers' },
  { id: 'lapsed', label: 'Lapsed Customers' },
  { id: 'geographic', label: 'Geographic Area' },
  { id: 'industry', label: 'Industry Segment' },
];

const MERGE_FIELDS = ['{business_name}', '{contact_name}', '{last_service_date}', '{next_due_date}', '{quote_amount}', '{referral_link}'];

export function CampaignBuilderPage() {
  const navigate = useNavigate();
  const createCampaign = useCreateCampaign();
  const [step, setStep] = useState(0);
  const [campaignType, setCampaignType] = useState('');
  const [audience, setAudience] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendNow, setSendNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');

  const canNext =
    (step === 0 && campaignType !== '') ||
    (step === 1 && audience !== '') ||
    (step === 2 && subject.trim() !== '' && body.trim() !== '') ||
    (step === 3 && (sendNow || scheduledAt !== '')) ||
    step === 4;

  const insertMergeField = (field: string) => {
    setBody((prev) => prev + field);
  };

  const handleLaunch = async (draft = false) => {
    await createCampaign.mutateAsync({
      type: campaignType, audience, subject, body,
      status: draft ? 'draft' : 'active',
      scheduled_at: sendNow ? null : scheduledAt,
    });
    navigate('/marketing/campaigns');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6FA' }}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold" style={{ color: '#0B1628' }}>Campaign Builder</h1>

        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isComplete = i < step;
            return (
              <div key={s.label} className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors"
                  style={{
                    borderColor: isActive || isComplete ? '#1e4d6b' : '#D1D9E6',
                    backgroundColor: isComplete ? '#1e4d6b' : isActive ? '#1e4d6b10' : 'white',
                    color: isComplete ? 'white' : isActive ? '#1e4d6b' : '#6B7F96',
                  }}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="h-0.5 w-8" style={{ backgroundColor: i < step ? '#1e4d6b' : '#D1D9E6' }} />
                )}
              </div>
            );
          })}
        </div>

        <p className="mb-6 text-center text-sm font-medium" style={{ color: '#6B7F96' }}>
          Step {step + 1} of {STEPS.length}: {STEPS[step].label}
        </p>

        <div className="rounded-lg border bg-white p-6" style={{ borderColor: '#D1D9E6' }}>
          {step === 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {CAMPAIGN_TYPES.map((ct) => {
                const Icon = ct.icon;
                const selected = campaignType === ct.id;
                return (
                  <button
                    key={ct.id}
                    onClick={() => setCampaignType(ct.id)}
                    className="flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors"
                    style={{
                      borderColor: selected ? '#1e4d6b' : '#D1D9E6',
                      backgroundColor: selected ? '#1e4d6b08' : 'white',
                    }}
                  >
                    <Icon className="h-6 w-6" style={{ color: selected ? '#1e4d6b' : '#6B7F96' }} />
                    <span className="text-sm font-semibold" style={{ color: selected ? '#1e4d6b' : '#0B1628' }}>{ct.label}</span>
                    <span className="text-xs" style={{ color: '#6B7F96' }}>{ct.description}</span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {AUDIENCES.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors"
                  style={{
                    borderColor: audience === a.id ? '#1e4d6b' : '#D1D9E6',
                    backgroundColor: audience === a.id ? '#1e4d6b08' : 'white',
                  }}
                >
                  <input type="radio" name="audience" checked={audience === a.id} onChange={() => setAudience(a.id)} className="h-4 w-4" style={{ accentColor: '#1e4d6b' }} />
                  <span className="text-sm font-medium" style={{ color: '#0B1628' }}>{a.label}</span>
                </label>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: '#0B1628' }}>Subject</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter campaign subject..." className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: '#0B1628' }}>Body</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your campaign message..." rows={8} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium" style={{ color: '#6B7F96' }}>Merge Fields</p>
                <div className="flex flex-wrap gap-2">
                  {MERGE_FIELDS.map((field) => (
                    <button key={field} onClick={() => insertMergeField(field)} className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-gray-50" style={{ borderColor: '#D1D9E6', color: '#1e4d6b' }}>{field}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors" style={{ borderColor: sendNow ? '#1e4d6b' : '#D1D9E6', backgroundColor: sendNow ? '#1e4d6b08' : 'white' }}>
                <input type="radio" name="schedule" checked={sendNow} onChange={() => setSendNow(true)} className="h-4 w-4" style={{ accentColor: '#1e4d6b' }} />
                <div>
                  <span className="text-sm font-medium" style={{ color: '#0B1628' }}>Send Now</span>
                  <p className="text-xs" style={{ color: '#6B7F96' }}>Campaign will be sent immediately after launch</p>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors" style={{ borderColor: !sendNow ? '#1e4d6b' : '#D1D9E6', backgroundColor: !sendNow ? '#1e4d6b08' : 'white' }}>
                <input type="radio" name="schedule" checked={!sendNow} onChange={() => setSendNow(false)} className="h-4 w-4" style={{ accentColor: '#1e4d6b' }} />
                <div className="flex-1">
                  <span className="text-sm font-medium" style={{ color: '#0B1628' }}>Schedule for Later</span>
                  {!sendNow && (
                    <div className="mt-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" style={{ color: '#6B7F96' }} />
                      <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="rounded-lg border px-3 py-1.5 text-sm outline-none" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
                    </div>
                  )}
                </div>
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold" style={{ color: '#0B1628' }}>Campaign Summary</h3>
              <div className="space-y-3 rounded-lg p-4" style={{ backgroundColor: '#F4F6FA' }}>
                {[['Type', campaignType.replace(/_/g, ' ')], ['Audience', audience.replace(/_/g, ' ')], ['Subject', subject], ['Schedule', sendNow ? 'Send Immediately' : scheduledAt]].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-sm"><span style={{ color: '#6B7F96' }}>{label}</span><span className="font-medium capitalize" style={{ color: '#0B1628' }}>{val}</span></div>
                ))}
              </div>
              <div className="text-sm" style={{ color: '#6B7F96' }}>
                <p className="mb-1 font-medium" style={{ color: '#0B1628' }}>Message Preview</p>
                <div className="whitespace-pre-wrap rounded-lg border p-3" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}>{body || '(No message body)'}</div>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button onClick={() => handleLaunch(true)} disabled={createCampaign.isPending} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}><Save className="h-4 w-4" /> Save Draft</button>
                <button onClick={() => handleLaunch(false)} disabled={createCampaign.isPending} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50" style={{ backgroundColor: '#1e4d6b' }}><Rocket className="h-4 w-4" /> Launch Campaign</button>
              </div>
            </div>
          )}
        </div>

        {step < 4 && (
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}><ChevronLeft className="h-4 w-4" /> Back</button>
            <button onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={!canNext} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40" style={{ backgroundColor: '#1e4d6b' }}>Next <ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
        {step === 4 && (
          <div className="mt-6 flex justify-start">
            <button onClick={() => setStep(3)} className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}><ChevronLeft className="h-4 w-4" /> Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CampaignBuilderPage;
