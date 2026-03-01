import { useState } from 'react';
import { X, Heart, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';

interface K2CInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode: string;
}

const ROLE_OPTIONS = [
  'Owner/Operator',
  'Kitchen Manager',
  'Chef',
  'Facilities Manager',
  'Compliance Officer',
  'Other',
];

const DEFAULT_MESSAGE = `Hi! I've been using EvidLY to manage food safety compliance at my kitchen, and it's been a game-changer.

For every kitchen that joins through this referral, EvidLY donates 12 meals to No Kid Hungry. I thought you might be interested in both the platform and the mission.

It takes about 5 minutes to set up, and you'll see your compliance status immediately. Would love to have you join the Kitchen to Community network!`;

export function K2CInviteModal({ isOpen, onClose, referralCode }: K2CInviteModalProps) {
  const { isDemoMode } = useDemo();

  const [contactName, setContactName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setContactName('');
    setBusinessName('');
    setEmail('');
    setPhone('');
    setRole('');
    setMessage(DEFAULT_MESSAGE);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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
      // Production: send via edge function
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
        maxWidth: '520px',
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
                Feed Kids — Refer a Kitchen
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7F96' }}>
                Every referral = 12 meals donated to No Kid Hungry
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
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0B1628', marginBottom: '4px' }}>
                Contact Name *
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g., Maria Gonzalez"
                required
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #D1D9E6', fontSize: '14px', color: '#0B1628',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Business Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0B1628', marginBottom: '4px' }}>
                Business Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Central Cafe & Grill"
                required
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #D1D9E6', fontSize: '14px', color: '#0B1628',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Email + Phone row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0B1628', marginBottom: '4px' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #D1D9E6', fontSize: '14px', color: '#0B1628',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0B1628', marginBottom: '4px' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-0100"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #D1D9E6', fontSize: '14px', color: '#0B1628',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0B1628', marginBottom: '4px' }}>
                Their Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #D1D9E6', fontSize: '14px', color: role ? '#0B1628' : '#6B7F96',
                  outline: 'none', boxSizing: 'border-box', backgroundColor: '#ffffff',
                }}
              >
                <option value="">Select role...</option>
                {ROLE_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0B1628', marginBottom: '4px' }}>
                Personal Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #D1D9E6', fontSize: '13px', color: '#0B1628',
                  outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                  lineHeight: '1.5',
                }}
              />
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
                  Your donations are doubled for 3 months per referral.
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
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
