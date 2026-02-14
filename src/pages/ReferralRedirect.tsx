/**
 * Public referral redirect — /ref/:code
 * No auth required. Shows referral attribution and redirects to signup.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, CheckCircle, Heart } from 'lucide-react';

const MECHANIC_MESSAGES: Record<string, { heading: string; subtext: string; icon: 'shield' | 'heart' }> = {
  CB: { heading: 'A Compliance Champion invited you!', subtext: 'Join EvidLY and see why top kitchens trust us to stay compliant.', icon: 'shield' },
  IH: { heading: "You've been referred by an Inspection Hero!", subtext: 'This kitchen aced their health inspection with EvidLY. You can too.', icon: 'shield' },
  K2C: { heading: 'Kitchen to Community', subtext: 'When you sign up, a donation is made to a local food charity. Compliance that gives back.', icon: 'heart' },
  NL: { heading: "You've been invited to join the network!", subtext: 'Compete on the EvidLY compliance leaderboard with top kitchens.', icon: 'shield' },
  VR: { heading: 'Your vendor recommends EvidLY', subtext: 'The vendors you already work with use EvidLY to manage compliance. Join the network.', icon: 'shield' },
};

export default function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const prefix = code?.split('-')[0] || 'CB';
  const message = MECHANIC_MESSAGES[prefix] || MECHANIC_MESSAGES.CB;

  useEffect(() => {
    // Track click (in production, would call API)
    console.log('[Referral] Click tracked for code:', code);

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(`/signup?ref=${code}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ backgroundColor: '#1e4d6b' }}>
            {message.icon === 'heart' ? (
              <Heart className="h-8 w-8 text-white" />
            ) : (
              <Shield className="h-8 w-8 text-white" />
            )}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
            <CheckCircle className="h-6 w-6" style={{ color: '#1e4d6b' }} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{message.heading}</h1>
          <p className="text-gray-600 mb-6">{message.subtext}</p>

          {code && (
            <div className="mb-6 px-4 py-2 bg-gray-50 rounded-lg inline-block">
              <span className="text-xs text-gray-400 block">Referral Code</span>
              <span className="text-sm font-mono font-bold" style={{ color: '#1e4d6b' }}>{code}</span>
            </div>
          )}

          <button
            onClick={() => navigate(`/signup?ref=${code}`)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-colors cursor-pointer"
            style={{ backgroundColor: '#1e4d6b' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-xs text-gray-400 mt-4">
            Redirecting to signup in {countdown}s...
          </p>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          30-day free trial. No credit card required.
        </p>
      </div>
    </div>
  );
}
