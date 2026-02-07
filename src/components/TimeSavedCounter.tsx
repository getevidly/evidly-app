import { useCountUp } from '../hooks/useCountUp';
import { Clock, DollarSign, FileCheck, Thermometer } from 'lucide-react';

interface TimeSavedCounterProps {
  hoursSaved: number;
  moneySaved: number;
  logsCompleted: number;
  docsStored: number;
}

export function TimeSavedCounter({ hoursSaved, moneySaved, logsCompleted, docsStored }: TimeSavedCounterProps) {
  const animatedHours = useCountUp(hoursSaved, 1800);
  const animatedMoney = useCountUp(moneySaved, 2000);
  const animatedLogs = useCountUp(logsCompleted, 1600);
  const animatedDocs = useCountUp(docsStored, 1400);

  const stats = [
    {
      icon: Clock,
      value: animatedHours,
      label: 'Hours Saved',
      suffix: '',
      prefix: '',
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
    },
    {
      icon: DollarSign,
      value: animatedMoney,
      label: 'Est. Money Saved',
      suffix: '',
      prefix: '$',
      color: '#d4af37',
      bgColor: '#fefce8',
    },
    {
      icon: Thermometer,
      value: animatedLogs,
      label: 'Logs This Month',
      suffix: '',
      prefix: '',
      color: '#22c55e',
      bgColor: '#f0fdf4',
    },
    {
      icon: FileCheck,
      value: animatedDocs,
      label: 'Documents Stored',
      suffix: '',
      prefix: '',
      color: '#3b82f6',
      bgColor: '#eff6ff',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-5 animate-slide-up"
            style={{
              animationDelay: `${index * 150}ms`,
              animationFillMode: 'both',
              borderLeft: `4px solid ${stat.color}`,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: stat.bgColor }}
              >
                <Icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
            </div>
            <div
              className="text-3xl font-bold animate-counter-glow"
              style={{ color: '#1e293b' }}
            >
              {stat.prefix}{stat.value.toLocaleString()}{stat.suffix}
            </div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        );
      })}
    </div>
  );
}
