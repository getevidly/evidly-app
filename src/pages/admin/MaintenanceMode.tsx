/**
 * Maintenance Mode — Toggle platform maintenance, config message
 * Route: /admin/maintenance
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useDemo } from '../../contexts/DemoContext';
import { useDemoGuard } from '../../hooks/useDemoGuard';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import Button from '../../components/ui/Button';

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
        <div className="text-slate_ui">Loading...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center p-12">
        <p className="text-slate_ui">Failed to load data.</p>
        <Button variant="gold" size="sm" onClick={loadConfig} className="mt-3">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Maintenance Mode' }]} />
      <h1 className="text-2xl font-bold tracking-tight text-navy">Maintenance Mode</h1>

      {/* Status card */}
      <div className={`rounded-xl p-6 text-center border-2 ${
        config.is_active ? 'bg-red-50 border-red-600' : 'bg-green-50 border-emerald-600'
      }`}>
        <div className="text-[32px] mb-2">{config.is_active ? '🚧' : '●'}</div>
        <div className={`text-xl font-extrabold mb-1 ${
          config.is_active ? 'text-red-600' : 'text-emerald-600'
        }`}>
          {config.is_active ? 'MAINTENANCE ACTIVE' : 'Platform Live'}
        </div>
        {config.is_active && config.activated_at && (
          <div className="text-xs text-slate_ui mb-3">
            Since {new Date(config.activated_at).toLocaleString()}
          </div>
        )}
        <Button variant={config.is_active ? 'primary' : 'destructive'} onClick={toggleMaintenance} disabled={saving}
          className={config.is_active ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
          {saving ? 'Saving...' : config.is_active ? 'Deactivate — Go Live' : 'Activate Maintenance Mode'}
        </Button>
      </div>

      {/* Config form */}
      <div className="bg-white border border-border_ui-warm rounded-xl p-5">
        <h3 className="text-sm font-bold text-navy mb-4">Configuration</h3>

        <div className="mb-4">
          <label className="text-xs text-slate_ui block mb-1">Maintenance Message</label>
          <textarea value={config.message} onChange={e => setConfig(c => ({ ...c, message: e.target.value }))}
            rows={3} className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-full resize-y" />
        </div>

        <div className="mb-4">
          <label className="text-xs text-slate_ui block mb-1">Estimated Duration</label>
          <input value={config.estimated_duration} onChange={e => setConfig(c => ({ ...c, estimated_duration: e.target.value }))}
            className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] w-[200px]" />
        </div>

        <div className="mb-4">
          <label className="text-xs text-slate_ui block mb-1">Bypass Emails (can still access during maintenance)</label>
          <div className="flex gap-2 mb-2">
            <input value={bypassInput} onChange={e => setBypassInput(e.target.value)} placeholder="email@getevidly.com"
              className="py-2 px-3 bg-gray-50 border border-gray-300 rounded-md text-navy text-[13px] flex-1"
              onKeyDown={e => e.key === 'Enter' && addBypassEmail()} />
            <Button variant="secondary" size="sm" onClick={addBypassEmail}>Add</Button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {config.bypass_emails.map(email => (
              <span key={email} className="py-1 px-2.5 bg-gray-100 rounded text-[11px] text-slate_ui flex items-center gap-1.5">
                {email}
                <Button variant="ghost" size="sm" onClick={() => removeBypassEmail(email)} className="text-red-600 text-sm p-0 h-auto min-h-0">&times;</Button>
              </span>
            ))}
          </div>
        </div>

        <Button variant="gold" size="sm" onClick={() => saveConfig(config)} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      {/* History */}
      <h3 className="text-sm font-bold text-navy">Recent Maintenance Events</h3>
      <div className="bg-white rounded-xl border border-border_ui-warm overflow-hidden">
        {history.length === 0 ? (
          <div className="py-10 px-5 text-center text-gray-400 text-[13px]">No maintenance events recorded yet.</div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {history.map(e => (
                <tr key={e.id} className="border-b border-border_ui-warm">
                  <td className="py-2.5 px-3.5 text-slate_ui text-xs whitespace-nowrap">{new Date(e.event_time).toLocaleString()}</td>
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
