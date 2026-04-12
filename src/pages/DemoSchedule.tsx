import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Calendar, Shield, Clock } from 'lucide-react';

const NAVY = '#1E2D4D';
const GOLD = '#d4af37';

// Default Calendly URL — configurable in admin settings
const DEFAULT_CALENDLY_URL = 'https://calendly.com/founders-getevidly/60min';

interface RequestData {
  sessionId: string;
  name: string;
  email: string;
  companyName: string;
  city: string;
  state: string;
}

export function DemoSchedule() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    // Load stored request data
    try {
      const stored = sessionStorage.getItem('demo_request_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        setRequestData({
          sessionId: parsed.sessionId || sessionId || '',
          name: parsed.name || '',
          email: parsed.email || '',
          companyName: parsed.companyName || '',
          city: parsed.city || '',
          state: parsed.state || '',
        });
      }
    } catch {
      // Fallback
    }
  }, [sessionId]);

  // Listen for Calendly events (in real implementation)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.event === 'calendly.event_scheduled') {
        setBooked(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const companyName = requestData?.companyName || 'your company';
  const location = requestData ? `${requestData.city}, ${requestData.state}` : '';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6FA' }}>
      {/* Header */}
      <header className="border-b border-[#1E2D4D]/10 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: NAVY }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold" style={{ color: NAVY }}>EvidLY</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {booked ? (
          /* ── Booking Confirmation ── */
          <div className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3" style={{ color: NAVY }}>
              You're Booked!
            </h1>
            <p className="text-[#1E2D4D]/70 max-w-md mx-auto mb-6">
              An EvidLY specialist will walk you through your personalized demo for{' '}
              <span className="font-semibold">{companyName}</span>.
              We'll send a calendar invite with the meeting link.
            </p>
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 max-w-md mx-auto text-left">
              <h3 className="font-semibold text-sm mb-3" style={{ color: NAVY }}>What happens next:</h3>
              <ul className="space-y-2 text-sm text-[#1E2D4D]/70">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Calendar invite sent to your email</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>We build your personalized demo using {location} jurisdiction data</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Your specialist walks you through it live — no prep needed on your end</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* ── Scheduling Page ── */
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3" style={{ color: NAVY }}>
                Almost There! Schedule Your Personalized Demo
              </h1>
            </div>

            {/* Status checks */}
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-6 mb-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-[#1E2D4D]/80">Your kitchen info has been saved</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-[#1E2D4D]/80">
                    We're preparing your personalized demo for{' '}
                    <span className="font-semibold">{companyName}</span>
                    {location && <> in <span className="font-semibold">{location}</span></>}
                  </span>
                </div>
              </div>
            </div>

            {/* Calendly Embed Area */}
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: NAVY }} />
                <h2 className="font-semibold text-sm" style={{ color: NAVY }}>
                  Pick a time to meet with an EvidLY specialist
                </h2>
              </div>
              {/* Calendly widget placeholder */}
              <div className="relative" style={{ minHeight: 500 }}>
                {/* In production, this would be the real Calendly inline widget */}
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center" style={{ minHeight: 500 }}>
                  <div className="w-16 h-16 rounded-full mb-4 flex items-center justify-center" style={{ backgroundColor: '#f0f4ff' }}>
                    <Calendar className="w-8 h-8" style={{ color: NAVY }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: NAVY }}>Calendly Scheduling Widget</h3>
                  <p className="text-sm text-[#1E2D4D]/50 max-w-sm mb-4">
                    In production, the Calendly inline widget loads here with available time slots.
                    The Calendly URL is configurable in admin settings.
                  </p>
                  <p className="text-xs text-[#1E2D4D]/30 mb-6">
                    Default URL: {DEFAULT_CALENDLY_URL}
                  </p>
                  {/* Demo button to simulate booking */}
                  <button
                    onClick={() => setBooked(true)}
                    className="px-6 py-2.5 rounded-lg text-white font-medium text-sm transition-colors"
                    style={{ backgroundColor: NAVY }}
                    onMouseEnter={e => (e.target as HTMLButtonElement).style.backgroundColor = '#2a6a8f'}
                    onMouseLeave={e => (e.target as HTMLButtonElement).style.backgroundColor = NAVY}
                  >
                    Simulate Booking (Demo Only)
                  </button>
                </div>
              </div>
            </div>

            {/* Footer note */}
            <div className="flex items-start gap-2 text-xs text-[#1E2D4D]/30 max-w-lg mx-auto">
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                After scheduling, our team will have your personalized demo ready for your call.
                No prep needed on your end.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DemoSchedule;
