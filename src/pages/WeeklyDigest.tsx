import { useState, useMemo } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { generateDigestHtml, sendWeeklyDigest, type DigestData } from '../lib/sendWeeklyDigest';

/* ─── Demo data matching spec ─── */
const DEMO_DIGEST: DigestData = {
  orgName: 'Pacific Coast Dining',
  weekStart: 'Feb 3, 2026',
  weekEnd: 'Feb 9, 2026',
  foodSafetyScore: 81,
  facilitySafetyScore: 70,
  scoreTrend: 2,
  locations: [
    { name: 'Downtown Kitchen', overall: 92, trend: 3, operational: 95, equipment: 91, documentation: 89, status: 'Inspection Ready' },
    { name: 'Airport Cafe', overall: 74, trend: -2, operational: 78, equipment: 70, documentation: 72, status: 'Needs Attention' },
    { name: 'University Dining', overall: 57, trend: 4, operational: 62, equipment: 55, documentation: 52, status: 'Critical' },
  ],
  highlights: [
    'Downtown Kitchen maintained Inspection Ready status for 8 consecutive weeks',
    'University Dining improved overall score by +4 points this week',
    'Zero out-of-range temperature readings at Downtown Kitchen',
    'All closing checklists completed on time across all locations',
  ],
  concerns: [
    'Airport Cafe missed 3 temperature checks this week',
    'University Dining has 2 overdue vendor services (Fire Suppression, Grease Trap)',
    'University Dining health permit expired — requires immediate renewal',
    'Airport Cafe fire suppression inspection overdue',
  ],
  tempStats: { total: 487, onTimePercent: 98.2, outOfRange: 3, weekOverWeek: 2 },
  checklistStats: { completed: 126, required: 132, percent: 95.5, weekOverWeek: 1 },
  missedItems: [
    { item: 'Morning Temp Check', location: 'Airport Cafe', detail: 'Missed Feb 4, 5, 7' },
    { item: 'Opening Checklist', location: 'Airport Cafe', detail: 'Late Feb 4, 5' },
    { item: 'Morning Temp Check', location: 'University Dining', detail: 'Missed Feb 3, 4, 5, 6, 7' },
    { item: 'Opening Checklist', location: 'University Dining', detail: 'Missed Feb 3, 4, 5' },
    { item: 'HACCP Monitoring', location: 'University Dining', detail: 'No logs this month' },
  ],
  actionItems: [
    { priority: 'high', title: 'Renew University Dining health permit', assignee: 'James Wilson', dueDate: 'Overdue' },
    { priority: 'high', title: 'Schedule fire suppression inspection — Airport Cafe', assignee: 'Maria Lopez', dueDate: 'Feb 10' },
    { priority: 'high', title: 'Schedule fire suppression — University Dining', assignee: 'James Wilson', dueDate: 'Overdue' },
    { priority: 'medium', title: 'Request updated COI from Valley Fire Systems', assignee: 'Maria Lopez', dueDate: 'Feb 14' },
    { priority: 'low', title: 'Review closing checklist completion at Airport Cafe', assignee: 'Sarah Chen', dueDate: 'Feb 16' },
  ],
  vendorUpdates: [
    { serviceType: 'Hood Cleaning', vendorName: 'ABC Fire Protection', lastService: 'Jan 15', nextDue: 'Apr 15', status: 'current' },
    { serviceType: 'Pest Control', vendorName: 'Pacific Pest Control', lastService: 'Jan 28', nextDue: 'Feb 28', status: 'upcoming' },
    { serviceType: 'Fire Suppression', vendorName: 'Valley Fire Systems', lastService: 'Jan 20', nextDue: 'Jul 20', status: 'overdue' },
  ],
};

const SCHEDULE_OPTIONS = [
  { label: 'Monday 6:00 AM', value: 'mon-06' },
  { label: 'Monday 8:00 AM', value: 'mon-08' },
  { label: 'Monday 9:00 AM', value: 'mon-09' },
  { label: 'Sunday 6:00 PM', value: 'sun-18' },
  { label: 'Friday 5:00 PM', value: 'fri-17' },
];

function getNextDigestDate(scheduleValue: string): string {
  const now = new Date();
  const [dayStr, hourStr] = scheduleValue.split('-');
  const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const targetDay = dayMap[dayStr] ?? 1;
  const targetHour = parseInt(hourStr, 10);
  const diff = (targetDay - now.getDay() + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  next.setHours(targetHour, 0, 0, 0);
  return next.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' + next.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const CONTENT_TOGGLES_INIT = [
  { key: 'complianceScores', label: 'Compliance scores & trends', locked: true },
  { key: 'highlightsConcerns', label: 'Highlights & concerns', locked: true },
  { key: 'tempCheckDetails', label: 'Temperature check details', locked: false },
  { key: 'checklistDetails', label: 'Checklist completion details', locked: false },
  { key: 'actionItems', label: 'Action items & due dates', locked: false },
  { key: 'vendorUpdates', label: 'Vendor service updates', locked: false },
];

export function WeeklyDigest() {
  const { isDemoMode, companyName, userName } = useDemo();
  const { profile } = useAuth();

  const defaultEmail = isDemoMode ? 'james.wilson@pacificcoastdining.com' : (profile?.full_name ? '' : '');
  const orgName = isDemoMode ? companyName : (profile?.organization_id || 'Your Organization');

  const [schedule, setSchedule] = useState('mon-08');
  const [recipients, setRecipients] = useState<string[]>([defaultEmail || 'manager@company.com']);
  const [newEmail, setNewEmail] = useState('');
  const [contentToggles, setContentToggles] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    CONTENT_TOGGLES_INIT.forEach((t) => { init[t.key] = true; });
    return init;
  });
  const [showPreview, setShowPreview] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const digestData = useMemo(() => {
    const d = { ...DEMO_DIGEST };
    d.orgName = isDemoMode ? companyName : orgName;
    return d;
  }, [isDemoMode, companyName, orgName]);

  const previewHtml = useMemo(() => generateDigestHtml(digestData), [digestData]);

  const addRecipient = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (recipients.includes(email)) return;
    setRecipients([...recipients, email]);
    setNewEmail('');
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    setTestResult(null);
    if (isDemoMode) {
      await new Promise((r) => setTimeout(r, 1500));
      setTestResult({ type: 'success', message: `Test digest sent to ${recipients[0]}` });
      setSendingTest(false);
      return;
    }
    const result = await sendWeeklyDigest([recipients[0]], digestData);
    if (result.success) {
      setTestResult({ type: 'success', message: `Test digest sent to ${recipients[0]}` });
    } else {
      setTestResult({ type: 'error', message: result.error || 'Failed to send' });
    }
    setSendingTest(false);
  };

  const nextDigest = getNextDigestDate(schedule);

  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e4d6b', margin: 0 }}>Weekly Digest</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0' }}>
            Automated weekly compliance summary delivered to your inbox
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              padding: '10px 18px', borderRadius: '8px', border: '1px solid #d1d5db',
              background: '#fff', color: '#374151', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {showPreview ? '👁 Hide Preview' : '👁 Show Preview'}
          </button>
          <button
            onClick={handleSendTest}
            disabled={sendingTest || recipients.length === 0}
            style={{
              padding: '10px 18px', borderRadius: '8px', border: 'none',
              background: sendingTest ? '#3D5068' : '#1e4d6b', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: sendingTest ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {sendingTest ? 'Sending...' : '📧 Send Test Email'}
          </button>
        </div>
      </div>

      {testResult && (
        <div
          style={{
            marginBottom: '16px', padding: '12px 16px', borderRadius: '8px',
            background: testResult.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${testResult.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: testResult.type === 'success' ? '#15803d' : '#dc2626',
            fontSize: '13px', fontWeight: 500,
          }}
        >
          {testResult.type === 'success' ? '✓' : '✗'} {testResult.message}
        </div>
      )}

      {/* TWO-PANEL LAYOUT */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

        {/* LEFT PANEL — Settings */}
        <div style={{ width: '340px', flexShrink: 0 }}>
          {/* Schedule */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e4d6b', marginBottom: '12px' }}>Schedule</div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '6px' }}>
              Delivery time
            </label>
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
                fontSize: '13px', color: '#374151', background: '#fff', outline: 'none',
              }}
            >
              {SCHEDULE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div style={{ marginTop: '10px', background: '#eef4f8', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Next digest</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e4d6b', marginTop: '2px' }}>{nextDigest}</div>
            </div>
          </div>

          {/* Recipients */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e4d6b', marginBottom: '12px' }}>Recipients</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRecipient(); } }}
                placeholder="Add email address"
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
                  fontSize: '13px', outline: 'none',
                }}
              />
              <button
                onClick={addRecipient}
                style={{
                  padding: '9px 14px', borderRadius: '8px', border: 'none',
                  background: '#1e4d6b', color: '#fff', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                Add
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recipients.map((email) => (
                <div key={email} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb',
                }}>
                  <span style={{ fontSize: '13px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                    {email}
                  </span>
                  <button
                    onClick={() => removeRecipient(email)}
                    style={{
                      background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer',
                      fontSize: '16px', lineHeight: 1, padding: '0 4px', fontWeight: 700,
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
              {recipients.length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #3D5068)', fontStyle: 'italic', padding: '8px 0' }}>
                  No recipients added
                </div>
              )}
            </div>
          </div>

          {/* Content Toggles */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e4d6b', marginBottom: '12px' }}>Content</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {CONTENT_TOGGLES_INIT.map((toggle) => (
                <label key={toggle.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: toggle.locked ? 'default' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={contentToggles[toggle.key] ?? true}
                    disabled={toggle.locked}
                    onChange={(e) => {
                      if (toggle.locked) return;
                      setContentToggles((prev) => ({ ...prev, [toggle.key]: e.target.checked }));
                    }}
                    style={{
                      width: '16px', height: '16px', accentColor: '#1e4d6b',
                      cursor: toggle.locked ? 'default' : 'pointer',
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    {toggle.label}
                    {toggle.locked && (
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary, #3D5068)', marginLeft: '6px', fontWeight: 600 }}>
                        ALWAYS ON
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Card */}
          <div style={{
            borderRadius: '12px', padding: '20px',
            background: recipients.length > 0 ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${recipients.length > 0 ? '#bbf7d0' : '#fde68a'}`,
          }}>
            {recipients.length > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#15803d' }}>Digest Active</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Delivering every {SCHEDULE_OPTIONS.find(o => o.value === schedule)?.label} to {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}.
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #3D5068)', marginTop: '6px' }}>
                  Last sent: {isDemoMode ? 'Feb 3, 2026 at 8:00 AM' : 'Not yet sent'}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#d4af37' }} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#92400e' }}>Setup Required</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Add at least one recipient to activate the weekly digest.
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Email Preview */}
        {showPreview && (
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Fake email client header */}
            <div style={{
              background: '#fff', borderRadius: '12px 12px 0 0', border: '1px solid #e5e7eb',
              borderBottom: 'none', padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary, #3D5068)', marginLeft: '8px' }}>Email Preview</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, display: 'inline-block', width: '60px' }}>From:</span>
                  EvidLY Digest &lt;digest@getevidly.com&gt;
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, display: 'inline-block', width: '60px' }}>To:</span>
                  {recipients.length > 0 ? recipients.join(', ') : '(no recipients)'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  <span style={{ fontWeight: 600, display: 'inline-block', width: '60px' }}>Subject:</span>
                  Weekly Compliance Digest — {digestData.orgName} — {digestData.weekStart} to {digestData.weekEnd}
                </div>
              </div>
            </div>

            {/* Rendered email */}
            <div style={{
              background: '#f3f4f6', borderRadius: '0 0 12px 12px', border: '1px solid #e5e7eb',
              padding: '16px', overflow: 'auto', maxHeight: 'calc(100vh - 240px)',
            }}>
              <div
                dangerouslySetInnerHTML={{ __html: previewHtml }}
                style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WeeklyDigest;
