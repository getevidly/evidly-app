import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useDemo } from './DemoContext';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { dayPatternToBooleans, booleansToDayPattern } from '../lib/shifts';
import { toast } from 'sonner';

export interface LocationHours {
  locationName: string;
  days: boolean[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  openTime: string; // 24h "05:00"
  closeTime: string; // 24h "23:00"
}

export interface ShiftConfig {
  id: string;
  name: string;
  locationName: string;
  startTime: string; // 24h "05:00"
  endTime: string;   // 24h "13:00"
  days: boolean[];   // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
}

// ── Defaults (demo defaults) ──
const DEMO_HOURS: LocationHours[] = [
  { locationName: 'Location 1', days: [false, true, true, true, true, true, true], openTime: '05:00', closeTime: '23:00' }, // demo
  { locationName: 'Location 2', days: [true, true, true, true, true, true, true], openTime: '04:00', closeTime: '22:00' }, // demo
  { locationName: 'Location 3', days: [false, true, true, true, true, true, false], openTime: '06:00', closeTime: '21:00' }, // demo
];

const DEMO_SHIFTS: ShiftConfig[] = [
  { id: 's1', name: 'Morning', locationName: 'Location 1', startTime: '05:00', endTime: '13:00', days: [false, true, true, true, true, true, true] }, // demo
  { id: 's2', name: 'Evening', locationName: 'Location 1', startTime: '13:00', endTime: '23:00', days: [false, true, true, true, true, true, true] }, // demo
  { id: 's3', name: 'Morning', locationName: 'Location 2', startTime: '04:00', endTime: '12:00', days: [true, true, true, true, true, true, true] }, // demo
  { id: 's4', name: 'Afternoon', locationName: 'Location 2', startTime: '12:00', endTime: '22:00', days: [true, true, true, true, true, true, true] }, // demo
  { id: 's5', name: 'Morning', locationName: 'Location 3', startTime: '06:00', endTime: '14:00', days: [false, true, true, true, true, true, false] }, // demo
  { id: 's6', name: 'Evening', locationName: 'Location 3', startTime: '14:00', endTime: '21:00', days: [false, true, true, true, true, true, false] }, // demo
];

// ── Helpers ──
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatTime24to12(t: string): string {
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr);
  const m = mStr || '00';
  if (h === 0) return `12:${m} AM`;
  if (h < 12) return `${h}:${m} AM`;
  if (h === 12) return `12:${m} PM`;
  return `${h - 12}:${m} PM`;
}

export function time24ToHour(t: string): number {
  const h = parseInt(t.split(':')[0]);
  return t === '00:00' ? 24 : h;
}

export function generateOpeningTimes() {
  const times: { value: string; label: string }[] = [];
  for (let h = 4; h <= 12; h++) {
    times.push({ value: `${String(h).padStart(2, '0')}:00`, label: formatTime24to12(`${String(h).padStart(2, '0')}:00`) });
    if (h < 12) times.push({ value: `${String(h).padStart(2, '0')}:30`, label: formatTime24to12(`${String(h).padStart(2, '0')}:30`) });
  }
  return times;
}

export function generateClosingTimes() {
  const times: { value: string; label: string }[] = [];
  for (let h = 16; h <= 23; h++) {
    times.push({ value: `${String(h).padStart(2, '0')}:00`, label: formatTime24to12(`${String(h).padStart(2, '0')}:00`) });
    times.push({ value: `${String(h).padStart(2, '0')}:30`, label: formatTime24to12(`${String(h).padStart(2, '0')}:30`) });
  }
  times.push({ value: '00:00', label: '12:00 AM' });
  return times;
}

export function generateAllTimes() {
  const times: { value: string; label: string }[] = [];
  for (let h = 0; h <= 23; h++) {
    times.push({ value: `${String(h).padStart(2, '0')}:00`, label: formatTime24to12(`${String(h).padStart(2, '0')}:00`) });
    times.push({ value: `${String(h).padStart(2, '0')}:30`, label: formatTime24to12(`${String(h).padStart(2, '0')}:30`) });
  }
  return times;
}

export { DAY_LABELS };

// ── Context ──
interface OperatingHoursContextType {
  locationHours: LocationHours[];
  setLocationHours: (hours: LocationHours[]) => void;
  updateLocationHours: (locationName: string, hours: Partial<LocationHours>) => void;
  shifts: ShiftConfig[];
  setShifts: (shifts: ShiftConfig[]) => void;
  addShift: (shift: Omit<ShiftConfig, 'id'>) => Promise<void>;
  removeShift: (id: string) => Promise<void>;
  updateShift: (id: string, updates: Partial<ShiftConfig>) => Promise<void>;
  getHoursForLocation: (locationName: string) => LocationHours | undefined;
  getShiftsForLocation: (locationName: string) => ShiftConfig[];
}

const OperatingHoursContext = createContext<OperatingHoursContextType | undefined>(undefined);

export function OperatingHoursProvider({ children }: { children: ReactNode }) {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [locationHours, setLocationHours] = useState<LocationHours[]>(isDemoMode ? DEMO_HOURS : []);
  const [shifts, setShifts] = useState<ShiftConfig[]>(isDemoMode ? DEMO_SHIFTS : []);
  const locNameToIdRef = useRef<Record<string, string>>({});

  // ── Fetch location map helper (used by load + stale-cache refresh) ──
  const fetchLocationMap = useCallback(async (org: string) => {
    const { data: locs } = await supabase
      .from('locations')
      .select('id, name')
      .eq('organization_id', org);
    const idToName: Record<string, string> = {};
    const nameToId: Record<string, string> = {};
    for (const loc of locs || []) {
      idToName[loc.id] = loc.name;
      nameToId[loc.name] = loc.id;
    }
    locNameToIdRef.current = nameToId;
    return { idToName, nameToId };
  }, []);

  // ── Load shift_templates from DB (live mode only) ──
  useEffect(() => {
    if (isDemoMode || !orgId) return;
    (async () => {
      const { idToName } = await fetchLocationMap(orgId);

      const { data: templates } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('start_time', { ascending: true });
      if (templates && templates.length > 0) {
        setShifts(templates.map(t => ({
          id: t.id,
          name: t.name,
          locationName: idToName[t.location_id] || 'Unknown',
          startTime: (t.start_time as string)?.slice(0, 5) || '00:00',
          endTime: (t.end_time as string)?.slice(0, 5) || '00:00',
          days: dayPatternToBooleans(t.day_of_week_pattern || 'MTWRFSU'),
        })));
      }
    })();
  }, [isDemoMode, orgId, fetchLocationMap]);

  const updateLocationHours = (locationName: string, updates: Partial<LocationHours>) => {
    setLocationHours(prev => prev.map(h => h.locationName === locationName ? { ...h, ...updates } : h));
  };

  const addShift = useCallback(async (shift: Omit<ShiftConfig, 'id'>) => {
    const tempId = `s-${Date.now()}`;
    setShifts(prev => [...prev, { ...shift, id: tempId }]);

    if (!isDemoMode && orgId) {
      try {
        let locationId = locNameToIdRef.current[shift.locationName];
        if (!locationId) {
          await fetchLocationMap(orgId);
          locationId = locNameToIdRef.current[shift.locationName];
        }
        if (!locationId) {
          throw new Error('Location not found in your organization');
        }
        const { data, error } = await supabase
          .from('shift_templates')
          .insert({
            organization_id: orgId,
            location_id: locationId,
            name: shift.name,
            start_time: shift.startTime,
            end_time: shift.endTime,
            day_of_week_pattern: booleansToDayPattern(shift.days),
          })
          .select('id')
          .single();
        if (error) throw error;
        if (data) {
          setShifts(prev => prev.map(s => s.id === tempId ? { ...s, id: data.id } : s));
        }
      } catch (err) {
        console.error('[OperatingHours] addShift failed:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to save shift');
        setShifts(prev => prev.filter(s => s.id !== tempId));
      }
    }
  }, [isDemoMode, orgId, fetchLocationMap]);

  const removeShift = useCallback(async (id: string) => {
    let removed: ShiftConfig | undefined;
    let removedIndex = -1;
    setShifts(prev => {
      removedIndex = prev.findIndex(s => s.id === id);
      removed = prev[removedIndex];
      return prev.filter(s => s.id !== id);
    });

    if (!isDemoMode && !id.startsWith('s-')) {
      try {
        const { error } = await supabase
          .from('shift_templates')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('[OperatingHours] removeShift failed:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to remove shift');
        if (removed) {
          setShifts(prev => {
            const next = [...prev];
            next.splice(removedIndex >= 0 ? removedIndex : next.length, 0, removed!);
            return next;
          });
        }
      }
    }
  }, [isDemoMode]);

  const updateShift = useCallback(async (id: string, updates: Partial<ShiftConfig>) => {
    let previous: ShiftConfig | undefined;
    setShifts(prev => prev.map(s => {
      if (s.id === id) {
        previous = s;
        return { ...s, ...updates };
      }
      return s;
    }));

    if (!isDemoMode && !id.startsWith('s-')) {
      try {
        const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
        if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
        if (updates.days !== undefined) dbUpdates.day_of_week_pattern = booleansToDayPattern(updates.days);
        if (updates.locationName !== undefined) {
          let locationId = locNameToIdRef.current[updates.locationName];
          if (!locationId && orgId) {
            await fetchLocationMap(orgId);
            locationId = locNameToIdRef.current[updates.locationName];
          }
          if (locationId) dbUpdates.location_id = locationId;
        }
        const { error } = await supabase
          .from('shift_templates')
          .update(dbUpdates)
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('[OperatingHours] updateShift failed:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to update shift');
        if (previous) {
          setShifts(prev => prev.map(s => s.id === id ? previous! : s));
        }
      }
    }
  }, [isDemoMode, orgId, fetchLocationMap]);

  const getHoursForLocation = (locationName: string) => locationHours.find(h => h.locationName === locationName);
  const getShiftsForLocation = (locationName: string) => shifts.filter(s => s.locationName === locationName || s.locationName === 'All Locations');

  return (
    <OperatingHoursContext.Provider value={{
      locationHours, setLocationHours,
      updateLocationHours,
      shifts, setShifts,
      addShift, removeShift, updateShift,
      getHoursForLocation, getShiftsForLocation,
    }}>
      {children}
    </OperatingHoursContext.Provider>
  );
}

export function useOperatingHours() {
  const context = useContext(OperatingHoursContext);
  if (!context) throw new Error('useOperatingHours must be used within an OperatingHoursProvider');
  return context;
}
