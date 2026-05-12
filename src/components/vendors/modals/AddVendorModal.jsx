import { useState } from 'react';
import { X, Building2, Wrench, Check } from 'lucide-react';
import { Modal } from '../../ui/Modal';

const STEPS = ['Vendor info', 'Services', 'Confirm'];

const inputClass =
  'w-full px-3 py-2 border border-[#E2DDD4] rounded-md text-[13px] text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30';
const labelClass = 'text-[10px] uppercase tracking-wider text-[#8A93A6] font-medium';

const SERVICE_OPTIONS = [
  { code: 'KEC', label: 'Kitchen exhaust cleaning' },
  { code: 'FS', label: 'Fire suppression inspection' },
  { code: 'FPM', label: 'Floor & pest management' },
  { code: 'GFX', label: 'Grease collection' },
  { code: 'RGC', label: 'Refrigeration & HVAC' },
  { code: 'LINEN', label: 'Linen & floor mats' },
  { code: 'PEST', label: 'Pest control' },
  { code: 'OTHER', label: 'Other' },
];

/**
 * AddVendorModal — Surface 10.
 * 3-step wizard to add a new vendor manually.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onComplete: (data) => void
 */
export function AddVendorModal({ isOpen, onClose, onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [services, setServices] = useState([]);

  const toggleService = (code) => {
    setServices(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = () => {
    onComplete?.({
      companyName: name,
      primaryContactName: contactName,
      primaryContactEmail: email,
      phone,
      serviceTypeCodes: services,
    });
    handleClose();
  };

  const handleClose = () => {
    setStep(0);
    setName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setServices([]);
    onClose();
  };

  const canAdvanceStep0 = name.trim().length > 0;
  const canAdvanceStep1 = services.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div className="px-5 pt-5 pb-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#1E2D4D' }}>
            Add vendor
          </h2>
          <button type="button" onClick={handleClose} className="p-1 rounded-md hover:bg-[#F4F1EA]">
            <X size={18} style={{ color: '#5A6478' }} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-5">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  backgroundColor: i <= step ? '#1E2D4D' : '#E2DDD4',
                  color: i <= step ? '#FAF7F0' : '#5A6478',
                }}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <p style={{ fontSize: '11px', color: i <= step ? '#1E2D4D' : '#5A6478', fontWeight: i === step ? 500 : 400 }}>
                {label}
              </p>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px" style={{ backgroundColor: i < step ? '#1E2D4D' : '#E2DDD4' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5">
        {/* Step 0: Vendor info */}
        {step === 0 && (
          <div className="flex flex-col gap-3">
            <div>
              <label className={labelClass}>Company name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputClass}
                placeholder="e.g. Pacific Pest Control"
              />
            </div>
            <div>
              <label className={labelClass}>Contact name</label>
              <input
                type="text"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                className={inputClass}
                placeholder="Primary contact"
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                placeholder="vendor@example.com"
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={inputClass}
                placeholder="(555) 555-1234"
              />
            </div>
          </div>
        )}

        {/* Step 1: Services */}
        {step === 1 && (
          <div>
            <p className="mb-3" style={{ fontSize: '13px', color: '#1E2D4D' }}>
              What services does {name} provide?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_OPTIONS.map(svc => {
                const selected = services.includes(svc.code);
                return (
                  <button
                    key={svc.code}
                    type="button"
                    onClick={() => toggleService(svc.code)}
                    className="text-left px-3 py-2.5 rounded-md transition-colors"
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#1E2D4D',
                      backgroundColor: selected ? '#F4EFE0' : '#FFFFFF',
                      border: selected ? '1px solid #1E2D4D' : '1px solid #E2DDD4',
                    }}
                  >
                    {svc.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && (
          <div>
            <p className="mb-3" style={{ fontSize: '13px', color: '#1E2D4D' }}>
              Review and confirm
            </p>
            <div
              className="rounded-lg px-4 py-3 mb-3"
              style={{ backgroundColor: '#FCFBF8', border: '1px solid #E2DDD4' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={14} style={{ color: '#5A6478' }} />
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D' }}>{name}</p>
              </div>
              {contactName && (
                <p style={{ fontSize: '11px', color: '#5A6478' }}>Contact: {contactName}</p>
              )}
              {email && (
                <p style={{ fontSize: '11px', color: '#5A6478' }}>Email: {email}</p>
              )}
              {phone && (
                <p style={{ fontSize: '11px', color: '#5A6478' }}>Phone: {phone}</p>
              )}
              <div className="flex items-center gap-1 mt-2">
                <Wrench size={12} style={{ color: '#5A6478' }} />
                <p style={{ fontSize: '11px', color: '#5A6478' }}>
                  {services.map(c => SERVICE_OPTIONS.find(s => s.code === c)?.label).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-5">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-md"
              style={{ fontSize: '12px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #E2DDD4' }}
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 ? !canAdvanceStep0 : !canAdvanceStep1}
              className="px-4 py-2 rounded-md transition-opacity"
              style={{
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: '#1E2D4D',
                color: '#FAF7F0',
                opacity: (step === 0 ? canAdvanceStep0 : canAdvanceStep1) ? 1 : 0.4,
              }}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 rounded-md"
              style={{ fontSize: '12px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
            >
              Add vendor
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
