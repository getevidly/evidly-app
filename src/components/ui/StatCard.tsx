import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  valueColor?: 'default' | 'warning' | 'danger' | 'success';
  icon?: React.ReactNode;
}

export function StatCard({ label, value, valueColor = 'default', icon }: StatCardProps) {
  const colorClasses = {
    default: 'text-gray-900',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    success: 'text-green-600',
  };

  return (
    <div className="bg-stone-100 rounded-lg p-4 text-center">
      {icon && <div className="flex justify-center mb-2">{icon}</div>}
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-medium ${colorClasses[valueColor]}`}>{value}</p>
    </div>
  );
}
