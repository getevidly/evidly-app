import { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useConnectIntegration, useDisconnectIntegration } from '../../hooks/api/useSettings';
import {
  CARD_BG, CARD_BORDER, PANEL_BG, BODY_TEXT, MUTED, NAVY, FONT,
} from '../../components/dashboard/shared/constants';

export interface IntegrationCardDef {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: any;
  connected: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  integration: IntegrationCardDef | null;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 8,
  fontSize: 14,
  color: BODY_TEXT,
  background: '#fff',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: BODY_TEXT,
  marginBottom: 4,
};

export function IntegrationDetailModal({ isOpen, onClose, integration }: Props) {
  const { mutate: connect, isLoading: connecting } = useConnectIntegration();
  const { mutate: disconnect, isLoading: disconnecting } = useDisconnectIntegration();

  const [apiKey, setApiKey] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [syncFrequency, setSyncFrequency] = useState('daily');
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  if (!isOpen || !integration) return null;

  const slug = integration.slug;
  const isOAuth = ['quickbooks', 'stripe', 'hubspot'].includes(slug);

  const handleConnect = async () => {
    if (isOAuth) {
      alert(`OAuth flow for ${integration.name} — coming soon`);
      return;
    }
    const config: Record<string, unknown> = { syncFrequency };
    if (slug === 'twilio') config.phoneNumber = phoneNumber;
    if (slug === 'sendgrid') config.fromAddress = fromAddress;
    if (slug === 'evidly') config.apiKey = apiKey;

    try {
      await connect({ slug, config });
      alert(`Connected to ${integration.name}`);
      onClose();
    } catch {
      alert('Failed to connect');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect(slug);
      alert(`Disconnected from ${integration.name}`);
      onClose();
    } catch {
      alert('Failed to disconnect');
    }
  };

  const handleTest = () => {
    setTestResult(null);
    setTimeout(() => {
      setTestResult('success');
    }, 1000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{
        position: 'relative',
        background: CARD_BG,
        borderRadius: 14,
        width: '100%',
        maxWidth: 480,
        maxHeight: '90vh',
        overflow: 'auto',
        padding: 28,
        ...FONT,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <integration.icon size={22} color={NAVY} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: BODY_TEXT, margin: 0 }}>
              {integration.name}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} aria-label="Close">
            <X size={20} color={MUTED} />
          </button>
        </div>

        <p style={{ color: MUTED, fontSize: 13, margin: '0 0 20px' }}>{integration.description}</p>

        {/* Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 8,
          background: integration.connected ? '#f0fdf4' : PANEL_BG,
          border: `1px solid ${integration.connected ? '#bbf7d0' : CARD_BORDER}`,
          marginBottom: 20,
        }}>
          {integration.connected ? (
            <>
              <CheckCircle2 size={16} color="#16a34a" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Connected</span>
            </>
          ) : (
            <>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#9ca3af' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>Not Connected</span>
            </>
          )}
        </div>

        {/* OAuth integrations */}
        {isOAuth && !integration.connected && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={handleConnect}
              disabled={connecting}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: 8,
                border: 'none',
                background: NAVY,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: connecting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {connecting && <Loader2 size={16} className="animate-spin" />}
              Connect with {integration.name}
            </button>
          </div>
        )}

        {/* Twilio */}
        {slug === 'twilio' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Phone Number</label>
            <input style={inputStyle} value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+1 (555) 123-4567" />
            <button
              onClick={() => alert('Test SMS sent (demo)')}
              style={{ marginTop: 8, padding: '6px 14px', borderRadius: 6, border: `1px solid ${CARD_BORDER}`, background: '#fff', color: BODY_TEXT, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Send Test SMS
            </button>
          </div>
        )}

        {/* SendGrid */}
        {slug === 'sendgrid' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>From Address</label>
            <input style={inputStyle} value={fromAddress} onChange={e => setFromAddress(e.target.value)} placeholder="noreply@hoodops.com" type="email" />
            <button
              onClick={() => alert('Test email sent (demo)')}
              style={{ marginTop: 8, padding: '6px 14px', borderRadius: 6, border: `1px solid ${CARD_BORDER}`, background: '#fff', color: BODY_TEXT, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Send Test Email
            </button>
          </div>
        )}

        {/* EvidLY */}
        {slug === 'evidly' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>API Key</label>
            <input style={inputStyle} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="evdly_sk_..." type="password" />

            <label style={{ ...labelStyle, marginTop: 12 }}>Webhook URL</label>
            <div style={{ padding: '8px 12px', background: PANEL_BG, borderRadius: 8, fontSize: 13, color: MUTED, fontFamily: 'monospace' }}>
              https://api.hoodops.com/webhooks/evidly
            </div>

            <button
              onClick={handleTest}
              style={{ marginTop: 10, padding: '6px 14px', borderRadius: 6, border: `1px solid ${CARD_BORDER}`, background: '#fff', color: BODY_TEXT, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Test Connection
            </button>
            {testResult === 'success' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#16a34a', fontSize: 13 }}>
                <CheckCircle2 size={14} /> Connection successful
              </div>
            )}
            {testResult === 'error' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#dc2626', fontSize: 13 }}>
                <AlertTriangle size={14} /> Connection failed
              </div>
            )}
          </div>
        )}

        {/* Sync frequency (for non-OAuth or connected) */}
        {!isOAuth && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Sync Frequency</label>
            <select
              style={inputStyle}
              value={syncFrequency}
              onChange={e => setSyncFrequency(e.target.value)}
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        )}

        {/* Connect / Disconnect buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 20 }}>
          {integration.connected ? (
            showDisconnectConfirm ? (
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  {disconnecting ? 'Disconnecting...' : 'Confirm Disconnect'}
                </button>
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: '#fff', color: BODY_TEXT, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Disconnect
              </button>
            )
          ) : (
            !isOAuth && (
              <button
                onClick={handleConnect}
                disabled={connecting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: NAVY,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: connecting ? 'not-allowed' : 'pointer',
                }}
              >
                {connecting && <Loader2 size={14} className="animate-spin" />}
                Connect
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
