import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ProspectMarketingReport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [prospectName, setProspectName] = useState('');
  const [prospectCounty, setProspectCounty] = useState('');
  const [facts, setFacts] = useState([{ date: '', result: '', type: '' }]);
  const [counties, setCounties] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('jurisdictions')
        .select('county, state')
        .order('state, county');
      if (data) {
        const unique = [...new Set(data.map(j => `${j.county}, ${j.state}`))].filter(Boolean);
        setCounties(unique);
      }
    })();
  }, []);

  const addFact = useCallback(() => {
    setFacts(prev => [...prev, { date: '', result: '', type: '' }]);
  }, []);

  const removeFact = useCallback((idx) => {
    setFacts(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateFact = useCallback((idx, field, value) => {
    setFacts(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prospectName.trim()) {
      toast.error('Prospect business name is required');
      return;
    }
    if (!user?.id) return;
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const nonEmptyFacts = facts.filter(f => f.date || f.result);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            report_type: 'internal_prospect_marketing',
            prospect_name: prospectName.trim(),
            prospect_county: prospectCounty || undefined,
            prospect_facts: nonEmptyFacts.length > 0 ? nonEmptyFacts : undefined,
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');

      if (json.report?.share_token) {
        setResult({ share_token: json.report.share_token, title: json.report.title });
        toast.success('PMR generated');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate PMR');
    } finally {
      setGenerating(false);
    }
  }, [prospectName, prospectCounty, facts, user?.id]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[#1E2D4D] rounded-xl px-6 py-5">
        <h1 className="text-white text-xl font-bold">Prospect Marketing Report</h1>
        <p className="text-white/70 text-sm mt-1">
          Generate a branded compliance framework report for a prospective client.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-[#E5E0D8] p-6 space-y-5">
        {/* Prospect Name */}
        <div>
          <label className="block text-[#1E2D4D] text-sm font-semibold mb-1">
            Prospect Business Name
          </label>
          <input
            type="text"
            value={prospectName}
            onChange={e => setProspectName(e.target.value)}
            placeholder="e.g. Mario's Trattoria"
            className="w-full border border-[#E5E0D8] rounded-md px-3 py-2 text-sm text-[#1E2D4D] placeholder:text-[#1E2D4D]/30 focus:outline-none focus:ring-2 focus:ring-[#1E2D4D]/20"
          />
        </div>

        {/* County */}
        <div>
          <label className="block text-[#1E2D4D] text-sm font-semibold mb-1">
            County <span className="font-normal text-[#1E2D4D]/50">(optional)</span>
          </label>
          <select
            value={prospectCounty}
            onChange={e => setProspectCounty(e.target.value)}
            className="w-full border border-[#E5E0D8] rounded-md px-3 py-2 text-sm text-[#1E2D4D] focus:outline-none focus:ring-2 focus:ring-[#1E2D4D]/20"
          >
            <option value="">Select county...</option>
            {counties.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Inspection Facts */}
        <div>
          <label className="block text-[#1E2D4D] text-sm font-semibold mb-2">
            Known Inspection History <span className="font-normal text-[#1E2D4D]/50">(optional)</span>
          </label>
          <div className="space-y-2">
            {facts.map((fact, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="date"
                  value={fact.date}
                  onChange={e => updateFact(idx, 'date', e.target.value)}
                  className="border border-[#E5E0D8] rounded-md px-2 py-1.5 text-xs text-[#1E2D4D] focus:outline-none focus:ring-2 focus:ring-[#1E2D4D]/20"
                />
                <input
                  type="text"
                  value={fact.result}
                  onChange={e => updateFact(idx, 'result', e.target.value)}
                  placeholder="Result (e.g. Pass, 92/100)"
                  className="flex-1 border border-[#E5E0D8] rounded-md px-2 py-1.5 text-xs text-[#1E2D4D] placeholder:text-[#1E2D4D]/30 focus:outline-none focus:ring-2 focus:ring-[#1E2D4D]/20"
                />
                <input
                  type="text"
                  value={fact.type}
                  onChange={e => updateFact(idx, 'type', e.target.value)}
                  placeholder="Type (optional)"
                  className="w-28 border border-[#E5E0D8] rounded-md px-2 py-1.5 text-xs text-[#1E2D4D] placeholder:text-[#1E2D4D]/30 focus:outline-none focus:ring-2 focus:ring-[#1E2D4D]/20"
                />
                {facts.length > 1 && (
                  <button
                    onClick={() => removeFact(idx)}
                    className="text-[#1E2D4D]/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addFact}
            className="flex items-center gap-1 mt-2 text-xs text-[#1E2D4D]/60 hover:text-[#1E2D4D] transition-colors"
          >
            <Plus size={12} /> Add row
          </button>
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={generating || !prospectName.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-[#1E2D4D] text-white hover:bg-[#162340] transition-colors disabled:opacity-50"
        >
          {generating ? (
            <><Loader2 size={14} className="animate-spin" /> Generating...</>
          ) : (
            <><FileText size={14} /> Generate PMR</>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-lg border border-[#E5E0D8] p-6">
          <h3 className="text-[#1E2D4D] font-semibold text-sm mb-2">Report Ready</h3>
          <p className="text-[#1E2D4D]/60 text-xs mb-3">{result.title}</p>
          <button
            onClick={() => navigate(`/reports/view/${result.share_token}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-[#E5E0D8] text-[#1E2D4D] hover:bg-[#FAF7F0] transition-colors"
          >
            <ExternalLink size={12} /> View Report
          </button>
        </div>
      )}
    </div>
  );
}
