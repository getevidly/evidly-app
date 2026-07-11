/**
 * ServiceThreadDetailPage — Sprint 2.2a
 *
 * Customer-facing thread detail for a service request.
 * Route: /vendors/threads/:threadId
 *
 * Page chrome: back arrow, vendor name + service context, status banner,
 * request summary card. Below the card: <ThreadedConversation> for messaging.
 *
 * Status banner derived from service_request fields:
 *   - routing_target, evidly_decision, vendor_decision
 *   - message sender_type for "awaiting response" vs "vendor replied"
 *
 * Marks thread as seen (localStorage) on mount for unread state.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, ShieldCheck, AlertCircle,
  XCircle, Calendar, MessageCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ThreadedConversation } from '../../components/messaging/ThreadedConversation';

// ── Constants ─────────────────────────────────────────────

const KEC_STACK_CODES = ['KEC', 'GFX', 'FPM', 'RGC'];

// ── Types ─────────────────────────────────────────────────

interface ThreadData {
  id: string;
  entity_id: string;
  entity_type: string;
  organization_id: string;
  subject: string | null;
  status: string;
}

interface ServiceRequestData {
  id: string;
  service_code: string | null;
  request_subtype: string | null;
  vendor_decision: string | null;
  evidly_decision: string | null;
  routing_target: string | null;
  status: string | null;
  confirmed_datetime: string | null;
  notes: string | null;
  proposed_slot_1: string | null;
  proposed_slot_2: string | null;
  proposed_slot_3: string | null;
  current_cadence_days: number | null;
  proposed_cadence_days: number | null;
  urgency: string | null;
  created_at: string;
  vendors: {
    id: string;
    company_name: string;
    email: string | null;
    is_cleaning_pros_plus: boolean;
  } | null;
  service_type_definitions: { code: string; name: string } | null;
}

interface StatusBanner {
  label: string;
  bg: string;
  border: string;
  textColor: string;
  Icon: typeof Clock;
}

// ── Helpers ───────────────────────────────────────────────

function subtypeLabel(subtype: string | null): string {
  if (!subtype) return 'Service request';
  return subtype.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatSlot(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ── Component ─────────────────────────────────────────────

export default function ServiceThreadDetailPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [thread, setThread] = useState<ThreadData | null>(null);
  const [sr, setSr] = useState<ServiceRequestData | null>(null);
  const [hasVendorMessage, setHasVendorMessage] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!threadId || !orgId) return;
    fetchData();
  }, [threadId, orgId]);

  async function fetchData() {
    if (!threadId) return;
    setLoading(true);

    // 1. Fetch the thread
    const { data: tData, error: tErr } = await supabase
      .from('message_threads')
      .select('id, entity_id, entity_type, organization_id, subject, status')
      .eq('id', threadId)
      .single();

    if (tErr || !tData) {
      setLoading(false);
      return;
    }
    setThread(tData as ThreadData);

    // 2. Fetch the service request with vendor + service type
    const { data: srData } = await supabase
      .from('service_requests')
      .select(`
        id, service_code, request_subtype, vendor_decision, evidly_decision,
        routing_target, status, confirmed_datetime, notes, urgency, created_at,
        proposed_slot_1, proposed_slot_2, proposed_slot_3,
        current_cadence_days, proposed_cadence_days,
        vendors (id, company_name, email, is_cleaning_pros_plus),
        service_type_definitions (code, name)
      `)
      .eq('id', tData.entity_id)
      .single();

    if (srData) {
      setSr(srData as unknown as ServiceRequestData);
    }

    // 3. Check if any vendor messages exist (for status banner)
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', threadId)
      .eq('sender_type', 'vendor');

    setHasVendorMessage((count || 0) > 0);

    // 4. Mark as seen (persist to DB + localStorage cache)
    const seenNow = new Date().toISOString();
    localStorage.setItem(`evidly_thread_seen_${threadId}`, seenNow);
    if (profile?.id && orgId) {
      supabase.from('thread_reads').upsert(
        {
          thread_id: threadId,
          user_id: profile.id,
          organization_id: orgId,
          last_read_at: seenNow,
        },
        { onConflict: 'thread_id,user_id' },
      ).then(({ error }) => {
        if (error) console.error('Failed to persist thread read:', error.message);
      });
    }

    setLoading(false);
  }

  // ── Status banner derivation ────────────────────────────
  function getStatusBanner(): StatusBanner | null {
    if (!sr) return null;

    // Confirmed (vendor or evidly approved)
    if (sr.vendor_decision === 'approved' || sr.evidly_decision === 'approved') {
      const dateSuffix = sr.confirmed_datetime
        ? ` for ${formatDate(sr.confirmed_datetime)}`
        : '';
      return {
        label: `Confirmed${dateSuffix}`,
        bg: '#DCFCE7',
        border: '#BBF7D0',
        textColor: '#166534',
        Icon: ShieldCheck,
      };
    }

    // Declined
    if (sr.vendor_decision === 'declined' || sr.vendor_decision === 'denied') {
      return {
        label: 'Vendor declined',
        bg: '#F0EFEB',
        border: '#E2DDD4',
        textColor: '#5F5E5A',
        Icon: XCircle,
      };
    }

    // EvidLY admin review (CPP path)
    if (sr.routing_target === 'evidly_admin' && !sr.evidly_decision) {
      return {
        label: 'EvidLY is reviewing your request',
        bg: '#FEF3C7',
        border: '#FDE68A',
        textColor: '#92400E',
        Icon: Clock,
      };
    }

    // Vendor replied but no decision yet
    if (hasVendorMessage && !sr.vendor_decision) {
      return {
        label: `${sr.vendors?.company_name || 'Vendor'} sent a message — review and reply`,
        bg: '#FEF3C7',
        border: '#FDE68A',
        textColor: '#92400E',
        Icon: AlertCircle,
      };
    }

    // Awaiting vendor response (no vendor messages yet)
    if (sr.routing_target === 'vendor_thread' && !hasVendorMessage) {
      return {
        label: `Awaiting ${sr.vendors?.company_name || 'vendor'} response`,
        bg: '#FEF3C7',
        border: '#FDE68A',
        textColor: '#92400E',
        Icon: Clock,
      };
    }

    return null;
  }

  // ── Render ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#1E2D4D]" />
        </div>
      </div>
    );
  }

  if (!thread || !sr) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="text-center py-16">
          <MessageCircle className="w-10 h-10 text-[#1E2D4D]/15 mx-auto mb-3" />
          <p className="text-sm text-[#1E2D4D]/40">Thread not found</p>
          <button
            type="button"
            onClick={() => navigate('/vendors/threads')}
            className="mt-4 text-sm text-[#1E2D4D]/60 underline hover:text-[#1E2D4D]/80"
          >
            Back to threads
          </button>
        </div>
      </div>
    );
  }

  const vendorName = sr.vendors?.company_name || 'Unknown vendor';
  const serviceName = sr.service_type_definitions?.name || sr.service_code || '';
  const isCppGold =
    sr.vendors?.is_cleaning_pros_plus === true &&
    KEC_STACK_CODES.includes(sr.service_code || '');

  const banner = getStatusBanner();
  const proposedSlots = [sr.proposed_slot_1, sr.proposed_slot_2, sr.proposed_slot_3].filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={() => navigate('/vendors/threads')}
          className="p-1.5 rounded-lg hover:bg-[#1E2D4D]/5 text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[#1E2D4D] truncate">{vendorName}</h1>
          <p className="text-xs text-[#1E2D4D]/50">
            {serviceName} &middot; {subtypeLabel(sr.request_subtype)}
          </p>
        </div>
        {isCppGold && (
          <span
            className="ml-auto shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ backgroundColor: '#F5EED6', color: '#A08C5A' }}
          >
            <ShieldCheck className="w-3 h-3" />
            CPP
          </span>
        )}
      </div>

      {/* Status banner */}
      {banner && (
        <div
          className="rounded-lg px-4 py-3 mb-4 flex items-center gap-2.5"
          style={{
            backgroundColor: banner.bg,
            border: `1px solid ${banner.border}`,
          }}
        >
          <banner.Icon className="w-4 h-4 shrink-0" style={{ color: banner.textColor }} />
          <p className="text-sm font-medium" style={{ color: banner.textColor }}>
            {banner.label}
          </p>
        </div>
      )}

      {/* Request summary card */}
      <div
        className="rounded-xl px-4 py-4 mb-6"
        style={{ backgroundColor: '#FCFBF8', border: '1px solid #E2DDD4' }}
      >
        <p
          className="uppercase tracking-wider mb-3"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#5A6478' }}
        >
          Request summary
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <div>
            <p style={{ fontSize: '10px', color: '#5A6478' }}>Service</p>
            <p className="text-sm font-medium text-[#1E2D4D]">{serviceName}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', color: '#5A6478' }}>Type</p>
            <p className="text-sm font-medium text-[#1E2D4D]">{subtypeLabel(sr.request_subtype)}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', color: '#5A6478' }}>Vendor</p>
            <p className="text-sm font-medium text-[#1E2D4D]">{vendorName}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', color: '#5A6478' }}>Urgency</p>
            <p className="text-sm font-medium text-[#1E2D4D] capitalize">{sr.urgency || 'Normal'}</p>
          </div>

          {/* Cadence change details */}
          {sr.current_cadence_days != null && (
            <div>
              <p style={{ fontSize: '10px', color: '#5A6478' }}>Current cadence</p>
              <p className="text-sm font-medium text-[#1E2D4D]">Every {sr.current_cadence_days} days</p>
            </div>
          )}
          {sr.proposed_cadence_days != null && (
            <div>
              <p style={{ fontSize: '10px', color: '#5A6478' }}>Proposed cadence</p>
              <p className="text-sm font-medium text-[#1E2D4D]">Every {sr.proposed_cadence_days} days</p>
            </div>
          )}

          {/* Confirmed date */}
          {sr.confirmed_datetime && (
            <div className="col-span-2">
              <p style={{ fontSize: '10px', color: '#5A6478' }}>Confirmed date</p>
              <p className="text-sm font-medium text-[#166534]">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                {formatDate(sr.confirmed_datetime)}
              </p>
            </div>
          )}

          {/* Proposed slots */}
          {proposedSlots.length > 0 && !sr.confirmed_datetime && (
            <div className="col-span-2">
              <p style={{ fontSize: '10px', color: '#5A6478' }}>Proposed slots</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {proposedSlots.map((slot, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs"
                    style={{ backgroundColor: '#F4F1EA', color: '#1E2D4D' }}
                  >
                    <Calendar className="w-3 h-3" />
                    {formatSlot(slot)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {sr.notes && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid #E2DDD4' }}>
            <p style={{ fontSize: '10px', color: '#5A6478' }}>Notes</p>
            <p className="text-sm text-[#1E2D4D]/70 mt-0.5">{sr.notes}</p>
          </div>
        )}

        <p className="mt-3 text-[10px] text-[#1E2D4D]/30">
          Submitted {formatDate(sr.created_at)}
        </p>
      </div>

      {/* Threaded conversation — reuses existing component */}
      <ThreadedConversation
        entityType="service_request"
        entityId={sr.id}
        organizationId={orgId || null}
        vendorName={vendorName}
        vendorEmail={sr.vendors?.email || undefined}
        defaultSubject={`Re: ${serviceName} request`}
      />
    </div>
  );
}
