import { useState, useEffect } from 'react';
import { User, Building2, Bell, Lock, CreditCard, Upload, MapPin, Plug, CheckCircle2, Eye, EyeOff, Clock, Megaphone, Globe, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ReportSettings } from '../components/ReportSettings';
import { getAvailableCounties } from '../lib/jurisdictionScoring';
import { Breadcrumb } from '../components/Breadcrumb';
import { useRole, UserRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { useOperatingHours, generateOpeningTimes, generateClosingTimes, generateAllTimes, DAY_LABELS, formatTime24to12 } from '../contexts/OperatingHoursContext';
import { useTranslation } from '../contexts/LanguageContext';
import { SUPPORTED_LOCALES, LOCALE_META, type Locale } from '../lib/i18n';

const ROLE_DEMO_PROFILES: Record<UserRole, { name: string; role: string; email: string }> = {
  executive: { name: 'James Wilson', role: 'Executive', email: 'james.wilson@pacificcoastdining.com' },
  management: { name: 'Sarah Chen', role: 'Management', email: 'sarah.chen@pacificcoastdining.com' },
  kitchen: { name: 'Marcus Johnson', role: 'Kitchen Staff', email: 'marcus.johnson@pacificcoastdining.com' },
  facilities: { name: 'Mike Thompson', role: 'Facilities', email: 'mike.thompson@pacificcoastdining.com' },
};

export function Settings() {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const { isDemoMode } = useDemo();
  const { locationHours, updateLocationHours, getShiftsForLocation, addShift, removeShift, updateShift } = useOperatingHours();
  const { t, locale, setLocale } = useTranslation();
  const navigate = useNavigate();
  const canEditHours = userRole === 'executive' || userRole === 'management';
  const [activeTab, setActiveTab] = useState('profile');
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    email_enabled: true,
    sms_enabled: false,
    quiet_hours_start: '20:00',
    quiet_hours_end: '08:00',
    reminder_frequency: 'per_event',
  });
  const [saving, setSaving] = useState(false);
  const [benchmarkOptIn, setBenchmarkOptIn] = useState(true);

  // Tab names resolved at render time via i18n
  const tabI18n: Record<string, string> = {
    profile: t('settings.profile'),
    organization: t('settings.organization'),
    'operating-hours': t('settings.hoursAndShifts'),
    notifications: t('settings.notifications'),
    integrations: t('settings.integrations'),
    security: t('settings.security'),
    billing: t('settings.billing'),
    'regulatory-monitoring': 'Regulatory Monitoring',
    jurisdiction: 'Jurisdiction Profile',
    privacy: 'Privacy',
  };

  const allTabs = [
    { id: 'profile', icon: User, roles: ['executive', 'management', 'kitchen', 'facilities'] as UserRole[] },
    { id: 'organization', icon: Building2, roles: ['executive', 'management'] as UserRole[] },
    { id: 'operating-hours', icon: Clock, roles: ['executive', 'management', 'kitchen', 'facilities'] as UserRole[] },
    { id: 'notifications', icon: Bell, roles: ['executive', 'management', 'kitchen', 'facilities'] as UserRole[] },
    { id: 'regulatory-monitoring', icon: Megaphone, roles: ['executive', 'management'] as UserRole[] },
    { id: 'jurisdiction', icon: Globe, roles: ['executive', 'management'] as UserRole[] },
    { id: 'integrations', icon: Plug, roles: ['executive', 'management'] as UserRole[] },
    { id: 'privacy', icon: Shield, roles: ['executive', 'management'] as UserRole[] },
    { id: 'security', icon: Lock, roles: ['executive', 'management', 'kitchen', 'facilities'] as UserRole[] },
    { id: 'billing', icon: CreditCard, roles: ['executive'] as UserRole[] },
  ];

  const tabs = allTabs.filter(tab => tab.roles.includes(userRole));

  // Day labels translated
  const dayLabelsI18n = [
    t('settings.mon'), t('settings.tue'), t('settings.wed'), t('settings.thu'),
    t('settings.fri'), t('settings.sat'), t('settings.sun'),
  ];

  useEffect(() => {
    loadNotificationSettings();
  }, [profile]);

  const loadNotificationSettings = async () => {
    if (!profile?.id) return;

    const { data } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (data) {
      setNotificationSettings({
        email_enabled: data.email_enabled,
        sms_enabled: data.sms_enabled,
        quiet_hours_start: data.quiet_hours_start,
        quiet_hours_end: data.quiet_hours_end,
        reminder_frequency: data.reminder_frequency,
      });
    }
  };

  const saveNotificationSettings = async () => {
    if (!profile?.id) return;

    setSaving(true);

    const { data: existing } = await supabase
      .from('notification_settings')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('notification_settings')
        .update({
          ...notificationSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', profile.id);
    } else {
      await supabase
        .from('notification_settings')
        .insert({
          user_id: profile.id,
          ...notificationSettings,
        });
    }

    setSaving(false);
  };

  // Alert type labels for notifications section
  const alertTypes = [
    { key: 'settings.docExpirationAlerts', desc: 'Alerts when vendor or employee documents are expiring', checked: true },
    { key: 'settings.tempViolations', desc: 'Alerts when temperature readings exceed safe limits', checked: true },
    { key: 'settings.haccpCcpFailures', desc: 'Critical alerts for food safety violations', checked: true },
    { key: 'settings.checklistReminders', desc: 'Reminders for incomplete daily checklists', checked: true },
    { key: 'settings.complianceScoreChanges', desc: 'Weekly compliance score updates', checked: false },
  ];

  // Billing features
  const billingFeatures = [
    t('settings.unlimitedTeamMembers'),
    t('settings.upTo10Locations'),
    t('settings.aiComplianceAdvisor'),
    t('settings.haccpPlanManagement'),
    t('settings.vendorComplianceTracking'),
    t('settings.customReports'),
    t('settings.emailSmsNotifications'),
    t('settings.prioritySupport'),
  ];

  return (
    <>
      <Breadcrumb items={[{ label: t('nav.dashboard'), href: '/dashboard' }, { label: t('settings.title') }]} />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('settings.subtitle')}</p>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        <div className="lg:w-64 flex-shrink-0">
          <nav className="bg-white rounded-lg shadow overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#1e4d6b] text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tabI18n[tab.id]}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 bg-white rounded-lg shadow p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">{t('settings.profileSettings')}</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.fullName')}</label>
                <input
                  type="text"
                  defaultValue={isDemoMode ? ROLE_DEMO_PROFILES[userRole].name : profile?.full_name}
                  key={`name-${userRole}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.email')}</label>
                <input
                  type="email"
                  defaultValue={isDemoMode ? ROLE_DEMO_PROFILES[userRole].email : profile?.email || ''}
                  key={`email-${userRole}`}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.role')}</label>
                <input
                  type="text"
                  defaultValue={isDemoMode ? ROLE_DEMO_PROFILES[userRole].role : profile?.role}
                  key={`role-${userRole}`}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>

              {/* Language preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.preferredLanguage')}</label>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  {SUPPORTED_LOCALES.map((loc) => (
                    <option key={loc} value={loc}>
                      {LOCALE_META[loc as Locale].flag} {LOCALE_META[loc as Locale].label}
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={() => alert('Profile saved.')} className="px-6 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150">
                {t('settings.saveChanges')}
              </button>
            </div>
          )}

          {activeTab === 'organization' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">{t('settings.orgSettings')}</h3>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.companyLogo')}</label>
                <div className="flex items-center gap-4">
                  <div
                    className="flex items-center justify-center"
                    style={{ width: '80px', height: '80px', border: '2px dashed #d1d5db', borderRadius: '12px', backgroundColor: '#f9fafb' }}
                  >
                    <div className="text-center">
                      <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <span style={{ fontSize: '10px', color: '#9ca3af' }}>{t('settings.upload')}</span>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => alert('Logo upload coming soon. (Demo mode)')}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                    >
                      {t('settings.chooseFile')}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">{t('settings.logoHint')}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.orgName')}</label>
                <input
                  type="text"
                  defaultValue="Pacific Coast Dining"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.industry')}</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
                  <option>{t('settings.restaurant')}</option>
                  <option>{t('settings.foodManufacturing')}</option>
                  <option>{t('settings.catering')}</option>
                  <option>{t('settings.retailFood')}</option>
                </select>
              </div>

              {/* Locations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">{t('settings.locations')}</label>
                <div className="space-y-3">
                  {[
                    { name: 'Downtown Kitchen', address: '1245 Fulton Street, Fresno, CA 93721' },
                    { name: 'Airport Cafe', address: '1636 Macready Drive, Merced, CA 95340' },
                    { name: 'University Dining', address: '1 University Circle, Modesto, CA 95348' },
                  ].map((loc) => (
                    <div key={loc.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-[#1e4d6b]" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{loc.name}</div>
                          <div className="text-xs text-gray-500">{loc.address}</div>
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{t('settings.active')}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => alert('Add location coming soon. (Demo mode)')}
                  className="mt-3 px-4 py-2 text-sm border border-dashed border-gray-300 rounded-md hover:bg-gray-50 text-gray-600 w-full"
                >
                  {t('settings.addLocation')}
                </button>
              </div>

              <button onClick={() => alert('Organization settings saved.')} className="px-6 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150">
                {t('settings.saveChanges')}
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">{t('settings.notifPreferences')}</h3>

              {/* TODO: Email/SMS notification templates should respect user language preference (Resend/Twilio) */}

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">{t('settings.deliveryMethods')}</h4>
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={notificationSettings.email_enabled}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, email_enabled: e.target.checked })}
                        className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded mt-1"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{t('settings.emailNotifications')}</span>
                        <p className="text-xs text-gray-500">{t('settings.emailNotifDesc')}</p>
                      </div>
                    </label>
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={notificationSettings.sms_enabled}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, sms_enabled: e.target.checked })}
                        className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded mt-1"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{t('settings.smsNotifications')}</span>
                        <p className="text-xs text-gray-500">{t('settings.smsNotifDesc')}</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">{t('settings.alertTypes')}</h4>
                  <div className="space-y-3">
                    {alertTypes.map((item) => (
                      <label key={item.key} className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          defaultChecked={item.checked}
                          className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded mt-1"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{t(item.key)}</span>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">{t('settings.quietHours')}</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('settings.quietHoursDesc')}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.startTimeLabel')}</label>
                      <input
                        type="time"
                        value={notificationSettings.quiet_hours_start}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, quiet_hours_start: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.endTimeLabel')}</label>
                      <input
                        type="time"
                        value={notificationSettings.quiet_hours_end}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, quiet_hours_end: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">{t('settings.reminderFrequency')}</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="frequency"
                        value="per_event"
                        checked={notificationSettings.reminder_frequency === 'per_event'}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, reminder_frequency: e.target.value })}
                        className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{t('settings.perEvent')}</span>
                        <p className="text-xs text-gray-500">{t('settings.perEventDesc')}</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="frequency"
                        value="daily"
                        checked={notificationSettings.reminder_frequency === 'daily'}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, reminder_frequency: e.target.value })}
                        className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{t('settings.dailyDigest')}</span>
                        <p className="text-xs text-gray-500">{t('settings.dailyDigestDesc')}</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="frequency"
                        value="weekly"
                        checked={notificationSettings.reminder_frequency === 'weekly'}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, reminder_frequency: e.target.value })}
                        className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{t('settings.weeklyDigestSetting')}</span>
                        <p className="text-xs text-gray-500">{t('settings.weeklyDigestDesc')}</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{t('settings.docExpirationAlerts')}</h4>
                  <p className="text-sm text-gray-600">
                    You will automatically receive alerts for expiring documents:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>• {t('settings.days30before')}</li>
                    <li>• {t('settings.days14before')}</li>
                    <li>• {t('settings.days7before')}</li>
                    <li>• {t('settings.days1before')}</li>
                    <li>• {t('settings.dayOfExpiration')}</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={saveNotificationSettings}
                disabled={saving}
                className="px-6 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t('common.saving') : t('settings.savePreferences')}
              </button>

              <div className="border-t border-gray-200 pt-6 mt-8">
                <ReportSettings />
              </div>
            </div>
          )}

          {activeTab === 'regulatory-monitoring' && (
            <div className="space-y-6">
              {/* TODO: i18n for regulatory monitoring section */}
              <h3 className="text-xl font-bold text-gray-900">Regulatory Monitoring</h3>
              <p className="text-sm text-gray-600">Configure how EvidLY monitors regulatory changes and notifies your team.</p>

              {/* Enable/disable toggle */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Monitoring Status</h4>
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Enable Regulatory Alerts</span>
                    <p className="text-xs text-gray-500">Automatically monitor regulatory changes for your jurisdictions</p>
                  </div>
                  <div className="relative">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#d4af37] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1e4d6b]"></div>
                  </div>
                </label>
              </div>

              {/* Notification preferences */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Alert Notifications</h4>
                <div className="space-y-3">
                  <label className="flex items-start space-x-3">
                    <input type="checkbox" defaultChecked className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded mt-1" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">In-App Notifications</span>
                      <p className="text-xs text-gray-500">Show alerts in the notification bell and Regulatory Alerts page</p>
                    </div>
                  </label>
                  <label className="flex items-start space-x-3">
                    <input type="checkbox" defaultChecked className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded mt-1" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Email Notifications</span>
                      <p className="text-xs text-gray-500">Send email alerts for "Action Required" changes to selected roles</p>
                      {/* TODO: Wire to Resend for email delivery */}
                    </div>
                  </label>
                </div>
              </div>

              {/* Digest option */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Alert Delivery</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input type="radio" name="reg-delivery" defaultChecked className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Send individual alerts</span>
                      <p className="text-xs text-gray-500">Receive notifications as soon as changes are detected</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="radio" name="reg-delivery" className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Weekly regulatory digest every Monday</span>
                      <p className="text-xs text-gray-500">Receive a consolidated summary of all changes once per week</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Which roles receive alerts */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Email Alert Recipients</h4>
                <p className="text-xs text-gray-500 mb-3">Select which roles receive email alerts for regulatory changes</p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" defaultChecked className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded" />
                    <span className="text-sm text-gray-700">Executive View</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" defaultChecked className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded" />
                    <span className="text-sm text-gray-700">Management</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded" />
                    <span className="text-sm text-gray-700">Kitchen Staff</span>
                  </label>
                </div>
              </div>

              {/* Monitored jurisdictions */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Monitored Jurisdictions</h4>
                <p className="text-xs text-gray-500 mb-3">Auto-populated from your location addresses. Add custom jurisdictions if needed.</p>
                <div className="space-y-2">
                  {[
                    { name: 'Fresno County, CA', type: 'County' },
                    { name: 'Merced County, CA', type: 'County' },
                    { name: 'Stanislaus County, CA', type: 'County' },
                    { name: 'California (State)', type: 'State' },
                    { name: 'Federal (FDA, OSHA)', type: 'Federal' },
                  ].map((j) => (
                    <div key={j.name} className="flex items-center justify-between py-2 px-3 border border-gray-200 rounded-lg bg-white">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#1e4d6b]" />
                        <span className="text-sm text-gray-700">{j.name}</span>
                      </div>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{j.type}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => alert('Custom jurisdiction added. (Demo mode)')}
                    className="w-full py-2 text-sm border border-dashed border-gray-300 rounded-md hover:bg-gray-50 text-gray-600"
                  >
                    + Add Custom Jurisdiction
                  </button>
                </div>
              </div>

              <button onClick={() => alert('Regulatory monitoring preferences saved.')} className="px-6 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150">
                {t('settings.saveChanges')}
              </button>
            </div>
          )}

          {activeTab === 'jurisdiction' && (() => {
            const availableCounties = getAvailableCounties();
            const locationJurisdictions = [
              { name: 'Downtown Kitchen', detectedCounty: 'Fresno County', detectedSlug: 'fresno', chain: 'Federal → California → Fresno County' },
              { name: 'Airport Cafe', detectedCounty: 'Merced County', detectedSlug: 'merced', chain: 'Federal → California → Merced County' },
              { name: 'University Dining', detectedCounty: 'Stanislaus County', detectedSlug: 'stanislaus', chain: 'Federal → California → Stanislaus County → City of Modesto' },
            ];
            return (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Jurisdiction Profile</h3>
              <p className="text-sm text-gray-600">View and manage jurisdiction-specific compliance requirements for each location.</p>

              <div className="bg-[#eef4f8] border border-[#b8d4e8] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-[#1e4d6b] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#1e4d6b]">Hierarchical Jurisdiction Engine</p>
                    <p className="text-xs text-[#1e4d6b]/80 mt-1">
                      EvidLY automatically merges compliance requirements from Federal (FDA), State (California CalCode),
                      County, and City jurisdictions — so each location gets the exact requirements that apply to them.
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-detected jurisdictions per location with override */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Detected Jurisdictions</h4>
                {locationJurisdictions.map((loc) => (
                  <div key={loc.name} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{loc.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{loc.chain}</p>
                      </div>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Auto-detected
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <label className="text-xs font-medium text-gray-500">County:</label>
                      <select
                        defaultValue={loc.detectedSlug}
                        onChange={() => alert(`Jurisdiction override saved for ${loc.name}. Scores will recalculate.`)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]"
                      >
                        {availableCounties.map(c => (
                          <option key={c.slug} value={c.slug}>{c.name} ({c.systemType.replace('_', ' ')})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dashboard & Reporting Toggles */}
              <div className="border border-gray-200 rounded-lg p-5 bg-white space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Display Preferences</h4>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Show jurisdiction score on dashboard</div>
                    <div className="text-xs text-gray-500">Display the inspector grade next to your EvidLY score</div>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    onChange={() => alert('Dashboard display preference saved.')}
                    className="w-5 h-5 text-[#1e4d6b] border-gray-300 rounded focus:ring-[#1e4d6b]"
                  />
                </label>

                <div className="border-t border-gray-100"></div>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Include jurisdiction score in reports</div>
                    <div className="text-xs text-gray-500">Add inspector grade details to generated compliance reports</div>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    onChange={() => alert('Report inclusion preference saved.')}
                    className="w-5 h-5 text-[#1e4d6b] border-gray-300 rounded focus:ring-[#1e4d6b]"
                  />
                </label>
              </div>

              {/* Manual jurisdiction selection */}
              <div className="border border-gray-200 rounded-lg p-5 bg-white">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Manual Jurisdiction Override</h4>
                <p className="text-xs text-gray-500 mb-3">If auto-detection is incorrect for a location, select the correct county scoring system manually.</p>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) alert(`Manual jurisdiction set to ${e.target.value}. Apply this to specific locations using the dropdowns above.`);
                  }}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]"
                >
                  <option value="">Select a county scoring system...</option>
                  {availableCounties.map(c => (
                    <option key={c.slug} value={c.slug}>{c.name} — {c.systemType.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => navigate('/jurisdiction')}
                className="px-6 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150"
              >
                View Full Jurisdiction Configuration →
              </button>
            </div>
            );
          })()}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">{t('settings.integrationSettings')}</h3>
              <p className="text-gray-600">{t('settings.integrationsDesc')}</p>

              <div className="space-y-4">
                {/* Restaurant365 */}
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-lg">R365</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Restaurant365</h4>
                        <p className="text-sm text-gray-500">Sync inventory, recipes, and financial data</p>
                      </div>
                    </div>
                    <button
                      onClick={() => alert('Restaurant365 integration coming soon. Contact support for early access.')}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                      {t('settings.connect')}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full">{t('settings.comingSoon')}</span>
                    <span>Auto-sync vendor data and purchase orders</span>
                  </div>
                </div>

                {/* Cintas */}
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-700 font-bold text-sm">CINTAS</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Cintas</h4>
                        <p className="text-sm text-gray-500">Fire protection, uniforms, and facility services</p>
                      </div>
                    </div>
                    <button
                      onClick={() => alert('Cintas integration coming soon. Contact support for early access.')}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                      {t('settings.connect')}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full">{t('settings.comingSoon')}</span>
                    <span>Auto-import service records and certificates</span>
                  </div>
                </div>

                {/* Ecosure / Ecolab */}
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <span className="text-green-700 font-bold text-sm">ECO</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Ecolab / EcoSure</h4>
                        <p className="text-sm text-gray-500">Food safety audits and sanitation services</p>
                      </div>
                    </div>
                    <button
                      onClick={() => alert('Ecolab integration coming soon. Contact support for early access.')}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                      {t('settings.connect')}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full">{t('settings.comingSoon')}</span>
                    <span>Import audit scores and corrective actions</span>
                  </div>
                </div>

                {/* API Access */}
                <div className="border border-dashed border-gray-300 rounded-lg p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Plug className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{t('settings.apiAccess')}</h4>
                      <p className="text-sm text-gray-500">{t('settings.apiDesc')}</p>
                      <p className="text-xs text-gray-400 mt-1">{t('settings.enterprisePlan')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">{t('settings.securityChangePassword')}</h3>
              <p className="text-sm text-gray-600">{t('settings.securityDesc')}</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('topBar.currentPassword')}</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={pwForm.current}
                    onChange={(e) => { setPwForm({ ...pwForm, current: e.target.value }); setPwError(''); setPwSuccess(''); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37] pr-10"
                    placeholder={t('topBar.enterCurrentPassword')}
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('topBar.newPassword')}</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={pwForm.newPw}
                    onChange={(e) => { setPwForm({ ...pwForm, newPw: e.target.value }); setPwError(''); setPwSuccess(''); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37] pr-10"
                    placeholder={t('topBar.enterNewPassword')}
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('topBar.confirmNewPassword')}</label>
                <input
                  type="password"
                  value={pwForm.confirm}
                  onChange={(e) => { setPwForm({ ...pwForm, confirm: e.target.value }); setPwError(''); setPwSuccess(''); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder={t('topBar.reEnterNewPassword')}
                />
              </div>
              {pwError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pwError}</div>
              )}
              {pwSuccess && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{pwSuccess}</div>
              )}
              <button
                onClick={() => {
                  setPwError('');
                  setPwSuccess('');
                  if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
                    setPwError(t('topBar.allFieldsRequired'));
                    return;
                  }
                  if (pwForm.newPw.length < 8) {
                    setPwError(t('topBar.passwordMinLength'));
                    return;
                  }
                  if (pwForm.newPw !== pwForm.confirm) {
                    setPwError(t('topBar.passwordsDoNotMatch'));
                    return;
                  }
                  if (isDemoMode) {
                    setPwSuccess(t('topBar.passwordLiveOnly'));
                    return;
                  }
                  supabase.auth.updateUser({ password: pwForm.newPw }).then(({ error }) => {
                    if (error) {
                      setPwError(error.message);
                    } else {
                      setPwSuccess(t('topBar.passwordUpdated'));
                      setPwForm({ current: '', newPw: '', confirm: '' });
                    }
                  });
                }}
                className="px-6 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150"
              >
                {t('topBar.updatePassword')}
              </button>
            </div>
          )}

          {activeTab === 'operating-hours' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('settings.hoursAndShifts')}</h3>
                <p className="text-sm text-gray-600 mt-1">{t('settings.hoursShiftsDesc')}</p>
                {!canEditHours && (
                  <div className="mt-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {t('settings.viewOnlyHours')}
                  </div>
                )}
              </div>

              {/* Operating Hours */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">{t('settings.operatingHours')}</h4>
                <div className="space-y-4">
                  {locationHours.map((loc) => (
                    <div key={loc.locationName} className="border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-5 w-5 text-[#1e4d6b]" />
                        <span className="font-semibold text-gray-900">{loc.locationName}</span>
                      </div>

                      <div className="flex flex-wrap gap-3 mb-4">
                        {DAY_LABELS.map((day, idx) => (
                          <label key={day} className={`flex items-center gap-1.5 ${canEditHours ? 'cursor-pointer' : 'cursor-default'}`}>
                            <input
                              type="checkbox"
                              checked={loc.days[idx]}
                              disabled={!canEditHours}
                              onChange={() => {
                                const newDays = [...loc.days];
                                newDays[idx] = !newDays[idx];
                                updateLocationHours(loc.locationName, { days: newDays });
                              }}
                              className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">{dayLabelsI18n[idx]}</span>
                          </label>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.opens')}</label>
                          <select
                            value={loc.openTime}
                            disabled={!canEditHours}
                            onChange={(e) => updateLocationHours(loc.locationName, { openTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37] disabled:bg-gray-50 disabled:text-gray-500"
                          >
                            {generateOpeningTimes().map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.closes')}</label>
                          <select
                            value={loc.closeTime}
                            disabled={!canEditHours}
                            onChange={(e) => updateLocationHours(loc.locationName, { closeTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37] disabled:bg-gray-50 disabled:text-gray-500"
                          >
                            {generateClosingTimes().map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-gray-500">
                        {loc.days.filter(Boolean).length} {t('settings.daysPerWeek')} {formatTime24to12(loc.openTime)} – {formatTime24to12(loc.closeTime)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shift Configuration */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">{t('settings.shiftConfiguration')}</h4>
                <div className="space-y-4">
                  {locationHours.map((loc) => {
                    const locShifts = getShiftsForLocation(loc.locationName).filter(s => s.locationName === loc.locationName);
                    return (
                      <div key={loc.locationName} className="border border-gray-200 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <MapPin className="h-5 w-5 text-[#1e4d6b]" />
                          <span className="font-semibold text-gray-900">{loc.locationName}</span>
                          <span className="text-xs text-gray-400 ml-auto">{locShifts.length} {locShifts.length !== 1 ? t('settings.shifts') : t('settings.shift')}</span>
                        </div>

                        <div className="space-y-3">
                          {locShifts.map((shift) => (
                            <div key={shift.id} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <input
                                  type="text"
                                  value={shift.name}
                                  disabled={!canEditHours}
                                  onChange={(e) => updateShift(shift.id, { name: e.target.value })}
                                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#d4af37] disabled:bg-white disabled:border-transparent disabled:text-gray-700 w-40"
                                />
                                {canEditHours && (
                                  <button
                                    onClick={() => removeShift(shift.id)}
                                    className="text-red-500 hover:text-red-700 text-xs font-medium ml-auto"
                                  >
                                    {t('common.remove')}
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('settings.startTimeLabel')}</label>
                                  <select
                                    value={shift.startTime}
                                    disabled={!canEditHours}
                                    onChange={(e) => updateShift(shift.id, { startTime: e.target.value })}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] disabled:bg-white disabled:text-gray-500"
                                  >
                                    {generateAllTimes().map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('settings.endTimeLabel')}</label>
                                  <select
                                    value={shift.endTime}
                                    disabled={!canEditHours}
                                    onChange={(e) => updateShift(shift.id, { endTime: e.target.value })}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] disabled:bg-white disabled:text-gray-500"
                                  >
                                    {generateAllTimes().map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {DAY_LABELS.map((day, idx) => (
                                  <label key={day} className={`flex items-center gap-1 ${canEditHours ? 'cursor-pointer' : 'cursor-default'}`}>
                                    <input
                                      type="checkbox"
                                      checked={shift.days[idx]}
                                      disabled={!canEditHours}
                                      onChange={() => {
                                        const newDays = [...shift.days];
                                        newDays[idx] = !newDays[idx];
                                        updateShift(shift.id, { days: newDays });
                                      }}
                                      className="h-3.5 w-3.5 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
                                    />
                                    <span className="text-xs text-gray-600">{dayLabelsI18n[idx]}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                          {canEditHours && (
                            <button
                              onClick={() => addShift({ name: t('settings.newShift'), locationName: loc.locationName, startTime: '09:00', endTime: '17:00', days: [false, true, true, true, true, true, false] })}
                              className="w-full py-2 text-sm border border-dashed border-gray-300 rounded-md hover:bg-gray-50 text-gray-600"
                            >
                              {t('settings.addShift')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {canEditHours && (
                <button onClick={() => alert('Hours and shifts saved.')} className="px-6 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150">
                  {t('settings.saveChanges')}
                </button>
              )}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Privacy & Benchmarking</h3>
              <p className="text-sm text-gray-600">Control how your anonymized data is used in the EvidLY Compliance Index.</p>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-8">
                    <h4 className="font-semibold text-gray-900 mb-1">Include my anonymized data in EvidLY Compliance Index</h4>
                    <p className="text-sm text-gray-500 mb-3">
                      When enabled, your location scores are included in aggregate industry benchmarks. Your data is fully anonymized — no business names, addresses, or employee information is ever shared.
                    </p>
                    <div className="space-y-2 text-xs text-gray-500">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>All data is fully anonymized before aggregation</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Minimum 10 peers required for any benchmark to display</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Organization IDs are hashed — even EvidLY staff cannot reverse-identify</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Compliant with CCPA — you can opt out at any time</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setBenchmarkOptIn(!benchmarkOptIn);
                      alert(benchmarkOptIn ? 'You have opted out of benchmarking. Your data will no longer appear in aggregated comparisons.' : 'You have opted in to benchmarking. Your anonymized data will contribute to industry benchmarks.');
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${benchmarkOptIn ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${benchmarkOptIn ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {!benchmarkOptIn && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-800">Benchmarking Opted Out</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        Your locations will still see their own scores, but percentile rankings and peer comparisons will not be available.
                        Your data is excluded from all aggregate calculations and the EvidLY Compliance Index.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">Data We Never Share</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>• Business names or addresses</div>
                  <div>• Employee information</div>
                  <div>• Specific violation details</div>
                  <div>• Permit or license numbers</div>
                  <div>• Vendor names or contracts</div>
                  <div>• Individual inspection reports</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">{t('settings.billingTitle')}</h3>
              <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-lg p-6 text-white">
                <h4 className="text-lg font-semibold mb-2">{t('settings.professionalPlan')}</h4>
                <div className="text-3xl font-bold mb-1">$99<span className="text-lg font-normal">{t('settings.perMonth')}</span></div>
                <p className="text-gray-200 text-sm">{t('settings.planDesc')}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">{t('settings.planFeatures')}</h4>
                <div className="space-y-2">
                  {billingFeatures.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">{t('settings.paymentMethod')}</h4>
                <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-6 w-6 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">•••• •••• •••• 4242</div>
                      <div className="text-sm text-gray-500">{t('settings.expires')} 12/24</div>
                    </div>
                  </div>
                  <button onClick={() => alert('Payment method update coming soon.')} className="text-sm text-[#1e4d6b] hover:text-[#163a52] font-medium">
                    {t('common.update')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
