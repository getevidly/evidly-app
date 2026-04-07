/**
 * SCORETABLE SHARED — palette, components, label maps, layout pieces
 * Imported by ScoreTableIndex, ScoreTableState, ScoreTableCountyDetail.
 * Single source of truth — no duplication across pages.
 */

import { useState } from "react";
import { Link } from "react-router-dom";

// ═══ PALETTE ═══
export const E = {
  navy: "#25396B", navyL: "#344E8A", navyD: "#1A2B52",
  gold: "#B8A06A", goldL: "#CDB882",
  w: "#fff", cream: "#FAF8F4",
  g1: "#F2F2F0", g2: "#E8E6E0", g3: "#d1d5db",
  g4: "#9ca3af", g5: "#6b7280", g6: "#4b5563", g8: "#1f2937",
  grn: "#16a34a", grnBg: "#f0fdf4",
  red: "#dc2626", redBg: "#fef2f2",
  wrn: "#f59e0b", wrnBg: "#fffbeb",
  orn: "#ea580c", bluePale: "#edf0f8",
};
export const S = { grn: "#1B5E20", grnL: "#4CAF50", charD: "#2E3C47", bg: "#F5F3F0", bd: "#D6CFC5", tx: "#2D2A26", sub: "#6B6560" };
export const ff = "system-ui,-apple-system,sans-serif";

// ═══ BRAND COMPONENTS ═══
export function Logo({ s = "1.2rem", light = false, tagline = false }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2, lineHeight: 1 }}>
      <span style={{ fontWeight: 800, fontSize: s, letterSpacing: -0.5, fontFamily: ff, lineHeight: 1 }}>
        <span style={{ color: E.gold }}>E</span>
        <span style={{ color: light ? E.w : E.navy }}>vid</span>
        <span style={{ color: E.gold }}>LY</span>
      </span>
      {tagline && <span style={{ fontSize: `calc(${s} * 0.3)`, fontWeight: 700, letterSpacing: "0.2em", color: light ? "rgba(255,255,255,0.55)" : "rgba(37,57,107,0.6)", textTransform: "uppercase", lineHeight: 1, fontFamily: ff, whiteSpace: "nowrap" }}>Lead with Confidence</span>}
    </span>
  );
}

export function STIcon({ sz = 24 }) {
  return <div style={{ width: sz, height: sz, borderRadius: 6, background: S.grn, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: E.w, fontWeight: 800, fontSize: sz * 0.5, fontFamily: ff, lineHeight: 1 }}>ST</span></div>;
}

export function STLogo({ s = "1rem", light = false }) {
  return <span style={{ fontWeight: 800, fontSize: s, letterSpacing: -0.5, fontFamily: ff, lineHeight: 1 }}><span style={{ color: light ? "rgba(255,255,255,0.85)" : S.grn }}>Score</span><span style={{ color: light ? E.w : S.charD }}>Table</span></span>;
}

// ═══ BUTTON STYLES ═══
export var bG = { padding: "11px 22px", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", background: E.gold, color: E.w, fontFamily: ff };
export var bN = { padding: "11px 22px", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", background: E.navy, color: E.w, fontFamily: ff };
export var bST = { padding: "11px 22px", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", background: S.grn, color: E.w, fontFamily: ff };
export var dinp = { width: "100%", padding: "10px 12px", border: "1px solid " + E.g2, borderRadius: 8, fontSize: "0.85rem", boxSizing: "border-box", outline: "none", background: E.w, color: E.g8, fontFamily: ff };

// ═══ UTILITY ═══
export function toSlug(name) { return name.toLowerCase().replace(/\s+/g, "-"); }
export function labelFallback(val) {
  if (!val) return "";
  return val.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

export var NON_NUMERIC_GRADING_TYPES = [
  "violation_report_only", "pass_fail", "inspection_report", "report_only",
  "pass_conditional_closed", "advisory", "pass_fail_placard", "pass_reinspect",
];

// ═══ STATE MAP ═══
export var STATE_MAP = {
  california: { code: "CA", name: "California", countyCount: 58, regulatory: "CalCode (CRFC)", stateSfm: "CAL FIRE / OSFM", fireCode: "2025 CFC" },
  nevada:     { code: "NV", name: "Nevada",     countyCount: 17, regulatory: "NRS 446 / NAC 446", stateSfm: "NV State Fire Marshal Division", fireCode: "2018 IFC" },
  oregon:     { code: "OR", name: "Oregon",      countyCount: 36, regulatory: "OAR 333-150 / FDA Food Code", stateSfm: "Oregon OSFM", fireCode: "2025 OFC" },
  washington: { code: "WA", name: "Washington",  countyCount: 39, regulatory: "WAC 246-215 / FDA Food Code", stateSfm: "WA State Fire Marshal", fireCode: "2018 IFC" },
  arizona:    { code: "AZ", name: "Arizona",     countyCount: 15, regulatory: "ARS Title 36 / FDA Food Code", stateSfm: "AZ DFFM", fireCode: "2018 IFC" },
};

// ═══ LABEL MAPS ═══
export var GRADING_TYPE_LABELS = {
  letter_grade: "Letter Grade (A / B / C)",
  letter_grade_strict: "Letter Grade — Strict (Only A passes)",
  letter_grade_abc: "Letter Grade (A/B/C)",
  color_placard: "Color Placard (Green / Yellow / Red)",
  green_yellow_red: "Color Placard (Green/Yellow/Red)",
  green_yellow_red_numeric: "Color Placard with Numeric Score",
  score_100: "Numeric Score (0–100)",
  numeric_score: "Numeric Score",
  numeric_score_no_letter: "Numeric Score (no letter grade)",
  score_negative: "Negative Scale (deductions from 0)",
  score_only: "Score Only",
  deduction_based: "Deduction-Based Scoring",
  point_accumulation_tiered: "Point Accumulation (Tiered)",
  three_tier_rating: "Three-Tier Rating",
  tiered: "Tiered Rating",
  esnu: "E / S / N / U Rating",
  pass_fail: "Pass / Fail",
  pass_fail_placard: "Pass / Fail with Placard",
  pass_reinspect: "Pass / Reinspection Required",
  pass_conditional_closed: "Pass / Conditional / Closed",
  violation_report_only: "Violation Report Only",
  report_only: "Report Only (no public grade)",
  inspection_report: "Inspection Report",
  advisory: "Advisory",
};

export var SCORING_TYPE_LABELS = {
  weighted_deduction: "Weighted Deduction",
  heavy_weighted: "Heavy-Weighted Deduction",
  major_violation_count: "Major Violation Count",
  negative_scale: "Negative Scale",
  major_minor_reinspect: "Major/Minor with Reinspection",
  violation_point_accumulation: "Violation Point Accumulation",
  point_deduction: "Point Deduction",
  point_accumulation: "Point Accumulation",
  pass_fail: "Pass / Fail",
  pass_fail_placard: "Pass / Fail with Placard",
  pass_conditional_closed: "Pass / Conditional / Closed",
  report_only: "Report Only",
  numeric_score: "Numeric Score",
  letter_grade: "Letter Grade",
  rating: "Rating",
  advisory: "Advisory",
  violation_report: "Violation Report",
  color_placard: "Color Placard",
  color_placard_and_numeric: "Color Placard & Numeric Score",
  inspection_report: "Inspection Report",
};

export var FIRE_AHJ_TYPE_LABELS = {
  municipal_fire: "Municipal Fire Department",
  county_fire: "County Fire Department",
  county_fd: "County Fire Department",
  fire_district: "Fire Protection District",
  cal_fire_contract: "CAL FIRE (Contract)",
  state_fire_marshal: "State Fire Marshal",
  mixed: "Mixed (Multiple AHJs)",
  tribal_fire: "Tribal Fire Department",
};

export var PSE_LABELS = {
  hood_cleaning: "Hood Cleaning",
  fire_suppression_system: "Fire Suppression System",
  fire_extinguisher: "Fire Extinguisher",
  sprinklers: "Sprinkler System",
  fire_alarm_monitoring: "Fire Alarm Monitoring",
};

export var FREQ_LABELS = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
};

// ═══ SMALL HELPERS ═══
export function SL({ children }) {
  return <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: E.g4, marginBottom: 3 }}>{children}</div>;
}

export function TBadge({ label, color = E.gold, bg = "transparent" }) {
  return <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 100, fontSize: "0.7rem", fontWeight: 700, border: "1.5px solid " + color, color: color, background: bg }}>{label}</span>;
}

export function StatCard({ label, value, note }) {
  return (
    <div style={{ background: E.cream, borderRadius: 9, padding: 12, border: "1px solid " + E.g2, textAlign: "center" }}>
      <SL>{label}</SL>
      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: E.navy, lineHeight: 1.3 }}>{value}</div>
      {note && <div style={{ fontSize: "0.62rem", color: E.g4, marginTop: 2 }}>{note}</div>}
    </div>
  );
}

// ═══ LAYOUT: GLOBAL STYLE RESET ═══
export function STGlobalStyle() {
  return <style>{`button{all:unset;box-sizing:border-box;cursor:pointer;} button:disabled{cursor:not-allowed;} a.btn{all:unset;box-sizing:border-box;cursor:pointer;display:inline-block;}`}</style>;
}

// ═══ LAYOUT: HEADER ═══
export function STHeader({ navLinks }) {
  return (
    <header style={{ background: E.w, borderBottom: "1px solid " + E.g2, padding: "0 24px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginRight: 28 }}>
          <STIcon sz={28} /><STLogo s="1rem" />
          <span style={{ color: E.g3, fontSize: "0.9rem" }}>|</span>
          <a href="https://www.getevidly.com" style={{ textDecoration: "none" }}><Logo s="0.9rem" /></a>
        </div>
        <nav style={{ display: "flex", gap: 18, flex: 1 }}>
          {(navLinks || []).map(function (x) { return <a key={x[0]} href={x[1]} style={{ textDecoration: "none", color: E.g5, fontWeight: 500, fontSize: "0.8rem" }}>{x[0]}</a>; })}
        </nav>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="btn" href="https://calendly.com/founders-getevidly/guided-tour" style={{ padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none", display: "inline-block", background: E.navy, color: E.w, borderRadius: 8, fontFamily: ff, cursor: "pointer" }}>Get EvidLY</a>
        </div>
      </div>
    </header>
  );
}

// ═══ LAYOUT: BREADCRUMB ═══
export function STBreadcrumb({ items }) {
  return (
    <div style={{ background: E.w, borderBottom: "1px solid " + E.g1, padding: "7px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", fontSize: "0.72rem", color: E.g4 }}>
        <a href="/" style={{ color: E.g4, textDecoration: "none" }}>EvidLY</a>
        {items.map(function (item, i) {
          var isLast = i === items.length - 1;
          return (
            <span key={i}>
              {" > "}
              {isLast ? <span style={{ color: E.navy, fontWeight: 600 }}>{item.label}</span> : <Link to={item.to} style={{ color: E.g4, textDecoration: "none" }}>{item.label}</Link>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ═══ LAYOUT: CTA FORM ═══
export function STCtaForm({ countyName, stateName }) {
  var [ltName, setLtName] = useState("");
  var [ltEmail, setLtEmail] = useState("");
  var [ltPhone, setLtPhone] = useState("");
  var [ltBiz, setLtBiz] = useState("");
  var [ltDone, setLtDone] = useState(false);
  var ltReady = ltName && ltEmail && ltPhone && ltBiz;

  function submitLead() {
    if (!ltReady) return;
    var loc = countyName ? countyName + ", " + stateName : stateName;
    window.open("mailto:founders@getevidly.com?subject=" + encodeURIComponent("[ScoreTable] Lead - " + ltBiz + " (" + loc + ")") + "&body=" + encodeURIComponent("Name: " + ltName + "\nEmail: " + ltEmail + "\nPhone: " + ltPhone + "\nBusiness: " + ltBiz + "\nLocation: " + loc), "_blank");
    setLtDone(true);
  }

  var fieldStyle = { width: "100%", padding: "9px 11px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: "0.84rem", boxSizing: "border-box", outline: "none", background: "rgba(255,255,255,0.1)", color: E.w, fontFamily: ff };
  var labelStyle = { fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 3 };

  return (
    <section style={{ padding: "64px 24px", background: E.w, borderTop: "1px solid " + E.g2 }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ background: "linear-gradient(135deg," + E.navyD + "," + E.navy + ")", borderRadius: 18, padding: "36px 32px", textAlign: "center" }}>
          <div style={{ marginBottom: 16 }}><Logo s="1.4rem" light tagline /></div>
          <h2 style={{ fontSize: "clamp(1.2rem,3.5vw,1.7rem)", fontWeight: 800, color: E.w, margin: "0 0 10px", lineHeight: 1.2 }}>
            {countyName
              ? "Know your " + countyName + " score before an inspector does."
              : "Know your inspection score before an inspector does."}
          </h2>
          <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.55)", maxWidth: 460, margin: "0 auto 24px", lineHeight: 1.7 }}>
            EvidLY applies your jurisdiction's exact methodology to your daily data — so you see your score in real time, not after the fact.
          </p>
          {!ltDone ? (
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: 20, border: "1px solid rgba(255,255,255,0.1)", maxWidth: 480, margin: "0 auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>Your Name *</label><input value={ltName} onChange={function (e) { setLtName(e.target.value); }} style={fieldStyle} placeholder="Jane Kim" /></div>
                <div><label style={labelStyle}>Phone *</label><input value={ltPhone} onChange={function (e) { setLtPhone(e.target.value); }} style={fieldStyle} placeholder="(555) 555-0100" /></div>
              </div>
              <div style={{ marginBottom: 10 }}><label style={labelStyle}>Business Name *</label><input value={ltBiz} onChange={function (e) { setLtBiz(e.target.value); }} style={fieldStyle} placeholder="Main Street Kitchen" /></div>
              <div style={{ marginBottom: 14 }}><label style={labelStyle}>Email *</label><input value={ltEmail} onChange={function (e) { setLtEmail(e.target.value); }} style={fieldStyle} placeholder="jane@restaurant.com" /></div>
              <button disabled={!ltReady} onClick={submitLead} style={Object.assign({}, bG, { width: "100%", opacity: ltReady ? 1 : 0.4, fontSize: "0.9rem", padding: "12px" })}>Book a Demo</button>
              <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", marginTop: 8 }}>Launching May 5, 2026 - $99/mo founder pricing</p>
            </div>
          ) : (
            <div style={{ textAlign: "center", paddingTop: 8 }}>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.88rem" }}>We'll be in touch, {ltName}. Check <strong>{ltEmail}</strong> for calendar confirmation.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ═══ LAYOUT: COOKIE BANNER ═══
export function STCookieBanner() {
  var [show, setShow] = useState(true);
  if (!show) return null;
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: E.w, borderTop: "1px solid " + E.g2, padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", boxShadow: "0 -2px 10px rgba(0,0,0,0.06)" }}>
      <p style={{ flex: 1, fontSize: "0.8rem", color: E.g6, margin: 0, minWidth: 200 }}>We use cookies to enhance your experience. <a href="/privacy" style={{ color: E.navy }}>Cookie Policy</a></p>
      <button onClick={function () { setShow(false); }} style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid " + E.g2, background: E.w, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", color: E.g6 }}>Settings</button>
      <button onClick={function () { setShow(false); }} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: E.navy, color: E.w, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>Accept All</button>
    </div>
  );
}

// ═══ LAYOUT: FOOTER ═══
export function STFooter({ stateName }) {
  return (
    <footer style={{ padding: "36px 24px 20px", background: "#2C3E5C" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><STIcon sz={22} /><STLogo s="0.95rem" light /></div>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 6 }}>The Score Behind Every Table.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}><Logo s="0.8rem" light tagline /></div>
          {stateName && <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", marginTop: 6, lineHeight: 1.5 }}>Serving {stateName}.</p>}
        </div>
        <div>
          <h4 style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>ScoreTable</h4>
          <Link to="/scoretable" style={{ display: "block", fontSize: "0.76rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: 5 }}>All States</Link>
          {Object.entries(STATE_MAP).map(function (entry) {
            return <Link key={entry[0]} to={"/scoretable/" + entry[0]} style={{ display: "block", fontSize: "0.76rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: 5 }}>{entry[1].name}</Link>;
          })}
        </div>
        <div>
          <h4 style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>EvidLY</h4>
          {["Product", "Pricing", "Kitchen to Community", "Book a Demo"].map(function (l) { return <a key={l} href="#" style={{ display: "block", fontSize: "0.76rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: 5 }}>{l}</a>; })}
        </div>
        <div>
          <h4 style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Contact</h4>
          <a href="mailto:founders@getevidly.com" style={{ display: "block", fontSize: "0.76rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: 5 }}>founders@getevidly.com</a>
          <a href="tel:8553843591" style={{ display: "block", fontSize: "0.76rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: 5 }}>(855) EVIDLY1</a>
          <a href="tel:2096007675" style={{ display: "block", fontSize: "0.76rem", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>(209) 600-7675</a>
        </div>
      </div>
      <div style={{ maxWidth: 960, margin: "14px auto 0", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.25)" }}>
          &copy; 2026 EvidLY, LLC. <STLogo s="0.68rem" light /> is a free public resource.
        </span>
        <div style={{ display: "flex", gap: 14 }}>{["Privacy", "Terms", "Cookies"].map(function (l) { return <a key={l} href="#" style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>{l}</a>; })}</div>
      </div>
    </footer>
  );
}
