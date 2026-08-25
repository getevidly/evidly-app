import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const MAX_FILES = 5;
const MAX_BYTES = 26214400;

const POLICY_TYPES: { value: string; label: string }[] = [
  { value: 'property', label: 'Property' },
  { value: 'general_liability', label: 'General liability' },
  { value: 'umbrella_excess', label: 'Umbrella / excess' },
  { value: 'spoilage_contamination', label: 'Spoilage / contamination' },
  { value: 'bop', label: 'Business owner’s policy (BOP)' },
  { value: 'liquor_liability', label: 'Liquor liability' },
  { value: 'other', label: 'Other / Not sure — identify it for me' },
];

type PolicyRow = { id: number; file: File | null; policyType: string };

const newRow = (id: number): PolicyRow => ({ id, file: null, policyType: 'other' });

export default function PolicyLensUpload() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PolicyRow[]>([newRow(1)]);
  const [nextId, setNextId] = useState(2);
  const [carrier, setCarrier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const readyCount = rows.filter((r) => r.file).length;

  function addRow() {
    if (rows.length >= MAX_FILES) return;
    setRows((prev) => [...prev, newRow(nextId)]);
    setNextId((n) => n + 1);
  }

  function removeRow(id: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  function updateRow(id: number, patch: Partial<PolicyRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleSubmit() {
    const filled = rows.filter((r): r is PolicyRow & { file: File } => r.file !== null);
    if (filled.length === 0) { setError('Please choose at least one policy PDF.'); return; }
    for (const row of filled) {
      if (row.file.type !== 'application/pdf') { setError(`${row.file.name} must be a PDF.`); return; }
      if (row.file.size > MAX_BYTES) { setError(`${row.file.name} must be 25 MB or smaller.`); return; }
    }
    setSubmitting(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please sign in.'); setSubmitting(false); return; }
      const base = import.meta.env.VITE_SUPABASE_URL;

      const startRes = await fetch(`${base}/functions/v1/pl-intake-start-inapp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: carrier || null,
          file_count: filled.length,
          stated_policy_types: filled.map((r) => r.policyType),
        }),
      });
      const start = await startRes.json();
      if (!startRes.ok) { setError(start.error || 'Could not start upload.'); setSubmitting(false); return; }

      const uploads: { path: string; token: string }[] =
        start.uploads ?? [{ path: start.upload_path, token: start.upload_token }];

      for (let i = 0; i < filled.length; i++) {
        const target = uploads[i];
        if (!target) { setError('Upload failed. Please try again.'); setSubmitting(false); return; }
        const { error: upErr } = await supabase.storage
          .from('policy-lens-uploads')
          .uploadToSignedUrl(target.path, target.token, filled[i].file, { contentType: 'application/pdf' });
        if (upErr) { setError('Upload failed. Please try again.'); setSubmitting(false); return; }
      }

      const finRes = await fetch(`${base}/functions/v1/pl-intake-finalize`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake_id: start.intake_id }),
      });
      const fin = await finRes.json();
      if (!finRes.ok) { setError(fin.error || 'Could not submit for review.'); setSubmitting(false); return; }

      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-8">
        <h1 className="text-2xl font-medium mb-2">{readyCount === 1 ? 'Policy received' : 'Policies received'}</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          {readyCount === 1 ? 'Your policy is' : `Your ${readyCount} policies are`} uploaded and your Policy Lens review is underway. Your coverage figures and safety-system findings will appear in Policy Lens once the review is complete.
        </p>
        <button onClick={() => navigate('/policy-lens')} className="text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md px-4 py-2">Back to Policy Lens</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-8">
      <h1 className="text-2xl font-medium mb-1">Get your policy read</h1>
      <p className="text-sm text-gray-600 leading-relaxed mb-6">
        Share your current commercial insurance policy (PDF). Policy Lens will read it and show you your coverage in plain terms — building and contents limits, coinsurance, spoilage, and how your policy treats your fire and food safety systems.
      </p>

      {rows.map((row, i) => (
        <div key={row.id} className="border border-gray-200 rounded-lg p-5 mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-800">Policy PDF {i + 1}</label>
            {rows.length > 1 && (
              <button type="button" onClick={() => removeRow(row.id)} className="text-sm text-gray-500 hover:text-gray-800">Remove</button>
            )}
          </div>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => updateRow(row.id, { file: e.target.files?.[0] ?? null })}
            className="block w-full text-sm text-gray-600 mb-4"
          />
          <label className="block text-sm font-medium text-gray-800 mb-2">Policy type</label>
          <select
            value={row.policyType}
            onChange={(e) => updateRow(row.id, { policyType: e.target.value })}
            className="block w-full text-sm border border-gray-300 rounded-md px-3 py-2"
          >
            {POLICY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      ))}

      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= MAX_FILES}
          className="text-sm font-medium text-blue-700 hover:text-blue-800 disabled:opacity-50"
        >
          + Add another policy
        </button>
        <span className="text-xs text-gray-400">{rows.length} of {MAX_FILES} added</span>
      </div>

      <div className="border border-gray-200 rounded-lg p-5 mb-4">
        <label className="block text-sm font-medium text-gray-800 mb-2">Carrier <span className="font-normal text-gray-400">(optional)</span></label>
        <input type="text" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. The Hartford" className="block w-full text-sm border border-gray-300 rounded-md px-3 py-2" />
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 rounded-md px-3 py-2.5 mb-4">{error}</div>}

      <button onClick={handleSubmit} disabled={submitting} className="text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-md px-5 py-2.5">
        {submitting ? 'Submitting…' : readyCount === 1 ? 'Submit policy for review' : 'Submit policies for review'}
      </button>
      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        Policy Lens reads what your policy states. Your agent evaluates whether the coverage fits. Your policy is reviewed before results appear.
      </p>
    </div>
  );
}
