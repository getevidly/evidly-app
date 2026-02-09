import { useState, useEffect } from 'react';
import { User, Building2, Bell, Lock, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ReportSettings } from '../components/ReportSettings';
import { Breadcrumb } from '../components/Breadcrumb';
import { useRole, UserRole } from '../contexts/RoleContext';

export function Settings() {
  const { profile } = useAuth();
  const { userRole } = useRole();
  const [activeTab, setActiveTab] = useState('profile');
  const [notificationSettings, setNotificationSettings] = useState({
    email_enabled: true,
    sms_enabled: false,
    quiet_hours_start: '20:00',
    quiet_hours_end: '08:00',
    reminder_frequency: 'per_event',
  });
  const [saving, setSaving] = useState(false);

  const allTabs = [
    { id: 'profile', name: 'Profile', icon: User, roles: ['management', 'kitchen', 'facilities'] as UserRole[] },
    { id: 'organization', name: 'Organization', icon: Building2, roles: ['management'] as UserRole[] },
    { id: 'notifications', name: 'Notifications', icon: Bell, roles: ['management', 'kitchen', 'facilities'] as UserRole[] },
    { id: 'security', name: 'Security', icon: Lock, roles: ['management', 'facilities'] as UserRole[] },
    { id: 'billing', name: 'Billing', icon: CreditCard, roles: ['management'] as UserRole[] },
  ];

  const tabs = allTabs.filter(tab => tab.roles.includes(userRole));

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

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]} />
      <div className="flex flex-col lg:flex-row gap-6">
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
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 bg-white rounded-lg shadow p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Profile Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  defaultValue={profile?.full_name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <input
                  type="text"
                  defaultValue={profile?.role}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
              <button onClick={() => alert('Profile saved.')} className="px-6 py-2 bg-[#1e4d6b] text-white rounded-md hover:bg-[#2a6a8f]">
                Save Changes
              </button>
            </div>
          )}

          {activeTab === 'organization' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Organization Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
                <input
                  type="text"
                  placeholder="Your Organization"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]">
                  <option>Restaurant</option>
                  <option>Food Manufacturing</option>
                  <option>Catering</option>
                  <option>Retail Food</option>
                </select>
              </div>
              <button onClick={() => alert('Organization settings saved.')} className="px-6 py-2 bg-[#1e4d6b] text-white rounded-md hover:bg-[#2a6a8f]">
                Save Changes
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Notification Preferences</h3>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Delivery Methods</h4>
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={notificationSettings.email_enabled}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, email_enabled: e.target.checked })}
                        className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded mt-1"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">Email Notifications</span>
                        <p className="text-xs text-gray-500">Receive alerts and reminders via email</p>
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
                        <span className="text-sm font-medium text-gray-900">SMS Notifications</span>
                        <p className="text-xs text-gray-500">Receive urgent alerts via text message</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Quiet Hours</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    SMS notifications will not be sent during these hours
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={notificationSettings.quiet_hours_start}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, quiet_hours_start: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
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
                  <h4 className="font-semibold text-gray-900 mb-4">Reminder Frequency</h4>
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
                        <span className="text-sm font-medium text-gray-900">Per Event</span>
                        <p className="text-xs text-gray-500">Receive notifications immediately as events occur</p>
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
                        <span className="text-sm font-medium text-gray-900">Daily Digest</span>
                        <p className="text-xs text-gray-500">Receive a daily summary of all notifications</p>
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
                        <span className="text-sm font-medium text-gray-900">Weekly Digest</span>
                        <p className="text-xs text-gray-500">Receive a weekly summary every Monday</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Document Expiration Alerts</h4>
                  <p className="text-sm text-gray-600">
                    You will automatically receive alerts for expiring documents:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>• 30 days before: Email alert</li>
                    <li>• 14 days before: Email alert (urgent)</li>
                    <li>• 7 days before: Email + SMS alert</li>
                    <li>• 1 day before: Email + SMS alert (critical)</li>
                    <li>• Day of expiration: EXPIRED notification</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={saveNotificationSettings}
                disabled={saving}
                className="px-6 py-2 bg-[#1e4d6b] text-white rounded-md hover:bg-[#2a6a8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>

              <div className="border-t border-gray-200 pt-6 mt-8">
                <ReportSettings />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Security Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
              <button onClick={() => alert('Password updated.')} className="px-6 py-2 bg-[#1e4d6b] text-white rounded-md hover:bg-[#2a6a8f]">
                Update Password
              </button>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Billing & Subscription</h3>
              <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-lg p-6 text-white">
                <h4 className="text-lg font-semibold mb-2">Professional Plan</h4>
                <div className="text-3xl font-bold mb-1">$99<span className="text-lg font-normal">/month</span></div>
                <p className="text-gray-200 text-sm">Unlimited users • All features</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Payment Method</h4>
                <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-6 w-6 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">•••• •••• •••• 4242</div>
                      <div className="text-sm text-gray-500">Expires 12/24</div>
                    </div>
                  </div>
                  <button onClick={() => alert('Payment method update coming soon.')} className="text-sm text-[#1e4d6b] hover:text-[#2a6a8f] font-medium">
                    Update
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
