import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User, Building2, Bell, Lock, CreditCard, Upload, MapPin, Plug, CheckCircle2, Eye, EyeOff, Clock, Megaphone, Globe, Layers, KeyRound, ExternalLink, RefreshCw, Wifi, WifiOff, Smartphone, HardDrive, Trash2, Download, Check, FileText } from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ReportSettings } from '../components/ReportSettings';
import { getAvailableCounties } from '../lib/jurisdictionScoring';
import { Breadcrumb } from '../components/Breadcrumb';
import { BillingPanel } from '../components/BillingPanel';
import { useRole, UserRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { useOperatingHours, generateOpeningTimes, generateClosingTimes, generateAllTimes, DAY_LABELS, formatTime24to12 } from '../contexts/OperatingHoursContext';
import { useTranslation } from '../contexts/LanguageContext';
import { SUPPORTED_LOCALES, LOCALE_META, type Locale } from '../lib/i18n';
import { useOffline } from '../contexts/OfflineContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { useMobile } from '../hooks/useMobile';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const ROLE_DEMO_PROFILES: Record<UserRole, { name: string; role: string; email: string }> = {
  executive: { name: 'James Park', role: 'Executive', email: 'james.park@cleaningprosplus.com' },
  owner_operator: { name: 'Maria Rodriguez', role: 'Management', email: 'maria.rodriguez@cleaningprosplus.com' },
  kitchen_staff: { name: 'Marcus Johnson', role: 'Staff', email: 'marcus.johnson@cleaningprosplus.com' },
  facilities_manager: { name: 'Michael Torres', role: 'Facilities', email: 'michael.torres@cleaningprosplus.com' },
};

export function Settings() {
  const { profile, user } = useAuth();
  const { userRole } = useRole();
  const { isDemoMode, presenterMode, togglePresenterMode } = useDemo();
  const { locationHours, updateLocationHours, getShiftsForLocation, addShift, removeShift, updateShift } = useOperatingHours();
  const { t, locale, setLocale } = useTranslation();
  const navigate = useNavigate();
  const canEditHours = userRole === 'executive' || userRole === 'owner_operator';
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
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const { isOnline, syncStatus, pendingCount, lastSyncTime, deviceId, triggerSync, clearOfflineData } = useOffline();
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const { isStandalone } = useMobile();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [timezone, setTimezone] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'America/Chicago'; }
  });

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
    enterprise: 'Enterprise',
    sync: 'Sync & Offline',
  };

  const allTabs = [
    { id: 'profile', icon: User, roles: ['executive', 'owner_operator', 'kitchen_staff', 'facilities_manager'] as UserRole[] },
    { id: 'organization', icon: Building2, roles: ['executive', 'owner_operator'] as UserRole[] },
    { id: 'operating-hours', icon: Clock, roles: ['executive', 'owner_operator', 'kitchen_staff', 'facilities_manager'] as UserRole[] },
    { id: 'notifications', icon: Bell, roles: ['executive', 'owner_operator', 'kitchen_staff', 'facilities_manager'] as UserRole[] },
    { id: 'regulatory-monitoring', icon: Megaphone, roles: ['executive', 'owner_operator'] as UserRole[] },
    { id: 'jurisdiction', icon: Globe, roles: ['executive', 'owner_operator'] as UserRole[] },
    { id: 'integrations', icon: Plug, roles: ['executive', 'owner_operator'] as UserRole[] },
    { id: 'privacy', icon: EvidlyIcon, roles: ['executive', 'owner_operator'] as UserRole[] },
    { id: 'security', icon: Lock, roles: ['executive', 'owner_operator', 'kitchen_staff', 'facilities_manager'] as UserRole[] },
    { id: 'billing', icon: CreditCard, roles: ['executive'] as UserRole[] },
    { id: 'enterprise', icon: Layers, roles: ['executive'] as UserRole[] },
    { id: 'sync', icon: RefreshCw, roles: ['executive', 'owner_operator', 'kitchen_staff', 'facilities_manager'] as UserRole[] },
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

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(est => {
        setStorageEstimate({ usage: est.usage || 0, quota: est.quota || 0 });
      });
    }
  }, []);

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        toast.success('EvidLY installed successfully!');
      }
      setDeferredPrompt(null);
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        toast.info('Tap the Share button, then "Add to Home Screen"');
      } else {
        toast.info('Look for the install icon in your browser address bar');
      }
    }
  };

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
    t('settings.vendorServiceTracking'),
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
          <nav className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto lg:overflow-visible">
            <div className="flex lg:flex-col">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-3 px-4 py-3 text-left transition-colors whitespace-nowrap min-h-[44px] ${
                    activeTab === tab.id
                      ? 'bg-[#1e4d6b] text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  } lg:w-full`}
                >
                  <tab.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{tabI18n[tab.id]}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">{t('settings.profileSettings')}</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.fullName')}</label>
                <input
                  type="text"
                  defaultValue={isDemoMode ? ROLE_DEMO_PROFILES[userRole].name : (profile?.full_name || '')}
                  key={`name-${isDemoMode ? userRole : profile?.id || 'loading'}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.email')}</label>
                <input
                  type="email"
                  defaultValue={isDemoMode ? ROLE_DEMO_PROFILES[userRole].email : (user?.email || '')}
                  key={`email-${isDemoMode ? userRole : user?.id || 'loading'}`}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.role')}</label>
                <input
                  type="text"
                  defaultValue={isDemoMode ? ROLE_DEMO_PROFILES[userRole].role : (profile?.role || '')}
                  key={`role-${isDemoMode ? userRole : profile?.id || 'loading'}`}
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

              <div className="flex gap-3">
                <button onClick={() => guardAction('settings', 'profile settings', () => toast.success('Profile saved'))} className="px-6 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150">
                  {t('settings.saveChanges')}
                </button>
                <button onClick={() => setActiveTab('profile')} className="px-6 py-2 min-h-[44px] border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                  Cancel
                </button>
              </div>
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
                      onClick={() => toast.info('Logo Upload (Demo)')}
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
                <select defaultValue="casual_dining" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
                  <option value="casual_dining">Casual Dining Restaurant</option>
                  <option value="quick_service">Quick Service / Fast Food</option>
                  <option value="fine_dining">Fine Dining</option>
                  <option value="hotel">Hotel / Resort Dining</option>
                  <option value="education_k12">K-12 School Cafeteria</option>
                  <option value="education_university">University Dining</option> {/* demo */}
                  <option value="healthcare">Healthcare Facility</option>
                  <option value="corporate_dining">Corporate Dining / Cafeteria</option>
                  <option value="catering">Catering Operation</option>
                  <option value="food_truck">Food Truck / Mobile</option>
                  <option value="grocery_deli">Grocery / Deli</option>
                  <option value="convenience">Convenience Store (prepared food)</option>
                  <option value="other">Other</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Used for industry benchmarking and peer comparison</p>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => {
                    setTimezone(e.target.value);
                    toast.success('Timezone updated');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                >
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Anchorage">Alaska Time (AKT)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">All scheduled tasks and reports will use this timezone</p>
              </div>

              {/* Locations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">{t('settings.locations')}</label>
                <div className="space-y-3">
                  {[
                    { name: 'Downtown Kitchen', address: '1245 Fulton Street, Fresno, CA 93721' }, // demo
                    { name: 'Airport Cafe', address: '1636 Macready Drive, Merced, CA 95340' }, // demo
                    { name: 'University Dining', address: '1 University Circle, Modesto, CA 95348' }, // demo
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
                  onClick={() => toast.info('Add Location (Demo)')}
                  className="mt-3 px-4 py-2 text-sm border border-dashed border-gray-300 rounded-md hover:bg-gray-50 text-gray-600 w-full"
                >
                  {t('settings.addLocation')}
                </button>
              </div>

              <button onClick={() => guardAction('settings', 'organization settings', () => toast.success('Organization settings saved'))} className="px-6 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* Copilot Notification Preferences */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">🤖</span>
                    <h4 className="font-semibold text-gray-900">Copilot Notification Settings</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Control how the AI Compliance Copilot notifies you about proactive insights, predictions, and recommendations.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-800 mb-2">In-App Notifications</h5>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3">
                          <input type="checkbox" defaultChecked disabled className="h-4 w-4 text-[#d4af37] border-gray-300 rounded opacity-60" />
                          <span className="text-sm text-gray-700">Critical alerts <span className="text-xs text-gray-400">(always on)</span></span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input type="checkbox" defaultChecked className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded" />
                          <span className="text-sm text-gray-700">Warnings</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input type="checkbox" defaultChecked className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded" />
                          <span className="text-sm text-gray-700">Recommendations &amp; patterns</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input type="checkbox" defaultChecked className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded" />
                          <span className="text-sm text-gray-700">Weekly summary</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-800 mb-2">Email Notifications</h5>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3">
                          <input type="checkbox" defaultChecked className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded" />
                          <span className="text-sm text-gray-700">Critical alerts — immediate</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input type="checkbox" defaultChecked className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded" />
                          <span className="text-sm text-gray-700">Warnings — daily digest</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded" />
                          <span className="text-sm text-gray-700">Recommendations</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input type="checkbox" defaultChecked className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded" />
                          <span className="text-sm text-gray-700">Weekly summary — Monday 6 AM</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-800 mb-2">SMS Notifications</h5>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3">
                          <input type="checkbox" defaultChecked className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded" />
                          <span className="text-sm text-gray-700">Critical alerts only</span>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input type="checkbox" className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded" />
                          <span className="text-sm text-gray-700">All copilot notifications</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={saveNotificationSettings}
                disabled={saving}
                className="px-6 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <label className="flex items-center justify-between gap-3">
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
                    <div key={j.name} className="flex items-center justify-between py-2 px-3 border border-gray-200 rounded-xl bg-white">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#1e4d6b]" />
                        <span className="text-sm text-gray-700">{j.name}</span>
                      </div>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{j.type}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => toast.success('Custom jurisdiction added')}
                    className="w-full py-2 text-sm border border-dashed border-gray-300 rounded-md hover:bg-gray-50 text-gray-600"
                  >
                    + Add Custom Jurisdiction
                  </button>
                </div>
              </div>

              <button onClick={() => guardAction('settings', 'regulatory settings', () => toast.success('Regulatory monitoring preferences saved'))} className="px-6 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150">
                {t('settings.saveChanges')}
              </button>
            </div>
          )}

          {activeTab === 'jurisdiction' && (() => {
            const availableCounties = getAvailableCounties();
            const locationJurisdictions = [
              { name: 'Downtown Kitchen', detectedCounty: 'Fresno County', detectedSlug: 'fresno', chain: 'Federal → California → Fresno County' }, // demo
              { name: 'Airport Cafe', detectedCounty: 'Merced County', detectedSlug: 'merced', chain: 'Federal → California → Merced County' }, // demo
              { name: 'University Dining', detectedCounty: 'Stanislaus County', detectedSlug: 'stanislaus', chain: 'Federal → California → Stanislaus County → City of Modesto' }, // demo
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
                  <div key={loc.name} className="border border-gray-200 rounded-xl p-4 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{loc.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{loc.chain}</p>
                      </div>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Auto-detected
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="text-xs font-medium text-gray-500">County:</label>
                      <select
                        defaultValue={loc.detectedSlug}
                        onChange={() => toast.success(`Jurisdiction override saved for ${loc.name}`)}
                        className="text-sm border border-gray-300 rounded-xl px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]"
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
              <div className="border border-gray-200 rounded-xl p-4 sm:p-5 bg-white space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Display Preferences</h4>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Show jurisdiction score on dashboard</div>
                    <div className="text-xs text-gray-500">Display the inspector grade next to your EvidLY score</div>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    onChange={() => toast.success('Dashboard display preference saved')}
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
                    onChange={() => toast.success('Report inclusion preference saved')}
                    className="w-5 h-5 text-[#1e4d6b] border-gray-300 rounded focus:ring-[#1e4d6b]"
                  />
                </label>
              </div>

              {/* Manual jurisdiction selection */}
              <div className="border border-gray-200 rounded-xl p-4 sm:p-5 bg-white">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Manual Jurisdiction Override</h4>
                <p className="text-xs text-gray-500 mb-3">If auto-detection is incorrect for a location, select the correct county scoring system manually.</p>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) toast.success(`Manual jurisdiction set to ${e.target.value}`);
                  }}
                  className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/20 focus:border-[#1e4d6b]"
                >
                  <option value="">Select a county scoring system...</option>
                  {availableCounties.map(c => (
                    <option key={c.slug} value={c.slug}>{c.name} — {c.systemType.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => navigate('/jurisdiction')}
                className="px-6 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150"
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
                {/* Insurance Risk Score Sharing */}
                <div className="border-2 rounded-lg p-4 sm:p-5" style={{ borderColor: '#1e4d6b' }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1e4d6b' }}>
                        <EvidlyIcon size={24} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Insurance Risk Score Sharing</h4>
                        <p className="text-sm text-gray-500">Share your EvidLY risk score with insurance carriers via secure API</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toast.info('Insurance data sharing is currently disabled')}
                        className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors"
                      >
                        <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#eef4f8' }}>
                    <p className="text-xs text-gray-600">
                      When enabled, authorized insurance carriers can access your risk score via API. No employee PII is ever shared.
                      Only aggregated compliance scores, anonymized incident counts, and service compliance dates are included.
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fdf8e8', color: '#d4af37' }}>Coming Soon</span>
                      <span>Carrier partnerships launching soon</span>
                    </div>
                    <button
                      onClick={() => navigate('/insurance-settings')}
                      className="text-sm font-medium transition-colors hover:underline"
                      style={{ color: '#1e4d6b' }}
                    >
                      Manage Insurance Connections →
                    </button>
                  </div>
                </div>

                {/* Restaurant365 */}
                <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-600 font-bold text-lg">R365</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Restaurant365</h4>
                        <p className="text-sm text-gray-500">Sync inventory, recipes, and financial data</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toast.info('Restaurant365 Integration (Demo)')}
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
                <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 font-bold text-sm">CINTAS</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Cintas</h4>
                        <p className="text-sm text-gray-500">Fire protection, uniforms, and facility services</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toast.info('Cintas Integration (Demo)')}
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
                <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-700 font-bold text-sm">ECO</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Ecolab / EcoSure</h4>
                        <p className="text-sm text-gray-500">Food safety inspections and sanitation services</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toast.info('Ecolab Integration (Demo)')}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                      {t('settings.connect')}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full">{t('settings.comingSoon')}</span>
                    <span>Import inspection scores and corrective actions</span>
                  </div>
                </div>

                {/* API Access */}
                <div className="border border-dashed border-gray-300 rounded-lg p-4 sm:p-5">
                  <div className="flex items-center gap-3 sm:gap-4">
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
              {/* Security Navigation Cards */}
              <div>
                <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Security & Access</h3>
                <p className="text-sm text-gray-600 mt-1">Manage access control, audit trails, and compliance reporting.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: KeyRound,
                    title: 'Roles & Permissions',
                    description: 'Manage role-based access and user permissions',
                    path: '/settings/roles-permissions',
                  },
                  {
                    icon: Clock,
                    title: 'Audit Trail',
                    description: 'View chain of custody and compliance records',
                    path: '/audit-trail',
                  },
                  {
                    icon: FileText,
                    title: 'Audit Report',
                    description: 'Generate inspection and compliance reports',
                    path: '/audit-report',
                  },
                ].map((card) => (
                  <button
                    key={card.title}
                    onClick={() => navigate(card.path)}
                    className="flex flex-col items-start gap-3 p-5 bg-white border border-gray-200 rounded-lg text-left hover:shadow-md hover:border-[#1e4d6b]/30 transition-all duration-150 group"
                  >
                    <div className="p-2 rounded-lg bg-[#1e4d6b]/10 group-hover:bg-[#1e4d6b]/15 transition-colors">
                      <card.icon className="h-5 w-5 text-[#1e4d6b]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>{card.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                    </div>
                    <span className="text-xs font-medium text-[#1e4d6b] group-hover:text-[#2a6a8f] transition-colors mt-auto">
                      Manage →
                    </span>
                  </button>
                ))}
              </div>

              {/* Session Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>Last login: {profile?.last_login_at ? new Date(profile.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  <span>Current session: Active</span>
                </div>
              </div>

              {/* Separator */}
              <hr className="border-gray-200" />

              <h3 className="text-xl font-bold text-gray-900">{t('settings.securityChangePassword')}</h3>
              <p className="text-sm text-gray-600">{t('settings.securityDesc')}</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={pwForm.current}
                    onChange={(e) => { setPwForm({ ...pwForm, current: e.target.value }); setPwError(''); setPwSuccess(''); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37] pr-10"
                    placeholder="Enter current password"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={pwForm.newPw}
                    onChange={(e) => { setPwForm({ ...pwForm, newPw: e.target.value }); setPwError(''); setPwSuccess(''); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37] pr-10"
                    placeholder="Enter new password"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={pwForm.confirm}
                  onChange={(e) => { setPwForm({ ...pwForm, confirm: e.target.value }); setPwError(''); setPwSuccess(''); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  placeholder="Re-enter new password"
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
                    setPwError('All fields are required.');
                    return;
                  }
                  if (pwForm.newPw.length < 8) {
                    setPwError('Password must be at least 8 characters.');
                    return;
                  }
                  if (pwForm.newPw !== pwForm.confirm) {
                    setPwError('Passwords do not match.');
                    return;
                  }
                  if (isDemoMode) {
                    setPwSuccess('Password changes are only available in live mode.');
                    return;
                  }
                  supabase.auth.updateUser({ password: pwForm.newPw }).then(({ error }) => {
                    if (error) {
                      setPwError(error.message);
                    } else {
                      setPwSuccess('Password updated successfully.');
                      setPwForm({ current: '', newPw: '', confirm: '' });
                    }
                  });
                }}
                className="px-6 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150"
              >
                Update Password
              </button>
            </div>
          )}

          {activeTab === 'operating-hours' && (
            <div className="space-y-6">
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
                    <div key={loc.locationName} className="border border-gray-200 rounded-lg p-4 sm:p-5">
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <div key={loc.locationName} className="border border-gray-200 rounded-lg p-4 sm:p-5">
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
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
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
                <button onClick={() => guardAction('settings', 'operating hours', () => toast.success('Hours and shifts saved'))} className="px-6 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors duration-150">
                  {t('settings.saveChanges')}
                </button>
              )}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Privacy & Benchmarking</h3>
              <p className="text-sm text-gray-600">Control how your anonymized data is used in the EvidLY Compliance Index.</p>

              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
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
                      toast.success(benchmarkOptIn ? 'Opted out of benchmarking' : 'Opted in to benchmarking');
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
                    <EvidlyIcon size={20} className="mt-0.5 flex-shrink-0" />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
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
            <BillingPanel />
          )}

          {activeTab === 'enterprise' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Enterprise Administration</h3>
              <p className="text-sm text-gray-600">Manage enterprise tenants, SSO configuration, and white-label branding.</p>

              {/* SSO Quick Status */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
                    <KeyRound className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">SSO Quick Status</h4>
                    <p className="text-xs text-gray-500">Enterprise single sign-on configuration</p>
                  </div>
                  <div className="ml-auto">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> 2 of 3 Active
                    </span>
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  {[
                    { name: 'Enterprise', provider: 'SAML via Okta', status: 'passed', color: '#C8102E' },
                    { name: 'Compass Group', provider: 'OIDC via Azure AD', status: 'passed', color: '#003DA5' },
                    { name: 'Sodexo', provider: 'Not configured', status: 'pending', color: '#ED1C24' },
                  ].map(item => (
                    <div key={item.name} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: item.color }}>
                        {item.name[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-700 flex-1">{item.name}</span>
                      <span className="text-xs text-gray-500">{item.provider}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${item.status === 'passed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {item.status === 'passed' ? 'Active' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/enterprise/admin')} className="text-sm font-medium flex items-center gap-1 cursor-pointer" style={{ color: '#1e4d6b' }}>
                  Configure SSO <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Tenant Branding Preview */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
                    <Layers className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Tenant Branding</h4>
                    <p className="text-xs text-gray-500">White-label configuration for enterprise clients</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  {[
                    { name: 'Enterprise Compliance Hub', colors: ['#C8102E', '#002855', '#F0AB00'] },
                    { name: 'Compass Compliance', colors: ['#003DA5', '#1B365D', '#FFB81C'] },
                    { name: 'Sodexo Safe Kitchen', colors: ['#ED1C24', '#231F20', '#00A0DF'] },
                  ].map(t => (
                    <div key={t.name} className="p-3 rounded-lg bg-gray-50 text-center">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {t.colors.map((c, i) => (
                          <div key={i} className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <p className="text-[11px] font-medium text-gray-700">{t.name}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/enterprise/admin')} className="text-sm font-medium flex items-center gap-1 cursor-pointer" style={{ color: '#1e4d6b' }}>
                  Manage Branding <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Enterprise Admin Portal Link */}
              <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-lg p-4 sm:p-6 text-white">
                <h4 className="text-lg font-semibold mb-2">Enterprise Admin Portal</h4>
                <p className="text-gray-200 text-sm mb-4">Full enterprise management — tenants, hierarchy, SSO, SCIM provisioning, branding, user directory, and reports.</p>
                <button onClick={() => navigate('/enterprise/admin')} className="px-4 py-2 rounded-xl bg-white text-[#1e4d6b] text-sm font-semibold hover:bg-gray-100 cursor-pointer transition-colors">
                  Open Enterprise Admin
                </button>
              </div>

              {/* SCIM Status */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#eef4f8' }}>
                    <EvidlyIcon size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">SCIM 2.0 Provisioning</h4>
                    <p className="text-xs text-gray-500">Automated user lifecycle management</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    2 Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Sync & Offline</h3>
              <p className="text-sm text-gray-600">Manage offline data, sync status, and device registration for this browser.</p>

              {/* Install App */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: isStandalone ? '#dcfce7' : '#eef4f8' }}>
                    {isStandalone ? <Check className="h-5 w-5 text-green-600" /> : <Download className="h-5 w-5" style={{ color: '#1e4d6b' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">Install App</h4>
                    <p className="text-xs text-gray-500">
                      {isStandalone
                        ? 'EvidLY is installed as an app on this device'
                        : 'Install EvidLY for faster access, offline support, and a full-screen experience'}
                    </p>
                  </div>
                  {isStandalone ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                      <Check className="h-3.5 w-3.5" /> Installed
                    </span>
                  ) : (
                    <button
                      onClick={handleInstallApp}
                      className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer hover:opacity-90"
                      style={{ backgroundColor: '#1e4d6b' }}
                    >
                      <Download className="h-4 w-4" />
                      Install
                    </button>
                  )}
                </div>
              </div>

              {/* Connection Status */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isOnline ? '#dcfce7' : '#fee2e2' }}>
                    {isOnline ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-red-600" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Connection Status</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={`text-sm font-medium ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      syncStatus === 'idle' ? 'bg-green-50 text-green-700 border border-green-200' :
                      syncStatus === 'syncing' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      syncStatus === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                      'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}>
                      {syncStatus === 'idle' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync Error' : 'Offline'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Last Sync</p>
                    <p className="text-sm font-medium text-gray-900">
                      {lastSyncTime ? lastSyncTime.toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Pending Changes</p>
                    <p className="text-sm font-medium text-gray-900">
                      {pendingCount} {pendingCount === 1 ? 'action' : 'actions'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sync Actions */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
                    <RefreshCw className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Sync Actions</h4>
                    <p className="text-xs text-gray-500">Manually trigger sync or clear offline data</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => triggerSync()}
                    disabled={!isOnline || syncStatus === 'syncing'}
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ backgroundColor: '#1e4d6b' }}
                  >
                    <RefreshCw className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                  </button>
                  {!clearConfirm ? (
                    <button
                      onClick={() => setClearConfirm(true)}
                      className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear Offline Data
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-600 font-medium">Are you sure?</span>
                      <button
                        onClick={async () => { await clearOfflineData(); setClearConfirm(false); toast.success('Offline data cleared'); }}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer"
                      >
                        Yes, Clear
                      </button>
                      <button
                        onClick={() => setClearConfirm(false)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Device Info */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
                    <Smartphone className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Device Information</h4>
                    <p className="text-xs text-gray-500">This device's sync registration details</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Device ID</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">{deviceId.slice(0, 8)}...{deviceId.slice(-4)}</code>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Platform</span>
                    <span className="text-sm font-medium text-gray-900">{navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'} — {navigator.platform || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Service Worker</span>
                    <span className={`text-sm font-medium ${('serviceWorker' in navigator) ? 'text-green-700' : 'text-gray-500'}`}>
                      {('serviceWorker' in navigator) ? 'Supported' : 'Not Available'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">IndexedDB</span>
                    <span className={`text-sm font-medium ${('indexedDB' in window) ? 'text-green-700' : 'text-gray-500'}`}>
                      {('indexedDB' in window) ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Storage Usage */}
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
                    <HardDrive className="h-5 w-5" style={{ color: '#1e4d6b' }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Storage Usage</h4>
                    <p className="text-xs text-gray-500">Local storage used by offline data and cache</p>
                  </div>
                </div>
                {storageEstimate ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">
                        {(storageEstimate.usage / (1024 * 1024)).toFixed(1)} MB used
                      </span>
                      <span className="text-sm text-gray-500">
                        of {(storageEstimate.quota / (1024 * 1024)).toFixed(0)} MB available
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full"
                        style={{
                          width: `${Math.min((storageEstimate.usage / storageEstimate.quota) * 100, 100).toFixed(1)}%`,
                          backgroundColor: '#1e4d6b',
                          minWidth: '4px',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Storage estimate not available in this browser.</p>
                )}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Cached Pages', value: 'App Shell', icon: '📄' },
                    { label: 'Offline Actions', value: `${pendingCount} pending`, icon: '📝' },
                    { label: 'Cached Photos', value: '0 photos', icon: '📷' },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <span className="text-lg">{item.icon}</span>
                      <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                      <p className="text-sm font-medium text-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Presenter mode toggle — only visible in demo mode */}
      {isDemoMode && (
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={togglePresenterMode}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Presenter Mode: <span className={presenterMode ? 'font-bold text-[#d4af37]' : 'font-medium'}>{presenterMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      )}
      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );
}
