/**
 * Survey Settings Page — configure survey behavior.
 * Route: /settings/surveys (authenticated)
 */
import { useState, useEffect } from 'react';
import { Save, ExternalLink, TestTube, Mail, MessageSquare, Clock, Star, Bell } from 'lucide-react';
import { useSurveySettings, useUpdateSurveySettings, type SurveySettings } from '../../hooks/api/useSurveys';

export function SurveySettingsPage() {
  const { data: settings, isLoading } = useSurveySettings();
  const { mutate: updateSettings } = useUpdateSurveySettings();

  const [form, setForm] = useState<Partial<SurveySettings>>({
    send_delay_hours: 24,
    send_time: '09:00',
    expiry_days: 7,
    reminder_days: 3,
    google_business_url: '',
    google_review_threshold: 4,
    send_via_email: true,
    send_via_sms: false,
    email_subject: 'How was your service with HoodOps?',
    sms_template: 'Hi {contact_name}, how was your recent service? Rate us: {survey_link}',
    auto_respond_enabled: true,
    auto_respond_threshold: 3,
    auto_respond_recipients: [],
    is_active: true,
  });
  const [recipientInput, setRecipientInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      updateSettings(form as SurveySettings);
      alert('Settings saved successfully.');
    } catch {
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const addRecipient = () => {
    const email = recipientInput.trim();
    if (email && !form.auto_respond_recipients?.includes(email)) {
      setForm({ ...form, auto_respond_recipients: [...(form.auto_respond_recipients || []), email] });
      setRecipientInput('');
    }
  };

  const removeRecipient = (email: string) => {
    setForm({ ...form, auto_respond_recipients: (form.auto_respond_recipients || []).filter(e => e !== email) });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Survey Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure automated customer feedback surveys</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#1e4d6b] text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#163a52] disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Enable/Disable */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Survey System</h2>
            <p className="text-sm text-gray-500">Automatically send surveys after job completion</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1e4d6b]" />
          </label>
        </div>
      </div>

      {/* Timing */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-[#1e4d6b]" />
          <h2 className="text-lg font-semibold text-gray-900">Timing</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send delay (hours after job)</label>
            <input
              type="number"
              value={form.send_delay_hours ?? 24}
              onChange={(e) => setForm({ ...form, send_delay_hours: parseInt(e.target.value) || 24 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
              min={1} max={168}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send time (local)</label>
            <input
              type="time"
              value={form.send_time ?? '09:00'}
              onChange={(e) => setForm({ ...form, send_time: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry (days)</label>
            <input
              type="number"
              value={form.expiry_days ?? 7}
              onChange={(e) => setForm({ ...form, expiry_days: parseInt(e.target.value) || 7 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
              min={1} max={30}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reminder after (days)</label>
            <input
              type="number"
              value={form.reminder_days ?? 3}
              onChange={(e) => setForm({ ...form, reminder_days: parseInt(e.target.value) || 3 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
              min={1} max={14}
            />
          </div>
        </div>
      </div>

      {/* Channels */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-[#1e4d6b]" />
          <h2 className="text-lg font-semibold text-gray-900">Channels</h2>
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.send_via_email ?? true}
              onChange={(e) => setForm({ ...form, send_via_email: e.target.checked })}
              className="w-4 h-4 text-[#1e4d6b] rounded focus:ring-[#1e4d6b]"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Email</span>
              <p className="text-xs text-gray-500">Send survey invitations via email</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.send_via_sms ?? false}
              onChange={(e) => setForm({ ...form, send_via_sms: e.target.checked })}
              className="w-4 h-4 text-[#1e4d6b] rounded focus:ring-[#1e4d6b]"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">SMS</span>
              <p className="text-xs text-gray-500">Send survey invitations via text message</p>
            </div>
          </label>
        </div>
        {form.send_via_email && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email subject</label>
            <input
              type="text"
              value={form.email_subject ?? ''}
              onChange={(e) => setForm({ ...form, email_subject: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
              placeholder="How was your service with {company_name}?"
            />
          </div>
        )}
        {form.send_via_sms && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">SMS template</label>
            <textarea
              value={form.sms_template ?? ''}
              onChange={(e) => setForm({ ...form, sms_template: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent resize-none"
              placeholder="Hi {contact_name}, rate us: {survey_link}"
            />
          </div>
        )}
      </div>

      {/* Google Review */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-[#1e4d6b]" />
          <h2 className="text-lg font-semibold text-gray-900">Google Review</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Business Profile URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={form.google_business_url ?? ''}
                onChange={(e) => setForm({ ...form, google_business_url: e.target.value })}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                placeholder="https://g.page/r/your-place-id/review"
              />
              {form.google_business_url && (
                <a
                  href={form.google_business_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  <TestTube className="w-4 h-4" />
                  Test
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Format: https://g.page/r/PLACE_ID/review</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum rating to prompt review</label>
            <select
              value={form.google_review_threshold ?? 4}
              onChange={(e) => setForm({ ...form, google_review_threshold: parseInt(e.target.value) })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
            >
              <option value={3}>3+ stars</option>
              <option value={4}>4+ stars</option>
              <option value={5}>5 stars only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-[#1e4d6b]" />
          <h2 className="text-lg font-semibold text-gray-900">Low Rating Alerts</h2>
        </div>
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={form.auto_respond_enabled ?? true}
            onChange={(e) => setForm({ ...form, auto_respond_enabled: e.target.checked })}
            className="w-4 h-4 text-[#1e4d6b] rounded focus:ring-[#1e4d6b]"
          />
          <span className="text-sm font-medium text-gray-900">Send alerts for low ratings</span>
        </label>
        {form.auto_respond_enabled && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Alert threshold</label>
              <select
                value={form.auto_respond_threshold ?? 3}
                onChange={(e) => setForm({ ...form, auto_respond_threshold: parseInt(e.target.value) })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
              >
                <option value={1}>1 star only</option>
                <option value={2}>2 stars or below</option>
                <option value={3}>3 stars or below</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alert recipients</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                  placeholder="email@example.com"
                />
                <button onClick={addRecipient} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(form.auto_respond_recipients || []).map((email) => (
                  <span key={email} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                    {email}
                    <button onClick={() => removeRecipient(email)} className="text-gray-400 hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
