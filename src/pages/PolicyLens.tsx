import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PolicyLensReport from '../components/PolicyLensReport';

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

  const load = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please sign in to view your Policy Lens.'); setLoading(false); return; }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pl-get-findings-insured`;
      console.log('[PolicyLens] fetching', url);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const json = await res.json();
      console.log('[PolicyLens] response', res.status, json);
      if (!res.ok) { setError(json.error || 'Could not load your Policy Lens.'); setLoading(false); return; }
      setError(null);
      setData(json);
    } catch (e) {
      console.error('[PolicyLens] fetch failed', e);
      setError('Could not load your Policy Lens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Reading your policy…</div>;
  if (error) return <div className="p-8 text-gray-600">{error}</div>;

  const inReview = data?.status === 'in_review';
  const failed = data?.status === 'failed';
  const noPolicy = data?.status === 'no_policy' || data?.status === 'no_released_run';

  const STAGE_LABELS: Record<string, { label: string; step: number }> = {
    received: { label: 'Uploaded — queued for reading', step: 1 },
    extracting: { label: 'Being read', step: 2 },
    review: { label: 'In review', step: 3 },
    verified: { label: 'Verified — preparing your results', step: 4 },
    report_sent: { label: 'Released', step: 5 },
  };

  if (failed) {
    return (
      <div className="max-w-3xl mx-auto p-6 md:p-8">
        <h1 className="text-2xl font-medium mb-2">Policy Lens</h1>
        <p className="text-sm text-gray-600 leading-relaxed">We hit a problem reading your policy. Please re-upload, or reach out and we'll help.</p>
        <a href="/policy-lens/upload" className="inline-block mt-4 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md px-4 py-2 no-underline">Re-upload your policy</a>
      </div>
    );
  }

  if (inReview) {
    const stage = STAGE_LABELS[(data as any)?.intake_status ?? 'received'] ?? STAGE_LABELS.received;
    const submitted = (data as any)?.submitted_at ? new Date((data as any).submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
    return (
      <div className="max-w-3xl mx-auto p-6 md:p-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-medium">Policy Lens</h1>
          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">In review</span>
        </div>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Your policy is uploaded and your Policy Lens review is underway. Your coverage figures and safety-system findings will appear here once the review is complete.{submitted ? ` Submitted ${submitted}.` : ''}
        </p>
        <div className="border border-gray-200 rounded-lg p-5">
          <div className="text-sm font-medium text-gray-800 mb-4">Current status: {stage.label}</div>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(n => (
              <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= stage.step ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>Uploaded</span><span>Being read</span><span>In review</span><span>Verified</span><span>Released</span>
          </div>
        </div>
      </div>
    );
  }
  if (noPolicy || !data) {
    return (
      <div className="max-w-3xl mx-auto p-6 md:p-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-medium">Policy Lens</h1>
          <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Coverage insight</span>
        </div>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Policy Lens reads your commercial insurance policy and shows you, in plain terms, what it actually covers — your building and contents limits, coinsurance, spoilage, and how your policy treats your fire and food safety systems. Your agent evaluates whether the coverage fits; Policy Lens just shows you what's there.
        </p>

        <div className="border border-gray-200 rounded-lg p-5 mb-5">
          <div className="text-sm font-medium text-gray-800 mb-3">What you'll see once your policy is read</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-md px-3 py-2"><div className="text-xs text-gray-500">Building</div><div className="text-base font-medium text-gray-300">—</div></div>
            <div className="bg-gray-50 rounded-md px-3 py-2"><div className="text-xs text-gray-500">Contents</div><div className="text-base font-medium text-gray-300">—</div></div>
            <div className="bg-gray-50 rounded-md px-3 py-2"><div className="text-xs text-gray-500">Coinsurance</div><div className="text-base font-medium text-gray-300">—</div></div>
            <div className="bg-gray-50 rounded-md px-3 py-2"><div className="text-xs text-gray-500">Spoilage</div><div className="text-base font-medium text-gray-300">—</div></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 text-sm text-gray-500 bg-gray-50 rounded-md px-3 py-2.5">Fire — your policy's safety-system findings</div>
            <div className="flex-1 text-sm text-gray-500 bg-gray-50 rounded-md px-3 py-2.5">Food — your policy's safety-system findings</div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-5">
          <div className="text-sm font-medium text-blue-800 mb-1">Get your policy read</div>
          <div className="text-xs text-blue-800/80 leading-relaxed mb-3">
            Share your current commercial insurance policy and Policy Lens will read it. You'll see your coverage in plain terms here, and you can bring the findings to your agent.
          </div>
          <a href="/policy-lens/upload" className="inline-block text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md px-4 py-2 no-underline">Upload your policy</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          [data-print-hide] { display: none !important; }
          nav, header, aside, [role="navigation"] { display: none !important; }
          body { background: #fff !important; }
          @page { margin: 0.6in; }
          [data-pl-reading] { break-inside: avoid; }
        }
      `}</style>
      <div data-print-hide style={{ maxWidth: 768, margin: "0 auto", padding: "16px 24px 0", textAlign: "right" }}>
        <button onClick={() => window.print()} style={{ fontFamily: "'Helvetica Neue',Arial,sans-serif", fontSize: 13, fontWeight: 600, color: "#1E2D4D", background: "#fff", border: "1px solid #1E2D4D", borderRadius: 6, padding: "7px 16px", cursor: "pointer" }}>
          Print / Save as PDF
        </button>
      </div>
      <PolicyLensReport
        findings={data.findings || []}
        coverage={data.coverage_detail || null}
        mode="bound"
        edition="kitchen"
      />
    </>
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
