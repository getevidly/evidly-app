import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { toast } from 'sonner';
import {
  Plus, Play, Trash2, Copy, ExternalLink, CheckCircle2,
  Clock, RefreshCw, Handshake, Building2, ShieldCheck,
  Truck, Users, Landmark,
} from 'lucide-react';

// ── Production guard ────────────────────────────────────────────
const IS_PRODUCTION = import.meta.env.VITE_APP_ENV === 'production';

// ── Partner types ───────────────────────────────────────────────
const PARTNER_TYPES = [
  {
    id: 'vendor',
    label: 'Hood Cleaning / Fire Safety Vendor',
    icon: Truck,
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    description: '5 client locations, 12-month service history, PSE impact, Vendor Connect slots',
  },
  {
    id: 'association',
    label: 'Trade Association',
    icon: Users,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    description: '10 member orgs across 5 counties, K2C tracking, aggregate compliance',
  },
  {
    id: 'integration',
    label: 'Integration / Technology',
    icon: Building2,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    description: '4 joint customers, mock integration data (Toast/DineHR/NextIns/Cintas)',
  },
  {
    id: 'carrier',
    label: 'Insurance Carrier',
    icon: ShieldCheck,
    color: 'text-green-700',
    bg: 'bg-green-50',
    description: '10 locations, CIC 5-pillar risk, PSE verification, risk feed sample',
  },
  {
    id: 'tribal_casino',
    label: 'Tribal Casino',
    icon: Landmark,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    description: '1 tribal casino org, 5 food outlets, TEHO advisory, NIGC overlay, 11 PSE vendors',
  },
];

const INTEGRATION_TYPES = [
  { value: 'toast', label: 'Toast (POS)' },
  { value: 'dinehr', label: 'DineHR (HR/Scheduling)' },
  { value: 'next_insurance', label: 'Next Insurance' },
  { value: 'cintas', label: 'Cintas (Uniform/Facility)' },
];

const TRIBAL_OPTIONS = [
  { name: 'Table Mountain Rancheria', casino: 'Eagle Mountain Casino', county: 'Fresno' },
  { name: 'Tachi-Yokut Tribe', casino: 'Tachi Palace Hotel & Casino', county: 'Kings' },
  { name: 'Santa Ynez Band of Chumash', casino: 'Chumash Casino Resort', county: 'Santa Barbara' },
  { name: 'Morongo Band of Mission Indians', casino: 'Morongo Casino Resort & Spa', county: 'Riverside' },
  { name: 'Agua Caliente Band of Cahuilla Indians', casino: 'Agua Caliente Casinos', county: 'Riverside' },
  { name: 'Pechanga Band of Indians', casino: 'Pechanga Resort Casino', county: 'Riverside' },
  { name: 'San Manuel Band of Mission Indians', casino: 'Yaamava\' Resort & Casino', county: 'San Bernardino' },
];

// ── Credentials card ────────────────────────────────────────────
function CredentialsCard({ demo }) {
  const copyCredentials = () => {
    const text = [
      `URL: ${demo.demo_url}`,
      `Email: ${demo.demo_email}`,
      `Password: ${demo.demo_password}`,
      `Partner: ${demo.partner_company}`,
      `Type: ${demo.partner_type}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied to clipboard');
  };

  return (
    <div className="bg-[#1E2D4D] text-white rounded-xl p-6">
      <p className="text-[#A08C5A] text-xs uppercase tracking-wider mb-4">
        Demo Account Credentials
      </p>
      <div className="space-y-3 text-sm">
        {[
          ['URL', demo.demo_url, true],
          ['Email', demo.demo_email],
          ['Password', demo.demo_password],
          ['Partner', demo.partner_company],
          ['Type', demo.partner_type],
        ].map(([label, value, isLink]) => (
          <div key={label} className="flex justify-between">
            <span className="text-gray-400">{label}:</span>
            {isLink ? (
              <a href={value} target="_blank" rel="noopener noreferrer"
                className="text-[#A08C5A] underline">{value}</a>
            ) : (
              <span className="text-white font-mono">{value}</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex gap-3">
        <button onClick={copyCredentials}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
          <Copy size={14} /> Copy Credentials
        </button>
        <a href={demo.demo_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#A08C5A] hover:bg-[#8a7a50] rounded-lg text-sm text-white transition-colors">
          <ExternalLink size={14} /> Open Demo
        </a>
      </div>
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────
function StatusBadge({ status }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-700',
    expired: 'bg-red-100 text-red-700',
    cleaned: 'bg-[#FAF7F0] text-gray-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

export default function PartnerDemos() {
  useDemoGuard();

  if (IS_PRODUCTION) return <Navigate to="/admin" replace />;

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('create');

  // ── State: demos ──────────────────────────────────────────────
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── State: create form ────────────────────────────────────────
  const [creating, setCreating] = useState(false);
  const [createdDemo, setCreatedDemo] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    // Vendor
    service_types: '',
    // Association
    member_count: 10,
    states: 'California',
    // Integration
    integration_type: 'toast',
    // Carrier
    coverage_area: 'Central California',
    // Tribal Casino
    tribe_index: 0,
    outlet_count: 5,
  });

  // ── Fetch data ────────────────────────────────────────────────
  const fetchDemos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('partner_demos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setDemos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDemos();
  }, [fetchDemos]);

  // ── Handlers ──────────────────────────────────────────────────
  const updateForm = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleCreateDemo = async () => {
    if (!selectedType || !form.company_name) {
      toast.error('Select a partner type and enter a company name');
      return;
    }
    setCreating(true);
    try {
      // 1. Create staging org
      const orgName = selectedType === 'tribal_casino'
        ? TRIBAL_OPTIONS[form.tribe_index]?.casino || form.company_name
        : form.company_name;

      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          industry_type: selectedType === 'tribal_casino' ? 'tribal_casino' : 'restaurant',
          is_demo: true,
          demo_started_at: new Date().toISOString(),
          demo_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        })
        .select('id')
        .single();
      if (orgErr) throw orgErr;

      // 2. Create demo user via edge function
      const demoEmail = `partner-${Date.now()}@evidly-tour.com`;
      const { data: authResult } = await supabase.functions.invoke(
        'demo-account-create',
        {
          body: {
            prospect_name: form.contact_name || form.company_name,
            prospect_email: demoEmail,
            company_name: orgName,
            company_type: selectedType === 'tribal_casino' ? 'tribal_casino' : 'restaurant',
            address: 'Partner Demo',
            city: 'Fresno',
            state: 'CA',
            zip_code: '00000',
            num_locations: 0,
          },
        },
      );

      const demoPassword = authResult?.credentials?.temp_password || 'check-logs';
      const demoUserId = authResult?.auth_user_id;

      // Link user to our org
      if (demoUserId) {
        await supabase
          .from('user_profiles')
          .update({ organization_id: org.id })
          .eq('user_id', demoUserId);
      }

      // 3. Build partner_config
      const partnerConfig = {};
      if (selectedType === 'vendor') {
        partnerConfig.service_types = form.service_types || 'hood_cleaning, fire_suppression';
      } else if (selectedType === 'association') {
        partnerConfig.member_count = form.member_count;
        partnerConfig.states = form.states;
      } else if (selectedType === 'integration') {
        partnerConfig.integration_type = form.integration_type;
      } else if (selectedType === 'carrier') {
        partnerConfig.coverage_area = form.coverage_area;
      } else if (selectedType === 'tribal_casino') {
        const tribe = TRIBAL_OPTIONS[form.tribe_index];
        partnerConfig.tribe_name = tribe.name;
        partnerConfig.casino_name = tribe.casino;
        partnerConfig.county = tribe.county;
        partnerConfig.outlet_count = form.outlet_count;
      }

      // 4. Create partner_demos record
      const cleanupTime = new Date(Date.now() + 7 * 86400000).toISOString();
      const { data: demo, error: demoErr } = await supabase
        .from('partner_demos')
        .insert({
          partner_type: selectedType,
          partner_company: form.company_name,
          contact_name: form.contact_name || null,
          contact_email: form.contact_email || null,
          partner_config: partnerConfig,
          demo_org_id: org.id,
          demo_user_id: demoUserId,
          demo_email: demoEmail,
          demo_password: demoPassword,
          status: 'pending',
          cleanup_scheduled_for: cleanupTime,
          created_by: user?.id,
        })
        .select()
        .single();
      if (demoErr) throw demoErr;

      // 5. Generate partner-specific demo data
      const { error: genErr } = await supabase.functions.invoke(
        'generate-partner-demo',
        {
          body: {
            demo_id: demo.id,
            org_id: org.id,
            partner_type: selectedType,
            partner_config: partnerConfig,
          },
        },
      );
      if (genErr) console.warn('Data generation warning:', genErr);

      setCreatedDemo(demo);
      toast.success(`Partner demo created for ${form.company_name}`);
      await fetchDemos();
    } catch (err) {
      console.error('Partner demo creation failed:', err);
      toast.error(`Failed: ${err.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleManualCleanup = async (demoId, orgId) => {
    toast.loading('Cleaning up partner demo data...');
    // Use cleanup-demo-tour with partner_demo mode
    const { data, error } = await supabase.functions.invoke('cleanup-demo-tour', {
      body: { partner_demo_id: demoId },
    });
    toast.dismiss();
    if (error) {
      toast.error('Cleanup failed');
    } else {
      toast.success(`Cleaned up: ${data?.cleaned?.join(', ') || 'done'}`);
    }
    fetchDemos();
  };

  const handleExtend = async (demoId) => {
    const newCleanup = new Date(Date.now() + 7 * 86400000).toISOString();
    await supabase
      .from('partner_demos')
      .update({ cleanup_scheduled_for: newCleanup })
      .eq('id', demoId);
    toast.success('Extended by 7 days');
    fetchDemos();
  };

  // ── Filter helpers ────────────────────────────────────────────
  const activeDemos = demos.filter(d => ['pending', 'active'].includes(d.status));
  const completedDemos = demos.filter(d => ['completed', 'expired', 'cleaned'].includes(d.status));

  const getTypeConfig = (typeId) => PARTNER_TYPES.find(t => t.id === typeId);

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  return (
    <div>
      <AdminBreadcrumb items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Partner Demos' },
      ]} />

      <h1 className="text-2xl font-bold text-[#1E2D4D] mb-1">Partner Demos</h1>
      <p className="text-sm text-gray-500 mb-6">
        Create and manage partner demo environments for vendor, association, carrier, and integration partners
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active', count: activeDemos.length, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Completed', count: completedDemos.filter(d => d.status === 'completed').length, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Cleaned', count: completedDemos.filter(d => d.status === 'cleaned').length, color: 'text-gray-500', bg: 'bg-[#FAF7F0]' },
          { label: 'Total', count: demos.length, color: 'text-[#A08C5A]', bg: 'bg-[#FAF7F0]' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { id: 'create', label: 'Create Partner Demo', icon: Plus },
          { id: 'active', label: 'Active Demos', icon: Play },
          { id: 'completed', label: 'Completed & Cleanup', icon: CheckCircle2 },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-[#1E2D4D] text-[#1E2D4D]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Create Partner Demo ────────────────────────────── */}
      {activeTab === 'create' && (
        <div className="max-w-2xl">
          {createdDemo ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-green-800 font-medium">
                  <CheckCircle2 size={16} className="inline mr-1" />
                  Partner demo created successfully!
                </p>
                <p className="text-green-700 text-sm mt-1">
                  Auto-cleanup in 7 days
                </p>
              </div>
              <CredentialsCard demo={createdDemo} />
              <button onClick={() => { setCreatedDemo(null); setSelectedType(null); }}
                className="text-sm text-[#1E2D4D] underline">
                Create another demo
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Step 1: Partner type selection */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-[#1E2D4D] uppercase tracking-wider mb-2">
                  1. Select Partner Type
                </legend>
                <div className="grid grid-cols-1 gap-3">
                  {PARTNER_TYPES.map(pt => {
                    const Icon = pt.icon;
                    const isSelected = selectedType === pt.id;
                    return (
                      <button key={pt.id}
                        onClick={() => setSelectedType(pt.id)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-[#1E2D4D] bg-[#FAF7F0]'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${pt.bg}`}>
                            <Icon size={20} className={pt.color} />
                          </div>
                          <div>
                            <p className="font-medium text-[#1E2D4D]">{pt.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{pt.description}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 size={20} className="ml-auto text-[#1E2D4D]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {selectedType && (
                <>
                  {/* Step 2: Partner info */}
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-[#1E2D4D] uppercase tracking-wider mb-2">
                      2. Partner Information
                    </legend>
                    <label className="block">
                      <span className="text-xs text-gray-500">Company Name *</span>
                      <input value={form.company_name}
                        onChange={e => updateForm('company_name', e.target.value)}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E2D4D]/20 focus:border-[#1E2D4D]"
                        placeholder={
                          selectedType === 'vendor' ? 'Cleaning Pros Plus' :
                          selectedType === 'association' ? 'California Restaurant Association' :
                          selectedType === 'integration' ? 'Toast, Inc.' :
                          selectedType === 'carrier' ? 'Next Insurance' :
                          'Table Mountain Rancheria'
                        } />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs text-gray-500">Contact Name</span>
                        <input value={form.contact_name}
                          onChange={e => updateForm('contact_name', e.target.value)}
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E2D4D]/20 focus:border-[#1E2D4D]"
                          placeholder="Jane Smith" />
                      </label>
                      <label className="block">
                        <span className="text-xs text-gray-500">Contact Email</span>
                        <input type="email" value={form.contact_email}
                          onChange={e => updateForm('contact_email', e.target.value)}
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E2D4D]/20 focus:border-[#1E2D4D]"
                          placeholder="jane@partner.com" />
                      </label>
                    </div>
                  </fieldset>

                  {/* Step 3: Type-specific fields */}
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-[#1E2D4D] uppercase tracking-wider mb-2">
                      3. Configuration
                    </legend>

                    {selectedType === 'vendor' && (
                      <label className="block">
                        <span className="text-xs text-gray-500">Service Types</span>
                        <input value={form.service_types}
                          onChange={e => updateForm('service_types', e.target.value)}
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E2D4D]/20 focus:border-[#1E2D4D]"
                          placeholder="hood_cleaning, fire_suppression" />
                      </label>
                    )}

                    {selectedType === 'association' && (
                      <>
                        <label className="block">
                          <span className="text-xs text-gray-500">Estimated Member Count</span>
                          <input type="number" value={form.member_count} min={5} max={50}
                            onChange={e => updateForm('member_count', parseInt(e.target.value) || 10)}
                            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E2D4D]/20 focus:border-[#1E2D4D]" />
                        </label>
                        <label className="block">
                          <span className="text-xs text-gray-500">State(s)</span>
                          <input value={form.states}
                            onChange={e => updateForm('states', e.target.value)}
                            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E2D4D]/20 focus:border-[#1E2D4D]"
                            placeholder="California" />
                        </label>
                      </>
                    )}

                    {selectedType === 'integration' && (
                      <label className="block">
                        <span className="text-xs text-gray-500">Integration Type</span>
                        <select value={form.integration_type}
                          onChange={e => updateForm('integration_type', e.target.value)}
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#1E2D4D]/20 focus:border-[#1E2D4D]">
                          {INTEGRATION_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </label>
                    )}

                    {selectedType === 'carrier' && (
                      <label className="block">
                        <span className="text-xs text-gray-500">Coverage Area</span>
                        <input value={form.coverage_area}
                          onChange={e => updateForm('coverage_area', e.target.value)}
                          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1E2D4D]/20 focus:border-[#1E2D4D]"
                          placeholder="Central California" />
                      </label>
                    )}

                    {selectedType === 'tribal_casino' && (
                      <>
                        <label className="block">
                          <span className="text-xs text-gray-500">Tribe</span>
                          <select value={form.tribe_index}
                            onChange={e => updateForm('tribe_index', parseInt(e.target.value))}
                            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#1E2D4D]/20 focus:border-[#1E2D4D]">
                            {TRIBAL_OPTIONS.map((t, i) => (
                              <option key={i} value={i}>{t.name} — {t.casino}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs text-gray-500">Food Outlet Count</span>
                          <div className="flex items-center gap-3 mt-1">
                            <button onClick={() => updateForm('outlet_count', Math.max(1, form.outlet_count - 1))}
                              className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50">-</button>
                            <span className="text-lg font-bold text-[#1E2D4D] w-8 text-center">{form.outlet_count}</span>
                            <button onClick={() => updateForm('outlet_count', Math.min(8, form.outlet_count + 1))}
                              className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50">+</button>
                          </div>
                        </label>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <p className="text-sm font-semibold text-amber-800 mb-1">
                            Tribal Food Safety — Advisory Mode
                          </p>
                          <p className="text-sm text-amber-700">
                            This demo will use advisory food safety mode (TEHO sovereignty).
                            Fire safety and operational compliance will be fully populated.
                          </p>
                        </div>
                      </>
                    )}
                  </fieldset>

                  {/* Submit */}
                  <button onClick={handleCreateDemo} disabled={creating}
                    className="w-full py-3 bg-[#1E2D4D] text-white rounded-xl text-sm font-semibold hover:bg-[#162340] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {creating ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin" /> Generating Partner Demo...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Play size={14} /> Create & Generate Demo
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Active Demos ────────────────────────────────────── */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {loading && <p className="text-gray-400 text-sm">Loading demos...</p>}
          {!loading && activeDemos.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Handshake size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No active partner demos</p>
              <p className="text-sm mt-1">Create a new partner demo to get started</p>
              <button onClick={() => setActiveTab('create')}
                className="mt-3 px-4 py-2 bg-[#1E2D4D] text-white rounded-lg text-sm hover:bg-[#162340] transition-colors">
                <Plus size={14} className="inline mr-1" /> Create Demo
              </button>
            </div>
          )}
          {activeDemos.map(demo => {
            const typeConfig = getTypeConfig(demo.partner_type);
            const TypeIcon = typeConfig?.icon || Handshake;
            return (
              <div key={demo.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${typeConfig?.bg || 'bg-[#FAF7F0]'}`}>
                      <TypeIcon size={20} className={typeConfig?.color || 'text-gray-700'} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1E2D4D]">{demo.partner_company}</h3>
                      <p className="text-sm text-gray-500">
                        {typeConfig?.label || demo.partner_type}
                        {demo.contact_name && ` · ${demo.contact_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={demo.status} />
                    <button onClick={() => handleExtend(demo.id)}
                      className="px-3 py-1.5 text-[#1E2D4D] border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors">
                      <Clock size={12} className="inline mr-1" /> Extend 7d
                    </button>
                    <button onClick={() => handleManualCleanup(demo.id, demo.demo_org_id)}
                      className="px-3 py-1.5 text-red-600 border border-red-200 rounded-lg text-xs hover:bg-red-50 transition-colors">
                      <Trash2 size={12} className="inline mr-1" /> Clean Up
                    </button>
                  </div>
                </div>
                <CredentialsCard demo={demo} />
                {demo.cleanup_scheduled_for && (
                  <p className="text-xs text-gray-400 mt-3">
                    <Clock size={12} className="inline mr-1" />
                    Auto-cleanup: {new Date(demo.cleanup_scheduled_for).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Completed & Cleanup ─────────────────────────────── */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {completedDemos.length === 0 && (
            <p className="text-center text-gray-400 py-8">No completed demos yet.</p>
          )}
          {completedDemos.map(demo => {
            const typeConfig = getTypeConfig(demo.partner_type);
            return (
              <div key={demo.id}
                className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-[#1E2D4D]">
                    {demo.partner_company}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {typeConfig?.label || demo.partner_type}
                    {demo.completed_at && ` · Completed ${new Date(demo.completed_at).toLocaleDateString()}`}
                  </p>
                  {demo.status === 'cleaned' && demo.cleaned_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Cleaned {new Date(demo.cleaned_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={demo.status} />
                  {['completed', 'expired'].includes(demo.status) && (
                    <button onClick={() => handleManualCleanup(demo.id, demo.demo_org_id)}
                      className="px-3 py-1.5 text-red-600 border border-red-200 rounded-lg text-xs hover:bg-red-50 transition-colors">
                      <Trash2 size={12} className="inline mr-1" /> Clean Up Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
