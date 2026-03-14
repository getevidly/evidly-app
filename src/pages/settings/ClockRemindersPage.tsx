import { useState, useEffect } from 'react';
import { Bell, Clock, MapPin, Shield, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useClockReminderSettings, useUpdateClockReminderSettings } from '../../hooks/api';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, NAVY, FONT, PAGE_BG, TEXT_TERTIARY,
} from '../../components/dashboard/shared/constants';

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 12,
  boxShadow: CARD_SHADOW,
  padding: 24,
  marginBottom: 20,
};

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        background: checked ? NAVY : '#d1d5db',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute',
        top: 3,
        left: checked ? 23 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
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
      <div style={{ ...FONT, background: PAGE_BG, minHeight: '100vh', padding: 24 }}>
        <div style={{ ...cardStyle, height: 120 }}>
          <div style={{ background: PANEL_BG, borderRadius: 8, height: 20, width: 200, marginBottom: 16 }} />
          <div style={{ background: PANEL_BG, borderRadius: 8, height: 14, width: '50%' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...FONT, background: PAGE_BG, minHeight: '100vh', padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            color: MUTED,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 12,
          }}
        >
          <ArrowLeft size={16} />
          Back to Settings
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: NAVY, margin: 0 }}>
          Clock & Attendance Settings
        </h1>
        <p style={{ fontSize: 14, color: MUTED, margin: '6px 0 0' }}>
          Configure clock in/out reminders and automatic clock-out settings for your team
        </p>
      </div>

      {/* Clock-In Reminders */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={20} color={NAVY} />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: 0 }}>
                Clock-In Reminders
              </h2>
              <p style={{ fontSize: 13, color: MUTED, margin: '4px 0 0' }}>
                Send reminder notifications before scheduled job start time
              </p>
            </div>
          </div>
          <ToggleSwitch checked={clockInEnabled} onChange={setClockInEnabled} />
        </div>

        {clockInEnabled && (
          <div style={{ paddingLeft: 30 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 8 }}>
              Minutes before job start
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={clockInMinutes}
                onChange={(e) => setClockInMinutes(Number(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: NAVY,
                  cursor: 'pointer',
                }}
              />
              <input
                type="number"
                min="5"
                max="60"
                value={clockInMinutes}
                onChange={(e) => setClockInMinutes(Number(e.target.value))}
                style={{
                  width: 80,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${CARD_BORDER}`,
                  fontSize: 14,
                  textAlign: 'center',
                  fontWeight: 600,
                  color: BODY_TEXT,
                }}
              />
              <span style={{ fontSize: 13, color: MUTED, minWidth: 60 }}>minutes</span>
            </div>
            <p style={{ fontSize: 12, color: TEXT_TERTIARY, margin: '8px 0 0', paddingLeft: 0 }}>
              Employees will receive a notification {clockInMinutes} minutes before their scheduled job starts
            </p>
          </div>
        )}
      </div>

      {/* Clock-Out Reminders */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={20} color={NAVY} />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: 0 }}>
                Clock-Out Reminders
              </h2>
              <p style={{ fontSize: 13, color: MUTED, margin: '4px 0 0' }}>
                Send reminder notifications after scheduled job end time
              </p>
            </div>
          </div>
          <ToggleSwitch checked={clockOutEnabled} onChange={setClockOutEnabled} />
        </div>

        {clockOutEnabled && (
          <div style={{ paddingLeft: 30 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 8 }}>
              Minutes after job end
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={clockOutMinutes}
                onChange={(e) => setClockOutMinutes(Number(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: NAVY,
                  cursor: 'pointer',
                }}
              />
              <input
                type="number"
                min="5"
                max="60"
                value={clockOutMinutes}
                onChange={(e) => setClockOutMinutes(Number(e.target.value))}
                style={{
                  width: 80,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${CARD_BORDER}`,
                  fontSize: 14,
                  textAlign: 'center',
                  fontWeight: 600,
                  color: BODY_TEXT,
                }}
              />
              <span style={{ fontSize: 13, color: MUTED, minWidth: 60 }}>minutes</span>
            </div>
            <p style={{ fontSize: 12, color: TEXT_TERTIARY, margin: '8px 0 0', paddingLeft: 0 }}>
              Employees will receive a notification {clockOutMinutes} minutes after their scheduled job ends
            </p>
          </div>
        )}
      </div>

      {/* Auto Clock-Out */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={20} color={NAVY} />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: 0 }}>
                Auto Clock-Out
              </h2>
              <p style={{ fontSize: 13, color: MUTED, margin: '4px 0 0' }}>
                Automatically clock out employees when they leave the job site
              </p>
            </div>
          </div>
          <ToggleSwitch checked={autoClockoutEnabled} onChange={setAutoClockoutEnabled} />
        </div>

        {autoClockoutEnabled && (
          <div style={{ paddingLeft: 30, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Auto clock-out delay */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 8 }}>
                Auto clock-out delay
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={autoClockoutMinutes}
                  onChange={(e) => setAutoClockoutMinutes(Number(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: NAVY,
                    cursor: 'pointer',
                  }}
                />
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={autoClockoutMinutes}
                  onChange={(e) => setAutoClockoutMinutes(Number(e.target.value))}
                  style={{
                    width: 80,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${CARD_BORDER}`,
                    fontSize: 14,
                    textAlign: 'center',
                    fontWeight: 600,
                    color: BODY_TEXT,
                  }}
                />
                <span style={{ fontSize: 13, color: MUTED, minWidth: 60 }}>minutes</span>
              </div>
              <p style={{ fontSize: 12, color: TEXT_TERTIARY, margin: '8px 0 0' }}>
                Employee will be auto-clocked out {autoClockoutMinutes} minutes after leaving the geofence
              </p>
            </div>

            {/* Geofence radius */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: BODY_TEXT, marginBottom: 8 }}>
                Geofence radius
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: NAVY,
                    cursor: 'pointer',
                  }}
                />
                <input
                  type="number"
                  min="50"
                  max="500"
                  step="50"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                  style={{
                    width: 80,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${CARD_BORDER}`,
                    fontSize: 14,
                    textAlign: 'center',
                    fontWeight: 600,
                    color: BODY_TEXT,
                  }}
                />
                <span style={{ fontSize: 13, color: MUTED, minWidth: 60 }}>meters</span>
              </div>
              <p style={{ fontSize: 12, color: TEXT_TERTIARY, margin: '8px 0 0' }}>
                The auto clock-out will trigger when an employee moves {geofenceRadius}m away from the job site
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Geofence Settings Info */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <MapPin size={20} color={NAVY} style={{ marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: '0 0 12px' }}>
              Geofence Settings
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
              {/* Visual circle representation */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  border: `3px dashed ${NAVY}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  background: `linear-gradient(135deg, ${NAVY}08 0%, ${NAVY}15 100%)`,
                  margin: '0 auto 8px',
                }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: NAVY,
                    boxShadow: '0 0 0 4px rgba(22, 58, 95, 0.2)',
                  }} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>
                  {geofenceRadius}m
                </div>
                <div style={{ fontSize: 11, color: TEXT_TERTIARY }}>
                  radius
                </div>
              </div>

              {/* Explanation */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: BODY_TEXT, lineHeight: 1.6, margin: '0 0 12px' }}>
                  <strong>How it works:</strong> When auto clock-out is enabled, the system monitors employee location in real-time.
                  If an employee moves beyond the geofence radius from the job site and remains outside for the configured delay period,
                  they will be automatically clocked out.
                </p>
                <div style={{
                  background: PANEL_BG,
                  borderRadius: 8,
                  padding: 12,
                  border: `1px solid ${CARD_BORDER}`,
                }}>
                  <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.5 }}>
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
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 28px',
            borderRadius: 8,
            border: 'none',
            background: NAVY,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            boxShadow: '0 2px 4px rgba(22, 58, 95, 0.15)',
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
