import { useState, useCallback, useRef } from 'react';
import { X, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  CLIENT_ROLE_OPTIONS,
  SERVICE_FREQUENCIES,
  getServiceProviderInviteMessage,
  type ClientInvitation,
} from '../../data/serviceProviderDemoData';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ClientInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: (invitation: ClientInvitation) => void;
  providerName: string; // e.g., "Cleaning Pros Plus, LLC"
  providerServices: string[]; // e.g., ['hood_cleaning', 'fan_performance']
}

/* ------------------------------------------------------------------ */
/*  Service name labels                                                */
/* ------------------------------------------------------------------ */

const SERVICE_LABELS: Record<string, string> = {
  hood_cleaning: 'Hood Cleaning / Exhaust Cleaning',
  fan_performance: 'Fan Performance Management',
  grease_filter: 'Grease Filter Exchange',
  rooftop_grease: 'Rooftop Grease Containment',
  fire_suppression_svc: 'Fire Suppression',
  fire_extinguisher_svc: 'Fire Extinguisher Service',
  pest_control_svc: 'Pest Control',
  grease_trap_svc: 'Grease Trap Service',
  backflow_svc: 'Backflow Prevention',
  oil_removal_svc: 'Oil Recycling / Fryer Management',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateInviteCode(): string {
  return `cpp-inv-${Date.now().toString(36)}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ClientInviteModal({
  isOpen,
  onClose,
  onInviteSent,
  providerName,
  providerServices,
}: ClientInviteModalProps) {
  // Use "Arthur" as the sender for Cleaning Pros Plus demo
  const senderName = 'Arthur';
  const inviteLink = 'https://app.evidly.com/invite/[code]';

  const [contactName, setContactName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>(() => [...providerServices]);
  const [frequency, setFrequency] = useState('quarterly');
  const [numLocations, setNumLocations] = useState(1);
  const [k2cReferral, setK2cReferral] = useState(false);
  const [message, setMessage] = useState(() =>
    getServiceProviderInviteMessage('', '', senderName, providerName, inviteLink),
  );
  const [loading, setLoading] = useState(false);

  // Track whether the user has manually edited the message
  const messageEdited = useRef(false);
  // Track confirmation dialog for role change
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const buildMessage = useCallback(
    (roleVal: string, name?: string) =>
      getServiceProviderInviteMessage(roleVal, name ?? contactName, senderName, providerName, inviteLink),
    [contactName, providerName],
  );

  const resetForm = () => {
    setContactName('');
    setBusinessName('');
    setEmail('');
    setPhone('');
    setRole('');
    setSelectedServices([...providerServices]);
    setFrequency('quarterly');
    setNumLocations(1);
    setK2cReferral(false);
    setMessage(getServiceProviderInviteMessage('', '', senderName, providerName, inviteLink));
    messageEdited.current = false;
    setPendingRole(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  /* -- Role change logic ------------------------------------------------ */

  const applyRole = (newRole: string) => {
    setRole(newRole);
    setMessage(buildMessage(newRole));
    messageEdited.current = false;
    setPendingRole(null);
  };

  const handleRoleChange = (newRole: string) => {
    if (messageEdited.current) {
      setPendingRole(newRole);
    } else {
      applyRole(newRole);
    }
  };

  const handleKeepEdits = () => {
    if (pendingRole !== null) {
      setRole(pendingRole);
      setPendingRole(null);
    }
  };

  const handleLoadTemplate = () => {
    if (pendingRole !== null) {
      applyRole(pendingRole);
    }
  };

  /* -- Message editing -------------------------------------------------- */

  const handleMessageChange = (value: string) => {
    setMessage(value);
    messageEdited.current = true;
  };

  /* -- Contact name change -> update message placeholders --------------- */

  const handleContactNameChange = (value: string) => {
    setContactName(value);
    if (!messageEdited.current) {
      setMessage(getServiceProviderInviteMessage(role, value, senderName, providerName, inviteLink));
    }
  };

  /* -- Service checkbox toggle ------------------------------------------ */

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((s) => s !== serviceId)
        : [...prev, serviceId],
    );
  };

  /* -- Submit ----------------------------------------------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !businessName.trim() || !email.trim()) return;

    setLoading(true);

    const invitation: ClientInvitation = {
      id: `ci-${Date.now()}`,
      vendorId: 'v-cpp-1',
      inviteCode: generateInviteCode(),
      contactName: contactName.trim(),
      businessName: businessName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      role: role || null,
      servicesProvided: selectedServices,
      frequency: frequency || null,
      numLocations,
      k2cReferral,
      message: message.trim() || null,
      status: 'sent',
      sentAt: new Date().toISOString(),
      openedAt: null,
      signedUpAt: null,
      reminderCount: 0,
      lastReminderAt: null,
    };

    // Demo mode: create object locally and notify parent
    console.log('[CLIENT-INVITE] Demo invite sent:', invitation);
    onInviteSent(invitation);
    toast.success(`Invitation sent to ${email.trim()}`);
    setLoading(false);
    handleClose();
  };

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #D1D9E6',
    fontSize: '14px',
    color: '#0B1628',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#0B1628',
    marginBottom: '4px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '672px',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: '16px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div
          style={{
            padding: '20px 24px',
            background: '#1e4d6b',
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>
            Invite a Client to EvidLY
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              color: '#ffffff',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Form ───────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Explainer text */}
          <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#3D5068', lineHeight: '1.5' }}>
            When your client signs up, <strong>{providerName}</strong> will be automatically added as
            their vendor. Your COI and certifications will be shared with their account.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Contact Name */}
            <div>
              <label style={labelStyle}>Contact Name *</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => handleContactNameChange(e.target.value)}
                placeholder="e.g., Maria Gonzalez"
                required
                style={inputStyle}
              />
            </div>

            {/* Business Name */}
            <div>
              <label style={labelStyle}>Business Name *</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Central Cafe & Grill"
                required
                style={inputStyle}
              />
            </div>

            {/* Email + Phone row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-0100"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Role + Frequency row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Their Role</label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  style={{
                    ...inputStyle,
                    color: role ? '#0B1628' : '#6B7F96',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">Select their role...</option>
                  {CLIENT_ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Service Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  style={{
                    ...inputStyle,
                    color: '#0B1628',
                    backgroundColor: '#ffffff',
                  }}
                >
                  {SERVICE_FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Confirmation dialog for role change when message was edited */}
            {pendingRole !== null && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '10px',
                  padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <AlertTriangle size={16} color="#92400e" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400e' }}>
                    Changing the role will update the message.
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#a16207', margin: '0 0 10px' }}>
                  Keep your edits or load the new template?
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleKeepEdits}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #D1D9E6',
                      backgroundColor: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#3D5068',
                      cursor: 'pointer',
                    }}
                  >
                    Keep My Edits
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadTemplate}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#1e4d6b',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    Load New Template
                  </button>
                </div>
              </div>
            )}

            {/* Services You Provide Them */}
            <div>
              <label style={labelStyle}>Services You Provide Them</label>
              <div
                style={{
                  border: '1px solid #D1D9E6',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {providerServices.map((serviceId) => (
                  <label
                    key={serviceId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: '#0B1628',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(serviceId)}
                      onChange={() => handleServiceToggle(serviceId)}
                      style={{ accentColor: '#1e4d6b', width: '16px', height: '16px' }}
                    />
                    {SERVICE_LABELS[serviceId] || serviceId}
                  </label>
                ))}
              </div>
            </div>

            {/* Number of Locations */}
            <div>
              <label style={labelStyle}>Number of Locations</label>
              <input
                type="number"
                min={1}
                value={numLocations}
                onChange={(e) => setNumLocations(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ ...inputStyle, maxWidth: '120px' }}
              />
            </div>

            {/* K2C Referral Checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                padding: '12px 16px',
                borderRadius: '10px',
                border: k2cReferral ? '1px solid #d4af37' : '1px solid #D1D9E6',
                background: k2cReferral ? '#fffdf5' : '#ffffff',
              }}
            >
              <input
                type="checkbox"
                checked={k2cReferral}
                onChange={(e) => setK2cReferral(e.target.checked)}
                style={{ accentColor: '#d4af37', width: '18px', height: '18px' }}
              />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0B1628' }}>
                  Also count as K2C referral (12 meals donated)
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6B7F96' }}>
                  Your client referral will also contribute to Kitchen to Community.
                </p>
              </div>
            </label>

            {/* Personal Message */}
            <div>
              <label style={{ ...labelStyle, marginBottom: '6px' }}>Personal Message</label>
              <textarea
                value={message}
                onChange={(e) => handleMessageChange(e.target.value)}
                rows={8}
                style={{
                  ...inputStyle,
                  fontSize: '13px',
                  resize: 'vertical',
                  lineHeight: '1.5',
                }}
              />
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6B7F96' }}>
                Pre-filled based on role. Edit freely -- your message will be included in the invitation email.
              </p>
            </div>
          </div>

          {/* ── Actions ──────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #D1D9E6',
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #D1D9E6',
                backgroundColor: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                color: '#3D5068',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !contactName.trim() || !businessName.trim() || !email.trim()}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#1e4d6b',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: loading ? 'wait' : 'pointer',
                opacity:
                  !contactName.trim() || !businessName.trim() || !email.trim() ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Send size={14} />
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
