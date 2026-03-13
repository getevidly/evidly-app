/**
 * TIMECARDS-1 — Timecard Types, Demo Data & Helpers
 *
 * Programmatically generated shifts for 9 employees across the current week.
 * CA overtime rules: >8h/day = OT, >12h/day = DT.
 */

// ── Types ─────────────────────────────────────────────────────

export type ShiftStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
export type AnomalyType = 'outside_geofence' | 'long_shift' | 'short_shift' | 'missing_photo' | 'manual_override';
export type PayPeriodStatus = 'open' | 'closed' | 'processing' | 'paid';

export interface ShiftEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  locationId: string;
  locationName: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakMinutes: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  status: ShiftStatus;
  notes: string | null;
  anomalies: AnomalyType[];
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
}

export interface PayPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: PayPeriodStatus;
  employeeCount: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalDoubleTimeHours: number;
  closedBy: string | null;
  closedAt: string | null;
}

export interface EmployeeWeekSummary {
  employeeId: string;
  employeeName: string;
  role: string;
  locationName: string;
  dailyHours: (number | null)[];
  totalRegular: number;
  totalOT: number;
  totalDT: number;
  totalHours: number;
  pendingCount: number;
}

// ── Status Configs ────────────────────────────────────────────

export const SHIFT_STATUS_CONFIG: Record<ShiftStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  color: '#d97706', bg: '#fffbeb' },
  approved: { label: 'Approved', color: '#16a34a', bg: '#f0fdf4' },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2' },
  flagged:  { label: 'Flagged',  color: '#ea580c', bg: '#fff7ed' },
};

export const PAY_PERIOD_STATUS_CONFIG: Record<PayPeriodStatus, { label: string; color: string; bg: string }> = {
  open:       { label: 'Open',       color: '#2563eb', bg: '#eff6ff' },
  closed:     { label: 'Closed',     color: '#6b7280', bg: '#f3f4f6' },
  processing: { label: 'Processing', color: '#d97706', bg: '#fffbeb' },
  paid:       { label: 'Paid',       color: '#16a34a', bg: '#f0fdf4' },
};

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  outside_geofence: 'Outside Geofence',
  long_shift: 'Unusually Long Shift',
  short_shift: 'Unusually Short Shift',
  missing_photo: 'Missing Verification Photo',
  manual_override: 'Manual Time Override',
};

// ── Employee definitions (aligned with Team.tsx d1-d9) ────────

interface EmpDef {
  id: string;
  name: string;
  role: string;
  locationId: string;
  locationName: string;
}

const EMPLOYEES: EmpDef[] = [
  { id: 'd1', name: 'Marcus Johnson',   role: 'admin',   locationId: 'downtown',   locationName: 'Downtown Kitchen' },
  { id: 'd2', name: 'Sofia Chen',       role: 'manager', locationId: 'downtown',   locationName: 'Downtown Kitchen' },
  { id: 'd3', name: 'David Kim',        role: 'manager', locationId: 'airport',    locationName: 'Airport Concourse B' },
  { id: 'd4', name: 'Ana Torres',       role: 'staff',   locationId: 'downtown',   locationName: 'Downtown Kitchen' },
  { id: 'd5', name: 'Lisa Nguyen',      role: 'staff',   locationId: 'airport',    locationName: 'Airport Concourse B' },
  { id: 'd6', name: 'Michael Torres',   role: 'staff',   locationId: 'university', locationName: 'University Dining Hall' },
  { id: 'd7', name: 'James Park',       role: 'staff',   locationId: 'university', locationName: 'University Dining Hall' },
  { id: 'd8', name: 'Rachel Green',     role: 'staff',   locationId: 'downtown',   locationName: 'Downtown Kitchen' },
  { id: 'd9', name: 'Carlos Mendez',    role: 'staff',   locationId: 'airport',    locationName: 'Airport Concourse B' },
];

// ── Date / Time Helpers ───────────────────────────────────────

function getMonday(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatTime(h: number, m: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function calcHours(inH: number, inM: number, outH: number, outM: number, breakMin: number): { total: number; regular: number; ot: number; dt: number } {
  const worked = (outH * 60 + outM - inH * 60 - inM - breakMin) / 60;
  const total = Math.round(Math.max(0, worked) * 100) / 100;
  let regular = total, ot = 0, dt = 0;
  if (total > 12) { regular = 8; ot = 4; dt = Math.round((total - 12) * 100) / 100; }
  else if (total > 8) { regular = 8; ot = Math.round((total - 8) * 100) / 100; }
  else { regular = total; }
  return { total, regular, ot, dt };
}

// ── Schedule templates (index by dayOfWeek 0=Mon..6=Sun) ──────

interface ShiftTemplate {
  inH: number; inM: number; outH: number; outM: number; breakMin: number;
}

// Each employee has a schedule pattern for the week.
// null = day off. Patterns vary by employee to create realistic data.
const SCHEDULES: Record<string, (ShiftTemplate | null)[]> = {
  d1: [ // Marcus — admin, M-F 8-5
    { inH: 8, inM: 0, outH: 17, outM: 0, breakMin: 30 },
    { inH: 8, inM: 5, outH: 17, outM: 15, breakMin: 30 },
    { inH: 7, inM: 55, outH: 17, outM: 30, breakMin: 30 },
    { inH: 8, inM: 0, outH: 17, outM: 0, breakMin: 30 },
    { inH: 8, inM: 10, outH: 16, outM: 45, breakMin: 30 },
    null, null,
  ],
  d2: [ // Sofia — manager, M-F 7-4
    { inH: 7, inM: 0, outH: 16, outM: 0, breakMin: 30 },
    { inH: 7, inM: 0, outH: 16, outM: 15, breakMin: 30 },
    { inH: 6, inM: 45, outH: 16, outM: 0, breakMin: 30 },
    { inH: 7, inM: 0, outH: 16, outM: 0, breakMin: 30 },
    { inH: 7, inM: 0, outH: 15, outM: 30, breakMin: 30 },
    null, null,
  ],
  d3: [ // David — manager, M-F with long Wed
    { inH: 8, inM: 0, outH: 16, outM: 30, breakMin: 30 },
    { inH: 8, inM: 0, outH: 16, outM: 30, breakMin: 30 },
    { inH: 6, inM: 0, outH: 19, outM: 0, breakMin: 45 }, // long day — OT
    { inH: 8, inM: 0, outH: 16, outM: 30, breakMin: 30 },
    { inH: 8, inM: 0, outH: 16, outM: 0, breakMin: 30 },
    null, null,
  ],
  d4: [ // Ana — staff, Tu-Sat
    null,
    { inH: 6, inM: 0, outH: 14, outM: 30, breakMin: 30 },
    { inH: 6, inM: 0, outH: 14, outM: 30, breakMin: 30 },
    { inH: 6, inM: 0, outH: 14, outM: 30, breakMin: 30 },
    { inH: 6, inM: 0, outH: 14, outM: 30, breakMin: 30 },
    { inH: 6, inM: 0, outH: 14, outM: 0, breakMin: 30 },
    null,
  ],
  d5: [ // Lisa — staff, M-F with late start
    { inH: 10, inM: 0, outH: 18, outM: 30, breakMin: 30 },
    { inH: 10, inM: 0, outH: 18, outM: 30, breakMin: 30 },
    { inH: 10, inM: 0, outH: 18, outM: 30, breakMin: 30 },
    { inH: 10, inM: 15, outH: 18, outM: 30, breakMin: 30 },
    { inH: 10, inM: 0, outH: 18, outM: 0, breakMin: 30 },
    null, null,
  ],
  d6: [ // Michael — staff, Su-Th
    { inH: 7, inM: 0, outH: 15, outM: 30, breakMin: 30 },
    { inH: 7, inM: 0, outH: 15, outM: 30, breakMin: 30 },
    { inH: 7, inM: 0, outH: 15, outM: 30, breakMin: 30 },
    { inH: 7, inM: 0, outH: 15, outM: 30, breakMin: 30 },
    null,
    null,
    { inH: 8, inM: 0, outH: 16, outM: 0, breakMin: 30 }, // Sun
  ],
  d7: [ // James — staff, M-F, one long day
    { inH: 9, inM: 0, outH: 17, outM: 30, breakMin: 30 },
    { inH: 9, inM: 0, outH: 17, outM: 30, breakMin: 30 },
    { inH: 9, inM: 0, outH: 17, outM: 30, breakMin: 30 },
    { inH: 7, inM: 0, outH: 20, outM: 0, breakMin: 45 }, // 12.25h — OT + DT
    { inH: 9, inM: 0, outH: 17, outM: 0, breakMin: 30 },
    null, null,
  ],
  d8: [ // Rachel — staff, M-F early shifts
    { inH: 5, inM: 30, outH: 14, outM: 0, breakMin: 30 },
    { inH: 5, inM: 30, outH: 14, outM: 0, breakMin: 30 },
    { inH: 5, inM: 45, outH: 14, outM: 0, breakMin: 30 },
    { inH: 5, inM: 30, outH: 14, outM: 0, breakMin: 30 },
    { inH: 5, inM: 30, outH: 13, outM: 30, breakMin: 30 },
    null, null,
  ],
  d9: [ // Carlos — staff, W-Su
    null, null,
    { inH: 11, inM: 0, outH: 19, outM: 30, breakMin: 30 },
    { inH: 11, inM: 0, outH: 19, outM: 30, breakMin: 30 },
    { inH: 11, inM: 0, outH: 19, outM: 30, breakMin: 30 },
    { inH: 10, inM: 0, outH: 18, outM: 30, breakMin: 30 },
    { inH: 10, inM: 0, outH: 18, outM: 0, breakMin: 30 },
  ],
};

// ── Generate Demo Shifts ──────────────────────────────────────

function generateShifts(): ShiftEntry[] {
  const monday = getMonday();
  const today = dateStr(new Date());
  const shifts: ShiftEntry[] = [];
  let id = 1;

  for (const emp of EMPLOYEES) {
    const schedule = SCHEDULES[emp.id];
    if (!schedule) continue;

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const tmpl = schedule[dayIdx];
      if (!tmpl) continue;

      const shiftDate = dateStr(addDays(monday, dayIdx));

      // Skip future days (no shifts generated)
      if (shiftDate > today) continue;

      const hrs = calcHours(tmpl.inH, tmpl.inM, tmpl.outH, tmpl.outM, tmpl.breakMin);

      // Determine if today and currently "clocked in" (d4 Ana is clocked in today)
      const isToday = shiftDate === today;
      const isClockedIn = isToday && emp.id === 'd4';

      // Determine status based on patterns
      let status: ShiftStatus;
      let approvedBy: string | null = null;
      let approvedAt: string | null = null;
      let rejectionReason: string | null = null;
      const anomalies: AnomalyType[] = [];
      let notes: string | null = null;

      if (isClockedIn) {
        status = 'pending';
      } else if (isToday) {
        status = 'pending';
      } else if (id % 11 === 0) {
        status = 'rejected';
        rejectionReason = 'Hours do not match schedule. Please verify and resubmit.';
      } else if (id % 7 === 0) {
        status = 'flagged';
        anomalies.push('outside_geofence');
        notes = 'GPS location did not match expected work site.';
      } else if (dayIdx <= 2) {
        // Earlier days in the week more likely approved
        status = 'approved';
        approvedBy = emp.role === 'admin' ? 'Sofia Chen' : 'Marcus Johnson';
        approvedAt = shiftDate + 'T20:00:00Z';
      } else {
        status = 'pending';
      }

      // Add anomalies for specific patterns
      if (hrs.total > 10 && anomalies.length === 0) {
        anomalies.push('long_shift');
      }
      if (hrs.total < 4 && anomalies.length === 0) {
        anomalies.push('short_shift');
      }

      shifts.push({
        id: `sh-${id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        locationId: emp.locationId,
        locationName: emp.locationName,
        date: shiftDate,
        clockIn: isClockedIn ? formatTime(tmpl.inH, tmpl.inM) : formatTime(tmpl.inH, tmpl.inM),
        clockOut: isClockedIn ? null : formatTime(tmpl.outH, tmpl.outM),
        breakMinutes: isClockedIn ? 0 : tmpl.breakMin,
        totalHours: isClockedIn ? 0 : hrs.total,
        regularHours: isClockedIn ? 0 : hrs.regular,
        overtimeHours: isClockedIn ? 0 : hrs.ot,
        doubleTimeHours: isClockedIn ? 0 : hrs.dt,
        status,
        notes,
        anomalies,
        approvedBy,
        approvedAt,
        rejectionReason,
      });
      id++;
    }
  }
  return shifts;
}

export const DEMO_SHIFTS: ShiftEntry[] = generateShifts();

// ── Demo Pay Periods ──────────────────────────────────────────

const monday = getMonday();

export const DEMO_PAY_PERIODS: PayPeriod[] = [
  {
    id: 'pp-1',
    startDate: dateStr(addDays(monday, -14)),
    endDate: dateStr(addDays(monday, -8)),
    status: 'paid',
    employeeCount: 9,
    totalRegularHours: 312,
    totalOvertimeHours: 18.5,
    totalDoubleTimeHours: 0,
    closedBy: 'Sofia Chen',
    closedAt: dateStr(addDays(monday, -7)) + 'T18:00:00Z',
  },
  {
    id: 'pp-2',
    startDate: dateStr(addDays(monday, -7)),
    endDate: dateStr(addDays(monday, -1)),
    status: 'closed',
    employeeCount: 9,
    totalRegularHours: 306,
    totalOvertimeHours: 22.25,
    totalDoubleTimeHours: 1.25,
    closedBy: 'Sofia Chen',
    closedAt: dateStr(monday) + 'T09:00:00Z',
  },
  {
    id: 'pp-3',
    startDate: dateStr(monday),
    endDate: dateStr(addDays(monday, 6)),
    status: 'open',
    employeeCount: 9,
    totalRegularHours: 0,
    totalOvertimeHours: 0,
    totalDoubleTimeHours: 0,
    closedBy: null,
    closedAt: null,
  },
];

// ── DAY_LABELS ────────────────────────────────────────────────

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Helpers ───────────────────────────────────────────────────

export function getWeekDates(): string[] {
  const mon = getMonday();
  return Array.from({ length: 7 }, (_, i) => dateStr(addDays(mon, i)));
}

export function getShiftsByEmployee(employeeId: string): ShiftEntry[] {
  return DEMO_SHIFTS.filter(s => s.employeeId === employeeId);
}

export function getShiftsByDate(date: string): ShiftEntry[] {
  return DEMO_SHIFTS.filter(s => s.date === date);
}

export function getShiftById(id: string): ShiftEntry | undefined {
  return DEMO_SHIFTS.find(s => s.id === id);
}

export function getPayPeriodById(id: string): PayPeriod | undefined {
  return DEMO_PAY_PERIODS.find(p => p.id === id);
}

export function getCurrentClockStatus(employeeId: string): ShiftEntry | null {
  const today = dateStr(new Date());
  return DEMO_SHIFTS.find(s => s.employeeId === employeeId && s.date === today && s.clockOut === null) ?? null;
}

export function calculateWeekTotals(shifts: ShiftEntry[]): { regular: number; ot: number; dt: number; total: number } {
  return shifts.reduce((acc, s) => ({
    regular: Math.round((acc.regular + s.regularHours) * 100) / 100,
    ot: Math.round((acc.ot + s.overtimeHours) * 100) / 100,
    dt: Math.round((acc.dt + s.doubleTimeHours) * 100) / 100,
    total: Math.round((acc.total + s.totalHours) * 100) / 100,
  }), { regular: 0, ot: 0, dt: 0, total: 0 });
}

export function getEmployeeWeekSummaries(): EmployeeWeekSummary[] {
  const weekDates = getWeekDates();
  return EMPLOYEES.map(emp => {
    const empShifts = getShiftsByEmployee(emp.id);
    const dailyHours = weekDates.map(date => {
      const shift = empShifts.find(s => s.date === date);
      return shift ? shift.totalHours : null;
    });
    const totals = calculateWeekTotals(empShifts);
    const pendingCount = empShifts.filter(s => s.status === 'pending').length;
    return {
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role,
      locationName: emp.locationName,
      dailyHours,
      totalRegular: totals.regular,
      totalOT: totals.ot,
      totalDT: totals.dt,
      totalHours: totals.total,
      pendingCount,
    };
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Profitability Data ────────────────────────────────────────

export interface JobMargin {
  jobId: string;
  clientName: string;
  locationId: string;
  locationName: string;
  margin: number;      // 0-100
  revenue: number;
  cost: number;
  flagged: boolean;    // true if margin < 60
}

export const DEMO_JOB_MARGINS: JobMargin[] = [
  { jobId: 'j1', clientName: 'Fresno Convention Center', locationId: 'downtown', locationName: 'Downtown Kitchen', margin: 72, revenue: 18500, cost: 5180, flagged: false },
  { jobId: 'j2', clientName: 'Valley Medical Cafeteria', locationId: 'downtown', locationName: 'Downtown Kitchen', margin: 45, revenue: 12200, cost: 6710, flagged: true },
  { jobId: 'j3', clientName: 'SkyLounge Terminal B',     locationId: 'airport',   locationName: 'Airport Concourse B', margin: 68, revenue: 22000, cost: 7040, flagged: false },
  { jobId: 'j4', clientName: 'Airport Staff Canteen',    locationId: 'airport',   locationName: 'Airport Concourse B', margin: 53, revenue: 8900,  cost: 4183, flagged: true },
  { jobId: 'j5', clientName: 'Bulldog Dining Hall',      locationId: 'university', locationName: 'University Dining Hall', margin: 65, revenue: 31000, cost: 10850, flagged: false },
  { jobId: 'j6', clientName: 'Faculty Club Catering',    locationId: 'university', locationName: 'University Dining Hall', margin: 78, revenue: 9500,  cost: 2090, flagged: false },
];

export function getJobMargins(locationId?: string): JobMargin[] {
  if (!locationId || locationId === 'all') return DEMO_JOB_MARGINS;
  return DEMO_JOB_MARGINS.filter(j => j.locationId === locationId);
}

// ── Overtime Summary Helper ──────────────────────────────────

export interface OvertimeEntry {
  employeeId: string;
  employeeName: string;
  locationName: string;
  regular: number;
  ot: number;
  dt: number;
  total: number;
  estimatedCost: number; // rough estimate: reg*20 + ot*30 + dt*40
}

export function getOvertimeSummary(): OvertimeEntry[] {
  const summaries = getEmployeeWeekSummaries();
  return summaries
    .filter(s => s.totalOT > 0 || s.totalDT > 0)
    .map(s => ({
      employeeId: s.employeeId,
      employeeName: s.employeeName,
      locationName: s.locationName,
      regular: s.totalRegular,
      ot: s.totalOT,
      dt: s.totalDT,
      total: s.totalHours,
      estimatedCost: Math.round(s.totalRegular * 20 + s.totalOT * 30 + s.totalDT * 40),
    }));
}

// ── Formatters ───────────────────────────────────────────────

export function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
  const year = e.getFullYear();
  if (sMonth === eMonth) {
    return `${sMonth} ${s.getDate()} – ${e.getDate()}, ${year}`;
  }
  return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}, ${year}`;
}
