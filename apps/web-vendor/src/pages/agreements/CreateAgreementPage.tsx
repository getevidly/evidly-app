import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Save, Send, Download, FileText } from 'lucide-react';
import { useCreateAgreement, useGenerateAgreementPdf, useSendAgreement } from '@/hooks/api/useAgreements';

interface ServiceRow { id: string; name: string; defaultPrice: number; selected: boolean; frequency: string; price: number; }

type Frequency = 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
const FREQUENCIES: Frequency[] = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'];

const INITIAL_SERVICES: ServiceRow[] = [
  { id: 'kitchen_exhaust_cleaning', name: 'Kitchen Exhaust Cleaning', defaultPrice: 450, selected: false, frequency: 'Quarterly', price: 450 },
  { id: 'fan_performance_mgmt', name: 'Fan Performance Mgmt', defaultPrice: 150, selected: false, frequency: 'Monthly', price: 150 },
  { id: 'grease_filter_exchange', name: 'Grease Filter Exchange', defaultPrice: 200, selected: false, frequency: 'Monthly', price: 200 },
  { id: 'fire_suppression', name: 'Fire Suppression', defaultPrice: 250, selected: false, frequency: 'Semi-Annual', price: 250 },
  { id: 'rooftop_grease_containment', name: 'Rooftop Grease Containment', defaultPrice: 175, selected: false, frequency: 'Quarterly', price: 175 },
];

const TERM_OPTIONS = [6, 12, 24, 36];
const PAYMENT_TERMS_OPTIONS = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_60', label: 'Net 60' },
];
const BILLING_FREQUENCY_OPTIONS = [
  { value: 'per_service', label: 'Per Service' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const STEPS = ['Customer & Locations', 'Services', 'Term & Pricing', 'Review', 'Send or Save'];

function generateAgreementNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `SA-${yy}${mm}-${rand}`;
}

function frequencyMultiplier(freq: string): number {
  switch (freq) {
    case 'Monthly': return 12; case 'Quarterly': return 4;
    case 'Semi-Annual': return 2; case 'Annual': return 1;
    default: return 12;
  }
}

export function CreateAgreementPage() {
  const navigate = useNavigate();
  const createAgreement = useCreateAgreement();
  const generatePdf = useGenerateAgreementPdf();
  const sendAgreement = useSendAgreement();

  const [step, setStep] = useState(0);
  const [organizationName, setOrganizationName] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [services, setServices] = useState<ServiceRow[]>(INITIAL_SERVICES);
  const [startDate, setStartDate] = useState('');
  const [termMonths, setTermMonths] = useState(12);
  const [autoRenew, setAutoRenew] = useState(false);
  const [cancellationNoticeDays, setCancellationNoticeDays] = useState(30);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('net_30');
  const [billingFrequency, setBillingFrequency] = useState('monthly');
  const [sendEmail, setSendEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  const agreementNumber = useMemo(() => generateAgreementNumber(), []);
  const selectedServices = services.filter((s) => s.selected);

  const { annualAmount, monthlyAmount } = useMemo(() => {
    let annual = 0;
    for (const s of selectedServices) { annual += s.price * frequencyMultiplier(s.frequency); }
    const discounted = annual * (1 - discountPercent / 100);
    return { annualAmount: Math.round(discounted * 100) / 100, monthlyAmount: Math.round((discounted / 12) * 100) / 100 };
  }, [selectedServices, discountPercent]);

  const toggleService = useCallback((id: string) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)));
  }, []);

  const updateService = useCallback(
    (id: string, field: 'frequency' | 'price', value: string | number) => {
      setServices((prev) => prev.map((s) => s.id === id ? { ...s, [field]: field === 'price' ? Number(value) : value } : s));
    }, []);

  const buildPayload = useCallback(() => ({
    agreement_number: agreementNumber, organization_name: organizationName,
    signer_name: signerName, signer_email: signerEmail, signer_title: signerTitle,
    services: selectedServices.map((s) => ({ service_type: s.id, frequency: s.frequency, price: s.price })),
    start_date: startDate, term_months: termMonths, auto_renew: autoRenew,
    cancellation_notice_days: cancellationNoticeDays, discount_percent: discountPercent,
    payment_terms: paymentTerms, billing_frequency: billingFrequency,
    monthly_amount: monthlyAmount, annual_amount: annualAmount,
  }), [agreementNumber, organizationName, signerName, signerEmail, signerTitle,
    selectedServices, startDate, termMonths, autoRenew, cancellationNoticeDays,
    discountPercent, paymentTerms, billingFrequency, monthlyAmount, annualAmount]);

  const handleSaveDraft = async () => {
    try { await createAgreement.mutateAsync({ ...buildPayload(), status: 'draft' }); navigate('/agreements'); } catch { /* hook */ }
  };

  const handleSendForSignature = async () => {
    if (!showEmailInput) { setSendEmail(signerEmail); setShowEmailInput(true); return; }
    try { const r = await createAgreement.mutateAsync({ ...buildPayload(), status: 'sent' });
      await sendAgreement.mutateAsync({ id: r.id, email: sendEmail }); navigate('/agreements'); } catch { /* hook */ }
  };

  const handleDownloadPdf = async () => {
    try { const r = await createAgreement.mutateAsync({ ...buildPayload(), status: 'draft' });
      await generatePdf.mutateAsync({ id: r.id }); navigate('/agreements'); } catch { /* hook */ }
  };

  const canAdvance = (): boolean => {
    switch (step) { case 0: return !!(organizationName && signerName && signerEmail); case 1: return selectedServices.length > 0; case 2: return !!startDate; default: return true; }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${i < step ? 'bg-[#1e4d6b] border-[#1e4d6b] text-white' : i === step ? 'border-[#1e4d6b] text-[#1e4d6b] bg-white' : 'border-[#D1D9E6] text-[#6B7F96] bg-white'}`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`mt-1.5 text-xs whitespace-nowrap ${i === step ? 'text-[#1e4d6b] font-semibold' : 'text-[#6B7F96]'}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`w-12 h-0.5 mx-1 mt-[-18px] ${i < step ? 'bg-[#1e4d6b]' : 'bg-[#D1D9E6]'}`} />}
        </div>))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-[#0B1628]">Customer & Locations</h2>
      <div>
        <label className="block text-sm font-medium text-[#0B1628] mb-1">Organization Name</label>
        <input type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Enter organization name" className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2 text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#0B1628] mb-1">Signer Name</label>
          <input type="text" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Full name" className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2 text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#0B1628] mb-1">Signer Title</label>
          <input type="text" value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} placeholder="e.g. General Manager" className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2 text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#0B1628] mb-1">Signer Email</label>
        <input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="email@example.com" className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2 text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-[#0B1628]">Services</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#D1D9E6]"><th className="py-2 pr-3 text-left w-8" /><th className="py-2 px-3 text-left text-[#6B7F96] font-medium">Service</th><th className="py-2 px-3 text-left text-[#6B7F96] font-medium">Frequency</th><th className="py-2 px-3 text-left text-[#6B7F96] font-medium">Price ($)</th></tr></thead>
          <tbody>{services.map((s) => (
            <tr key={s.id} className="border-b border-[#D1D9E6]">
              <td className="py-3 pr-3"><input type="checkbox" checked={s.selected} onChange={() => toggleService(s.id)} className="w-4 h-4 rounded border-[#D1D9E6] text-[#1e4d6b] focus:ring-[#1e4d6b]" /></td>
              <td className="py-3 px-3 text-[#0B1628] font-medium">{s.name}</td>
              <td className="py-3 px-3"><select value={s.frequency} onChange={(e) => updateService(s.id, 'frequency', e.target.value)} disabled={!s.selected} className="rounded-lg border border-[#D1D9E6] px-2 py-1.5 text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] disabled:opacity-50 disabled:bg-[#F4F6FA]">{FREQUENCIES.map((f) => (<option key={f} value={f}>{f}</option>))}</select></td>
              <td className="py-3 px-3"><input type="number" value={s.price} onChange={(e) => updateService(s.id, 'price', e.target.value)} disabled={!s.selected} min={0} className="w-24 rounded-lg border border-[#D1D9E6] px-2 py-1.5 text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] disabled:opacity-50 disabled:bg-[#F4F6FA]" /></td>
            </tr>))}</tbody>
        </table>
      </div>
      {selectedServices.length === 0 && <p className="text-sm text-[#6B7F96] text-center py-2">Select at least one service to continue.</p>}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-[#0B1628]">Term & Pricing</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-[#0B1628] mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2 text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" /></div>
        <div><label className="block text-sm font-medium text-[#0B1628] mb-1">Term (months)</label>
          <select value={termMonths} onChange={(e) => setTermMonths(Number(e.target.value))} className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2 text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]">
            {TERM_OPTIONS.map((t) => (<option key={t} value={t}>{t} months</option>))}</select></div>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="autoRenew" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} className="w-4 h-4 rounded border-[#D1D9E6] text-[#1e4d6b] focus:ring-[#1e4d6b]" />
        <label htmlFor="autoRenew" className="text-sm font-medium text-[#0B1628]">Auto-renew at end of term</label></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-[#0B1628] mb-1">Cancellation Notice (days)</label>
          <input type="number" value={cancellationNoticeDays} onChange={(e) => setCancellationNoticeDays(Number(e.target.value))} min={0} className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2 text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]" /></div>
        <div><label className="block text-sm font-medium text-[#0B1628] mb-1">Discount (%)</label>
          <input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} min={0} max={100} className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2 text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]" /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-[#0B1628] mb-1">Payment Terms</label>
          <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2 text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]">
            {PAYMENT_TERMS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</select></div>
        <div><label className="block text-sm font-medium text-[#0B1628] mb-1">Billing Frequency</label>
          <select value={billingFrequency} onChange={(e) => setBillingFrequency(e.target.value)} className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2 text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]">
            {BILLING_FREQUENCY_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</select></div>
      </div>
      <div className="flex items-center justify-center gap-8 pt-4">
        <div className="text-center"><p className="text-xs text-[#6B7F96] uppercase tracking-wide">Monthly Amount</p>
          <p className="text-2xl font-bold text-[#1e4d6b]">{'$'}{monthlyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
        <div className="text-center"><p className="text-xs text-[#6B7F96] uppercase tracking-wide">Annual Amount</p>
          <p className="text-2xl font-bold text-[#1e4d6b]">{'$'}{annualAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
      </div>
      {discountPercent > 0 && <p className="text-center text-sm text-[#6B7F96]">{discountPercent}% discount applied</p>}
    </div>
  );

  const renderStep4 = () => {
    const endDate = startDate ? new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + termMonths)).toISOString().slice(0, 10) : '--';
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-[#0B1628]">Review Agreement</h2>
        <div className="bg-white border border-[#D1D9E6] rounded-xl p-6 space-y-6">
          <div className="text-center">
            <p className="text-xs text-[#6B7F96] uppercase tracking-wide">Agreement Number</p>
            <p className="text-lg font-bold text-[#1e4d6b]">{agreementNumber}</p></div>
          <div><h3 className="text-sm font-semibold text-[#0B1628] mb-2">Customer</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-[#6B7F96]">Organization</span><span className="text-[#0B1628]">{organizationName}</span>
              <span className="text-[#6B7F96]">Signer</span><span className="text-[#0B1628]">{signerName}</span>
              <span className="text-[#6B7F96]">Title</span><span className="text-[#0B1628]">{signerTitle || '--'}</span>
              <span className="text-[#6B7F96]">Email</span><span className="text-[#0B1628]">{signerEmail}</span></div></div>
          <div><h3 className="text-sm font-semibold text-[#0B1628] mb-2">Services</h3>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#D1D9E6]">
                <th className="py-1.5 text-left text-[#6B7F96] font-medium">Service</th>
                <th className="py-1.5 text-left text-[#6B7F96] font-medium">Frequency</th>
                <th className="py-1.5 text-right text-[#6B7F96] font-medium">Price</th></tr></thead>
              <tbody>{selectedServices.map((s) => (
                <tr key={s.id} className="border-b border-[#D1D9E6]">
                  <td className="py-1.5 text-[#0B1628]">{s.name}</td>
                  <td className="py-1.5 text-[#0B1628]">{s.frequency}</td>
                  <td className="py-1.5 text-right text-[#0B1628]">{'$'}{s.price.toFixed(2)}</td></tr>))}</tbody></table></div>
          <div><h3 className="text-sm font-semibold text-[#0B1628] mb-2">Term</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-[#6B7F96]">Start Date</span><span className="text-[#0B1628]">{startDate || '--'}</span>
              <span className="text-[#6B7F96]">End Date</span><span className="text-[#0B1628]">{endDate}</span>
              <span className="text-[#6B7F96]">Duration</span><span className="text-[#0B1628]">{termMonths} months</span>
              <span className="text-[#6B7F96]">Auto-Renew</span><span className="text-[#0B1628]">{autoRenew ? 'Yes' : 'No'}</span>
              <span className="text-[#6B7F96]">Cancel Notice</span><span className="text-[#0B1628]">{cancellationNoticeDays} days</span></div></div>
          <div><h3 className="text-sm font-semibold text-[#0B1628] mb-2">Pricing</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-[#6B7F96]">Discount</span><span className="text-[#0B1628]">{discountPercent}%</span>
              <span className="text-[#6B7F96]">Payment Terms</span><span className="text-[#0B1628]">{PAYMENT_TERMS_OPTIONS.find((o) => o.value === paymentTerms)?.label}</span>
              <span className="text-[#6B7F96]">Billing</span><span className="text-[#0B1628]">{BILLING_FREQUENCY_OPTIONS.find((o) => o.value === billingFrequency)?.label}</span></div>
            <div className="flex items-center justify-center gap-8 pt-4">
              <div className="text-center"><p className="text-xs text-[#6B7F96] uppercase tracking-wide">Monthly</p>
                <p className="text-xl font-bold text-[#1e4d6b]">{'$'}{monthlyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
              <div className="text-center"><p className="text-xs text-[#6B7F96] uppercase tracking-wide">Annual</p>
                <p className="text-xl font-bold text-[#1e4d6b]">{'$'}{annualAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div>
            </div></div>
        </div></div>);
  };

  const renderStep5 = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#0B1628]">Send or Save</h2>
      <p className="text-sm text-[#6B7F96]">
        Choose how you would like to finalize agreement{' '}
        <span className="font-semibold text-[#0B1628]">{agreementNumber}</span>.
      </p>
      <div className="flex flex-col items-center gap-4">
        <button onClick={handleSaveDraft} disabled={createAgreement.isPending}
          className="w-full max-w-sm flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#D1D9E6] bg-white text-[#0B1628] text-sm font-medium hover:bg-[#F4F6FA] transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" /> Save as Draft</button>
        <div className="w-full max-w-sm space-y-2">
          <button onClick={handleSendForSignature} disabled={createAgreement.isPending || sendAgreement.isPending}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#1e4d6b] text-white text-sm font-medium hover:bg-[#2a6a8f] transition-colors disabled:opacity-50">
            <Send className="w-4 h-4" /> Send for Signature</button>
          {showEmailInput && (
            <input type="email" value={sendEmail} onChange={(e) => setSendEmail(e.target.value)}
              placeholder="Confirm email address"
              className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2 text-sm text-[#0B1628] focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" />)}
        </div>
        <button onClick={handleDownloadPdf} disabled={createAgreement.isPending || generatePdf.isPending}
          className="w-full max-w-sm flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#1e4d6b] text-[#1e4d6b] text-sm font-medium hover:bg-[#1e4d6b] hover:text-white transition-colors disabled:opacity-50">
          <Download className="w-4 h-4" /> Download PDF</button>
      </div>
    </div>
  );

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <div className="min-h-screen bg-[#F4F6FA] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/agreements')} className="p-2 rounded-lg hover:bg-white transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#6B7F96]" /></button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1e4d6b]" />
            <h1 className="text-xl font-bold text-[#0B1628]">Create Agreement</h1></div></div>
        {renderStepIndicator()}
        <div className="bg-white border border-[#D1D9E6] rounded-xl p-6">{stepRenderers[step]()}</div>
        {step < 4 && (
          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#6B7F96] hover:text-[#0B1628] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back</button>
            <button onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={!canAdvance()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#1e4d6b] text-white text-sm font-medium hover:bg-[#2a6a8f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Next <ArrowRight className="w-4 h-4" /></button>
          </div>)}
      </div>
    </div>
  );
}

export default CreateAgreementPage;