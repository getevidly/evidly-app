import { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { isHoldingHot, isHoldingCold } from '../../lib/equipmentHelpers';

const METHOD_ICONS = [
  { key: 'typed',  label: 'T', title: 'Typed',  enabled: true  },
  { key: 'sensor', label: 'S', title: 'Sensor', enabled: false },
  { key: 'qr',     label: 'Q', title: 'QR',     enabled: false },
  { key: 'photo',  label: 'P', title: 'Photo',  enabled: false },
  { key: 'voice',  label: 'V', title: 'Voice',  enabled: false },
];

export function LogHoldingCheck({ open, onClose, equipment, heldItems, queuedItems, variant, onSaved }) {
  const { profile } = useAuth();
  const isHot = variant === 'hot';
  const threshold = isHot ? 135 : 41;

  const allItems = useMemo(() => {
    const held = (heldItems ?? []).map(h => ({
      menu_item_id: h.menu_item_id,
      menu_item_name: h.menu_item_name,
    }));
    const queued = (queuedItems ?? []).filter(q =>
      !held.some(h => h.menu_item_id === q.menu_item_id)
    );
    return [...held, ...queued];
  }, [heldItems, queuedItems]);

  const [ambientTemp, setAmbientTemp] = useState('');
  const [foodTemps, setFoodTemps] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!open || !equipment) return null;

  const inRange = (temp) => {
    if (temp === '' || temp == null) return null;
    const n = parseFloat(temp);
    if (Number.isNaN(n)) return null;
    return isHot ? n >= threshold : n <= threshold;
  };

  const tempPercent = (temp) => {
    if (temp === '' || temp == null) return null;
    const n = parseFloat(temp);
    if (Number.isNaN(n)) return null;
    const barMin = isHot ? 100 : 20;
    const barMax = isHot ? 180 : 60;
    return Math.max(2, Math.min(98, ((n - barMin) / (barMax - barMin)) * 100));
  };

  const handleSave = async () => {
    setError(null);
    if (ambientTemp === '') {
      setError('Equipment ambient temperature is required.');
      return;
    }
    const ambientNum = parseFloat(ambientTemp);
    if (Number.isNaN(ambientNum)) {
      setError('Equipment ambient temperature must be a number.');
      return;
    }
    setSaving(true);
    try {
      const readingTime = new Date().toISOString();
      const rows = [];
      rows.push({
        facility_id: equipment.location_id ?? null,
        equipment_id: equipment.id,
        temperature: ambientNum,
        required_min: equipment.min_temp,
        required_max: equipment.max_temp,
        temp_pass: inRange(ambientTemp),
        reading_time: readingTime,
        log_type: isHot ? 'hot_holding' : 'cold_holding',
        step: isHot ? 'hot_holding' : 'cold_holding',
        input_method: 'manual',
        logged_by: profile?.id ?? null,
        menu_item_id: null,
      });
      allItems.forEach((item) => {
        const t = foodTemps[item.menu_item_id];
        if (t === undefined || t === '') return;
        const n = parseFloat(t);
        if (Number.isNaN(n)) return;
        rows.push({
          facility_id: equipment.location_id ?? null,
          equipment_id: equipment.id,
          temperature: n,
          required_min: equipment.min_temp,
          required_max: equipment.max_temp,
          temp_pass: inRange(t),
          reading_time: readingTime,
          log_type: isHot ? 'hot_holding' : 'cold_holding',
          step: isHot ? 'hot_holding' : 'cold_holding',
          input_method: 'manual',
          logged_by: profile?.id ?? null,
          menu_item_id: item.menu_item_id,
        });
      });
      const { error: insertError } = await supabase
        .from('temperature_logs')
        .insert(rows);
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
      setAmbientTemp('');
      setFoodTemps({});
      setSaving(false);
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSaving(false);
    }
  };

  const RangeBar = ({ percent }) => (
    <div className="relative h-2.5 rounded-full overflow-hidden flex mt-2">
      <div
        style={{
          backgroundColor: isHot ? '#F09595' : '#C0DD97',
          flex: isHot ? '0 0 35%' : '1',
        }}
      />
      <div
        style={{
          backgroundColor: isHot ? '#C0DD97' : '#F09595',
          flex: isHot ? '1' : '0 0 35%',
        }}
      />
      {percent != null && (
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-white"
          style={{ top: '-3px', left: `${percent}%`, transform: 'translateX(-50%)', border: '1.5px solid #1E2D4D' }}
        />
      )}
    </div>
  );

  const MethodIcons = () => (
    <div className="flex gap-1">
      {METHOD_ICONS.map(m => (
        <button
          key={m.key}
          type="button"
          disabled={!m.enabled}
          title={m.title + (m.enabled ? '' : ' (coming soon)')}
          className="w-8 h-8 rounded-md text-xs font-medium flex items-center justify-center"
          style={{
            border: '0.5px solid #E5E5E0',
            backgroundColor: m.key === 'typed' ? '#E1F5EE' : 'transparent',
            color: m.key === 'typed' ? '#0F6E56' : '#888780',
            opacity: m.enabled ? 1 : 0.4,
            cursor: m.enabled ? 'pointer' : 'not-allowed',
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <Modal isOpen={open} onClose={onClose} size="md">
      <div className="p-5">
        <h3 className="text-base font-semibold mb-1" style={{ color: '#1E2D4D' }}>
          Log check — {equipment.name}
        </h3>
        <p className="text-xs mb-4" style={{ color: '#888780' }}>
          Default: Typed. Method switching coming soon.
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium flex-1" style={{ color: '#1E2D4D' }}>
                Equipment ambient
              </span>
              <input
                type="number"
                inputMode="decimal"
                className="w-20 px-2 py-2 rounded-md text-sm text-right"
                style={{ border: '0.5px solid #B4B2A9', minHeight: '44px' }}
                value={ambientTemp}
                onChange={(e) => setAmbientTemp(e.target.value)}
                placeholder="--"
              />
              <span className="text-xs w-6" style={{ color: '#888780' }}>°F</span>
            </div>
            <p className="text-[11px] mb-1" style={{ color: '#888780' }}>
              required {isHot ? '≥' : '≤'} {threshold}°F
            </p>
            <RangeBar percent={tempPercent(ambientTemp)} />
          </div>
          {allItems.map(item => {
            const t = foodTemps[item.menu_item_id] ?? '';
            return (
              <div key={item.menu_item_id}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium flex-1" style={{ color: '#1E2D4D' }}>
                    {item.menu_item_name}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-20 px-2 py-2 rounded-md text-sm text-right"
                    style={{ border: '0.5px solid #B4B2A9', minHeight: '44px' }}
                    value={t}
                    onChange={(e) => setFoodTemps(prev => ({ ...prev, [item.menu_item_id]: e.target.value }))}
                    placeholder="--"
                  />
                  <span className="text-xs w-6" style={{ color: '#888780' }}>°F</span>
                </div>
                <p className="text-[11px] mb-1" style={{ color: '#888780' }}>
                  required {isHot ? '≥' : '≤'} {threshold}°F · probe
                </p>
                <RangeBar percent={tempPercent(t)} />
              </div>
            );
          })}
          <div className="flex items-center gap-2 pt-2" style={{ borderTop: '0.5px solid #E5E5E0' }}>
            <span className="text-[11px] flex-1" style={{ color: '#888780' }}>
              Methods: T Typed (active) · S/Q/P/V coming soon
            </span>
            <MethodIcons />
          </div>
          {error && (
            <p className="text-sm" style={{ color: '#A32D2D' }}>{error}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-md text-sm"
              style={{ border: '0.5px solid #B4B2A9', color: '#1E2D4D', backgroundColor: 'transparent', minHeight: '44px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-md text-sm font-medium"
              style={{ backgroundColor: '#1E2D4D', color: 'white', minHeight: '44px', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save check'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default LogHoldingCheck;
