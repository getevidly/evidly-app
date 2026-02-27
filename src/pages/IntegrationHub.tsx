import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import {
  ShoppingBag, Link2, Key, Activity, HeartPulse,
  Search, ExternalLink, CheckCircle2, AlertTriangle,
  RefreshCw, Pause, Play, Trash2, Copy, Eye, EyeOff,
  ArrowUpRight, ArrowDownLeft, Clock, Filter,
  Zap, ChevronRight, Plus, XCircle, X, Check,
  Globe, Code2, Webhook, BarChart3, Send,
} from 'lucide-react';
import {
  integrationPlatforms,
  connectedIntegrations,
  integrationSyncLogs,
  apiWebhookSubscriptions,
  apiUsageStats,
  webhookDeliveryLogs,
  type IntegrationPlatform,
  type ConnectedIntegration,
  type IntegrationSyncLog,
  type WebhookDeliveryLog,
} from '../data/demoData';

type Tab = 'marketplace' | 'connected' | 'api' | 'activity' | 'health';

const TABS: { id: Tab; label: string; icon: typeof ShoppingBag }[] = [
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
  { id: 'connected', label: 'Connected', icon: Link2 },
  { id: 'api', label: 'API Management', icon: Key },
  { id: 'activity', label: 'Sync Activity', icon: Activity },
  { id: 'health', label: 'Health', icon: HeartPulse },
];

const CATEGORY_ORDER = ['accounting', 'pos', 'payroll', 'distribution', 'productivity', 'inventory', 'communication', 'automation'] as const;

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: '#e0f2fe', text: '#0369a1', label: 'Available' },
  connected: { bg: '#dcfce7', text: '#15803d', label: 'Connected' },
  coming_soon: { bg: '#fef3c7', text: '#92400e', label: 'Coming Soon' },
  beta: { bg: '#ede9fe', text: '#6d28d9', label: 'Beta' },
};

const SYNC_STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  connected: { bg: '#dcfce7', text: '#15803d' },
  error: { bg: '#fee2e2', text: '#dc2626' },
  syncing: { bg: '#e0f2fe', text: '#0369a1' },
  paused: { bg: '#f3f4f6', text: '#6b7280' },
};

// ── Marketplace Tab ──────────────────────────────────────────────────────────

function MarketplaceTab() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');

  const categories = CATEGORY_ORDER.map(key => {
    const first = integrationPlatforms.find(p => p.category === key);
    return { key, label: first?.categoryLabel || key };
  });

  const filtered = integrationPlatforms.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || p.category === catFilter;
    return matchSearch && matchCat;
  });

  const grouped = CATEGORY_ORDER.reduce<Record<string, IntegrationPlatform[]>>((acc, cat) => {
    const items = filtered.filter(p => p.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div>
      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Integrations', value: integrationPlatforms.length },
          { label: 'Connected', value: integrationPlatforms.filter(p => p.status === 'connected').length },
          { label: 'Available', value: integrationPlatforms.filter(p => p.status === 'available').length },
          { label: 'Coming Soon', value: integrationPlatforms.filter(p => p.status === 'coming_soon').length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="text-2xl font-bold text-[#1e4d6b]">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grouped cards */}
      {Object.entries(grouped).map(([cat, platforms]) => {
        const catLabel = categories.find(c => c.key === cat)?.label || cat;
        return (
          <div key={cat} className="mb-8">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">{catLabel}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {platforms.map(p => (
                <IntegrationCard key={p.id} platform={p} />
              ))}
            </div>
          </div>
        );
      })}

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-12 text-gray-400">No integrations match your search.</div>
      )}
    </div>
  );
}

function IntegrationCard({ platform }: { platform: IntegrationPlatform }) {
  const badge = STATUS_BADGE[platform.status];
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: platform.color }}>
            {platform.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">{platform.name}</div>
            <div className="text-xs text-gray-500">{platform.authType === 'oauth2' ? 'OAuth 2.0' : platform.authType === 'api_key' ? 'API Key' : platform.authType === 'certificate' ? 'Certificate' : 'EDI'}</div>
          </div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.bg, color: badge.text }}>{badge.label}</span>
      </div>
      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{platform.description}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {platform.features.slice(0, 3).map(f => (
          <span key={f} className="text-[10px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded">{f}</span>
        ))}
        {platform.features.length > 3 && (
          <span className="text-[10px] text-gray-400">+{platform.features.length - 3} more</span>
        )}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <span className="text-[10px] text-gray-400">{platform.marketSize}</span>
        <button
          onClick={() => {
            if (platform.status === 'connected') {
              toast.info('Already connected. Go to Connected tab.');
            } else if (platform.status === 'coming_soon') {
              toast.info('This integration is coming soon');
            } else {
              toast.info(`OAuth flow for ${platform.name} (demo)`);
            }
          }}
          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors min-h-[44px]"
          style={{
            backgroundColor: platform.status === 'connected' ? '#dcfce7' : platform.status === 'coming_soon' ? '#f3f4f6' : '#1e4d6b',
            color: platform.status === 'connected' ? '#15803d' : platform.status === 'coming_soon' ? '#9ca3af' : 'white',
          }}
        >
          {platform.status === 'connected' ? <><CheckCircle2 className="h-3 w-3" /> Connected</> :
           platform.status === 'coming_soon' ? 'Coming Soon' :
           <><Plus className="h-3 w-3" /> Connect</>}
        </button>
      </div>
    </div>
  );
}

// ── Connected Integrations Tab ───────────────────────────────────────────────

function ConnectedTab() {
  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Connections', value: connectedIntegrations.filter(c => c.status === 'connected').length, color: '#15803d' },
          { label: 'Employees Synced', value: connectedIntegrations.reduce((s, c) => s + c.employeesSynced, 0), color: '#1e4d6b' },
          { label: 'Vendors Synced', value: connectedIntegrations.reduce((s, c) => s + c.vendorsSynced, 0), color: '#d4af37' },
          { label: 'Errors', value: connectedIntegrations.filter(c => c.status === 'error').length, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Connections table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                <th className="text-left px-4 py-3 font-semibold">Platform</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Last Sync</th>
                <th className="text-center px-4 py-3 font-semibold hidden md:table-cell">Employees</th>
                <th className="text-center px-4 py-3 font-semibold hidden md:table-cell">Vendors</th>
                <th className="text-center px-4 py-3 font-semibold hidden lg:table-cell">Docs</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {connectedIntegrations.map(ci => (
                <ConnectedRow key={ci.id} connection={ci} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConnectedRow({ connection }: { connection: ConnectedIntegration }) {
  const platform = integrationPlatforms.find(p => p.slug === connection.platform || p.name === connection.platformDisplayName);
  const statusBadge = SYNC_STATUS_BADGE[connection.status];
  const timeSince = getTimeSince(connection.lastSyncAt);

  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px]" style={{ backgroundColor: platform?.color || '#6b7280' }}>
            {connection.platformDisplayName.charAt(0)}
          </div>
          <div>
            <div className="font-medium text-gray-900">{connection.platformDisplayName}</div>
            <div className="text-[10px] text-gray-400">Connected {new Date(connection.connectedAt).toLocaleDateString()}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: statusBadge.bg, color: statusBadge.text }}>
          {connection.status}
        </span>
        {connection.lastError && (
          <div className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate">{connection.lastError}</div>
        )}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="text-xs text-gray-700">{timeSince}</div>
        <div className="text-[10px] text-gray-400">
          {connection.lastSyncStatus === 'success' ? '✓ Success' : connection.lastSyncStatus === 'partial' ? '⚠ Partial' : '✕ Failed'}
        </div>
      </td>
      <td className="px-4 py-3 text-center text-xs font-medium text-gray-700 hidden md:table-cell">{connection.employeesSynced || '—'}</td>
      <td className="px-4 py-3 text-center text-xs font-medium text-gray-700 hidden md:table-cell">{connection.vendorsSynced || '—'}</td>
      <td className="px-4 py-3 text-center text-xs font-medium text-gray-700 hidden lg:table-cell">{connection.documentsSynced || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => toast.info(`Syncing ${connection.platformDisplayName} (demo)`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#1e4d6b]" title="Sync Now">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => toast.info(`${connection.status === 'paused' ? 'Resuming' : 'Pausing'} ${connection.platformDisplayName}`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#1e4d6b]" title={connection.status === 'paused' ? 'Resume' : 'Pause'}>
            {connection.status === 'paused' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => toast.warning(`Disconnect ${connection.platformDisplayName}? (demo)`)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title="Disconnect">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Webhook Event Catalog ────────────────────────────────────────────────────

const WEBHOOK_EVENT_CATALOG = {
  Temperature: [
    { key: 'temperature.out_of_range', label: 'Temperature reading outside acceptable range' },
    { key: 'temperature.reading', label: 'New temperature reading logged' },
    { key: 'temperature.sensor_offline', label: 'IoT sensor stopped reporting' },
  ],
  Incidents: [
    { key: 'incident.created', label: 'New incident created' },
    { key: 'incident.resolved', label: 'Incident resolved' },
    { key: 'incident.escalated', label: 'Incident escalated to critical' },
  ],
  Checklists: [
    { key: 'checklist.completed', label: 'Daily checklist completed' },
    { key: 'checklist.missed', label: 'Daily checklist not completed by deadline' },
    { key: 'checklist.item_failed', label: 'Checklist item marked as failed' },
  ],
  Documents: [
    { key: 'document.uploaded', label: 'New document uploaded' },
    { key: 'document.expiring', label: 'Document expiring within 30 days' },
    { key: 'document.expired', label: 'Document has expired' },
  ],
  Compliance: [
    { key: 'compliance.score_changed', label: 'Compliance score changed significantly' },
    { key: 'compliance.dropped_below', label: 'Compliance score dropped below threshold' },
  ],
  Equipment: [
    { key: 'equipment.service_due', label: 'Equipment service coming due' },
    { key: 'equipment.service_overdue', label: 'Equipment service overdue' },
  ],
  'AI Copilot': [
    { key: 'copilot.critical_insight', label: 'AI Copilot generated a critical insight' },
  ],
};

// ── Create API Key Modal ─────────────────────────────────────────────────────

interface DemoApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rateLimit: number;
  createdAt: string;
  lastUsedAt: string | null;
  requestsToday: number;
  active: boolean;
}

function CreateApiKeyModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: (key: DemoApiKey, fullKey: string) => void }) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read']);
  const [rateLimit, setRateLimit] = useState('1000');
  const [expiry, setExpiry] = useState('never');

  if (!isOpen) return null;

  const toggleScope = (scope: string) => {
    setScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
  };

  const handleCreate = () => {
    if (!name.trim()) { toast.warning('Please enter a key name'); return; }
    const randomPart = Math.random().toString(36).substring(2, 14);
    const fullKey = `evd_live_${randomPart}${Math.random().toString(36).substring(2, 14)}`;
    const prefix = fullKey.substring(0, 16);
    const newKey: DemoApiKey = {
      id: `key-${Date.now()}`,
      name: name.trim(),
      prefix,
      scopes,
      rateLimit: parseInt(rateLimit) || 1000,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      requestsToday: 0,
      active: true,
    };
    onCreated(newKey, fullKey);
    setName('');
    setScopes(['read']);
    setRateLimit('1000');
    setExpiry('never');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Create API Key</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Production Key" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">Scopes</label>
            <div className="space-y-2">
              {[
                { key: 'read', label: 'Read', desc: 'View data (locations, scores, temperatures, documents)' },
                { key: 'write', label: 'Write', desc: 'Create readings, incidents, upload documents' },
                { key: 'admin', label: 'Admin', desc: 'Manage settings, users, and API keys' },
              ].map(s => (
                <label key={s.key} className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={scopes.includes(s.key)} onChange={() => toggleScope(s.key)} className="mt-0.5 rounded border-gray-300 text-[#1e4d6b] focus:ring-[#1e4d6b]" />
                  <div>
                    <span className="text-xs font-medium text-gray-900">{s.label}</span>
                    <span className="text-[10px] text-gray-500 block">{s.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Rate limit (requests/hour)</label>
            <input type="number" value={rateLimit} onChange={e => setRateLimit(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Expires</label>
            <select value={expiry} onChange={e => setExpiry(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20">
              <option value="never">Never</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="1y">1 year</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleCreate} className="px-4 py-2 text-sm font-medium bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors min-h-[44px]">Create Key</button>
        </div>
      </div>
    </div>
  );
}

function ShowKeyOnceModal({ isOpen, onClose, fullKey }: { isOpen: boolean; onClose: () => void; fullKey: string }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Copy your API key NOW</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">This is the only time it will be shown. Store it securely.</p>
        </div>
        <div className="px-6 py-4">
          <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-800 break-all select-all">{fullKey}</div>
          <button
            onClick={() => { navigator.clipboard.writeText(fullKey); toast.success('API key copied to clipboard'); }}
            className="flex items-center gap-2 mt-3 w-full justify-center py-2 bg-[#1e4d6b] text-white rounded-lg text-sm font-medium hover:bg-[#163a52] transition-colors min-h-[44px]"
          >
            <Copy className="h-4 w-4" /> Copy to Clipboard
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-2">If lost, revoke this key and create a new one.</p>
        </div>
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">Done</button>
        </div>
      </div>
    </div>
  );
}

// ── Create Webhook Modal ─────────────────────────────────────────────────────

function CreateWebhookModal({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: (name: string, url: string, events: string[]) => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleEvent = (key: string) => {
    setSelectedEvents(prev => prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]);
  };

  const handleCreate = () => {
    if (!name.trim()) { toast.warning('Please enter a webhook name'); return; }
    if (!url.trim()) { toast.warning('Please enter a webhook URL'); return; }
    if (selectedEvents.length === 0) { toast.warning('Please select at least one event'); return; }
    onCreated(name.trim(), url.trim(), selectedEvents);
    setName('');
    setUrl('');
    setSelectedEvents([]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-semibold text-gray-900">Create Webhook</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Slack Kitchen Alerts" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">URL</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://hooks.example.com/evidly" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">Events</label>
            <div className="space-y-3">
              {Object.entries(WEBHOOK_EVENT_CATALOG).map(([category, events]) => (
                <div key={category}>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{category}</div>
                  <div className="space-y-1">
                    {events.map(evt => (
                      <label key={evt.key} className="flex items-start gap-2 cursor-pointer py-0.5">
                        <input type="checkbox" checked={selectedEvents.includes(evt.key)} onChange={() => toggleEvent(evt.key)} className="mt-0.5 rounded border-gray-300 text-[#1e4d6b] focus:ring-[#1e4d6b]" />
                        <div>
                          <code className="text-[10px] font-mono text-gray-700">{evt.key}</code>
                          <span className="text-[10px] text-gray-400 block">{evt.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <span className="text-[10px] text-gray-400">{selectedEvents.length} events selected</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm font-medium bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors min-h-[44px]">Create Webhook</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Test Webhook Modal ───────────────────────────────────────────────────────

function TestWebhookModal({ isOpen, onClose, webhookName }: { isOpen: boolean; onClose: () => void; webhookName: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleTest = () => {
    setStatus('sending');
    setTimeout(() => {
      setStatus(Math.random() > 0.15 ? 'success' : 'error');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Test Webhook: {webhookName}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {status === 'idle' && (
            <div className="text-center py-4">
              <Send className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Send a test <code className="font-mono bg-gray-50 px-1 text-xs">compliance.score_changed</code> event to this webhook endpoint.</p>
              <button onClick={handleTest} className="mt-4 px-6 py-2 bg-[#1e4d6b] text-white rounded-lg text-sm font-medium hover:bg-[#163a52] transition-colors min-h-[44px]">
                Send Test Event
              </button>
            </div>
          )}
          {status === 'sending' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b] mx-auto" />
              <p className="text-sm text-gray-500 mt-3">Delivering test event...</p>
            </div>
          )}
          {status === 'success' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold text-sm">Delivered successfully</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between text-xs"><span className="text-gray-500">Status</span><span className="font-mono text-green-600">200 OK</span></div>
                <div className="flex items-center justify-between text-xs"><span className="text-gray-500">Response time</span><span className="font-mono text-gray-700">142ms</span></div>
                <div className="flex items-center justify-between text-xs"><span className="text-gray-500">Event</span><code className="font-mono text-gray-700 text-[10px]">compliance.score_changed</code></div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 mb-1">Response body</div>
                <pre className="bg-gray-900 rounded-lg px-3 py-2 text-[10px] text-green-300 font-mono overflow-x-auto">{'{ "status": "ok", "received": true }'}</pre>
              </div>
            </div>
          )}
          {status === 'error' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span className="font-semibold text-sm">Delivery failed</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between text-xs"><span className="text-gray-500">Status</span><span className="font-mono text-red-600">502 Bad Gateway</span></div>
                <div className="flex items-center justify-between text-xs"><span className="text-gray-500">Response time</span><span className="font-mono text-gray-700">3,021ms</span></div>
              </div>
              <button onClick={handleTest} className="text-xs text-[#1e4d6b] hover:underline">Retry</button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-100">
          <button onClick={() => { onClose(); setStatus('idle'); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── API Management Tab ───────────────────────────────────────────────────────

function ApiManagementTab() {
  const navigate = useNavigate();
  const [showKey, setShowKey] = useState(false);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const demoApiKey = 'evd_live_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
  const demoSandboxKey = 'evd_sandbox_sk_x9y8w7v6u5t4s3r2q1p0o9n8m7l6k5j4';

  // Demo state for created keys, webhooks, delivery logs
  const [apiKeys, setApiKeys] = useState<DemoApiKey[]>([
    { id: 'key-prod', name: 'Production Key', prefix: 'evd_live_sk_a1b2', scopes: ['read', 'write'], rateLimit: 1000, createdAt: '2026-02-01T10:00:00Z', lastUsedAt: '2026-02-13T14:32:00Z', requestsToday: 847, active: true },
    { id: 'key-r365', name: 'R365 Integration', prefix: 'evd_live_sk_def4', scopes: ['read'], rateLimit: 500, createdAt: '2026-01-15T09:00:00Z', lastUsedAt: '2026-02-13T13:15:00Z', requestsToday: 124, active: true },
  ]);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showKeyOnce, setShowKeyOnce] = useState(false);
  const [newFullKey, setNewFullKey] = useState('');
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [testWebhook, setTestWebhook] = useState<string | null>(null);
  const [showDeliveryLogs, setShowDeliveryLogs] = useState(false);
  const [webhooks, setWebhooks] = useState(apiWebhookSubscriptions);

  const handleKeyCreated = (key: DemoApiKey, fullKey: string) => {
    setApiKeys(prev => [...prev, key]);
    setShowCreateKey(false);
    setNewFullKey(fullKey);
    setShowKeyOnce(true);
    toast.success('API key created');
  };

  const handleRevokeKey = (keyId: string) => {
    setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, active: false } : k));
    toast.success('API key revoked');
  };

  const handleWebhookCreated = (name: string, url: string, events: string[]) => {
    const newWebhook = {
      id: `wh-${Date.now()}`,
      appName: name,
      url,
      events,
      status: 'active' as const,
      lastDeliveryAt: null,
      failureCount: 0,
      createdAt: new Date().toISOString(),
    };
    setWebhooks(prev => [...prev, newWebhook]);
    setShowCreateWebhook(false);
    toast.success('Webhook created');
  };

  return (
    <>
    <div className="space-y-6">
      {/* API Keys */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-gray-900">API Keys</h3>
            <p className="text-xs text-gray-500 mt-0.5">Manage your production and sandbox API keys. Keys are shown once at creation.</p>
          </div>
          <button onClick={() => guardAction('settings', 'API integrations', () => setShowCreateKey(true))} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors min-h-[44px]">
            <Plus className="h-3.5 w-3.5" /> Create New Key
          </button>
        </div>

        <div className="space-y-3">
          {/* Active keys */}
          {apiKeys.filter(k => k.active).map(key => (
            <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-wrap gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-900">{key.name}</div>
                  <div className="font-mono text-[11px] text-gray-500 mt-0.5 truncate">
                    {key.id === 'key-prod' && showKey ? demoApiKey : `${key.prefix}...`}
                    <span className="text-gray-400 ml-2">Scopes: {key.scopes.join(', ')}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Created: {new Date(key.createdAt).toLocaleDateString()} · {key.lastUsedAt ? `Last used: ${getTimeSince(key.lastUsedAt)}` : 'Never used'}
                    {' · '}Rate limit: {key.rateLimit.toLocaleString()}/hr · Requests today: {key.requestsToday}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {key.id === 'key-prod' && (
                  <button onClick={() => setShowKey(!showKey)} className="p-1.5 rounded hover:bg-gray-200 text-gray-400">
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                )}
                {key.id === 'key-prod' && (
                  <button onClick={() => { navigator.clipboard.writeText(demoApiKey); toast.success('API key copied'); }} className="p-1.5 rounded hover:bg-gray-200 text-gray-400">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={() => handleRevokeKey(key.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Revoke">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Sandbox key */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-wrap gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-900">Sandbox Key</div>
                <div className="font-mono text-[11px] text-gray-500 mt-0.5 truncate">evd_sandbox_sk_••••••••</div>
              </div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(demoSandboxKey); toast.success('Sandbox key copied'); }} className="p-1.5 rounded hover:bg-gray-200 text-gray-400">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Revoked keys */}
          {apiKeys.filter(k => !k.active).length > 0 && (
            <div className="pt-2">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Revoked Keys</div>
              {apiKeys.filter(k => !k.active).map(key => (
                <div key={key.id} className="flex items-center gap-3 p-2 text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                  <span className="text-xs line-through">{key.name}</span>
                  <span className="text-[10px]">{key.prefix}...</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">API Usage ({apiUsageStats.period})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-xl font-bold text-[#1e4d6b]">{apiUsageStats.requestCount.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">API Requests</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-[#d4af37]">{apiUsageStats.webhookDeliveries.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">Webhook Deliveries</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{apiUsageStats.errorRate}%</div>
            <div className="text-[10px] text-gray-500">Error Rate</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-700">{apiUsageStats.avgResponseMs}ms</div>
            <div className="text-[10px] text-gray-500">Avg Response</div>
          </div>
        </div>
        <h4 className="text-xs font-semibold text-gray-600 mb-2">Top Endpoints</h4>
        <div className="space-y-2">
          {apiUsageStats.topEndpoints.map(ep => {
            const pct = (ep.count / apiUsageStats.topEndpoints[0].count) * 100;
            return (
              <div key={ep.endpoint} className="flex items-center gap-3">
                <code className="text-[10px] text-gray-600 font-mono flex-1 truncate">{ep.endpoint}</code>
                <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1e4d6b] rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-gray-500 w-12 text-right">{ep.count.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Webhook Subscriptions */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-gray-900">Webhook Subscriptions</h3>
            <p className="text-xs text-gray-500 mt-0.5">Manage outgoing webhook event delivery. All payloads signed with HMAC-SHA256.</p>
          </div>
          <button onClick={() => guardAction('settings', 'webhook integrations', () => setShowCreateWebhook(true))} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors min-h-[44px]">
            <Plus className="h-3.5 w-3.5" /> Create Webhook
          </button>
        </div>

        <div className="space-y-3">
          {webhooks.map(wh => {
            const healthy = wh.status === 'active' && wh.failureCount === 0;
            const warning = wh.status === 'active' && wh.failureCount > 0;
            return (
              <div key={wh.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-900">{wh.appName}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        healthy ? 'bg-green-50 text-green-700' :
                        warning ? 'bg-yellow-50 text-yellow-700' :
                        wh.status === 'paused' ? 'bg-gray-100 text-gray-500' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {healthy ? 'Healthy' : warning ? `${wh.failureCount} failure${wh.failureCount > 1 ? 's' : ''}` : wh.status}
                      </span>
                    </div>
                    <code className="text-[10px] text-gray-400 font-mono block mt-1 truncate max-w-[400px]">{wh.url}</code>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {wh.events.map(e => (
                        <span key={e} className="text-[9px] bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-mono">{e}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toast.info(`${wh.status === 'paused' ? 'Resuming' : 'Pausing'} webhook`)} className="p-1 rounded hover:bg-gray-200 text-gray-400" title={wh.status === 'paused' ? 'Resume' : 'Pause'}>
                      {wh.status === 'paused' ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                    </button>
                    <button onClick={() => setTestWebhook(wh.appName)} className="p-1 rounded hover:bg-gray-200 text-gray-400" title="Send test event">
                      <Send className="h-3 w-3" />
                    </button>
                    <button onClick={() => { setWebhooks(prev => prev.filter(w => w.id !== wh.id)); toast.success('Webhook deleted'); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                  {wh.lastDeliveryAt && <span>Last delivery: {getTimeSince(wh.lastDeliveryAt)}</span>}
                  <span>Deliveries: {webhookDeliveryLogs.filter(d => d.webhookId === wh.id).length} total</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Webhook Delivery Logs toggle */}
        <button
          onClick={() => setShowDeliveryLogs(!showDeliveryLogs)}
          className="flex items-center gap-2 mt-4 text-xs text-[#1e4d6b] hover:underline"
        >
          <Activity className="h-3.5 w-3.5" />
          {showDeliveryLogs ? 'Hide' : 'View'} Delivery Logs ({webhookDeliveryLogs.length} deliveries)
        </button>

        {showDeliveryLogs && (
          <div className="mt-3 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-[10px]">
                  <th className="text-left px-3 py-2 font-semibold">Time</th>
                  <th className="text-left px-3 py-2 font-semibold">Webhook</th>
                  <th className="text-left px-3 py-2 font-semibold hidden sm:table-cell">Event</th>
                  <th className="text-center px-3 py-2 font-semibold">Status</th>
                  <th className="text-center px-3 py-2 font-semibold hidden sm:table-cell">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {webhookDeliveryLogs.map(log => {
                  const wh = apiWebhookSubscriptions.find(w => w.id === log.webhookId);
                  return (
                    <tr key={log.id} className="border-t border-gray-50">
                      <td className="px-3 py-2 text-gray-700">{getTimeSince(log.createdAt)}</td>
                      <td className="px-3 py-2 text-gray-700">{wh?.appName || log.webhookId}</td>
                      <td className="px-3 py-2 hidden sm:table-cell"><code className="font-mono text-[10px] text-gray-500">{log.eventType}</code></td>
                      <td className="px-3 py-2 text-center">
                        {log.delivered
                          ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">{log.statusCode}</span>
                          : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">{log.statusCode || 'Failed'}</span>
                        }
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500 hidden sm:table-cell">{log.attempts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Developer Portal Link */}
      <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2a6a8f] rounded-xl p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-lg">Developer Portal</h3>
            <p className="text-white/70 text-sm mt-1">Full API documentation, SDKs, sandbox environment, and integration guides.</p>
          </div>
          <button
            onClick={() => navigate('/developers')}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Code2 className="h-4 w-4" /> Open Portal <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    {/* Modals */}
    <CreateApiKeyModal isOpen={showCreateKey} onClose={() => setShowCreateKey(false)} onCreated={handleKeyCreated} />
    <ShowKeyOnceModal isOpen={showKeyOnce} onClose={() => setShowKeyOnce(false)} fullKey={newFullKey} />
    <CreateWebhookModal isOpen={showCreateWebhook} onClose={() => setShowCreateWebhook(false)} onCreated={handleWebhookCreated} />
    <TestWebhookModal isOpen={!!testWebhook} onClose={() => setTestWebhook(null)} webhookName={testWebhook || ''} />
    {showUpgrade && (
      <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
    )}
    </>
  );
}

// ── Sync Activity Log Tab ────────────────────────────────────────────────────

function ActivityTab() {
  const [filterPlatform, setFilterPlatform] = useState('all');

  const platforms = [...new Set(integrationSyncLogs.map(l => l.platformDisplayName))];
  const filtered = filterPlatform === 'all' ? integrationSyncLogs : integrationSyncLogs.filter(l => l.platformDisplayName === filterPlatform);
  const sorted = [...filtered].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Filter className="h-4 w-4 text-gray-400" />
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20">
          <option value="all">All Platforms</option>
          {platforms.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="text-xs text-gray-400">{sorted.length} events</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                <th className="text-left px-4 py-3 font-semibold">Time</th>
                <th className="text-left px-4 py-3 font-semibold">Platform</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Entity</th>
                <th className="text-center px-4 py-3 font-semibold hidden sm:table-cell">Records</th>
                <th className="text-center px-4 py-3 font-semibold hidden lg:table-cell">Duration</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(log => (
                <SyncLogRow key={log.id} log={log} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SyncLogRow({ log }: { log: IntegrationSyncLog }) {
  const platform = integrationPlatforms.find(p => p.slug === log.platform);
  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/50">
      <td className="px-4 py-3">
        <div className="text-xs text-gray-700">{new Date(log.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="text-[10px] text-gray-400">{new Date(log.startedAt).toLocaleDateString()}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center text-white font-bold text-[8px]" style={{ backgroundColor: platform?.color || '#6b7280' }}>
            {log.platformDisplayName.charAt(0)}
          </div>
          <span className="text-xs font-medium text-gray-900">{log.platformDisplayName}</span>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="flex items-center gap-1">
          {log.direction === 'inbound' ? <ArrowDownLeft className="h-3 w-3 text-blue-500" /> : <ArrowUpRight className="h-3 w-3 text-green-500" />}
          <span className="text-xs text-gray-600 capitalize">{log.syncType}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-700 hidden md:table-cell">{log.entityType}</td>
      <td className="px-4 py-3 text-center hidden sm:table-cell">
        <div className="text-xs text-gray-700">{log.recordsProcessed}</div>
        <div className="text-[10px] text-gray-400">
          {log.recordsCreated > 0 && <span className="text-green-600">+{log.recordsCreated}</span>}
          {log.recordsUpdated > 0 && <span className="text-blue-600 ml-1">~{log.recordsUpdated}</span>}
          {log.recordsFailed > 0 && <span className="text-red-500 ml-1">✕{log.recordsFailed}</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-center text-xs text-gray-500 hidden lg:table-cell">{log.completedAt ? `${((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000).toFixed(1)}s` : '—'}</td>
      <td className="px-4 py-3">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${log.status === 'completed' ? 'bg-green-50 text-green-700' : log.status === 'partial' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600'}`}>
          {log.status}
        </span>
        {log.errors && log.errors.length > 0 && <div className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate">{log.errors[0].message}{log.errors.length > 1 ? ` (+${log.errors.length - 1} more)` : ''}</div>}
      </td>
    </tr>
  );
}

// ── Health Dashboard Tab ─────────────────────────────────────────────────────

function HealthTab() {
  const activeConnections = connectedIntegrations.filter(c => c.status === 'connected').length;
  const errorConnections = connectedIntegrations.filter(c => c.status === 'error').length;
  const totalSyncs = integrationSyncLogs.length;
  const successSyncs = integrationSyncLogs.filter(l => l.status === 'completed').length;
  const successRate = totalSyncs > 0 ? ((successSyncs / totalSyncs) * 100).toFixed(1) : '0';
  const avgDuration = totalSyncs > 0 ? Math.round(integrationSyncLogs.reduce((s, l) => s + (l.completedAt ? new Date(l.completedAt).getTime() - new Date(l.startedAt).getTime() : 0), 0) / totalSyncs) : 0;

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Active', value: activeConnections, color: '#15803d', icon: CheckCircle2 },
          { label: 'Errors', value: errorConnections, color: '#dc2626', icon: XCircle },
          { label: 'Sync Success', value: `${successRate}%`, color: '#1e4d6b', icon: Activity },
          { label: 'Avg Duration', value: `${avgDuration}ms`, color: '#d4af37', icon: Clock },
          { label: 'API Uptime', value: '99.9%', color: '#15803d', icon: Globe },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="h-4 w-4" style={{ color: card.color }} />
              <span className="text-xs text-gray-500">{card.label}</span>
            </div>
            <div className="text-xl font-bold" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Per-integration health */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Integration Health Status</h3>
        <div className="space-y-3">
          {connectedIntegrations.map(ci => {
            const platform = integrationPlatforms.find(p => p.slug === ci.platform || p.name === ci.platformDisplayName);
            const logs = integrationSyncLogs.filter(l => l.platform === ci.platform);
            const lastLog = logs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];

            return (
              <div key={ci.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: platform?.color || '#6b7280' }}>
                    {ci.platformDisplayName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{ci.platformDisplayName}</div>
                    <div className="text-[10px] text-gray-400">
                      {ci.employeesSynced > 0 && `${ci.employeesSynced} employees`}
                      {ci.vendorsSynced > 0 && `${ci.employeesSynced > 0 ? ' · ' : ''}${ci.vendorsSynced} vendors`}
                      {ci.documentsSynced > 0 && `${(ci.employeesSynced > 0 || ci.vendorsSynced > 0) ? ' · ' : ''}${ci.documentsSynced} docs`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Health indicators */}
                  <div className="flex items-center gap-2">
                    <HealthDot status={ci.status === 'connected' ? 'green' : ci.status === 'error' ? 'red' : 'yellow'} label="Connection" />
                    <HealthDot status={ci.lastSyncStatus === 'success' ? 'green' : ci.lastSyncStatus === 'partial' ? 'yellow' : 'red'} label="Last Sync" />
                    <HealthDot status={lastLog?.completedAt && (new Date(lastLog.completedAt).getTime() - new Date(lastLog.startedAt).getTime()) < 5000 ? 'green' : 'yellow'} label="Latency" />
                  </div>

                  <div className="text-[10px] text-gray-400 w-20 text-right">{getTimeSince(ci.lastSyncAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* API Health */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
        <h3 className="font-semibold text-gray-900 mb-4">API Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-2">Request Volume (30d)</div>
            <div className="h-20 flex items-end gap-1">
              {Array.from({ length: 30 }, (_, i) => {
                const h = 20 + Math.sin(i * 0.3) * 30 + Math.random() * 30;
                return <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: '#1e4d6b', opacity: 0.3 + (i / 30) * 0.7 }} />;
              })}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-2">Response Times (30d)</div>
            <div className="h-20 flex items-end gap-1">
              {Array.from({ length: 30 }, (_, i) => {
                const h = 10 + Math.random() * 40;
                return <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: h > 35 ? '#d4af37' : '#15803d' }} />;
              })}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-2">Error Rate (30d)</div>
            <div className="h-20 flex items-end gap-1">
              {Array.from({ length: 30 }, (_, i) => {
                const h = 2 + Math.random() * 8;
                return <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: h > 7 ? '#dc2626' : '#e5e7eb' }} />;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthDot({ status, label }: { status: 'green' | 'yellow' | 'red'; label: string }) {
  const colors = { green: '#15803d', yellow: '#d4af37', red: '#dc2626' };
  return (
    <div className="flex items-center gap-1" title={label}>
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[status] }} />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Main Component ───────────────────────────────────────────────────────────

export function IntegrationHub() {
  const location = useLocation();
  const initialTab: Tab = location.pathname.includes('/api-keys') || location.pathname.includes('/webhooks') ? 'api' : 'marketplace';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  return (
    <div className="max-w-7xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-[#1e4d6b] rounded-lg">
            <Globe className="h-5 w-5 text-[#d4af37]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">API & Integration Hub</h1>
            <p className="text-sm text-gray-500">Connect EvidLY with your restaurant tech stack</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 p-1.5 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${
              activeTab === tab.id
                ? 'bg-[#1e4d6b] text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.id === 'connected' && connectedIntegrations.filter(c => c.status === 'error').length > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{connectedIntegrations.filter(c => c.status === 'error').length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'marketplace' && <MarketplaceTab />}
      {activeTab === 'connected' && <ConnectedTab />}
      {activeTab === 'api' && <ApiManagementTab />}
      {activeTab === 'activity' && <ActivityTab />}
      {activeTab === 'health' && <HealthTab />}
    </div>
  );
}
