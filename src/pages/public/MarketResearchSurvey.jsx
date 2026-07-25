/**
 * MarketResearchSurvey — public cold-prospect survey page.
 *
 * 3 sections, 10 questions, save-per-section via the survey-response
 * edge function.  No login required.  Reached from cold email or /join.
 *
 * Route: /survey  (optional ?t=PROSPECT_TOKEN)
 */
import { useState, useEffect, useCallback } from 'react';

/* ── EvidLY design tokens ─────────────────────────────────────── */
const NAVY      = '#1E2D4D';
const INK       = '#26303F';
const EMBER     = '#B24A2E';
const EMBER_HOT = '#8F3A22';
const MUTED     = '#66707D';
const CREAM     = '#FAF7F0';
const LIGHT     = '#F4F1EA';
const LINE      = '#E7E0D2';
const PAPER     = '#FFFDF8';
const SUCCESS   = '#4B7A57';

const DISPLAY = 'Fraunces, Georgia, serif';
const BODY    = 'Plus Jakarta Sans, system-ui, sans-serif';

/* ── Edge function helper ─────────────────────────────────────── */
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callEdge(payload) {
  const res = await fetch(`${SUPA_URL}/functions/v1/survey-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPA_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/* ── Question definitions ─────────────────────────────────────── */
const SEGMENTS = [
  'Independent restaurant',
  'Multi-unit group',
  'Hotel / resort / venue',
  'Healthcare / senior',
  'School / university',
  'Grocery / casino / other',
];

const KITCHEN_COUNTS = ['1', '2-5', '6-20', '21+'];

const ROLES = [
  'Owner / operator',
  'Kitchen manager',
  'Facilities',
  'EHS / risk',
  'Other',
];

const RECORD_LOCATIONS = [
  'Binder / folder',
  'Shared drive',
  'Email attachments',
  'Vendor sends to us',
  'Our heads',
  'Dedicated software',
];

const DUE_DISCOVERY = [
  'Calendar / reminder',
  'Vendor tells us',
  'We find out when it\'s late',
  'Manager just knows',
];

const HARDEST_PARTS = [
  'Chasing vendors for paperwork',
  'Finding a document when someone asks',
  'Knowing what\'s due and when',
  'Vendor insurance and licenses',
  'Keeping daily temp logs complete',
  'Proving it to an inspector',
];

const ASKED_BY = [
  'Health inspector',
  'Fire marshal',
  'Insurance adjuster',
  'Attorney',
  'Franchisor / corporate',
  'Landlord',
];

const WOULD_PAY = [
  'Everything in one place, retrievable',
  'Warnings before anything lapses',
  'Vendors send documents directly',
  'Proof an inspector or adjuster accepts',
  'Daily logs captured without paper',
];

/* ── Chip component ───────────────────────────────────────────── */
function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '8px 16px',
        borderRadius: 8,
        border: `1.5px solid ${selected ? EMBER : LINE}`,
        backgroundColor: selected ? '#F6E9E3' : PAPER,
        color: selected ? EMBER_HOT : INK,
        fontSize: 13,
        fontWeight: selected ? 700 : 500,
        fontFamily: BODY,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

/* ── Text input ───────────────────────────────────────────────── */
function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 4, fontFamily: BODY }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 14px',
          border: `1.5px solid ${LINE}`,
          borderRadius: 8,
          fontSize: 14,
          fontFamily: BODY,
          color: INK,
          backgroundColor: '#fff',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </label>
  );
}

/* ── Question wrapper ─────────────────────────────────────────── */
function Q({ num, label, hint, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4, fontFamily: BODY }}>
        Q{num}. {label}
      </div>
      {hint && (
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>{hint}</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Progress bar ─────────────────────────────────────────────── */
function Progress({ section }) {
  const pct = section === 'done' ? 100 : Math.round((section / 3) * 100);
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          {section === 'done' ? 'Complete' : `Section ${section} of 3`}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, backgroundColor: LIGHT }}>
        <div style={{ height: '100%', borderRadius: 3, backgroundColor: EMBER, width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

/* ── Completion screen ────────────────────────────────────────── */
function CompletionScreen({ county }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', backgroundColor: '#E7EDE7',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
      }}>
        <span style={{ fontSize: 28, color: SUCCESS }}>✓</span>
      </div>
      <h2 style={{ fontSize: 26, fontWeight: 600, color: NAVY, fontFamily: DISPLAY, marginBottom: 8 }}>
        Thank you
      </h2>
      <p style={{ fontSize: 14, color: MUTED, maxWidth: 440, margin: '0 auto 32px', lineHeight: 1.6 }}>
        Your responses help us build the compliance platform commercial kitchens actually need.
        {county && ` We've noted your operation is in ${county} County.`}
      </p>

      <a
        href="https://calendly.com/founders-getevidly/founders"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '14px 28px', borderRadius: 8,
          backgroundColor: NAVY, color: '#fff',
          fontSize: 14, fontWeight: 700, fontFamily: BODY,
          textDecoration: 'none',
        }}
      >
        Schedule a Meeting
      </a>
      <p style={{ fontSize: 12, color: MUTED, marginTop: 12 }}>
        15 min with an EvidLY founder — no pitch, just a walkthrough of what we're building.
      </p>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */
export default function MarketResearchSurvey() {
  const [section, setSection] = useState(1);
  const [responseId, setResponseId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [counties, setCounties] = useState([]);
  const [completedCounty, setCompletedCounty] = useState(null);

  // Answers state — flat keys across all sections
  const [a, setA] = useState({
    org_name: '', contact_name: '', contact_email: '',
    segment: '', kitchen_count: '', county_id: '', role: '',
    record_locations: [], due_discovery: '', hardest_parts: [], asked_by: [],
    would_pay_for: '', open_answer: '',
  });

  const prospectToken = new URLSearchParams(window.location.search).get('t');

  // Fetch county list on mount
  useEffect(() => {
    callEdge({ action: 'counties' }).then((r) => {
      if (r.counties) setCounties(r.counties);
    }).catch(() => {});
  }, []);

  const set = useCallback((key, val) => {
    setA((prev) => ({ ...prev, [key]: val }));
  }, []);

  const toggleMulti = useCallback((key, val) => {
    setA((prev) => {
      const arr = prev[key] || [];
      return {
        ...prev,
        [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
      };
    });
  }, []);

  async function handleNext() {
    setSaving(true);
    try {
      if (section === 1 && !responseId) {
        const startRes = await callEdge({ action: 'start', prospect_token: prospectToken });
        if (startRes.response_id) {
          setResponseId(startRes.response_id);
          await callEdge({ action: 'save-section', response_id: startRes.response_id, section: 1, answers: a });
        }
      } else if (responseId) {
        await callEdge({ action: 'save-section', response_id: responseId, section, answers: a });
      }
      setSection((s) => s + 1);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      if (responseId) {
        await callEdge({ action: 'save-section', response_id: responseId, section: 3, answers: a });
        const result = await callEdge({ action: 'complete', response_id: responseId });
        setCompletedCounty(result.county);
      }
      setSection('done');
    } finally {
      setSaving(false);
    }
  }

  /* ── render: completion ──────────────────────────────────── */
  if (section === 'done') {
    return (
      <Shell>
        <Progress section="done" />
        <CompletionScreen county={completedCounty} />
      </Shell>
    );
  }

  /* ── render: sections ───────────────────────────────────── */
  return (
    <Shell>
      <Progress section={section} />

      {section === 1 && (
        <Section title="About your operation" sub="4 questions — helps us understand who we're talking to">
          <Field label="Organization name" value={a.org_name} onChange={(v) => set('org_name', v)} placeholder="e.g. Pacific Restaurant Group" />
          <Field label="Your name" value={a.contact_name} onChange={(v) => set('contact_name', v)} placeholder="First Last" />
          <Field label="Email" value={a.contact_email} onChange={(v) => set('contact_email', v)} type="email" placeholder="you@company.com" />

          <Q num={1} label="What type of operation do you run?">
            {SEGMENTS.map((s) => <Chip key={s} label={s} selected={a.segment === s} onClick={() => set('segment', s)} />)}
          </Q>
          <Q num={2} label="How many kitchens?">
            {KITCHEN_COUNTS.map((k) => <Chip key={k} label={k} selected={a.kitchen_count === k} onClick={() => set('kitchen_count', k)} />)}
          </Q>
          <Q num={3} label="Primary county">
            <select
              value={a.county_id}
              onChange={(e) => set('county_id', e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', border: `1.5px solid ${LINE}`,
                borderRadius: 8, fontSize: 14, fontFamily: BODY, color: a.county_id ? INK : MUTED,
                backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box',
              }}
            >
              <option value="">Select a county…</option>
              {counties.map((c) => <option key={c.id} value={c.id}>{c.county}</option>)}
            </select>
          </Q>
          <Q num={4} label="Your role">
            {ROLES.map((r) => <Chip key={r} label={r} selected={a.role === r} onClick={() => set('role', r)} />)}
          </Q>
        </Section>
      )}

      {section === 2 && (
        <Section title="How you manage compliance today" sub="4 questions — where the work lives now">
          <Q num={5} label="Where do you keep compliance records?" hint="Select all that apply">
            {RECORD_LOCATIONS.map((r) => <Chip key={r} label={r} selected={(a.record_locations || []).includes(r)} onClick={() => toggleMulti('record_locations', r)} />)}
          </Q>
          <Q num={6} label="How do you discover what's coming due?">
            {DUE_DISCOVERY.map((d) => <Chip key={d} label={d} selected={a.due_discovery === d} onClick={() => set('due_discovery', d)} />)}
          </Q>
          <Q num={7} label="What's the hardest part?" hint="Select all that apply">
            {HARDEST_PARTS.map((h) => <Chip key={h} label={h} selected={(a.hardest_parts || []).includes(h)} onClick={() => toggleMulti('hardest_parts', h)} />)}
          </Q>
          <Q num={8} label="Have you ever been asked for records by…?" hint="Select all that apply">
            {ASKED_BY.map((ab) => <Chip key={ab} label={ab} selected={(a.asked_by || []).includes(ab)} onClick={() => toggleMulti('asked_by', ab)} />)}
          </Q>
        </Section>
      )}

      {section === 3 && (
        <Section title="What would help" sub="2 questions — what you'd actually pay for">
          <Q num={9} label="If you could make one compliance headache disappear, which one?">
            {WOULD_PAY.map((w) => <Chip key={w} label={w} selected={a.would_pay_for === w} onClick={() => set('would_pay_for', w)} />)}
          </Q>
          <Q num={10} label="Anything else we should know?">
            <textarea
              value={a.open_answer}
              onChange={(e) => set('open_answer', e.target.value)}
              placeholder="Optional — tell us what matters most"
              rows={4}
              style={{
                width: '100%', padding: '10px 14px', border: `1.5px solid ${LINE}`,
                borderRadius: 8, fontSize: 14, fontFamily: BODY, color: INK,
                backgroundColor: '#fff', outline: 'none', resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </Q>
        </Section>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        {section > 1 ? (
          <button
            type="button"
            onClick={() => setSection((s) => s - 1)}
            style={{
              padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              fontFamily: BODY, cursor: 'pointer',
              backgroundColor: PAPER, color: NAVY, border: `1.5px solid ${LINE}`,
            }}
          >
            Back
          </button>
        ) : <div />}
        <button
          type="button"
          onClick={section === 3 ? handleSubmit : handleNext}
          disabled={saving}
          style={{
            padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 700,
            fontFamily: BODY, cursor: saving ? 'wait' : 'pointer',
            backgroundColor: NAVY, color: '#fff', border: 'none',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : section === 3 ? 'Submit' : 'Next'}
        </button>
      </div>
    </Shell>
  );
}

/* ── Layout shell ─────────────────────────────────────────────── */
function Shell({ children }) {
  return (
    <div style={{ backgroundColor: LIGHT, minHeight: '100vh', fontFamily: BODY }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
      />
      {/* Header */}
      <div style={{ backgroundColor: NAVY, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.02em' }}>
          <span style={{ color: '#CB5E38' }}>E</span><span style={{ color: '#fff' }}>vid</span><span style={{ color: '#CB5E38' }}>LY</span>
        </span>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 12, fontWeight: 700 }}>
          Market Research
        </span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '32px 20px 80px' }}>
        {children}
      </div>
    </div>
  );
}

/* ── Section wrapper ──────────────────────────────────────────── */
function Section({ title, sub, children }) {
  return (
    <div style={{ backgroundColor: PAPER, border: `1px solid ${LINE}`, borderRadius: 12, padding: '28px 24px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: NAVY, fontFamily: DISPLAY, marginBottom: 4 }}>
        {title}
      </h2>
      {sub && <p style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>{sub}</p>}
      {children}
    </div>
  );
}
