import { useState, useEffect } from 'react';
import { Building2, Globe, Palette, Save, Upload, Loader2 } from 'lucide-react';
import { useVendorSettings, useUpdateVendorSettings } from '../../hooks/api/useSettings';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, TEXT_TERTIARY, NAVY, FONT,
} from '@shared/components/dashboard/shared/constants';

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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 8,
  fontSize: 14,
  color: BODY_TEXT,
  background: '#fff',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: BODY_TEXT,
  marginBottom: 4,
};

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 12,
  boxShadow: CARD_SHADOW,
  padding: 24,
  marginBottom: 20,
};

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: '0 0 16px' }}>
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
    primaryColor: '#1e4d6b',
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
        primaryColor: settings.primaryColor || '#1e4d6b',
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
          <div key={i} style={{ ...cardStyle, height: 180 }}>
            <div style={{ background: PANEL_BG, borderRadius: 8, height: 20, width: 200, marginBottom: 16 }} />
            <div style={{ background: PANEL_BG, borderRadius: 8, height: 14, width: '60%', marginBottom: 10 }} />
            <div style={{ background: PANEL_BG, borderRadius: 8, height: 14, width: '40%' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ ...FONT }}>
      {/* Company Information */}
      <div style={cardStyle}>
        <SectionTitle icon={Building2} title="Company Information" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Company Name</label>
            <input
              style={inputStyle}
              value={form.companyName}
              onChange={e => handleChange('companyName', e.target.value)}
              placeholder="HoodOps"
            />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input
              style={inputStyle}
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              style={inputStyle}
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="info@hoodops.com"
            />
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input
              style={inputStyle}
              value={form.website}
              onChange={e => handleChange('website', e.target.value)}
              placeholder="https://hoodops.com"
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Street Address</label>
          <input
            style={inputStyle}
            value={form.street}
            onChange={e => handleChange('street', e.target.value)}
            placeholder="123 Main St"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginTop: 12 }}>
          <div>
            <label style={labelStyle}>City</label>
            <input
              style={inputStyle}
              value={form.city}
              onChange={e => handleChange('city', e.target.value)}
              placeholder="Fresno"
            />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <input
              style={inputStyle}
              value={form.state}
              onChange={e => handleChange('state', e.target.value)}
              placeholder="CA"
              maxLength={2}
            />
          </div>
          <div>
            <label style={labelStyle}>ZIP</label>
            <input
              style={inputStyle}
              value={form.zip}
              onChange={e => handleChange('zip', e.target.value)}
              placeholder="93721"
            />
          </div>
        </div>
      </div>

      {/* Business Settings */}
      <div style={cardStyle}>
        <SectionTitle icon={Globe} title="Business Settings" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Timezone</label>
            <select
              style={inputStyle}
              value={form.timezone}
              onChange={e => handleChange('timezone', e.target.value)}
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date Format</label>
            <select
              style={inputStyle}
              value={form.dateFormat}
              onChange={e => handleChange('dateFormat', e.target.value)}
            >
              {DATE_FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Currency</label>
            <select
              style={inputStyle}
              value={form.currency}
              onChange={e => handleChange('currency', e.target.value)}
            >
              {CURRENCIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Fiscal Year Start</label>
            <select
              style={inputStyle}
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
      <div style={cardStyle}>
        <SectionTitle icon={Palette} title="Branding" />

        {/* Logo upload */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Company Logo</label>
          <div
            style={{
              border: `2px dashed ${CARD_BORDER}`,
              borderRadius: 10,
              padding: '32px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: PANEL_BG,
            }}
            onClick={() => alert('Logo upload coming soon')}
          >
            <Upload size={28} style={{ color: TEXT_TERTIARY, margin: '0 auto 8px' }} />
            <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
              Click to upload logo (PNG, SVG, max 2MB)
            </p>
          </div>
        </div>

        {/* Primary color */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Primary Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="color"
              value={form.primaryColor}
              onChange={e => handleChange('primaryColor', e.target.value)}
              style={{ width: 40, height: 40, border: `1px solid ${CARD_BORDER}`, borderRadius: 8, cursor: 'pointer', padding: 2 }}
            />
            <input
              style={{ ...inputStyle, width: 140 }}
              value={form.primaryColor}
              onChange={e => handleChange('primaryColor', e.target.value)}
              placeholder="#1e4d6b"
            />
          </div>
        </div>

        {/* Certificate text */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Certificate Header Text</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={form.certHeaderText}
              onChange={e => handleChange('certHeaderText', e.target.value)}
              placeholder="Certificate of Compliance"
            />
          </div>
          <div>
            <label style={labelStyle}>Certificate Footer Text</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={form.certFooterText}
              onChange={e => handleChange('certFooterText', e.target.value)}
              placeholder="This document certifies that..."
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 24px',
            borderRadius: 8,
            border: 'none',
            background: NAVY,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
