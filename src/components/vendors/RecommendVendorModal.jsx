import { useState } from 'react';
import { Star, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CA_COUNTIES_BY_REGION } from '../../data/californiaCounties';

const COMMON_SERVICES = [
  'Hood Cleaning', 'Fire Suppression', 'Fire Alarm', 'Fire Sprinkler', 'Fire Extinguisher',
  'Grease Trap', 'Pest Control', 'Backflow Testing',
  'HVAC', 'Plumbing', 'Electrical', 'Refrigeration',
  'Janitorial', 'Pressure Washing', 'Linen', 'Waste Disposal',
];

const ALL_COUNTIES = Object.values(CA_COUNTIES_BY_REGION).flat();

const FIELD_STYLE = {
  fontSize: '13px', color: '#1E2D4D', border: '1px solid #E2DDD4',
  borderRadius: '8px', padding: '10px 12px', outline: 'none', width: '100%',
  backgroundColor: '#FFFFFF',
};

const LABEL_STYLE = { fontSize: '12px', fontWeight: 600, color: '#1E2D4D', marginBottom: '4px', display: 'block' };

export function RecommendVendorModal({ isOpen, onClose, prefilledVendor, onRecommended }) {
  const { profile } = useAuth();
  const isPrefilled = !!prefilledVendor;

  const [vendorName, setVendorName] = useState(prefilledVendor?.name || '');
  const [services, setServices] = useState(
    prefilledVendor?.serviceType ? [prefilledVendor.serviceType] : []
  );
  const [customService, setCustomService] = useState('');
  const [contactName, setContactName] = useState(prefilledVendor?.contactName || '');
  const [email, setEmail] = useState(prefilledVendor?.email || '');
  const [phone, setPhone] = useState(prefilledVendor?.phone || '');
  const [counties, setCounties] = useState([]);
  const [yearsWorking, setYearsWorking] = useState('');
  const [approxVisits, setApproxVisits] = useState('');
  const [whyRecommended, setWhyRecommended] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleService = (svc) => {
    setServices(prev => prev.includes(svc) ? prev.filter(s => s !== svc) : [...prev, svc]);
  };

  const addCustomService = () => {
    const trimmed = customService.trim();
    if (trimmed && !services.includes(trimmed)) {
      setServices(prev => [...prev, trimmed]);
      setCustomService('');
    }
  };

  const addCounty = (c) => {
    if (c && !counties.includes(c)) setCounties(prev => [...prev, c]);
  };

  const removeCounty = (c) => setCounties(prev => prev.filter(x => x !== c));

  const handleSubmit = async () => {
    if (!vendorName.trim()) { toast.error('Vendor name is required'); return; }
    if (services.length === 0) { toast.error('Select at least one service'); return; }
    if (!contactName.trim()) { toast.error('Contact name is required'); return; }
    if (!email.trim()) { toast.error('Email is required'); return; }
    if (counties.length === 0) { toast.error('Select at least one county'); return; }
    if (whyRecommended.trim().length < 20) { toast.error('Please write at least 20 characters explaining why you recommend this vendor'); return; }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('vendor_recommendations')
        .insert({
          organization_id: profile?.organization_id,
          source_roster_vendor_id: prefilledVendor?.id || null,
          vendor_name: vendorName.trim(),
          services,
          contact_name: contactName.trim(),
          contact_email: email.trim(),
          contact_phone: phone.trim() || null,
          counties_served: counties,
          years_working_together: yearsWorking ? parseInt(yearsWorking, 10) : null,
          approx_visit_count: approxVisits ? parseInt(approxVisits, 10) : null,
          why_recommended: whyRecommended.trim(),
          submitted_by: profile?.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Fire-and-forget email via edge function
      supabase.functions.invoke('send-vendor-recommendation', {
        body: { recommendation_id: data.id },
      }).catch(() => { /* non-blocking */ });

      toast.success('Recommendation sent to Partner Recruitment');
      onRecommended?.(prefilledVendor?.id);
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to submit recommendation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#FEF3C7' }}
            >
              <Star className="w-5 h-5" style={{ color: '#A08C5A' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E2D4D', margin: 0 }}>
                {isPrefilled ? `Recommend ${prefilledVendor.name}` : 'Recommend a vendor'}
              </h2>
              <p style={{ fontSize: '12px', color: '#5A6478', margin: '2px 0 0 0' }}>
                to EvidLY Partner Recruitment
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={18} style={{ color: '#5A6478' }} />
          </button>
        </div>

        {/* Info banner */}
        <div
          className="rounded-lg px-3.5 py-3 mb-5"
          style={{ backgroundColor: '#FAF7F0', border: '1px solid #E5E0D8' }}
        >
          <p style={{ fontSize: '12px', color: '#5A6478', lineHeight: 1.5, margin: 0 }}>
            {isPrefilled
              ? "Pre-filled from your Roster. Add anything else that will help us verify them."
              : "Tell us about a vendor who delivers five-star work. We verify credentials, check references, and confirm county qualifications. If they pass, they join the Vendor Network."}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Vendor name */}
          <div>
            <label style={LABEL_STYLE}>Vendor name <span style={{ color: '#DC2626' }}>*</span></label>
            {isPrefilled ? (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ fontSize: '12px', fontWeight: 500, color: '#1E2D4D', backgroundColor: '#F4EFE0' }}
              >
                {vendorName}
              </div>
            ) : (
              <input
                type="text" value={vendorName} onChange={e => setVendorName(e.target.value)}
                placeholder="Company name" style={FIELD_STYLE}
              />
            )}
          </div>

          {/* Services */}
          <div>
            <label style={LABEL_STYLE}>Services they provide <span style={{ color: '#DC2626' }}>*</span></label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_SERVICES.map(svc => (
                <button
                  key={svc} type="button" onClick={() => toggleService(svc)}
                  className="px-2.5 py-1 rounded-full transition-colors"
                  style={{
                    fontSize: '11px', fontWeight: 500,
                    backgroundColor: services.includes(svc) ? '#1E2D4D' : '#FFFFFF',
                    color: services.includes(svc) ? '#FAF7F0' : '#1E2D4D',
                    border: services.includes(svc) ? 'none' : '1px solid #E2DDD4',
                  }}
                >
                  {svc}
                </button>
              ))}
            </div>
            {/* Custom services */}
            {services.filter(s => !COMMON_SERVICES.includes(s)).map(s => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full mr-1.5 mb-1.5"
                style={{ fontSize: '11px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
              >
                {s}
                <button type="button" onClick={() => toggleService(s)} className="ml-0.5 hover:opacity-70">
                  <X size={10} />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text" value={customService} onChange={e => setCustomService(e.target.value)}
                placeholder="+ Add service" style={{ ...FIELD_STYLE, flex: 1 }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomService(); } }}
              />
              {customService.trim() && (
                <button type="button" onClick={addCustomService}
                  className="px-3 py-2 rounded-lg" style={{ fontSize: '12px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #E2DDD4' }}>
                  Add
                </button>
              )}
            </div>
          </div>

          {/* Contact name */}
          <div>
            <label style={LABEL_STYLE}>Contact name <span style={{ color: '#DC2626' }}>*</span></label>
            {isPrefilled && contactName ? (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ fontSize: '12px', fontWeight: 500, color: '#1E2D4D', backgroundColor: '#F4EFE0' }}
              >
                {contactName}
              </div>
            ) : (
              <input
                type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                placeholder="Primary contact" style={FIELD_STYLE}
              />
            )}
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label style={LABEL_STYLE}>Email <span style={{ color: '#DC2626' }}>*</span></label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vendor@example.com" style={FIELD_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Phone</label>
              <input
                type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(555) 555-5555" style={FIELD_STYLE}
              />
            </div>
          </div>

          {/* Counties served */}
          <div>
            <label style={LABEL_STYLE}>Counties served <span style={{ color: '#DC2626' }}>*</span></label>
            {counties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {counties.map(c => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full"
                    style={{ fontSize: '11px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
                  >
                    {c}
                    <button type="button" onClick={() => removeCounty(c)} className="ml-0.5 hover:opacity-70">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <select
              value="" onChange={e => addCounty(e.target.value)}
              style={{ ...FIELD_STYLE, color: '#94A3B8' }}
            >
              <option value="">+ Add county</option>
              {Object.entries(CA_COUNTIES_BY_REGION).map(([region, regionCounties]) => (
                <optgroup key={region} label={region}>
                  {regionCounties.filter(c => !counties.includes(c)).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Years + Visits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={LABEL_STYLE}>Years working together</label>
              <input
                type="number" min="0" value={yearsWorking} onChange={e => setYearsWorking(e.target.value)}
                placeholder="e.g. 3" style={FIELD_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Approx. visits</label>
              <input
                type="number" min="0" value={approxVisits} onChange={e => setApproxVisits(e.target.value)}
                placeholder="e.g. 12" style={FIELD_STYLE}
              />
            </div>
          </div>

          {/* Why recommended */}
          <div>
            <label style={LABEL_STYLE}>Why are you recommending them? <span style={{ color: '#DC2626' }}>*</span></label>
            <textarea
              value={whyRecommended} onChange={e => setWhyRecommended(e.target.value)}
              placeholder="What makes this vendor stand out? Reliability, quality of work, responsiveness..."
              rows={4}
              style={{ ...FIELD_STYLE, resize: 'vertical' }}
            />
            {whyRecommended.trim().length > 0 && whyRecommended.trim().length < 20 && (
              <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>
                {20 - whyRecommended.trim().length} more characters needed
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-4" style={{ borderTop: '1px solid #E2DDD4' }}>
          <button
            type="button" onClick={onClose}
            className="px-4 py-2.5 rounded-lg"
            style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #E2DDD4' }}
          >
            Cancel
          </button>
          <button
            type="button" onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2.5 rounded-lg flex items-center justify-center gap-2"
            style={{
              fontSize: '13px', fontWeight: 600, backgroundColor: '#1E2D4D', color: '#FAF7F0',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
