import React from 'react';

export function VendorDashboard() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">HoodOps Dashboard</h1>
      <p className="text-[var(--text-secondary)] mt-2">Service Provider Platform</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {[
          { label: 'Active Jobs', value: '12' },
          { label: 'Pending Reports', value: '4' },
          { label: 'Techs in Field', value: '6' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)]">
            <p className="text-sm text-[var(--text-secondary)]">{s.label}</p>
            <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
