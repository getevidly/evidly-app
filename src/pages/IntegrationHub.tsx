// ── Integrations Hub — Selling Tool / Ecosystem Showcase ───
// Shows 25+ integrations in a card grid with category filtering,
// status badges, featured section, and request form.
// Platform Overview hero visible to owner_operator + admin roles.

import { useState, useMemo } from 'react';
import {
  Search, ExternalLink, Star, Zap, Clock, CheckCircle2,
  Send, ChevronDown, Layers, ArrowRight, Globe, Code2,
  BarChart3, Plug,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRole } from '../contexts/RoleContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { Breadcrumb } from '../components/Breadcrumb';

const NAVY = '#1e4d6b';
const GOLD = '#d4af37';
const MUTED_GOLD = '#A08C5A';

// ── Integration catalog (static — matches DB seed) ────────

interface Integration {
  name: string;
  slug: string;
  description: string;
  category: string;
  status: 'connected' | 'available' | 'beta' | 'coming_soon';
  isFeatured: boolean;
  logo?: string; // emoji placeholder
}

const CATEGORIES: { id: string; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '' },
  { id: 'pos', label: 'POS Systems', emoji: '💳' },
  { id: 'accounting', label: 'Accounting', emoji: '📒' },
  { id: 'hr_payroll', label: 'HR & Payroll', emoji: '👥' },
  { id: 'inventory', label: 'Inventory', emoji: '📦' },
  { id: 'food_safety_iot', label: 'Food Safety & IoT', emoji: '🌡️' },
  { id: 'insurance', label: 'Insurance & Risk', emoji: '🛡️' },
  { id: 'delivery', label: 'Delivery', emoji: '🚗' },
  { id: 'communication', label: 'Communication', emoji: '💬' },
  { id: 'analytics', label: 'Analytics & BI', emoji: '📊' },
  { id: 'government', label: 'Government', emoji: '🏛️' },
];

const LOGO_MAP: Record<string, string> = {
  'toast-pos': '🍞', 'square-pos': '⬛', 'clover-pos': '🍀', 'aloha-ncr': '🌺',
  'quickbooks': '📗', 'xero': '🔵', 'freshbooks': '📘',
  'gusto': '🟢', 'adp': '🔴', '7shifts': '📅',
  'bluecart': '🛒', 'marketman': '📊', 'sysco-shop': '🏪',
  'compliancemate': '🌡️', 'thermoworks': '🔥', 'cooper-atkins': '❄️',
  'society-insurance': '🛡️', 'hartford': '🦌',
  'doordash': '🔴', 'uber-eats': '🟢',
  'slack': '💬', 'ms-teams': '🟣',
  'looker': '👁️', 'tableau': '📈',
  'calrecycle': '♻️',
};

const INTEGRATIONS: Integration[] = [
  { name: 'Toast POS', slug: 'toast-pos', description: 'Real-time sales data, menu sync, and location management from Toast.', category: 'pos', status: 'available', isFeatured: true },
  { name: 'Square for Restaurants', slug: 'square-pos', description: 'Square POS integration for transaction data and menu management.', category: 'pos', status: 'available', isFeatured: true },
  { name: 'Clover', slug: 'clover-pos', description: 'Clover POS data sync for sales, inventory, and employee management.', category: 'pos', status: 'available', isFeatured: false },
  { name: 'Aloha (NCR)', slug: 'aloha-ncr', description: 'NCR Aloha integration for enterprise restaurant POS data.', category: 'pos', status: 'coming_soon', isFeatured: false },
  { name: 'QuickBooks Online', slug: 'quickbooks', description: 'Sync financial data, invoices, and expense tracking with QuickBooks.', category: 'accounting', status: 'available', isFeatured: true },
  { name: 'Xero', slug: 'xero', description: 'Accounting integration for invoices, bills, and financial reporting.', category: 'accounting', status: 'available', isFeatured: false },
  { name: 'FreshBooks', slug: 'freshbooks', description: 'Time tracking, invoicing, and expense management integration.', category: 'accounting', status: 'coming_soon', isFeatured: false },
  { name: 'Gusto', slug: 'gusto', description: 'Employee onboarding, payroll, and benefits data sync.', category: 'hr_payroll', status: 'available', isFeatured: false },
  { name: 'ADP Workforce Now', slug: 'adp', description: 'Enterprise HR, payroll, and time & attendance integration.', category: 'hr_payroll', status: 'coming_soon', isFeatured: false },
  { name: '7shifts', slug: '7shifts', description: 'Restaurant scheduling, labor compliance, and tip management.', category: 'hr_payroll', status: 'available', isFeatured: true },
  { name: 'BlueCart', slug: 'bluecart', description: 'Ordering, inventory tracking, and supplier management for food service.', category: 'inventory', status: 'available', isFeatured: false },
  { name: 'MarketMan', slug: 'marketman', description: 'Inventory management, purchasing, and recipe costing integration.', category: 'inventory', status: 'beta', isFeatured: false },
  { name: 'Sysco SHOP', slug: 'sysco-shop', description: 'Direct integration with Sysco ordering and delivery tracking.', category: 'inventory', status: 'coming_soon', isFeatured: false },
  { name: 'ComplianceMate', slug: 'compliancemate', description: 'Automated temperature monitoring and HACCP compliance sensors.', category: 'food_safety_iot', status: 'available', isFeatured: false },
  { name: 'Thermoworks', slug: 'thermoworks', description: 'Professional temperature monitoring probes and data logging.', category: 'food_safety_iot', status: 'beta', isFeatured: false },
  { name: 'Cooper-Atkins', slug: 'cooper-atkins', description: 'Enterprise IoT sensor network for cold chain monitoring.', category: 'food_safety_iot', status: 'available', isFeatured: false },
  { name: 'Society Insurance', slug: 'society-insurance', description: 'Automated risk data sharing for restaurant insurance underwriting.', category: 'insurance', status: 'available', isFeatured: true },
  { name: 'The Hartford', slug: 'hartford', description: 'Commercial insurance API for real-time compliance data exchange.', category: 'insurance', status: 'coming_soon', isFeatured: false },
  { name: 'DoorDash Drive', slug: 'doordash', description: 'Delivery logistics, order tracking, and kitchen display integration.', category: 'delivery', status: 'available', isFeatured: false },
  { name: 'Uber Eats', slug: 'uber-eats', description: 'Online ordering, delivery status, and menu management sync.', category: 'delivery', status: 'coming_soon', isFeatured: false },
  { name: 'Slack', slug: 'slack', description: 'Real-time compliance alerts, shift notifications, and team messaging.', category: 'communication', status: 'available', isFeatured: true },
  { name: 'Microsoft Teams', slug: 'ms-teams', description: 'Compliance notifications, task assignments, and team collaboration.', category: 'communication', status: 'available', isFeatured: false },
  { name: 'Looker (Google)', slug: 'looker', description: 'Advanced business intelligence dashboards and compliance analytics.', category: 'analytics', status: 'coming_soon', isFeatured: false },
  { name: 'Tableau', slug: 'tableau', description: 'Visual analytics and interactive compliance reporting dashboards.', category: 'analytics', status: 'coming_soon', isFeatured: false },
  { name: 'CalRecycle SB 1383', slug: 'calrecycle', description: 'Automated SB 1383 organic waste diversion reporting for California.', category: 'government', status: 'beta', isFeatured: false },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  connected: { label: 'Connected', bg: 'bg-green-50', text: 'text-green-700' },
  available: { label: 'Available', bg: 'bg-blue-50', text: 'text-blue-700' },
  beta: { label: 'Beta', bg: 'bg-purple-50', text: 'text-purple-700' },
  coming_soon: { label: 'Coming Soon', bg: 'bg-gray-100', text: 'text-gray-500' },
};

// ── Component ──────────────────────────────────────────────

export function IntegrationHub() {
  const { userRole } = useRole();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestDescription, setRequestDescription] = useState('');

  const isAdminView = ['owner_operator', 'executive', 'platform_admin'].includes(userRole);

  const featured = useMemo(() => INTEGRATIONS.filter(i => i.isFeatured), []);

  const filtered = useMemo(() => {
    let list = INTEGRATIONS;
    if (activeCategory !== 'all') list = list.filter(i => i.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, search]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: INTEGRATIONS.length };
    INTEGRATIONS.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return counts;
  }, []);

  const handleRequestSubmit = () => {
    if (!requestName.trim()) { toast.error('Integration name is required'); return; }
    guardAction('submit', 'Integration Request', () => {
      toast.success(`Request for "${requestName}" submitted — we'll review it shortly.`);
      setRequestName('');
      setRequestDescription('');
      setShowRequestForm(false);
    });
  };

  const handleConnect = (name: string) => {
    guardAction('connect', name, () => {
      toast.success(`${name} connection flow started (coming soon)`);
    });
  };

  // ── Ecosystem stats for investor/buyer hero ────────────
  const ecosystemStats = [
    { label: 'Total Integrations', value: INTEGRATIONS.length, icon: Plug },
    { label: 'Categories', value: CATEGORIES.length - 1, icon: Layers },
    { label: 'Connected Orgs', value: '1,240+', icon: Globe },
    { label: 'API Calls (30d)', value: '2.4M', icon: BarChart3 },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <Breadcrumb items={[{ label: 'Integrations' }]} />

      {/* ── Platform Overview Hero (Investor/Buyer View) ── */}
      {isAdminView && (
        <div
          className="rounded-xl p-6 mb-6"
          style={{
            background: 'linear-gradient(135deg, #0B1628 0%, #1e4d6b 50%, #0B1628 100%)',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">Platform Ecosystem</h2>
              <p className="text-sm text-gray-300 mt-1">
                EvidLY connects with the tools your kitchen already uses — POS, accounting, HR, IoT sensors, insurance carriers, and more.
              </p>
            </div>
            <a
              href="/developers"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-white/20 text-white hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              <Code2 className="h-4 w-4" />
              Developer Portal
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ecosystemStats.map(stat => (
              <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="h-4 w-4 text-[#d4af37]" />
                  <span className="text-xs text-gray-300">{stat.label}</span>
                </div>
                <div className="text-xl font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm text-gray-600 mt-1">Connect EvidLY with the tools you already use</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search integrations..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] w-56"
            />
          </div>
          <button
            onClick={() => setShowRequestForm(true)}
            className="flex items-center gap-2 px-4 py-2 min-h-[44px] text-white rounded-lg text-sm font-medium shadow-sm whitespace-nowrap"
            style={{ backgroundColor: NAVY }}
          >
            <Send className="h-4 w-4" />
            Request Integration
          </button>
        </div>
      </div>

      {/* ── Featured Integrations ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4" style={{ color: GOLD }} />
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Featured Integrations</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {featured.map(integration => {
            const s = STATUS_CONFIG[integration.status];
            return (
              <div
                key={integration.slug}
                className="bg-white rounded-xl border-2 border-gray-100 p-4 hover:border-[#d4af37] hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50 group-hover:bg-amber-50 transition-colors">
                    {LOGO_MAP[integration.slug] || '🔌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{integration.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{integration.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-gray-400 uppercase">
                    {CATEGORIES.find(c => c.id === integration.category)?.label}
                  </span>
                  {integration.status === 'available' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleConnect(integration.name); }}
                      className="text-xs font-semibold px-3 py-1 rounded-lg text-white transition-colors"
                      style={{ backgroundColor: NAVY }}
                    >
                      Connect
                    </button>
                  ) : integration.status === 'beta' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleConnect(integration.name); }}
                      className="text-xs font-semibold px-3 py-1 rounded-lg bg-purple-50 text-purple-700"
                    >
                      Join Beta
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Coming Soon
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={activeCategory === cat.id ? { backgroundColor: NAVY } : undefined}
          >
            {cat.emoji && <span>{cat.emoji}</span>}
            {cat.label}
            <span className="text-[10px] opacity-70">({categoryCounts[cat.id] || 0})</span>
          </button>
        ))}
      </div>

      {/* ── Integration Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {filtered.map(integration => {
          const s = STATUS_CONFIG[integration.status];
          return (
            <div
              key={integration.slug}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50">
                  {LOGO_MAP[integration.slug] || '🔌'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{integration.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
                    {integration.isFeatured && (
                      <Star className="h-3 w-3" style={{ color: GOLD }} fill={GOLD} />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{integration.description}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-[10px] font-medium text-gray-400 uppercase">
                  {CATEGORIES.find(c => c.id === integration.category)?.label}
                </span>
                {integration.status === 'available' ? (
                  <button
                    onClick={() => handleConnect(integration.name)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors flex items-center gap-1"
                    style={{ backgroundColor: NAVY }}
                  >
                    Connect <ArrowRight className="h-3 w-3" />
                  </button>
                ) : integration.status === 'beta' ? (
                  <button
                    onClick={() => handleConnect(integration.name)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 flex items-center gap-1"
                  >
                    <Zap className="h-3 w-3" /> Join Beta
                  </button>
                ) : integration.status === 'connected' ? (
                  <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Coming Soon
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No integrations found</p>
          <p className="text-sm text-gray-400 mt-1">Try a different search or category filter</p>
        </div>
      )}

      {/* ── CTA Section ── */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Don't see what you need?</h3>
        <p className="text-sm text-gray-600 mb-4">
          We're building new integrations every month. Let us know what tools you use and we'll prioritize accordingly.
        </p>
        <button
          onClick={() => setShowRequestForm(true)}
          className="px-6 py-2.5 min-h-[44px] text-white rounded-lg text-sm font-bold shadow-sm"
          style={{ backgroundColor: NAVY }}
        >
          Request an Integration
        </button>
      </div>

      {/* ── Request Integration Modal ── */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-[95vw] sm:w-auto max-w-md sm:w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Request an Integration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Integration Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={requestName}
                  onChange={e => setRequestName(e.target.value)}
                  placeholder="e.g., Restaurant365, Lightspeed POS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Why do you need it?</label>
                <textarea
                  value={requestDescription}
                  onChange={e => setRequestDescription(e.target.value)}
                  placeholder="Tell us how this integration would help your operation..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRequestForm(false)}
                className="flex-1 px-4 py-2.5 min-h-[44px] border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestSubmit}
                disabled={!requestName.trim()}
                className="flex-1 px-4 py-2.5 min-h-[44px] text-white rounded-lg text-sm font-bold disabled:opacity-40"
                style={{ backgroundColor: NAVY }}
              >
                Submit Request
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
