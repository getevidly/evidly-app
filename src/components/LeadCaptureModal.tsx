import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Mail, Building2 } from 'lucide-react';
import { EvidlyIcon } from './ui/EvidlyIcon';
import { useDemo } from '../contexts/DemoContext';
import type { DemoLead } from '../contexts/DemoContext';

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
  const [form, setForm] = useState({ fullName: '', email: '', companyName: '', businessType: '' });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const canSubmit = form.fullName && form.email && form.companyName && form.businessType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    const lead: DemoLead = { ...form };

    // Attempt Supabase insert (silent fail)
    try {
      const { supabase } = await import('../lib/supabase');
      await supabase.from('demo_leads').insert([{
        full_name: lead.fullName,
        email: lead.email,
        organization_name: lead.companyName,
        industry_type: lead.businessType,
      }]);
    } catch {
      // Silent fail
    }

    enterDemo(lead);
    navigate('/dashboard');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[80]" onClick={onClose} />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-[#1e4d6b] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <EvidlyIcon size={28} />
              <div>
                <span className="text-xl font-bold text-white">
                  Evid<span className="text-[#d4af37]">LY</span>
                </span>
                <p className="text-sm text-white/70">Interactive Demo</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <X className="h-5 w-5 text-white/70" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">See it in action</h2>
              <p className="text-sm text-gray-500">We'll personalize the demo for your business.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="John Smith"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="john@company.com"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="e.g. Your Restaurant Group"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
              <select
                required
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent"
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
              style={{ backgroundColor: '#d4af37' }}
            >
              {submitting ? 'Loading...' : 'Start My Demo'}
            </button>

            <p className="text-xs text-center text-gray-400">
              No account needed — explore the full platform instantly
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
