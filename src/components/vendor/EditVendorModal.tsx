import { useState, useEffect } from 'react';
import { Pencil, XCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { toast } from 'sonner';
import { useUpdateVendor } from '../../hooks/useUpdateVendor';
import { VENDOR_CATEGORIES, getCategoryById } from '../../config/vendorCategories';

// ── Types ──────────────────────────────────────────────────────────

interface LocationOption {
  locationId: string;
  locationName: string;
}

export interface VendorEditData {
  id: string;
  company_name: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  email?: string | null;
  phone: string | null;
  address: string | null;
  service_area: string | null;
  service_type: string | null;
  service_type_codes: string[] | null;
  notes: string | null;
}

interface EditVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorUpdated: () => void;
  vendor: VendorEditData;
  organizationId: string | null;
  accessibleLocations: LocationOption[];
  existingEmails: string[];
}

// ── Component ──────────────────────────────────────────────────────

const PRIMARY = '#1E2D4D';

function deriveCategoryFromServiceType(serviceType: string | null): string {
  if (!serviceType) return '';
  const cat = VENDOR_CATEGORIES.find(c => c.name === serviceType);
  return cat?.id || '';
}

export function EditVendorModal({
  isOpen,
  onClose,
  onVendorUpdated,
  vendor,
  organizationId,
  accessibleLocations,
  existingEmails,
}: EditVendorModalProps) {
  const { updateVendor } = useUpdateVendor();
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    categories: [] as string[],
    locationIds: [] as string[],
    licenseCertNumber: '',
    notes: '',
    address: '',
    serviceArea: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Pre-populate form when vendor changes or modal opens
  useEffect(() => {
    if (isOpen && vendor) {
      const catId = deriveCategoryFromServiceType(vendor.service_type);
      setForm({
        companyName: vendor.company_name || '',
        contactName: vendor.primary_contact_name || '',
        contactEmail: vendor.primary_contact_email || vendor.email || '',
        contactPhone: vendor.phone || '',
        categories: catId ? [catId] : [],
        locationIds: [],
        licenseCertNumber: '',
        notes: vendor.notes || '',
        address: vendor.address || '',
        serviceArea: vendor.service_area || '',
      });
    }
  }, [isOpen, vendor]);

  if (!isOpen) return null;

  function handleClose() {
    onClose();
  }

  async function handleSubmit() {
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

    // Email dedup — exclude vendor's own current email
    const emailLower = form.contactEmail.trim().toLowerCase();
    const currentEmail = (vendor.primary_contact_email || vendor.email || '').toLowerCase();
    if (emailLower !== currentEmail && existingEmails.map(e => e.toLowerCase()).includes(emailLower)) {
      toast.error('A vendor with this email already exists.');
      return;
    }

    const firstCat = form.categories.length > 0 ? getCategoryById(form.categories[0]) : null;
    const serviceType = firstCat?.name || vendor.service_type || 'General';

    setSubmitting(true);

    try {
      if (!organizationId) {
        toast.error('Organization not found.');
        setSubmitting(false);
        return;
      }

      const success = await updateVendor(vendor.id, {
        company_name: form.companyName.trim(),
        primary_contact_name: form.contactName.trim() || null,
        primary_contact_email: emailLower || null,
        email: emailLower || null,
        phone: form.contactPhone.trim() || null,
        address: form.address.trim() || null,
        service_area: form.serviceArea.trim() || null,
        service_type: serviceType,
        service_type_codes: vendor.service_type_codes,
        notes: form.notes.trim() || null,
      });

      if (!success) {
        toast.error('Failed to update vendor.');
        setSubmitting(false);
        return;
      }

      toast.success('Vendor updated');
      onVendorUpdated();
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen onClose={handleClose} size="lg" className="border border-[#1E2D4D]/10">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-[#1E2D4D]/10 sticky top-0 bg-white rounded-t-xl z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#eef4f8] rounded-lg">
                  <Pencil className="h-5 w-5 text-[#1E2D4D]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1E2D4D]">Edit Vendor</h3>
                  <p className="text-sm text-[#1E2D4D]/50">Update vendor details</p>
                </div>
              </div>
              <button onClick={handleClose} className="text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70" aria-label="Close">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Vendor Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="e.g., Acme Hood Cleaning"
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent"
              />
            </div>

            {/* Vendor Type (Service Category) */}
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Vendor Type</label>
              <select
                value={form.categories[0] || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm(prev => ({ ...prev, categories: val ? [val] : [] }));
                }}
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent bg-white"
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
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Primary Contact Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => setForm(prev => ({ ...prev, contactName: e.target.value }))}
                placeholder="e.g., John Smith"
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent"
              />
            </div>

            {/* Contact Email & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Contact Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="vendor@example.com"
                  className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Contact Phone <span className="text-[#1E2D4D]/30 text-xs font-normal">(optional)</span></label>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => setForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Address <span className="text-[#1E2D4D]/30 text-xs font-normal">(optional)</span></label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main St, City, CA 90210"
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent"
              />
            </div>

            {/* Service Area */}
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Service Area <span className="text-[#1E2D4D]/30 text-xs font-normal">(optional)</span></label>
              <input
                type="text"
                value={form.serviceArea}
                onChange={(e) => setForm(prev => ({ ...prev, serviceArea: e.target.value }))}
                placeholder="e.g., Greater Sacramento, Bay Area"
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent"
              />
            </div>

            {/* Location Assignment — multi-select */}
            {accessibleLocations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">Location Assignment</label>
                <div className="bg-[#FAF7F0] rounded-lg p-3 space-y-2">
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
                        className="w-4 h-4 rounded border-[#1E2D4D]/15 text-[#1E2D4D] focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2"
                      />
                      <span className="text-sm text-[#1E2D4D]/80">{loc.locationName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">Notes <span className="text-[#1E2D4D]/30 text-xs font-normal">(optional)</span></label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional details..."
                rows={2}
                className="w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-[#1E2D4D]/10 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-xl">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-[#1E2D4D]/15 text-[#1E2D4D]/80 rounded-lg hover:bg-[#FAF7F0] text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#141E33'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = PRIMARY; }}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
    </Modal>
  );
}
