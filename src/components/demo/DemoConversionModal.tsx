import { useState } from 'react';
import { X, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import type { DemoSession } from '../../data/demoGeneratorData';

const NAVY = '#1E2D4D';

interface Props {
  session: DemoSession;
  onClose: () => void;
  onConvert: (plan: string) => void;
}

export function DemoConversionModal({ session, onClose, onConvert }: Props) {
  const [selectedPlan, setSelectedPlan] = useState('founder');
  const [sendWelcome, setSendWelcome] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const handleConvert = () => {
    setConfirming(true);
    setTimeout(() => {
      onConvert(selectedPlan);
    }, 800);
  };

  const plans = [
    { value: 'founder', label: 'Founder Plan', price: '$99/mo + $49/location', note: 'Early Adopter' },
    { value: 'standard', label: 'Standard Plan', price: '$199/mo + $99/location', note: '' },
    { value: 'enterprise', label: 'Enterprise', price: 'Custom', note: 'Will configure separately' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 modal-backdrop-enter" />
      <div
        className="relative bg-white rounded-xl border border-[#1E2D4D]/10 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-content-enter"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1E2D4D]/5">
          <h2 className="font-bold" style={{ color: NAVY }}>
            Convert {session.company_name} to Live Account
          </h2>
          <button onClick={onClose} className="p-2.5 -m-1 rounded-md hover:bg-[#1E2D4D]/5" aria-label="Close">
            <X className="w-5 h-5 text-[#1E2D4D]/30" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* What gets kept */}
          <div>
            <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> KEEP:
            </h3>
            <ul className="text-sm text-[#1E2D4D]/70 space-y-1 ml-6">
              <li>Location: {session.address}, {session.city}, {session.state}</li>
              <li>Jurisdiction: {session.health_authority} + {session.fire_authority}</li>
              <li>Prospect account and login credentials</li>
              <li>All compliance requirements configured by JIE</li>
            </ul>
          </div>

          {/* What gets removed */}
          <div>
            <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" /> REMOVE:
            </h3>
            <ul className="text-sm text-[#1E2D4D]/70 space-y-1 ml-6">
              <li>Sample temperature readings</li>
              <li>Sample checklists and completion history</li>
              <li>Sample compliance scores</li>
              <li>Sample vendor schedules</li>
              <li>Sample documents and demo team members</li>
              <li>Sample insights and alerts</li>
            </ul>
          </div>

          <p className="text-xs text-[#1E2D4D]/50 bg-[#FAF7F0] rounded-lg p-3">
            The customer starts fresh with a clean slate and begins building real compliance history from day one.
          </p>

          {/* Plan selection */}
          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: NAVY }}>Assign Plan:</h3>
            <div className="space-y-2">
              {plans.map(plan => (
                <label
                  key={plan.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedPlan === plan.value ? 'border-[#1E2D4D] bg-[#1E2D4D]/5' : 'border-[#1E2D4D]/10 hover:border-[#1E2D4D]/15'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan.value}
                    checked={selectedPlan === plan.value}
                    onChange={() => setSelectedPlan(plan.value)}
                    className="text-[#1E2D4D]"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{plan.label}</span>
                    <span className="text-sm text-[#1E2D4D]/50 ml-2">— {plan.price}</span>
                    {plan.note && <span className="text-xs text-[#1E2D4D]/30 ml-1">({plan.note})</span>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Welcome email */}
          <label className="flex items-center gap-2 text-sm text-[#1E2D4D]/80">
            <input
              type="checkbox"
              checked={sendWelcome}
              onChange={e => setSendWelcome(e.target.checked)}
              className="rounded border-[#1E2D4D]/15"
            />
            Send Welcome Email to Prospect
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[#1E2D4D]/5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[#1E2D4D]/80 border border-[#1E2D4D]/15 hover:bg-[#FAF7F0]"
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={confirming}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: '#10b981' }}
          >
            {confirming ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Convert Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
