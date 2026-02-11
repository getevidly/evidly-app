import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Network, KeyRound, Users, Palette, FileText,
  ShieldCheck, LogOut, ChevronRight, ChevronDown, Shield, Award,
  TrendingUp, MapPin, Clock, Settings, Eye, Copy, RefreshCw,
  UserPlus, Download, Upload, Search, Filter, Globe, Lock,
  BarChart3, Zap, ExternalLink, CheckCircle, XCircle, AlertTriangle,
  Layers, Monitor, Paintbrush,
} from 'lucide-react';
import {
  enterpriseTenants, enterpriseHierarchy, enterpriseUsers,
  enterpriseReportTemplates, enterpriseAuditLog,
  type EnterpriseTenant, type EnterpriseHierarchyNode,
  type EnterpriseUser, type EnterpriseReportTemplate,
  type EnterpriseAuditEntry,
} from '../data/demoData';

// ── Types ──────────────────────────────────────────────────────
type Tab = 'overview' | 'tenants' | 'hierarchy' | 'sso' | 'users' | 'branding' | 'reports';

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview',  label: 'Overview',           icon: LayoutDashboard },
  { id: 'tenants',   label: 'Tenant Management',  icon: Building2 },
  { id: 'hierarchy', label: 'Hierarchy & Rollups', icon: Network },
  { id: 'sso',       label: 'SSO Configuration',  icon: KeyRound },
  { id: 'users',     label: 'User Directory',      icon: Users },
  { id: 'branding',  label: 'Branding & Theming',  icon: Palette },
  { id: 'reports',   label: 'Reports & Templates', icon: FileText },
];

// ── Helpers ────────────────────────────────────────────────────
function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatCurrency(n: number) {
  return '$' + (n / 1_000_000).toFixed(1) + 'M';
}
function formatTime(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function scoreColor(s: number) {
  if (s >= 90) return '#22c55e';
  if (s >= 80) return '#d4af37';
  if (s >= 70) return '#f59e0b';
  return '#ef4444';
}
function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    onboarding: 'bg-blue-50 text-blue-700 border-blue-200',
    pilot: 'bg-amber-50 text-amber-700 border-amber-200',
    suspended: 'bg-red-50 text-red-700 border-red-200',
    passed: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    untested: 'bg-gray-100 text-gray-500 border-gray-200',
    enterprise: 'bg-blue-50 text-blue-700 border-blue-200',
    enterprise_plus: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${map[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {label}
    </span>
  );
}
function ssoStatusBadge(st: 'active' | 'pending' | 'disabled') {
  const m = { active: 'bg-green-50 text-green-700', pending: 'bg-amber-50 text-amber-700', disabled: 'bg-gray-100 text-gray-500' };
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${m[st]}`}>{st.charAt(0).toUpperCase() + st.slice(1)}</span>;
}

function ScoreCircle({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={3} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="central" className="transform rotate-90 origin-center" style={{ fontSize: size * 0.28, fontWeight: 700, fill: '#1f2937' }}>
        {score}
      </text>
    </svg>
  );
}

// ── Overview Tab ────────────────────────────────────────────────
function OverviewTab() {
  const totalLocations = enterpriseTenants.reduce((s, t) => s + t.stats.totalLocations, 0);
  const totalUsers = enterpriseTenants.reduce((s, t) => s + t.stats.activeUsers, 0);
  const avgScore = +(enterpriseTenants.reduce((s, t) => s + t.stats.avgComplianceScore, 0) / enterpriseTenants.length).toFixed(1);
  const totalARR = enterpriseTenants.reduce((s, t) => s + t.contract.annualValue, 0);
  const ssoEnabled = enterpriseTenants.filter(t => t.ssoConfig.enabled).length;

  const stats = [
    { label: 'Active Tenants', value: enterpriseTenants.length, icon: Building2 },
    { label: 'Total Locations', value: totalLocations.toLocaleString(), icon: MapPin },
    { label: 'Active Users', value: totalUsers.toLocaleString(), icon: Users },
    { label: 'Avg Compliance', value: avgScore + '%', icon: ShieldCheck },
    { label: 'Annual Revenue', value: formatCurrency(totalARR), icon: TrendingUp },
    { label: 'SSO Active', value: `${ssoEnabled}/${enterpriseTenants.length}`, icon: KeyRound },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
                <s.icon className="h-4 w-4" style={{ color: '#1e4d6b' }} />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tenant Status + Recent Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Status Cards */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Tenant Status</h3>
          <div className="space-y-3">
            {enterpriseTenants.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: t.branding.primaryColor }}>
                  {t.logoPlaceholder}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.displayName}</p>
                    {statusBadge(t.status)}
                  </div>
                  <p className="text-xs text-gray-500">{t.stats.totalLocations.toLocaleString()} locations · {t.stats.activeUsers.toLocaleString()} users · {t.stats.avgComplianceScore}% avg</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: '#1e4d6b' }}>{formatCurrency(t.contract.annualValue)}</p>
                  <p className="text-[10px] text-gray-400">ARR</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Log */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Audit Log</h3>
          <div className="space-y-2">
            {enterpriseAuditLog.slice(0, 5).map(e => (
              <div key={e.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: e.action.includes('provision') || e.action.includes('created') ? '#22c55e' : e.action.includes('deactivated') ? '#ef4444' : '#1e4d6b' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900">{e.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                  <p className="text-[11px] text-gray-500 truncate">{e.userName} — {e.details}</p>
                  <p className="text-[10px] text-gray-400">{e.tenantName} · {formatTime(e.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Provision Tenant', icon: Building2 },
            { label: 'Run SCIM Sync', icon: RefreshCw },
            { label: 'Generate Reports', icon: FileText },
            { label: 'View All Logs', icon: Clock },
          ].map(a => (
            <button key={a.label} onClick={() => alert(`${a.label} — coming soon`)} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer text-left">
              <a.icon className="h-4 w-4" style={{ color: '#1e4d6b' }} />
              <span className="text-xs font-medium text-gray-700">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tenant Management Tab ──────────────────────────────────────
function TenantManagementTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">All Tenants ({enterpriseTenants.length})</h3>
        <button onClick={() => alert('Provision New Tenant — coming soon')} className="px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>
          + New Tenant
        </button>
      </div>

      {enterpriseTenants.map(t => (
        <div key={t.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setExpanded(expanded === t.id ? null : t.id)}
            className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: t.branding.primaryColor }}>
              {t.logoPlaceholder}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-900">{t.displayName}</span>
                {statusBadge(t.status)}
                {statusBadge(t.contract.tier)}
                {t.ssoConfig.enabled && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                    <Lock className="h-2.5 w-2.5" /> SSO
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{t.domain} · {t.stats.totalLocations.toLocaleString()} locations · CSM: {t.contract.dedicatedCSM}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold" style={{ color: '#1e4d6b' }}>{formatCurrency(t.contract.annualValue)}/yr</p>
              <p className="text-[10px] text-gray-400">{formatDate(t.contract.startDate)} — {formatDate(t.contract.endDate)}</p>
            </div>
            {expanded === t.id ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
          </button>

          {/* Expanded Details */}
          {expanded === t.id && (
            <div className="border-t border-gray-100 px-5 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {/* Branding */}
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Branding</p>
                  <div className="flex items-center gap-2 mb-2">
                    {[t.branding.primaryColor, t.branding.secondaryColor, t.branding.accentColor].map((c, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded border border-gray-300" style={{ backgroundColor: c }} />
                        <span className="text-[10px] text-gray-500">{c}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500">Sidebar: {t.branding.sidebarBg} · Powered by: {t.showPoweredBy ? 'Shown' : 'Hidden'}</p>
                </div>

                {/* SSO */}
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700 mb-2">SSO Config</p>
                  {t.ssoConfig.providerType !== 'none' ? (
                    <>
                      <p className="text-xs text-gray-600">{t.ssoConfig.providerType.toUpperCase()} via {t.ssoConfig.providerName}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-gray-500">Test:</span>
                        {statusBadge(t.ssoConfig.testStatus)}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">SCIM: {t.scimEnabled ? 'Enabled' : 'Disabled'}</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Not configured</p>
                  )}
                </div>

                {/* Features */}
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Features</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(t.features).map(([k, v]) => (
                      <span key={k} className={`px-1.5 py-0.5 text-[10px] rounded-full ${v ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {k.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hierarchy Config */}
              <div className="mt-3 p-3 rounded-lg bg-gray-50">
                <p className="text-xs font-semibold text-gray-700 mb-2">Hierarchy Levels</p>
                <div className="flex items-center gap-1">
                  {t.hierarchy.map((h, i) => (
                    <span key={h.key} className="flex items-center gap-1">
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full" style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>
                        {h.label}
                      </span>
                      {i < t.hierarchy.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4">
                {['Edit Config', 'View Users', 'Test SSO', 'Export Data'].map(label => (
                  <button key={label} onClick={() => alert(`${label} for ${t.displayName} — coming soon`)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Hierarchy & Rollups Tab ──────────────────────────────────────
function HierarchyNode({ node, depth = 0, selectedId, onSelect }: { node: EnterpriseHierarchyNode; depth?: number; selectedId: string | null; onSelect: (n: EnterpriseHierarchyNode) => void }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const levelColors: Record<string, string> = {
    corporate: '#6b21a8', division: '#1e4d6b', region: '#0e7490', district: '#d4af37', location: '#22c55e',
  };

  return (
    <div>
      <button
        onClick={() => { onSelect(node); if (hasChildren) setOpen(!open); }}
        className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}
        style={{ marginLeft: depth * 20 }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <div className="w-3.5 flex-shrink-0" />
        )}
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: levelColors[node.level] || '#6b7280' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-900 truncate">{node.name}</span>
            <span className="text-[10px] text-gray-400">{node.code}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[10px] text-gray-500">{node.locationCount} loc</span>
          <ScoreCircle score={node.complianceScore} size={32} />
        </div>
      </button>
      {open && hasChildren && (
        <div>
          {node.children!.map(child => (
            <HierarchyNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function HierarchyTab() {
  const [selectedTenant] = useState('ent-aramark');
  const [selectedNode, setSelectedNode] = useState<EnterpriseHierarchyNode | null>(null);
  const tenant = enterpriseTenants.find(t => t.id === selectedTenant)!;

  return (
    <div className="space-y-4">
      {/* Tenant selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-600">Tenant:</span>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200">
          <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: tenant.branding.primaryColor }}>
            {tenant.logoPlaceholder}
          </div>
          <span className="text-xs font-medium text-gray-900">{tenant.displayName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Tree View */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Organization Hierarchy</h3>
          <div className="space-y-0.5">
            <HierarchyNode node={enterpriseHierarchy} selectedId={selectedNode?.id || null} onSelect={setSelectedNode} />
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          {selectedNode ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <ScoreCircle score={selectedNode.complianceScore} size={56} />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{selectedNode.name}</h3>
                  <p className="text-[10px] text-gray-400">{selectedNode.code} · {selectedNode.level.charAt(0).toUpperCase() + selectedNode.level.slice(1)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedNode.locationCount} location{selectedNode.locationCount !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-700">Score Breakdown</h4>
                {[
                  { label: 'Operational', value: selectedNode.operational },
                  { label: 'Equipment', value: selectedNode.equipment },
                  { label: 'Documentation', value: selectedNode.documentation },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{item.label}</span>
                      <span className="text-xs font-bold" style={{ color: scoreColor(item.value) }}>{item.value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${item.value}%`, backgroundColor: scoreColor(item.value) }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Children summary */}
              {selectedNode.children && selectedNode.children.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Sub-units ({selectedNode.children.length})</h4>
                  <div className="space-y-1.5">
                    {selectedNode.children.map(c => (
                      <button key={c.id} onClick={() => setSelectedNode(c)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-left">
                        <span className="text-xs text-gray-700">{c.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">{c.locationCount} loc</span>
                          <span className="text-xs font-bold" style={{ color: scoreColor(c.complianceScore) }}>{c.complianceScore}%</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Network className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Select a node to view details</p>
              <p className="text-xs text-gray-400 mt-1">Click any item in the hierarchy tree</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SSO Configuration Tab ──────────────────────────────────────
function SSOTab() {
  const [selectedTenant, setSelectedTenant] = useState('ent-aramark');
  const tenant = enterpriseTenants.find(t => t.id === selectedTenant)!;
  const [ssoType, setSsoType] = useState<'saml' | 'oidc'>(tenant.ssoConfig.providerType === 'oidc' ? 'oidc' : 'saml');

  return (
    <div className="space-y-4">
      {/* Tenant Selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-600">Tenant:</span>
        <div className="flex items-center gap-2">
          {enterpriseTenants.map(t => (
            <button
              key={t.id}
              onClick={() => { setSelectedTenant(t.id); setSsoType(t.ssoConfig.providerType === 'oidc' ? 'oidc' : 'saml'); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${selectedTenant === t.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: t.branding.primaryColor }}>
                {t.logoPlaceholder}
              </div>
              {t.displayName.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SAML / OIDC Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setSsoType('saml')} className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${ssoType === 'saml' ? 'text-white' : 'text-gray-600 bg-gray-100'}`} style={ssoType === 'saml' ? { backgroundColor: '#1e4d6b' } : {}}>
              SAML 2.0
            </button>
            <button onClick={() => setSsoType('oidc')} className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${ssoType === 'oidc' ? 'text-white' : 'text-gray-600 bg-gray-100'}`} style={ssoType === 'oidc' ? { backgroundColor: '#1e4d6b' } : {}}>
              OIDC
            </button>
          </div>

          {ssoType === 'saml' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Metadata URL</label>
                <input type="text" readOnly value={tenant.ssoConfig.metadataUrl || ''} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Entity ID</label>
                <input type="text" readOnly value={tenant.ssoConfig.entityId} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">ACS URL (Assertion Consumer Service)</label>
                <input type="text" readOnly value={tenant.ssoConfig.acsUrl} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">X.509 Certificate</label>
                <textarea readOnly rows={3} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 font-mono" value={tenant.ssoConfig.enabled ? '-----BEGIN CERTIFICATE-----\nMIIDpzCCAo+gAwIBAgIGAXxxxxxxxxxxxxxx...\n-----END CERTIFICATE-----' : ''} />
              </div>

              {/* Attribute Mapping */}
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Attribute Mapping</label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-1.5 text-gray-600 font-medium">EvidLY Field</th>
                        <th className="text-left px-3 py-1.5 text-gray-600 font-medium">IdP Attribute</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(tenant.ssoConfig.attributeMapping).map(([k, v]) => (
                        <tr key={k} className="border-t border-gray-100">
                          <td className="px-3 py-1.5 text-gray-700">{k}</td>
                          <td className="px-3 py-1.5 text-gray-500 font-mono">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Discovery URL</label>
                <input type="text" readOnly value={tenant.ssoConfig.metadataUrl || ''} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Client ID</label>
                <input type="text" readOnly value={tenant.ssoConfig.entityId} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Redirect URI</label>
                <input type="text" readOnly value={tenant.ssoConfig.acsUrl} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Client Secret</label>
                <input type="password" readOnly value="●●●●●●●●●●●●●●●●" className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <button onClick={() => alert('SSO test initiated — connection passed!')} className="px-4 py-2 rounded-lg text-white text-xs font-medium cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>
              Test Connection
            </button>
            <button onClick={() => alert('SSO configuration saved')} className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">
              Save Config
            </button>
          </div>
        </div>

        {/* SCIM Provisioning */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">SSO Status</h3>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              {tenant.ssoConfig.enabled ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="text-xs font-medium text-gray-900">
                  {tenant.ssoConfig.enabled ? `${tenant.ssoConfig.providerType.toUpperCase()} via ${tenant.ssoConfig.providerName}` : 'Not configured'}
                </p>
                <p className="text-[10px] text-gray-500">
                  {tenant.ssoConfig.lastTestAt ? `Last tested: ${formatTime(tenant.ssoConfig.lastTestAt)}` : 'No test run yet'}
                </p>
              </div>
              <div className="ml-auto">{statusBadge(tenant.ssoConfig.testStatus)}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">SCIM 2.0 Provisioning</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">SCIM Endpoint</label>
                <div className="flex items-center gap-2">
                  <input type="text" readOnly value={tenant.scimEndpoint} className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 font-mono" />
                  <button onClick={() => { navigator.clipboard.writeText(tenant.scimEndpoint); alert('Copied!'); }} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <Copy className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Bearer Token</label>
                <div className="flex items-center gap-2">
                  <input type="password" readOnly value="●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●" className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 font-mono" />
                  <button onClick={() => alert('Token regenerated — copy the new token before closing')} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: tenant.scimEnabled ? '#f0fdf4' : '#fef3c7' }}>
                {tenant.scimEnabled ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                <span className="text-xs font-medium" style={{ color: tenant.scimEnabled ? '#166534' : '#92400e' }}>
                  {tenant.scimEnabled ? 'SCIM provisioning active — syncing user lifecycle events' : 'SCIM not enabled — manual user management required'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── User Directory Tab ─────────────────────────────────────────
function UserDirectoryTab() {
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let users = enterpriseUsers;
    if (tenantFilter !== 'all') users = users.filter(u => u.tenantId === tenantFilter);
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
    }
    return users;
  }, [tenantFilter, search]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={tenantFilter}
            onChange={e => setTenantFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white cursor-pointer"
          >
            <option value="all">All Tenants</option>
            {enterpriseTenants.map(t => (
              <option key={t.id} value={t.id}>{t.displayName.split(' ')[0]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => alert('Provision user — coming soon')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>
            <UserPlus className="h-3.5 w-3.5" /> Provision
          </button>
          <button onClick={() => alert('Export user list — coming soon')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => alert('SCIM sync triggered')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5" /> Sync
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Tenant</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Location</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-600">SSO</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-600">SCIM</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{
                      backgroundColor: enterpriseTenants.find(t => t.id === u.tenantId)?.branding.primaryColor + '15',
                      color: enterpriseTenants.find(t => t.id === u.tenantId)?.branding.primaryColor,
                    }}>
                      {u.tenantName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{u.role}</td>
                  <td className="px-4 py-2.5 text-gray-500">{u.location}</td>
                  <td className="px-4 py-2.5 text-center">{ssoStatusBadge(u.ssoStatus)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {u.scimManaged ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-700">
                        <RefreshCw className="h-2.5 w-2.5" /> SCIM
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">Manual</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{u.lastLogin ? formatTime(u.lastLogin) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-[10px] text-gray-500">{filtered.length} of {enterpriseUsers.length} users</p>
          <button onClick={() => alert('Bulk actions — coming soon')} className="text-[10px] font-medium cursor-pointer" style={{ color: '#1e4d6b' }}>Bulk Actions</button>
        </div>
      </div>
    </div>
  );
}

// ── Branding & Theming Tab ─────────────────────────────────────
function BrandingTab() {
  const [selectedTenant, setSelectedTenant] = useState('ent-aramark');
  const tenant = enterpriseTenants.find(t => t.id === selectedTenant)!;
  const [colors, setColors] = useState({ ...tenant.branding });
  const [showPowered, setShowPowered] = useState(tenant.showPoweredBy);
  const [platformName, setPlatformName] = useState(tenant.branding.logoText);

  const handleTenantChange = (id: string) => {
    const t = enterpriseTenants.find(x => x.id === id)!;
    setSelectedTenant(id);
    setColors({ ...t.branding });
    setShowPowered(t.showPoweredBy);
    setPlatformName(t.branding.logoText);
  };

  return (
    <div className="space-y-4">
      {/* Tenant Selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-600">Tenant:</span>
        <div className="flex items-center gap-2">
          {enterpriseTenants.map(t => (
            <button
              key={t.id}
              onClick={() => handleTenantChange(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${selectedTenant === t.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: t.branding.primaryColor }}>
                {t.logoPlaceholder}
              </div>
              {t.displayName.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Color Inputs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Brand Colors</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'primaryColor' as const, label: 'Primary' },
              { key: 'secondaryColor' as const, label: 'Secondary' },
              { key: 'accentColor' as const, label: 'Accent' },
              { key: 'sidebarBg' as const, label: 'Sidebar BG' },
              { key: 'sidebarText' as const, label: 'Sidebar Text' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">{f.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[f.key]}
                    onChange={e => setColors({ ...colors, [f.key]: e.target.value })}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={colors[f.key]}
                    onChange={e => setColors({ ...colors, [f.key]: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg font-mono"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Platform Name</label>
              <input type="text" value={platformName} onChange={e => setPlatformName(e.target.value)} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Custom Domain</label>
              <input type="text" readOnly value={tenant.domain} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={showPowered} onChange={e => setShowPowered(e.target.checked)} className="rounded border-gray-300 cursor-pointer" id="powered-by" />
              <label htmlFor="powered-by" className="text-xs text-gray-600 cursor-pointer">Show "Powered by EvidLY" badge</label>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Logo Upload</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                <p className="text-[11px] text-gray-500">Drag logo here or click to upload</p>
                <p className="text-[10px] text-gray-400">SVG, PNG, or JPG — max 2MB</p>
              </div>
            </div>
          </div>

          <button onClick={() => alert('Branding saved!')} className="mt-4 px-4 py-2 rounded-lg text-white text-xs font-medium cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>
            Save Branding
          </button>
        </div>

        {/* Live Preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Live Preview</h3>

          {/* Mini Sidebar + Content Preview */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex" style={{ height: 320 }}>
              {/* Mini Sidebar */}
              <div className="w-40 flex-shrink-0 p-3" style={{ backgroundColor: colors.sidebarBg }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.primaryColor }}>
                    <Shield className="h-4 w-4" style={{ color: colors.sidebarText }} />
                  </div>
                  <span className="text-[10px] font-bold truncate" style={{ color: colors.sidebarText }}>{platformName}</span>
                </div>
                <div className="space-y-1">
                  {['Dashboard', 'Temp Logs', 'Checklists', 'Vendors', 'Reports'].map((item, i) => (
                    <div key={item} className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={i === 0 ? { backgroundColor: colors.primaryColor + '40' } : {}}>
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.sidebarText + '40' }} />
                      <span className="text-[10px]" style={{ color: i === 0 ? colors.sidebarText : colors.sidebarText + '99' }}>{item}</span>
                    </div>
                  ))}
                </div>
                {showPowered && (
                  <p className="text-[8px] mt-auto pt-6" style={{ color: colors.sidebarText + '66' }}>Powered by EvidLY</p>
                )}
              </div>

              {/* Mini Content */}
              <div className="flex-1 p-4 bg-gray-50">
                <div className="h-3 w-24 rounded mb-3" style={{ backgroundColor: colors.primaryColor }} />
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-2">
                      <div className="h-2 w-10 rounded mb-1" style={{ backgroundColor: colors.accentColor }} />
                      <div className="h-2 w-14 rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-2">
                  <div className="h-2 w-20 rounded mb-2" style={{ backgroundColor: colors.secondaryColor }} />
                  <div className="space-y-1">
                    {[1, 2, 3].map(i => <div key={i} className="h-1.5 rounded bg-gray-100" style={{ width: `${90 - i * 15}%` }} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mini Login Preview */}
          <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden p-6 text-center" style={{ backgroundColor: colors.sidebarBg }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: colors.primaryColor }}>
              <Shield className="h-6 w-6" style={{ color: colors.sidebarText }} />
            </div>
            <p className="text-sm font-bold mb-3" style={{ color: colors.sidebarText }}>{platformName}</p>
            <div className="max-w-xs mx-auto space-y-2">
              <div className="h-8 rounded-lg bg-white/10 border" style={{ borderColor: colors.sidebarText + '33' }} />
              <div className="h-8 rounded-lg bg-white/10 border" style={{ borderColor: colors.sidebarText + '33' }} />
              <div className="h-8 rounded-lg" style={{ backgroundColor: colors.primaryColor }}>
                <span className="text-xs font-medium leading-8" style={{ color: colors.sidebarText }}>Sign In</span>
              </div>
            </div>
            {showPowered && (
              <p className="text-[9px] mt-4" style={{ color: colors.sidebarText + '55' }}>Powered by EvidLY</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reports & Templates Tab ────────────────────────────────────
function ReportsTab() {
  const [selectedTemplate, setSelectedTemplate] = useState<EnterpriseReportTemplate | null>(null);

  const typeColors: Record<string, string> = {
    executive_summary: 'bg-purple-50 text-purple-700 border-purple-200',
    regional_rollup: 'bg-blue-50 text-blue-700 border-blue-200',
    location_detail: 'bg-green-50 text-green-700 border-green-200',
    audit_package: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Report Templates ({enterpriseReportTemplates.length})</h3>
        <button onClick={() => alert('Create template — coming soon')} className="px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>
          + New Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Template List */}
        <div className="lg:col-span-3 space-y-3">
          {enterpriseReportTemplates.map(t => {
            const tenantObj = enterpriseTenants.find(x => x.id === t.tenantId);
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t)}
                className={`w-full text-left bg-white rounded-xl border p-4 transition-colors cursor-pointer ${selectedTemplate?.id === t.id ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tenantObj?.branding.primaryColor + '15' }}>
                    <FileText className="h-5 w-5" style={{ color: tenantObj?.branding.primaryColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{t.name}</span>
                      {t.isDefault && <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500">Default</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${typeColors[t.templateType] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {t.templateType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      <span className="text-[10px] text-gray-400">{t.tenantName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {t.exportFormats.map(fmt => (
                      <span key={fmt} className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 text-gray-500 font-medium">{fmt}</span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          {selectedTemplate ? (
            <>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{selectedTemplate.name}</h3>
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${typeColors[selectedTemplate.templateType] || ''}`}>
                  {selectedTemplate.templateType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span className="text-[10px] text-gray-400">{selectedTemplate.tenantName}</span>
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Report Sections</h4>
                <div className="space-y-1.5">
                  {selectedTemplate.sections.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                      <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-gray-400 bg-white border border-gray-200">{i + 1}</span>
                      <span className="text-xs text-gray-700">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Options</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Brand watermark: {selectedTemplate.brandWatermark ? 'Enabled' : 'Disabled'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Download className="h-3.5 w-3.5 text-gray-400" />
                    Formats: {selectedTemplate.exportFormats.join(', ')}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    {selectedTemplate.isDefault ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-gray-300" />}
                    Default template: {selectedTemplate.isDefault ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => alert(`Generating ${selectedTemplate.name}...`)} className="px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>
                  Generate Report
                </button>
                <button onClick={() => alert('Edit template — coming soon')} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">
                  Edit
                </button>
                <button onClick={() => alert('Template duplicated')} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">
                  Duplicate
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Select a template to preview</p>
              <p className="text-xs text-gray-400 mt-1">Click any template card on the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export function EnterpriseDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="min-h-screen bg-[#faf8f3]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1e4d6b' }}>
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-gray-900">Evid</span>
                <span className="text-lg font-bold" style={{ color: '#d4af37' }}>LY</span>
                <span className="text-xs font-medium text-gray-400 ml-1">Enterprise Admin</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Exit Admin
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-1 overflow-x-auto -mb-px">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={activeTab === tab.id ? { borderBottomColor: '#1e4d6b' } : {}}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'tenants' && <TenantManagementTab />}
        {activeTab === 'hierarchy' && <HierarchyTab />}
        {activeTab === 'sso' && <SSOTab />}
        {activeTab === 'users' && <UserDirectoryTab />}
        {activeTab === 'branding' && <BrandingTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>
    </div>
  );
}

export default EnterpriseDashboard;
