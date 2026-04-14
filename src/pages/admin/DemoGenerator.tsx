import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Users, Settings2, ArrowRight, AlertTriangle, Sparkles, CheckCircle2, Clock, Copy, Check, ExternalLink, Mail, Link2 } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { isBlockedDomain, KITCHEN_TYPES, OPERATION_VOLUMES, US_STATES } from '../../data/demoGeneratorData';
import { generateDemoData, GENERATION_STEPS } from '../../lib/demoDataGenerator';
import type { GenerationProgress } from '../../lib/demoDataGenerator';
import { DemoGenerationLoading } from '../../components/demo/DemoGenerationLoading';
import { supabase } from '../../lib/supabase';

interface FormData {
  prospectName: string;
  prospectEmail: string;
  prospectPhone: string;
  companyName: string;
  companyType: string;
  operationVolume: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  numLocations: number;
  demoDuration: number;
  includeTemperature: boolean;
  includeCompliance: boolean;
  includeInspections: boolean;
  includeVendors: boolean;
  includeCorrectiveActions: boolean;
  generateNow: boolean;
  scheduledDate: string;
}

interface GeneratedCredentials {
  email: string;
  temp_password: string;
}

export function DemoGenerator() {
  useDemoGuard();
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>({
    prospectName: '',
    prospectEmail: '',
    prospectPhone: '',
    companyName: '',
    companyType: 'restaurant',
    operationVolume: 'moderate',
    address: '',
    city: '',
    state: 'CA',
    zipCode: '',
    numLocations: 1,
    demoDuration: 14,
    includeTemperature: true,
    includeCompliance: true,
    includeInspections: true,
    includeVendors: true,
    includeCorrectiveActions: true,
    generateNow: true,
    scheduledDate: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<GenerationProgress[]>([]);
  const [success, setSuccess] = useState(false);
  const [credentials, setCredentials] = useState<GeneratedCredentials | null>(null);
  const [demoExpiresAt, setDemoExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const LOGIN_URL = `${window.location.origin}/login`;

  const update = (field: keyof FormData, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const copyCredentials = useCallback(() => {
    if (!credentials) return;
    const text = `Email: ${credentials.email}\nPassword: ${credentials.temp_password}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [credentials]);

  const copyLoginLink = useCallback(() => {
    navigator.clipboard.writeText(LOGIN_URL).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [LOGIN_URL]);

  const sendViaEmail = useCallback(() => {
    if (!credentials) return;
    const subject = encodeURIComponent(`Your EvidLY Demo Is Ready — ${form.companyName}`);
    const body = encodeURIComponent(
      `Hi ${form.prospectName},\n\n` +
      `Your personalized EvidLY demo is ready! Here are your login details:\n\n` +
      `Login URL: ${LOGIN_URL}\n` +
      `Email: ${credentials.email}\n` +
      `Password: ${credentials.temp_password}\n\n` +
      (demoExpiresAt ? `Your demo expires on ${new Date(demoExpiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.\n\n` : '') +
      `Log in and explore your jurisdiction-specific compliance dashboard, temperature monitoring, inspection readiness scoring, and more.\n\n` +
      `Questions? Reply to this email or book a walkthrough: https://calendly.com/founders-getevidly/60min\n\n` +
      `— The EvidLY Team`
    );
    window.open(`mailto:${credentials.email}?subject=${subject}&body=${body}`, '_self');
  }, [credentials, form.prospectName, form.companyName, demoExpiresAt, LOGIN_URL]);

  const handleGenerate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.prospectName || !form.prospectEmail || !form.companyName || !form.address || !form.city || !form.zipCode) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.prospectEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    const blockCheck = isBlockedDomain(form.prospectEmail);
    if (blockCheck.blocked) {
      setError(blockCheck.reason === 'competitor'
        ? "Blocked: competitor email domain detected."
        : "Blocked: disposable email domain.");
      return;
    }

    if (form.generateNow) {
      setGenerating(true);
      setGenerationSteps(GENERATION_STEPS.map(s => ({ ...s, status: 'pending' as const })));

      try {
        // -- Step 1: Create real DB account via edge function --
        // PROFILE DATA — writes to DB in all modes
        if (!isDemoMode) {
          // First, create a demo_sessions record
          const { data: sessionData } = await supabase
            .from('demo_sessions')
            .insert({
              prospect_name: form.prospectName,
              prospect_email: form.prospectEmail,
              prospect_phone: form.prospectPhone || null,
              company_name: form.companyName,
              company_type: form.companyType,
              operation_type: form.operationVolume,
              address: form.address,
              city: form.city,
              state: form.state,
              zip_code: form.zipCode,
              num_locations: form.numLocations,
              demo_duration_days: form.demoDuration,
              health_authority: `${form.city} County Department of Public Health`,
              fire_authority: `${form.city} Fire Department`,
              status: 'generating',
              assigned_rep_email: 'arthur@getevidly.com',
              created_by_type: 'sales_rep',
            })
            .select('id')
            .single();

          // Call edge function to create real auth account + org + locations
          const { data: accountData, error: accountError } = await supabase.functions.invoke(
            'demo-account-create',
            {
              body: {
                prospect_name: form.prospectName,
                prospect_email: form.prospectEmail,
                prospect_phone: form.prospectPhone,
                company_name: form.companyName,
                company_type: form.companyType,
                operation_type: form.operationVolume,
                address: form.address,
                city: form.city,
                state: form.state,
                zip_code: form.zipCode,
                num_locations: form.numLocations,
                demo_duration_days: form.demoDuration,
                demo_session_id: sessionData?.id || null,
              },
            }
          );

          if (accountError) {
            throw new Error(accountError.message || 'Failed to create demo account');
          }

          if (accountData?.error) {
            throw new Error(accountData.error);
          }

          if (accountData?.credentials) {
            setCredentials(accountData.credentials);
            setDemoExpiresAt(accountData.demo_expires_at);
          }
        } else {
          // Demo mode — show simulated credentials so the UI is fully demonstrable
          setCredentials({ email: form.prospectEmail, temp_password: 'demo-xxxxxxxx' });
          setDemoExpiresAt(new Date(Date.now() + form.demoDuration * 86400000).toISOString());
        }

        // -- Step 2: Generate mock operational data (local state) --
        // DEMO ONLY — local state, never persists
        await generateDemoData(
          {
            companyName: form.companyName,
            companyType: form.companyType,
            operationType: form.operationVolume as 'light' | 'moderate' | 'heavy' | 'institutional',
            city: form.city,
            county: '',
            state: form.state,
            zipCode: form.zipCode,
            healthAuthority: `${form.city} County Department of Public Health`,
            fireAuthority: `${form.city} Fire Department`,
            numLocations: form.numLocations,
            durationDays: form.demoDuration,
            includeInsights: [
              form.includeTemperature && 'temperature_trends',
              form.includeCompliance && 'compliance_progression',
              form.includeInspections && 'inspection_predictions',
              form.includeVendors && 'vendor_reminders',
              form.includeCorrectiveActions && 'corrective_actions',
            ].filter(Boolean) as string[],
          },
          (steps) => setGenerationSteps(steps),
        );

        setGenerating(false);
        setSuccess(true);
      } catch (err) {
        setGenerating(false);
        const message = err instanceof Error ? err.message : 'Demo generation failed. Please try again.';
        setError(message);
      }
    } else {
      // Schedule for later — create demo_sessions record only
      if (!isDemoMode) {
        await supabase
          .from('demo_sessions')
          .insert({
            prospect_name: form.prospectName,
            prospect_email: form.prospectEmail,
            prospect_phone: form.prospectPhone || null,
            company_name: form.companyName,
            company_type: form.companyType,
            operation_type: form.operationVolume,
            address: form.address,
            city: form.city,
            state: form.state,
            zip_code: form.zipCode,
            num_locations: form.numLocations,
            demo_duration_days: form.demoDuration,
            health_authority: `${form.city} County Department of Public Health`,
            fire_authority: `${form.city} Fire Department`,
            status: 'scheduled',
            scheduled_at: form.scheduledDate || null,
            assigned_rep_email: 'arthur@getevidly.com',
            created_by_type: 'sales_rep',
          });
      } else {
        // Session saved — success state shown below
      }
      setSuccess(true);
    }
  }, [form, isDemoMode]);

  // -- Loading Screen --
  if (generating) {
    return (
      <DemoGenerationLoading
        companyName={form.companyName}
        city={form.city}
        state={form.state}
        steps={generationSteps}
      />
    );
  }

  // -- Success Screen --
  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-xl border border-navy/10 p-8 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-[#dcfce7]">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-navy">
            {form.generateNow ? 'Demo Account Ready!' : 'Demo Scheduled!'}
          </h2>
          <p className="text-navy/70 mb-1">
            Personalized demo for <span className="font-semibold">{form.companyName}</span>
          </p>
          <p className="text-navy/50 text-sm mb-4">
            {form.city}, {form.state} | {KITCHEN_TYPES.find(t => t.value === form.companyType)?.label} | {OPERATION_VOLUMES.find(v => v.value === form.operationVolume)?.label} Volume
          </p>

          {/* Login URL */}
          {credentials && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-4 text-left">
              <h3 className="text-sm font-semibold mb-2 text-navy">Login URL</h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm text-blue-800 bg-white px-3 py-1.5 rounded border border-blue-200 truncate">{LOGIN_URL}</code>
                <button
                  onClick={copyLoginLink}
                  className="flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium border border-blue-300 hover:bg-blue-100 transition-colors flex items-center gap-1.5 text-navy"
                >
                  {linkCopied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied</> : <><Link2 className="w-3.5 h-3.5" /> Copy Link</>}
                </button>
              </div>
            </div>
          )}

          {/* Credentials display */}
          {credentials && (
            <div className="bg-cream rounded-xl border border-navy/10 p-4 mb-4 text-left">
              <h3 className="text-sm font-semibold mb-3 text-navy">Login Credentials</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-navy/50">Email:</span>
                  <code className="font-mono text-navy/90 bg-white px-2 py-0.5 rounded border border-navy/10">{credentials.email}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-navy/50">Password:</span>
                  <code className="font-mono text-navy/90 bg-white px-2 py-0.5 rounded border border-navy/10">{credentials.temp_password}</code>
                </div>
                {demoExpiresAt && (
                  <div className="flex items-center justify-between pt-1 border-t border-navy/10">
                    <span className="text-navy/50">Expires:</span>
                    <span className="text-navy/80">{new Date(demoExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
              <button
                onClick={copyCredentials}
                className="mt-3 w-full px-3 py-2 rounded-md text-sm font-medium border border-navy/15 hover:bg-navy/5 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? <><Check className="w-4 h-4 text-green-600" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Credentials</>}
              </button>
            </div>
          )}

          {/* Send via Email */}
          {credentials && (
            <button
              onClick={sendViaEmail}
              className="w-full mb-6 px-4 py-2.5 rounded-lg font-medium text-sm text-white bg-gold hover:bg-[#b8982e] transition-colors flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" /> Send Credentials via Email
            </button>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/admin/demos')}
              className="px-6 py-2.5 rounded-lg text-white font-medium text-sm bg-navy"
            >
              View Demo Pipeline
            </button>
            <button
              onClick={() => { setSuccess(false); setCredentials(null); setDemoExpiresAt(null); setLinkCopied(false); setForm(f => ({ ...f, prospectName: '', prospectEmail: '', prospectPhone: '', companyName: '', address: '', city: '', zipCode: '' })); }}
              className="px-6 py-2.5 rounded-lg font-medium text-sm border border-navy/15 text-navy/80 hover:bg-cream"
            >
              Generate Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-navy/15 focus:border-navy focus:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2/20 outline-none transition-colors text-sm';
  const labelClass = 'block text-sm font-medium text-navy/80 mb-1';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <AdminBreadcrumb crumbs={[{ label: 'Demo Generator' }]} />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-navy/[0.06]">
          <Sparkles className="w-5 h-5 text-navy" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy">Generate Custom Demo for Prospect</h1>
          <p className="text-sm text-navy/50">Build a personalized, jurisdiction-accurate demo environment</p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-0">
        {/* Prospect Information */}
        <div className="bg-white rounded-t-xl border border-navy/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-navy" />
            <h2 className="font-semibold text-sm text-navy">PROSPECT INFORMATION</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name *</label>
              <input type="text" className={inputClass} value={form.prospectName}
                onChange={e => update('prospectName', e.target.value)} placeholder="Prospect name" />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input type="email" className={inputClass} value={form.prospectEmail}
                onChange={e => update('prospectEmail', e.target.value)} placeholder="prospect@company.com" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Phone</label>
              <input type="tel" className={inputClass} value={form.prospectPhone}
                onChange={e => update('prospectPhone', e.target.value)} placeholder="(555) 555-1234" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Company Name *</label>
              <input type="text" className={inputClass} value={form.companyName}
                onChange={e => update('companyName', e.target.value)} placeholder="Company name" />
            </div>
          </div>
        </div>

        {/* Kitchen Details */}
        <div className="bg-white border-x border-b border-navy/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-navy" />
            <h2 className="font-semibold text-sm text-navy">KITCHEN DETAILS</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Kitchen Type *</label>
              <select className={inputClass} value={form.companyType}
                onChange={e => update('companyType', e.target.value)}>
                {KITCHEN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Operation Volume *</label>
              <select className={inputClass} value={form.operationVolume}
                onChange={e => update('operationVolume', e.target.value)}>
                {OPERATION_VOLUMES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white border-x border-b border-navy/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-navy" />
            <h2 className="font-semibold text-sm text-navy">LOCATION</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Address *</label>
              <input type="text" className={inputClass} value={form.address}
                onChange={e => update('address', e.target.value)} placeholder="123 Main St" />
            </div>
            <div>
              <label className={labelClass}>City *</label>
              <input type="text" className={inputClass} value={form.city}
                onChange={e => update('city', e.target.value)} placeholder="Fresno" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>State *</label>
                <select className={inputClass} value={form.state}
                  onChange={e => update('state', e.target.value)}>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Zip Code *</label>
                <input type="text" className={inputClass} value={form.zipCode}
                  onChange={e => update('zipCode', e.target.value)} placeholder="93721" maxLength={10} />
              </div>
            </div>
            <div>
              <label className={labelClass}># of Locations</label>
              <select className={inputClass} value={form.numLocations}
                onChange={e => update('numLocations', parseInt(e.target.value))}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Demo Options */}
        <div className="bg-white border-x border-b border-navy/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-5 h-5 text-navy" />
            <h2 className="font-semibold text-sm text-navy">DEMO OPTIONS</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Demo Duration</label>
              <select className={inputClass} value={form.demoDuration}
                onChange={e => update('demoDuration', parseInt(e.target.value))}>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Include Insights</label>
              <div className="space-y-2 mt-1">
                {[
                  { key: 'includeTemperature', label: 'Temperature trends' },
                  { key: 'includeCompliance', label: 'Compliance score progression' },
                  { key: 'includeInspections', label: 'Inspection predictions' },
                  { key: 'includeVendors', label: 'Vendor service reminders' },
                  { key: 'includeCorrectiveActions', label: 'Sample corrective actions' },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm text-navy/80">
                    <input
                      type="checkbox"
                      checked={form[opt.key as keyof FormData] as boolean}
                      onChange={e => update(opt.key as keyof FormData, e.target.checked)}
                      className="rounded border-navy/15"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Demo Timing */}
        <div className="bg-white border-x border-b border-navy/10 rounded-b-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-navy" />
            <h2 className="font-semibold text-sm text-navy">DEMO TIMING</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-navy/80">
              <input type="radio" name="timing" checked={form.generateNow}
                onChange={() => update('generateNow', true)} className="text-navy" />
              Generate demo now (ready immediately)
            </label>
            <label className="flex items-center gap-2 text-sm text-navy/80">
              <input type="radio" name="timing" checked={!form.generateNow}
                onChange={() => update('generateNow', false)} className="text-navy" />
              Schedule meeting first
            </label>
            {!form.generateNow && (
              <div className="ml-6">
                <input type="datetime-local" className={inputClass} value={form.scheduledDate}
                  onChange={e => update('scheduledDate', e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 mt-4">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            className="px-8 py-3 rounded-lg font-semibold text-white bg-navy hover:bg-navy-light transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate Demo & Save
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default DemoGenerator;
