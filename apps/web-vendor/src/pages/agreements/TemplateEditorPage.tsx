import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, EyeOff, Code, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAgreementTemplate, useUpdateAgreementTemplate } from '@/hooks/api/useAgreements';

const MERGE_FIELDS = [
  { label: 'Customer Name', tag: '{{customer_name}}' },
  { label: 'Customer Address', tag: '{{customer_address}}' },
  { label: 'Services Table', tag: '{{services_table}}' },
  { label: 'Pricing Table', tag: '{{pricing_table}}' },
  { label: 'Term Start', tag: '{{term_start}}' },
  { label: 'Term End', tag: '{{term_end}}' },
  { label: 'Agreement #', tag: '{{agreement_number}}' },
  { label: 'Date', tag: '{{date}}' },
];

export function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: template, isLoading } = useAgreementTemplate(id!);
  const updateMutation = useUpdateAgreementTemplate();
  const [contentHtml, setContentHtml] = useState('');
  const [termMonths, setTermMonths] = useState(12);
  const [paymentTerms, setPaymentTerms] = useState('net_30');
  const [autoRenew, setAutoRenew] = useState(false);
  const [cancellationDays, setCancellationDays] = useState(30);
  const [termsConditions, setTermsConditions] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (template) {
      setContentHtml(template.content_html || '');
      setTermMonths(template.term_months || 12);
      setPaymentTerms(template.payment_terms || 'net_30');
      setAutoRenew(template.auto_renew || false);
      setCancellationDays(template.cancellation_days || 30);
      setTermsConditions(template.terms_conditions || '');
    }
  }, [template]);

  const insertMergeField = (tag: string) => setContentHtml((prev) => prev + tag);
  const handleSave = () => {
    updateMutation.mutate({ id: id!, content_html: contentHtml, term_months: termMonths, payment_terms: paymentTerms, auto_renew: autoRenew, cancellation_days: cancellationDays, terms_conditions: termsConditions });
  };

  if (isLoading) return (<div className="flex items-center justify-center py-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b]" /></div>);

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/agreements/templates')} className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-[#D1D9E6] text-[#6B7F96] transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-2xl font-bold text-[#0B1628]">{template?.name || 'Edit Template'}</h1>
              <p className="text-[#6B7F96] mt-0.5">Configure template content and settings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowPreview(!showPreview)} className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#D1D9E6] rounded-lg text-[#0B1628] hover:bg-white transition-colors font-medium">
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? 'Edit' : 'Preview'}
            </button>
            <button onClick={handleSave} disabled={updateMutation.isPending} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-medium disabled:opacity-50">
              <Save className="w-4 h-4" />{updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        {!showPreview && (<div className="bg-white rounded-xl border border-[#D1D9E6] p-4 mb-6">
          <div className="flex items-center gap-2 mb-3"><Code className="w-4 h-4 text-[#6B7F96]" /><span className="text-sm font-medium text-[#0B1628]">Merge Fields</span></div>
          <div className="flex flex-wrap gap-2">{MERGE_FIELDS.map((field) => (<button key={field.tag} onClick={() => insertMergeField(field.tag)} className="px-3 py-1.5 text-xs font-mono bg-[#F4F6FA] border border-[#D1D9E6] rounded-lg text-[#0B1628] hover:bg-[#1e4d6b]/10 hover:border-[#1e4d6b]/30 transition-colors">{field.label}</button>))}</div>
        </div>)}
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-6 mb-6">
          <label className="block text-sm font-medium text-[#0B1628] mb-2">Agreement Content</label>
          {showPreview ? (<div className="prose max-w-none min-h-[300px] p-4 bg-[#F4F6FA] rounded-lg border border-[#D1D9E6]" dangerouslySetInnerHTML={{ __html: contentHtml }} />) : (<textarea value={contentHtml} onChange={(e) => setContentHtml(e.target.value)} rows={14} className="w-full px-4 py-3 rounded-lg border border-[#D1D9E6] text-[#0B1628] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b] resize-y" placeholder="Enter agreement HTML content..." />)}
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#0B1628] mb-5">Template Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-[#0B1628] mb-1.5">Default Term (months)</label><input type="number" value={termMonths} onChange={(e) => setTermMonths(Number(e.target.value))} min={1} className="w-full px-3 py-2.5 rounded-lg border border-[#D1D9E6] text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b]" /></div>
            <div><label className="block text-sm font-medium text-[#0B1628] mb-1.5">Payment Terms</label><select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-[#D1D9E6] text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b]"><option value="due_on_receipt">Due on Receipt</option><option value="net_15">Net 15</option><option value="net_30">Net 30</option><option value="net_60">Net 60</option></select></div>
            <div><label className="block text-sm font-medium text-[#0B1628] mb-1.5">Auto-Renew</label><button onClick={() => setAutoRenew(!autoRenew)} className="flex items-center gap-2 text-sm text-[#0B1628]">{autoRenew ? <ToggleRight className="w-8 h-8 text-[#1e4d6b]" /> : <ToggleLeft className="w-8 h-8 text-[#6B7F96]" />}{autoRenew ? 'Enabled' : 'Disabled'}</button></div>
            <div><label className="block text-sm font-medium text-[#0B1628] mb-1.5">Cancellation Notice (days)</label><input type="number" value={cancellationDays} onChange={(e) => setCancellationDays(Number(e.target.value))} min={0} className="w-full px-3 py-2.5 rounded-lg border border-[#D1D9E6] text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b]" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D9E6] p-6">
          <label className="block text-sm font-medium text-[#0B1628] mb-2">Terms &amp; Conditions</label>
          <textarea value={termsConditions} onChange={(e) => setTermsConditions(e.target.value)} rows={6} className="w-full px-4 py-3 rounded-lg border border-[#D1D9E6] text-[#0B1628] text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b] resize-y" placeholder="Enter standard terms and conditions..." />
        </div>
      </div>
    </div>
  );
}

export default TemplateEditorPage;
