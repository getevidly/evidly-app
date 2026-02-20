import { Thermometer, CheckSquare, FileText, Bell, QrCode, ArrowRight } from 'lucide-react';
import { EvidlyIcon } from './ui/EvidlyIcon';

const steps = [
  {
    icon: Thermometer,
    title: 'Log Temperatures',
    description: 'Staff logs temps on schedule. Out-of-range alerts fire instantly.',
    color: '#3b82f6',
    bg: '#eff6ff',
  },
  {
    icon: CheckSquare,
    title: 'Complete Checklists',
    description: 'Opening, closing, receiving — all tracked with timestamps.',
    color: '#22c55e',
    bg: '#f0fdf4',
  },
  {
    icon: FileText,
    title: 'Documents Auto-Collected',
    description: 'Vendors upload via secure links. Reminders sent automatically.',
    color: '#8b5cf6',
    bg: '#f5f3ff',
  },
  {
    icon: EvidlyIcon,
    title: 'Score Updates Live',
    description: 'Your compliance score updates in real-time across 3 pillars.',
    color: '#d4af37',
    bg: '#fefce8',
  },
  {
    icon: Bell,
    title: 'Alerts Before Problems',
    description: 'Predictive alerts warn you before expirations and missed tasks.',
    color: '#ef4444',
    bg: '#fef2f2',
  },
  {
    icon: QrCode,
    title: 'Inspection Ready',
    description: 'Inspector scans your QR passport. Everything verified in seconds.',
    color: '#1e4d6b',
    bg: '#f0f7ff',
  },
];

export function VisualWorkflow() {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">How EvidLY Works</h3>
      <p className="text-sm text-gray-500 mb-6">From daily operations to inspection-ready — all automated.</p>

      {/* Desktop flow */}
      <div className="hidden lg:flex items-start justify-between gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="flex items-start" style={{ flex: 1 }}>
              <div className="text-center animate-slide-up" style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'both' }}>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: step.bg }}
                >
                  <Icon className="w-7 h-7" style={{ color: step.color }} />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">{step.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="w-5 h-5 text-gray-300 mt-5 mx-1 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile flow */}
      <div className="lg:hidden space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
            >
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: step.bg }}
                >
                  <Icon className="w-5 h-5" style={{ color: step.color }} />
                </div>
                {index < steps.length - 1 && (
                  <div className="w-0.5 h-6 bg-gray-200 mt-2" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
