import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Mail, Building2 } from 'lucide-react';
import { EvidlyIcon } from './ui/EvidlyIcon';
import { useDemo } from '../contexts/DemoContext';
import type { DemoLead } from '../contexts/DemoContext';
import { useDemoLeadCapture } from '../hooks/useDemoLeadCapture';

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'senior_living', label: 'Senior Living' },
  { value: 'k12', label: 'K-12 Education' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'corporate_cafeteria', label: 'Corporate Cafeteria' },
  { value: 'catering', label: 'Catering' },
];

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeadCaptureModal({ isOpen, onClose }: LeadCaptureModalProps) {
  const navigate = useNavigate();
  const { enterDemo } = useDemo();
  const { captureLead } = useDemoLeadCapture();
  const [form, setForm] = useState({ fullName: '', email: '', companyName: '', businessType: '' });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const canSubmit = form.fullName && form.email && form.companyName && form.businessType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    const lead: DemoLead = { ...form };
    captureLead(lead);
    enterDemo(lead);
    navigate('/dashboard');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[80] modal-backdrop-enter" onClick={onClose} />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 w-full max-w-md overflow-hidden modal-content-enter" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-[#1E2D4D] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <EvidlyIcon size={28} />
              <div>
                <span className="text-xl font-bold text-white">
                  Evid<span className="text-[#A08C5A]">LY</span>
                </span>
                <p className="text-sm text-white/70">Interactive Demo</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2.5 -m-1 hover:bg-white/10 rounded-full transition-colors" aria-label="Close">
              <X className="h-5 w-5 text-white/70" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#1E2D4D] mb-1">See it in action</h2>
              <p className="text-sm text-[#1E2D4D]/50">We'll personalize the demo for your business.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1E2D4D]/30" />
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="John Smith"
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1E2D4D]/30" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="john@company.com"
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1E2D4D]/30" />
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="e.g. Your Restaurant Group"
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Business Type</label>
              <select
                required
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                className="block w-full px-3 py-2.5 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] focus:border-transparent"
              >
                <option value="">Select your industry...</option>
                {BUSINESS_TYPES.map((bt) => (
                  <option key={bt.value} value={bt.value}>{bt.label}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full py-3 px-4 text-sm font-bold text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: '#A08C5A' }}
            >
              {submitting ? 'Loading...' : 'Start My Demo'}
            </button>

            <p className="text-xs text-center text-[#1E2D4D]/30">
              No account needed — explore the full platform instantly
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
