import { useState, useEffect } from 'react';

interface Reminder {
  month: number;
  title: string;
  standard: string;
  benefit: string;
  action: string;
  urgency: 'reminder' | 'important' | 'critical';
}

const REMINDERS: Reminder[] = [
  { month: 1,  urgency: 'reminder',  title: 'Start the Year — Review Hood Cleaning Schedule',
    standard: 'NFPA 96 (2024) Table 12.4',
    benefit: 'A documented cleaning schedule entered in January means zero missed intervals for the year. Operators with complete schedules have stronger insurance positions entering renewal season.',
    action: 'Log your cooking type and set cleaning reminders in EvidLY Fire Safety for all 12 months.' },
  { month: 2,  urgency: 'important', title: 'Insurance Renewal Season — Is Your Documentation Ready?',
    standard: 'NFPA 96 (2024) Chapter 13',
    benefit: 'Most commercial kitchen policies renew in Q1. Carriers are increasingly requesting NFPA 96 (2024) maintenance documentation before issuing renewals. Operators with complete EvidLY records have everything ready when the broker asks.',
    action: 'Export your Fire Safety documentation report. Confirm all certificates and inspection records are current.' },
  { month: 3,  urgency: 'important', title: 'Spring Inspection Season — Self-Inspect Before They Arrive',
    standard: 'NFPA 96 (2024) Chapter 8 — Hood Systems',
    benefit: 'Health departments and fire authorities increase inspection activity in spring. A one-hour EvidLY self-inspection before the official visit consistently produces better outcomes.',
    action: 'Run the EvidLY Self-Inspection for each location. Address open items before March 31.' },
  { month: 4,  urgency: 'reminder',  title: 'Grease Removal Devices — Filter Condition Check',
    standard: 'NFPA 96 (2024) Chapter 9 — Grease Removal Devices',
    benefit: 'NFPA 96 (2024) Chapter 9 governs grease filter maintenance. Clean filters reduce duct grease load by 40–60%, directly extending the interval between required cleanings.',
    action: 'Inspect all hood filters. Document condition in EvidLY. Schedule exchange if saturated.' },
  { month: 5,  urgency: 'important', title: 'Pre-Summer Fan Check — Before Volume Increases',
    standard: 'NFPA 96 (2024) Chapter 11 — Air Movement',
    benefit: 'A marginal fan during slow season fails under summer demand. Fan failure during peak service means 1–4 days of closure to source and install a replacement.',
    action: 'Schedule fan performance inspection before June 1. Document in EvidLY Equipment.' },
  { month: 6,  urgency: 'reminder',  title: 'Mid-Year — Verify You Are on the Right Cleaning Interval',
    standard: 'NFPA 96 (2024) Table 12.4',
    benefit: 'Summer volume increases can push a kitchen into a higher-frequency cleaning tier under Table 12.4. Mid-year is the time to verify your interval still matches your actual cooking volume.',
    action: 'Review your Table 12.4 interval vs. current volume. Adjust schedule if needed. Verify with your AHJ.' },
  { month: 7,  urgency: 'reminder',  title: 'Rooftop Grease — Summer UV Accelerates Membrane Damage',
    standard: 'NFPA 96 (2024) Chapter 12 — Fire Suppression Systems',
    benefit: 'Summer UV radiation dramatically accelerates chemical degradation of TPO and EPDM roofing under accumulated grease. A mid-summer containment service prevents the compounding damage that shows up as expensive fall repairs.',
    action: 'Inspect rooftop grease containment. Schedule service if needed. Document in EvidLY.' },
  { month: 8,  urgency: 'important', title: 'Back to School — New Staff Compliance Risk',
    standard: 'NFPA 96 (2024) Chapter 13 — Procedures for the Use of the System',
    benefit: 'New seasonal hires are the #1 leading indicator of compliance gaps. EvidLY data shows checklist completion drops 15–25% in the first month with new staff. NFPA 96 (2024) Chapter 13 covers system procedures staff must know.',
    action: 'Complete fire safety training documentation in EvidLY for all new staff. Monitor checklist completion rates.' },
  { month: 9,  urgency: 'important', title: 'Fall Inspection Season — Second Peak AHJ Activity',
    standard: 'NFPA 96 (2024) Table 12.4',
    benefit: 'Fall is the second peak season for inspections. If your spring inspection was clean, fall is when the second annual visit typically occurs. Being prepared in September means documentation is current before the inspector calls.',
    action: 'Run EvidLY Self-Inspection. Export compliance report. Confirm all certificates are current.' },
  { month: 10, urgency: 'reminder',  title: 'Year-End Planning — Book Q4 Hood Cleaning Now',
    standard: 'NFPA 96 (2024) Table 12.4',
    benefit: 'November and December are the hardest months to schedule cleaning services. Operators who book in October get preferred timing and avoid schedule slippage on their Table 12.4 intervals.',
    action: 'Review Q4 cleaning schedule. Book appointments now if your interval falls in November or December.' },
  { month: 11, urgency: 'critical',  title: 'Holiday Volume — Highest Risk Period of the Year',
    standard: 'NFPA 96 (2024) Chapter 10 — Exhaust Duct Systems',
    benefit: 'November–December is peak cooking volume and the highest concentration of commercial kitchen fire incidents nationally. Operators who enter the holiday season with clean ducts, functioning fans, and current documentation significantly reduce their risk profile.',
    action: 'Confirm hood cleaning is current before November 15. Verify fire suppression is operational. Check all extinguisher dates.' },
  { month: 12, urgency: 'reminder',  title: 'Year-End Documentation — Close the Year Clean',
    standard: 'NFPA 96 (2024) Chapter 13',
    benefit: 'December is the time to ensure all 2026 fire safety documentation is complete, correctly filed, and accessible. End-of-year reports from EvidLY take 5 minutes and impress insurers, auditors, and enterprise clients.',
    action: 'Generate year-end compliance report from EvidLY. Confirm all certificates and training records are filed.' },
];

const DISMISSED_KEY = 'evidly_nfpa_reminder_dismissed';

const urgencyStyle = {
  reminder:  { border: '#334155',   bg: '#1E2D4D',   badge: '#94a3b8', badgeBg: '#1e293b',  label: 'Monthly Reminder' },
  important: { border: '#1e40af',   bg: '#1e3a5f20', badge: '#93c5fd', badgeBg: '#1e3a5f',  label: 'Important' },
  critical:  { border: '#dc2626',   bg: '#7f1d1d20', badge: '#fca5a5', badgeBg: '#7f1d1d',  label: 'Critical Period' },
};

export const NFPAReminder: React.FC = () => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const reminder = REMINDERS.find(r => r.month === currentMonth);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_KEY);
      if (stored) {
        const { month, year } = JSON.parse(stored);
        if (month === currentMonth && year === currentYear) setDismissed(true);
      }
    } catch { /* ignore */ }
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify({ month: currentMonth, year: currentYear }));
    setDismissed(true);
  };

  if (!reminder || dismissed) return null;

  const s = urgencyStyle[reminder.urgency];

  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`,
      borderLeft: `4px solid ${s.border}`, borderRadius: '10px',
      padding: '16px 18px', marginBottom: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>&#x1F525;</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>{reminder.title}</p>
              <span style={{
                background: s.badgeBg, borderRadius: '4px', padding: '1px 6px',
                fontSize: '10px', color: s.badge, fontWeight: 700, fontFamily: 'system-ui',
              }}>{s.label}</span>
            </div>
            <p style={{ color: '#64748b', fontSize: '11px', margin: '2px 0 0', fontFamily: 'system-ui' }}>
              {reminder.standard} &middot; <span style={{ color: '#475569' }}>Verify requirements with your AHJ</span>
            </p>
          </div>
        </div>
        <button onClick={dismiss} style={{
          background: 'transparent', border: 'none',
          color: '#475569', cursor: 'pointer', fontSize: '18px', padding: 0,
        }}>&times;</button>
      </div>
      <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 10px', lineHeight: 1.6, fontFamily: 'system-ui' }}>
        {reminder.benefit}
      </p>
      <div style={{
        background: '#0f172a', borderRadius: '6px', padding: '10px 12px',
        borderLeft: '3px solid #A08C5A',
      }}>
        <p style={{ color: '#A08C5A', fontSize: '11px', fontWeight: 700, margin: '0 0 3px', fontFamily: 'system-ui' }}>Action This Month</p>
        <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, fontFamily: 'system-ui' }}>{reminder.action}</p>
      </div>
    </div>
  );
};
