import { useState, useEffect, useCallback } from 'react';
import { Building2, MapPin, Users, Mail, Send, ShieldAlert, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { createLocation } from '../lib/locations/createLocation';
import { JurisdictionSelect } from '../components/jurisdiction/JurisdictionSelect';
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
    done: { bg: '#D1E7DD', border: '#0F6E56', text: '#0F6E56' },     // sage
    action: { bg: '#FAEEDA', border: '#854F0B', text: '#854F0B' },   // amber
    waiting: { bg: '#F1F1EF', border: '#C4C4C0', text: '#8A8A86' },  // rail
  };

  if (loading) {
    return <div className="text-center py-12 text-sm text-[#1E2D4D]/60">Loading onboarding queue...</div>;
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
    return <div className="text-center py-12 text-sm text-[#1E2D4D]/60">No accounts in the journey pipeline yet.</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-[#1E2D4D]">Onboarding Queue</h2>
          <p className="text-sm text-[#1E2D4D]/60">{accounts.length} account{accounts.length !== 1 ? 's' : ''} in pipeline</p>
        </div>
        <button
          onClick={loadQueue}
          className="text-sm text-[#1E2D4D]/70 hover:text-[#1E2D4D] flex items-center gap-1"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stage header row */}
      <div className="hidden lg:grid lg:grid-cols-[220px_1fr] gap-3 mb-2 px-1">
        <div className="text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wide">Account</div>
        <div className="grid grid-cols-10 gap-1">
          {STAGES.map(s => (
            <div key={s.key} className="text-[10px] text-center text-[#1E2D4D]/40 leading-tight">
              {s.short}
            </div>
          ))}
        </div>
      </div>

      {/* Account rows */}
      <div className="flex flex-col gap-2">
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

          return (
            <div
              key={acct.org_id}
              className="border border-[#1E2D4D]/8 rounded-lg px-4 py-3"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3 items-center">
                {/* Account info */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1E2D4D] truncate">{acct.org_name}</p>
                  {acct.contact_name && (
                    <p className="text-xs text-[#1E2D4D]/50 truncate">
                      {acct.contact_name}{acct.contact_email ? ` · ${acct.contact_email}` : ''}
                    </p>
                  )}
                </div>

                {/* 10 pips */}
                <div className="grid grid-cols-10 gap-1">
                  {STAGES.map((s, idx) => {
                    const state = pipState(acct, s.key, idx);
                    const colors = PIP_COLORS[state];
                    const tsKey = `${s.key}_at` as keyof QueueAccount;
                    const ts = acct[tsKey];
                    const title = ts
                      ? `${s.label}: ${new Date(ts as string).toLocaleDateString()}`
                      : `${s.label}: pending`;

                    return (
                      <div
                        key={s.key}
                        title={title}
                        className="flex items-center justify-center h-7 rounded text-[10px] font-bold cursor-default transition-colors"
                        style={{
                          background: colors.bg,
                          border: `1.5px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      >
                        {state === 'done' ? (
                          <CheckCircle2 size={12} />
                        ) : state === 'action' ? (
                          <AlertCircle size={12} />
                        ) : (
                          s.short
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action row — manual stage buttons + billing anchor */}
              {(canMarkDemo || canMarkTraining || acct.first_charge_at) && (
                <div className="mt-2 pt-2 border-t border-[#1E2D4D]/5 flex items-center gap-3 flex-wrap">
                  {canMarkDemo && (
                    <button
                      onClick={() => handleMark(acct.org_id, 'demo_completed')}
                      disabled={!!isMarking}
                      className="text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                      style={{ background: '#FAEEDA', color: '#854F0B', border: '1px solid #E8D5A8' }}
                    >
                      <CheckCircle2 size={12} />
                      {isMarking ? 'Marking...' : 'Mark demo completed'}
                    </button>
                  )}
                  {canMarkTraining && (
                    <button
                      onClick={() => handleMark(acct.org_id, 'training_completed')}
                      disabled={!!isMarking}
                      className="text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                      style={{ background: '#FAEEDA', color: '#854F0B', border: '1px solid #E8D5A8' }}
                    >
                      <CheckCircle2 size={12} />
                      {isMarking ? 'Marking...' : 'Mark training complete (billing anchor)'}
                    </button>
                  )}
                  {acct.first_charge_at && (
                    <span className="text-xs text-[#0F6E56] flex items-center gap-1">
                      <Clock size={12} />
                      First charge: {new Date(acct.first_charge_at).toLocaleDateString()}
                    </span>
                  )}
                  {acct.training_completed_at && !acct.first_charge_at && (
                    <span className="text-xs text-[#1E2D4D]/50 flex items-center gap-1">
                      <Clock size={12} />
                      Training done {new Date(acct.training_completed_at).toLocaleDateString()} — charge date pending
                    </span>
                  )}
                </div>
              )}

              {/* Feedback for this account */}
              {acctFeedback && (
                <div
                  className="mt-2 text-xs px-3 py-1.5 rounded"
                  style={{
                    background: acctFeedback.ok ? '#E1F5EE' : '#FCEBEB',
                    color: acctFeedback.ok ? '#0F6E56' : '#A32D2D',
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
  );
}

// ─── Main page ─────────────────────────────────────────────────────
export function AdminClientOnboarding() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const [mode, setMode] = useState<'invite' | 'manual' | 'queue'>('queue');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [orgName, setOrgName] = useState('');
  const [industryType, setIndustryType] = useState('Restaurant');
  const [industrySubtype, setIndustrySubtype] = useState('restaurant-full');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [locationCount, setLocationCount] = useState(1);

  // Tribal casino fields
  const [selectedTribe, setSelectedTribe] = useState('');
  const [outletCount, setOutletCount] = useState(5);

  // Jurisdiction — one selection for all outlets in this onboarding
  const [jurisdictionId, setJurisdictionId] = useState('');

  const isTribal = industryType === 'tribal_casino';

  // When tribal casino selected, default subtype
  useEffect(() => {
    if (isTribal) {
      setIndustrySubtype('tribal-casino');
      setLocationCount(1); // 1 property, multiple outlets
    }
  }, [isTribal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Demo mode: simulate success without writing to database
    if (isDemoMode) {
      setSuccess(`Client organization created successfully! An account claim email will be sent to ${ownerEmail}.`);
      setTimeout(() => {
        setOrgName(''); setOwnerName(''); setOwnerEmail(''); setOwnerPhone(''); setLocationCount(1); setSuccess('');
      }, 5000);
      setLoading(false);
      return;
    }

    try {
      const orgInsert: Record<string, any> = {
        name: orgName,
        industry_type: industryType,
        industry_subtype: industrySubtype,
        planned_location_count: isTribal ? outletCount : locationCount,
        primary_contact_name: ownerName,
        primary_contact_email: ownerEmail,
        primary_contact_phone: ownerPhone || null,
        plan_tier: 'founder',
      };

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert(orgInsert)
        .select()
        .single();

      if (orgError) throw orgError;

      // Create outlet locations for tribal casinos
      if (isTribal && outletCount > 0) {
        for (let i = 0; i < outletCount; i++) {
          await createLocation({
            organization_id: orgData.id,
            name: DEFAULT_OUTLET_NAMES[i] || `Outlet ${i + 1}`,
            jurisdiction_id: jurisdictionId,
            status: 'active',
          });
        }
      }

      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

      // Isolated client — signUp on the shared singleton would replace the
      // admin's session.  This throwaway client never persists tokens.
      const isolatedClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );

      const { data: authData, error: authError } = await isolatedClient.auth.signUp({
        email: ownerEmail,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/email-confirmed`,
          data: {
            full_name: ownerName,
            skip_trigger_org: true,
            user_type: isTribal ? 'tribal_casino' : 'restaurant',
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        await supabase.from('user_profiles').insert({
          id: authData.user.id,
          full_name: ownerName,
          phone: ownerPhone,
          organization_id: orgData.id,
          role: 'owner_operator',
        });

        await supabase.from('user_location_access').insert({
          user_id: authData.user.id,
          organization_id: orgData.id,
          role: 'owner_operator',
        });
      }

      setSuccess(`Client organization created successfully! An account claim email will be sent to ${ownerEmail}.`);
      setTimeout(() => {
        setOrgName('');
        setOwnerName('');
        setOwnerEmail('');
        setOwnerPhone('');
        setLocationCount(1);
        setSelectedTribe('');
        setOutletCount(5);
        setJurisdictionId('');
        setSuccess('');
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
          <button onClick={() => setMode('queue')} className="px-4 py-2 rounded font-medium text-sm" style={{ background: mode === 'queue' ? '#1E2D4D' : 'transparent', color: mode === 'queue' ? '#fff' : '#1E2D4D', border: '1px solid #1E2D4D' }}>Onboarding queue</button>
          <button onClick={() => setMode('invite')} className="px-4 py-2 rounded font-medium text-sm" style={{ background: mode === 'invite' ? '#1E2D4D' : 'transparent', color: mode === 'invite' ? '#fff' : '#1E2D4D', border: '1px solid #1E2D4D' }}>Invite a client</button>
          <button onClick={() => setMode('manual')} className="px-4 py-2 rounded font-medium text-sm" style={{ background: mode === 'manual' ? '#1E2D4D' : 'transparent', color: mode === 'manual' ? '#fff' : '#1E2D4D', border: '1px solid #1E2D4D' }}>Provision manually</button>
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

              {isTribal ? (
                <div>
                  <label htmlFor="outletCount" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                    <MapPin className="inline w-4 h-4 mr-1" />
                    Food Outlets per Property
                  </label>
                  <input
                    id="outletCount"
                    type="number"
                    min="1"
                    max="15"
                    required
                    value={outletCount}
                    onChange={(e) => setOutletCount(parseInt(e.target.value) || 5)}
                    className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                  />
                  <p className="text-xs text-[#1E2D4D]/50 mt-1">
                    Typical casino properties have 5-15 food outlets (buffet, steakhouse, cafe, etc.)
                  </p>
                </div>
              ) : (
                <div>
                  <label htmlFor="locationCount" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                    <MapPin className="inline w-4 h-4 mr-1" />
                    Number of Locations
                  </label>
                  <input
                    id="locationCount"
                    type="number"
                    min="1"
                    required
                    value={locationCount}
                    onChange={(e) => setLocationCount(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                  />
                </div>
              )}
            </div>

            {/* Governing Jurisdiction — applies to all locations in this onboarding */}
            <div className="bg-[#FAF7F0] rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-[#1E2D4D] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#A08C5A]" />
                Governing Jurisdiction
              </h3>
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                  Jurisdiction *
                </label>
                <JurisdictionSelect
                  value={jurisdictionId || null}
                  onChange={(id) => setJurisdictionId(id || '')}
                />
                <p className="text-xs text-[#1E2D4D]/50 mt-1">
                  All locations for this organization will be assigned to the selected jurisdiction.
                </p>
              </div>
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
                <label htmlFor="ownerPhone" className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                  Phone Number
                </label>
                <input
                  id="ownerPhone"
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The client will receive an email with instructions to claim their account and set their password. The organization will be pre-configured with industry-specific templates.
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
                disabled={loading || !jurisdictionId}
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
