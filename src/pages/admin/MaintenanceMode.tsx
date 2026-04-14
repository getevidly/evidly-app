/**
 * Maintenance Mode — Toggle platform maintenance, config message
 * Route: /admin/maintenance
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';

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
  useDemoGuard();
  const { isDemoMode } = useDemo();
  const [config, setConfig] = useState<MaintenanceConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<EventRow[]>([]);
  const [bypassInput, setBypassInput] = useState('');

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [configRes, historyRes] = await Promise.all([
        supabase.from('admin_security_config').select('config_value').eq('config_key', 'maintenance_mode').maybeSingle(),
        supabase.from('admin_event_log').select('id, event_time, level, message').eq('category', 'maintenance').order('event_time', { ascending: false }).limit(10),
      ]);
      if (configRes.data?.config_value) {
        setConfig({ ...DEFAULT_CONFIG, ...configRes.data.config_value });
      }
      if (historyRes.data) setHistory(historyRes.data);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const saveConfig = async (newConfig: MaintenanceConfig) => {
    if (isDemoMode) return;
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
      <div className="flex items-center justify-center py-20">
        <div className="text-[#6B7F96]">Loading...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center p-12">
        <p className="text-[#6B7F96]">Failed to load data.</p>
        <button onClick={loadConfig} className="mt-3 bg-gold text-white border-none rounded-md py-2 px-5 cursor-pointer">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Maintenance Mode' }]} />
      <h1 className="text-2xl font-bold tracking-tight text-navy">Maintenance Mode</h1>

      {/* Status card */}
      <div className={`rounded-xl p-6 text-center border-2 ${
        config.is_active ? 'bg-[#FEF2F2] border-[#DC2626]' : 'bg-[#F0FFF4] border-[#059669]'
      }`}>
        <div className="text-[32px] mb-2">{config.is_active ? '🚧' : '●'}</div>
        <div className={`text-xl font-extrabold mb-1 ${
          config.is_active ? 'text-[#DC2626]' : 'text-[#059669]'
        }`}>
          {config.is_active ? 'MAINTENANCE ACTIVE' : 'Platform Live'}
        </div>
        {config.is_active && config.activated_at && (
          <div className="text-xs text-[#6B7F96] mb-3">
            Since {new Date(config.activated_at).toLocaleString()}
          </div>
        )}
        <button onClick={toggleMaintenance} disabled={saving}
          className={`py-2.5 px-6 border-none rounded-lg text-sm font-bold text-white ${
            saving ? 'cursor-default' : 'cursor-pointer'
          } ${config.is_active ? 'bg-[#059669]' : 'bg-[#DC2626]'}`}>
          {saving ? 'Saving...' : config.is_active ? 'Deactivate — Go Live' : 'Activate Maintenance Mode'}
        </button>
      </div>

      {/* Config form */}
      <div className="bg-white border border-[#E2D9C8] rounded-xl p-5">
        <h3 className="text-sm font-bold text-navy mb-4">Configuration</h3>

        <div className="mb-4">
          <label className="text-xs text-[#6B7F96] block mb-1">Maintenance Message</label>
          <textarea value={config.message} onChange={e => setConfig(c => ({ ...c, message: e.target.value }))}
            rows={3} className="py-2 px-3 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-[13px] w-full resize-y" />
        </div>

        <div className="mb-4">
          <label className="text-xs text-[#6B7F96] block mb-1">Estimated Duration</label>
          <input value={config.estimated_duration} onChange={e => setConfig(c => ({ ...c, estimated_duration: e.target.value }))}
            className="py-2 px-3 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-[13px] w-[200px]" />
        </div>

        <div className="mb-4">
          <label className="text-xs text-[#6B7F96] block mb-1">Bypass Emails (can still access during maintenance)</label>
          <div className="flex gap-2 mb-2">
            <input value={bypassInput} onChange={e => setBypassInput(e.target.value)} placeholder="email@getevidly.com"
              className="py-2 px-3 bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-navy text-[13px] flex-1"
              onKeyDown={e => e.key === 'Enter' && addBypassEmail()} />
            <button onClick={addBypassEmail} className="py-2 px-3.5 bg-[#F9FAFB] border border-[#E2D9C8] rounded-md text-[#6B7F96] text-xs cursor-pointer">Add</button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {config.bypass_emails.map(email => (
              <span key={email} className="py-1 px-2.5 bg-[#F3F4F6] rounded text-[11px] text-[#6B7F96] flex items-center gap-1.5">
                {email}
                <button onClick={() => removeBypassEmail(email)} className="bg-transparent border-none text-[#DC2626] cursor-pointer text-sm p-0">&times;</button>
              </span>
            ))}
          </div>
        </div>

        <button onClick={() => saveConfig(config)} disabled={saving}
          className={`py-2 px-5 border-none rounded-md text-white text-[13px] font-bold ${
            saving ? 'bg-[#E5E7EB] cursor-default' : 'bg-gold cursor-pointer'
          }`}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* History */}
      <h3 className="text-sm font-bold text-navy">Recent Maintenance Events</h3>
      <div className="bg-white rounded-xl border border-[#E2D9C8] overflow-hidden">
        {history.length === 0 ? (
          <div className="py-10 px-5 text-center text-[#9CA3AF] text-[13px]">No maintenance events recorded yet.</div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {history.map(e => (
                <tr key={e.id} className="border-b border-[#E2D9C8]">
                  <td className="py-2.5 px-3.5 text-[#6B7F96] text-xs whitespace-nowrap">{new Date(e.event_time).toLocaleString()}</td>
                  <td className="py-2.5 px-3.5">
                    <span className="py-0.5 px-2 rounded text-[10px] font-bold"
                      style={{
                        background: e.level === 'WARN' ? '#FFFBEB' : '#F0FFF4',
                        color: e.level === 'WARN' ? '#D97706' : '#059669',
                      }}>{e.level}</span>
                  </td>
                  <td className="py-2.5 px-3.5 text-navy">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
