import { useInspectionDeliveries } from '../../../hooks/useInspectionDeliveries';
import type { Delivery } from '../../../hooks/useInspectionDeliveries';

function formatDeliveryDate(d: Delivery): string {
  const dateStr = d.delivered_at || d.sent_at;
  if (!dateStr) return '';
  const dt = new Date(dateStr);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' +
    dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getRowClass(status: string): string {
  if (status === 'delivered') return 'insp-log-row delivered';
  if (status === 'failed' || status === 'bounced') return 'insp-log-row failed';
  return 'insp-log-row sent';
}

function getIcon(status: string): string {
  if (status === 'delivered') return 'ti ti-mail-check';
  if (status === 'failed' || status === 'bounced') return 'ti ti-mail-x';
  return 'ti ti-send';
}

function getLabel(status: string): string {
  if (status === 'delivered') return 'Delivered to:';
  if (status === 'failed' || status === 'bounced') return 'Failed:';
  return 'Sent to:';
}

export function InspectionDeliveryLog() {
  const { deliveries, loading } = useInspectionDeliveries();

  return (
    <div className="insp-log">
      <p className="insp-log-h">Recent delivery log</p>
      {loading && (
        <div style={{ height: 40, background: 'var(--cream)', borderRadius: 4 }} />
      )}
      {!loading && deliveries.length === 0 && (
        <p style={{ fontStyle: 'italic', color: 'var(--muted)', margin: 0 }}>No deliveries yet.</p>
      )}
      {!loading && deliveries.map((d) => (
        <div key={d.id} className={getRowClass(d.delivery_status)}>
          <i className={getIcon(d.delivery_status)} />
          <strong>{getLabel(d.delivery_status)}</strong>
          <span>
            {d.delivery_status === 'failed' || d.delivery_status === 'bounced'
              ? (d.failure_reason || 'Email delivery failed')
              : (
                <>
                  {d.recipient_email}
                  {d.recipient_name ? ` (${d.recipient_name})` : ''}
                  {d.message_body ? ` — ${d.message_body}` : ''}
                </>
              )
            }
          </span>
          <span className="when">{formatDeliveryDate(d)}</span>
        </div>
      ))}
    </div>
  );
}
