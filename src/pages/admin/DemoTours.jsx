import { useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { toast } from 'sonner';
import {
  Plus, Play, Trash2, Copy, ExternalLink, CheckCircle2,
  Clock, Users, Building2, MapPin, RefreshCw, Search,
  ChevronDown, AlertTriangle, Globe,
} from 'lucide-react';

// ── Production guard ────────────────────────────────────────────
// This entire page is staging-only. Never render in production.
const IS_PRODUCTION = import.meta.env.VITE_APP_ENV === 'production';

// ── Constants ───────────────────────────────────────────────────
const TABS = [
  { id: 'active', label: 'Active Tours', icon: Play },
  { id: 'create', label: 'Create Tour', icon: Plus },
  { id: 'templates', label: 'Template Library', icon: Building2 },
  { id: 'completed', label: 'Completed & Cleanup', icon: CheckCircle2 },
];

const CA_COUNTIES = [
  'Alameda','Alpine','Amador','Butte','Calaveras','Colusa','Contra Costa',
  'Del Norte','El Dorado','Fresno','Glenn','Humboldt','Imperial','Inyo',
  'Kern','Kings','Lake','Lassen','Los Angeles','Madera','Marin','Mariposa',
  'Mendocino','Merced','Modoc','Mono','Monterey','Napa','Nevada','Orange',
  'Placer','Plumas','Riverside','Sacramento','San Benito','San Bernardino',
  'San Diego','San Francisco','San Joaquin','San Luis Obispo','San Mateo',
  'Santa Barbara','Santa Clara','Santa Cruz','Shasta','Sierra','Siskiyou',
  'Solano','Sonoma','Stanislaus','Sutter','Tehama','Trinity','Tulare',
  'Tuolumne','Ventura','Yolo','Yuba',
];

const INDUSTRY_ICONS = {
  restaurant: '🍽️', hotel: '🏨', healthcare: '🏥', k12: '🏫',
  contract_food: '🏢', state_cardroom: '🎰', tribal_casino: '🎲',
  higher_ed: '🎓', sb1383_tier1: '♻️', sb1383_tier2: '🚛',
};

// ── Pricing helper ──────────────────────────────────────────────
function PricingPreview({ numLocations }) {
  const base = 99;
  const perAdditional = 49;
  const monthly = base + Math.max(0, numLocations - 1) * perAdditional;
  const annual = monthly * 12;

  return (
    <div className="bg-[#FAF7F0] border border-[#A08C5A]/20 rounded-xl p-4 mt-4">
      <p className="text-xs text-[#1E2D4D]/50 uppercase tracking-wider mb-2">
        Founder Pricing Preview
      </p>
      <p className="text-2xl font-bold tracking-tight text-[#1E2D4D]">
        ${monthly}<span className="text-sm font-normal">/mo</span>
      </p>
      <p className="text-sm text-[#1E2D4D]/50">
        ${base}/mo base + ${perAdditional}/mo × {Math.max(0, numLocations - 1)}{' '}
        additional location{numLocations > 2 ? 's' : ''}
      </p>
      <p className="text-xs text-[#A08C5A] mt-1">
        ${annual.toLocaleString()}/yr — locked for life before July 4, 2026
      </p>
    </div>
  );
}

// ── Tribal advisory banner ──────────────────────────────────────
function TribalFoodSafetyAdvisory() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
      <p className="text-sm font-semibold text-amber-800 mb-1">
        Tribal Food Safety — Advisory Mode
      </p>
      <p className="text-sm text-amber-700">
        Food safety compliance for tribal properties is governed by your
        Tribal Environmental Health Office (TEHO), not the county health
        department. EvidLY tracks fire safety and operational compliance
        in full. Tribe-specific food safety intelligence is in active
        development — contact Arthur to be a design partner.
      </p>
      <a
        href="mailto:arthur@getevidly.com"
        className="text-sm text-amber-800 font-medium underline mt-2 block"
      >
        Contact Arthur about tribal food safety intelligence →
      </a>
    </div>
  );
}

// ── Credentials card ────────────────────────────────────────────
function CredentialsCard({ tour }) {
  const founderPrice = (n) => 99 + Math.max(0, n - 1) * 49;

  const copyCredentials = () => {
    const text = [
      `URL: ${tour.demo_url}`,
      `Email: ${tour.demo_email}`,
      `Password: ${tour.demo_password}`,
      `Business: ${tour.business_name}`,
      `Locations: ${tour.num_locations}`,
      `Founder price: $${founderPrice(tour.num_locations)}/mo`,
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
          ['URL', tour.demo_url, true],
          ['Email', tour.demo_email],
          ['Password', tour.demo_password],
          ['Business', tour.business_name],
          ['Locations', tour.num_locations],
          ['Founder price', `$${founderPrice(tour.num_locations)}/mo`, false, true],
        ].map(([label, value, isLink, isGold]) => (
          <div key={label} className="flex justify-between">
            <span className="text-[#1E2D4D]/30">{label}:</span>
            {isLink ? (
              <a href={value} target="_blank" rel="noopener noreferrer"
                className="text-[#A08C5A] underline">{value}</a>
            ) : (
              <span className={isGold ? 'text-[#A08C5A] font-bold' : 'text-white font-mono'}>
                {value}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex gap-3">
        <button onClick={copyCredentials}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
          <Copy size={14} /> Copy Credentials
        </button>
        <a href={tour.demo_url} target="_blank" rel="noopener noreferrer"
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
    pending: 'bg-amber-50 text-amber-700',
    scheduled: 'bg-blue-50 text-blue-700',
    active: 'bg-emerald-50 text-emerald-700',
    completed: 'bg-gray-100 text-[#1E2D4D]/80',
    cleaned: 'bg-[#FAF7F0] text-[#1E2D4D]/30',
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

export default function DemoTours() {
  useDemoGuard();

  if (IS_PRODUCTION) return <Navigate to="/admin" replace />;

  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');

  // ── State: tours ──────────────────────────────────────────────
  const [tours, setTours] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── State: create form ────────────────────────────────────────
  const [creating, setCreating] = useState(false);
  const [createdTour, setCreatedTour] = useState(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    business_name: '', industry_type: 'restaurant', county: 'Los Angeles',
    state: 'California', num_locations: 1, scheduled_for: '', notes: '',
  });

  // ── Fetch data ────────────────────────────────────────────────
  const fetchTours = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('demo_tours')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setTours(data || []);
    setLoading(false);
  }, []);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('demo_templates')
      .select('*')
      .eq('is_active', true)
      .order('industry_type');
    setTemplates(data || []);
  }, []);

  useEffect(() => {
    fetchTours();
    fetchTemplates();
  }, [fetchTours, fetchTemplates]);

  // ── Handlers ──────────────────────────────────────────────────
  const updateForm = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleCreateTour = async () => {
    if (!form.first_name || !form.last_name || !form.business_name) {
      toast.error('First name, last name, and business name are required');
      return;
    }
    setCreating(true);
    try {
      // 1. Create staging org
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          name: form.business_name,
          industry_type: form.industry_type,
          is_demo: true,
          demo_started_at: new Date().toISOString(),
          demo_expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
        })
        .select('id')
        .single();
      if (orgErr) throw orgErr;

      // 2. Create location(s)
      const locInserts = [];
      for (let i = 0; i < form.num_locations; i++) {
        locInserts.push({
          organization_id: org.id,
          name: form.num_locations === 1
            ? `${form.business_name} — ${form.county}`
            : `${form.business_name} — Location ${i + 1}`,
          city: form.county,
          state: form.state === 'California' ? 'CA' : form.state,
          status: 'active',
          source: 'demo_template',
        });
      }
      const { data: locations, error: locErr } = await supabase
        .from('locations')
        .insert(locInserts)
        .select('id, name');
      if (locErr) throw locErr;

      // 3. Create demo user via edge function
      const demoEmail = `demo-${Date.now()}@evidly-tour.com`;
      const { data: authResult, error: authErr } = await supabase.functions.invoke(
        'demo-account-create',
        {
          body: {
            prospect_name: `${form.first_name} ${form.last_name}`,
            prospect_email: demoEmail,
            company_name: form.business_name,
            company_type: form.industry_type,
            address: `${form.county} County`,
            city: form.county,
            state: form.state === 'California' ? 'CA' : form.state,
            zip_code: '00000',
            num_locations: 0, // Already created locations above
          },
        },
      );

      // Extract credentials from result
      const demoPassword = authResult?.credentials?.temp_password || 'check-logs';
      const demoUserId = authResult?.auth_user_id;

      // Link user to our org (reassign the org created by demo-account-create)
      // Actually, use our org_id. Update the profile to point at our org.
      if (demoUserId) {
        await supabase
          .from('user_profiles')
          .update({ organization_id: org.id })
          .eq('user_id', demoUserId);
      }

      // 4. Find matching template
      const template = templates.find(t => t.industry_type === form.industry_type);

      // 5. Create tour record
      const { data: tour, error: tourErr } = await supabase
        .from('demo_tours')
        .insert({
          prospect_first_name: form.first_name,
          prospect_last_name: form.last_name,
          prospect_email: form.email,
          prospect_phone: form.phone,
          business_name: form.business_name,
          template_id: template?.id,
          industry_type: form.industry_type,
          county: form.county,
          state: form.state,
          num_locations: form.num_locations,
          location_details: locations,
          demo_org_id: org.id,
          demo_user_id: demoUserId,
          demo_email: demoEmail,
          demo_password: demoPassword,
          status: 'pending',
          scheduled_for: form.scheduled_for || null,
          arthur_notes: form.notes || null,
          created_by: user?.id,
        })
        .select()
        .single();
      if (tourErr) throw tourErr;

      // 6. Generate all demo data
      const { error: genErr } = await supabase.functions.invoke(
        'generate-demo-template',
        {
          body: {
            tour_id: tour.id,
            org_id: org.id,
            industry_type: form.industry_type,
            county: form.county,
            state: form.state,
            business_name: form.business_name,
            location_details: locations,
            num_locations: form.num_locations,
          },
        },
      );
      if (genErr) console.warn('Data generation warning:', genErr);

      setCreatedTour(tour);
      toast.success(`Demo created for ${form.business_name}`);
      await fetchTours();
    } catch (err) {
      console.error('Tour creation failed:', err);
      toast.error(`Failed: ${err.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleMarkComplete = async (tourId) => {
    const cleanupTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('demo_tours')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        cleanup_scheduled_for: cleanupTime,
      })
      .eq('id', tourId);
    toast.success('Tour marked complete. Cleanup in 24 hours.');
    fetchTours();
  };

  const handleManualCleanup = async (tourId) => {
    toast.loading('Cleaning up demo data...');
    const { data, error } = await supabase.functions.invoke('cleanup-demo-tour', {
      body: { tour_id: tourId },
    });
    toast.dismiss();
    if (error) {
      toast.error('Cleanup failed');
    } else {
      toast.success(`Cleaned up: ${data?.cleaned?.join(', ') || 'done'}`);
    }
    fetchTours();
  };

  // ── Filter helpers ────────────────────────────────────────────
  const activeTours = tours.filter(t => ['pending', 'active'].includes(t.status));
  const completedTours = tours.filter(t => ['completed', 'cleaned'].includes(t.status));

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  return (
    <div>
      <AdminBreadcrumb items={[
        { label: 'Admin', path: '/admin' },
        { label: 'Demo Tours' },
      ]} />

      <h1 className="text-2xl font-bold tracking-tight text-[#1E2D4D] mb-1">Demo Tours</h1>
      <p className="text-sm text-[#1E2D4D]/50 mb-6">
        Create and manage virtual demo environments for prospect tours
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active', count: activeTours.length, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Completed', count: completedTours.filter(t => t.status === 'completed').length, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Cleaned', count: completedTours.filter(t => t.status === 'cleaned').length, color: 'text-[#1E2D4D]/50', bg: 'bg-[#FAF7F0]' },
          { label: 'Templates', count: templates.length, color: 'text-[#A08C5A]', bg: 'bg-[#FAF7F0]' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className="text-xs text-[#1E2D4D]/50 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1E2D4D]/10 mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-[#1E2D4D] text-[#1E2D4D]'
                  : 'border-transparent text-[#1E2D4D]/50 hover:text-gray-700'
              }`}>
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Active Tours ──────────────────────────────────── */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {loading && <p className="text-[#1E2D4D]/30 text-sm">Loading tours...</p>}
          {!loading && activeTours.length === 0 && (
            <div className="text-center py-12 text-[#1E2D4D]/30">
              <Users size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No active tours</p>
              <p className="text-sm mt-1">Create a new tour to get started</p>
              <button onClick={() => setActiveTab('create')}
                className="mt-3 px-4 py-2 bg-[#1E2D4D] text-white rounded-lg text-sm hover:bg-[#162340] transition-all duration-150 active:scale-[0.98]">
                <Plus size={14} className="inline mr-1" /> Create Tour
              </button>
            </div>
          )}
          {activeTours.map(tour => (
            <div key={tour.id} className="bg-white border border-[#1E2D4D]/10 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[#1E2D4D]">
                    {INDUSTRY_ICONS[tour.industry_type] || '🏢'}{' '}
                    {tour.business_name}
                  </h3>
                  <p className="text-sm text-[#1E2D4D]/50">
                    {tour.prospect_first_name} {tour.prospect_last_name}
                    {tour.county && ` · ${tour.county} County`}
                    {tour.num_locations > 1 && ` · ${tour.num_locations} locations`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={tour.status} />
                  <button onClick={() => handleMarkComplete(tour.id)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors">
                    Mark Complete
                  </button>
                </div>
              </div>
              <CredentialsCard tour={tour} />
              {tour.industry_type === 'tribal_casino' && (
                <div className="mt-4">
                  <TribalFoodSafetyAdvisory />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Create Tour ───────────────────────────────────── */}
      {activeTab === 'create' && (
        <div className="max-w-2xl">
          {createdTour ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-green-800 font-medium">
                  <CheckCircle2 size={16} className="inline mr-1" />
                  Demo created successfully!
                </p>
              </div>
              <CredentialsCard tour={createdTour} />
              <button onClick={() => { setCreatedTour(null); setForm({
                first_name: '', last_name: '', email: '', phone: '',
                business_name: '', industry_type: 'restaurant', county: 'Los Angeles',
                state: 'California', num_locations: 1, scheduled_for: '', notes: '',
              }); }}
                className="text-sm text-[#1E2D4D] underline">
                Create another tour
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Section 1: Prospect Info */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-[#1E2D4D] uppercase tracking-wider mb-2">
                  Prospect Information
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-[#1E2D4D]/50">First Name *</span>
                    <input value={form.first_name}
                      onChange={e => updateForm('first_name', e.target.value)}
                      className="mt-1 w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]"
                      placeholder="Jane" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-[#1E2D4D]/50">Last Name *</span>
                    <input value={form.last_name}
                      onChange={e => updateForm('last_name', e.target.value)}
                      className="mt-1 w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]"
                      placeholder="Smith" />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-[#1E2D4D]/50">Email</span>
                    <input type="email" value={form.email}
                      onChange={e => updateForm('email', e.target.value)}
                      className="mt-1 w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]"
                      placeholder="jane@example.com" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-[#1E2D4D]/50">Phone</span>
                    <input value={form.phone}
                      onChange={e => updateForm('phone', e.target.value)}
                      className="mt-1 w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]"
                      placeholder="(555) 123-4567" />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs text-[#1E2D4D]/50">Business Name *</span>
                  <input value={form.business_name}
                    onChange={e => updateForm('business_name', e.target.value)}
                    className="mt-1 w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]"
                    placeholder="Aramark Yosemite" />
                </label>
              </fieldset>

              {/* Section 2: Template Selection */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-[#1E2D4D] uppercase tracking-wider mb-2">
                  Template Selection
                </legend>
                <label className="block">
                  <span className="text-xs text-[#1E2D4D]/50">Industry Type</span>
                  <select value={form.industry_type}
                    onChange={e => updateForm('industry_type', e.target.value)}
                    className="mt-1 w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]">
                    {templates.map(t => (
                      <option key={t.industry_type} value={t.industry_type}>
                        {INDUSTRY_ICONS[t.industry_type] || ''} {t.industry_label}
                      </option>
                    ))}
                    {templates.length === 0 && (
                      <option value="restaurant">Restaurant</option>
                    )}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-[#1E2D4D]/50">County</span>
                    <select value={form.county}
                      onChange={e => updateForm('county', e.target.value)}
                      className="mt-1 w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]">
                      {CA_COUNTIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-[#1E2D4D]/50">State</span>
                    <input value={form.state} readOnly
                      className="mt-1 w-full border border-[#1E2D4D]/10 rounded-lg px-3 py-2 text-sm bg-[#FAF7F0] text-[#1E2D4D]/50" />
                  </label>
                </div>

                {form.industry_type === 'tribal_casino' && (
                  <TribalFoodSafetyAdvisory />
                )}
              </fieldset>

              {/* Section 3: Locations */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-[#1E2D4D] uppercase tracking-wider mb-2">
                  Locations
                </legend>
                <label className="block">
                  <span className="text-xs text-[#1E2D4D]/50">Number of Locations</span>
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => updateForm('num_locations', Math.max(1, form.num_locations - 1))}
                      className="w-8 h-8 rounded-lg border border-[#1E2D4D]/15 flex items-center justify-center text-[#1E2D4D]/70 hover:bg-gray-50">−</button>
                    <span className="text-lg font-bold text-[#1E2D4D] w-8 text-center">{form.num_locations}</span>
                    <button onClick={() => updateForm('num_locations', Math.min(9, form.num_locations + 1))}
                      className="w-8 h-8 rounded-lg border border-[#1E2D4D]/15 flex items-center justify-center text-[#1E2D4D]/70 hover:bg-gray-50">+</button>
                  </div>
                </label>
                <PricingPreview numLocations={form.num_locations} />
              </fieldset>

              {/* Section 4: Notes */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-[#1E2D4D] uppercase tracking-wider mb-2">
                  Notes & Scheduling
                </legend>
                <label className="block">
                  <span className="text-xs text-[#1E2D4D]/50">Schedule For (optional)</span>
                  <input type="datetime-local" value={form.scheduled_for}
                    onChange={e => updateForm('scheduled_for', e.target.value)}
                    className="mt-1 w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]" />
                </label>
                <label className="block">
                  <span className="text-xs text-[#1E2D4D]/50">Internal Notes</span>
                  <textarea value={form.notes}
                    onChange={e => updateForm('notes', e.target.value)}
                    rows={3}
                    className="mt-1 w-full border border-[#1E2D4D]/15 rounded-lg px-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/20 focus:border-[#1E2D4D]"
                    placeholder="Notes for Arthur (not shown to prospect)" />
                </label>
              </fieldset>

              {/* Submit */}
              <button onClick={handleCreateTour} disabled={creating}
                className="w-full py-3 bg-[#1E2D4D] text-white rounded-xl text-sm font-semibold hover:bg-[#162340] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98]">
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin" /> Creating Demo...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Play size={14} /> Create & Generate Demo
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Template Library ──────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id}
              className="bg-white border border-[#1E2D4D]/10 rounded-xl p-5 hover:border-[#A08C5A]/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{INDUSTRY_ICONS[t.industry_type] || '🏢'}</span>
                <div>
                  <h3 className="font-semibold text-[#1E2D4D]">{t.industry_label}</h3>
                  {t.sb1383_tier && (
                    <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                      SB 1383 {t.sb1383_tier}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-[#1E2D4D]/50 mb-3">{t.description}</p>
              <div className="flex flex-wrap gap-1.5 text-xs text-[#1E2D4D]/30">
                <span className="bg-[#FAF7F0] px-2 py-0.5 rounded">60-day data</span>
                <span className="bg-[#FAF7F0] px-2 py-0.5 rounded">11 vendors</span>
                <span className="bg-[#FAF7F0] px-2 py-0.5 rounded">All Superpowers</span>
              </div>
              <button onClick={() => {
                updateForm('industry_type', t.industry_type);
                setActiveTab('create');
              }}
                className="mt-3 text-sm text-[#A08C5A] font-medium hover:underline">
                Use This Template →
              </button>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="col-span-2 text-center text-[#1E2D4D]/30 py-8">
              No templates found. Run the staging migration first.
            </p>
          )}
        </div>
      )}

      {/* ── Tab: Completed & Cleanup ──────────────────────────── */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {completedTours.length === 0 && (
            <p className="text-center text-[#1E2D4D]/30 py-8">No completed tours yet.</p>
          )}
          {completedTours.map(tour => (
            <div key={tour.id}
              className="bg-white border border-[#1E2D4D]/10 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[#1E2D4D]">
                  {INDUSTRY_ICONS[tour.industry_type] || '🏢'}{' '}
                  {tour.business_name}
                </h3>
                <p className="text-sm text-[#1E2D4D]/50">
                  {tour.prospect_first_name} {tour.prospect_last_name}
                  {tour.completed_at && ` · Completed ${new Date(tour.completed_at).toLocaleDateString()}`}
                  {tour.outcome && ` · ${tour.outcome}`}
                </p>
                {tour.status === 'completed' && tour.cleanup_scheduled_for && (
                  <p className="text-xs text-orange-600 mt-1">
                    <Clock size={12} className="inline mr-1" />
                    Cleanup scheduled: {new Date(tour.cleanup_scheduled_for).toLocaleString()}
                  </p>
                )}
                {tour.status === 'cleaned' && tour.cleaned_at && (
                  <p className="text-xs text-[#1E2D4D]/30 mt-1">
                    Cleaned {new Date(tour.cleaned_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={tour.status} />
                {tour.status === 'completed' && (
                  <button onClick={() => handleManualCleanup(tour.id)}
                    className="px-3 py-1.5 text-red-600 border border-red-200 rounded-lg text-xs hover:bg-red-50 transition-colors">
                    <Trash2 size={12} className="inline mr-1" /> Clean Up Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
