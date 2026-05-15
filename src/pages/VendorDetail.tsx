import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Send, FileText, Clock, ChevronRight, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EditVendorModal } from '../components/vendor/EditVendorModal';
import { relativeTime, expiryLabel } from '../lib/relativeTime';
import { StatusPill } from '../components/documents/StatusPill';
import { RequestStateBadge } from '../components/documents/RequestStateBadge';

interface VendorRow {
  id: string;
  company_name: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  phone: string | null;
  address: string | null;
  service_area: string | null;
  service_type: string | null;
  service_type_codes: string[] | null;
  status: string;
  vendor_tier: string | null;
  notes: string | null;
  created_at: string;
}

interface DocRow {
  id: string;
  name: string;
  type: string | null;
  category: string;
  status: string;
  expiry_date: string | null;
  days_until_expiry: number | null;
  request_stage: string | null;
  created_at: string;
  storage_path: string | null;
}

interface ActivityRow {
  id: string;
  event_type: string;
  actor_label: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

interface ScheduleRow {
  service_type_code: string;
  frequency: string;
  last_service_date: string | null;
  next_service_date: string | null;
}

const EVENT_LABELS: Record<string, string> = {
  requested: 'Request sent',
  request_resent: 'Request re-sent',
  submitted: 'Document submitted',
  viewed: 'Viewed by vendor',
  accepted: 'Document accepted',
  rejected: 'Document rejected',
  archived: 'Document archived',
  expired: 'Document expired',
  renewed: 'Document renewed',
  sent_to_third_party: 'Sent to third party',
  noted: 'Note added',
};

type TabId = 'overview' | 'business' | 'service' | 'activity';

export default function VendorDetail() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [businessDocs, setBusinessDocs] = useState<DocRow[]>([]);
  const [serviceDocs, setServiceDocs] = useState<DocRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [editOpen, setEditOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!vendorId || !orgId) { setLoading(false); return; }
    setLoading(true);

    // Fetch vendor info
    const { data: vData } = await supabase
      .from('vendors')
      .select('id, company_name, primary_contact_name, primary_contact_email, phone, address, service_area, service_type, service_type_codes, status, vendor_tier, notes, created_at')
      .eq('id', vendorId)
      .maybeSingle();

    setVendor(vData as VendorRow | null);

    // Fetch docs for this vendor
    const { data: docs } = await supabase
      .from('v_documents_enriched')
      .select('id, name, type, category, status, expiry_date, days_until_expiry, request_stage, created_at, storage_path')
      .eq('organization_id', orgId)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    const allDocs = (docs as DocRow[]) || [];
    setBusinessDocs(allDocs.filter((d) => d.category === 'business'));
    setServiceDocs(allDocs.filter((d) => d.category === 'service'));

    // Fetch activity for this vendor's docs
    const docIds = allDocs.map((d) => d.id);
    if (docIds.length > 0) {
      const { data: actData } = await supabase
        .from('compliance_document_activity_log')
        .select('id, event_type, actor_label, metadata, occurred_at')
        .in('document_id', docIds)
        .order('occurred_at', { ascending: false })
        .limit(30);
      setActivity((actData as ActivityRow[]) || []);
    } else {
      setActivity([]);
    }

    // Fetch service schedules
    const { data: schedData } = await supabase
      .from('location_service_schedules')
      .select('service_type_code, frequency, last_service_date, next_service_date')
      .eq('organization_id', orgId)
      .eq('vendor_id', vendorId)
      .eq('is_active', true);

    setSchedules((schedData as ScheduleRow[]) || []);
    setLoading(false);
  }, [vendorId, orgId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="text-center py-16 text-[13px] text-[#8A93A6]">Loading vendor details{'\u2026'}</div>;
  }

  if (!vendor) {
    return (
      <div className="text-center py-16">
        <p className="text-[#8A93A6] text-[13px]">Vendor not found</p>
        <button type="button" onClick={() => navigate('/vendors')} className="mt-3 text-[13px] text-[#1E2D4D] font-semibold hover:underline">
          Back to Vendors
        </button>
      </div>
    );
  }

  const totalDocs = businessDocs.length + serviceDocs.length;
  const urgentDocs = [...businessDocs, ...serviceDocs].filter((d) => d.status === 'expiring' || d.status === 'expired').length;

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'business', label: 'Business Docs', count: businessDocs.length },
    { id: 'service', label: 'Service Records', count: serviceDocs.length },
    { id: 'activity', label: 'Activity', count: activity.length },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate('/vendors')}
        className="flex items-center gap-1.5 text-[13px] text-[#8A93A6] hover:text-[#1E2D4D]"
      >
        <ArrowLeft size={14} />
        All Vendors
      </button>

      {/* Header */}
      <div className="bg-white border border-[#E2DDD4] rounded-lg p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-[#8A93A6]" />
              <h1 className="text-xl font-bold text-[#1E2D4D]">{vendor.company_name}</h1>
            </div>
            <p className="text-[12px] text-[#8A93A6] mt-1">
              {vendor.service_type || 'Vendor'} {'\u00B7'} Added {relativeTime(vendor.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {urgentDocs > 0 && (
              <span className="text-[11px] font-bold text-[#B91C1C] bg-[#FEE2E2] px-2.5 py-1 rounded-full">
                {urgentDocs} urgent
              </span>
            )}
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: vendor.status === 'active' ? '#E8F5E9' : '#F3F0E8',
                color: vendor.status === 'active' ? '#2E7D32' : '#8A93A6',
              }}
            >
              {vendor.status === 'active' ? 'Active' : vendor.status}
            </span>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium"
              style={{ border: '1px solid #1E2D4D', color: '#1E2D4D' }}
            >
              <Pencil size={14} />
              Edit
            </button>
          </div>
        </div>

        {/* Contact row */}
        <div className="flex flex-wrap gap-4 mt-3 text-[12px] text-[#8A93A6]">
          {vendor.primary_contact_name && (
            <span className="flex items-center gap-1">
              <Building2 size={11} />
              {vendor.primary_contact_name}
            </span>
          )}
          {vendor.primary_contact_email && (
            <span className="flex items-center gap-1">
              <Mail size={11} />
              {vendor.primary_contact_email}
            </span>
          )}
          {vendor.phone && (
            <span className="flex items-center gap-1">
              <Phone size={11} />
              {vendor.phone}
            </span>
          )}
          {vendor.address && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {vendor.address}
            </span>
          )}
        </div>
      </div>

      {/* AI insight */}
      {urgentDocs > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-[#EEF2FF] border border-[#C7D2FE]">
          <span className="text-[14px] mt-0.5">&#x2728;</span>
          <p className="text-[12px] text-[#4338CA] font-medium">
            {vendor.company_name} has {urgentDocs} document{urgentDocs !== 1 ? 's' : ''} that {urgentDocs === 1 ? 'needs' : 'need'} attention.
            {' '}Consider sending a request for updated documents.
          </p>
        </div>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Documents" value={totalDocs} accent="#1E2D4D" />
        <StatCard label="Current" value={[...businessDocs, ...serviceDocs].filter((d) => d.status === 'current').length} accent="#2E7D32" />
        <StatCard label="Expiring" value={[...businessDocs, ...serviceDocs].filter((d) => d.status === 'expiring').length} accent="#B45309" />
        <StatCard label="Expired" value={[...businessDocs, ...serviceDocs].filter((d) => d.status === 'expired').length} accent="#B91C1C" />
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E2DDD4] bg-white rounded-t-lg overflow-x-auto">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className="relative whitespace-nowrap px-4 py-3 text-[13px] cursor-pointer bg-transparent border-none"
              style={{
                borderBottom: activeTab === t.id ? '3px solid #A08C5A' : '3px solid transparent',
                fontWeight: activeTab === t.id ? 700 : 500,
                color: activeTab === t.id ? '#1E2D4D' : '#8A93A6',
              }}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1 text-[#8A93A6] font-medium">({t.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab vendor={vendor} schedules={schedules} totalDocs={totalDocs} urgentDocs={urgentDocs} />
      )}
      {activeTab === 'business' && (
        <DocList docs={businessDocs} emptyMsg="No business documents on file for this vendor." />
      )}
      {activeTab === 'service' && (
        <DocList docs={serviceDocs} emptyMsg="No service records on file for this vendor." />
      )}
      {activeTab === 'activity' && (
        <ActivityTimeline entries={activity} />
      )}

      <EditVendorModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onVendorUpdated={() => { setEditOpen(false); fetchData(); }}
        vendor={vendor}
        organizationId={orgId || null}
        accessibleLocations={[]}
        existingEmails={[]}
      />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white border border-[#E2DDD4] rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-[#8A93A6]">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function OverviewTab({ vendor, schedules, totalDocs, urgentDocs }: {
  vendor: VendorRow;
  schedules: ScheduleRow[];
  totalDocs: number;
  urgentDocs: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Contact card */}
      <div className="bg-white border border-[#E2DDD4] rounded-lg p-4">
        <h3 className="text-[13px] font-bold text-[#1E2D4D] mb-3">Contact Information</h3>
        <div className="space-y-2">
          <InfoRow label="Contact" value={vendor.primary_contact_name} />
          <InfoRow label="Email" value={vendor.primary_contact_email} />
          <InfoRow label="Phone" value={vendor.phone} />
          <InfoRow label="Address" value={vendor.address} />
          <InfoRow label="Service Area" value={vendor.service_area} />
          <InfoRow label="Services" value={vendor.service_type_codes?.join(', ') || vendor.service_type} />
          {vendor.notes && <InfoRow label="Notes" value={vendor.notes} />}
        </div>
      </div>

      {/* Service schedules */}
      <div className="bg-white border border-[#E2DDD4] rounded-lg p-4">
        <h3 className="text-[13px] font-bold text-[#1E2D4D] mb-3">Service Schedule</h3>
        {schedules.length === 0 ? (
          <p className="text-[12px] text-[#8A93A6]">No active service schedules.</p>
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.service_type_code} className="flex items-center justify-between py-1.5 border-b border-[#F3F0E8] last:border-b-0">
                <div>
                  <p className="text-[12px] font-medium text-[#1E2D4D]">{s.service_type_code}</p>
                  <p className="text-[10px] text-[#8A93A6]">
                    {s.frequency} {'\u00B7'} Last: {relativeTime(s.last_service_date)}
                  </p>
                </div>
                {s.next_service_date && (
                  <span className="text-[10px] text-[#8A93A6]">
                    Next: {relativeTime(s.next_service_date)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 pt-3 border-t border-[#E2DDD4] space-y-1.5">
          <div className="flex justify-between text-[12px]">
            <span className="text-[#8A93A6]">Documents on file</span>
            <span className="font-semibold text-[#1E2D4D]">{totalDocs}</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-[#8A93A6]">Need attention</span>
            <span className="font-semibold" style={{ color: urgentDocs > 0 ? '#B91C1C' : '#2E7D32' }}>{urgentDocs}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex py-1">
      <div className="w-[90px] text-[11px] text-[#8A93A6] font-semibold">{label}</div>
      <div className="flex-1 text-[12px] text-[#1E2D4D]">{value}</div>
    </div>
  );
}

function DocList({ docs, emptyMsg }: { docs: DocRow[]; emptyMsg: string }) {
  if (docs.length === 0) {
    return (
      <div className="bg-white border border-dashed border-[#E2DDD4] rounded-lg p-8 text-center text-[#8A93A6] text-[13px]">
        {emptyMsg}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {docs.map((d) => (
        <div key={d.id} className="flex items-center justify-between bg-white border border-[#E2DDD4] rounded-lg px-4 py-3 hover:bg-[#F7F5EE] transition-colors">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <FileText size={13} className="text-[#8A93A6] flex-shrink-0" />
              <p className="text-[13px] font-medium text-[#1E2D4D] truncate">{d.name}</p>
            </div>
            <p className="text-[10px] text-[#8A93A6] ml-[21px] mt-0.5">
              {d.type || d.category} {'\u00B7'} {relativeTime(d.created_at)}
              {d.expiry_date && (d.status === 'expiring' || d.status === 'expired') && (
                <> {'\u00B7'} <Clock size={9} className="inline" /> {expiryLabel(d.expiry_date)}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <StatusPill status={d.status} />
            <RequestStateBadge stage={d.request_stage} />
            <ChevronRight size={14} className="text-[#8A93A6]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityTimeline({ entries }: { entries: ActivityRow[] }) {
  if (entries.length === 0) {
    return (
      <div className="bg-white border border-dashed border-[#E2DDD4] rounded-lg p-8 text-center text-[#8A93A6] text-[13px]">
        No activity recorded for this vendor yet.
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E2DDD4] rounded-lg p-4">
      <div className="border-l-2 border-[#E2DDD4] ml-1 space-y-0">
        {entries.map((a) => (
          <div key={a.id} className="pl-4 py-2 relative">
            <div className="absolute left-[-5px] top-[12px] w-[8px] h-[8px] rounded-full bg-[#E2DDD4]" />
            <p className="text-[12px] text-[#1E2D4D] font-medium">
              {EVENT_LABELS[a.event_type] || a.event_type}
            </p>
            <p className="text-[10px] text-[#8A93A6]">
              {a.actor_label || 'System'} {'\u00B7'} {relativeTime(a.occurred_at)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
