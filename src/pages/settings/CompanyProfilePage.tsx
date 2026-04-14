import { useState, useEffect } from 'react';
import { Building2, Globe, Palette, Save, Upload, Loader2 } from 'lucide-react';
import { useVendorSettings, useUpdateVendorSettings } from '../../hooks/api/useSettings';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, TEXT_TERTIARY, NAVY, FONT,
} from '../../components/dashboard/shared/constants';

const TIMEZONES = (() => {
  try {
    return (Intl as any).supportedValuesOf?.('timeZone') as string[] ?? ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'];
  } catch {
    return ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'];
  }
})();

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'EUR', label: 'EUR — Euro' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const inputClasses = 'w-full px-3 py-2 border border-[#D1D9E6] rounded-lg text-sm text-[#0B1628] bg-white outline-none';
const labelClasses = 'block text-[13px] font-semibold text-[#0B1628] mb-1';
const cardClasses = 'bg-white border border-[#D1D9E6] rounded-xl shadow-[0_1px_3px_rgba(11,22,40,.06),0_1px_2px_rgba(11,22,40,.04)] p-6 mb-5';

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-bold text-[#0B1628] mb-4 mt-0">
      <Icon size={18} color={NAVY} /> {title}
    </h2>
  );
}

export function CompanyProfilePage() {
  const { data: settings, isLoading } = useVendorSettings();
  const { mutate: updateSettings, isLoading: saving } = useUpdateVendorSettings();

  const [form, setForm] = useState({
    companyName: '',
    phone: '',
    email: '',
    website: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    fiscalYearStart: 1,
    primaryColor: '#1E2D4D',
    certHeaderText: '',
    certFooterText: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        companyName: settings.companyName || '',
        phone: settings.phone || '',
        email: settings.email || '',
        website: settings.website || '',
        street: settings.address?.street || '',
        city: settings.address?.city || '',
        state: settings.address?.state || '',
        zip: settings.address?.zip || '',
        timezone: settings.timezone || 'America/Los_Angeles',
        dateFormat: settings.dateFormat || 'MM/DD/YYYY',
        currency: settings.currency || 'USD',
        fiscalYearStart: settings.fiscalYearStart || 1,
        primaryColor: settings.primaryColor || '#1E2D4D',
        certHeaderText: settings.certHeaderText || '',
        certFooterText: settings.certFooterText || '',
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateSettings({
        companyName: form.companyName,
        phone: form.phone,
        email: form.email,
        website: form.website,
        address: { street: form.street, city: form.city, state: form.state, zip: form.zip },
        timezone: form.timezone,
        dateFormat: form.dateFormat as any,
        currency: form.currency as any,
        fiscalYearStart: form.fiscalYearStart,
        primaryColor: form.primaryColor,
        certHeaderText: form.certHeaderText,
        certFooterText: form.certFooterText,
      });
      alert('Settings saved successfully');
    } catch {
      alert('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div style={{ ...FONT }}>
        {[1, 2, 3].map(i => (
          <div key={i} className={`${cardClasses} h-[180px]`}>
            <div className="bg-[#EEF1F7] rounded-lg h-5 w-[200px] mb-4" />
            <div className="bg-[#EEF1F7] rounded-lg h-3.5 w-3/5 mb-2.5" />
            <div className="bg-[#EEF1F7] rounded-lg h-3.5 w-2/5" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ ...FONT }}>
      {/* Company Information */}
      <div className={cardClasses}>
        <SectionTitle icon={Building2} title="Company Information" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          <div>
            <label className={labelClasses}>Company Name</label>
            <input
              className={inputClasses}
              value={form.companyName}
              onChange={e => handleChange('companyName', e.target.value)}
              placeholder="HoodOps"
            />
          </div>
          <div>
            <label className={labelClasses}>Phone</label>
            <input
              className={inputClasses}
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className={labelClasses}>Email</label>
            <input
              className={inputClasses}
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="info@hoodops.com"
            />
          </div>
          <div>
            <label className={labelClasses}>Website</label>
            <input
              className={inputClasses}
              value={form.website}
              onChange={e => handleChange('website', e.target.value)}
              placeholder="https://hoodops.com"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClasses}>Street Address</label>
          <input
            className={inputClasses}
            value={form.street}
            onChange={e => handleChange('street', e.target.value)}
            placeholder="123 Main St"
          />
        </div>

        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 mt-3">
          <div>
            <label className={labelClasses}>City</label>
            <input
              className={inputClasses}
              value={form.city}
              onChange={e => handleChange('city', e.target.value)}
              placeholder="Fresno"
            />
          </div>
          <div>
            <label className={labelClasses}>State</label>
            <input
              className={inputClasses}
              value={form.state}
              onChange={e => handleChange('state', e.target.value)}
              placeholder="CA"
              maxLength={2}
            />
          </div>
          <div>
            <label className={labelClasses}>ZIP</label>
            <input
              className={inputClasses}
              value={form.zip}
              onChange={e => handleChange('zip', e.target.value)}
              placeholder="93721"
            />
          </div>
        </div>
      </div>

      {/* Business Settings */}
      <div className={cardClasses}>
        <SectionTitle icon={Globe} title="Business Settings" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          <div>
            <label className={labelClasses}>Timezone</label>
            <select
              className={inputClasses}
              value={form.timezone}
              onChange={e => handleChange('timezone', e.target.value)}
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClasses}>Date Format</label>
            <select
              className={inputClasses}
              value={form.dateFormat}
              onChange={e => handleChange('dateFormat', e.target.value)}
            >
              {DATE_FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClasses}>Currency</label>
            <select
              className={inputClasses}
              value={form.currency}
              onChange={e => handleChange('currency', e.target.value)}
            >
              {CURRENCIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClasses}>Fiscal Year Start</label>
            <select
              className={inputClasses}
              value={form.fiscalYearStart}
              onChange={e => handleChange('fiscalYearStart', Number(e.target.value))}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className={cardClasses}>
        <SectionTitle icon={Palette} title="Branding" />

        {/* Logo upload */}
        <div className="mb-5">
          <label className={labelClasses}>Company Logo</label>
          <div
            className="border-2 border-dashed border-[#D1D9E6] rounded-[10px] py-8 px-5 text-center cursor-pointer bg-[#EEF1F7]"
            onClick={() => alert('Logo upload coming soon')}
          >
            <Upload size={28} className="text-[#6B7F96] mx-auto mb-2" />
            <p className="text-[#3D5068] text-[13px] m-0">
              Click to upload logo (PNG, SVG, max 2MB)
            </p>
          </div>
        </div>

        {/* Primary color */}
        <div className="mb-4">
          <label className={labelClasses}>Primary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primaryColor}
              onChange={e => handleChange('primaryColor', e.target.value)}
              className="w-10 h-10 border border-[#D1D9E6] rounded-lg cursor-pointer p-0.5"
            />
            <input
              className={`${inputClasses} !w-[140px]`}
              value={form.primaryColor}
              onChange={e => handleChange('primaryColor', e.target.value)}
              placeholder="#1E2D4D"
            />
          </div>
        </div>

        {/* Certificate text */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Certificate Header Text</label>
            <textarea
              className={`${inputClasses} min-h-[80px] resize-y`}
              value={form.certHeaderText}
              onChange={e => handleChange('certHeaderText', e.target.value)}
              placeholder="Certificate of Compliance"
            />
          </div>
          <div>
            <label className={labelClasses}>Certificate Footer Text</label>
            <textarea
              className={`${inputClasses} min-h-[80px] resize-y`}
              value={form.certFooterText}
              onChange={e => handleChange('certFooterText', e.target.value)}
              placeholder="This document certifies that..."
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 py-2.5 px-6 rounded-lg border-none bg-[#163a5f] text-white text-sm font-semibold ${saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100'}`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
