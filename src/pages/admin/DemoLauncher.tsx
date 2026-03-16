import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';

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

export default function DemoLauncher() {
  useDemoGuard();
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();

  const [form, setForm] = useState({
    prospectName: '',
    company: '',
    counties: [] as string[],
    industry: '',
    locationCount: '',
    notes: '',
  });
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [loadError, setLoadError] = useState(false);

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
    setForm({ prospectName: '', company: '', counties: [], industry: '', locationCount: '', notes: '' });
  };

  return (
    <div className="p-8 max-w-3xl">
      <AdminBreadcrumb crumbs={[{ label: 'Demo Launcher' }]} />

      <h1 className="text-2xl font-bold text-[#1E2D4D] mb-1 mt-4">Demo Launcher</h1>
      <p className="text-sm text-gray-500 mb-8">
        Configure and launch a personalized demo session for a prospect.
        The demo will be filtered to their jurisdiction and industry automatically.
      </p>

      {launched ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="text-3xl mb-3">🚀</div>
          <h2 className="text-lg font-semibold text-green-800 mb-1">Demo Launched</h2>
          <p className="text-sm text-green-600 mb-4">
            Personalized demo for {form.prospectName} at {form.company} is now open.
          </p>
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-[#1E2D4D] text-white rounded-lg text-sm"
          >
            Launch Another
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          {/* Prospect info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Prospect Name *</label>
              <input
                value={form.prospectName}
                onChange={e => setForm(f => ({ ...f, prospectName: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Company *</label>
              <input
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Aramark Yosemite"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Industry</label>
              <select
                value={form.industry}
                onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Number of Locations</label>
              <input
                type="number"
                value={form.locationCount}
                onChange={e => setForm(f => ({ ...f, locationCount: e.target.value }))}
                placeholder="7"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* County selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Counties {form.counties.length > 0 && <span className="text-[#A08C5A] ml-1">({form.counties.length} selected)</span>}
            </label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg bg-gray-50">
              {CA_COUNTIES.map(county => (
                <button
                  key={county}
                  type="button"
                  onClick={() => toggleCounty(county)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    form.counties.includes(county)
                      ? 'bg-[#1E2D4D] text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {county}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Key pain points, what they want to see, deal size..."
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          <button
            type="button"
            onClick={handleLaunch}
            disabled={!form.prospectName || !form.company || loading}
            className="w-full py-3 bg-[#1E2D4D] text-white rounded-lg font-medium text-sm
                       disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a3f6b]"
          >
            {loading ? 'Launching...' : 'Launch Personalized Demo'}
          </button>
        </div>
      )}

      {/* Recent sessions */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Demo Sessions</h2>
        {loadError ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#6B7F96' }}>Failed to load data.</p>
            <button onClick={loadSessions} style={{ marginTop: 12, background: '#A08C5A', color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No demo sessions yet. Launch your first demo above.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="border rounded-lg p-3 text-sm flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1E2D4D]">{s.prospect_name} — {s.company}</p>
                  <p className="text-xs text-gray-500">
                    {s.counties?.join(', ')} · {s.industry} · {s.location_count ?? '?'} locations
                  </p>
                </div>
                <div className="text-xs text-gray-400">{new Date(s.launched_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
