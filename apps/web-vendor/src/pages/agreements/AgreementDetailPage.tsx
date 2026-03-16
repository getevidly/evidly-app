import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Plus, Send, Eye, CheckCircle, RefreshCw, XCircle,
  FileText, Loader2, Calendar, DollarSign, User, Briefcase,
} from 'lucide-react';
import {
  useAgreement, useAgreementActivities, useGenerateAgreementPdf,
  useSendAgreement, useResendAgreement, useRenewAgreement, useCancelAgreement,
} from '@/hooks/api/useAgreements';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  viewed: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  signed: 'bg-green-50 text-green-700 border-green-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  renewed: 'bg-purple-50 text-purple-700 border-purple-200',
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  created: Plus, sent: Send, viewed: Eye, signed: CheckCircle,
  renewed: RefreshCw, cancelled: XCircle,
};

const TABS = ['Overview', 'Document', 'Activity', 'Jobs'] as const;
type Tab = typeof TABS[number];

export function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: agreement, isLoading } = useAgreement(id!);
  const { data: activities } = useAgreementActivities(id!);
  const generatePdf = useGenerateAgreementPdf();
  const sendAgreement = useSendAgreement();
  const resendAgreement = useResendAgreement();
  const renewAgreement = useRenewAgreement();
  const cancelAgreement = useCancelAgreement();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#1e4d6b] animate-spin" />
      </div>);
  }

  if (!agreement) {
    return (
      <div className="min-h-screen bg-[#F4F6FA] flex flex-col items-center justify-center gap-4">
        <p className="text-[#6B7F96]">Agreement not found.</p>
        <button onClick={() => navigate('/agreements')} className="text-[#1e4d6b] underline text-sm">Back to Agreements</button>
      </div>);
  }

  const status = agreement.status || 'draft';
  const badgeCls = STATUS_STYLES[status] || STATUS_STYLES.draft;

  const handleSend = async () => {
    try { await sendAgreement.mutateAsync({ id: agreement.id, email: agreement.signer_email }); } catch { /* hook */ }
  };
  const handleResend = async () => {
    try { await resendAgreement.mutateAsync({ id: agreement.id }); } catch { /* hook */ }
  };
  const handleDownloadPdf = async () => {
    try { await generatePdf.mutateAsync({ id: agreement.id }); } catch { /* hook */ }
  };
  const handleRenew = async () => {
    if (!window.confirm('Are you sure you want to renew this agreement?')) return;
    try { await renewAgreement.mutateAsync({ id: agreement.id }); } catch { /* hook */ }
  };
  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this agreement? This cannot be undone.')) return;
    try { await cancelAgreement.mutateAsync({ id: agreement.id }); } catch { /* hook */ }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[#0B1628] mb-3">Services</h3>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#D1D9E6]">
            <th className="py-2 text-left text-[#6B7F96] font-medium">Service</th>
            <th className="py-2 text-left text-[#6B7F96] font-medium">Frequency</th>
            <th className="py-2 text-right text-[#6B7F96] font-medium">Price</th></tr></thead>
          <tbody>{(agreement.services || []).map((s: any, i: number) => (
            <tr key={i} className="border-b border-[#D1D9E6]">
              <td className="py-2 text-[#0B1628]">{s.service_type}</td>
              <td className="py-2 text-[#0B1628]">{s.frequency}</td>
              <td className="py-2 text-right text-[#0B1628]">{'$'}{s.price?.toFixed(2)}</td></tr>))}</tbody></table></div>
      <div>
        <h3 className="text-sm font-semibold text-[#0B1628] mb-3">Pricing</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center"><p className="text-xs text-[#6B7F96] uppercase tracking-wide">Monthly</p><p className="text-lg font-bold text-[#1e4d6b]">{'$'}{agreement.monthly_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
          <div className="text-center"><p className="text-xs text-[#6B7F96] uppercase tracking-wide">Annual</p><p className="text-lg font-bold text-[#1e4d6b]">{'$'}{agreement.annual_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
          <div className="text-center"><p className="text-xs text-[#6B7F96] uppercase tracking-wide">Discount</p><p className="text-lg font-bold text-[#0B1628]">{agreement.discount_percent || 0}%</p></div>
          <div className="text-center"><p className="text-xs text-[#6B7F96] uppercase tracking-wide">Payment Terms</p><p className="text-sm font-medium text-[#0B1628]">{agreement.payment_terms}</p></div>
        </div></div>
      <div>
        <h3 className="text-sm font-semibold text-[#0B1628] mb-3">Customer</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-[#6B7F96]">Signer</span><span className="text-[#0B1628]">{agreement.signer_name}</span>
          <span className="text-[#6B7F96]">Title</span><span className="text-[#0B1628]">{agreement.signer_title || '--'}</span>
          <span className="text-[#6B7F96]">Email</span><span className="text-[#0B1628]">{agreement.signer_email}</span>
        </div></div>
    </div>);

  const renderDocument = () => (
    <div className="space-y-4">
      <button onClick={handleDownloadPdf} disabled={generatePdf.isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e4d6b] text-white text-sm font-medium hover:bg-[#2a6a8f] transition-colors disabled:opacity-50">
        <Download className="w-4 h-4" /> {generatePdf.isPending ? 'Generating...' : 'Generate PDF'}</button>
      {agreement.pdf_url && (
        <a href={agreement.pdf_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D1D9E6] text-[#0B1628] text-sm font-medium hover:bg-[#F4F6FA] transition-colors">
          <Download className="w-4 h-4" /> Download Agreement PDF</a>)}
      {agreement.signed_pdf_url && (
        <a href={agreement.signed_pdf_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-200 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors">
          <CheckCircle className="w-4 h-4" /> Download Signed PDF</a>)}
    </div>);

  const renderActivity = () => (
    <div className="space-y-1">
      {(!activities || activities.length === 0) ? (
        <p className="text-sm text-[#6B7F96] text-center py-8">No activity recorded yet.</p>
      ) : activities.map((act: any, i: number) => {
        const Icon = ACTIVITY_ICONS[act.type] || FileText;
        return (
          <div key={i} className="flex items-start gap-3 py-3 border-b border-[#D1D9E6] last:border-0">
            <div className="mt-0.5 w-8 h-8 rounded-full bg-[#F4F6FA] flex items-center justify-center">
              <Icon className="w-4 h-4 text-[#1e4d6b]" /></div>
            <div><p className="text-sm text-[#0B1628]">{act.description}</p>
              <p className="text-xs text-[#6B7F96]">{new Date(act.created_at).toLocaleString()}</p></div>
          </div>);
      })}
    </div>);

  const renderJobs = () => (
    <div className="text-center py-12">
      <Briefcase className="w-10 h-10 text-[#D1D9E6] mx-auto mb-3" />
      <p className="text-sm text-[#6B7F96]">Jobs under this agreement will appear here.</p>
    </div>);

  const tabContent: Record<Tab, () => JSX.Element> = {
    Overview: renderOverview, Document: renderDocument, Activity: renderActivity, Jobs: renderJobs,
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <button onClick={() => navigate('/agreements')} className="flex items-center gap-2 text-sm text-[#6B7F96] hover:text-[#0B1628] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Agreements</button>

        {/* Header card */}
        <div className="bg-white border border-[#D1D9E6] rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-[#0B1628]">{agreement.agreement_number}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeCls}`}>{status}</span>
              </div>
              <p className="text-sm text-[#6B7F96]">{agreement.signer_name} &middot; {agreement.organization_name}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center"><p className="text-xs text-[#6B7F96]">Term</p><p className="text-sm font-semibold text-[#0B1628]">{agreement.start_date} &mdash; {agreement.end_date || '--'}</p></div>
              <div className="text-center"><p className="text-xs text-[#6B7F96]">Monthly</p><p className="text-lg font-bold text-[#1e4d6b]">{'$'}{agreement.monthly_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
              <div className="text-center"><p className="text-xs text-[#6B7F96]">Annual</p><p className="text-lg font-bold text-[#1e4d6b]">{'$'}{agreement.annual_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
            </div></div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#D1D9E6]">
            {status === 'draft' && (
              <button onClick={handleSend} disabled={sendAgreement.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e4d6b] text-white text-sm font-medium hover:bg-[#2a6a8f] disabled:opacity-50 transition-colors">
                <Send className="w-3.5 h-3.5" /> Send for Signature</button>)}
            {(status === 'sent' || status === 'viewed') && (
              <button onClick={handleResend} disabled={resendAgreement.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e4d6b] text-[#1e4d6b] text-sm font-medium hover:bg-[#1e4d6b] hover:text-white disabled:opacity-50 transition-colors">
                <Send className="w-3.5 h-3.5" /> Resend</button>)}
            <button onClick={handleDownloadPdf} disabled={generatePdf.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D1D9E6] text-[#0B1628] text-sm font-medium hover:bg-[#F4F6FA] disabled:opacity-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> Download PDF</button>
            {(status === 'active' || status === 'signed') && (
              <button onClick={handleRenew} disabled={renewAgreement.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-300 text-purple-700 text-sm font-medium hover:bg-purple-50 disabled:opacity-50 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Renew</button>)}
            {status !== 'cancelled' && status !== 'expired' && (
              <button onClick={handleCancel} disabled={cancelAgreement.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
                <XCircle className="w-3.5 h-3.5" /> Cancel</button>)}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-[#D1D9E6] rounded-xl">
          <div className="flex border-b border-[#D1D9E6]">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium transition-colors ${activeTab === tab ? 'text-[#1e4d6b] border-b-2 border-[#1e4d6b]' : 'text-[#6B7F96] hover:text-[#0B1628]'}`}>{tab}</button>))}</div>
          <div className="p-6">{tabContent[activeTab]()}</div>
        </div>
      </div>
    </div>
  );
}

export default AgreementDetailPage;