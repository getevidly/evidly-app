import { useState } from 'react';
import { Send, Clock, CheckCircle, AlertCircle, Settings, Mail, MessageSquare, Link2, X, Zap } from 'lucide-react';

interface DocRequest {
  id: string;
  vendorName: string;
  documentType: string;
  status: 'pending' | 'sent' | 'reminded' | 'received' | 'overdue';
  sentDate: string;
  dueDate: string;
  reminderCount: number;
  secureLink: string;
}

const demoRequests: DocRequest[] = [
  { id: '1', vendorName: 'ABC Fire Protection', documentType: 'Hood Cleaning Certificate', status: 'received', sentDate: 'Jan 20, 2026', dueDate: 'Feb 3, 2026', reminderCount: 0, secureLink: '' },
  { id: '2', vendorName: 'Valley Fire Systems', documentType: 'Fire Suppression Report', status: 'overdue', sentDate: 'Jan 10, 2026', dueDate: 'Jan 24, 2026', reminderCount: 3, secureLink: 'https://app.getevidly.com/upload/abc123' },
  { id: '3', vendorName: 'Pacific Pest Control', documentType: 'Service Report', status: 'sent', sentDate: 'Feb 4, 2026', dueDate: 'Feb 18, 2026', reminderCount: 0, secureLink: 'https://app.getevidly.com/upload/def456' },
  { id: '4', vendorName: 'Grease Masters', documentType: 'Certificate of Insurance', status: 'reminded', sentDate: 'Jan 28, 2026', dueDate: 'Feb 11, 2026', reminderCount: 1, secureLink: 'https://app.getevidly.com/upload/ghi789' },
];

interface AutoRequestSettingsType {
  autoRequestEnabled: boolean;
  daysBefore: number;
  reminderDay4: boolean;
  reminderDay7: boolean;
  reminderDay14: boolean;
  notifyVia: 'email' | 'sms' | 'both';
  linkExpiresDays: number;
}

export function AutoDocumentRequest() {
  const [requests] = useState<DocRequest[]>(demoRequests);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AutoRequestSettingsType>({
    autoRequestEnabled: true,
    daysBefore: 30,
    reminderDay4: true,
    reminderDay7: true,
    reminderDay14: true,
    notifyVia: 'email',
    linkExpiresDays: 14,
  });

  const getStatusBadge = (status: DocRequest['status']) => {
    switch (status) {
      case 'received':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" />Received</span>;
      case 'sent':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Send className="w-3 h-3" />Sent</span>;
      case 'reminded':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="w-3 h-3" />Reminded</span>;
      case 'overdue':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3" />Overdue</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Clock className="w-3 h-3" />Pending</span>;
    }
  };

  return (
    <div>
      {/* Header with automation status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${settings.autoRequestEnabled ? 'bg-green-500 animate-live-dot' : 'bg-gray-300'}`} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Auto Document Requests</h3>
            <p className="text-sm text-gray-500">
              {settings.autoRequestEnabled
                ? `Automatically requests documents ${settings.daysBefore} days before expiration`
                : 'Automation is paused'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Automation flow visual */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-5 mb-6 border border-blue-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-blue-700 font-medium">
            <Zap className="w-4 h-4" />
            <span>Doc expires in {settings.daysBefore} days</span>
          </div>
          <span className="text-gray-400">→</span>
          <div className="flex items-center gap-2 text-blue-700 font-medium">
            <Mail className="w-4 h-4" />
            <span>Auto-request sent</span>
          </div>
          <span className="text-gray-400">→</span>
          <div className="flex items-center gap-2 text-amber-700 font-medium">
            <Clock className="w-4 h-4" />
            <span>Reminders Day 4, 7, 14</span>
          </div>
          <span className="text-gray-400">→</span>
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <CheckCircle className="w-4 h-4" />
            <span>Vendor uploads via secure link</span>
          </div>
        </div>
      </div>

      {/* Request list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Document</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Sent</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Due</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reminders</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{req.vendorName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{req.documentType}</td>
                <td className="px-4 py-3 text-center">{getStatusBadge(req.status)}</td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center">{req.sentDate}</td>
                <td className="px-4 py-3 text-sm text-center">
                  <span className={req.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-gray-500'}>{req.dueDate}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center">{req.reminderCount}</td>
                <td className="px-4 py-3 text-center">
                  {req.secureLink ? (
                    <button className="text-[#1e4d6b] hover:text-[#163a52]" title="Copy secure link">
                      <Link2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Auto-Request Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Enable Auto-Requests</p>
                  <p className="text-sm text-gray-500">Automatically request docs before expiration</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, autoRequestEnabled: !settings.autoRequestEnabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${settings.autoRequestEnabled ? 'bg-[#1e4d6b]' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.autoRequestEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Request document X days before expiration</label>
                <select
                  value={settings.daysBefore}
                  onChange={(e) => setSettings({ ...settings, daysBefore: parseInt(e.target.value) })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={45}>45 days</option>
                  <option value={60}>60 days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Auto-Reminders</label>
                <div className="space-y-2">
                  {[
                    { key: 'reminderDay4', label: 'Day 4 — Friendly reminder' },
                    { key: 'reminderDay7', label: 'Day 7 — Second notice' },
                    { key: 'reminderDay14', label: 'Day 14 — Final notice (link expires)' },
                  ].map((r) => (
                    <label key={r.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(settings as any)[r.key]}
                        onChange={(e) => setSettings({ ...settings, [r.key]: e.target.checked })}
                        className="w-4 h-4 text-[#1e4d6b] rounded"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notify vendor via</label>
                <select
                  value={settings.notifyVia}
                  onChange={(e) => setSettings({ ...settings, notifyVia: e.target.value as any })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="email">Email only</option>
                  <option value="sms">SMS only</option>
                  <option value="both">Email + SMS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secure link expires after</label>
                <select
                  value={settings.linkExpiresDays}
                  onChange={(e) => setSettings({ ...settings, linkExpiresDays: parseInt(e.target.value) })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-200">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">
                Cancel
              </button>
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm font-medium">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
