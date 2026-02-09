import { useCountUp } from '../hooks/useCountUp';
import { Clock, DollarSign, FileCheck, Thermometer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TimeSavedCounterProps {
  hoursSaved: number;
  moneySaved: number;
  logsCompleted: number;
  docsStored: number;
}

export function TimeSavedCounter({ hoursSaved, moneySaved, logsCompleted, docsStored }: TimeSavedCounterProps) {
  const navigate = useNavigate();
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
      link: '/reports',
    },
    {
      icon: DollarSign,
      value: animatedMoney,
      label: 'Est. Money Saved',
      suffix: '',
      prefix: '$',
      color: '#d4af37',
      bgColor: '#fefce8',
      link: '/reports',
    },
    {
      icon: Thermometer,
      value: animatedLogs,
      label: 'Logs This Month',
      suffix: '',
      prefix: '',
      color: '#22c55e',
      bgColor: '#f0fdf4',
      link: '/temp-logs',
    },
    {
      icon: FileCheck,
      value: animatedDocs,
      label: 'Documents Stored',
      suffix: '',
      prefix: '',
      color: '#3b82f6',
      bgColor: '#eff6ff',
      link: '/documents',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            onClick={() => navigate(stat.link)}
            className="bg-white rounded-xl border border-gray-200 p-5 animate-slide-up"
            style={{
              animationDelay: `${index * 150}ms`,
              animationFillMode: 'both',
              borderLeft: `4px solid ${stat.color}`,
              cursor: 'pointer',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4" style={{ color: stat.color }} />
              <span className="text-sm text-gray-500 font-medium">{stat.label}</span>
            </div>
            <div
              className="text-3xl font-bold animate-counter-glow text-center"
              style={{ color: '#1e293b' }}
            >
              {stat.prefix}{stat.value.toLocaleString()}{stat.suffix}
            </div>
          </div>
        );
      })}
    </div>
  );
}
