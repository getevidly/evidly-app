import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { CalendarEvent } from '../../pages/Calendar';

interface ReadOnlyEventModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReadOnlyEventModal({ event, isOpen, onClose }: ReadOnlyEventModalProps) {
  const navigate = useNavigate();

  if (!event) return null;

  const handleCTA = () => {
    navigate('/vendors');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      {/* 1. Accent bar */}
      <div style={{ height: '6px', backgroundColor: '#3B6D11', width: '100%' }} />

      {/* 2. Pill row */}
      <div style={{ padding: '12px 20px 0' }}>
        <span style={{
          display: 'inline-block',
          backgroundColor: '#FAF7F0',
          color: '#1E2D4D',
          borderRadius: '999px',
          padding: '4px 12px',
          fontSize: '12px',
          fontWeight: 500,
        }}>
          View only — managed in Vendor Services
        </span>
      </div>

      {/* 3. Title row */}
      <div style={{ padding: '12px 20px 16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1E2D4D' }}>
          {event.title}
        </h3>
      </div>

      {/* 4. Body */}
      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <LabeledValue label="Date" value={event.date} />
        <LabeledValue
          label="Time"
          value={event.endTime ? `${event.time} — ${event.endTime}` : event.time}
        />
        <LabeledValue label="Location" value={event.location} />
        {event.vendorName && <LabeledValue label="Vendor" value={event.vendorName} />}
        {event.category && <LabeledValue label="Category" value={event.category} />}
        {event.recurrence && event.recurrence !== 'one-time' && (
          <LabeledValue label="Recurrence" value={event.recurrence} />
        )}
        {event.description && (
          <div>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', marginBottom: '4px' }}>
              Description
            </div>
            <div style={{ fontSize: '14px', color: '#1E2D4D', whiteSpace: 'pre-wrap' }}>
              {event.description}
            </div>
          </div>
        )}
      </div>

      {/* 5. Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'white',
            color: '#1E2D4D',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            padding: '8px 16px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
          }}
        >
          Close
        </button>
        <button
          onClick={handleCTA}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCTA(); }}
          style={{
            background: '#3B6D11',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2D5309'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#3B6D11'; }}
        >
          <ExternalLink size={16} style={{ marginRight: '6px' }} />
          Open in Vendor Services
        </button>
      </div>
    </Modal>
  );
}

function LabeledValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', color: '#1E2D4D' }}>
        {value}
      </div>
    </div>
  );
}
