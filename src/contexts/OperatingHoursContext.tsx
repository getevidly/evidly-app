import { createContext, useContext, useState, ReactNode } from 'react';
import { useDemo } from './DemoContext';

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
  { locationName: 'Downtown Kitchen', days: [false, true, true, true, true, true, true], openTime: '05:00', closeTime: '23:00' }, // demo
  { locationName: 'Airport Cafe', days: [true, true, true, true, true, true, true], openTime: '04:00', closeTime: '22:00' }, // demo
  { locationName: 'University Dining', days: [false, true, true, true, true, true, false], openTime: '06:00', closeTime: '21:00' }, // demo
];

const DEMO_SHIFTS: ShiftConfig[] = [
  { id: 's1', name: 'Morning', locationName: 'Downtown Kitchen', startTime: '05:00', endTime: '13:00', days: [false, true, true, true, true, true, true] }, // demo
  { id: 's2', name: 'Evening', locationName: 'Downtown Kitchen', startTime: '13:00', endTime: '23:00', days: [false, true, true, true, true, true, true] }, // demo
  { id: 's3', name: 'Morning', locationName: 'Airport Cafe', startTime: '04:00', endTime: '12:00', days: [true, true, true, true, true, true, true] }, // demo
  { id: 's4', name: 'Afternoon', locationName: 'Airport Cafe', startTime: '12:00', endTime: '22:00', days: [true, true, true, true, true, true, true] }, // demo
  { id: 's5', name: 'Morning', locationName: 'University Dining', startTime: '06:00', endTime: '14:00', days: [false, true, true, true, true, true, false] }, // demo
  { id: 's6', name: 'Evening', locationName: 'University Dining', startTime: '14:00', endTime: '21:00', days: [false, true, true, true, true, true, false] }, // demo
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
  addShift: (shift: Omit<ShiftConfig, 'id'>) => void;
  removeShift: (id: string) => void;
  updateShift: (id: string, updates: Partial<ShiftConfig>) => void;
  getHoursForLocation: (locationName: string) => LocationHours | undefined;
  getShiftsForLocation: (locationName: string) => ShiftConfig[];
}

const OperatingHoursContext = createContext<OperatingHoursContextType | undefined>(undefined);

export function OperatingHoursProvider({ children }: { children: ReactNode }) {
  const { isDemoMode } = useDemo();
  const [locationHours, setLocationHours] = useState<LocationHours[]>(isDemoMode ? DEMO_HOURS : []);
  const [shifts, setShifts] = useState<ShiftConfig[]>(isDemoMode ? DEMO_SHIFTS : []);

  const updateLocationHours = (locationName: string, updates: Partial<LocationHours>) => {
    setLocationHours(prev => prev.map(h => h.locationName === locationName ? { ...h, ...updates } : h));
  };

  const addShift = (shift: Omit<ShiftConfig, 'id'>) => {
    setShifts(prev => [...prev, { ...shift, id: `s-${Date.now()}` }]);
  };

  const removeShift = (id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id));
  };

  const updateShift = (id: string, updates: Partial<ShiftConfig>) => {
    setShifts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

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
