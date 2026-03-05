/**
 * Maintenance Mode — Toggle platform maintenance, config message
 * Route: /admin/maintenance
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const BG = '#0F1629';
const CARD = '#1A2540';
const GOLD = '#A08C5A';
const TEXT = '#F0EBE0';
const TEXT_DIM = '#8A9AB8';
const TEXT_MUTED = '#4A5C7A';
const BORDER = '#1E2D4D';

interface MaintenanceConfig {
  is_active: boolean;
  message: string;
  estimated_duration: string;
  bypass_emails: string[];
  activated_at: string | null;
}

interface EventRow {
  id: string;
  event_time: string;
  level: string;
  message: string;
}

const DEFAULT_CONFIG: MaintenanceConfig = {
  is_active: false,
  message: 'EvidLY is currently undergoing scheduled maintenance. We\'ll be back shortly.',
  estimated_duration: '30 minutes',
  bypass_emails: [],
  activated_at: null,
};

export default function MaintenanceMode() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<MaintenanceConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<EventRow[]>([]);
  const [bypassInput, setBypassInput] = useState('');

  const loadConfig = useCallback(async () => {
    setLoading(true);
    const [configRes, historyRes] = await Promise.all([
      supabase.from('admin_security_config').select('config_value').eq('config_key', 'maintenance_mode').maybeSingle(),
      supabase.from('admin_event_log').select('id, event_time, level, message').eq('category', 'maintenance').order('event_time', { ascending: false }).limit(10),
    ]);
    if (configRes.data?.config_value) {
      setConfig({ ...DEFAULT_CONFIG, ...configRes.data.config_value });
    }
    if (historyRes.data) setHistory(historyRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const saveConfig = async (newConfig: MaintenanceConfig) => {
    setSaving(true);
    await supabase.from('admin_security_config').upsert({
      config_key: 'maintenance_mode',
      config_value: newConfig,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'config_key' });

    await supabase.from('admin_event_log').insert({
      level: newConfig.is_active ? 'WARN' : 'INFO',
      category: 'maintenance',
      message: newConfig.is_active
        ? `Maintenance mode ACTIVATED — "${newConfig.message}"`
        : 'Maintenance mode DEACTIVATED — platform back online',
    });

    setConfig(newConfig);
    setSaving(false);
    await loadConfig();
  };

  const toggleMaintenance = () => {
    const updated = {
      ...config,
      is_active: !config.is_active,
      activated_at: !config.is_active ? new Date().toISOString() : null,
    };
    saveConfig(updated);
  };

  const addBypassEmail = () => {
    if (!bypassInput.trim()) return;
    setConfig(c => ({ ...c, bypass_emails: [...c.bypass_emails, bypassInput.trim()] }));
    setBypassInput('');
  };

  const removeBypassEmail = (email: string) => {
    setConfig(c => ({ ...c, bypass_emails: c.bypass_emails.filter(e => e !== email) }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: TEXT_DIM }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 40px', fontFamily: 'Inter, sans-serif' }}>
      <button onClick={() => navigate('/admin')} style={{ marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', color: GOLD, fontSize: 13 }}>&larr; Admin</button>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0, marginBottom: 24 }}>Maintenance Mode</h1>

      {/* Status card */}
      <div style={{
        background: config.is_active ? '#3b141433' : '#0f332633',
        border: `2px solid ${config.is_active ? '#F87171' : '#34D399'}`,
        borderRadius: 12, padding: 24, marginBottom: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>{config.is_active ? '🚧' : '●'}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: config.is_active ? '#F87171' : '#34D399', marginBottom: 4 }}>
          {config.is_active ? 'MAINTENANCE ACTIVE' : 'Platform Live'}
        </div>
        {config.is_active && config.activated_at && (
          <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 12 }}>
            Since {new Date(config.activated_at).toLocaleString()}
          </div>
        )}
        <button onClick={toggleMaintenance} disabled={saving}
          style={{
            padding: '10px 24px', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
            background: config.is_active ? '#34D399' : '#F87171',
            color: config.is_active ? '#0A0F1E' : '#FFF',
          }}>
          {saving ? 'Saving...' : config.is_active ? 'Deactivate — Go Live' : 'Activate Maintenance Mode'}
        </button>
      </div>

      {/* Config form */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 16 }}>Configuration</h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Maintenance Message</label>
          <textarea value={config.message} onChange={e => setConfig(c => ({ ...c, message: e.target.value }))}
            rows={3} style={{ width: '100%', padding: '8px 12px', background: '#0A0F1E', border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 13, resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Estimated Duration</label>
          <input value={config.estimated_duration} onChange={e => setConfig(c => ({ ...c, estimated_duration: e.target.value }))}
            style={{ padding: '8px 12px', background: '#0A0F1E', border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 13, width: 200 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: TEXT_DIM, display: 'block', marginBottom: 4 }}>Bypass Emails (can still access during maintenance)</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={bypassInput} onChange={e => setBypassInput(e.target.value)} placeholder="email@getevidly.com"
              style={{ padding: '8px 12px', background: '#0A0F1E', border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 13, flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && addBypassEmail()} />
            <button onClick={addBypassEmail} style={{ padding: '8px 14px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT_DIM, fontSize: 12, cursor: 'pointer' }}>Add</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {config.bypass_emails.map(email => (
              <span key={email} style={{ padding: '4px 10px', background: '#0A0F1E', borderRadius: 4, fontSize: 11, color: TEXT_DIM, display: 'flex', alignItems: 'center', gap: 6 }}>
                {email}
                <button onClick={() => removeBypassEmail(email)} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: 14, padding: 0 }}>&times;</button>
              </span>
            ))}
          </div>
        </div>

        <button onClick={() => saveConfig(config)} disabled={saving}
          style={{ padding: '8px 20px', background: GOLD, border: 'none', borderRadius: 6, color: '#1E2D4D', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* History */}
      <h3 style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 12 }}>Recent Maintenance Events</h3>
      <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {history.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>No maintenance events recorded yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {history.map(e => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '10px 14px', color: TEXT_DIM, fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(e.event_time).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: e.level === 'WARN' ? '#3b2f10' : '#0f3326',
                      color: e.level === 'WARN' ? '#FBBF24' : '#34D399' }}>{e.level}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: TEXT }}>{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
