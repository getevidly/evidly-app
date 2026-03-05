import { useState } from 'react';
import { Plus, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { VENDOR_CATEGORIES, getCategoryById } from '../../config/vendorCategories';
import { AIAssistButton, AIGeneratedIndicator } from '../ui/AIAssistButton';

// ── Types ──────────────────────────────────────────────────────────

interface LocationOption {
  locationId: string;
  locationName: string;
}

export interface AddVendorResult {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  serviceType: string;
  hasInsuranceCOI: boolean;
}

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorAdded: (vendor: AddVendorResult) => void;
  isDemoMode: boolean;
  organizationId: string | null;
  accessibleLocations: LocationOption[];
  existingEmails: string[];
}

// ── Component ──────────────────────────────────────────────────────

const PRIMARY = '#1e4d6b';

export function AddVendorModal({
  isOpen,
  onClose,
  onVendorAdded,
  isDemoMode,
  organizationId,
  accessibleLocations,
  existingEmails,
}: AddVendorModalProps) {
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    categories: [] as string[],
    locationIds: [] as string[],
    licenseCertNumber: '',
    hasInsuranceCOI: false,
    notes: '',
  });
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  function resetForm() {
    setForm({
      companyName: '', contactName: '', contactEmail: '', contactPhone: '',
      categories: [], locationIds: [],
      licenseCertNumber: '', hasInsuranceCOI: false, notes: '',
    });
    setAiFields(new Set());
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    // Validation
    if (!form.companyName.trim()) {
      toast.error('Please enter a company name.');
      return;
    }
    if (!form.contactName.trim()) {
      toast.error('Please enter a contact name.');
      return;
    }
    if (!form.contactEmail.trim()) {
      toast.error('Please enter a contact email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
      toast.error('Please enter a valid email address.');
      return;
    }

    const emailLower = form.contactEmail.trim().toLowerCase();
    if (existingEmails.includes(emailLower)) {
      toast.error('A vendor with this email already exists.');
      return;
    }

    const firstCat = form.categories.length > 0 ? getCategoryById(form.categories[0]) : null;
    const serviceType = firstCat?.name || 'General';

    setSubmitting(true);

    try {
      let vendorId = 'manual-' + Date.now();

      if (!isDemoMode && organizationId) {
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .insert({
            company_name: form.companyName.trim(),
            contact_name: form.contactName.trim(),
            email: emailLower,
            phone: form.contactPhone.trim() || null,
            contact_phone: form.contactPhone.trim() || null,
            service_type: serviceType,
            status: 'current',
            invite_status: 'added',
            license_cert_number: form.licenseCertNumber.trim() || null,
            has_insurance_coi: form.hasInsuranceCOI,
            notes: form.notes.trim() || null,
            location_ids: form.locationIds.length > 0 ? form.locationIds : null,
          })
          .select('id')
          .single();

        if (vendorError) {
          toast.error(`Failed to add vendor: ${vendorError.message}`);
          setSubmitting(false);
          return;
        }

        if (vendorData) {
          vendorId = vendorData.id;
          await supabase.from('vendor_client_relationships').insert({
            vendor_id: vendorData.id,
            organization_id: organizationId,
            status: 'active',
          });
        }
      }

      onVendorAdded({
        id: vendorId,
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        email: emailLower,
        phone: form.contactPhone.trim(),
        serviceType,
        hasInsuranceCOI: form.hasInsuranceCOI,
      });

      toast.success(`${form.companyName.trim()} added successfully`);
      handleClose();
    } catch (err) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#eef4f8] rounded-lg">
                  <Plus className="h-5 w-5 text-[#1e4d6b]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Add Vendor</h3>
                  <p className="text-sm text-gray-500">Enter vendor details to create a record</p>
                </div>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="e.g., Acme Hood Cleaning"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
              />
            </div>

            {/* Vendor Type (Service Category) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Type <span className="text-red-500">*</span></label>
              <select
                value={form.categories[0] || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm(prev => ({ ...prev, categories: val ? [val] : [] }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent bg-white"
              >
                <option value="">Select a type...</option>
                {VENDOR_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                <option value="other">Other</option>
              </select>
            </div>

            {/* Contact Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => setForm(prev => ({ ...prev, contactName: e.target.value }))}
                placeholder="e.g., John Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
              />
            </div>

            {/* Contact Email & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="vendor@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone <span className="text-gray-400 text-xs font-normal">(optional)</span></label>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => setForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                />
              </div>
            </div>

            {/* Location Assignment — multi-select */}
            {accessibleLocations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location Assignment</label>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  {accessibleLocations.map((loc) => (
                    <label key={loc.locationId} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.locationIds.includes(loc.locationId)}
                        onChange={() => {
                          setForm(prev => ({
                            ...prev,
                            locationIds: prev.locationIds.includes(loc.locationId)
                              ? prev.locationIds.filter(id => id !== loc.locationId)
                              : [...prev.locationIds, loc.locationId],
                          }));
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-[#1e4d6b] focus:ring-[#1e4d6b]"
                      />
                      <span className="text-sm text-gray-700">{loc.locationName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* License / Cert Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License / Cert Number <span className="text-gray-400 text-xs font-normal">(optional)</span></label>
              <input
                type="text"
                value={form.licenseCertNumber}
                onChange={(e) => setForm(prev => ({ ...prev, licenseCertNumber: e.target.value }))}
                placeholder="e.g., LIC-2026-12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
              />
            </div>

            {/* Insurance COI toggle */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Insurance COI on File</p>
                <p className="text-xs text-gray-500">Certificate of Insurance has been received</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, hasInsuranceCOI: !prev.hasInsuranceCOI }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.hasInsuranceCOI ? 'bg-[#1e4d6b]' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.hasInsuranceCOI ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Notes <span className="text-gray-400 text-xs font-normal">(optional)</span></label>
                <AIAssistButton
                  fieldLabel="Notes"
                  context={{ vendorName: form.companyName }}
                  currentValue={form.notes}
                  onGenerated={(text) => { setForm(prev => ({ ...prev, notes: text })); setAiFields(prev => new Set(prev).add('vendorNotes')); }}
                />
              </div>
              <textarea
                value={form.notes}
                onChange={(e) => { setForm(prev => ({ ...prev, notes: e.target.value })); setAiFields(prev => { const s = new Set(prev); s.delete('vendorNotes'); return s; }); }}
                placeholder="Any additional details..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent resize-none"
              />
              {aiFields.has('vendorNotes') && <AIGeneratedIndicator />}
            </div>

            {/* Info box */}
            <div className="bg-[#eef4f8] rounded-lg p-3 border border-[#b8d4e8]">
              <p className="text-xs text-[#1e4d6b]">
                <strong>What happens next:</strong> The vendor record is created immediately and appears in your vendor list. You can send them an invite separately to connect their account.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-xl">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#163a52'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = PRIMARY; }}
            >
              {submitting ? 'Adding...' : 'Add Vendor'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
