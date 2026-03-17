/**
 * Public Referral Landing Page — shown when visiting /r/:code
 * No auth required. Branded landing page with signup form.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Shield, Clock, CheckCircle2, Send, DollarSign } from 'lucide-react';

export function ReferralPage() {
  const { code } = useParams<{ code: string }>();
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    services: [] as string[],
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleService = (svc: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(svc) ? prev.services.filter(s => s !== svc) : [...prev.services, svc],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactName || !formData.email) return;
    setSubmitting(true);
    try {
      // TODO: POST to supabase edge function evidly-referral-signup
      await new Promise(r => setTimeout(r, 1000));
      setSubmitted(true);
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h1>
          <p className="text-gray-500 mb-4">We've received your request. Our team will reach out shortly with a quote.</p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-sm font-semibold text-green-800">$25 off your first service</p>
            <p className="text-xs text-green-600">Applied automatically when you book</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-[#1e4d6b] text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-2">Professional Kitchen Exhaust Cleaning</h1>
          <p className="text-blue-100 text-lg mb-4">You've been referred by a trusted partner</p>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-6 py-3">
            <DollarSign className="w-5 h-5 text-[#d4af37]" />
            <span className="font-semibold text-lg">$25 off your first service</span>
          </div>
          {code && <p className="text-blue-200 text-sm mt-3">Referral code: <code className="text-white font-mono">{code}</code></p>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Benefits */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Why Choose HoodOps?</h2>
            {[
              { icon: Shield, title: 'Fully Certified', desc: 'Licensed, insured, and NFPA 96 compliant' },
              { icon: Star, title: 'Top Rated', desc: '4.9 stars from 500+ restaurant clients' },
              { icon: Clock, title: 'Flexible Scheduling', desc: 'After-hours service to minimize disruption' },
              { icon: CheckCircle2, title: 'Digital Reports', desc: 'Before/after photos and compliance documentation' },
            ].map((b) => (
              <div key={b.title} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-200">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <b.icon className="w-5 h-5 text-[#1e4d6b]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{b.title}</h3>
                  <p className="text-xs text-gray-500">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Request a Quote</h2>
              <p className="text-sm text-gray-500 mb-6">Fill in your details and we'll get back to you within 24 hours.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                    <input type="text" required value={formData.contactName} onChange={e => setFormData(d => ({ ...d, contactName: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                    <input type="text" value={formData.businessName} onChange={e => setFormData(d => ({ ...d, businessName: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" required value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input type="text" value={formData.address} onChange={e => setFormData(d => ({ ...d, address: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input type="text" value={formData.city} onChange={e => setFormData(d => ({ ...d, city: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input type="text" value={formData.state} onChange={e => setFormData(d => ({ ...d, state: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                    <input type="text" value={formData.zip} onChange={e => setFormData(d => ({ ...d, zip: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Services Needed</label>
                  <div className="flex flex-wrap gap-2">
                    {['Hood Cleaning', 'Fan Maintenance', 'Grease Trap', 'Fire Suppression'].map(svc => (
                      <button key={svc} type="button" onClick={() => toggleService(svc)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${formData.services.includes(svc) ? 'bg-[#1e4d6b] text-white border-[#1e4d6b]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                        {svc}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={3} value={formData.notes} onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent resize-none" placeholder="Tell us about your kitchen setup..." />
                </div>
                <button type="submit" disabled={submitting} className="w-full bg-[#1e4d6b] text-white py-3 rounded-xl font-semibold hover:bg-[#163a52] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <><Send className="w-4 h-4" /> Get My Quote</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-6 text-center">
        <p className="text-sm text-gray-400">Powered by HoodOps &middot; Professional Kitchen Exhaust Services</p>
      </div>
    </div>
  );
}
