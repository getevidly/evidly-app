import { useState, useEffect, useCallback } from 'react';
import { Building2, MapPin, Users, Mail, Send, ShieldAlert, RefreshCw, CheckCircle2, Clock, Phone, Plus, Trash2 } from 'lucide-react';
import { TONE, SURFACE, TEXT, LINE, FONT } from '../design/tokens';
import { supabase } from '../lib/supabase';
import { createLocation } from '../lib/locations/createLocation';
import { JurisdictionSelect } from '../components/jurisdiction/JurisdictionSelect';
import { US_STATES } from '../types/rfp';
import { useNavigate } from 'react-router-dom';
import AdminBreadcrumb from '../components/admin/AdminBreadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { ClientInviteForm } from './ClientInviteForm';

// 7 CA tribal jurisdictions seeded by CASINO-JIE-01 migration
const TRIBAL_OPTIONS = [
  { label: 'Table Mountain Rancheria', county: 'Fresno' },
  { label: 'Tachi-Yokut Tribe', county: 'Kings' },
  { label: 'Santa Ynez Band of Chumash', county: 'Santa Barbara' },
  { label: 'Morongo Band of Mission Indians', county: 'Riverside' },
  { label: 'Agua Caliente Band of Cahuilla Indians', county: 'Riverside' },
  { label: 'Pechanga Band of Luiseno Indians', county: 'Riverside' },
  { label: 'San Manuel Band of Mission Indians', county: 'San Bernardino' },
];

const DEFAULT_OUTLET_NAMES = [
  'Main Buffet', 'Steakhouse', 'Cafe', 'Sports Bar', 'Noodle Bar',
  'Food Court - Station 1', 'Food Court - Station 2', 'Banquet Kitchen',
  'Employee Dining', 'Pool Bar & Grill', 'VIP Lounge', 'Bakery',
  'Sushi Bar', 'Pizza Station', 'Grab & Go',
];

// ─── Journey stage definitions ─────────────────────────────────────
const STAGES = [
  { key: 'invited', label: 'Invited', short: '1', manual: false },
  { key: 'record_viewed', label: 'Record viewed', short: '2', manual: false },
  { key: 'demo_scheduled', label: 'Demo scheduled', short: '3', manual: false },
  { key: 'demo_completed', label: 'Demo completed', short: '4', manual: true },
  { key: 'policies_uploaded', label: 'Policies uploaded', short: '5', manual: false },
  { key: 'policies_read', label: 'Policies read', short: '6', manual: false },
  { key: 'cc_on_file', label: 'CC on file', short: '7', manual: false },
  { key: 'loa_signed', label: 'LOA signed', short: '8', manual: false },
  { key: 'account_configured', label: 'Account configured', short: '9', manual: false },
  { key: 'training_completed', label: 'Training complete', short: '10', manual: true },
] as const;

const ADVANCE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/advance-journey-stage`;
const QUEUE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-queue`;
const CREATE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-client-invite`;

interface QueueAccount {
  org_id: string;
  org_name: string;
  current_stage: string;
  invited_at: string | null;
  record_viewed_at: string | null;
  demo_scheduled_at: string | null;
  demo_completed_at: string | null;
  policies_uploaded_at: string | null;
  policies_read_at: string | null;
  cc_on_file_at: string | null;
  loa_signed_at: string | null;
  account_configured_at: string | null;
  training_completed_at: string | null;
  first_charge_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  invite_status: string | null;
}

interface LocationEntry {
  id: string;
  name: string;
  street: string;
  suite: string;
  city: string;
  state: string;
  zip: string;
  jurisdictionId: string;
}

const newLocationEntry = (): LocationEntry => ({
  id: crypto.randomUUID(),
  name: '', street: '', suite: '', city: '', state: '', zip: '', jurisdictionId: '',
});

// ─── Onboarding Queue Component ────────────────────────────────────
function OnboardingQueue() {
  const [accounts, setAccounts] = useState<QueueAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ orgId: string; ok: boolean; text: string } | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(QUEUE_FN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({}),
      });
      const out = await res.json();
      if (!res.ok) { setError(out.error || 'Failed to load queue'); setLoading(false); return; }
      setAccounts(out.accounts || []);
    } catch {
      setError('Failed to load onboarding queue');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  async function handleMark(orgId: string, stage: string) {
    setMarkingId(`${orgId}:${stage}`);
    setFeedback(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(ADVANCE_FN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ org_id: orgId, stage }),
      });
      const out = await res.json();
      if (!res.ok) {
        setFeedback({ orgId, ok: false, text: out.error || 'Failed to mark stage' });
      } else {
        const label = STAGES.find(s => s.key === stage)?.label || stage;
        setFeedback({ orgId, ok: true, text: `${label} marked` });
        loadQueue();
      }
    } catch {
      setFeedback({ orgId, ok: false, text: 'Request failed' });
    }
    setMarkingId(null);
  }

  // Determine pip color for a given account and stage
  function pipState(acct: QueueAccount, stageKey: string, stageIdx: number): 'done' | 'action' | 'waiting' {
    const tsKey = `${stageKey}_at` as keyof QueueAccount;
    if (acct[tsKey]) return 'done';

    // Find the first unstamped stage index for this account
    const firstUnstamped = STAGES.findIndex(s => {
      const k = `${s.key}_at` as keyof QueueAccount;
      return !acct[k];
    });

    // If this stage IS the first unstamped AND it's manual → action needed
    if (stageIdx === firstUnstamped) {
      const stageDef = STAGES[stageIdx];
      if (stageDef.manual) return 'action';
    }

    return 'waiting';
  }

  const PIP_COLORS = {
    done: TONE.sage.fill,    // #7FA98B
    action: TONE.amber.fill, // #D8A93A
    waiting: SURFACE.rail,   // #F0EADC
  };

  if (loading) {
    return <div className="text-center py-12 text-sm" style={{ color: TEXT.muted }}>Loading onboarding queue...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
        <button onClick={loadQueue} className="ml-3 underline text-sm">Retry</button>
      </div>
    );
  }

  if (accounts.length === 0) {
    return <div className="text-center py-12 text-sm" style={{ color: TEXT.muted }}>No accounts in the journey pipeline yet.</div>;
  }

  // Build plain-English state sentence for an account
  function stateSentence(acct: QueueAccount): { text: string; doneCount: number; nextLabel: string | null; isManualNext: boolean } {
    const doneCount = STAGES.filter(s => {
      const k = `${s.key}_at` as keyof QueueAccount;
      return !!acct[k];
    }).length;

    if (doneCount === STAGES.length) {
      return { text: 'All 10 stages complete.', doneCount, nextLabel: null, isManualNext: false };
    }

    const nextIdx = STAGES.findIndex(s => {
      const k = `${s.key}_at` as keyof QueueAccount;
      return !acct[k];
    });
    const next = STAGES[nextIdx];
    const lastDone = nextIdx > 0 ? STAGES[nextIdx - 1] : null;
    const lastDoneText = lastDone ? `${lastDone.label} done.` : '';

    if (next.manual) {
      return {
        text: `Stage ${doneCount} of 10 — ${lastDoneText} Waiting on you to mark '${next.label}.'`,
        doneCount, nextLabel: next.label, isManualNext: true,
      };
    }
    return {
      text: `Stage ${doneCount} of 10 — ${lastDoneText} Waiting on system: ${next.label}.`,
      doneCount, nextLabel: next.label, isManualNext: false,
    };
  }

  return (
    <div>
      <div className="rounded-xl p-6" style={{ background: SURFACE.paper, border: `1px solid ${LINE.soft}` }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ fontFamily: FONT.display, color: TEXT.ink }}>Onboarding queue</h2>
            <p className="text-sm" style={{ color: TEXT.muted }}>{accounts.length} account{accounts.length !== 1 ? 's' : ''} in pipeline</p>
          </div>
          <button
            onClick={loadQueue}
            className="text-sm flex items-center gap-1 hover:opacity-80"
            style={{ color: TEXT.muted }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Account rows */}
        <div className="flex flex-col">
          {accounts.map(acct => {
            const nextUnstamped = STAGES.findIndex(s => {
              const k = `${s.key}_at` as keyof QueueAccount;
              return !acct[k];
            });
            const nextStage = nextUnstamped >= 0 ? STAGES[nextUnstamped] : null;
            const canMarkDemo = nextStage?.key === 'demo_completed';
            const canMarkTraining = nextStage?.key === 'training_completed';
            const isMarking = markingId?.startsWith(acct.org_id);
            const acctFeedback = feedback?.orgId === acct.org_id ? feedback : null;
            const sentence = stateSentence(acct);

            return (
              <div
                key={acct.org_id}
                className="py-4"
                style={{ borderTop: `1px solid ${SURFACE.rail}` }}
              >
                {/* Row 1: org name + contact + state sentence */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="truncate" style={{ fontFamily: FONT.body, fontSize: 14.5, fontWeight: 600, color: TEXT.ink }}>{acct.org_name}</p>
                    {acct.contact_name && (
                      <p className="text-xs truncate mt-0.5" style={{ color: TEXT.muted }}>
                        {acct.contact_name}{acct.contact_email ? ` · ${acct.contact_email}` : ''}
                      </p>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded" style={{
                    fontFamily: FONT.mono,
                    background: sentence.doneCount === STAGES.length ? TONE.sage.tint : TONE.amber.tint,
                    color: sentence.doneCount === STAGES.length ? TONE.sage.text : TONE.amber.text,
                  }}>
                    {sentence.doneCount}/{STAGES.length}
                  </span>
                </div>

                {/* State sentence */}
                <p className="text-xs mb-3" style={{ color: sentence.isManualNext ? TONE.amber.text : TEXT.muted, fontFamily: FONT.body }}>
                  {sentence.text}
                </p>

                {/* Row 2: pips with stage labels */}
                <div className="flex items-start" style={{ gap: 2 }}>
                  {STAGES.map((s, idx) => {
                    const state = pipState(acct, s.key, idx);
                    const color = PIP_COLORS[state];
                    const tsKey = `${s.key}_at` as keyof QueueAccount;
                    const ts = acct[tsKey];

                    return (
                      <div key={s.key} className="flex-1 min-w-0">
                        <div
                          title={ts ? `${s.label}: ${new Date(ts as string).toLocaleDateString()}` : `${s.label}: pending`}
                          className="cursor-default transition-colors"
                          style={{ height: 7, borderRadius: 2, background: color }}
                        />
                        <div className="text-center mt-1" style={{
                          fontFamily: FONT.mono,
                          fontSize: 8,
                          lineHeight: '1.2',
                          color: state === 'done' ? TONE.sage.text : state === 'action' ? TONE.amber.text : TEXT.meta,
                          fontWeight: state === 'action' ? 700 : 400,
                        }}>
                          {s.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Row 3: action buttons */}
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  {canMarkDemo && (
                    <button
                      onClick={() => handleMark(acct.org_id, 'demo_completed')}
                      disabled={!!isMarking}
                      className="text-xs font-medium px-3 py-1.5 rounded flex flex-col items-center gap-0.5 transition-colors"
                      style={{ background: TONE.amber.tint, color: TONE.amber.text, border: `1px solid ${LINE.soft}` }}
                    >
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} />
                        {isMarking ? 'Marking...' : 'Mark demo completed'}
                      </span>
                    </button>
                  )}
                  {canMarkTraining && (
                    <button
                      onClick={() => handleMark(acct.org_id, 'training_completed')}
                      disabled={!!isMarking}
                      className="text-xs font-medium px-3 py-2 rounded flex flex-col items-center gap-0.5 transition-colors"
                      style={{ background: TONE.amber.tint, color: TONE.amber.text, border: `1px solid ${LINE.soft}` }}
                    >
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} />
                        {isMarking ? 'Marking...' : 'Mark training complete'}
                      </span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 9, color: TEXT.meta, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Sets first charge · +45 days
                      </span>
                    </button>
                  )}
                  {!canMarkDemo && !canMarkTraining && sentence.doneCount < STAGES.length && (
                    <span className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded" style={{
                      fontFamily: FONT.mono, fontSize: 10, color: TEXT.meta, background: SURFACE.raised,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      Waiting on system
                    </span>
                  )}
                  {acct.first_charge_at && (
                    <span className="text-xs flex items-center gap-1" style={{ color: TONE.sage.text }}>
                      <Clock size={12} />
                      First charge: {new Date(acct.first_charge_at).toLocaleDateString()}
                    </span>
                  )}
                  {acct.training_completed_at && !acct.first_charge_at && (
                    <span className="text-xs flex items-center gap-1" style={{ color: TEXT.muted }}>
                      <Clock size={12} />
                      Training done {new Date(acct.training_completed_at).toLocaleDateString()} — charge date pending
                    </span>
                  )}
                </div>

                {/* Feedback for this account */}
                {acctFeedback && (
                  <div
                    className="mt-2 text-xs px-3 py-1.5 rounded"
                    style={{
                      background: acctFeedback.ok ? TONE.sage.tint : TONE.red.tint,
                      color: acctFeedback.ok ? TONE.sage.text : TONE.red.text,
                    }}
                  >
                    {acctFeedback.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 rounded-xl p-5" style={{ background: SURFACE.paper, border: `1px solid ${LINE.soft}` }}>
        <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ fontFamily: FONT.mono, color: TEXT.meta, letterSpacing: '0.06em' }}>
          Journey stages
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2">
          {STAGES.map((s, idx) => (
            <div key={s.key} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-4 text-right" style={{ fontFamily: FONT.mono, fontSize: 10, color: TEXT.meta }}>{idx + 1}</span>
              <div className="min-w-0">
                <p className="text-xs leading-tight" style={{ color: TEXT.ink, fontFamily: FONT.body }}>{s.label}</p>
                <p style={{
                  fontFamily: FONT.mono, fontSize: 9,
                  color: s.manual ? TONE.amber.text : TONE.sage.text,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {s.manual ? 'You mark' : 'Automatic'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────
export function AdminClientOnboarding() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const [mode, setMode] = useState<'invite' | 'manual' | 'queue'>('invite');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [orgName, setOrgName] = useState('');
  const [industryType, setIndustryType] = useState('Restaurant');
  const [industrySubtype, setIndustrySubtype] = useState('restaurant-full');
  const [businessPhone, setBusinessPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');

  // Tribal casino fields
  const [selectedTribe, setSelectedTribe] = useState('');

  // Per-location entries — at least one required
  const [locations, setLocations] = useState<LocationEntry[]>([newLocationEntry()]);

  const isTribal = industryType === 'tribal_casino';

  useEffect(() => {
    if (isTribal) setIndustrySubtype('tribal-casino');
  }, [isTribal]);

  function updateLocation(id: string, field: keyof LocationEntry, value: string) {
    setLocations(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  }
  function addLocation() {
    setLocations(prev => [...prev, newLocationEntry()]);
  }
  function removeLocation(id: string) {
    setLocations(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // ── Validate per-location fields ──
    if (locations.length === 0) { setError('At least one location is required.'); setLoading(false); return; }
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const tag = locations.length > 1 ? ` (Location ${i + 1})` : '';
      if (!loc.street.trim()) { setError(`Street address is required${tag}.`); setLoading(false); return; }
      if (!loc.city.trim()) { setError(`City is required${tag}.`); setLoading(false); return; }
      if (!loc.state) { setError(`State is required${tag}.`); setLoading(false); return; }
      if (!loc.zip.trim() || !/^\d{5}(-\d{4})?$/.test(loc.zip.trim())) {
        setError(`Valid ZIP code required (XXXXX or XXXXX-XXXX)${tag}.`); setLoading(false); return;
      }
      if (!loc.jurisdictionId) { setError(`Jurisdiction is required${tag}.`); setLoading(false); return; }
    }
    if (businessPhone && !/^[\d()\-+\s.]{7,}$/.test(businessPhone)) {
      setError('Invalid business phone format.'); setLoading(false); return;
    }
    if (ownerMobile && !/^[\d()\-+\s.]{7,}$/.test(ownerMobile)) {
      setError('Invalid mobile number format.'); setLoading(false); return;
    }

    // Demo mode: simulate success without writing to database
    if (isDemoMode) {
      setSuccess(`Client organization created! An invite will be sent to ${ownerEmail}.`);
      setTimeout(() => {
        setOrgName(''); setBusinessPhone(''); setOwnerName(''); setOwnerEmail(''); setOwnerMobile('');
        setLocations([newLocationEntry()]); setSelectedTribe(''); setSuccess('');
      }, 5000);
      setLoading(false);
      return;
    }

    try {
      // 1. Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          industry_type: industryType,
          industry_subtype: industrySubtype,
          planned_location_count: locations.length,
          primary_contact_name: ownerName,
          primary_contact_email: ownerEmail,
          primary_contact_phone: ownerMobile || null,
          main_phone: businessPhone || null,
          plan_tier: 'founder',
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Create one location row per entry — each with its own address + jurisdiction
      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        const address = loc.suite.trim()
          ? `${loc.street.trim()}, ${loc.suite.trim()}`
          : loc.street.trim();
        await createLocation({
          organization_id: orgData.id,
          name: loc.name.trim() || `Location ${i + 1}`,
          address,
          city: loc.city.trim(),
          state: loc.state,
          zip: loc.zip.trim(),
          jurisdiction_id: loc.jurisdictionId,
          status: 'active',
        });
      }

      // 3. Send invite — builds location_snapshot for /join gate, sends claim email
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(CREATE_FN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          organization_id: orgData.id,
          organization_name: orgName,
          contact_name: ownerName,
          email: ownerEmail,
          phone: ownerMobile || null,
          client_role: 'owner_operator',
          sender_name: 'Arthur',
        }),
      });
      const inviteOut = await res.json();
      if (!res.ok) throw new Error(inviteOut.error || 'Failed to send invite');

      setSuccess(`Client organization created! An invite has been sent to ${ownerEmail}.`);
      setTimeout(() => {
        setOrgName(''); setBusinessPhone(''); setOwnerName(''); setOwnerEmail(''); setOwnerMobile('');
        setLocations([newLocationEntry()]); setSelectedTribe(''); setSuccess('');
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to create client organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AdminBreadcrumb crumbs={[{ label: 'Client Onboarding' }]} />
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode('invite')} className="px-4 py-2 rounded font-medium text-sm" style={{ background: mode === 'invite' ? '#1E2D4D' : 'transparent', color: mode === 'invite' ? '#fff' : '#1E2D4D', border: '1px solid #1E2D4D' }}>Invite a client</button>
          <button onClick={() => setMode('manual')} className="px-4 py-2 rounded font-medium text-sm" style={{ background: mode === 'manual' ? '#1E2D4D' : 'transparent', color: mode === 'manual' ? '#fff' : '#1E2D4D', border: '1px solid #1E2D4D' }}>Provision manually</button>
          <button onClick={() => setMode('queue')} className="px-4 py-2 rounded font-medium text-sm" style={{ background: mode === 'queue' ? '#1E2D4D' : 'transparent', color: mode === 'queue' ? '#fff' : '#1E2D4D', border: '1px solid #1E2D4D' }}>Onboarding queue</button>
        </div>
        {mode === 'queue' && <OnboardingQueue />}
        {mode === 'invite' && <ClientInviteForm />}
        {mode === 'manual' && (
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-2">Create Client Organization</h2>
            <p className="text-[#1E2D4D]/70">
              Set up a new client organization with pre-populated data. The client will receive an email to claim their account.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-[#FAF7F0] rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-[#1E2D4D] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#A08C5A]" />
                Organization Details
              </h3>

              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                  Organization Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                  placeholder={isTribal ? 'Table Mountain Casino Resort' : 'Main Street Restaurant Group'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="industryType" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                    Industry Type
                  </label>
                  <select
                    id="industryType"
                    value={industryType}
                    onChange={(e) => setIndustryType(e.target.value)}
                    className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                  >
                    <option value="Restaurant">Restaurant</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Catering">Catering</option>
                    <option value="tribal_casino">Tribal Casino (Indian Gaming)</option>
                  </select>
                </div>

                {!isTribal && (
                  <div>
                    <label htmlFor="industrySubtype" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                      Subtype
                    </label>
                    <select
                      id="industrySubtype"
                      value={industrySubtype}
                      onChange={(e) => setIndustrySubtype(e.target.value)}
                      className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                    >
                      <option value="restaurant-full">Full-Service</option>
                      <option value="restaurant-quick">Quick-Service</option>
                      <option value="hotel">Hotel</option>
                      <option value="healthcare">Healthcare/Senior Living</option>
                      <option value="education">K-12 Education</option>
                      <option value="catering">Catering</option>
                    </select>
                  </div>
                )}

                {isTribal && (
                  <div>
                    <label htmlFor="tribeName" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                      Tribe Name
                    </label>
                    <select
                      id="tribeName"
                      required
                      value={selectedTribe}
                      onChange={(e) => setSelectedTribe(e.target.value)}
                      className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                    >
                      <option value="">Select tribe...</option>
                      {TRIBAL_OPTIONS.map(t => (
                        <option key={t.label} value={t.label}>
                          {t.label} ({t.county} County)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="businessPhone" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                  <Phone className="inline w-4 h-4 mr-1" />
                  Business Phone
                </label>
                <input
                  id="businessPhone"
                  type="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* ── Locations (repeatable, at least 1 required) ── */}
            <div className="bg-[#FAF7F0] rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-[#1E2D4D] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#A08C5A]" />
                Locations
                <span className="text-xs font-normal text-[#1E2D4D]/50 ml-1">At least 1 required</span>
              </h3>

              {locations.map((loc, idx) => (
                <div key={loc.id} className="bg-white rounded-xl border border-[#1E2D4D]/10 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1E2D4D]/60 uppercase tracking-wide">
                      Location {idx + 1}
                    </span>
                    {locations.length > 1 && (
                      <button type="button" onClick={() => removeLocation(loc.id)}
                        className="text-red-400 hover:text-red-600 transition-colors" title="Remove location">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                      Location Name <span className="text-[#1E2D4D]/40 font-normal">(optional)</span>
                    </label>
                    <input type="text" value={loc.name}
                      onChange={(e) => updateLocation(loc.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                      placeholder={isTribal ? 'Main Buffet' : 'Downtown Location'} />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Street Address *</label>
                      <input type="text" required value={loc.street}
                        onChange={(e) => updateLocation(loc.id, 'street', e.target.value)}
                        className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                        placeholder="123 Main Street" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Suite/Unit</label>
                      <input type="text" value={loc.suite}
                        onChange={(e) => updateLocation(loc.id, 'suite', e.target.value)}
                        className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                        placeholder="Suite 200" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">City *</label>
                      <input type="text" required value={loc.city}
                        onChange={(e) => updateLocation(loc.id, 'city', e.target.value)}
                        className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                        placeholder="Fresno" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">State *</label>
                      <select required value={loc.state}
                        onChange={(e) => updateLocation(loc.id, 'state', e.target.value)}
                        className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]">
                        <option value="">Select...</option>
                        {Object.entries(US_STATES).map(([abbr, name]) => (
                          <option key={abbr} value={abbr}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">ZIP *</label>
                      <input type="text" required value={loc.zip}
                        onChange={(e) => updateLocation(loc.id, 'zip', e.target.value)}
                        className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                        placeholder="93650" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Jurisdiction *</label>
                    <JurisdictionSelect
                      value={loc.jurisdictionId || null}
                      onChange={(id) => updateLocation(loc.id, 'jurisdictionId', id || '')}
                    />
                    <p className="text-xs text-[#1E2D4D]/50 mt-1">
                      Requirements resolve against this location's county. Locations may be in different counties.
                    </p>
                  </div>
                </div>
              ))}

              <button type="button" onClick={addLocation}
                className="w-full py-2.5 border-2 border-dashed border-[#1E2D4D]/15 rounded-xl text-sm font-medium text-[#1E2D4D]/60 hover:border-[#A08C5A] hover:text-[#A08C5A] transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Add Location
              </button>
            </div>

            {/* Tribal advisory mode info */}
            {isTribal && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 mb-1">
                      Tribal Sovereignty — Advisory Food Safety Mode
                    </p>
                    <p className="text-sm text-amber-700">
                      Food safety compliance is governed by the Tribal Environmental Health Office (TEHO)
                      under tribal sovereignty. EvidLY will track fire safety and operational compliance in full.
                      Food safety intelligence will be set to advisory mode.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Primary Contact / Owner ── */}
            <div className="bg-[#FAF7F0] rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-[#1E2D4D] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#A08C5A]" />
                Primary Contact / Owner
              </h3>

              <div>
                <label htmlFor="ownerName" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                  Full Name
                </label>
                <input
                  id="ownerName"
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                  placeholder="John Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ownerEmail" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                    <Mail className="inline w-4 h-4 mr-1" />
                    Email Address
                  </label>
                  <input
                    id="ownerEmail"
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="ownerMobile" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                    <Phone className="inline w-4 h-4 mr-1" />
                    Mobile Number
                  </label>
                  <input
                    id="ownerMobile"
                    type="tel"
                    value={ownerMobile}
                    onChange={(e) => setOwnerMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                    placeholder="(555) 987-6543"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The client will receive an invite email to claim their account via a secure link. The organization will be pre-configured with industry-specific templates.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 px-4 py-3 border border-[#1E2D4D]/15 text-[#1E2D4D]/80 rounded-lg hover:bg-[#FAF7F0] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || locations.some(l => !l.jurisdictionId)}
                className="flex-1 px-4 py-3 bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  'Creating...'
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Create Client & Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        )}
      </div>
    </>
  );
}
