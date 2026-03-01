import { Heart, Clock, CheckCircle2, Send, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { demoK2CInvites } from '../../data/referralDemoData';
import { demoReferral } from '../../data/demoData';

interface K2CReferralTrackerProps {
  onInviteClick: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle2 },
  signed_up: { label: 'Signed Up', color: '#2563eb', bg: '#eff6ff', icon: CheckCircle2 },
  invited: { label: 'Pending', color: '#d97706', bg: '#fffbeb', icon: Clock },
  expired: { label: 'Expired', color: '#6b7280', bg: '#f3f4f6', icon: Clock },
};

export function K2CReferralTracker({ onInviteClick }: K2CReferralTrackerProps) {
  const invites = demoK2CInvites;
  const totalReferrals = invites.length;
  const signedUp = invites.filter(i => i.status === 'signed_up' || i.status === 'active').length;
  const pending = invites.filter(i => i.status === 'invited').length;
  const totalMeals = invites.reduce((sum, i) => sum + i.mealsGenerated, 0);

  // Chain stats
  const chainReferrals = invites.filter(i => i.chainDepth > 1);
  const chainMeals = chainReferrals.reduce((sum, i) => sum + i.mealsGenerated, 0);

  const handleReminder = (invite: typeof invites[0]) => {
    console.log('[K2C] Reminder sent:', invite.email);
    toast.success(`Reminder sent to ${invite.contactName}`);
  };

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #D1D9E6',
      borderRadius: '12px',
      padding: '20px 24px',
      boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Heart size={18} color="#A08C5A" />
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0B1628' }}>
          K2C Referral Tracker
        </h3>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px',
        marginBottom: '20px',
      }}>
        {[
          { label: 'Total', value: totalReferrals, color: '#0B1628' },
          { label: 'Signed Up', value: signedUp, color: '#16a34a' },
          { label: 'Pending', value: pending, color: '#d97706' },
          { label: 'Meals', value: demoReferral.mealsGenerated + totalMeals, color: '#A08C5A' },
        ].map(s => (
          <div key={s.label} style={{
            textAlign: 'center', padding: '10px 8px', borderRadius: '8px',
            backgroundColor: '#F4F6FA',
          }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#6B7F96', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chain impact */}
      {chainReferrals.length > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px',
          padding: '10px 14px', marginBottom: '16px',
          fontSize: '12px', color: '#92400e',
        }}>
          Your referral chain has generated <strong>{chainMeals} meals</strong> across{' '}
          <strong>{chainReferrals.length} kitchen{chainReferrals.length > 1 ? 's' : ''}</strong> (indirect referrals).
        </div>
      )}

      {/* Referral list */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#3D5068', margin: '0 0 10px' }}>
          Recent Referrals
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {invites.map(invite => {
            const config = STATUS_CONFIG[invite.status] || STATUS_CONFIG.invited;
            const StatusIcon = config.icon;
            return (
              <div key={invite.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: '8px', border: '1px solid #E8EDF5',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0B1628' }}>
                      {invite.businessName}
                    </span>
                    {invite.chainDepth > 1 && (
                      <span style={{
                        fontSize: '10px', padding: '1px 6px', borderRadius: '10px',
                        backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 600,
                      }}>
                        Chain
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7F96', marginTop: '2px' }}>
                    {invite.contactName} · {new Date(invite.invitedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: 600, color: config.color,
                    backgroundColor: config.bg, padding: '3px 8px', borderRadius: '10px',
                  }}>
                    <StatusIcon size={12} />
                    {config.label}
                  </span>
                  {invite.status === 'invited' && (
                    <button
                      onClick={() => handleReminder(invite)}
                      title="Send reminder"
                      style={{
                        background: 'none', border: '1px solid #D1D9E6', cursor: 'pointer',
                        padding: '4px 8px', borderRadius: '6px', color: '#3D5068',
                        fontSize: '11px', fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}
                    >
                      <Send size={10} /> Remind
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onInviteClick}
        style={{
          width: '100%', padding: '12px 0', borderRadius: '8px',
          border: 'none', backgroundColor: '#1e4d6b', color: '#ffffff',
          fontSize: '14px', fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        <UserPlus size={16} />
        Refer Another Kitchen
      </button>
    </div>
  );
}
