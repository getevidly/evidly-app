import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function PolicyLensUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [carrier, setCarrier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!file) { setError('Please choose your policy PDF.'); return; }
    if (file.type !== 'application/pdf') { setError('File must be a PDF.'); return; }
    if (file.size > 26214400) { setError('PDF must be 25 MB or smaller.'); return; }
    setSubmitting(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please sign in.'); setSubmitting(false); return; }
      const base = import.meta.env.VITE_SUPABASE_URL;

      const startRes = await fetch(`${base}/functions/v1/pl-intake-start-inapp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrier: carrier || null }),
      });
      const start = await startRes.json();
      if (!startRes.ok) { setError(start.error || 'Could not start upload.'); setSubmitting(false); return; }

      const { error: upErr } = await supabase.storage
        .from('policy-lens-uploads')
        .uploadToSignedUrl(start.upload_path, start.upload_token, file, { contentType: 'application/pdf' });
      if (upErr) { setError('Upload failed. Please try again.'); setSubmitting(false); return; }

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
        <h1 className="text-2xl font-medium mb-2">Policy received</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Your policy is uploaded and your Policy Lens review is underway. Your coverage figures and safety-system findings will appear in Policy Lens once the review is complete.
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

      <div className="border border-gray-200 rounded-lg p-5 mb-4">
        <label className="block text-sm font-medium text-gray-800 mb-2">Policy PDF</label>
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-gray-600 mb-4" />
        <label className="block text-sm font-medium text-gray-800 mb-2">Carrier <span className="font-normal text-gray-400">(optional)</span></label>
        <input type="text" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. The Hartford" className="block w-full text-sm border border-gray-300 rounded-md px-3 py-2" />
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 rounded-md px-3 py-2.5 mb-4">{error}</div>}

      <button onClick={handleSubmit} disabled={submitting} className="text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-md px-5 py-2.5">
        {submitting ? 'Submitting…' : 'Submit for review'}
      </button>
      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        Policy Lens reads what your policy states. Your agent evaluates whether the coverage fits. Your policy is reviewed before results appear.
      </p>
    </div>
  );
}
