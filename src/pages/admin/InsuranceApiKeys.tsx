// ── GAP-08: Insurance Export API — Key Management (Superadmin Only) ───
// AUDIT: No insurance API key management existed. This is new.
// PURPOSE: Create, list, revoke API keys for insurance partner access.
// API keys are scoped per org + facility + data type permissions.
// ──────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import {
  Key, Plus, Trash2, Eye, EyeOff, Copy, Shield, Clock, Activity,
  AlertTriangle, CheckCircle2, XCircle, ArrowLeft, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb } from '../../components/Breadcrumb';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../../components/DemoUpgradePrompt';
import { EmptyState } from '../../components/EmptyState';

const NAVY = '#1e4d6b';
const GOLD = '#d4af37';

// ── Types ──────────────────────────────────────────────────────

interface ApiKey {
  id: string;
  label: string;
  keyPreview: string; // e.g., "evd_ins_****7a3f"
  fullKey?: string;   // only shown once at creation
  orgId: string;
  orgName: string;
  facilityScope: 'all' | string[]; // facility IDs or 'all'
  permissions: {
    facilities: boolean;
    riskProfile: boolean;
    history: boolean;
  };
  createdBy: string;
  createdAt: string;
  lastUsedAt: string | null;
  requestCount: number;
  expiresAt: string;
  isActive: boolean;
}

interface RequestLogEntry {
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  responseCode: number;
  requestedAt: string;
}

// ── Demo Data ──────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}
function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3600000).toISOString();
}
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString();
}

const DEMO_KEYS: ApiKey[] = [
  {
    id: 'key-001',
    label: 'Carrier Partnership — Pilot',
    keyPreview: 'evd_ins_****7a3f',
    orgId: 'org-demo',
    orgName: 'Clean Kitchen Co.',
    facilityScope: 'all',
    permissions: { facilities: true, riskProfile: true, history: true },
    createdBy: 'Arthur (Platform Admin)',
    createdAt: daysAgo(45),
    lastUsedAt: hoursAgo(3),
    requestCount: 1247,
    expiresAt: daysFromNow(320),
    isActive: true,
  },
  {
    id: 'key-002',
    label: 'Broker Portal — Read Only',
    keyPreview: 'evd_ins_****b912',
    orgId: 'org-demo',
    orgName: 'Clean Kitchen Co.',
    facilityScope: ['1', '2'],
    permissions: { facilities: true, riskProfile: true, history: false },
    createdBy: 'Arthur (Platform Admin)',
    createdAt: daysAgo(20),
    lastUsedAt: daysAgo(1),
    requestCount: 89,
    expiresAt: daysFromNow(345),
    isActive: true,
  },
  {
    id: 'key-003',
    label: 'Staging Integration Key',
    keyPreview: 'evd_ins_****e4c1',
    orgId: 'org-demo',
    orgName: 'Clean Kitchen Co.',
    facilityScope: 'all',
    permissions: { facilities: true, riskProfile: false, history: false },
    createdBy: 'Arthur (Platform Admin)',
    createdAt: daysAgo(60),
    lastUsedAt: daysAgo(55),
    requestCount: 12,
    expiresAt: daysAgo(5), // expired
    isActive: false,
  },
];

const DEMO_REQUEST_LOG: RequestLogEntry[] = [
  { id: 'req-001', apiKeyId: 'key-001', endpoint: '/api/v1/insurance/facilities', method: 'GET', responseCode: 200, requestedAt: hoursAgo(3) },
  { id: 'req-002', apiKeyId: 'key-001', endpoint: '/api/v1/insurance/facilities/1/risk-profile', method: 'GET', responseCode: 200, requestedAt: hoursAgo(3) },
  { id: 'req-003', apiKeyId: 'key-001', endpoint: '/api/v1/insurance/facilities/2/risk-profile', method: 'GET', responseCode: 200, requestedAt: hoursAgo(3) },
  { id: 'req-004', apiKeyId: 'key-001', endpoint: '/api/v1/insurance/facilities/3/risk-profile', method: 'GET', responseCode: 200, requestedAt: hoursAgo(3) },
  { id: 'req-005', apiKeyId: 'key-001', endpoint: '/api/v1/insurance/facilities/1/history?days=90', method: 'GET', responseCode: 200, requestedAt: hoursAgo(4) },
  { id: 'req-006', apiKeyId: 'key-002', endpoint: '/api/v1/insurance/facilities', method: 'GET', responseCode: 200, requestedAt: daysAgo(1) },
  { id: 'req-007', apiKeyId: 'key-002', endpoint: '/api/v1/insurance/facilities/1/risk-profile', method: 'GET', responseCode: 200, requestedAt: daysAgo(1) },
  { id: 'req-008', apiKeyId: 'key-002', endpoint: '/api/v1/insurance/facilities/3/risk-profile', method: 'GET', responseCode: 403, requestedAt: daysAgo(1) },
  { id: 'req-009', apiKeyId: 'key-003', endpoint: '/api/v1/insurance/facilities', method: 'GET', responseCode: 401, requestedAt: daysAgo(5) },
];

// ── Component ──────────────────────────────────────────────────

export default function InsuranceApiKeys() {
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const [keys, setKeys] = useState<ApiKey[]>(DEMO_KEYS);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRequestLog, setShowRequestLog] = useState(false);
  const [requestLogKeyId, setRequestLogKeyId] = useState<string | null>(null);

  // Create form state
  const [newLabel, setNewLabel] = useState('');
  const [newFacilityScope, setNewFacilityScope] = useState<'all' | 'selected'>('all');
  const [newPerms, setNewPerms] = useState({ facilities: true, riskProfile: true, history: true });
  const [newExpiryDays, setNewExpiryDays] = useState('365');
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);

  const activeKeys = keys.filter(k => k.isActive);
  const inactiveKeys = keys.filter(k => !k.isActive);

  const handleCreateKey = () => {
    if (!newLabel.trim()) {
      toast.error('Label is required');
      return;
    }
    guardAction('create', 'API Keys', () => {
      const fakeKey = `evd_ins_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
      const newKey: ApiKey = {
        id: `key-${Date.now()}`,
        label: newLabel.trim(),
        keyPreview: `evd_ins_****${fakeKey.slice(-4)}`,
        fullKey: fakeKey,
        orgId: 'org-demo',
        orgName: 'Clean Kitchen Co.',
        facilityScope: newFacilityScope === 'all' ? 'all' : ['1'],
        permissions: { ...newPerms },
        createdBy: 'Current User',
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        requestCount: 0,
        expiresAt: daysFromNow(parseInt(newExpiryDays) || 365),
        isActive: true,
      };
      setKeys(prev => [newKey, ...prev]);
      setNewKeyRevealed(fakeKey);
      setShowCreateForm(false);
      setNewLabel('');
      toast.success('API key created — copy it now, it won\'t be shown again');
    });
  };

  const handleRevokeKey = (keyId: string) => {
    guardAction('revoke', 'API Keys', () => {
      setKeys(prev => prev.map(k => k.id === keyId ? { ...k, isActive: false } : k));
      toast.success('API key revoked');
    });
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => toast.success('API key copied'));
  };

  const filteredLog = requestLogKeyId
    ? DEMO_REQUEST_LOG.filter(r => r.apiKeyId === requestLogKeyId)
    : DEMO_REQUEST_LOG;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatDateTime = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  // ── Request Log View ─────────────────────────────────
  if (showRequestLog) {
    return (
      <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
        <Breadcrumb items={[{ label: 'Admin', href: '/admin/intelligence' }, { label: 'API Keys', href: '/admin/api-keys' }, { label: 'Request Log' }]} />

        <button onClick={() => setShowRequestLog(false)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={16} /> Back to API Keys
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-4">API Request Log</h1>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Endpoint</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Method</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Key</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredLog.map(r => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-800">{r.endpoint}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">{r.method}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.responseCode < 300 ? 'bg-green-50 text-green-700' : r.responseCode < 500 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                      {r.responseCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {keys.find(k => k.id === r.apiKeyId)?.keyPreview || r.apiKeyId}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500">{formatDateTime(r.requestedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Main View ────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <Breadcrumb items={[{ label: 'Admin', href: '/admin/intelligence' }, { label: 'Insurance API Keys' }]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance Export API Keys</h1>
          <p className="text-sm text-gray-600 mt-1">Manage API keys for insurance partner data access</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setRequestLogKeyId(null); setShowRequestLog(true); }}
            className="flex items-center gap-2 px-4 py-2 min-h-[44px] border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Activity className="h-4 w-4" />
            Request Log
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 min-h-[44px] text-white rounded-lg text-sm font-medium shadow-sm"
            style={{ backgroundColor: NAVY }}
          >
            <Plus className="h-4 w-4" />
            Create API Key
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4" style={{ borderLeft: '4px solid #16a34a' }}>
          <div className="text-sm text-gray-500 font-medium mb-1">Active Keys</div>
          <div className="text-2xl font-bold text-green-600">{activeKeys.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4" style={{ borderLeft: `4px solid ${GOLD}` }}>
          <div className="text-sm text-gray-500 font-medium mb-1">Total Requests (30d)</div>
          <div className="text-2xl font-bold" style={{ color: GOLD }}>{keys.reduce((s, k) => s + k.requestCount, 0).toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4" style={{ borderLeft: '4px solid #6b7280' }}>
          <div className="text-sm text-gray-500 font-medium mb-1">Revoked / Expired</div>
          <div className="text-2xl font-bold text-gray-500">{inactiveKeys.length}</div>
        </div>
      </div>

      {/* New key reveal banner */}
      {newKeyRevealed && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-bold text-amber-800">Copy your API key — it won't be shown again</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white px-3 py-2 rounded border border-amber-200 text-sm font-mono">{newKeyRevealed}</code>
            <button onClick={() => handleCopyKey(newKeyRevealed)} className="px-3 py-2 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700">
              <Copy className="h-4 w-4" />
            </button>
            <button onClick={() => setNewKeyRevealed(null)} className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {keys.length === 0 ? (
        <EmptyState icon={Key} title="No API keys" description="Create an API key to allow insurance partners to access compliance data." />
      ) : (
        <div className="space-y-3">
          {keys.map(key => {
            const isExpired = new Date(key.expiresAt) < new Date();
            return (
              <div
                key={key.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5"
                style={!key.isActive ? { opacity: 0.6 } : undefined}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: key.isActive ? '#f0fdf4' : '#f3f4f6' }}>
                      <Key className="h-5 w-5" style={{ color: key.isActive ? '#16a34a' : '#9ca3af' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{key.label}</span>
                        {key.isActive ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Active</span>
                        ) : isExpired ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Expired</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Revoked</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                        <span className="font-mono">{key.keyPreview}</span>
                        <span>·</span>
                        <span>Scope: {key.facilityScope === 'all' ? 'All facilities' : `${(key.facilityScope as string[]).length} facilities`}</span>
                        <span>·</span>
                        <span>Created {formatDate(key.createdAt)}</span>
                        {key.lastUsedAt && (
                          <>
                            <span>·</span>
                            <span>Last used {formatDateTime(key.lastUsedAt)}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{key.requestCount.toLocaleString()} requests</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        <span>Permissions:</span>
                        {key.permissions.facilities && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Facilities</span>}
                        {key.permissions.riskProfile && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Risk Profile</span>}
                        {key.permissions.history && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">History</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setRequestLogKeyId(key.id); setShowRequestLog(true); }}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                    >
                      <Activity className="h-3.5 w-3.5 inline mr-1" />
                      Log
                    </button>
                    {key.isActive && (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="px-3 py-1.5 text-xs font-medium border border-red-200 rounded-lg hover:bg-red-50 text-red-600"
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
      <div className="mt-8 bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">API Endpoints</h3>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">GET</span>
            <span className="text-gray-700">/api/v1/insurance/facilities</span>
            <span className="text-gray-400 font-sans">— List accessible facilities</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">GET</span>
            <span className="text-gray-700">/api/v1/insurance/facilities/:id/risk-profile</span>
            <span className="text-gray-400 font-sans">— Full compliance risk profile</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">GET</span>
            <span className="text-gray-700">/api/v1/insurance/facilities/:id/history?days=90</span>
            <span className="text-gray-400 font-sans">— Compliance event history</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Authentication: <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200">Authorization: Bearer evd_ins_...</code>
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-[95vw] sm:w-auto max-w-lg sm:w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="e.g., Carrier Partnership — Production"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facility Scope</label>
                <select
                  value={newFacilityScope}
                  onChange={e => setNewFacilityScope(e.target.value as 'all' | 'selected')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="all">All Facilities</option>
                  <option value="selected">Selected Facilities Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Permissions</label>
                <div className="space-y-2">
                  {[
                    { key: 'facilities', label: 'Facility List', desc: 'List of accessible facilities' },
                    { key: 'riskProfile', label: 'Risk Profile', desc: 'Full compliance risk profile data' },
                    { key: 'history', label: 'Event History', desc: 'Compliance event history (up to 365 days)' },
                  ].map(p => (
                    <label key={p.key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(newPerms as any)[p.key]}
                        onChange={e => setNewPerms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">{p.label}</span>
                        <p className="text-xs text-gray-500">{p.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration</label>
                <select
                  value={newExpiryDays}
                  onChange={e => setNewExpiryDays(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-4 py-2.5 min-h-[44px] border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                disabled={!newLabel.trim()}
                className="flex-1 px-4 py-2.5 min-h-[44px] text-white rounded-lg text-sm font-bold disabled:opacity-40"
                style={{ backgroundColor: NAVY }}
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
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
