import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Shield, FileText } from 'lucide-react';
import { useServiceScheduleDetail } from '../../hooks/useServiceScheduleDetail';
import { useAuth } from '../../contexts/AuthContext';
import { AISynthesisStrip } from '../../components/vendors/AISynthesisStrip';
import { MetricsStrip } from '../../components/vendors/MetricsStrip';
import { StatePill } from '../../components/vendors/StatePill';
import { StateDot } from '../../components/vendors/StateDot';
import { ThreadedConversation } from '../../components/messaging/ThreadedConversation';
/**
 * ServiceDetail — Surface 7.
 * Drill-down for a single service showing location coverage,
 * cadence, vendor, citation, and per-location state.
 */
export default function ServiceDetail() {
  const { serviceId } = useParams();
  const { profile } = useAuth();
  const { service, records, loading, error } = useServiceScheduleDetail(serviceId);

  if (loading) {
    return (
      <div className="min-h-screen px-4 pt-5" style={{ backgroundColor: '#F4F1EA' }}>
        <Link
          to="/vendors?tab=services"
          className="inline-flex items-center gap-1 mb-4"
          style={{ fontSize: '12px', fontWeight: 500, color: '#5A6478' }}
        >
          <ArrowLeft size={14} />
          Back to services
        </Link>
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#1E2D4D] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen px-4 pt-5" style={{ backgroundColor: '#F4F1EA' }}>
        <Link
          to="/vendors?tab=services"
          className="inline-flex items-center gap-1 mb-4"
          style={{ fontSize: '12px', fontWeight: 500, color: '#5A6478' }}
        >
          <ArrowLeft size={14} />
          Back to services
        </Link>
        <div
          className="bg-white rounded-lg px-4 py-4"
          style={{ border: '1px solid #E2DDD4' }}
        >
          <p style={{ fontSize: '14px', color: '#B91C1C' }}>
            Unable to load service details. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen px-4 pt-5" style={{ backgroundColor: '#F4F1EA' }}>
        <Link
          to="/vendors?tab=services"
          className="inline-flex items-center gap-1 mb-4"
          style={{ fontSize: '12px', fontWeight: 500, color: '#5A6478' }}
        >
          <ArrowLeft size={14} />
          Back to services
        </Link>
        <p style={{ fontSize: '14px', color: '#5A6478' }}>Service not found.</p>
      </div>
    );
  }

  const currentCount = service.locations.filter(l => l.state === 'current').length;
  const metricCards = [
    { label: 'Locations', value: `${currentCount} of ${service.locations.length}`, valueColor: 'navy' },
    { label: 'Cadence', value: service.cadence, valueColor: 'navy' },
    { label: 'State', value: service.state === 'current' ? 'Current' : service.state === 'attention' ? 'Attention' : 'Action', valueColor: service.state },
    { label: 'Citation', value: service.citation || 'None', valueColor: 'navy' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F1EA' }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <Link
          to="/vendors?tab=services"
          className="inline-flex items-center gap-1 mb-3"
          style={{ fontSize: '12px', fontWeight: 500, color: '#5A6478' }}
        >
          <ArrowLeft size={14} />
          Back to services
        </Link>
        <p
          className="uppercase tracking-wider mb-1"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#A08C5A' }}
        >
          Service detail
        </p>
        <div className="flex items-center gap-2">
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#1E2D4D' }}>
            {service.name}
          </h1>
          <StatePill state={service.state} />
        </div>
        <p className="mt-1" style={{ fontSize: '12px', color: '#5A6478' }}>
          {service.category}
          {service.vendorName && ` · ${service.vendorName}`}
        </p>
      </div>

      <div className="px-4 pb-24">
        {/* AI synthesis */}
        <AISynthesisStrip message={service.answerLine} />

        {/* Metrics */}
        <MetricsStrip cards={metricCards} />

        {/* Location coverage */}
        <p
          className="uppercase tracking-wider mb-2"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#5A6478' }}
        >
          Location coverage
        </p>
        <div className="flex flex-col gap-2 mb-4">
          {service.locations.map(loc => (
            <div
              key={loc.locationId}
              className="bg-white rounded-lg px-4 py-3 flex items-center gap-3"
              style={{ border: '1px solid #E2DDD4' }}
            >
              <StateDot state={loc.state} locationName={loc.locationName} />
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D' }}>
                  {loc.locationName}
                </p>
                <p style={{ fontSize: '11px', color: '#5A6478' }}>
                  {loc.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Service info */}
        <p
          className="uppercase tracking-wider mb-2"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#5A6478' }}
        >
          Service information
        </p>
        <div
          className="bg-white rounded-lg px-4 py-3"
          style={{ border: '1px solid #E2DDD4' }}
        >
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <Calendar size={13} style={{ color: '#5A6478' }} />
              <p style={{ fontSize: '12px', color: '#1E2D4D' }}>
                {service.cadence} cadence
              </p>
            </div>
            {service.vendorName && (
              <div className="flex items-center gap-2">
                <MapPin size={13} style={{ color: '#5A6478' }} />
                <p style={{ fontSize: '12px', color: '#1E2D4D' }}>
                  Vendor: {service.vendorName}
                </p>
              </div>
            )}
            {service.citation && (
              <div className="flex items-center gap-2">
                <Shield size={13} style={{ color: '#5A6478' }} />
                <p style={{ fontSize: '12px', color: '#1E2D4D' }}>
                  Citation: {service.citation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        {service.cta && (
          <div className="mt-4">
            {service.cta.variant === 'primary' ? (
              <button
                type="button"
                className="w-full py-2.5 rounded-md"
                style={{ fontSize: '13px', fontWeight: 500, backgroundColor: '#1E2D4D', color: '#FAF7F0' }}
              >
                {service.cta.label}
              </button>
            ) : (
              <button
                type="button"
                className="w-full py-2.5 rounded-md"
                style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #1E2D4D' }}
              >
                {service.cta.label}
              </button>
            )}
          </div>
        )}

        {/* Service history */}
        <p
          className="uppercase tracking-wider mb-2 mt-4"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#5A6478' }}
        >
          Service history
        </p>
        {records.length === 0 ? (
          <div
            className="rounded-md px-3 py-3 mb-4"
            style={{ backgroundColor: '#FCFBF8', border: '1px solid #E2DDD4' }}
          >
            <p style={{ fontSize: '11px', color: '#5A6478' }}>No completed visits yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-4">
            {records.map(rec => {
              const docUrl = rec.certificate_url || rec.document_url;
              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-lg px-4 py-3"
                  style={{ border: '1px solid #E2DDD4' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#1E2D4D' }}>
                        {rec.service_date
                          ? new Date(rec.service_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'No date'}
                      </p>
                      <p style={{ fontSize: '11px', color: '#5A6478' }}>
                        {[rec.technician_name, rec.cert_number ? `Cert: ${rec.cert_number}` : null].filter(Boolean).join(' · ') || 'No details'}
                      </p>
                    </div>
                    {docUrl && (
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                        style={{ fontSize: '11px', fontWeight: 500, color: '#1E2D4D', border: '1px solid #E2DDD4', backgroundColor: '#FCFBF8' }}
                      >
                        <FileText size={12} />
                        Open
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Vendor Conversation */}
        <div className="mt-4">
          <ThreadedConversation
            entityType="service_schedule"
            entityId={serviceId || null}
            organizationId={profile?.organization_id || null}
            defaultSubject={service?.name || 'Service inquiry'}
          />
        </div>
      </div>
    </div>
  );
}
