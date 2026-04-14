import { useState, useEffect } from 'react';
import { Bell, Clock, MapPin, Shield, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useClockReminderSettings, useUpdateClockReminderSettings } from '../../hooks/api';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, NAVY, FONT, PAGE_BG, TEXT_TERTIARY,
} from '../../components/dashboard/shared/constants';

const cardClasses = 'bg-white border border-[#D1D9E6] rounded-xl shadow-[0_1px_3px_rgba(11,22,40,.06),0_1px_2px_rgba(11,22,40,.04)] p-6 mb-5';

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-[44px] h-6 rounded-xl border-none relative cursor-pointer shrink-0 transition-colors duration-200 ${checked ? 'bg-[#163a5f]' : 'bg-gray-300'}`}
    >
      <div
        className="w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[left] duration-200"
        style={{ left: checked ? 23 : 3 }}
      />
    </button>
  );
}

export function ClockRemindersPage() {
  const navigate = useNavigate();
  const { data: serverSettings, isLoading } = useClockReminderSettings();
  const { mutate: updateSettings, isLoading: saving } = useUpdateClockReminderSettings();

  // Local state with defaults
  const [clockInEnabled, setClockInEnabled] = useState(true);
  const [clockInMinutes, setClockInMinutes] = useState(15);
  const [clockOutEnabled, setClockOutEnabled] = useState(true);
  const [clockOutMinutes, setClockOutMinutes] = useState(15);
  const [autoClockoutEnabled, setAutoClockoutEnabled] = useState(false);
  const [autoClockoutMinutes, setAutoClockoutMinutes] = useState(15);
  const [geofenceRadius, setGeofenceRadius] = useState(100);

  // Sync with server data
  useEffect(() => {
    if (serverSettings) {
      setClockInMinutes(serverSettings.clockInReminderMinutes);
      setClockOutMinutes(serverSettings.clockOutReminderMinutes);
      setAutoClockoutEnabled(serverSettings.autoClockoutEnabled);
      setAutoClockoutMinutes(serverSettings.autoClockoutMinutes);
      setGeofenceRadius(serverSettings.geofenceRadiusMeters);
    }
  }, [serverSettings]);

  const handleSave = async () => {
    try {
      await updateSettings({
        clockInReminderMinutes: clockInEnabled ? clockInMinutes : 0,
        clockOutReminderMinutes: clockOutEnabled ? clockOutMinutes : 0,
        autoClockoutEnabled,
        autoClockoutMinutes,
        geofenceRadiusMeters: geofenceRadius,
      });
      alert('Clock & attendance settings saved successfully');
    } catch {
      alert('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#F4F6FA] min-h-screen p-6" style={{ ...FONT }}>
        <div className={`${cardClasses} h-[120px]`}>
          <div className="bg-[#EEF1F7] rounded-lg h-5 w-[200px] mb-4" />
          <div className="bg-[#EEF1F7] rounded-lg h-3.5 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F4F6FA] min-h-screen p-6" style={{ ...FONT }}>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1.5 bg-transparent border-none text-[#3D5068] text-[13px] font-medium cursor-pointer p-0 mb-3"
        >
          <ArrowLeft size={16} />
          Back to Settings
        </button>
        <h1 className="text-2xl font-bold text-[#163a5f] m-0">
          Clock & Attendance Settings
        </h1>
        <p className="text-sm text-[#3D5068] mt-1.5 mb-0">
          Configure clock in/out reminders and automatic clock-out settings for your team
        </p>
      </div>

      {/* Clock-In Reminders */}
      <div className={cardClasses}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Bell size={20} color={NAVY} />
            <div>
              <h2 className="text-base font-bold text-[#0B1628] m-0">
                Clock-In Reminders
              </h2>
              <p className="text-[13px] text-[#3D5068] mt-1 mb-0">
                Send reminder notifications before scheduled job start time
              </p>
            </div>
          </div>
          <ToggleSwitch checked={clockInEnabled} onChange={setClockInEnabled} />
        </div>

        {clockInEnabled && (
          <div className="pl-[30px]">
            <label className="block text-[13px] font-semibold text-[#0B1628] mb-2">
              Minutes before job start
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={clockInMinutes}
                onChange={(e) => setClockInMinutes(Number(e.target.value))}
                className="flex-1 cursor-pointer accent-[#163a5f]"
              />
              <input
                type="number"
                min="5"
                max="60"
                value={clockInMinutes}
                onChange={(e) => setClockInMinutes(Number(e.target.value))}
                className="w-20 px-3 py-2 rounded-lg border border-[#D1D9E6] text-sm text-center font-semibold text-[#0B1628]"
              />
              <span className="text-[13px] text-[#3D5068] min-w-[60px]">minutes</span>
            </div>
            <p className="text-xs text-[#6B7F96] mt-2 mb-0">
              Employees will receive a notification {clockInMinutes} minutes before their scheduled job starts
            </p>
          </div>
        )}
      </div>

      {/* Clock-Out Reminders */}
      <div className={cardClasses}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Clock size={20} color={NAVY} />
            <div>
              <h2 className="text-base font-bold text-[#0B1628] m-0">
                Clock-Out Reminders
              </h2>
              <p className="text-[13px] text-[#3D5068] mt-1 mb-0">
                Send reminder notifications after scheduled job end time
              </p>
            </div>
          </div>
          <ToggleSwitch checked={clockOutEnabled} onChange={setClockOutEnabled} />
        </div>

        {clockOutEnabled && (
          <div className="pl-[30px]">
            <label className="block text-[13px] font-semibold text-[#0B1628] mb-2">
              Minutes after job end
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={clockOutMinutes}
                onChange={(e) => setClockOutMinutes(Number(e.target.value))}
                className="flex-1 cursor-pointer accent-[#163a5f]"
              />
              <input
                type="number"
                min="5"
                max="60"
                value={clockOutMinutes}
                onChange={(e) => setClockOutMinutes(Number(e.target.value))}
                className="w-20 px-3 py-2 rounded-lg border border-[#D1D9E6] text-sm text-center font-semibold text-[#0B1628]"
              />
              <span className="text-[13px] text-[#3D5068] min-w-[60px]">minutes</span>
            </div>
            <p className="text-xs text-[#6B7F96] mt-2 mb-0">
              Employees will receive a notification {clockOutMinutes} minutes after their scheduled job ends
            </p>
          </div>
        )}
      </div>

      {/* Auto Clock-Out */}
      <div className={cardClasses}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Shield size={20} color={NAVY} />
            <div>
              <h2 className="text-base font-bold text-[#0B1628] m-0">
                Auto Clock-Out
              </h2>
              <p className="text-[13px] text-[#3D5068] mt-1 mb-0">
                Automatically clock out employees when they leave the job site
              </p>
            </div>
          </div>
          <ToggleSwitch checked={autoClockoutEnabled} onChange={setAutoClockoutEnabled} />
        </div>

        {autoClockoutEnabled && (
          <div className="pl-[30px] flex flex-col gap-5">
            {/* Auto clock-out delay */}
            <div>
              <label className="block text-[13px] font-semibold text-[#0B1628] mb-2">
                Auto clock-out delay
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={autoClockoutMinutes}
                  onChange={(e) => setAutoClockoutMinutes(Number(e.target.value))}
                  className="flex-1 cursor-pointer accent-[#163a5f]"
                />
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={autoClockoutMinutes}
                  onChange={(e) => setAutoClockoutMinutes(Number(e.target.value))}
                  className="w-20 px-3 py-2 rounded-lg border border-[#D1D9E6] text-sm text-center font-semibold text-[#0B1628]"
                />
                <span className="text-[13px] text-[#3D5068] min-w-[60px]">minutes</span>
              </div>
              <p className="text-xs text-[#6B7F96] mt-2 mb-0">
                Employee will be auto-clocked out {autoClockoutMinutes} minutes after leaving the geofence
              </p>
            </div>

            {/* Geofence radius */}
            <div>
              <label className="block text-[13px] font-semibold text-[#0B1628] mb-2">
                Geofence radius
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                  className="flex-1 cursor-pointer accent-[#163a5f]"
                />
                <input
                  type="number"
                  min="50"
                  max="500"
                  step="50"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                  className="w-20 px-3 py-2 rounded-lg border border-[#D1D9E6] text-sm text-center font-semibold text-[#0B1628]"
                />
                <span className="text-[13px] text-[#3D5068] min-w-[60px]">meters</span>
              </div>
              <p className="text-xs text-[#6B7F96] mt-2 mb-0">
                The auto clock-out will trigger when an employee moves {geofenceRadius}m away from the job site
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Geofence Settings Info */}
      <div className={cardClasses}>
        <div className="flex items-start gap-2.5">
          <MapPin size={20} color={NAVY} className="mt-0.5" />
          <div className="flex-1">
            <h2 className="text-base font-bold text-[#0B1628] mb-3 mt-0">
              Geofence Settings
            </h2>
            <div className="flex items-center gap-6 mb-4">
              {/* Visual circle representation */}
              <div className="text-center shrink-0">
                <div
                  className="w-[120px] h-[120px] rounded-full border-[3px] border-dashed border-[#163a5f] flex items-center justify-center relative mx-auto mb-2"
                  style={{ background: `linear-gradient(135deg, ${NAVY}08 0%, ${NAVY}15 100%)` }}
                >
                  <div className="w-3 h-3 rounded-full bg-[#163a5f] shadow-[0_0_0_4px_rgba(22,58,95,0.2)]" />
                </div>
                <div className="text-lg font-bold text-[#163a5f]">
                  {geofenceRadius}m
                </div>
                <div className="text-[11px] text-[#6B7F96]">
                  radius
                </div>
              </div>

              {/* Explanation */}
              <div className="flex-1">
                <p className="text-[13px] text-[#0B1628] leading-relaxed mb-3 mt-0">
                  <strong>How it works:</strong> When auto clock-out is enabled, the system monitors employee location in real-time.
                  If an employee moves beyond the geofence radius from the job site and remains outside for the configured delay period,
                  they will be automatically clocked out.
                </p>
                <div className="bg-[#EEF1F7] rounded-lg p-3 border border-[#D1D9E6]">
                  <p className="text-xs text-[#3D5068] m-0 leading-normal">
                    <strong>Privacy Note:</strong> Location tracking only occurs during active clock-in sessions.
                    No location data is collected when employees are clocked out. All location data is encrypted and
                    used solely for attendance accuracy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 py-3 px-7 rounded-lg border-none bg-[#163a5f] text-white text-sm font-semibold shadow-[0_2px_4px_rgba(22,58,95,0.15)] ${saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100'}`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
