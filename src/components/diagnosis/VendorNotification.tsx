import React, { useState, useEffect } from 'react';
import { DEMO_VENDORS, getVendorsForCategory, buildNotificationMessage } from '../../data/vendorData';

interface Props {
  result: {
    title: string;
    severity: string;
    equipment: string;
    immediateSteps: string[];
  };
  categoryId: string;
  hasVideo: boolean;
  hasPhotos?: boolean;
  photoCount?: number;
  locationName?: string;
  orgName?: string;
}

type ContactMethod = 'text' | 'email' | 'both';

export const VendorNotification: React.FC<Props> = ({
  result, categoryId, hasVideo, hasPhotos, photoCount,
  locationName = 'Kitchen', orgName = 'Pacific Coast Dining',
}) => {
  const vendors = getVendorsForCategory(categoryId, DEMO_VENDORS);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendors[0]?.id || '');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('both');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [editing, setEditing] = useState(false);

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  useEffect(() => {
    setMessage(buildNotificationMessage(result, locationName, orgName, hasVideo, hasPhotos, photoCount));
  }, [result, locationName, orgName, hasVideo, hasPhotos, photoCount]);

  const sendNotification = () => {
    if (!selectedVendor) return;

    if (contactMethod === 'text' || contactMethod === 'both') {
      const smsBody = encodeURIComponent(message);
      window.open(`sms:${selectedVendor.phone}?body=${smsBody}`, '_blank');
    }

    if (contactMethod === 'email' || contactMethod === 'both') {
      const subject = encodeURIComponent(`URGENT \u2014 Kitchen Issue: ${result.title}`);
      const body = encodeURIComponent(message);
      window.open(`mailto:${selectedVendor.email}?subject=${subject}&body=${body}`, '_blank');
    }

    setSent(true);
  };

  if (vendors.length === 0) {
    return (
      <div style={{
        background: '#EEF1F7', border: '1px solid #D1D9E6',
        borderRadius: '8px', padding: '14px', marginBottom: '12px',
      }}>
        <p style={{ color: 'var(--text-secondary, #3D5068)', fontSize: '12px', fontFamily: 'system-ui', margin: 0 }}>
          No vendors on file for this issue type. Add vendors in Settings {'\u2192'} Vendors.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#EEF1F7', border: '1px solid #A08C5A40',
      borderRadius: '10px', padding: '16px', marginBottom: '12px',
    }}>
      <p style={{ color: '#A08C5A', fontSize: '11px', fontWeight: 700, margin: '0 0 12px', fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {'\uD83D\uDCE4'} Notify Your Vendor
      </p>

      <div style={{ marginBottom: '10px' }}>
        <label style={{ color: 'var(--text-secondary, #3D5068)', fontSize: '10px', fontWeight: 700, display: 'block', marginBottom: '4px', fontFamily: 'system-ui', textTransform: 'uppercase' }}>
          Select Vendor
        </label>
        <select
          value={selectedVendorId}
          onChange={e => setSelectedVendorId(e.target.value)}
          style={{
            width: '100%', background: '#FFFFFF', border: '1px solid #D1D9E6',
            borderRadius: '6px', padding: '8px 10px',
            color: 'var(--text-primary, #0B1628)', fontSize: '12px', fontFamily: 'system-ui',
          }}
        >
          {vendors.map(v => (
            <option key={v.id} value={v.id}>
              {v.name} {v.evidlyPartner ? '\u2605 EvidLY Partner' : ''} {'\u2014'} {v.contactName || v.category}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: 'var(--text-secondary, #3D5068)', fontSize: '10px', fontWeight: 700, display: 'block', marginBottom: '6px', fontFamily: 'system-ui', textTransform: 'uppercase' }}>
          Contact Method
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['text', 'email', 'both'] as ContactMethod[]).map(method => (
            <button
              key={method}
              onClick={() => setContactMethod(method)}
              style={{
                background: contactMethod === method ? '#A08C5A' : '#FFFFFF',
                border: `1px solid ${contactMethod === method ? '#A08C5A' : '#D1D9E6'}`,
                borderRadius: '6px', padding: '6px 14px',
                color: contactMethod === method ? '#ffffff' : 'var(--text-primary, #0B1628)', fontSize: '12px', fontWeight: contactMethod === method ? 700 : 400,
                cursor: 'pointer', fontFamily: 'system-ui',
              }}
            >
              {method === 'text' ? '\uD83D\uDCF1 Text' : method === 'email' ? '\uD83D\uDCE7 Email' : '\u26A1 Both'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ color: 'var(--text-secondary, #3D5068)', fontSize: '10px', fontWeight: 700, display: 'block', marginBottom: '4px', fontFamily: 'system-ui', textTransform: 'uppercase' }}>
          Message Preview
        </label>
        {editing ? (
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={10}
            style={{
              width: '100%', background: '#FFFFFF', border: '1px solid #A08C5A',
              borderRadius: '6px', padding: '10px', color: 'var(--text-primary, #0B1628)',
              fontSize: '12px', fontFamily: 'monospace', lineHeight: 1.6,
              resize: 'vertical', boxSizing: 'border-box' as const,
            }}
          />
        ) : (
          <div style={{
            background: '#FFFFFF', border: '1px solid #D1D9E6',
            borderRadius: '6px', padding: '10px',
          }}>
            <pre style={{
              color: 'var(--text-secondary, #3D5068)', fontSize: '11px', margin: 0,
              fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {message}
            </pre>
          </div>
        )}
      </div>

      {sent ? (
        <div style={{
          background: '#14532d20', border: '1px solid #166534',
          borderRadius: '6px', padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ color: '#4ade80', fontSize: '14px' }}>{'\u2713'}</span>
          <p style={{ color: '#4ade80', fontSize: '12px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>
            Notification sent to {selectedVendor?.name}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setEditing(!editing)}
            style={{
              background: 'transparent', border: '1px solid #D1D9E6',
              borderRadius: '6px', padding: '8px 14px',
              color: 'var(--text-secondary, #3D5068)', fontSize: '12px', cursor: 'pointer', fontFamily: 'system-ui',
            }}
          >
            {editing ? 'Done Editing' : '\u270F\uFE0F Edit Message'}
          </button>
          <button
            onClick={sendNotification}
            style={{
              background: '#A08C5A', border: 'none',
              borderRadius: '6px', padding: '8px 20px',
              color: '#ffffff', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'system-ui', flex: 1,
            }}
          >
            Send Now {'\u2192'}
          </button>
        </div>
      )}
    </div>
  );
};
