/**
 * DemoLauncher — DEMO-SCRIPT-01
 *
 * Route: /admin/demo-launcher
 * Arthur's pre-demo control panel: configure prospect, launch 3 emotional
 * trigger flows, fire demo signals, quick-link to key pages.
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, ExternalLink, FileText, Globe, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import { toast } from 'sonner';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import Button from '../../components/ui/Button';
import { SUPPORTED_STATES, getCountiesForState, type StateAbbrev } from '../../data/stateCounties';

const INDUSTRIES = [
  'Independent Restaurant','Multi-Unit Restaurant','Hotel & Hospitality',
  'Healthcare / Hospital','School / K-12','University / Higher Ed',
  'National Park Concession','Institutional / Cafeteria','Other',
];

interface DemoSession {
  id: string;
  prospect_name: string;
  company: string;
  counties: string[];
  industry: string;
  location_count: number | null;
  launched_at: string;
  status: string;
}

// Quick-link targets
const QUICK_LINKS = [
  { label: 'Dashboard',        path: '/dashboard' },
  { label: 'AI Advisor',       path: '/ai-advisor' },
  { label: 'Copilot',          path: '/copilot' },
  { label: 'Mock Inspection',  path: '/mock-inspection' },
  { label: 'Self Audit',       path: '/self-audit' },
  { label: 'Vendors',          path: '/vendors' },
  { label: 'Documents',        path: '/documents' },
  { label: 'Temp Logs',        path: '/temp-logs' },
];

export default function DemoLauncher() {
  useDemoGuard();
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();

  const [form, setForm] = useState({
    prospectName: '',
    company: '',
    demoState: 'CA' as StateAbbrev,
    counties: [] as string[],
    industry: '',
    locationCount: '',
    notes: '',
  });
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [firingSignal, setFiringSignal] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    if (isDemoMode) return;
    setLoadError(false);
    try {
      const { data } = await supabase
        .from('demo_sessions')
        .select('*')
        .order('launched_at', { ascending: false })
        .limit(10);
      setSessions(data || []);
    } catch {
      setLoadError(true);
    }
  };

  const handleLaunch = async () => {
    setLoading(true);

    if (!isDemoMode) {
      await supabase
        .from('demo_sessions')
        .insert({
          prospect_name:  form.prospectName,
          company:        form.company,
          counties:       form.counties,
          industry:       form.industry,
          location_count: parseInt(form.locationCount) || null,
          notes:          form.notes,
          launched_by:    (await supabase.auth.getUser()).data.user?.email,
          launched_at:    new Date().toISOString(),
          status:         'active',
        });
    }

    sessionStorage.setItem('demoJurisdictionFilter', JSON.stringify(form.counties));
    sessionStorage.setItem('DEMO_CLIENT_PROFILE', JSON.stringify({
      prospectName:  form.prospectName,
      company:       form.company,
      counties:      form.counties,
      industry:      form.industry,
      locationCount: form.locationCount,
    }));

    setLoading(false);
    setLaunched(true);
    loadSessions();

    setTimeout(() => {
      navigate('/demo');
    }, 500);
  };

  const toggleCounty = (county: string) => {
    setForm(f => ({
      ...f,
      counties: f.counties.includes(county)
        ? f.counties.filter(c => c !== county)
        : [...f.counties, county],
    }));
  };

  const resetForm = () => {
    setLaunched(false);
    setForm({ prospectName: '', company: '', demoState: 'CA' as StateAbbrev, counties: [], industry: '', locationCount: '', notes: '' });
  };

  // Fire Demo Signal — inserts a published signal for the guided tour org
  const fireDemoSignal = async () => {
    setFiringSignal(true);
    try {
      if (isDemoMode) {
        // In demo mode, just show success
        await new Promise(r => setTimeout(r, 800));
        toast.success('Demo signal fired (simulated in demo mode)');
      } else {
        const { error } = await supabase.from('intelligence_signals').insert({
          title: 'FDA recall affecting leafy greens — California suppliers',
          summary: 'An FDA recall has been issued affecting romaine lettuce from California suppliers. Review your receiving logs for the past 30 days.',
          content_summary: 'The FDA has issued a Class I recall for romaine lettuce originating from Central Valley, CA growing regions due to potential E. coli O157:H7 contamination. Commercial kitchens sourcing from California suppliers should review receiving logs and supplier invoices from the past 30 days.',
          signal_type: 'fda_recall',
          category: 'food_safety',
          cic_pillar: 'liability_risk',
          severity_score: 90,
          confidence_score: 95,
          revenue_risk_level: 'high',
          liability_risk_level: 'critical',
          cost_risk_level: 'low',
          operational_risk_level: 'high',
          recommended_action: 'Check receiving logs for romaine lettuce from California suppliers in the last 30 days. Quarantine any affected product.',
          is_published: true,
          published_at: new Date().toISOString(),
          status: 'published',
          routing_tier: 'notify',
        });
        if (error) throw error;
        toast.success('Demo signal fired — check the notification bell');
      }
    } catch (err: any) {
      toast.error(`Failed to fire signal: ${err.message}`);
    }
    setFiringSignal(false);
  };

  // County for jurisdiction link
  const jieCounty = form.counties[0] || 'Fresno';

  return (
    <div className="p-8 max-w-3xl">
      <AdminBreadcrumb crumbs={[{ label: 'Demo Launcher' }]} />

      <h1 className="text-2xl font-bold tracking-tight text-navy mb-1 mt-4">Demo Launcher</h1>
      <p className="text-sm text-navy/50 mb-6">
        Prepare your demo in 60 seconds. Configure the prospect, then use the 3 flows below.
      </p>

      {/* -- 3 EMOTIONAL TRIGGER FLOWS -- */}
      <div className="bg-white border border-navy/10 rounded-xl p-5 mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4 text-gold">
          3 Demo Flows
        </h2>
        <div className="space-y-3">

          {/* Flow 1: Jurisdiction Reveal */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#F8F9FB] border border-gray-200">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#EEF4F8]">
              <Globe size={18} className="text-navy" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy">
                Flow 1: "I didn't know that"
              </p>
              <p className="text-xs text-navy/50 mt-0.5">
                Show how their inspector actually scores kitchens in their county.
              </p>
            </div>
            <Link
              to={`/admin/jurisdiction-intelligence?county=${encodeURIComponent(jieCounty)}`}
              className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors hover:opacity-90 bg-navy text-white"
            >
              <ExternalLink size={12} /> Open
            </Link>
          </div>

          {/* Flow 2: Live Notification */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#F8F9FB] border border-gray-200">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-red-50">
              <Bell size={18} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy">
                Flow 2: "It caught something"
              </p>
              <p className="text-xs text-navy/50 mt-0.5">
                Fire a live signal — the bell badge updates in real time.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fireDemoSignal}
                disabled={firingSignal}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors hover:opacity-90 disabled:opacity-50 bg-red-600 text-white border-none ${firingSignal ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Zap size={12} /> {firingSignal ? 'Firing...' : 'Fire Signal'}
              </button>
              <Link
                to="/insights/intelligence"
                className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-navy/5 text-navy border border-gray-200"
              >
                View Feed
              </Link>
            </div>
          </div>

          {/* Flow 3: Compliance Record */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#F8F9FB] border border-gray-200">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-green-50">
              <FileText size={18} className="text-green-800" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy">
                Flow 3: "I look good"
              </p>
              <p className="text-xs text-navy/50 mt-0.5">
                Show the full compliance record — documents, reports, export.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/documents"
                className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-navy/5 text-navy border border-gray-200"
              >
                Documents
              </Link>
              <Link
                to="/reports"
                className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors hover:opacity-90 bg-navy text-white"
              >
                <ExternalLink size={12} /> Reports
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* -- QUICK LINKS -- */}
      <div className="bg-white border border-navy/10 rounded-xl p-5 mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-3 text-gold">
          Quick Links
        </h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map(l => (
            <Link
              key={l.path}
              to={l.path}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-navy/5 text-navy border border-gray-200"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* -- PROSPECT CONFIG -- */}
      <h2 className="text-sm font-semibold text-navy/80 mb-3">Prospect Setup (Optional)</h2>

      {launched ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <h2 className="text-lg font-semibold tracking-tight text-green-800 mb-1">Demo Launched</h2>
          <p className="text-sm text-green-600 mb-4">
            Personalized demo for {form.prospectName} at {form.company} is now open.
          </p>
          <Button onClick={resetForm} variant="primary">
            Launch Another
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-navy/10 rounded-xl p-6 space-y-5">
          {/* Prospect info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1">Prospect Name *</label>
              <input
                value={form.prospectName}
                onChange={e => setForm(f => ({ ...f, prospectName: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full border rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1">Company *</label>
              <input
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Aramark Yosemite"
                className="w-full border rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1">Industry</label>
              <select
                value={form.industry}
                onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1">Number of Locations</label>
              <input
                type="number"
                value={form.locationCount}
                onChange={e => setForm(f => ({ ...f, locationCount: e.target.value }))}
                placeholder="7"
                className="w-full border rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* State + County selector */}
          <div>
            <label className="block text-xs font-semibold text-navy/80 mb-2">
              Counties {form.counties.length > 0 && <span className="text-gold ml-1">({form.counties.length} selected)</span>}
            </label>
            <div className="flex gap-1 mb-2">
              {SUPPORTED_STATES.map(s => (
                <button
                  key={s.abbrev}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, demoState: s.abbrev, counties: [] }))}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    form.demoState === s.abbrev
                      ? 'bg-navy text-white'
                      : 'bg-white border border-navy/10 text-navy/70 hover:border-navy/20'
                  }`}
                >
                  {s.abbrev}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-xl bg-cream">
              {getCountiesForState(form.demoState).map(county => (
                <button
                  key={county}
                  type="button"
                  onClick={() => toggleCounty(county)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    form.counties.includes(county)
                      ? 'bg-navy text-white'
                      : 'bg-white border border-navy/10 text-navy/70 hover:border-navy/20'
                  }`}
                >
                  {county}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-navy/80 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Key pain points, what they want to see, deal size..."
              rows={2}
              className="w-full border rounded-xl px-3 py-2 text-sm resize-none"
            />
          </div>

          <button
            type="button"
            onClick={handleLaunch}
            disabled={!form.prospectName || !form.company || loading}
            className="w-full py-3 bg-navy text-white rounded-lg font-medium text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed hover:bg-navy-hover"
          >
            {loading ? 'Launching...' : 'Launch Personalized Demo'}
          </button>
        </div>
      )}

      {/* Recent sessions */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-navy/80 mb-3">Recent Demo Sessions</h2>
        {loadError ? (
          <div className="text-center p-12">
            <p className="text-slate_ui">Failed to load data.</p>
            <button onClick={loadSessions} className="mt-3 bg-gold text-white border-none rounded-md px-5 py-2 cursor-pointer">
              Try again
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-navy/30 text-sm">
            No demo sessions yet. Launch your first demo above.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="border rounded-xl p-3 text-sm flex items-center justify-between">
                <div>
                  <p className="font-medium text-navy">{s.prospect_name} — {s.company}</p>
                  <p className="text-xs text-navy/50">
                    {s.counties?.join(', ')} · {s.industry} · {s.location_count ?? '?'} locations
                  </p>
                </div>
                <div className="text-xs text-navy/30">{new Date(s.launched_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
