import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CoverageLocation {
  loc_no: string | null;
  address: string | null;
  scheduled_building: string | null;
  scheduled_bpp: string | null;
  coinsurance: string | null;
  spoilage_sublimit: string | null;
}
interface CoverageItem { label: string | null; value: string | null; section_ref?: string | null; }
interface Finding {
  id: string;
  part: 'fire' | 'food' | 'general';
  flag: string;
  kitchen: { title: string; body: string };
}
interface CoverageDetail {
  framing: string;
  locations: CoverageLocation[];
  locations_note?: string;
  policy_wide: CoverageItem[];
  food_sublimits: CoverageItem[];
}
interface Resp {
  ok: boolean;
  status?: string;
  findings: Finding[];
  coverage_detail: CoverageDetail | null;
}

export default function PolicyLens() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setError('Please sign in to view your Policy Lens.'); setLoading(false); return; }
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pl-get-findings-insured`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: '{}',
          }
        );
        const json = await res.json();
        if (!res.ok) { setError(json.error || 'Could not load your Policy Lens.'); setLoading(false); return; }
        setData(json);
      } catch (e) {
        setError('Could not load your Policy Lens.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Reading your policy…</div>;
  if (error) return <div className="p-8 text-gray-600">{error}</div>;

  const noPolicy = data?.status === 'no_policy' || data?.status === 'no_released_run';
  if (noPolicy || !data) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-medium">Policy Lens</h1>
        </div>
        <p className="text-gray-600">Your policy read isn't ready yet. Once your policy has been processed, your coverage figures and safety-system findings will appear here.</p>
      </div>
    );
  }

  const cd = data.coverage_detail;
  const fireFindings = data.findings.filter(f => f.part === 'fire');
  const foodFindings = data.findings.filter(f => f.part === 'food');

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-medium">Policy Lens</h1>
        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Initial read</span>
      </div>
      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        Policy Lens read what your policy states. Your agent evaluates whether the coverage fits your kitchen.
      </p>

      {cd && (
        <section className="mb-6">
          <div className="text-sm font-medium text-gray-600 mb-2">{cd.framing}</div>
          {cd.locations_note && (
            <div className="text-sm text-amber-700 bg-amber-50 rounded p-3 mb-3">{cd.locations_note}</div>
          )}
          {cd.locations.map((loc, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 mb-3">
              {loc.address && <div className="text-sm font-medium mb-2">{loc.address}</div>}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Building" value={loc.scheduled_building} />
                <Stat label="Contents (BPP)" value={loc.scheduled_bpp} />
                <Stat label="Coinsurance" value={loc.coinsurance} />
                <Stat label="Spoilage" value={loc.spoilage_sublimit} />
              </div>
            </div>
          ))}
          {cd.policy_wide.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {cd.policy_wide.map((item, i) => <Stat key={i} label={item.label} value={item.value} />)}
            </div>
          )}
          {cd.food_sublimits.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cd.food_sublimits.map((item, i) => <Stat key={i} label={item.label} value={item.value} />)}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            Values shown are stated in your policy. Where a figure differs between sections, Policy Lens shows "Refer to policy" rather than choosing one — your agent confirms the controlling number.
          </p>
        </section>
      )}

      <FindingGroup title="Fire" findings={fireFindings} />
      <FindingGroup title="Food" findings={foodFindings} />

      <div className="bg-blue-50 rounded-lg p-4 flex gap-3 mt-6">
        <div>
          <div className="text-sm font-medium text-blue-800 mb-1">Your agent evaluates the coverage</div>
          <div className="text-xs text-blue-800/80 leading-relaxed">
            Policy Lens reads and identifies what your policy says — it does not assess whether your coverage is adequate or recommend changes. Bring these findings to your agent to evaluate fit and options.
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string | null; value: string | null }) {
  return (
    <div className="bg-gray-50 rounded-md px-3 py-2">
      <div className="text-xs text-gray-500">{label ?? ''}</div>
      <div className="text-base font-medium">{value ?? '—'}</div>
    </div>
  );
}

function FindingGroup({ title, findings }: { title: string; findings: Finding[] }) {
  if (findings.length === 0) return null;
  return (
    <section className="mb-4">
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-gray-500">{findings.length} findings identified</span>
        </div>
        <div>
          {findings.map((f, i) => (
            <div key={f.id} className={`px-4 py-2.5 text-sm text-gray-600 leading-relaxed ${i > 0 ? 'border-t border-gray-200' : ''}`}>
              {f.kitchen.title && <div className="font-medium text-gray-800">{f.kitchen.title}</div>}
              {f.kitchen.body}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
