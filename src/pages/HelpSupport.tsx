import { useState } from 'react';
import { toast } from 'sonner';
import { Breadcrumb } from '../components/Breadcrumb';

// ── Styles ───────────────────────────────────────────────────────
const F = { fontFamily: "'DM Sans', sans-serif" };
const cardStyle = { backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', ...F };
const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
  fontSize: '14px', color: '#374151', outline: 'none', ...F, boxSizing: 'border-box' as const,
};
const labelStyle = { fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', display: 'block', ...F };
const btnPrimary = {
  padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#1b4965',
  color: 'white', fontWeight: 700, fontSize: '14px', cursor: 'pointer', ...F,
};

// ── Knowledge Base Data ──────────────────────────────────────────
interface Article { id: string; title: string; views: number; helpful: number; body: string; }
interface FaqCategory { id: string; name: string; icon: string; articles: Article[]; }

const FAQ_CATEGORIES: FaqCategory[] = [
  { id: 'getting-started', name: 'Getting Started', icon: '🚀', articles: [
    { id: 'gs-1', title: 'How do I set up my first location?', views: 1842, helpful: 94, body: 'Navigate to Settings > Locations and click "Add Location". Enter the name, address, and operating hours. You can configure shifts and assign team members from the location detail page.' },
    { id: 'gs-2', title: 'Inviting team members to your account', views: 1256, helpful: 91, body: 'Go to Teams > Invite Member. Enter their email and select a role (Executive, Management, Kitchen Staff, or Facilities). They will receive an email invitation to join your organization.' },
    { id: 'gs-3', title: 'Understanding user roles and permissions', views: 987, helpful: 88, body: 'EvidLY has four roles: Executive (full access), Management (operational control), Kitchen Staff (daily operations), and Facilities (maintenance and vendor tasks). Each role sees only relevant modules.' },
    { id: 'gs-4', title: 'Setting up your compliance profile', views: 762, helpful: 92, body: 'Your compliance profile is configured during onboarding based on your industry type. You can customize thresholds, required documents, and inspection schedules in Settings > Compliance.' },
  ]},
  { id: 'temp-logging', name: 'Temperature Logging', icon: '🌡️', articles: [
    { id: 'tl-1', title: 'Recording daily temperature checks', views: 2341, helpful: 96, body: 'Navigate to Temperatures and select your location. Tap "New Check" to record temperatures for each equipment unit. Enter the reading, and the system will flag any out-of-range values automatically.' },
    { id: 'tl-2', title: 'What to do when a temperature is out of range', views: 1876, helpful: 93, body: 'When a temperature reading is flagged, EvidLY automatically creates a corrective action. Document what you did to resolve the issue, take a photo if needed, and mark the action as complete.' },
    { id: 'tl-3', title: 'Setting up temperature equipment and thresholds', views: 1124, helpful: 89, body: 'Go to Settings > Equipment to add coolers, freezers, and hot-hold units. Set custom temperature ranges for each unit type. Default thresholds follow FDA Food Code guidelines.' },
  ]},
  { id: 'checklists', name: 'Checklists & Tasks', icon: '☑️', articles: [
    { id: 'cl-1', title: 'Creating and assigning daily checklists', views: 1654, helpful: 91, body: 'Go to Checklists > Templates to create reusable checklists. Assign them to locations, shifts, and roles. Team members will see their assigned checklists on their dashboard each day.' },
    { id: 'cl-2', title: 'Customizing checklist templates', views: 1203, helpful: 87, body: 'Edit any template to add, remove, or reorder items. You can add photo requirements, notes fields, and conditional items that appear based on previous answers.' },
    { id: 'cl-3', title: 'Viewing checklist completion history', views: 945, helpful: 90, body: 'The Checklists page shows completion rates by day, location, and team member. Click any completed checklist to see the full submission with timestamps and any attached photos.' },
  ]},
  { id: 'compliance', name: 'Compliance & Inspections', icon: '🛡️', articles: [
    { id: 'co-1', title: 'How your compliance status is determined', views: 2156, helpful: 95, body: 'Your compliance status is based on two pillars: Food Safety (temp logs, checklists, HACCP) and Fire Safety (hood cleaning, suppression systems, extinguishers). Each jurisdiction uses its own verified methodology.' },
    { id: 'co-2', title: 'Preparing for a health inspection', views: 1789, helpful: 97, body: 'Use the Compliance dashboard to see your readiness score. Review any missing documents, overdue corrective actions, and incomplete checklists. The system flags critical items to address first.' },
    { id: 'co-3', title: 'Understanding corrective actions', views: 1432, helpful: 92, body: 'Corrective actions are created when issues are identified — out-of-range temps, failed checklist items, or inspection findings. Each action has a due date, assignee, and required documentation.' },
    { id: 'co-4', title: 'HACCP plan management', views: 876, helpful: 88, body: 'Navigate to HACCP to view and manage your hazard analysis and critical control points. EvidLY provides industry-specific templates and tracks your monitoring procedures automatically.' },
  ]},
  { id: 'vendors', name: 'Vendor Services', icon: '🚚', articles: [
    { id: 'vs-1', title: 'Adding and managing vendors', views: 1098, helpful: 90, body: 'Go to Vendor Services > Add Vendor. Enter the vendor company name, contact info, and service type. You can track service schedules, upload certificates, and manage document requests.' },
    { id: 'vs-2', title: 'Requesting documents from vendors', views: 876, helpful: 86, body: 'From any vendor profile, click "Request Document" and select the document type. The vendor receives an email with a secure upload link. You are notified when they submit.' },
    { id: 'vs-3', title: 'Vendor QR passport for on-site visits', views: 654, helpful: 91, body: 'Each vendor can receive a unique QR code for site visits. When scanned, it verifies their credentials, displays required documents, and logs the visit in your compliance records.' },
  ]},
  { id: 'billing', name: 'Account & Billing', icon: '💳', articles: [
    { id: 'ab-1', title: 'Managing your subscription plan', views: 1543, helpful: 89, body: 'Go to Settings > Billing to view your current plan, usage, and payment history. You can upgrade, downgrade, or add locations from this page. Changes take effect at your next billing cycle.' },
    { id: 'ab-2', title: 'Adding or removing locations', views: 1201, helpful: 87, body: 'Navigate to Settings > Locations to add new locations to your account. Each location may affect your billing. Removing a location archives its data but stops billing for it.' },
    { id: 'ab-3', title: 'Updating payment information', views: 876, helpful: 93, body: 'Go to Settings > Billing > Payment Method to update your credit card or bank account. All payment information is encrypted and processed securely through our payment provider.' },
  ]},
];

const QUICK_HELP = [
  { id: 'qh-1', title: 'Quick Start Guide', icon: '🚀', desc: 'Get up and running in under 10 minutes', color: '#1b4965' },
  { id: 'qh-2', title: 'Daily Temp Checks', icon: '🌡️', desc: 'Step-by-step temperature logging walkthrough', color: '#dc2626' },
  { id: 'qh-3', title: 'Understanding Scores', icon: '🛡️', desc: 'How your compliance score is calculated', color: '#16a34a' },
];

// ── Demo Tickets ─────────────────────────────────────────────────
interface Ticket { id: string; subject: string; category: string; status: 'open' | 'awaiting' | 'solved'; priority: 'low' | 'normal' | 'high' | 'urgent'; created: string; }

const DEMO_TICKETS: Ticket[] = [
  { id: 'TKT-4821', subject: 'Temperature sensor showing incorrect readings', category: 'Technical Support', status: 'open', priority: 'high', created: '2026-02-07' },
  { id: 'TKT-4756', subject: 'How to export compliance report as PDF', category: 'Feature Request', status: 'awaiting', priority: 'normal', created: '2026-02-03' },
  { id: 'TKT-4698', subject: 'Add second location to our account', category: 'Account Access', status: 'solved', priority: 'normal', created: '2026-01-28' },
  { id: 'TKT-4612', subject: 'Billing question about annual plan discount', category: 'Billing Question', status: 'solved', priority: 'low', created: '2026-01-15' },
];

const CATEGORIES = ['Bug Report', 'Feature Request', 'Billing Question', 'Account Access', 'Compliance Question', 'Technical Support', 'Other'];
const PRIORITIES: { id: string; label: string; color: string; desc: string }[] = [
  { id: 'low', label: 'Low', color: '#6b7280', desc: 'General question, no rush' },
  { id: 'normal', label: 'Normal', color: '#2563eb', desc: 'Standard request' },
  { id: 'high', label: 'High', color: '#d97706', desc: 'Impacting daily operations' },
  { id: 'urgent', label: 'Urgent', color: '#dc2626', desc: 'Critical — blocking compliance' },
];

// ── Component ────────────────────────────────────────────────────
export function HelpSupport() {
  const [activeTab, setActiveTab] = useState<'kb' | 'ticket' | 'my-tickets' | 'contact'>('kb');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Ticket form
  const [ticketCat, setTicketCat] = useState('');
  const [ticketPriority, setTicketPriority] = useState('normal');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  const tabs = [
    { id: 'kb' as const, label: 'Knowledge Base', icon: '📚' },
    { id: 'ticket' as const, label: 'Submit Ticket', icon: '🎫' },
    { id: 'my-tickets' as const, label: 'My Tickets', icon: '📋' },
    { id: 'contact' as const, label: 'Contact Us', icon: '📞' },
  ];

  // Search filter
  const allArticles = FAQ_CATEGORIES.flatMap(c => c.articles.map(a => ({ ...a, category: c.name })));
  const searchResults = searchQuery.trim().length > 1
    ? allArticles.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.body.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleSubmitTicket = async () => {
    if (!ticketCat || !ticketSubject.trim() || !ticketDesc.trim()) {
      toast.warning('Please fill in all required fields');
      return;
    }
    const num = `TKT-${5000 + Math.floor(Math.random() * 999)}`;
    try {
      await fetch('/api/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: ticketCat, priority: ticketPriority, subject: ticketSubject, description: ticketDesc }),
      });
    } catch { /* silent in demo */ }
    setTicketNumber(num);
    setTicketSubmitted(true);
  };

  const resetTicketForm = () => {
    setTicketCat('');
    setTicketPriority('normal');
    setTicketSubject('');
    setTicketDesc('');
    setTicketSubmitted(false);
    setTicketNumber('');
  };

  const statusBadge = (status: Ticket['status']) => {
    const map = { open: { bg: '#dbeafe', color: '#1d4ed8', label: 'Open' }, awaiting: { bg: '#fef3c7', color: '#92400e', label: 'Awaiting Reply' }, solved: { bg: '#dcfce7', color: '#166534', label: 'Solved' } };
    const s = map[status];
    return <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', backgroundColor: s.bg, color: s.color, ...F }}>{s.label}</span>;
  };

  const priorityDot = (p: string) => {
    const colors: Record<string, string> = { low: '#6b7280', normal: '#2563eb', high: '#d97706', urgent: '#dc2626' };
    return <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors[p] || '#6b7280' }} />;
  };

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Help & Support' }]} />

      <div className="p-4 sm:p-6" style={{ maxWidth: '1200px', margin: '0 auto', ...F }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1b4965', margin: '0 0 4px 0', ...F }}>Help & Support</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, ...F }}>Find answers, submit tickets, and get in touch with our team</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '24px', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedArticle(null); }}
              style={{
                padding: '12px 20px', fontSize: '14px', fontWeight: 600, border: 'none',
                backgroundColor: 'transparent', cursor: 'pointer', ...F, whiteSpace: 'nowrap', minHeight: '44px',
                color: activeTab === tab.id ? '#1b4965' : '#6b7280',
                borderBottom: activeTab === tab.id ? '2px solid #d4af37' : '2px solid transparent',
                marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'kb' && renderKnowledgeBase()}
        {activeTab === 'ticket' && renderSubmitTicket()}
        {activeTab === 'my-tickets' && renderMyTickets()}
        {activeTab === 'contact' && renderContact()}

        {/* AI Advisor teaser */}
        <div style={{ marginTop: '32px', padding: '16px 20px', backgroundColor: '#f5f3ff', border: '1px solid #e0d4fc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🤖</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#4c1d95', ...F }}>AI Advisor</div>
              <div style={{ fontSize: '12px', color: '#6b7280', ...F }}>Get instant AI-powered answers to your food safety and compliance questions</div>
            </div>
          </div>
          <a href="/ai-advisor" style={{ fontSize: '13px', fontWeight: 700, color: '#fff', backgroundColor: '#6366f1', padding: '8px 20px', borderRadius: '8px', textDecoration: 'none', letterSpacing: '0.3px' }}>Try AI Advisor →</a>
        </div>
      </div>
    </>
  );

  // ── Knowledge Base ─────────────────────────────────────────────
  function renderKnowledgeBase() {
    if (selectedArticle) {
      return (
        <div>
          <button onClick={() => setSelectedArticle(null)} style={{ fontSize: '13px', color: '#1b4965', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', marginBottom: '16px', ...F, display: 'flex', alignItems: 'center', gap: '4px' }}>
            ← Back to Knowledge Base
          </button>
          <div style={cardStyle}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1b4965', margin: '0 0 8px 0', ...F }}>{selectedArticle.title}</h2>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280', ...F }}>{selectedArticle.views.toLocaleString()} views</span>
              <span style={{ fontSize: '12px', color: '#16a34a', ...F }}>{selectedArticle.helpful}% found helpful</span>
            </div>
            <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7, margin: 0, ...F }}>{selectedArticle.body}</p>
            <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', ...F }}>Was this article helpful?</div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => toast.success('Thanks for your feedback')} style={{ padding: '6px 20px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: 'white', fontSize: '13px', cursor: 'pointer', ...F, minHeight: '44px' }}>👍 Yes</button>
                <button onClick={() => { setActiveTab('ticket'); setSelectedArticle(null); }} style={{ padding: '6px 20px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: 'white', fontSize: '13px', cursor: 'pointer', ...F, minHeight: '44px' }}>👎 No — Contact Support</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search help articles..."
            style={{ ...inputStyle, padding: '14px 14px 14px 42px', fontSize: '15px', border: '2px solid #e5e7eb', borderRadius: '12px' }}
          />
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 10, marginTop: '4px', maxHeight: '300px', overflowY: 'auto' }}>
              {searchResults.map(a => (
                <div key={a.id} onClick={() => { setSelectedArticle(a); setSearchQuery(''); }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '13px', color: '#374151', ...F }}>
                  <div style={{ fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{a.category} · {a.views} views</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Help */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {QUICK_HELP.map(qh => (
            <div key={qh.id} onClick={() => {
              const article = allArticles.find(a => a.title.toLowerCase().includes(qh.title.toLowerCase().split(' ')[0]));
              if (article) setSelectedArticle(article);
            }} style={{ ...cardStyle, cursor: 'pointer', borderLeft: `4px solid ${qh.color}`, transition: 'box-shadow 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px' }}>{qh.icon}</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1b4965', ...F }}>{qh.title}</div>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', ...F }}>{qh.desc}</div>
            </div>
          ))}
        </div>

        {/* FAQ Categories */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1b4965', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0', ...F }}>FAQ Categories</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FAQ_CATEGORIES.map(cat => (
              <div key={cat.id} style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', ...F }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1b4965' }}>{cat.name}</span>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>{cat.articles.length} articles</span>
                  </div>
                  <span style={{ fontSize: '16px', color: '#6b7280', transform: expandedCat === cat.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
                </div>
                {expandedCat === cat.id && (
                  <div style={{ borderTop: '1px solid #f3f4f6' }}>
                    {cat.articles.map(article => (
                      <div
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 12px 48px', cursor: 'pointer', borderBottom: '1px solid #f9fafb', ...F }}
                      >
                        <div style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{article.title}</div>
                        <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{article.views.toLocaleString()} views</span>
                          <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>{article.helpful}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Submit Ticket ──────────────────────────────────────────────
  function renderSubmitTicket() {
    if (ticketSubmitted) {
      return (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1b4965', margin: '0 0 8px 0', ...F }}>Ticket Submitted!</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0', ...F }}>Your ticket number is</p>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#d4af37', marginBottom: '24px', ...F }}>{ticketNumber}</div>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px', ...F }}>We typically respond within 4 business hours. Check the "My Tickets" tab for updates.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={resetTicketForm} style={{ ...btnPrimary, minHeight: '44px' }}>Submit Another</button>
            <button onClick={() => setActiveTab('my-tickets')} style={{ ...btnPrimary, backgroundColor: 'white', color: '#1b4965', border: '2px solid #e5e7eb', minHeight: '44px' }}>View My Tickets</button>
          </div>
        </div>
      );
    }

    return (
      <div style={cardStyle}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1b4965', margin: '0 0 20px 0', ...F }}>Submit a Support Ticket</h2>

        {/* Category */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Category *</label>
          <select value={ticketCat} onChange={e => setTicketCat(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' as const }}>
            <option value="">Select a category...</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Priority */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Priority</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
            {PRIORITIES.map(p => (
              <div
                key={p.id}
                onClick={() => setTicketPriority(p.id)}
                style={{
                  padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                  border: ticketPriority === p.id ? `2px solid ${p.color}` : '2px solid #e5e7eb',
                  backgroundColor: ticketPriority === p.id ? `${p.color}08` : 'white',
                  ...F,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: p.color }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: ticketPriority === p.id ? p.color : '#374151' }}>{p.label}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', paddingLeft: '18px' }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Subject *</label>
          <input type="text" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} placeholder="Brief summary of your issue" style={inputStyle} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Description *</label>
          <textarea value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} placeholder="Describe your issue in detail. Include steps to reproduce if applicable..." rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* File upload */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Attachments (optional)</label>
          <div style={{ border: '2px dashed #e5e7eb', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer' }} onClick={() => toast.info('File upload available in production')}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>📎</div>
            <div style={{ fontSize: '13px', color: '#6b7280', ...F }}>Click to attach screenshots or files</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', ...F }}>PNG, JPG, PDF up to 10MB</div>
          </div>
        </div>

        <button onClick={handleSubmitTicket} style={{ ...btnPrimary, width: '100%', padding: '12px', minHeight: '44px' }}>Submit Ticket</button>
      </div>
    );
  }

  // ── My Tickets ─────────────────────────────────────────────────
  function renderMyTickets() {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1b4965', margin: 0, ...F }}>My Support Tickets</h2>
          <button onClick={() => { setActiveTab('ticket'); resetTicketForm(); }} style={{ ...btnPrimary, minHeight: '44px' }}>+ New Ticket</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', minWidth: '600px', ...F }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Ticket ID', 'Subject', 'Category', 'Status', 'Priority', 'Created'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_TICKETS.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700, color: '#1b4965', ...F }}>{t.id}</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', color: '#374151', ...F }}>{t.subject}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6b7280', ...F }}>{t.category}</td>
                  <td style={{ padding: '12px 14px' }}>{statusBadge(t.status)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {priorityDot(t.priority)}
                      <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize', ...F }}>{t.priority}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6b7280', ...F }}>{t.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Contact Us ─────────────────────────────────────────────────
  function renderContact() {
    const openChat = () => {
      try { (window as any).zE?.('messenger', 'open'); } catch { toast.info('Live Chat (Demo)'); }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Live Chat */}
          <div style={cardStyle}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>💬</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1b4965', marginBottom: '4px', ...F }}>Live Chat</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', ...F }}>Chat with our support team in real-time during business hours.</div>
            <button onClick={openChat} style={{ ...btnPrimary, width: '100%', minHeight: '44px' }}>Start Chat</button>
          </div>

          {/* Email */}
          <div style={cardStyle}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>📧</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1b4965', marginBottom: '4px', ...F }}>Email Support</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', ...F }}>Send us an email and we will respond within 4 business hours.</div>
            <a href="mailto:support@getevidly.com" style={{ ...btnPrimary, display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%', boxSizing: 'border-box', minHeight: '44px' }}>support@getevidly.com</a>
          </div>

          {/* Phone */}
          <div style={cardStyle}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>📞</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1b4965', marginBottom: '4px', ...F }}>Phone Support</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px', ...F }}>(559) 555-0142</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px', ...F }}>Mon — Fri, 9:00 AM — 5:00 PM PST</div>
            <a href="tel:+15595550142" style={{ ...btnPrimary, display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%', boxSizing: 'border-box', minHeight: '44px' }}>Call Now</a>
          </div>

          {/* Schedule */}
          <div style={cardStyle}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>📅</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1b4965', marginBottom: '4px', ...F }}>Schedule a Call</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', ...F }}>Book a 15-minute call with our support team at your convenience.</div>
            <button onClick={() => toast.info('Book Time (Demo)')} style={{ ...btnPrimary, width: '100%', minHeight: '44px' }}>Book Time</button>
          </div>
        </div>

        {/* Emergency */}
        <div style={{ padding: '16px 20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🚨</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b', ...F }}>Food Safety Emergency?</div>
              <div style={{ fontSize: '12px', color: '#b91c1c', ...F }}>If you have an active food safety emergency requiring immediate assistance, call our emergency line now.</div>
            </div>
          </div>
          <a href="tel:+15595550142" style={{ ...btnPrimary, backgroundColor: '#dc2626', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', minHeight: '44px' }}>📞 Call Now</a>
        </div>
      </div>
    );
  }
}

export default HelpSupport;
