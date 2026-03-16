import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { useAgreementByToken, useSignAgreement } from '@/hooks/api/useAgreements';

export function SignAgreementPage() {
  const { token } = useParams<{ token: string }>();
  const { data: agreement, isLoading } = useAgreementByToken(token!);
  const signMutation = useSignAgreement();
  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureTitle, setSignatureTitle] = useState('');
  const [signed, setSigned] = useState(false);

  const handleSign = () => {
    signMutation.mutate({ token: token!, signer_name: signatureName, signer_title: signatureTitle }, { onSuccess: () => setSigned(true) });
  };

  if (isLoading) return (<div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b]" /></div>);

  if (!agreement) return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center">
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-8 max-w-md text-center">
        <FileText className="w-12 h-12 text-[#6B7F96] mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-[#0B1628] mb-2">Agreement Not Found</h2>
        <p className="text-sm text-[#6B7F96]">This signing link may have expired or is invalid.</p>
      </div>
    </div>
  );

  if (signed) return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#D1D9E6] p-8 max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-emerald-600" /></div>
        <h2 className="text-xl font-bold text-[#0B1628] mb-2">Agreement Signed</h2>
        <p className="text-sm text-[#6B7F96] mb-4">Thank you, {signatureName}. Your signed agreement has been recorded and a confirmation will be sent to your email.</p>
        <p className="text-xs text-[#6B7F96]">Agreement #{agreement.agreement_number}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <header className="bg-[#1e4d6b] text-white py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
          <div><h1 className="text-lg font-bold">HoodOps</h1><p className="text-xs text-white/70">Service Agreement</p></div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-5 mb-6">
          <h2 className="text-lg font-semibold text-[#0B1628] mb-1">{agreement.agreement_number}</h2>
          <p className="text-sm text-[#6B7F96]">{agreement.customer_name} &middot; {agreement.term_start} &ndash; {agreement.term_end}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-5 mb-6">
          <h3 className="text-sm font-semibold text-[#6B7F96] uppercase tracking-wider mb-3">Agreement Details</h3>
          <div className="prose prose-sm max-w-none max-h-[400px] overflow-y-auto p-4 bg-[#F4F6FA] rounded-lg border border-[#D1D9E6]" dangerouslySetInnerHTML={{ __html: agreement.content_html || '<p>No content available.</p>' }} />
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-5">
          <h3 className="text-sm font-semibold text-[#6B7F96] uppercase tracking-wider mb-4">Signature</h3>
          <label className="flex items-start gap-3 mb-5 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-[#D1D9E6] text-[#1e4d6b] focus:ring-[#1e4d6b]" />
            <span className="text-sm text-[#0B1628]">I have read and agree to the terms and conditions of this service agreement.</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div><label className="block text-sm font-medium text-[#0B1628] mb-1.5">Full Name</label><input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Your full name" className="w-full px-3 py-2.5 rounded-lg border border-[#D1D9E6] text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b]" /></div>
            <div><label className="block text-sm font-medium text-[#0B1628] mb-1.5">Title</label><input type="text" value={signatureTitle} onChange={(e) => setSignatureTitle(e.target.value)} placeholder="e.g. General Manager" className="w-full px-3 py-2.5 rounded-lg border border-[#D1D9E6] text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b]" /></div>
          </div>
          {signatureName && (<div className="mb-5 p-4 bg-[#F4F6FA] rounded-lg border border-[#D1D9E6]"><p className="text-xs text-[#6B7F96] mb-1">Signature Preview</p><p className="text-2xl text-[#0B1628]" style={{ fontFamily: 'cursive' }}>{signatureName}</p>{signatureTitle && <p className="text-sm text-[#6B7F96] mt-1">{signatureTitle}</p>}</div>)}
          <button onClick={handleSign} disabled={!agreed || !signatureName.trim() || signMutation.isPending} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            {signMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {signMutation.isPending ? 'Signing...' : 'Sign Agreement'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignAgreementPage;
