import { useState, useCallback, useRef } from 'react';
import { X, Heart, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';

interface K2CInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode: string;
  /** Sender's name (auto-populated in message). Demo default: 'Marcus Johnson' */
  senderName?: string;
  /** Sender's business name (auto-populated in message). Demo default: 'Pacific Coast Kitchen' */
  senderBusinessName?: string;
}

const K2C_PAGE_URL = 'https://app.evidly.com/kitchen-to-community';

const ROLE_OPTIONS = [
  { value: 'Owner/Operator', label: 'Owner / CEO' },
  { value: 'Kitchen Manager', label: 'Manager' },
  { value: 'Chef', label: 'Chef / Kitchen Manager' },
  { value: 'Facilities Manager', label: 'Facility Manager' },
  { value: 'Compliance Officer', label: 'Compliance Officer' },
  { value: 'Other', label: 'Other' },
];

/* ------------------------------------------------------------------ */
/*  Role-based message templates                                       */
/* ------------------------------------------------------------------ */

function getRoleMessage(
  roleValue: string,
  contactName: string,
  referralLink: string,
  senderName: string,
  senderBusiness: string,
): string {
  const name = contactName.trim() || '[Contact Name]';
  const link = referralLink || '[Referral Link]';

  switch (roleValue) {
    case 'Owner/Operator':
      return `Hey ${name},

I've been using EvidLY to manage both food safety and facility safety across my kitchen operations, and it's completely changed how I run things — I know exactly where I stand before an inspector walks through the door, every vendor is tracked, and my compliance score updates in real time.

As a fellow owner, I think you'd appreciate having everything in one place instead of juggling spreadsheets, binders, and hoping your team is on top of things.

Plus, for every kitchen that joins through my referral, EvidLY donates 12 meals to No Kid Hungry through their Kitchen to Community program. Learn more: ${K2C_PAGE_URL}

So you'd be helping your business AND feeding kids in our community. And once you're on EvidLY, you'll get your own referral code to keep the chain going.

Check it out: ${link}

${senderName}
${senderBusiness}`;

    case 'Kitchen Manager':
      return `Hey ${name},

I've been using EvidLY at my kitchen and wanted to pass it along — it makes managing daily operations so much easier. Temperature logs, vendor tracking, checklists, compliance scoring — everything your team does is tracked and visible in one dashboard.

As a manager, you'd have clear visibility into what's getting done and what needs attention without chasing people down.

Plus, for every kitchen that joins through this link, 12 meals are donated to No Kid Hungry. Learn more: ${K2C_PAGE_URL}

Check it out: ${link}

${senderName}
${senderBusiness}`;

    case 'Chef':
      return `Hey ${name},

Fellow kitchen professional here — I started using EvidLY for food safety management and it's been a game changer. Temperature monitoring, receiving logs, HACCP tracking, and daily checklists are all in one system. No more paper logs or guessing if your team completed their checks.

I think you'd really benefit from having all your food safety operations organized and inspection-ready at all times.

Plus, every kitchen that joins through my referral means 12 meals donated to No Kid Hungry. Learn more: ${K2C_PAGE_URL}

Check it out: ${link}

${senderName}
${senderBusiness}`;

    case 'Facilities Manager':
      return `Hey ${name},

I wanted to share something that's really helped me stay on top of facility safety — EvidLY tracks all my vendor services (hood cleaning, fire suppression, extinguishers, pest control, grease traps) in one place with automatic scheduling reminders and compliance scoring.

No more wondering if your hood cleaning is overdue or scrambling for records before a fire marshal visit. Everything is documented and inspection-ready.

Plus, every kitchen that joins through my referral means 12 meals donated to No Kid Hungry. Learn more: ${K2C_PAGE_URL}

Check it out: ${link}

${senderName}
${senderBusiness}`;

    case 'Compliance Officer':
      return `Hey ${name},

If you're managing compliance for commercial kitchens, you need to check out EvidLY. It's the only platform I've found that covers both food safety AND facility safety with jurisdiction-specific scoring. Gap analysis, corrective action workflows, inspection readiness — it's built for people like us who need to know exactly where things stand.

For every kitchen that joins through this link, EvidLY donates 12 meals to No Kid Hungry through their K2C program. Learn more: ${K2C_PAGE_URL}

Check it out: ${link}

${senderName}
${senderBusiness}`;

    default: // 'Other' or empty
      return `Hey ${name},

I've been using EvidLY to manage food safety and facility safety at my kitchen, and it's been a game changer — I know exactly where I stand before an inspector walks through the door.

I think it could really help you too. Plus, for every kitchen that joins through my referral, 12 meals are donated to No Kid Hungry. Learn more: ${K2C_PAGE_URL}

So you'd be helping your business AND feeding kids in our community. And once you're on EvidLY, you'll get your own referral code to keep the chain going.

Check it out: ${link}

${senderName}
${senderBusiness}`;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function K2CInviteModal({
  isOpen,
  onClose,
  referralCode,
  senderName: senderNameProp,
  senderBusinessName: senderBusinessProp,
}: K2CInviteModalProps) {
  const { isDemoMode } = useDemo();

  const senderName = senderNameProp || (isDemoMode ? 'Marcus Johnson' : 'Your Name');
  const senderBusiness = senderBusinessProp || (isDemoMode ? 'Pacific Coast Kitchen' : 'Your Business');
  const referralLink = referralCode
    ? `https://getevidly.com/ref/${referralCode}`
    : '';

  const [contactName, setContactName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState(() =>
    getRoleMessage('', '', referralLink, senderName, senderBusiness),
  );
  const [loading, setLoading] = useState(false);

  // Track whether the user has manually edited the message
  const messageEdited = useRef(false);
  // Track confirmation dialog for role change
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const buildMessage = useCallback(
    (roleVal: string, name?: string) =>
      getRoleMessage(roleVal, name ?? contactName, referralLink, senderName, senderBusiness),
    [contactName, referralLink, senderName, senderBusiness],
  );

  const resetForm = () => {
    setContactName('');
    setBusinessName('');
    setEmail('');
    setPhone('');
    setRole('');
    setMessage(getRoleMessage('', '', referralLink, senderName, senderBusiness));
    messageEdited.current = false;
    setPendingRole(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  /* ── Role change logic ─────────────────────────────────────────── */

  const applyRole = (newRole: string) => {
    setRole(newRole);
    setMessage(buildMessage(newRole));
    messageEdited.current = false;
    setPendingRole(null);
  };

  const handleRoleChange = (newRole: string) => {
    if (messageEdited.current) {
      // User has edited the message — ask before overwriting
      setPendingRole(newRole);
    } else {
      applyRole(newRole);
    }
  };

  const handleKeepEdits = () => {
    if (pendingRole !== null) {
      setRole(pendingRole);
      setPendingRole(null);
      // Keep current message as-is
    }
  };

  const handleLoadTemplate = () => {
    if (pendingRole !== null) {
      applyRole(pendingRole);
    }
  };

  /* ── Message editing ───────────────────────────────────────────── */

  const handleMessageChange = (value: string) => {
    setMessage(value);
    messageEdited.current = true;
  };

  /* ── Contact name change → update message placeholders ─────────── */

  const handleContactNameChange = (value: string) => {
    setContactName(value);
    // If user hasn't manually edited the message, auto-update the contact name
    if (!messageEdited.current) {
      setMessage(getRoleMessage(role, value, referralLink, senderName, senderBusiness));
    }
  };

  /* ── Submit ────────────────────────────────────────────────────── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !businessName.trim() || !email.trim()) return;

    setLoading(true);

    if (isDemoMode) {
      console.log('[K2C-INVITE] Demo invite sent:', { contactName, businessName, email, phone, role, referralCode });
      toast.success(`Invitation sent to ${contactName}!`, {
        description: `${businessName} will receive your K2C referral email.`,
      });
      setLoading(false);
      handleClose();
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('k2c-referral-invite', {
        body: { contactName, businessName, email, phone, role, referralCode, message },
      });
      if (error) throw error;

      toast.success(`Invitation sent to ${contactName}!`, {
        description: `${businessName} will receive your K2C referral email.`,
      });
      handleClose();
    } catch (err) {
      console.error('[K2C-INVITE] Failed:', err);
      toast.error('Failed to send invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid #D1D9E6', fontSize: '14px', color: '#0B1628',
    outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: '#0B1628', marginBottom: '4px',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        margin: '16px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #D1D9E6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #A08C5A, #C4AE7A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Heart size={18} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0B1628' }}>
                Refer a Kitchen, Feed the Community
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7F96' }}>
                Every kitchen you refer = 12 meals donated to No Kid Hungry
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px', borderRadius: '6px', color: '#6B7F96',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
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

            {/* Role */}
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
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Confirmation dialog for role change when message was edited */}
            {pendingRole !== null && (
              <div style={{
                background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px',
                padding: '12px 16px',
              }}>
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
                      padding: '6px 14px', borderRadius: '6px',
                      border: '1px solid #D1D9E6', backgroundColor: '#ffffff',
                      fontSize: '12px', fontWeight: 600, color: '#3D5068', cursor: 'pointer',
                    }}
                  >
                    Keep My Edits
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadTemplate}
                    style={{
                      padding: '6px 14px', borderRadius: '6px',
                      border: 'none', backgroundColor: '#1e4d6b',
                      fontSize: '12px', fontWeight: 600, color: '#ffffff', cursor: 'pointer',
                    }}
                  >
                    Load New Template
                  </button>
                </div>
              </div>
            )}

            {/* Personal Note */}
            <div>
              <label style={labelStyle}>Personal Note (optional)</label>
              <textarea
                value={message}
                onChange={(e) => handleMessageChange(e.target.value)}
                rows={8}
                style={{
                  ...inputStyle,
                  fontSize: '13px', resize: 'vertical', lineHeight: '1.5',
                }}
              />
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6B7F96' }}>
                Pre-filled based on role. Edit freely — your message will be included in the referral email.
              </p>
            </div>

            {/* Impact section */}
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px',
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ fontSize: '24px' }}>🍽️</span>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#92400e' }}>
                  Your referral impact
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#a16207' }}>
                  Every kitchen that signs up = <strong>12 meals donated</strong> to No Kid Hungry.
                  Donations <strong>doubled for 3 months</strong> per referral.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex', gap: '12px', justifyContent: 'flex-end',
            marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #D1D9E6',
          }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '10px 20px', borderRadius: '8px',
                border: '1px solid #D1D9E6', backgroundColor: '#ffffff',
                fontSize: '14px', fontWeight: 600, color: '#3D5068',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !contactName.trim() || !businessName.trim() || !email.trim()}
              style={{
                padding: '10px 24px', borderRadius: '8px',
                border: 'none', backgroundColor: '#1e4d6b',
                fontSize: '14px', fontWeight: 600, color: '#ffffff',
                cursor: loading ? 'wait' : 'pointer',
                opacity: (!contactName.trim() || !businessName.trim() || !email.trim()) ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Send size={14} />
              {loading ? 'Sending...' : 'Send Referral'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
