import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export interface VendorCaptureData {
  companyName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  phone: string;
  serviceTypeCodes: string[];
  serviceArea: string;
  address: string;
  notes: string;
}

interface ServiceTypeDef {
  code: string;
  name: string;
}

interface VendorSuggestion {
  id: string;
  company_name: string;
}

interface VendorCaptureFormProps {
  onSubmit: (data: VendorCaptureData) => void;
  onCancel: () => void;
  initialValues?: Partial<VendorCaptureData>;
  compactMode?: boolean;
  orgId?: string;
  submitLabel?: string;
  isLoading?: boolean;
}

const inputClass =
  'w-full px-3 py-2 border border-[#E2DDD4] rounded-md text-[13px] text-[#1E2D4D] focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30';
const labelClass = 'text-[10px] uppercase tracking-wider text-[#8A93A6] font-medium';

export function VendorCaptureForm({
  onSubmit,
  onCancel,
  initialValues,
  compactMode = false,
  orgId,
  submitLabel = 'Save vendor',
  isLoading = false,
}: VendorCaptureFormProps) {
  const [companyName, setCompanyName] = useState(initialValues?.companyName || '');
  const [contactName, setContactName] = useState(initialValues?.primaryContactName || '');
  const [contactEmail, setContactEmail] = useState(initialValues?.primaryContactEmail || '');
  const [phone, setPhone] = useState(initialValues?.phone || '');
  const [serviceTypeCodes, setServiceTypeCodes] = useState<string[]>(initialValues?.serviceTypeCodes || []);
  const [serviceArea, setServiceArea] = useState(initialValues?.serviceArea || '');
  const [address, setAddress] = useState(initialValues?.address || '');
  const [notes, setNotes] = useState(initialValues?.notes || '');

  // Service type definitions
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeDef[]>([]);

  // AI suggestions for company name
  const [suggestions, setSuggestions] = useState<VendorSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch service type definitions
  useEffect(() => {
    supabase
      .from('service_type_definitions')
      .select('code, name')
      .eq('is_active', true)
      .is('parent_code', null)
      .order('name')
      .then(({ data }) => {
        if (data) setServiceTypes(data as ServiceTypeDef[]);
      });
  }, []);

  // AI company name suggestions
  useEffect(() => {
    if (!orgId || companyName.length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      supabase
        .from('vendors')
        .select('id, company_name')
        .ilike('company_name', `%${companyName}%`)
        .limit(3)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setSuggestions(data as VendorSuggestion[]);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        });
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [companyName, orgId]);

  const toggleServiceType = (code: string) => {
    setServiceTypeCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const applySuggestion = (s: VendorSuggestion) => {
    setCompanyName(s.company_name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const isValid =
    companyName.trim() !== '' &&
    contactName.trim() !== '' &&
    contactEmail.trim() !== '' &&
    phone.trim() !== '' &&
    serviceTypeCodes.length > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      companyName: companyName.trim(),
      primaryContactName: contactName.trim(),
      primaryContactEmail: contactEmail.trim(),
      phone: phone.trim(),
      serviceTypeCodes,
      serviceArea: serviceArea.trim(),
      address: address.trim(),
      notes: notes.trim(),
    });
  };

  const gap = compactMode ? 'space-y-2.5' : 'space-y-3';

  return (
    <div className={gap}>
      {/* Company name with AI suggestions */}
      <div className="relative">
        <label className={labelClass}>Company name *</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className={`${inputClass} mt-0.5`}
          placeholder="e.g. Bay Area Hood Cleaning"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[#E2DDD4] rounded-md shadow-md overflow-hidden">
            <div className="px-3 py-1.5 text-[10px] text-[#8A93A6] uppercase tracking-wider bg-[#FAFBFD]">
              Existing vendors
            </div>
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={() => applySuggestion(s)}
                className="w-full text-left px-3 py-2 text-[13px] text-[#1E2D4D] hover:bg-[#FAF7F0] transition-colors"
              >
                {s.company_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={labelClass}>Primary contact name *</label>
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className={`${inputClass} mt-0.5`}
          placeholder="Full name"
        />
      </div>

      <div className={compactMode ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-3'}>
        <div>
          <label className={labelClass}>Contact email *</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className={`${inputClass} mt-0.5`}
            placeholder="vendor@example.com"
          />
        </div>
        <div>
          <label className={labelClass}>Phone *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`${inputClass} mt-0.5`}
            placeholder="(555) 555-1234"
          />
        </div>
      </div>

      {/* Service type multi-select */}
      <div>
        <label className={labelClass}>Service type(s) *</label>
        <div className="mt-1 bg-[#FAF7F0] rounded-lg p-2.5 grid grid-cols-2 gap-1.5">
          {serviceTypes.map((st) => (
            <label key={st.code} className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-[#F0EDE4] transition-colors">
              <input
                type="checkbox"
                checked={serviceTypeCodes.includes(st.code)}
                onChange={() => toggleServiceType(st.code)}
                className="rounded border-[#E2DDD4]"
              />
              <span className="text-[12px] text-[#1E2D4D]">{st.name}</span>
            </label>
          ))}
        </div>
      </div>

      {!compactMode && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Service area</label>
              <input
                type="text"
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                className={`${inputClass} mt-0.5`}
                placeholder="e.g. San Mateo County"
              />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={`${inputClass} mt-0.5`}
                placeholder="Street address"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} mt-0.5 resize-none`}
              rows={2}
              placeholder="Anything else to note about this vendor"
            />
          </div>
        </>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="px-4 py-2.5 bg-[#1E2D4D] text-[#FAF7F0] text-[12px] font-bold rounded-md hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {isLoading ? 'Saving\u2026' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 bg-transparent text-[#1E2D4D] text-[12px] font-semibold rounded-md border border-[#E2DDD4] hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
