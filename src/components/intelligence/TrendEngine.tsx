import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props { data: any }

const locationColors: Record<string, { stroke: string; fill: string }> = {
  downtown:   { stroke: '#4ade80', fill: '#4ade8020' },
  airport:    { stroke: '#f97316', fill: '#f9731620' },
  university: { stroke: '#ef4444', fill: '#ef444420' },
};

export const TrendEngine: React.FC<Props> = ({ data }) => {
  const [metric, setMetric] = useState<'checklistRate' | 'tempLogRate' | 'openItems'>('checklistRate');

  const metricLabels: Record<string, { label: string; format: (v: number) => string }> = {
    checklistRate: { label: 'Checklist Completion %', format: v => `${Math.round(v * 100)}%` },
    tempLogRate:   { label: 'Temp Log Completion %', format: v => `${Math.round(v * 100)}%` },
    openItems:     { label: 'Open Compliance Items', format: v => String(Math.round(v)) },
  };

  // Merge location data into combined chart data (sample every 5 days for readability)
  const chartData = Array.from({ length: 18 }, (_, i) => {
    const dayIndex = i * 5;
    const entry: any = { day: `Day ${dayIndex + 1}` };
    Object.entries(data.trendData).forEach(([locId, days]: [string, any]) => {
      const d = days[dayIndex];
      if (d) entry[locId] = d[metric];
    });
    return entry;
  });

  const locationMap: Record<string, string> = {};
  data.complianceMatrix.forEach((loc: any) => { locationMap[loc.locationId] = loc.locationName; });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#EEF1F7', border: '1px solid #D1D9E6', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontFamily: 'system-ui' }}>
        <p style={{ color: '#3D5068', margin: '0 0 6px', fontWeight: 600 }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color, margin: '2px 0' }}>
            {locationMap[p.dataKey] || p.dataKey}: <strong>{metricLabels[metric].format(p.value)}</strong>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #D1D9E6', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ color: '#0B1628', fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'system-ui' }}>
          <span style={{ fontSize: '16px' }}>{'📈'}</span> 90-Day Compliance Trajectory
        </h2>
        <div style={{ display: 'flex', gap: '4px' }}>
          {Object.entries(metricLabels).map(([key, m]) => (
            <button key={key} onClick={() => setMetric(key as any)}
              style={{
                background: metric === key ? '#A08C5A' : '#EEF1F7',
                border: `1px solid ${metric === key ? '#A08C5A' : '#D1D9E6'}`,
                borderRadius: '4px', padding: '3px 8px', fontSize: '10px',
                color: metric === key ? '#ffffff' : '#3D5068', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'system-ui',
              }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D1D9E6" />
            <XAxis dataKey="day" tick={{ fill: '#3D5068', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D1D9E6' }} />
            <YAxis tick={{ fill: '#3D5068', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D1D9E6' }}
              tickFormatter={v => metric === 'openItems' ? String(v) : `${Math.round(v * 100)}%`}
              domain={metric === 'openItems' ? [0, 'auto'] : [0, 1]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#3D5068' }}
              formatter={(value: string) => locationMap[value] || value} />
            {Object.entries(locationColors).map(([locId, colors]) => (
              <Area key={locId} type="monotone" dataKey={locId}
                stroke={colors.stroke} fill={colors.fill} strokeWidth={2} dot={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
