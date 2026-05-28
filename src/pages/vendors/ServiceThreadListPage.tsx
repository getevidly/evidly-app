/**
 * ServiceThreadListPage — Sprint 2.2a
 *
 * Customer-facing list of service request threads.
 * Route: /vendors/threads
 *
 * Two-step query (polymorphic link — no FK between message_threads and service_requests):
 *   1. message_threads with embedded messages (for last_message_at + preview)
 *   2. service_requests with vendor + service_type_definitions joins
 * Merged in JS, sorted by last_message_at DESC.
 *
 * Unread state via localStorage key: evidly_thread_seen_{thread_id}
 * CPP gold styling gated to is_cleaning_pros_plus + KEC-stack codes.
 */

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle, ArrowLeft, Clock, CheckCircle2,
  XCircle, ShieldCheck, Inbox, Plus,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { prp } from '../../lib/designSystem';

const RequestServiceModal = lazy(() =>
  import('../../components/services/RequestServiceModal').then(m => ({ default: m.RequestServiceModal }))
);

// ── Constants ─────────────────────────────────────────────

const KEC_STACK_CODES = ['KEC', 'GFX', 'FPM', 'RGC'];

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'awaiting', label: 'Awaiting Response' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'declined', label: 'Declined' },
] as const;

// ── Types ─────────────────────────────────────────────────

interface ThreadRow {
  id: string;
  entity_id: string;
  status: string;
  subject: string | null;
  created_at: string;
  messages: Array<{
    id: string;
    body_text: string | null;
    sender_type: string | null;
    created_at: string;
  }>;
}

interface ServiceRequestRow {
  id: string;
  service_code: string | null;
  request_subtype: string | null;
  vendor_decision: string | null;
  evidly_decision: string | null;
  routing_target: string | null;
  confirmed_datetime: string | null;
  vendors: { id: string; company_name: string; is_cleaning_pros_plus: boolean } | null;
  service_type_definitions: { code: string; name: string } | null;
}

interface MergedThread {
  threadId: string;
  entityId: string;
  vendorName: string;
  serviceCode: string;
  serviceName: string;
  requestSubtype: string;
  routingTarget: string | null;
  vendorDecision: string | null;
  evidlyDecision: string | null;
  confirmedDatetime: string | null;
  lastMessageAt: string | null;
  lastPreview: string | null;
  lastSenderType: string | null;
  messageCount: number;
  isUnread: boolean;
  isCppGold: boolean;
}

// ── Helpers ───────────────────────────────────────────────

function subtypeLabel(subtype: string | null): string {
  if (!subtype) return 'Service request';
  return subtype.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function statusPill(t: MergedThread): { label: string; color: string; bg: string } {
  if (t.vendorDecision === 'approved' || t.evidlyDecision === 'approved') {
    return { label: 'Confirmed', color: '#166534', bg: '#DCFCE7' };
  }
  if (t.vendorDecision === 'declined' || t.vendorDecision === 'denied') {
    return { label: 'Declined', color: '#5F5E5A', bg: '#F0EFEB' };
  }
  if (t.routingTarget === 'evidly_admin' && !t.evidlyDecision) {
    return { label: 'Under review', color: '#92400E', bg: '#FEF3C7' };
  }
  return { label: 'Awaiting response', color: '#92400E', bg: '#FEF3C7' };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Component ─────────────────────────────────────────────

export default function ServiceThreadListPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [threads, setThreads] = useState<MergedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    fetchThreads();
  }, [orgId]);

  async function fetchThreads() {
    if (!orgId) return;
    setLoading(true);

    // Step 1: threads + embedded messages
    const { data: threadRows, error: tErr } = await supabase
      .from('message_threads')
      .select('id, entity_id, status, subject, created_at, messages(id, body_text, sender_type, created_at)')
      .eq('organization_id', orgId)
      .eq('entity_type', 'service_request');

    if (tErr || !threadRows || threadRows.length === 0) {
      setThreads([]);
      setLoading(false);
      return;
    }

    // Step 2: service_requests with vendor + service_type
    const entityIds = threadRows.map((t: ThreadRow) => t.entity_id);
    const { data: requestRows } = await supabase
      .from('service_requests')
      .select(`
        id, service_code, request_subtype, vendor_decision, evidly_decision,
        routing_target, confirmed_datetime,
        vendors (id, company_name, is_cleaning_pros_plus),
        service_type_definitions (code, name)
      `)
      .in('id', entityIds);

    // Step 3: merge
    const requestMap = new Map<string, ServiceRequestRow>();
    for (const r of (requestRows || []) as ServiceRequestRow[]) {
      requestMap.set(r.id, r);
    }

    const merged: MergedThread[] = (threadRows as ThreadRow[])
      .map((t) => {
        const sr = requestMap.get(t.entity_id);
        if (!sr) return null;

        const msgs = [...(t.messages || [])].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastMsg = msgs[0] || null;
        const lastMessageAt = lastMsg?.created_at || null;

        // Unread: lastMessageAt > localStorage seen timestamp
        const seenAt = localStorage.getItem(`evidly_thread_seen_${t.id}`);
        const isUnread = lastMessageAt
          ? (!seenAt || new Date(lastMessageAt) > new Date(seenAt))
          : false;

        const serviceCode = sr.service_code || '';
        const isCpp = sr.vendors?.is_cleaning_pros_plus === true;
        const isCppGold = isCpp && KEC_STACK_CODES.includes(serviceCode);

        return {
          threadId: t.id,
          entityId: t.entity_id,
          vendorName: sr.vendors?.company_name || 'Unknown vendor',
          serviceCode,
          serviceName: sr.service_type_definitions?.name || serviceCode,
          requestSubtype: sr.request_subtype || 'service_request',
          routingTarget: sr.routing_target,
          vendorDecision: sr.vendor_decision,
          evidlyDecision: sr.evidly_decision,
          confirmedDatetime: sr.confirmed_datetime,
          lastMessageAt,
          lastPreview: lastMsg?.body_text?.slice(0, 120) || null,
          lastSenderType: lastMsg?.sender_type || null,
          messageCount: msgs.length,
          isUnread,
          isCppGold,
        } satisfies MergedThread;
      })
      .filter(Boolean) as MergedThread[];

    // Sort by last_message_at DESC (threads with no messages sort to bottom)
    merged.sort((a, b) => {
      const aT = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bT = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bT - aT;
    });

    setThreads(merged);
    setLoading(false);
  }

  // ── Filtered list ───────────────────────────────────────
  const filtered = useMemo(() => {
    if (filter === 'all') return threads;
    if (filter === 'awaiting') {
      return threads.filter(t => !t.vendorDecision && !t.evidlyDecision);
    }
    if (filter === 'confirmed') {
      return threads.filter(t => t.vendorDecision === 'approved' || t.evidlyDecision === 'approved');
    }
    if (filter === 'declined') {
      return threads.filter(t => t.vendorDecision === 'declined' || t.vendorDecision === 'denied');
    }
    return threads;
  }, [threads, filter]);

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/vendors')}
          className="p-1.5 rounded-lg hover:bg-[#1E2D4D]/5 text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1E2D4D]">Service Threads</h1>
          <p className="text-sm text-[#1E2D4D]/50">
            Track vendor communication for your service requests
          </p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setFilter(opt.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === opt.id
                ? 'bg-[#1E2D4D] text-white'
                : 'bg-[#F4F1EA] text-[#1E2D4D]/60 hover:bg-[#E8E4DC]'
            }`}
          >
            {opt.label}
            {opt.id === 'all' && threads.length > 0 && (
              <span className="ml-1 opacity-70">({threads.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Thread list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#1E2D4D]" />
        </div>
      ) : filtered.length === 0 ? (
        threads.length === 0 ? (
          /* ── Zero-thread empty state (PPP-framed) ────────── */
          <div className="flex flex-col items-center text-center" style={{ padding: '24px 16px 36px' }}>
            {/* Icon circle */}
            <div
              className="flex items-center justify-center mb-4"
              style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: '#E6F1FB' }}
            >
              <MessageCircle className="w-6 h-6" style={{ color: '#185FA5' }} />
            </div>

            {/* Title */}
            <h3 style={{ fontSize: 17, fontWeight: 500, color: '#0F1A2B', margin: '0 0 8px' }}>
              No service threads yet
            </h3>

            {/* Body */}
            <p style={{ fontSize: 13, color: '#6B7F96', lineHeight: 1.6, maxWidth: 380, margin: '0 0 20px' }}>
              A thread opens every time you request a service from a vendor &mdash; every
              message, date change, and confirmation lives in one place.
            </p>

            {/* PPP three-card row */}
            <div
              className="grid grid-cols-3 w-full mb-5"
              style={{ gap: 10, maxWidth: 520 }}
            >
              {/* PREDICT */}
              <div
                className="bg-white text-left"
                style={{
                  border: '0.5px solid #E2DDD4',
                  borderTop: `3px solid ${prp.predict.accent}`,
                  borderRadius: '0 0 8px 8px',
                  padding: '12px 10px',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, color: prp.predict.text, marginBottom: 4 }}>
                  Predict
                </div>
                <p style={{ fontSize: 11, color: '#6B7F96', lineHeight: 1.5, margin: 0 }}>
                  Identifies which requests are still waiting on a vendor reply.
                </p>
              </div>

              {/* REDUCE */}
              <div
                className="bg-white text-left"
                style={{
                  border: '0.5px solid #E2DDD4',
                  borderTop: `3px solid ${prp.reduce.accent}`,
                  borderRadius: '0 0 8px 8px',
                  padding: '12px 10px',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, color: prp.reduce.text, marginBottom: 4 }}>
                  Reduce
                </div>
                <p style={{ fontSize: 11, color: '#6B7F96', lineHeight: 1.5, margin: 0 }}>
                  One trail per request &mdash; no lost emails, no missed confirmations.
                </p>
              </div>

              {/* PROVE */}
              <div
                className="bg-white text-left"
                style={{
                  border: '0.5px solid #E2DDD4',
                  borderTop: `3px solid ${prp.prove.accent}`,
                  borderRadius: '0 0 8px 8px',
                  padding: '12px 10px',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, color: prp.prove.text, marginBottom: 4 }}>
                  Prove
                </div>
                <p style={{ fontSize: 11, color: '#6B7F96', lineHeight: 1.5, margin: 0 }}>
                  Every message and date carries a timestamp and author.
                </p>
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="inline-flex items-center font-medium"
              style={{
                gap: 6, padding: '11px 20px', borderRadius: 8,
                backgroundColor: '#1E2D4D', color: '#FFFFFF', fontSize: 13,
                border: 'none', cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              Request a service
            </button>
          </div>
        ) : (
          /* ── Filter-no-match empty state ──────────────────── */
          <div className="text-center py-16">
            <Inbox className="w-10 h-10 text-[#1E2D4D]/15 mx-auto mb-3" />
            <p className="text-sm text-[#1E2D4D]/40">
              No threads match the selected filter.
            </p>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => {
            const pill = statusPill(t);
            return (
              <button
                key={t.threadId}
                type="button"
                onClick={() => navigate(`/vendors/threads/${t.threadId}`)}
                className="w-full text-left rounded-xl px-4 py-3.5 transition-all hover:shadow-sm"
                style={{
                  backgroundColor: t.isCppGold ? '#FFFBF0' : '#FFFFFF',
                  border: `1px solid ${t.isCppGold ? '#D4C78F' : '#E2DDD4'}`,
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Unread dot */}
                  <div className="pt-1.5 w-2 shrink-0">
                    {t.isUnread && (
                      <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                    )}
                  </div>

                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: t.isCppGold ? '#F5EED6' : '#F4F1EA',
                    }}
                  >
                    {t.isCppGold ? (
                      <ShieldCheck className="w-4.5 h-4.5" style={{ color: '#A08C5A' }} />
                    ) : (
                      <MessageCircle className="w-4.5 h-4.5 text-[#1E2D4D]/40" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: '#1E2D4D' }}
                      >
                        {t.vendorName}
                      </span>
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                        style={{ backgroundColor: pill.bg, color: pill.color }}
                      >
                        {pill.label}
                      </span>
                    </div>
                    <p
                      className="text-xs mb-1"
                      style={{ color: '#1E2D4D', opacity: 0.55 }}
                    >
                      {t.serviceName} &middot; {subtypeLabel(t.requestSubtype)}
                    </p>
                    {t.lastPreview && (
                      <p
                        className="text-xs truncate"
                        style={{ color: '#1E2D4D', opacity: 0.4 }}
                      >
                        {t.lastSenderType === 'operator' ? 'You: ' : ''}
                        {t.lastPreview}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 text-right">
                    {t.lastMessageAt && (
                      <p
                        className="text-[10px] whitespace-nowrap"
                        style={{ color: '#1E2D4D', opacity: 0.35 }}
                      >
                        {relativeTime(t.lastMessageAt)}
                      </p>
                    )}
                    {t.messageCount > 0 && (
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ color: '#1E2D4D', opacity: 0.25 }}
                      >
                        {t.messageCount} msg{t.messageCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {requestModalOpen && (
        <Suspense fallback={null}>
          <RequestServiceModal
            isOpen
            onClose={() => setRequestModalOpen(false)}
            locationId=""
            organizationId={orgId || ''}
          />
        </Suspense>
      )}
    </div>
  );
}
