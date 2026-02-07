import { useState, useEffect } from 'react';
import { Check, Mail, Smartphone, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ReportSubscription {
  id?: string;
  report_type: string;
  frequency: string;
  delivery_method: 'email' | 'sms' | 'both';
  delivery_day: number | null;
  delivery_time: string;
  recipients: Array<{ email?: string; phone?: string }>;
  is_active: boolean;
}

const REPORT_TYPES = [
  {
    type: 'weekly_compliance',
    name: 'Weekly Compliance Summary',
    description: 'Overall score, changes, action items',
    frequency: 'weekly',
    recommended: true,
  },
  {
    type: 'daily_temperature',
    name: 'Daily Temperature Report',
    description: 'All readings, any out-of-range flags',
    frequency: 'daily',
    recommended: true,
  },
  {
    type: 'weekly_checklist',
    name: 'Weekly Checklist Report',
    description: 'Completion rates, missed items',
    frequency: 'weekly',
    recommended: false,
  },
  {
    type: 'monthly_document',
    name: 'Monthly Document Status',
    description: 'Expiring, expired, missing docs',
    frequency: 'monthly',
    recommended: false,
  },
  {
    type: 'monthly_vendor',
    name: 'Monthly Vendor Report',
    description: 'Service history, upcoming due dates',
    frequency: 'monthly',
    recommended: false,
  },
  {
    type: 'weekly_team',
    name: 'Weekly Team Activity',
    description: 'Who logged what, completion rates',
    frequency: 'weekly',
    recommended: false,
  },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export function ReportSettings() {
  const { profile } = useAuth();
  const [subscriptions, setSubscriptions] = useState<{ [key: string]: ReportSubscription }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchSubscriptions();
    }
  }, [profile]);

  const fetchSubscriptions = async () => {
    const { data } = await supabase
      .from('report_subscriptions')
      .select('*')
      .eq('organization_id', profile?.organization_id);

    if (data) {
      const subsMap: { [key: string]: ReportSubscription } = {};
      data.forEach((sub: any) => {
        subsMap[sub.report_type] = {
          id: sub.id,
          report_type: sub.report_type,
          frequency: sub.frequency,
          delivery_method: sub.delivery_method,
          delivery_day: sub.delivery_day,
          delivery_time: sub.delivery_time,
          recipients: sub.recipients || [],
          is_active: sub.is_active,
        };
      });
      setSubscriptions(subsMap);
    }
  };

  const toggleReport = (reportType: string, defaultFrequency: string) => {
    const isCurrentlyActive = subscriptions[reportType]?.is_active;

    if (isCurrentlyActive) {
      setSubscriptions({
        ...subscriptions,
        [reportType]: {
          ...subscriptions[reportType],
          is_active: false,
        },
      });
    } else {
      setSubscriptions({
        ...subscriptions,
        [reportType]: {
          ...subscriptions[reportType],
          report_type: reportType,
          frequency: subscriptions[reportType]?.frequency || defaultFrequency,
          delivery_method: subscriptions[reportType]?.delivery_method || 'email',
          delivery_day: subscriptions[reportType]?.delivery_day || 1,
          delivery_time: subscriptions[reportType]?.delivery_time || '07:00',
          recipients: subscriptions[reportType]?.recipients || [{ email: profile?.email }],
          is_active: true,
        },
      });
    }
  };

  const updateSubscription = (reportType: string, field: string, value: any) => {
    setSubscriptions({
      ...subscriptions,
      [reportType]: {
        ...subscriptions[reportType],
        [field]: value,
      },
    });
  };

  const saveSubscriptions = async () => {
    if (!profile?.organization_id) return;

    setSaving(true);
    try {
      for (const reportType in subscriptions) {
        const sub = subscriptions[reportType];

        if (sub.id) {
          await supabase
            .from('report_subscriptions')
            .update({
              frequency: sub.frequency,
              delivery_method: sub.delivery_method,
              delivery_day: sub.delivery_day,
              delivery_time: sub.delivery_time,
              recipients: sub.recipients,
              is_active: sub.is_active,
            })
            .eq('id', sub.id);
        } else if (sub.is_active) {
          await supabase
            .from('report_subscriptions')
            .insert({
              organization_id: profile.organization_id,
              report_type: sub.report_type,
              frequency: sub.frequency,
              delivery_method: sub.delivery_method,
              delivery_day: sub.delivery_day,
              delivery_time: sub.delivery_time,
              recipients: sub.recipients,
              is_active: sub.is_active,
              created_by: profile.id,
            });
        }
      }

      await fetchSubscriptions();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Automated Reports</h3>
        <p className="text-sm text-gray-600">
          Choose which reports you'd like to receive automatically. We'll deliver them straight to your inbox.
        </p>
      </div>

      <div className="space-y-4">
        {REPORT_TYPES.map((report) => {
          const sub = subscriptions[report.type];
          const isActive = sub?.is_active || false;

          return (
            <div
              key={report.type}
              className={`border rounded-lg p-4 transition-all ${
                isActive ? 'border-[#d4af37] bg-[#faf8f3]' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => toggleReport(report.type, report.frequency)}
                  className="mt-1 h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{report.name}</h4>
                    {report.recommended && (
                      <span className="text-xs bg-[#d4af37] text-[#1b4965] px-2 py-0.5 rounded font-semibold">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{report.description}</p>

                  {isActive && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Delivery Method
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateSubscription(report.type, 'delivery_method', 'email')}
                            className={`flex-1 px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 transition-colors ${
                              sub?.delivery_method === 'email'
                                ? 'bg-[#1e4d6b] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <Mail className="w-4 h-4" />
                            Email
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSubscription(report.type, 'delivery_method', 'sms')}
                            className={`flex-1 px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 transition-colors ${
                              sub?.delivery_method === 'sms'
                                ? 'bg-[#1e4d6b] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <Smartphone className="w-4 h-4" />
                            SMS
                          </button>
                        </div>
                      </div>

                      {report.frequency === 'weekly' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Day of Week
                          </label>
                          <select
                            value={sub?.delivery_day || 1}
                            onChange={(e) => updateSubscription(report.type, 'delivery_day', parseInt(e.target.value))}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                          >
                            {DAYS_OF_WEEK.map((day) => (
                              <option key={day.value} value={day.value}>
                                {day.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Time
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="time"
                            value={sub?.delivery_time || '07:00'}
                            onChange={(e) => updateSubscription(report.type, 'delivery_time', e.target.value)}
                            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveSubscriptions}
          disabled={saving}
          className="px-6 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {saving ? 'Saving...' : 'Save Report Settings'}
        </button>
      </div>
    </div>
  );
}
