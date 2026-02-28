import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Siren,
  ArrowLeft,
  BarChart3,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  TrendingDown,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useDemo } from '../contexts/DemoContext';
import {
  playbookTemplates,
  demoCustomPlaybooks,
  demoPlaybookAnalytics,
} from '../data/demoData';

const FONT = "'DM Sans', sans-serif";
const PRIMARY = '#1e4d6b';
const GOLD = '#d4af37';
const LIGHT_BG = '#eef4f8';

type TimeFilter = '30d' | '6m' | '1y';

/* ─── helper: sum a numeric field across an array ────────────── */
function sumField<T>(arr: T[], key: keyof T): number {
  return arr.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
}

/* ─── helper: format dollars ─────────────────────────────────── */
function formatDollars(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

/* ─── helper: progress bar color ─────────────────────────────── */
function barColor(rate: number): string {
  if (rate >= 90) return '#22c55e';
  if (rate >= 80) return '#eab308';
  return '#dc2626';
}

/* ─── helper: compliance badge color ─────────────────────────── */
function complianceBadgeColor(rate: number): string {
  if (rate >= 95) return '#22c55e';
  if (rate >= 90) return GOLD;
  return '#dc2626';
}

/* ================================================================
   PlaybookAnalytics
   ================================================================ */
export function PlaybookAnalytics() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('6m');

  // Non-demo mode: show empty state (no hardcoded data for authenticated users)
  if (!isDemoMode) {
    return (
      <div style={{ fontFamily: FONT, background: LIGHT_BG, minHeight: '100vh', padding: '24px 12px' }} className="sm:!p-8">
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none',
              border: 'none', color: PRIMARY, fontSize: 14, fontFamily: FONT, cursor: 'pointer',
              padding: 0, marginBottom: 12,
            }}
          >
            <ArrowLeft size={16} /> Back to Playbooks
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Siren size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontWeight: 700, color: '#111', fontSize: 22 }}>Playbook Analytics</h1>
              <p style={{ margin: 0, fontSize: 14, color: '#6b7280', marginTop: 2 }}>Incident trends, response performance, and cross-location comparison</p>
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 48, textAlign: 'center' }}>
            <BarChart3 size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>No Analytics Data Yet</h2>
            <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 400, margin: '0 auto' }}>
              Run incident playbooks to see performance analytics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { monthlyIncidents, responseTimeTrend, stepCompletionRates, locationComparison } =
    demoPlaybookAnalytics;

  /* ── KPI calculations ──────────────────────────────────────── */
  const totalIncidents = monthlyIncidents.reduce(
    (sum, m) => sum + m.powerOutage + m.foodborne + m.fire + m.equipment + m.other,
    0,
  );

  const latestResponseTime = responseTimeTrend[responseTimeTrend.length - 1]?.avgMinutes ?? 0;

  const totalFoodLoss = sumField(locationComparison, 'foodLossDollars');

  const playbooksAvailable = playbookTemplates.length + demoCustomPlaybooks.length;

  /* ── time filter buttons ───────────────────────────────────── */
  const timeOptions: { key: TimeFilter; label: string }[] = [
    { key: '30d', label: '30 Days' },
    { key: '6m', label: '6 Months' },
    { key: '1y', label: '1 Year' },
  ];

  /* ── incident chart: short month labels ────────────────────── */
  const incidentChartData = monthlyIncidents.map((m) => ({
    ...m,
    shortMonth: m.month.replace('20', "'"),
  }));

  /* ── response chart: short month labels ────────────────────── */
  const responseChartData = responseTimeTrend.map((m) => ({
    ...m,
    shortMonth: m.month.replace('20', "'"),
  }));

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div style={{ fontFamily: FONT, background: LIGHT_BG, minHeight: '100vh', padding: '24px 12px' }} className="sm:!p-8">
      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            color: PRIMARY,
            fontSize: 14,
            fontFamily: FONT,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 12,
          }}
        >
          <ArrowLeft size={16} />
          Back to Playbooks
        </button>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: PRIMARY,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Siren size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontWeight: 700, color: '#111' }} className="text-xl sm:text-2xl">
                Playbook Analytics
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                Incident trends, response performance, and cross-location comparison
              </p>
            </div>
          </div>

          {/* Time filter buttons */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {timeOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setTimeFilter(opt.key)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  border: `1px solid ${timeFilter === opt.key ? PRIMARY : '#d1d5db'}`,
                  background: timeFilter === opt.key ? PRIMARY : '#fff',
                  color: timeFilter === opt.key ? '#fff' : '#374151',
                  fontSize: 13,
                  fontFamily: FONT,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── KPI Row ──────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <KpiCard
            icon={<BarChart3 size={20} color="#dc2626" />}
            label="Total Incidents"
            value={String(totalIncidents)}
            accent="#dc2626"
          />
          <KpiCard
            icon={<Clock size={20} color={PRIMARY} />}
            label="Avg Response Time"
            value={`${latestResponseTime} min`}
            accent={PRIMARY}
          />
          <KpiCard
            icon={<DollarSign size={20} color={GOLD} />}
            label="Total Food Loss"
            value={formatDollars(totalFoodLoss)}
            accent={GOLD}
          />
          <KpiCard
            icon={<FileText size={20} color="#22c55e" />}
            label="Playbooks Available"
            value={String(playbooksAvailable)}
            accent="#22c55e"
          />
        </div>

        {/* ── Two-column chart row ─────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))',
            gap: 20,
            marginBottom: 28,
          }}
        >
          {/* Incidents by Type */}
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
            className="p-4 sm:p-6"
          >
            <h3
              style={{
                margin: '0 0 18px',
                fontSize: 16,
                fontWeight: 700,
                color: '#111',
              }}
            >
              Incidents by Type
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={incidentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    fontFamily: FONT,
                    fontSize: 13,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: FONT }} />
                <Bar dataKey="powerOutage" stackId="a" fill="#dc2626" name="Power Outage" radius={[0, 0, 0, 0]} />
                <Bar dataKey="foodborne" stackId="a" fill="#ea580c" name="Foodborne" />
                <Bar dataKey="fire" stackId="a" fill="#f59e0b" name="Fire" />
                <Bar dataKey="equipment" stackId="a" fill="#0369a1" name="Equipment" />
                <Bar dataKey="other" stackId="a" fill="#6b7280" name="Other" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Response Time Trend */}
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
            className="p-4 sm:p-6"
          >
            <h3
              style={{
                margin: '0 0 18px',
                fontSize: 16,
                fontWeight: 700,
                color: '#111',
              }}
            >
              Response Time Trend
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={responseChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  unit=" min"
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    fontFamily: FONT,
                    fontSize: 13,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                  }}
                  formatter={(value: number) => [`${value} min`, 'Avg Response']}
                />
                <ReferenceLine
                  y={60}
                  stroke={GOLD}
                  strokeDasharray="6 4"
                  label={{
                    value: 'Target',
                    position: 'insideTopRight',
                    fill: GOLD,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgMinutes"
                  stroke={PRIMARY}
                  strokeWidth={2.5}
                  dot={{ fill: PRIMARY, r: 4 }}
                  activeDot={{ r: 6, fill: PRIMARY }}
                  name="Avg Minutes"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Step Completion Rates ────────────────────────────── */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            marginBottom: 28,
          }}
          className="p-4 sm:p-6"
        >
          <h3
            style={{
              margin: '0 0 18px',
              fontSize: 16,
              fontWeight: 700,
              color: '#111',
            }}
          >
            Step Completion Rates
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: FONT,
                fontSize: 14,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '2px solid #e5e7eb',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '10px 12px', color: '#6b7280', fontWeight: 600 }}>
                    Step
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      color: '#6b7280',
                      fontWeight: 600,
                    }}
                    className="min-w-0 sm:min-w-[260px]"
                  >
                    Completion Rate
                  </th>
                  <th style={{ padding: '10px 12px', color: '#6b7280', fontWeight: 600 }}>
                    Avg Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {stepCompletionRates.map((step, idx) => (
                  <tr
                    key={step.stepTitle}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: idx % 2 === 0 ? '#fff' : '#fafbfc',
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 500, color: '#111' }}>
                      {step.stepTitle}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            flex: 1,
                            height: 10,
                            background: '#f3f4f6',
                            borderRadius: 6,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${step.completionRate}%`,
                              height: '100%',
                              background: barColor(step.completionRate),
                              borderRadius: 6,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: barColor(step.completionRate),
                            minWidth: 40,
                            textAlign: 'right',
                          }}
                        >
                          {step.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        color: '#374151',
                        fontWeight: 500,
                      }}
                    >
                      {step.avgDurationMin} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Cross-Location Comparison ────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <h3
            style={{
              margin: '0 0 16px',
              fontSize: 16,
              fontWeight: 700,
              color: '#111',
            }}
          >
            Cross-Location Comparison
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
              gap: 16,
            }}
          >
            {locationComparison.map((loc) => (
              <div
                key={loc.location}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
                className="p-4 sm:p-6"
              >
                {/* Location header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MapPin size={18} color={PRIMARY} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
                    {loc.location}
                  </span>
                </div>

                {/* Stats row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <StatCell
                    icon={<Siren size={14} color="#dc2626" />}
                    label="Total Incidents"
                    value={String(loc.totalIncidents)}
                  />
                  <StatCell
                    icon={<Clock size={14} color={PRIMARY} />}
                    label="Avg Response"
                    value={`${loc.avgResponseMin} min`}
                  />
                  <StatCell
                    icon={<DollarSign size={14} color={GOLD} />}
                    label="Food Loss"
                    value={formatDollars(loc.foodLossDollars)}
                  />

                  {/* Compliance badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: '#6b7280',
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      <EvidlyIcon size={14} />
                      Compliance
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        border: `3px solid ${complianceBadgeColor(loc.complianceRate)}`,
                        fontSize: 15,
                        fontWeight: 700,
                        color: complianceBadgeColor(loc.complianceRate),
                      }}
                    >
                      {loc.complianceRate}%
                    </div>
                  </div>
                </div>

                {/* Trend hint */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: '#6b7280',
                    borderTop: '1px solid #f3f4f6',
                    paddingTop: 10,
                  }}
                >
                  <TrendingDown size={14} color="#22c55e" />
                  Response times improving
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── KPI Card sub-component ─────────────────────────────────── */
function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '14px 12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        borderLeft: `4px solid ${accent}`,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
      className="sm:!p-5"
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: `${accent}14`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>{value}</div>
      </div>
    </div>
  );
}

/* ─── Stat cell for location cards ───────────────────────────── */
function StatCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: '#6b7280',
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{value}</div>
    </div>
  );
}

export default PlaybookAnalytics;
