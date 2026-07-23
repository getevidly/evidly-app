/**
 * ProspectGate — /gate/:token view-only prospect page.
 *
 * Token-based, no auth guard, no login required.
 * Same token model as ClientJoin.tsx (evidly_client_invites).
 * Resolves org name + location from the invite token.
 *
 * Layout matches design/gate-mock.html:
 *   Navy left rail + cream right content.
 *   Featured hood-cert card → exposure hero → five groups →
 *   handoff → founder offer → closing CTA.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/* ── Design tokens (from mock CSS vars) ──────────────────────── */
const NAVY = '#1E2D4D';
const NAVY2 = '#17233c';
const NAVY_LINE = 'rgba(255,255,255,.10)';
const EMBER = '#B24A2E';
const EMBER_BRIGHT = '#CB5E38';
const EMBER_DEEP = '#8F3A22';
const SLATE = '#3E6B8A';
const CREAM = '#FAF7F0';
const SAGE = '#3F6B4E';
const SAGE_BG = '#E7F0E9';
const SAGE_LINE = '#C4DBCB';
const INK = '#1b2436';
const MUTED = '#5b667d';
const HAIR = '#e7e2d6';
const HAIR2 = '#efe9dc';
const TAG_INK = '#3c4763';
const AMBER = '#8a5a12';
const AMBER_BG = '#F6EEDD';

const FONT_INTER = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const FONT_MONT = "'Montserrat', sans-serif";

/* ── SVG icon helpers ────────────────────────────────────────── */
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" style={{ width: 12, height: 12 }}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const ChevIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    style={{ width: 18, height: 18, color: '#9aa3b5', transition: 'transform .18s ease', transform: collapsed ? 'rotate(-90deg)' : 'none' }}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
    <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

/* ── Group icon SVGs ─────────────────────────────────────────── */
const FireIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
    <path d="M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-1.5.6-2.8 1.3-3.7C8.9 8 9 9.5 10 10c-.3-2.5.8-6 2-8Z" />
  </svg>
);
const FoodIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
    <path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M20 3c-2 0-3 2-3 5s1 4 3 4m0 0v9" />
  </svg>
);
const BizIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
  </svg>
);
const VendBizIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
    <path d="M4 8h16a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1ZM8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
  </svg>
);
const SvcIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M9 15l2 2 4-4" />
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 19, height: 19 }}>
    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" />
  </svg>
);

/* ── Static data: the items for each group ───────────────────── */
// "If Applicable" items — exactly these five
const IF_APPLICABLE = new Set([
  'Lease Agreement', 'Liquor License', 'Grease Trap', 'Backflow Prevention', 'HACCP Plan',
]);

interface RecordItem {
  name: string;
  code?: string;        // e.g. "NFPA 96"
  why?: string;         // sub-line
  whyLink?: string;     // clickable vendor name
  status: 'on_file' | 'required' | 'if_applicable';
  viewable?: boolean;   // has a View link
  pillarTag?: string;   // e.g. "Fire · NFPA 96"
  pillarTagClass?: 'fire' | 'food';
}

const FIRE_ITEMS: RecordItem[] = [
  { name: 'Hood', code: 'NFPA 96', why: 'Met \u2014 Cleaning Pros Plus service record on file', whyLink: '#', status: 'on_file', viewable: true },
  { name: 'Suppression', code: 'NFPA 17A', status: 'required' },
  { name: 'Sprinklers', code: 'NFPA 25', status: 'required' },
  { name: 'Alarms', code: 'NFPA 72', status: 'required' },
  { name: 'Extinguishers', code: 'NFPA 10', status: 'required' },
];

const FOOD_ITEMS: RecordItem[] = [
  { name: 'Pest Control', status: 'required' },
  { name: 'Grease Trap', status: 'if_applicable' },
  { name: 'Backflow Prevention', status: 'if_applicable' },
  { name: 'Receiving Logs', status: 'required' },
  { name: 'Hot Holding', status: 'required' },
  { name: 'Cold Holding', status: 'required' },
  { name: 'Cooldown', status: 'required' },
  { name: 'Reheating', status: 'required' },
  { name: 'Warewash & Sanitizer Logs', status: 'required' },
  { name: 'Health Permit', status: 'required' },
  { name: 'CFPM', status: 'required' },
  { name: 'Handler Cards', status: 'required' },
  { name: 'HACCP Plan', status: 'if_applicable' },
  { name: 'Allergen Management', status: 'required' },
];

const BIZ_ITEMS: RecordItem[] = [
  { name: 'General Liability Insurance', status: 'required' },
  { name: 'Food Contamination Insurance', why: 'Spoilage & food-borne illness coverage', status: 'required' },
  { name: 'Lease Agreement', status: 'if_applicable' },
  { name: 'Business License', status: 'required' },
  { name: "Seller's Permit", status: 'required' },
  { name: 'W-9', status: 'required' },
  { name: 'Certificate of Occupancy', status: 'required' },
  { name: 'Liquor License', status: 'if_applicable' },
];

const SVC_ITEMS: RecordItem[] = [
  { name: 'Hood Cleaning Certificate', pillarTag: 'Fire \u00b7 NFPA 96', pillarTagClass: 'fire', why: 'Cleaning Pros Plus', status: 'on_file', viewable: true },
  { name: 'Fire Suppression Service Report', pillarTag: 'Fire \u00b7 NFPA 17A', pillarTagClass: 'fire', status: 'required' },
  { name: 'Sprinkler Inspection Report', pillarTag: 'Fire \u00b7 NFPA 25', pillarTagClass: 'fire', status: 'required' },
  { name: 'Fire Alarm Functional Test', pillarTag: 'Fire \u00b7 NFPA 72', pillarTagClass: 'fire', status: 'required' },
  { name: 'Extinguisher Service Tag', pillarTag: 'Fire \u00b7 NFPA 10', pillarTagClass: 'fire', status: 'required' },
  { name: 'Pest Control Service Report', pillarTag: 'Food', pillarTagClass: 'food', status: 'required' },
  { name: 'Grease Trap Pumping Manifest', pillarTag: 'Food', pillarTagClass: 'food', status: 'if_applicable' },
  { name: 'Backflow Test Report', pillarTag: 'Food', pillarTagClass: 'food', status: 'if_applicable' },
];

interface VendorCard {
  name: string;
  role: string;
  icon: 'fire' | 'calendar' | 'sprinkler' | 'alarm' | 'pest' | 'grease';
  primary?: boolean;
  docs: { label: string; status: 'on_file' | 'required' }[];
}

const VENDOR_CARDS: VendorCard[] = [
  {
    name: 'Cleaning Pros Plus', role: 'Hood & exhaust cleaning \u00b7 IKECA-certified', icon: 'fire',
    docs: [
      { label: 'General Liability COI', status: 'required' },
      { label: 'Workers Comp COI', status: 'required' },
      { label: 'Professional License', status: 'required' },
      { label: 'W-9', status: 'required' },
    ],
  },
  {
    name: 'Fire equipment vendor', role: 'Suppression NFPA 17A \u00b7 Extinguishers NFPA 10', icon: 'calendar',
    docs: [
      { label: 'General Liability COI', status: 'required' },
      { label: 'Workers Comp COI', status: 'required' },
      { label: 'Professional License', status: 'required' },
      { label: 'W-9', status: 'required' },
    ],
  },
  {
    name: 'Fire sprinkler vendor', role: 'NFPA 25 \u00b7 inspection & test', icon: 'sprinkler',
    docs: [
      { label: 'General Liability COI', status: 'required' },
      { label: 'Workers Comp COI', status: 'required' },
      { label: 'Professional License', status: 'required' },
      { label: 'W-9', status: 'required' },
    ],
  },
  {
    name: 'Fire alarm vendor', role: 'NFPA 72 \u00b7 monitoring & test', icon: 'alarm',
    docs: [
      { label: 'General Liability COI', status: 'required' },
      { label: 'Workers Comp COI', status: 'required' },
      { label: 'Professional License', status: 'required' },
      { label: 'W-9', status: 'required' },
    ],
  },
  {
    name: 'Pest control vendor', role: 'Monthly service', icon: 'pest',
    docs: [
      { label: 'General Liability COI', status: 'required' },
      { label: 'Workers Comp COI', status: 'required' },
      { label: 'Professional License', status: 'required' },
      { label: 'W-9', status: 'required' },
    ],
  },
  {
    name: 'Grease trap service', role: 'Interceptor pump & manifest', icon: 'grease',
    docs: [
      { label: 'General Liability COI', status: 'required' },
      { label: 'Workers Comp COI', status: 'required' },
      { label: 'Professional License', status: 'required' },
      { label: 'W-9', status: 'required' },
    ],
  },
];

/* ── Helpers ──────────────────────────────────────────────────── */
function countOnFile(items: RecordItem[]): number {
  return items.filter(i => i.status === 'on_file').length;
}
function countRequired(items: RecordItem[]): number {
  return items.filter(i => i.status !== 'if_applicable').length;
}

function StatusPill({ status }: { status: RecordItem['status'] }) {
  if (status === 'on_file') {
    return (
      <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '5px 11px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', background: SAGE_BG, color: SAGE, border: `1px solid ${SAGE_LINE}` }}>
        <CheckIcon /> On File
      </span>
    );
  }
  if (status === 'if_applicable') {
    return (
      <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '5px 11px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', background: AMBER_BG, color: AMBER, border: '1px solid #e7d6b0' }}>
        If Applicable
      </span>
    );
  }
  return (
    <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '5px 11px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', background: '#fff', color: TAG_INK, border: '1px solid #d9dae1' }}>
      Required
    </span>
  );
}

/* ── Collapsible Group ───────────────────────────────────────── */
function RecordGroup({ title, meta, items, groupClass, icon, defaultOpen = true, countLabel, children }: {
  title: string;
  meta: string;
  items?: RecordItem[];
  groupClass: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  countLabel: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const borderColors: Record<string, string> = {
    fire: EMBER, food: SLATE, biz: NAVY, vend: '#8a94a8', svc: '#6B7688',
  };
  const iconBgs: Record<string, string> = {
    fire: '#F6E7E1', food: '#E6EEF4', biz: '#E7EAF1', vend: '#ECEEF2', svc: '#EDEBF3',
  };
  const iconColors: Record<string, string> = {
    fire: EMBER, food: SLATE, biz: NAVY, vend: '#5b667d', svc: '#5E5A87',
  };

  return (
    <section style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 14, marginTop: 16, overflow: 'hidden' }}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } }}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', cursor: 'pointer', userSelect: 'none', borderLeft: `4px solid ${borderColors[groupClass] || 'transparent'}` }}
      >
        <span style={{ width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', background: iconBgs[groupClass], color: iconColors[groupClass] }}>
          {icon}
        </span>
        <div>
          <h3 style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: '15.5px', color: NAVY, margin: 0 }}>{title}</h3>
          <p style={{ fontSize: '12.5px', color: MUTED, margin: '2px 0 0' }}>{meta}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '12.5px', color: MUTED }} dangerouslySetInnerHTML={{ __html: countLabel }} />
          <ChevIcon collapsed={!open} />
        </div>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${HAIR2}` }}>
          {items ? items.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px 13px 22px', borderBottom: i < items.length - 1 ? `1px solid ${HAIR2}` : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: INK }}>
                  {item.name}{item.code ? <span style={{ color: MUTED, fontWeight: 500 }}> {item.code}</span> : null}
                </div>
                {item.why && (
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                    {item.pillarTag && (
                      <span style={{ fontWeight: 600, fontSize: 12, color: item.pillarTagClass === 'fire' ? EMBER : SLATE }}>
                        {item.pillarTag}
                      </span>
                    )}
                    {item.pillarTag && item.why ? ' \u00b7 ' : ''}
                    {item.whyLink ? (
                      <>Met \u2014 <a href="#" style={{ color: SLATE, fontWeight: 600, textDecoration: 'none' }} onClick={e => e.preventDefault()}>Cleaning Pros Plus</a> service record on file</>
                    ) : (
                      !item.pillarTag ? item.why : item.why
                    )}
                  </div>
                )}
                {!item.why && item.pillarTag && (
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: item.pillarTagClass === 'fire' ? EMBER : SLATE }}>
                      {item.pillarTag}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flex: 'none' }}>
                {item.viewable && (
                  <a href="#" onClick={e => e.preventDefault()} style={{ fontSize: '12.5px', fontWeight: 600, color: SLATE, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <EyeIcon /> View
                  </a>
                )}
                <StatusPill status={item.status} />
              </div>
            </div>
          )) : children}
        </div>
      )}
    </section>
  );
}

/* ── Vendor card icons ───────────────────────────────────────── */
function VendorIcon({ type }: { type: string }) {
  const svgStyle = { width: 16, height: 16 };
  switch (type) {
    case 'fire': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={svgStyle}><path d="M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-1.5.6-2.8 1.3-3.7" /></svg>;
    case 'calendar': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={svgStyle}><path d="M8 2v4M16 2v4M4 8h16M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></svg>;
    case 'sprinkler': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={svgStyle}><path d="M5 3h14l-1 9H6L5 3ZM4 12h16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3ZM10 21h4" /></svg>;
    case 'alarm': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={svgStyle}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>;
    case 'pest': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={svgStyle}><path d="M12 3c4 4 6 7 6 10a6 6 0 0 1-12 0c0-3 2-6 6-10Z" /></svg>;
    case 'grease': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={svgStyle}><path d="M4 7h16v10H4zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
    default: return <VendBizIcon />;
  }
}

/* ── Handoff card icons ──────────────────────────────────────── */
const CollectIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 19, height: 19 }}>
    <path d="M3 12h5l2 3h4l2-3h5M3 12l3-7h12l3 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
  </svg>
);
const FlagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 19, height: 19 }}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);
const ChaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 19, height: 19 }}>
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
  </svg>
);

const CALENDLY = 'https://calendly.com/founders-getevidly/founders';

/* ═══════════════════════════════════════════════════════════════ */
export function ProspectGate() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('your kitchen');

  /* ── Fetch invite to resolve org name ──────────────────────── */
  useEffect(() => {
    if (!token) { setError('Missing invite link.'); setLoading(false); return; }
    (async () => {
      const { data, error: err } = await supabase
        .from('evidly_client_invites')
        .select('organization_name, business_name, status, expires_at')
        .eq('token', token)
        .maybeSingle();
      if (err || !data) { setError('This invite link is invalid.'); setLoading(false); return; }
      setOrgName(data.organization_name || data.business_name || 'your kitchen');
      setLoading(false);
    })();
  }, [token]);

  /* ── Derived counts ────────────────────────────────────────── */
  const fireOnFile = countOnFile(FIRE_ITEMS);
  const fireTotal = countRequired(FIRE_ITEMS);
  const foodOnFile = countOnFile(FOOD_ITEMS);
  const foodTotal = countRequired(FOOD_ITEMS);
  const bizOnFile = countOnFile(BIZ_ITEMS);
  const bizTotal = countRequired(BIZ_ITEMS);
  const svcOnFile = countOnFile(SVC_ITEMS);
  const svcTotal = countRequired(SVC_ITEMS);
  const vendOnFile = 0; // day-one: no vendor biz docs filed

  const totalOnFile = fireOnFile + foodOnFile + bizOnFile + svcOnFile;
  const totalRequired = fireTotal + foodTotal + bizTotal + svcTotal;
  const totalGap = totalRequired - totalOnFile;

  /* ── Bar percentages ───────────────────────────────────────── */
  const firePct = fireTotal > 0 ? Math.round((fireOnFile / fireTotal) * 100) : 0;
  const foodPct = foodTotal > 0 ? Math.round((foodOnFile / foodTotal) * 100) : 0;
  const bizPct = bizTotal > 0 ? Math.round((bizOnFile / bizTotal) * 100) : 0;
  const vendPct = 0;

  /* ── Loading / error states ────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_INTER }}>
        <span style={{ color: NAVY, fontSize: 15 }}>Loading...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_INTER, padding: 20 }}>
        <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 12, border: `1px solid ${HAIR}`, padding: 28, textAlign: 'center' }}>
          <div style={{ marginBottom: 12, fontFamily: FONT_MONT, fontWeight: 800, fontSize: 20 }}>
            <span style={{ color: EMBER_BRIGHT }}>E</span><span style={{ color: '#fff' }}>vid</span><span style={{ color: EMBER_BRIGHT }}>LY</span>
          </div>
          <p style={{ color: NAVY, fontSize: 15 }}>{error}</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ fontFamily: FONT_INTER, color: INK, background: CREAM, WebkitFontSmoothing: 'antialiased', lineHeight: 1.55, margin: 0 }}>
      <h1 className="sr-only">{`EvidLY view-only gate for ${orgName}: ${totalOnFile === 1 ? 'one' : totalOnFile} record on file, with the full compliance checklist and a link to schedule a meeting with Arthur Haggerty.`}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '392px 1fr', minHeight: '100vh', maxWidth: 1240, margin: '0 auto', boxShadow: `0 0 0 1px ${HAIR2}` }}
        className="gate-shell">

        {/* ============ LEFT NAVY RAIL ============ */}
        <aside style={{ background: NAVY, color: '#fff', padding: '34px 34px 40px', position: 'sticky', top: 0, alignSelf: 'start', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
          className="gate-rail">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, letterSpacing: '.02em', color: '#c9d2e4', background: 'rgba(255,255,255,.06)', border: `1px solid ${NAVY_LINE}`, padding: '5px 10px', borderRadius: 999, width: 'max-content' }}>
            <EyeIcon /> View-only preview &middot; no sign-in
          </span>

          <div style={{ fontFamily: FONT_MONT, fontWeight: 800, fontSize: 30, letterSpacing: '-.01em', marginTop: 22 }}>
            <span style={{ color: EMBER_BRIGHT }}>E</span><span style={{ color: '#fff' }}>vid</span><span style={{ color: EMBER_BRIGHT }}>LY</span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#aab6ce' }}>
            Prepared for <b style={{ color: '#e7ecf6', fontWeight: 600 }}>{orgName}</b>
          </p>

          <h2 style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: 27, lineHeight: 1.15, letterSpacing: '-.01em', marginTop: 30 }}>
            See the gaps.<br />Let&rsquo;s close them.
          </h2>
          <p style={{ marginTop: 14, fontSize: '14.5px', color: '#c3ccde', maxWidth: '31ch' }}>
            Your <b style={{ color: '#fff', fontWeight: 600 }}>hood cleaning certificate</b> is on file. Here&rsquo;s everything else a covered kitchen carries.
          </p>

          <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 0, borderTop: `1px solid ${NAVY_LINE}` }}>
            {[['Predict', "what's due"], ['Reduce', 'the lapse'], ['Prove', 'the work']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: `1px solid ${NAVY_LINE}` }}>
                <span style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: EMBER_BRIGHT, width: 66, flex: 'none' }}>{k}</span>
                <span style={{ fontSize: '13.5px', color: '#cfd7e6' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* TOP CTA */}
          <div style={{ paddingTop: 26, borderTop: `1px solid ${NAVY_LINE}`, marginTop: 26 }}>
            <p style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: 17, color: '#fff', margin: '0 0 12px' }}>See the gaps. Let&rsquo;s close them.</p>
            <a href={CALENDLY} target="_blank" rel="noopener"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: EMBER, color: '#fff', fontFamily: FONT_INTER, fontWeight: 600, fontSize: 15, textDecoration: 'none', padding: '14px 20px', borderRadius: 10, border: `1px solid ${EMBER_DEEP}`, width: '100%', justifyContent: 'center' }}>
              Schedule a Meeting <span style={{ fontWeight: 700 }}>&rarr;</span>
            </a>
            <p style={{ margin: '12px 0 0', fontSize: '12.5px', color: '#a9b4cb' }}>
              <b style={{ color: '#dfe4f0', fontWeight: 600 }}>Arthur Haggerty</b> &middot; IKECA-certified &middot; NFPA 96 expert witness.
            </p>
          </div>
        </aside>

        {/* ============ RIGHT CONTENT ============ */}
        <main style={{ padding: '40px 46px 56px', background: CREAM }} className="gate-main">

          {/* ===== FEATURED HOOD-CERT CARD (top, above hero) ===== */}
          <div style={{ background: SAGE_BG, border: `1px solid ${SAGE_LINE}`, borderRadius: 14, padding: '18px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <ShieldIcon />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: SAGE, marginBottom: 2 }}>
                ON FILE &middot; FIRE SAFETY &middot; HOOD NFPA 96
              </div>
              <div style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: '15.5px', color: NAVY }}>Hood Cleaning Certificate</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                Cleaning Pros Plus &middot; filed &amp; time-stamped (write-once) &mdash; your one sealed record so far.
              </div>
            </div>
            <a href="#" onClick={e => e.preventDefault()} style={{ fontSize: '12.5px', fontWeight: 600, color: SLATE, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, flex: 'none' }}>
              <EyeIcon /> View
            </a>
          </div>

          {/* ===== EXPOSURE HERO ===== */}
          <section style={{ background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 16, padding: '28px 30px', margin: '2px 0 0' }}>
            <p style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: '11.5px', letterSpacing: '.13em', textTransform: 'uppercase' as const, color: EMBER_DEEP, margin: 0 }}>
              {orgName} &middot; your exposure today
            </p>
            <h2 style={{ fontFamily: FONT_MONT, fontWeight: 800, fontSize: 27, lineHeight: 1.14, letterSpacing: '-.015em', color: NAVY, margin: '10px 0 0', maxWidth: '26ch' }}>
              {totalOnFile === 1 ? 'One certificate is on file.' : `${totalOnFile} certificates on file.`} {totalGap === 1 ? 'One requirement isn\u2019t.' : `${totalGap > 0 ? totalGap : 'No'} requirements aren\u2019t.`}
            </h2>
            <p style={{ margin: '14px 0 0', fontSize: '14.5px', color: MUTED, maxWidth: '64ch', lineHeight: 1.6 }}>
              When a kitchen fire reaches a courtroom, these are the records that get read. Arthur reads them for a living &mdash; as an <b style={{ color: INK, fontWeight: 600 }}>NFPA 96 expert witness</b>. Here&rsquo;s what your kitchen is carrying right now.
            </p>

            <div style={{ margin: '24px 0 0', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Fire bar */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: '13.5px', color: INK, margin: '0 0 9px', flexWrap: 'wrap' as const }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', flex: 'none', background: EMBER }} />
                  Fire Safety <span style={{ color: MUTED, fontWeight: 500, fontSize: '12.5px' }}>NFPA 96 &middot; the liability spine</span>
                  <b style={{ marginLeft: 'auto', fontFamily: FONT_MONT, fontWeight: 700, fontSize: '13.5px', color: NAVY }}>{fireOnFile} of {fireTotal} on file</b>
                </div>
                <div style={{ height: 13, borderRadius: 999, background: '#ECE8DF', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', borderRadius: 999, background: EMBER, width: `${firePct}%`, transition: 'width .95s cubic-bezier(.22,1,.36,1)' }} />
                </div>
              </div>
              {/* Food bar */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: '13.5px', color: INK, margin: '0 0 9px', flexWrap: 'wrap' as const }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', flex: 'none', background: SLATE }} />
                  Food Safety <span style={{ color: MUTED, fontWeight: 500, fontSize: '12.5px' }}>keeps you open</span>
                  <b style={{ marginLeft: 'auto', fontFamily: FONT_MONT, fontWeight: 700, fontSize: '13.5px', color: NAVY }}>{foodOnFile} of {foodTotal} on file</b>
                </div>
                <div style={{ height: 13, borderRadius: 999, background: '#ECE8DF', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', borderRadius: 999, background: SLATE, width: `${foodPct}%`, transition: 'width .95s cubic-bezier(.22,1,.36,1)' }} />
                </div>
              </div>
              {/* Biz bar */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: '13.5px', color: INK, margin: '0 0 9px', flexWrap: 'wrap' as const }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', flex: 'none', background: NAVY }} />
                  Business Records <span style={{ color: MUTED, fontWeight: 500, fontSize: '12.5px' }}>your own paperwork</span>
                  <b style={{ marginLeft: 'auto', fontFamily: FONT_MONT, fontWeight: 700, fontSize: '13.5px', color: NAVY }}>{bizOnFile} of {bizTotal} on file</b>
                </div>
                <div style={{ height: 13, borderRadius: 999, background: '#ECE8DF', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', borderRadius: 999, background: NAVY, width: `${bizPct}%`, transition: 'width .95s cubic-bezier(.22,1,.36,1)' }} />
                </div>
              </div>
              {/* Vendor biz bar */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: '13.5px', color: INK, margin: '0 0 9px', flexWrap: 'wrap' as const }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', flex: 'none', background: '#8a94a8' }} />
                  Vendor Business Records <span style={{ color: MUTED, fontWeight: 500, fontSize: '12.5px' }}>one set per vendor</span>
                  <b style={{ marginLeft: 'auto', fontFamily: FONT_MONT, fontWeight: 700, fontSize: '13.5px', color: NAVY }}>{vendOnFile} on file</b>
                </div>
                <div style={{ height: 13, borderRadius: 999, background: '#ECE8DF', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', borderRadius: 999, background: '#8a94a8', width: `${vendPct}%`, transition: 'width .95s cubic-bezier(.22,1,.36,1)' }} />
                </div>
              </div>
            </div>

            <p style={{ margin: '22px 0 0', fontSize: '13.5px', color: INK, paddingTop: 17, borderTop: `1px solid ${HAIR2}`, lineHeight: 1.55 }}>
              <b style={{ color: NAVY, fontWeight: 600 }}>Every line here is a document that has to be filed, sealed, and kept current.</b> And depending on your county and carrier, there may be more &mdash; EvidLY manages those too.
            </p>
          </section>

          {/* ===== FIRE SAFETY ===== */}
          <RecordGroup title="Fire Safety" meta="NFPA 96 fire line \u2014 the liability spine" items={FIRE_ITEMS} groupClass="fire" icon={<FireIcon />}
            countLabel={`<b>${fireOnFile}</b> / ${fireTotal} on file`} defaultOpen={true} />

          {/* ===== FOOD SAFETY ===== */}
          <RecordGroup title="Food Safety" meta="County health \u2014 keeps you open" items={FOOD_ITEMS} groupClass="food" icon={<FoodIcon />}
            countLabel={`<b>${foodOnFile}</b> / ${foodTotal} on file`} defaultOpen={true} />

          {/* ===== BUSINESS RECORDS ===== */}
          <RecordGroup title="Business Records" meta="The kitchen\u2019s own paperwork" items={BIZ_ITEMS} groupClass="biz" icon={<BizIcon />}
            countLabel={`<b>${bizOnFile}</b> / ${bizTotal} on file`} defaultOpen={true} />

          {/* ===== VENDOR BUSINESS RECORDS ===== */}
          <RecordGroup title="Vendor Business Records" meta="One COI, W-9 &amp; license set per vendor \u2014 a single company can cover several services"
            groupClass="vend" icon={<VendBizIcon />}
            countLabel={`<b>${vendOnFile}</b> on file`} defaultOpen={false}>
            <div style={{ padding: '14px 18px 6px 22px' }}>
              {VENDOR_CARDS.map((v, vi) => (
                <div key={vi} style={{ border: `1px solid ${HAIR}`, borderRadius: 11, padding: '13px 15px', marginBottom: 12, background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: '#eef0f4', color: '#5b667d', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <VendorIcon type={v.icon} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: INK }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: MUTED }}>{v.role}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 7, margin: '12px 0 2px' }}>
                    {v.docs.map((d, di) => (
                      <span key={di} style={{ fontSize: '11.5px', fontWeight: 500, padding: '5px 10px', borderRadius: 8, border: '1px solid #dcdde3', color: TAG_INK, background: '#fafafb', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c2c5cd' }} />
                        {d.label} &middot; Required
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </RecordGroup>

          {/* ===== VENDOR SERVICE RECORDS ===== */}
          <RecordGroup title="Vendor Service Records" meta="Proof each vendor did the work \u2014 the records that get read after a fire"
            items={SVC_ITEMS} groupClass="svc" icon={<SvcIcon />}
            countLabel={`<b>${svcOnFile}</b> / ${svcTotal} on file`} defaultOpen={true} />

          {/* ===== WE DO THE WORK — HANDOFF ===== */}
          <section style={{ marginTop: 26, background: '#fff', border: `1px solid ${HAIR}`, borderRadius: 16, padding: '32px 34px' }}>
            <p style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: '11.5px', letterSpacing: '.12em', textTransform: 'uppercase' as const, color: EMBER_DEEP, margin: 0 }}>
              A binder shows you tried. EvidLY is the evidence.
            </p>
            <h2 style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: 24, color: NAVY, margin: '11px 0 0', letterSpacing: '-.01em' }}>
              You don&rsquo;t manage any of this. We do.
            </h2>
            <p style={{ margin: '13px 0 0', fontSize: '14.5px', color: MUTED, maxWidth: '72ch' }}>
              Everything above is a lot to carry for one kitchen &mdash; and it never stops renewing. You&rsquo;ve been holding it in a binder or a spreadsheet. Neither one seals a record or chases a vendor for a certificate. <b style={{ color: INK, fontWeight: 600 }}>We do the work to build the evidence, and keep it built.</b>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, margin: '24px 0 0' }} className="gate-ho-grid">
              {[
                { icon: <CollectIcon />, title: 'We collect it', desc: 'We gather every document and file it for you. You stop hunting for paper.' },
                { icon: <ShieldIcon />, title: 'We seal it', desc: "Each record is sealed and time-stamped \u2014 proof it can\u2019t be changed after the fact." },
                { icon: <FlagIcon />, title: 'We flag every renewal', desc: 'Every certificate is flagged before it lapses, so nothing expires quietly.' },
                { icon: <ChaseIcon />, title: 'We chase your vendors', desc: "We request the COIs and licenses from your vendors. You\u2019re not the one emailing them." },
              ].map((c, i) => (
                <div key={i} style={{ border: `1px solid ${HAIR2}`, borderRadius: 12, padding: '17px 18px', background: '#FCFBF8' }}>
                  <span style={{ width: 37, height: 37, borderRadius: 10, background: '#E6EEF4', color: SLATE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.icon}
                  </span>
                  <div style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: 15, color: NAVY, marginTop: 13 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: MUTED, marginTop: 5, lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              ))}
            </div>
            <p style={{ margin: '24px 0 0', fontSize: '15.5px', color: INK, textAlign: 'center', paddingTop: 20, borderTop: `1px solid ${HAIR2}` }}>
              <b style={{ color: NAVY, fontWeight: 700 }}>Every line above goes from Required to On File</b> &mdash; and stays that way. If your county or carrier asks for a document that isn&rsquo;t listed here, EvidLY manages that too.
            </p>
          </section>

          {/* ===== CLOSING: FOUNDER OFFER + CTA ===== */}
          <section style={{ marginTop: 26, background: NAVY, borderRadius: 16, padding: '28px 32px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
                <span style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: '10.5px', letterSpacing: '.09em', textTransform: 'uppercase' as const, color: NAVY, background: CREAM, padding: '5px 11px', borderRadius: 999 }}>Founding cohort</span>
                <span style={{ fontSize: 13, color: '#c7d0e2', fontWeight: 600 }}>250 Restaurant seats &middot; price locked 24 months</span>
              </div>
              <div style={{ margin: '15px 0 0', display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' as const, fontSize: '14.5px', color: '#c7d0e2' }}>
                <span><b style={{ color: '#fff', fontWeight: 700, fontFamily: FONT_MONT, fontSize: 17 }}>$99/mo</b> for your first kitchen</span>
                <span style={{ color: '#5b6b8a' }}>&middot;</span>
                <span><b style={{ color: '#fff', fontWeight: 700, fontFamily: FONT_MONT, fontSize: 17 }}>$49/mo</b> for each additional kitchen</span>
              </div>
              <div style={{ margin: '18px 0 0', display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' as const }} className="gate-offer-tl">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'rgba(255,255,255,.05)', border: `1px solid ${NAVY_LINE}`, borderRadius: 10, padding: '9px 14px' }}>
                  <span style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase' as const, color: '#fff' }}>Days 1&ndash;15</span>
                  <span style={{ fontSize: 13, color: '#c7d0e2' }}>Set up your account</span>
                </div>
                <span style={{ color: '#5b6b8a', fontWeight: 700, fontSize: 15 }} className="gate-tl-arw">&rarr;</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'rgba(255,255,255,.05)', border: `1px solid ${NAVY_LINE}`, borderRadius: 10, padding: '9px 14px' }}>
                  <span style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase' as const, color: '#fff' }}>Days 16&ndash;60</span>
                  <span style={{ fontSize: 13, color: '#c7d0e2' }}>Use it &mdash; 45 days</span>
                </div>
                <span style={{ color: '#5b6b8a', fontWeight: 700, fontSize: 15 }} className="gate-tl-arw">&rarr;</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: CREAM, border: `1px solid ${CREAM}`, borderRadius: 10, padding: '9px 14px' }}>
                  <span style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase' as const, color: NAVY }}>Day 61</span>
                  <span style={{ fontSize: 13, color: '#3a4763' }}>First payment</span>
                </div>
              </div>
              <p style={{ margin: '15px 0 0', fontSize: 13, color: '#a9b4cb' }}>
                A full 60 days to set up and run EvidLY before your first payment.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' as const, marginTop: 24, paddingTop: 24, borderTop: `1px solid ${NAVY_LINE}` }}>
              <div style={{ flex: '1 1 300px' }}>
                <p style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: 21, color: '#fff', margin: 0 }}>See the gaps. Let&rsquo;s close them.</p>
                <p style={{ margin: '10px 0 0', fontSize: '13.5px', color: '#a9b4cb' }}>
                  Book 30 minutes. EvidLY maps every line above to your kitchen and does the work &mdash; <b style={{ color: '#dfe4f0', fontWeight: 600 }}>Arthur Haggerty &middot; IKECA-certified &middot; NFPA 96 expert witness.</b>
                </p>
              </div>
              <div style={{ flex: '0 0 auto', minWidth: 250 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 15px', flexWrap: 'wrap' as const }}>
                  <span style={{ fontFamily: FONT_MONT, fontWeight: 700, fontSize: '10.5px', letterSpacing: '.09em', textTransform: 'uppercase' as const, color: NAVY, background: CREAM, padding: '5px 11px', borderRadius: 999 }}>Founder</span>
                  <span style={{ fontSize: 13, color: '#c7d0e2' }}><b style={{ color: '#fff', fontWeight: 600 }}>Arthur Haggerty</b></span>
                </div>
                <a href={CALENDLY} target="_blank" rel="noopener"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: EMBER, color: '#fff', fontFamily: FONT_INTER, fontWeight: 600, fontSize: '15.5px', textDecoration: 'none', padding: '15px 22px', borderRadius: 10, border: `1px solid ${EMBER_DEEP}`, width: '100%', justifyContent: 'center' }}>
                  Schedule a Meeting <span style={{ fontWeight: 700 }}>&rarr;</span>
                </a>
              </div>
            </div>
          </section>

          {/* ===== FOOTER ===== */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: MUTED }}>
            <LockIcon />
            View-only preview &middot; no account, no sign-in. Your certificate stays sealed and unchanged.
          </div>
        </main>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 880px) {
          .gate-shell { grid-template-columns: 1fr !important; }
          .gate-rail { position: static !important; min-height: 0 !important; padding: 28px 24px 32px !important; }
          .gate-main { padding: 30px 22px 44px !important; }
          .gate-ho-grid { grid-template-columns: 1fr !important; }
          .gate-offer-tl { flex-direction: column !important; align-items: stretch !important; }
          .gate-tl-arw { display: none !important; }
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
      `}</style>
    </div>
  );
}

export default ProspectGate;
