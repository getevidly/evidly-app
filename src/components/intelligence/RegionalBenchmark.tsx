import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface Props { data: any }

export const RegionalBenchmark: React.FC<Props> = ({ data }) => {
  const benchmarks = data.industryBenchmarks;
  const orgMetrics = data.orgMetrics;

  const chartData = [
    {
      metric: 'Checklist Completion',
      org: Math.round(orgMetrics.avgChecklistCompletion * 100),
      industry: Math.round(benchmarks.avgChecklistCompletion * 100),
      topDecile: Math.round(benchmarks.topDecileChecklistCompletion * 100),
    },
    {
      metric: 'Temp Log Completion',
      org: Math.round(orgMetrics.avgTempLogCompletion * 100),
      industry: Math.round(benchmarks.avgTempLogCompletion * 100),
      topDecile: Math.round(benchmarks.topDecileTempLogCompletion * 100),
    },
    {
      metric: 'Staff Turnover',
      org: Math.round(orgMetrics.staffTurnoverOrgAvg * 100),
      industry: Math.round(benchmarks.avgStaffTurnover * 100),
      topDecile: 15,
    },
    {
      metric: 'Open Items / Location',
      org: Math.round(orgMetrics.totalOpenItems / data.complianceMatrix.length),
      industry: Math.round(benchmarks.avgOpenItemsPerLocation),
      topDecile: 2,
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#EEF1F7', border: '1px solid #D1D9E6', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontFamily: 'system-ui' }}>
        <p style={{ color: '#3D5068', margin: '0 0 6px', fontWeight: 600 }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.fill, margin: '2px 0' }}>
            {p.dataKey === 'org' ? 'Your Org' : p.dataKey === 'industry' ? 'Industry Avg' : 'Top 10%'}: <strong>{p.value}%</strong>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #D1D9E6', borderRadius: '12px', padding: '20px', marginTop: '16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
      <h2 style={{ color: '#0B1628', fontSize: '14px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'system-ui' }}>
        <span style={{ fontSize: '16px' }}>{'📊'}</span> Industry Benchmark Comparison
      </h2>

      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#D1D9E6" />
            <XAxis dataKey="metric" tick={{ fill: '#3D5068', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D1D9E6' }} />
            <YAxis tick={{ fill: '#3D5068', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D1D9E6' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px' }} formatter={(v: string) => v === 'org' ? 'Your Org' : v === 'industry' ? 'Industry Avg' : 'Top 10%'} />
            <Bar dataKey="org" fill="#A08C5A" radius={[4, 4, 0, 0]} />
            <Bar dataKey="industry" fill="#3D5068" radius={[4, 4, 0, 0]} />
            <Bar dataKey="topDecile" fill="#4ade80" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: '#EEF1F7', borderRadius: '8px', padding: '12px 16px', marginTop: '14px', borderLeft: '3px solid #A08C5A' }}>
        <p style={{ color: '#A08C5A', fontSize: '11px', fontWeight: 700, margin: '0 0 4px', fontFamily: 'system-ui' }}>Benchmark Insight</p>
        <p style={{ color: '#3D5068', fontSize: '12px', margin: 0, lineHeight: 1.5, fontFamily: 'system-ui' }}>
          Your organization's checklist completion ({Math.round(orgMetrics.avgChecklistCompletion * 100)}%) exceeds industry average ({Math.round(benchmarks.avgChecklistCompletion * 100)}%).
          {orgMetrics.staffTurnoverOrgAvg < benchmarks.avgStaffTurnover
            ? ` Staff turnover (${Math.round(orgMetrics.staffTurnoverOrgAvg * 100)}%) is below industry average — a positive compliance indicator.`
            : ` However, staff turnover (${Math.round(orgMetrics.staffTurnoverOrgAvg * 100)}%) remains above industry average (${Math.round(benchmarks.avgStaffTurnover * 100)}%) — the primary driver of compliance gaps.`
          }
        </p>
      </div>
    </div>
  );
};
