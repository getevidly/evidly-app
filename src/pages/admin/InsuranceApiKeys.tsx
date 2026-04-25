// ── API Key Management — Real Supabase + Demo Mode Fallback ───
import { useState, useEffect, useMemo } from 'react';
import {
  Key, Plus, Trash2, Copy, Activity,
  AlertTriangle, CheckCircle2, XCircle, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import Button from '../../components/ui/Button';
import { KpiTile } from '../../components/admin/KpiTile';
import { Modal } from '../../components/ui/Modal';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../../components/DemoUpgradePrompt';
import { EmptyState } from '../../components/EmptyState';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';


// ── Types ──────────────────────────────────────────────────

interface ApiKey {
  id: string;
  label: string;
  key_type: string;
  key_preview: string;
  permissions: Record<string, boolean>;
  facility_scope: string;
  created_by: string | null;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  request_count: number;
  is_active: boolean;
  full_key?: string; // only set once after creation
}

interface RequestLogEntry {
  id: string;
  api_key_id: string;
  endpoint: string;
  method: string;
  response_code: number;
  requested_at: string;
}

// ── Demo Data ──────────────────────────────────────────────

function daysAgo(n: number): string { return new Date(Date.now() - n * 86400000).toISOString(); }
function hoursAgo(n: number): string { return new Date(Date.now() - n * 3600000).toISOString(); }
function daysFromNow(n: number): string { return new Date(Date.now() + n * 86400000).toISOString(); }

const DEMO_KEYS: ApiKey[] = [
  {
    id: 'key-001', label: 'Carrier Partnership — Pilot', key_type: 'insurance',
    key_preview: 'evd_ins_****7a3f',
    permissions: { facilities: true, risk_profile: true, history: true },
    facility_scope: 'all', created_by: 'Arthur (Platform Admin)',
    created_at: daysAgo(45), last_used_at: hoursAgo(3),
    request_count: 1247, expires_at: daysFromNow(320), is_active: true,
  },
  {
    id: 'key-002', label: 'Broker Portal — Read Only', key_type: 'insurance',
    key_preview: 'evd_ins_****b912',
    permissions: { facilities: true, risk_profile: true, history: false },
    facility_scope: 'all', created_by: 'Arthur (Platform Admin)',
    created_at: daysAgo(20), last_used_at: daysAgo(1),
    request_count: 89, expires_at: daysFromNow(345), is_active: true,
  },
  {
    id: 'key-003', label: 'Staging Integration Key', key_type: 'insurance',
    key_preview: 'evd_ins_****e4c1',
    permissions: { facilities: true, risk_profile: false, history: false },
    facility_scope: 'all', created_by: 'Arthur (Platform Admin)',
    created_at: daysAgo(60), last_used_at: daysAgo(55),
    request_count: 12, expires_at: daysAgo(5), is_active: false,
  },
];

const DEMO_REQUEST_LOG: RequestLogEntry[] = [
  { id: 'req-001', api_key_id: 'key-001', endpoint: '/api/v1/insurance/facilities', method: 'GET', response_code: 200, requested_at: hoursAgo(3) },
  { id: 'req-002', api_key_id: 'key-001', endpoint: '/api/v1/insurance/facilities/1/risk-profile', method: 'GET', response_code: 200, requested_at: hoursAgo(3) },
  { id: 'req-003', api_key_id: 'key-001', endpoint: '/api/v1/insurance/facilities/2/risk-profile', method: 'GET', response_code: 200, requested_at: hoursAgo(3.5) },
  { id: 'req-004', api_key_id: 'key-001', endpoint: '/api/v1/insurance/facilities/1/history?days=90', method: 'GET', response_code: 200, requested_at: hoursAgo(4) },
  { id: 'req-005', api_key_id: 'key-002', endpoint: '/api/v1/insurance/facilities', method: 'GET', response_code: 200, requested_at: daysAgo(1) },
  { id: 'req-006', api_key_id: 'key-002', endpoint: '/api/v1/insurance/facilities/1/risk-profile', method: 'GET', response_code: 200, requested_at: daysAgo(1) },
  { id: 'req-007', api_key_id: 'key-002', endpoint: '/api/v1/insurance/facilities/3/risk-profile', method: 'GET', response_code: 403, requested_at: daysAgo(1) },
  { id: 'req-008', api_key_id: 'key-003', endpoint: '/api/v1/insurance/facilities', method: 'GET', response_code: 401, requested_at: daysAgo(5) },
];

// ── Component ──────────────────────────────────────────────

export default function InsuranceApiKeys() {
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  usePageTitle('Admin | Insurance API Keys');

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [requestLog, setRequestLog] = useState<RequestLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRequestLog, setShowRequestLog] = useState(false);
  const [requestLogKeyId, setRequestLogKeyId] = useState<string | null>(null);
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);

  // Create form state
  const [newLabel, setNewLabel] = useState('');
  const [newKeyType, setNewKeyType] = useState<'live' | 'test' | 'insurance'>('live');
  const [newFacilityScope, setNewFacilityScope] = useState<'all' | 'selected'>('all');
  const [newPerms, setNewPerms] = useState({ facilities: true, risk_profile: true, history: true });
  const [newExpiryDays, setNewExpiryDays] = useState('365');
  const [creating, setCreating] = useState(false);

  const activeKeys = useMemo(() => keys.filter(k => k.is_active), [keys]);
  const inactiveKeys = useMemo(() => keys.filter(k => !k.is_active), [keys]);

  // ── Load data ──────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) {
      setKeys(DEMO_KEYS);
      setRequestLog(DEMO_REQUEST_LOG);
      setLoading(false);
      return;
    }
    loadKeys();
  }, [isDemoMode]);

  async function loadKeys() {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setKeys(data as ApiKey[]);
    setLoading(false);
  }

  async function loadRequestLog(keyId?: string) {
    if (isDemoMode) {
      setRequestLog(keyId ? DEMO_REQUEST_LOG.filter(r => r.api_key_id === keyId) : DEMO_REQUEST_LOG);
      return;
    }
    let query = supabase.from('api_request_log').select('*').order('requested_at', { ascending: false }).limit(50);
    if (keyId) query = query.eq('api_key_id', keyId);
    const { data } = await query;
    if (data) setRequestLog(data as RequestLogEntry[]);
  }

  // ── Create Key ─────────────────────────────────────────
  const handleCreateKey = async () => {
    if (!newLabel.trim()) { toast.error('Label is required'); return; }

    if (isDemoMode) {
      guardAction('create', 'API Keys', () => {
        const fakeKey = `evd_${newKeyType}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
        const demoKey: ApiKey = {
          id: `key-${Date.now()}`, label: newLabel.trim(), key_type: newKeyType,
          key_preview: `evd_${newKeyType}_****${fakeKey.slice(-4)}`,
          permissions: { ...newPerms }, facility_scope: newFacilityScope,
          created_by: 'Current User', created_at: new Date().toISOString(),
          last_used_at: null, request_count: 0,
          expires_at: daysFromNow(parseInt(newExpiryDays) || 365), is_active: true,
          full_key: fakeKey,
        };
        setKeys(prev => [demoKey, ...prev]);
        setNewKeyRevealed(fakeKey);
        setShowCreateForm(false);
        setNewLabel('');
        toast.success('API key created — copy it now, it won\'t be shown again');
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          label: newLabel.trim(),
          key_type: newKeyType,
          permissions: newPerms,
          facility_scope: newFacilityScope,
          expires_days: parseInt(newExpiryDays) || 365,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create key');

      setNewKeyRevealed(result.full_key);
      setShowCreateForm(false);
      setNewLabel('');
      toast.success('API key created — copy it now, it won\'t be shown again');
      await loadKeys();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  // ── Revoke Key ─────────────────────────────────────────
  const handleRevokeKey = async (keyId: string) => {
    if (isDemoMode) {
      guardAction('revoke', 'API Keys', () => {
        setKeys(prev => prev.map(k => k.id === keyId ? { ...k, is_active: false } : k));
        toast.success('API key revoked');
      });
      return;
    }

    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', keyId);

    if (error) { toast.error(error.message); return; }
    toast.success('API key revoked');
    await loadKeys();
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => toast.success('API key copied'));
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatDateTime = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  const filteredLog = requestLogKeyId
    ? requestLog.filter(r => r.api_key_id === requestLogKeyId)
    : requestLog;

  // ── Loading State ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  // ── Request Log View ───────────────────────────────────
  if (showRequestLog) {
    return (
      <div className="font-['DM_Sans','Inter',sans-serif]">
        <AdminBreadcrumb crumbs={[{ label: 'API Keys', path: '/admin/api-keys' }, { label: 'Request Log' }]} />

        <button onClick={() => setShowRequestLog(false)} className="flex items-center gap-1 text-sm text-navy/50 hover:text-navy/80 mb-4">
          <ArrowLeft size={16} /> Back to API Keys
        </button>

        <h1 className="text-xl font-bold text-navy mb-4">API Request Log</h1>

        <div className="bg-white rounded-xl border border-navy/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream border-b border-navy/10 hover:bg-navy/[0.02] transition-colors">
                <th className="text-left px-4 py-3 font-semibold text-navy/80">Endpoint</th>
                <th className="text-center px-4 py-3 font-semibold text-navy/80">Method</th>
                <th className="text-center px-4 py-3 font-semibold text-navy/80">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-navy/80">Key</th>
                <th className="text-right px-4 py-3 font-semibold text-navy/80">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredLog.map(r => (
                <tr key={r.id} className="border-b border-navy/5 hover:bg-cream">
                  <td className="px-4 py-3 font-mono text-xs text-navy/90">{r.endpoint}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">{r.method}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.response_code < 300 ? 'bg-green-50 text-green-700' : r.response_code < 500 ? 'bg-red-50 text-red-700' : 'bg-cream text-navy/80'}`}>
                      {r.response_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-navy/50">
                    {keys.find(k => k.id === r.api_key_id)?.key_preview || r.api_key_id}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-navy/50">{formatDateTime(r.requested_at)}</td>
                </tr>
              ))}
              {filteredLog.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-navy/30">No requests logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Main View ──────────────────────────────────────────
  return (
    <div className="font-['DM_Sans','Inter',sans-serif]">
      <AdminBreadcrumb crumbs={[{ label: 'API Keys' }]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">API Keys</h1>
          <p className="text-sm text-navy/70 mt-1">Create, manage, and monitor API keys for partner integrations</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => { setRequestLogKeyId(null); loadRequestLog(); setShowRequestLog(true); }}
          >
            <Activity className="h-4 w-4" />
            Request Log
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="h-4 w-4" />
            Create API Key
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignItems: 'stretch', marginBottom: 24 }}>
        <KpiTile label="Active Keys" value={activeKeys.length} valueColor="green" />
        <KpiTile label="Total Requests (30d)" value={keys.reduce((s, k) => s + k.request_count, 0).toLocaleString()} valueColor="navy" />
        <KpiTile label="Revoked / Expired" value={inactiveKeys.length} valueColor="navy" />
      </div>

      {/* New key reveal banner */}
      {newKeyRevealed && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-bold text-amber-800">Copy your API key — it won't be shown again</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white px-3 py-2 rounded border border-amber-200 text-sm font-mono break-all">{newKeyRevealed}</code>
            <button onClick={() => handleCopyKey(newKeyRevealed)} className="px-3 py-2 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700">
              <Copy className="h-4 w-4" />
            </button>
            <button onClick={() => setNewKeyRevealed(null)} className="px-3 py-2 bg-navy/10 text-navy/80 rounded text-sm font-medium hover:bg-navy/15">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {keys.length === 0 ? (
        <EmptyState icon={Key} title="No API keys" description="Create an API key to allow partners to access compliance data via the EvidLY API." />
      ) : (
        <div className="space-y-3">
          {keys.map(key => {
            const isExpired = new Date(key.expires_at) < new Date();
            return (
              <div
                key={key.id}
                className="bg-white rounded-xl border border-navy/10 p-4 sm:p-5"
                style={!key.is_active ? { opacity: 0.6 } : undefined}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: key.is_active ? '#f0fdf4' : '#f3f4f6' }}>
                      <Key className="h-5 w-5" style={{ color: key.is_active ? '#16a34a' : '#9ca3af' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-navy">{key.label}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-navy/5 text-navy/50 uppercase">{key.key_type}</span>
                        {key.is_active ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Active</span>
                        ) : isExpired ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-navy/5 text-navy/50">Expired</span>
                        ) : (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Revoked</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-navy/50 mt-1 flex-wrap">
                        <span className="font-mono">{key.key_preview}</span>
                        <span>·</span>
                        <span>Scope: {key.facility_scope === 'all' ? 'All facilities' : 'Selected'}</span>
                        <span>·</span>
                        <span>Created {formatDate(key.created_at)}</span>
                        {key.last_used_at && (
                          <>
                            <span>·</span>
                            <span>Last used {formatDateTime(key.last_used_at)}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{key.request_count.toLocaleString()} requests</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-navy/30 mt-1">
                        <span>Permissions:</span>
                        {key.permissions.facilities && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Facilities</span>}
                        {key.permissions.risk_profile && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Risk Profile</span>}
                        {key.permissions.history && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">History</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setRequestLogKeyId(key.id); loadRequestLog(key.id); setShowRequestLog(true); }}
                      className="px-3 py-1.5 text-xs font-medium border border-navy/10 rounded-xl hover:bg-cream text-navy/70"
                    >
                      <Activity className="h-3.5 w-3.5 inline mr-1" />
                      Log
                    </button>
                    {key.is_active && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="px-3 py-1.5 text-xs font-medium border border-red-200 rounded-xl hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5 inline mr-1" />
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* API Documentation Reference */}
      <div className="mt-8 bg-cream rounded-xl border border-navy/10 p-6">
        <h3 className="text-sm font-bold text-navy mb-3">API Endpoints</h3>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">GET</span>
            <span className="text-navy/80">/api/v1/insurance/facilities</span>
            <span className="text-navy/30 font-sans">— List accessible facilities</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">GET</span>
            <span className="text-navy/80">/api/v1/insurance/facilities/:id/risk-profile</span>
            <span className="text-navy/30 font-sans">— Full compliance risk profile</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">GET</span>
            <span className="text-navy/80">/api/v1/insurance/facilities/:id/history?days=90</span>
            <span className="text-navy/30 font-sans">— Compliance event history</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-navy/50">
          Authentication: <code className="bg-white px-1.5 py-0.5 rounded border border-navy/10">Authorization: Bearer evd_...</code>
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateForm && (
        <Modal isOpen={true} onClose={() => setShowCreateForm(false)} size="lg">
          <div className="p-4 sm:p-6">
            <h3 className="text-xl font-bold text-navy mb-4">Create API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy/80 mb-1">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="e.g., Carrier Partnership — Production"
                  className="w-full px-3 py-2 border border-navy/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/80 mb-1">Key Type</label>
                <select
                  value={newKeyType}
                  onChange={e => setNewKeyType(e.target.value as 'live' | 'test' | 'insurance')}
                  className="w-full px-3 py-2 border border-navy/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-gold"
                >
                  <option value="live">Live</option>
                  <option value="test">Test</option>
                  <option value="insurance">Insurance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/80 mb-1">Facility Scope</label>
                <select
                  value={newFacilityScope}
                  onChange={e => setNewFacilityScope(e.target.value as 'all' | 'selected')}
                  className="w-full px-3 py-2 border border-navy/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-gold"
                >
                  <option value="all">All Facilities</option>
                  <option value="selected">Selected Facilities Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/80 mb-2">Data Permissions</label>
                <div className="space-y-2">
                  {[
                    { key: 'facilities', label: 'Facility List', desc: 'List of accessible facilities' },
                    { key: 'risk_profile', label: 'Risk Profile', desc: 'Full compliance risk profile data' },
                    { key: 'history', label: 'Event History', desc: 'Compliance event history (up to 365 days)' },
                  ].map(p => (
                    <label key={p.key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-cream cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(newPerms as any)[p.key]}
                        onChange={e => setNewPerms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 rounded border-navy/15"
                      />
                      <div>
                        <span className="text-sm font-medium text-navy/80">{p.label}</span>
                        <p className="text-xs text-navy/50">{p.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/80 mb-1">Expiration</label>
                <select
                  value={newExpiryDays}
                  onChange={e => setNewExpiryDays(e.target.value)}
                  className="w-full px-3 py-2 border border-navy/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-gold"
                >
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleCreateKey}
                disabled={!newLabel.trim() || creating}
              >
                {creating ? 'Creating...' : 'Create Key'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

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
