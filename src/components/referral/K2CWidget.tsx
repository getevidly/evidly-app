import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Copy, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useDemo } from '../../contexts/DemoContext';
import { demoReferral } from '../../data/demoData';
import { demoK2CInvites } from '../../data/referralDemoData';

interface K2CWidgetProps {
  onInviteClick: () => void;
  /** Production referral code from DB (ignored in demo mode) */
  referralCode?: string;
  /** Production referral URL from DB (ignored in demo mode) */
  referralUrl?: string;
  /** Production meals count from DB (ignored in demo mode) */
  mealsGenerated?: number;
  /** Production referrals count from DB (ignored in demo mode) */
  totalReferrals?: number;
  /** Production signed-up count from DB (ignored in demo mode) */
  signedUp?: number;
}

export function K2CWidget({
  onInviteClick,
  referralCode: prodCode,
  referralUrl: prodUrl,
  mealsGenerated: prodMeals,
  totalReferrals: prodReferrals,
  signedUp: prodSignedUp,
}: K2CWidgetProps) {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const [copied, setCopied] = useState(false);

  // Demo mode: show demo seed data. Production: show real data (defaults to 0).
  const referralCode = isDemoMode ? demoReferral.referralCode : (prodCode || '');
  const referralUrl = isDemoMode ? demoReferral.referralUrl : (prodUrl || '');
  const mealsGenerated = isDemoMode ? demoReferral.mealsGenerated : (prodMeals ?? 0);
  const totalReferrals = isDemoMode ? demoK2CInvites.length : (prodReferrals ?? 0);
  const signedUp = isDemoMode
    ? demoK2CInvites.filter(i => i.status === 'signed_up' || i.status === 'active').length
    : (prodSignedUp ?? 0);

  const handleCopyCode = () => {
    if (!referralUrl && !referralCode) {
      toast.info('No referral code generated yet');
      return;
    }
    navigator.clipboard.writeText(referralUrl || referralCode).then(() => {
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #D1D9E6',
      borderRadius: '12px',
      padding: '20px 24px',
      boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Gold accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: 'linear-gradient(90deg, #A08C5A, #C4AE7A, #A08C5A)',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🍽️</span>
          <button
            onClick={() => navigate('/kitchen-to-community')}
            title="Learn about Kitchen to Community"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: '14px', fontWeight: 700, color: '#A08C5A',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            Kitchen to Community
          </button>
        </div>
        <button
          onClick={() => navigate('/referrals')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '12px', fontWeight: 600, color: '#1e4d6b',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          View All <ArrowRight size={12} />
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0B1628' }}>{mealsGenerated}</div>
          <div style={{ fontSize: '11px', color: '#6B7F96' }}>Meals Donated</div>
        </div>
        <div style={{ width: '1px', backgroundColor: '#D1D9E6' }} />
        <div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e4d6b' }}>{totalReferrals}</div>
          <div style={{ fontSize: '11px', color: '#6B7F96' }}>Referrals</div>
        </div>
        <div style={{ width: '1px', backgroundColor: '#D1D9E6' }} />
        <div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a' }}>{signedUp}</div>
          <div style={{ fontSize: '11px', color: '#6B7F96' }}>Signed Up</div>
        </div>
      </div>

      {/* Referral code */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(160, 140, 90, 0.1)', border: '1px solid rgba(160, 140, 90, 0.3)',
        borderRadius: '8px', padding: '8px 12px', marginBottom: '14px',
      }}>
        <div>
          <div style={{ fontSize: '10px', color: '#6B7F96', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
            Your Referral Code
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#A08C5A', letterSpacing: '1px' }}>
            {referralCode || 'Not generated yet'}
          </div>
        </div>
        <button
          onClick={handleCopyCode}
          title="Copy referral link"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
            borderRadius: '6px', color: copied ? '#16a34a' : '#A08C5A',
            display: 'flex', alignItems: 'center',
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      {/* Impact message */}
      <p style={{
        fontSize: '12px', color: '#3D5068', margin: '0 0 14px',
        lineHeight: '1.5',
      }}>
        Every kitchen you refer = <strong style={{ color: '#A08C5A' }}>12 meals donated</strong> to No Kid Hungry.
        Your donations are <strong style={{ color: '#A08C5A' }}>doubled for 3 months</strong> per referral.
      </p>

      {/* CTA Button */}
      <button
        onClick={onInviteClick}
        style={{
          width: '100%',
          padding: '12px 0',
          borderRadius: '8px',
          border: 'none',
          background: 'linear-gradient(135deg, #A08C5A, #C4AE7A)',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <Heart size={16} />
        Feed Kids — Refer a Kitchen
      </button>
    </div>
  );
}
