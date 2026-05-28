/**
 * Request Service Modal — Sprint 2.1 rewrite.
 *
 * 3 vendor states:
 *   STATE 1 — Assigned vendor (CPP gold / non-CPP neutral card)
 *   STATE 2 — No vendor assigned (dashed empty state)
 *   STATE 3 — Vendor lacks capability (red danger warning)
 *
 * Vendor picker sub-view + AddVendorModal integration.
 * Floor enforcement for cadence_change subtypes.
 * Submit wired to submitServiceRequest → route-service-request edge fn.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Send, Calendar, AlertCircle, CalendarDays,
  Ban, ShieldCheck, MessageCircle, ChevronRight,
  UserPlus, Building2,
} from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import {
  buildCalendarEvent,
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  downloadIcsFile,
} from '../../lib/calendarSync';
import {
  SERVICE_OPTIONS,
  getServicesByPillar,
  PILLAR_LABELS,
} from '../../lib/serviceOptions';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import {
  submitServiceRequest,
  checkRegulatoryFloor,
} from '../../lib/serviceRequests';
import type {
  SubmitServiceRequestResult,
  RequestSubtype,
} from '../../lib/serviceRequests';
import { AddVendorModal } from '../vendors/modals/AddVendorModal';

// ── Constants ──────────────────────────────────────────────

/** Maps serviceOptions.ts lowercase codes → DB uppercase codes */
const SERVICE_CODE_MAP: Record<string, string> = {
  kec: 'KEC',
  gfx: 'GFX',
  fpm: 'FPM',
  rgc: 'RGC',
  fire_suppression: 'FS',
  fire_alarm: 'FA',
  fire_sprinkler: 'SP',
  fire_extinguisher: 'FE',
  pest_control: 'PC',
  grease_trap: 'GT',
};

const KEC_STACK_CODES = ['KEC', 'GFX', 'FPM', 'RGC'];

const SERVICE_GROUPS = getServicesByPillar();
const PILLAR_ORDER = ['fire_safety', 'food_safety'] as const;

const URGENCY_OPTIONS = [
  { id: 'normal', label: 'Normal', desc: 'Within 2-4 weeks' },
  { id: 'soon', label: 'Soon', desc: 'Within 1-2 weeks' },
  { id: 'urgent', label: 'Urgent', desc: 'Within a few days' },
  { id: 'emergency', label: 'Emergency', desc: 'ASAP - fire marshal issue' },
];

// ── Types ──────────────────────────────────────────────────

type ViewState = 'form' | 'vendor-picker' | 'success';

interface VendorInfo {
  id: string;
  company_name: string;
  is_cpp: boolean;
}

interface RequestServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  organizationId: string;
  defaultServiceType?: string;
  vendorId?: string;
  vendorName?: string;
  requestSubtype?: RequestSubtype;
}

// ── Component ──────────────────────────────────────────────

export function RequestServiceModal({
  isOpen,
  onClose,
  locationId,
  organizationId,
  defaultServiceType,
  vendorId: propVendorId,
  vendorName: propVendorName,
  requestSubtype: propRequestSubtype = 'schedule',
}: RequestServiceModalProps) {
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();

  // ── View state ────────────────────────────────────────────
  const [view, setView] = useState<ViewState>('form');

  // ── Form state ────────────────────────────────────────────
  const [selectedService, setSelectedService] = useState<string | null>(
    defaultServiceType || null,
  );
  const [urgency, setUrgency] = useState('normal');
  const [slot1, setSlot1] = useState('');
  const [slot2, setSlot2] = useState('');
  const [slot3, setSlot3] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitServiceRequestResult | null>(null);
  const [confirmedDatetime, setConfirmedDatetime] = useState<string | null>(null);

  // ── Vendor state ──────────────────────────────────────────
  const [resolvedVendor, setResolvedVendor] = useState<VendorInfo | null>(null);
  const [vendorHasCapability, setVendorHasCapability] = useState(true);
  const [vendorOverride, setVendorOverride] = useState<VendorInfo | null>(null);
  const [serviceConfigId, setServiceConfigId] = useState<string | null>(null);
  const [loadingVendor, setLoadingVendor] = useState(false);

  // ── Vendor picker state ───────────────────────────────────
  const [vendorCandidates, setVendorCandidates] = useState<VendorInfo[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);

  // ── Vendor capability list (STATE 3) ───────────────────────
  const [vendorCapabilities, setVendorCapabilities] = useState<string[]>([]);

  // ── Floor breach state (cadence_change only) ──────────────
  const [proposedCadenceDays, setProposedCadenceDays] = useState('');
  const [currentCadenceDays, setCurrentCadenceDays] = useState<number | null>(null);
  const [floorBreach, setFloorBreach] = useState(false);
  const [floorDays, setFloorDays] = useState<number | null>(null);
  const [floorStandards, setFloorStandards] = useState<string[]>([]);

  // ── Derived ───────────────────────────────────────────────
  const activeVendor = vendorOverride || resolvedVendor;
  const dbServiceCode = selectedService
    ? SERVICE_CODE_MAP[selectedService] || selectedService.toUpperCase()
    : null;

  const vendorState: 'assigned' | 'no-vendor' | 'lacks-capability' =
    !activeVendor
      ? 'no-vendor'
      : !vendorHasCapability
        ? 'lacks-capability'
        : 'assigned';

  const showCppAccent =
    activeVendor?.is_cpp === true &&
    dbServiceCode !== null &&
    KEC_STACK_CODES.includes(dbServiceCode);

  const serviceDisplayName = selectedService
    ? SERVICE_OPTIONS.find((s) => s.code === selectedService)?.label || selectedService
    : '';

  const isCadenceChange = propRequestSubtype === 'cadence_change';

  const canSubmit = !!(
    selectedService &&
    activeVendor &&
    vendorHasCapability &&
    (isCadenceChange ? proposedCadenceDays : slot1) &&
    !submitting &&
    !floorBreach
  );

  // ── Derive vendor when service changes ────────────────────

  useEffect(() => {
    if (!selectedService || !isOpen || !dbServiceCode) return;

    let cancelled = false;
    setLoadingVendor(true);
    setVendorOverride(null);
    setFloorBreach(false);
    setFloorDays(null);


    (async () => {
      // 1. Check service_configurations for assigned vendor
      let query = supabase
        .from('service_configurations')
        .select('id, assigned_vendor_id, cadence_days')
        .eq('organization_id', organizationId)
        .eq('service_code', dbServiceCode);

      if (locationId) query = query.eq('location_id', locationId);

      const { data: config } = await query.maybeSingle();
      if (cancelled) return;

      setServiceConfigId(config?.id || null);
      setCurrentCadenceDays(config?.cadence_days ?? null);

      if (config?.assigned_vendor_id) {
        // Fetch vendor details
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id, company_name, is_cleaning_pros_plus')
          .eq('id', config.assigned_vendor_id)
          .single();

        if (cancelled) return;

        if (vendor) {
          const info: VendorInfo = {
            id: vendor.id,
            company_name: vendor.company_name,
            is_cpp: (vendor as any).is_cleaning_pros_plus === true,
          };
          setResolvedVendor(info);

          // 2. Check capability
          const { data: cap } = await supabase
            .from('vendor_service_capabilities')
            .select('id')
            .eq('vendor_id', vendor.id)
            .eq('service_code', dbServiceCode)
            .maybeSingle();

          if (cancelled) return;
          const hasCap = !!cap;
          setVendorHasCapability(hasCap);

          // 3. If lacks capability, fetch actual capabilities for STATE 3
          if (!hasCap) {
            const { data: allCaps } = await supabase
              .from('vendor_service_capabilities')
              .select('service_code, service_type_definitions(name)')
              .eq('vendor_id', vendor.id)
              .eq('is_active', true);

            if (cancelled) return;
            const names = (allCaps || [])
              .map((r: any) => r.service_type_definitions?.name)
              .filter(Boolean)
              .sort() as string[];
            setVendorCapabilities(names);
          } else {
            setVendorCapabilities([]);
          }
        } else {
          setResolvedVendor(null);
          setVendorHasCapability(true);
          setVendorCapabilities([]);
        }
      } else if (propVendorId && propVendorName) {
        // No config — fall back to prop vendor
        setResolvedVendor({
          id: propVendorId,
          company_name: propVendorName,
          is_cpp: false,
        });

        const { data: cap } = await supabase
          .from('vendor_service_capabilities')
          .select('id')
          .eq('vendor_id', propVendorId)
          .eq('service_code', dbServiceCode)
          .maybeSingle();

        if (cancelled) return;
        const hasCap = !!cap;
        setVendorHasCapability(hasCap);

        if (!hasCap) {
          const { data: allCaps } = await supabase
            .from('vendor_service_capabilities')
            .select('service_code, service_type_definitions(name)')
            .eq('vendor_id', propVendorId)
            .eq('is_active', true);

          if (cancelled) return;
          const names = (allCaps || [])
            .map((r: any) => r.service_type_definitions?.name)
            .filter(Boolean)
            .sort() as string[];
          setVendorCapabilities(names);
        } else {
          setVendorCapabilities([]);
        }
      } else {
        setResolvedVendor(null);
        setVendorHasCapability(true);
        setVendorCapabilities([]);
      }

      setLoadingVendor(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedService, organizationId, locationId, dbServiceCode, isOpen, propVendorId, propVendorName]);

  // ── Reactive floor check (cadence_change only) ────────────

  useEffect(() => {
    if (!isCadenceChange || !dbServiceCode || !proposedCadenceDays) {
      setFloorBreach(false);
      setFloorDays(null);
      setFloorStandards([]);
      return;
    }

    const days = parseInt(proposedCadenceDays, 10);
    if (isNaN(days) || days <= 0) {
      setFloorBreach(false);
      setFloorDays(null);
      setFloorStandards([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const result = await checkRegulatoryFloor(dbServiceCode, days);
      if (cancelled) return;
      setFloorBreach(result.breach);
      setFloorDays(result.regulatoryFloorDays);
      setFloorStandards(result.standards);
    })();

    return () => {
      cancelled = true;
    };
  }, [isCadenceChange, dbServiceCode, proposedCadenceDays]);

  // ── Vendor picker ─────────────────────────────────────────

  const openVendorPicker = useCallback(async () => {
    if (!dbServiceCode) return;
    setLoadingCandidates(true);
    setView('vendor-picker');

    const { data } = await supabase
      .from('vendor_service_capabilities')
      .select('vendor_id, vendors(id, company_name, is_cleaning_pros_plus)')
      .eq('service_code', dbServiceCode)
      .eq('is_active', true);

    const candidates: VendorInfo[] = (data || [])
      .filter((row: any) => row.vendors)
      .map((row: any) => ({
        id: row.vendors.id,
        company_name: row.vendors.company_name,
        is_cpp: row.vendors.is_cleaning_pros_plus === true,
      }));

    setVendorCandidates(candidates);
    setLoadingCandidates(false);
  }, [dbServiceCode]);

  const selectVendor = useCallback((vendor: VendorInfo) => {
    setVendorOverride(vendor);
    setVendorHasCapability(true);
    setView('form');
  }, []);

  // ── Add vendor ────────────────────────────────────────────

  const handleAddVendorComplete = useCallback(
    async (data: any) => {
      const { data: newVendor, error } = await supabase
        .from('vendors')
        .insert({
          company_name: data.companyName,
          primary_contact_name: data.primaryContactName || null,
          primary_contact_email: data.primaryContactEmail || null,
          email: data.primaryContactEmail || null,
          contact_name: data.primaryContactName || null,
          phone: data.phone || null,
          contact_phone: data.phone || null,
          service_type: (data.serviceTypeCodes || []).join(', '),
          status: 'active',
          invite_status: 'pending',
          organization_id: organizationId,
          service_type_codes: data.serviceTypeCodes || [],
        })
        .select('id, company_name, is_cleaning_pros_plus')
        .single();

      if (error || !newVendor) return;

      // Insert capabilities
      const capRows = (data.serviceTypeCodes || []).map((code: string) => ({
        vendor_id: newVendor.id,
        service_code: code,
      }));
      if (capRows.length > 0) {
        await supabase
          .from('vendor_service_capabilities')
          .upsert(capRows, { onConflict: 'vendor_id,service_code' });
      }

      // Create vendor_client_relationships
      await supabase.from('vendor_client_relationships').insert({
        vendor_id: newVendor.id,
        organization_id: organizationId,
        status: 'active',
      });

      // Auto-select the new vendor
      setVendorOverride({
        id: newVendor.id,
        company_name: newVendor.company_name,
        is_cpp: (newVendor as any).is_cleaning_pros_plus === true,
      });
      setVendorHasCapability(true);
      setShowAddVendor(false);
      setView('form');
    },
    [organizationId],
  );

  // ── Submit ────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSubmit || !selectedService || !activeVendor || !dbServiceCode) return;
    setSubmitting(true);

    try {
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 1000));
        setSubmitResult({
          request_id: 'demo',
          routing_target: 'vendor_thread',
          status: 'pending_vendor',
          is_floor_breach: false,
        });
        setView('success');
        setSubmitting(false);
        return;
      }

      const result = await submitServiceRequest({
        organizationId,
        locationId: locationId || undefined,
        vendorId: activeVendor.id,
        serviceCode: dbServiceCode,
        serviceConfigurationId: serviceConfigId || undefined,
        requestSubtype: propRequestSubtype,
        currentCadenceDays: currentCadenceDays ?? undefined,
        proposedCadenceDays:
          isCadenceChange && proposedCadenceDays
            ? parseInt(proposedCadenceDays, 10)
            : undefined,
        proposedVisitDate: !isCadenceChange && slot1 ? slot1 : undefined,
        notes: notes || undefined,
        urgency,
        requestType: urgency === 'emergency' ? 'emergency' : 'scheduled',
        proposedSlots: !isCadenceChange
          ? [slot1, slot2, slot3].filter(Boolean)
          : undefined,
      });

      setSubmitResult(result);
      if (result.status === 'confirmed') {
        setConfirmedDatetime(slot1 || null);
      }
      setView('success');
    } catch {
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Close / reset ─────────────────────────────────────────

  const handleClose = () => {
    setView('form');
    setSelectedService(defaultServiceType || null);
    setUrgency('normal');
    setSlot1('');
    setSlot2('');
    setSlot3('');
    setNotes('');
    setSubmitting(false);
    setSubmitResult(null);
    setConfirmedDatetime(null);
    setResolvedVendor(null);
    setVendorHasCapability(true);
    setVendorOverride(null);
    setServiceConfigId(null);
    setLoadingVendor(false);
    setVendorCandidates([]);
    setShowAddVendor(false);
    setProposedCadenceDays('');
    setCurrentCadenceDays(null);
    setFloorBreach(false);
    setFloorDays(null);
    setFloorStandards([]);
    setVendorCapabilities([]);
    onClose();
  };

  // Calendar event for confirmed requests
  const calEvent =
    confirmedDatetime && selectedService
      ? buildCalendarEvent({
          serviceType: selectedService,
          vendorName: activeVendor?.company_name || 'Vendor',
          confirmedDatetime,
        })
      : null;

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} size="lg">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-[#1E2D4D]/5">
          <h2 className="text-lg font-bold text-[#1E2D4D]">
            {view === 'vendor-picker' ? 'Select a Vendor' : 'Request Service'}
          </h2>
          <button
            onClick={view === 'vendor-picker' ? () => setView('form') : handleClose}
            className="p-2 text-[#1E2D4D]/30 hover:text-[#1E2D4D]/70 rounded-lg hover:bg-[#1E2D4D]/5"
            aria-label={view === 'vendor-picker' ? 'Back' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SUCCESS VIEW ──────────────────────────── */}
        {view === 'success' && submitResult && (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              {submitResult.routing_target === 'evidly_admin' ? (
                <ShieldCheck className="w-7 h-7 text-green-500" />
              ) : (
                <Send className="w-7 h-7 text-green-500" />
              )}
            </div>
            <h3 className="text-lg font-bold text-[#1E2D4D] mb-2">
              {confirmedDatetime ? 'Service Confirmed!' : 'Request Submitted!'}
            </h3>
            <p className="text-[#1E2D4D]/50 mb-4 text-sm">
              {submitResult.routing_target === 'evidly_admin'
                ? 'The EvidLY team is reviewing your request and will coordinate scheduling.'
                : confirmedDatetime
                  ? `Your service has been confirmed for ${new Date(confirmedDatetime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`
                  : 'Your service provider will review your proposed dates and respond within 14 days.'}
            </p>

            {submitResult.is_floor_breach && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-left">
                <p className="text-xs text-amber-800 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                  Regulatory floor note: Your proposed cadence exceeds the minimum
                  frequency. EvidLY has flagged this for review.
                </p>
              </div>
            )}

            {submitResult.thread_id && submitResult.routing_target === 'vendor_thread' && (
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate(`/vendors/threads/${submitResult.thread_id}`);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-[#1E2D4D]/15 hover:bg-[#FAF7F0] text-[#1E2D4D]/70 mb-4 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Open thread
              </button>
            )}

            {calEvent && !isDemoMode && (
              <div className="space-y-2 mb-6 text-left">
                <p className="text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider text-center">
                  Add to Calendar
                </p>
                <a
                  href={getGoogleCalendarUrl(calEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-[#1E2D4D]/10 rounded-xl hover:bg-[#FAF7F0] text-sm font-medium text-[#1E2D4D]/80"
                >
                  <CalendarDays className="h-4 w-4" />
                  Google Calendar
                </a>
                <a
                  href={getOutlookCalendarUrl(calEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-[#1E2D4D]/10 rounded-xl hover:bg-[#FAF7F0] text-sm font-medium text-[#1E2D4D]/80"
                >
                  <CalendarDays className="h-4 w-4" />
                  Outlook Calendar
                </a>
                <button
                  onClick={() => downloadIcsFile(calEvent)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#1E2D4D]/10 rounded-xl hover:bg-[#FAF7F0] text-sm font-medium text-[#1E2D4D]/80"
                >
                  <CalendarDays className="h-4 w-4" />
                  Download .ics
                </button>
              </div>
            )}

            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-[#1E2D4D] text-white rounded-lg text-sm font-medium hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] min-h-[44px]"
            >
              Done
            </button>
          </div>
        )}

        {/* ── VENDOR PICKER VIEW ────────────────────── */}
        {view === 'vendor-picker' && (
          <div className="p-6">
            {loadingCandidates ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1E2D4D]" />
              </div>
            ) : vendorCandidates.length === 0 ? (
              <div className="text-center py-8">
                <Ban className="w-8 h-8 text-[#1E2D4D]/20 mx-auto mb-3" />
                <p className="text-sm text-[#1E2D4D]/50 mb-4">
                  No vendors with this capability found.
                </p>
                <button
                  onClick={() => setShowAddVendor(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E2D4D] text-white rounded-lg text-sm font-medium hover:bg-[#162340] transition-all min-h-[44px]"
                >
                  <UserPlus className="w-4 h-4" />
                  Add a new vendor
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {vendorCandidates.map((v) => {
                  const rowCppAccent =
                    v.is_cpp &&
                    dbServiceCode !== null &&
                    KEC_STACK_CODES.includes(dbServiceCode);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => selectVendor(v)}
                      className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors hover:bg-[#FAF7F0]"
                      style={{
                        borderWidth: '0.5px',
                        borderStyle: 'solid',
                        borderColor: rowCppAccent ? '#A08C5A' : '#E2DDD4',
                        backgroundColor: rowCppAccent ? '#FBF8F1' : '#FFFFFF',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-[#1E2D4D]/40" />
                        <span className="text-sm font-medium text-[#1E2D4D]">
                          {v.company_name}
                        </span>
                        {rowCppAccent && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#A08C5A', color: '#FFFFFF' }}
                          >
                            CPP
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#1E2D4D]/30" />
                    </button>
                  );
                })}
                <button
                  onClick={() => setShowAddVendor(true)}
                  className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-[#1E2D4D]/20 text-[#1E2D4D]/60 hover:bg-[#FAFAF9] text-sm transition-colors min-h-[44px]"
                >
                  <UserPlus className="w-4 h-4" />
                  Add a new vendor
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── FORM VIEW ─────────────────────────────── */}
        {view === 'form' && !submitResult && (
          <div className="p-6 space-y-5">
            {/* Service selection — single-select, pillar-grouped */}
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">
                Service *
              </label>
              <div className="space-y-3">
                {PILLAR_ORDER.map((pillar) => {
                  const items = SERVICE_GROUPS[pillar] || [];
                  if (items.length === 0) return null;
                  return (
                    <div key={pillar}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#1E2D4D]/40 mb-1.5">
                        {PILLAR_LABELS[pillar]}
                      </p>
                      <div className="space-y-2">
                        {items.map((svc) => (
                          <button
                            key={svc.code}
                            type="button"
                            onClick={() => setSelectedService(svc.code)}
                            className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                              selectedService === svc.code
                                ? 'border-[#1E2D4D] bg-blue-50/50'
                                : 'border-[#1E2D4D]/10 hover:border-[#1E2D4D]/15'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                                selectedService === svc.code
                                  ? 'border-[#1E2D4D] bg-[#1E2D4D]'
                                  : 'border-[#1E2D4D]/15'
                              }`}
                            >
                              {selectedService === svc.code && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-[#1E2D4D] text-sm">
                                {svc.label}
                              </p>
                              <p className="text-xs text-[#1E2D4D]/50">{svc.sub}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vendor card — 3 states */}
            {selectedService && (
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">
                  Vendor
                </label>

                {loadingVendor ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1E2D4D]" />
                  </div>
                ) : vendorState === 'assigned' && activeVendor ? (
                  /* STATE 1 — Assigned vendor */
                  <div
                    className="rounded-xl p-3 flex items-center justify-between"
                    style={{
                      borderWidth: '0.5px',
                      borderStyle: 'solid',
                      borderColor: showCppAccent ? '#A08C5A' : '#E2DDD4',
                      backgroundColor: showCppAccent ? '#FBF8F1' : '#FFFFFF',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#1E2D4D]/40" />
                      <span className="text-sm font-semibold text-[#1E2D4D]">
                        {activeVendor.company_name}
                      </span>
                      {showCppAccent && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: '#A08C5A',
                            color: '#FFFFFF',
                          }}
                        >
                          CPP
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={openVendorPicker}
                      className="text-xs underline text-[#1E2D4D]/60 hover:text-[#1E2D4D]"
                    >
                      Use a different vendor
                    </button>
                  </div>
                ) : vendorState === 'no-vendor' ? (
                  /* STATE 2 — No vendor */
                  <div
                    className="rounded-xl p-4 flex flex-col items-center"
                    style={{
                      borderWidth: '0.5px',
                      borderStyle: 'dashed',
                      borderColor: 'rgba(30, 45, 77, 0.2)',
                      backgroundColor: '#FAFAF9',
                    }}
                  >
                    <p className="text-sm text-[#1E2D4D]/50 mb-3">
                      No vendor assigned for this service
                    </p>
                    <div className="flex flex-col gap-2 w-full max-w-[260px]">
                      <button
                        type="button"
                        onClick={openVendorPicker}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1E2D4D] text-white rounded-lg text-sm font-medium hover:bg-[#162340] transition-all min-h-[44px]"
                      >
                        Pick from your vendor network
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddVendor(true)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-[#1E2D4D] text-[#1E2D4D] bg-white hover:bg-[#1E2D4D]/5 transition-all min-h-[44px]"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add a new vendor
                      </button>
                    </div>
                  </div>
                ) : vendorState === 'lacks-capability' && activeVendor ? (
                  /* STATE 3 — Lacks capability */
                  <div
                    className="p-3"
                    style={{
                      borderLeft: '3px solid var(--color-text-danger, #DC2626)',
                      borderRadius: 0,
                      backgroundColor: '#FCEBEB',
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#1E2D4D]">
                          {activeVendor.company_name} does not offer this service
                        </p>
                        <p
                          className="mt-1 mb-2.5"
                          style={{ fontSize: '11px', color: '#791F1F' }}
                        >
                          {vendorCapabilities.length > 0
                            ? `${activeVendor.company_name} capabilities: ${vendorCapabilities.join(', ')}`
                            : `${activeVendor.company_name} has no active capabilities.`}
                        </p>
                        <button
                          type="button"
                          onClick={openVendorPicker}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border"
                          style={{ color: '#791F1F', borderColor: '#791F1F' }}
                        >
                          Pick a different vendor
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-2">
                Urgency
              </label>
              <div className="grid grid-cols-2 gap-2">
                {URGENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setUrgency(opt.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      urgency === opt.id
                        ? 'border-[#1E2D4D] bg-blue-50/50'
                        : 'border-[#1E2D4D]/10 hover:border-[#1E2D4D]/15'
                    }`}
                  >
                    <p className="font-medium text-[#1E2D4D] text-sm">{opt.label}</p>
                    <p className="text-xs text-[#1E2D4D]/50">{opt.desc}</p>
                  </button>
                ))}
              </div>
              {urgency === 'emergency' && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>Emergency requests will be escalated immediately</span>
                </div>
              )}
            </div>

            {/* Cadence change fields OR date slots */}
            {isCadenceChange ? (
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                  Proposed Cadence (days)
                </label>
                {currentCadenceDays && (
                  <p className="text-xs text-[#1E2D4D]/50 mb-2">
                    Current cadence: every {currentCadenceDays} days
                  </p>
                )}
                <input
                  type="number"
                  min={1}
                  value={proposedCadenceDays}
                  onChange={(e) => setProposedCadenceDays(e.target.value)}
                  placeholder="e.g. 90"
                  className="w-full border border-[#1E2D4D]/15 rounded-xl px-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent"
                />

                {floorBreach && floorDays && (
                  <div
                    className="mt-3 p-3 rounded-lg"
                    style={{
                      borderLeft: '3px solid #DC2626',
                      backgroundColor: '#FCEBEB',
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-800 font-medium">
                        {serviceDisplayName} requires inspection every{' '}
                        {floorDays} days
                        {floorStandards.length === 1
                          ? ` under ${floorStandards[0]}`
                          : floorStandards.length > 1
                            ? ` under ${floorStandards.join(' and ')}`
                            : ''}
                        . Your proposed cadence of {proposedCadenceDays} days
                        is not allowed.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                  Proposed Date & Time Slots
                </label>
                <p className="text-xs text-[#1E2D4D]/50 mb-2">
                  Suggest up to 3 times that work for your schedule.
                </p>
                <div className="space-y-2">
                  {[
                    { val: slot1, set: setSlot1 },
                    { val: slot2, set: setSlot2 },
                    { val: slot3, set: setSlot3 },
                  ].map(({ val, set }, i) => (
                    <div key={i} className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E2D4D]/30" />
                      <input
                        type="datetime-local"
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        placeholder={
                          i === 0
                            ? 'Slot 1 (required)'
                            : `Slot ${i + 1} (optional)`
                        }
                        className="w-full border border-[#1E2D4D]/15 rounded-xl pl-10 pr-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[#1E2D4D]/80 mb-1">
                Additional Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-[#1E2D4D]/15 rounded-xl px-3 py-2 text-sm focus:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus:border-transparent resize-none"
                placeholder="Any special requirements or access instructions..."
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full bg-[#1E2D4D] text-white py-3 rounded-xl font-semibold hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit Request
                </>
              )}
            </button>
          </div>
        )}
      </Modal>

      {/* Add Vendor Modal (separate modal, opens on top) */}
      <AddVendorModal
        isOpen={showAddVendor}
        onClose={() => setShowAddVendor(false)}
        onComplete={handleAddVendorComplete}
      />
    </>
  );
}
