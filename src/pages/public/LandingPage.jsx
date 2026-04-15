import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────
// SCROLL REVEAL HOOK
// ─────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// ─────────────────────────────────────────────
// BRAND TOKENS
// ─────────────────────────────────────────────
const C = {
  navy:     "#1E2D4D",
  navyL:    "#2A3D62",
  gold:     "#A08C5A",
  goldD:    "#8A7748",
  white:    "#FFFFFF",
  cream:    "#F8F7F4",
  g1:       "#FAF7F0",
  g2:       "rgba(30,45,77,0.12)",
  g3:       "rgba(30,45,77,0.18)",
  g4:       "rgba(30,45,77,0.35)",
  g5:       "rgba(30,45,77,0.55)",
  g6:       "rgba(30,45,77,0.65)",
  g8:       "#1E2D4D",
  green:    "#16a34a",
  greenBg:  "#f0fdf4",
  red:      "#dc2626",
  redBg:    "#fef2f2",
  amber:    "#d97706",
  amberBg:  "#fffbeb",
  blue:     "#1d4ed8",
  blueBg:   "#eff6ff",
  orange:   "#c2410c",
  orangeBg: "#fff7ed",
};

const FF_SANS = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
const FF_HEAD = "'Syne',system-ui,sans-serif";
const FF_MONO = "'DM Mono','SF Mono','Fira Code',monospace";
const CALENDLY = "https://calendly.com/founders-getevidly/60min";
const FORMSPREE = "https://formspree.io/f/meeredlg";

const CA_COUNTIES = [
  "Alameda","Alpine","Amador","Butte","Calaveras","Colusa","Contra Costa",
  "Del Norte","El Dorado","Fresno","Glenn","Humboldt","Imperial","Inyo","Kern",
  "Kings","Lake","Lassen","Los Angeles","Madera","Marin","Mariposa","Mendocino",
  "Merced","Modoc","Mono","Monterey","Napa","Nevada","Orange","Placer","Plumas",
  "Riverside","Sacramento","San Benito","San Bernardino","San Diego",
  "San Francisco","San Joaquin","San Luis Obispo","San Mateo","Santa Barbara",
  "Santa Clara","Santa Cruz","Shasta","Sierra","Siskiyou","Solano","Sonoma",
  "Stanislaus","Sutter","Tehama","Trinity","Tulare","Tuolumne","Ventura",
  "Yolo","Yuba",
];

// ─────────────────────────────────────────────
// SHARED STYLE HELPERS
// ─────────────────────────────────────────────
const btn = {
  gold: {
    padding: "13px 28px", border: "none", borderRadius: 8, fontSize: "0.9rem",
    fontWeight: 700, cursor: "pointer", background: C.gold, color: C.white,
    fontFamily: FF_SANS, letterSpacing: "-0.01em", display: "inline-block",
  },
  navy: {
    padding: "13px 28px", border: "none", borderRadius: 8, fontSize: "0.9rem",
    fontWeight: 700, cursor: "pointer", background: C.navy, color: C.white,
    fontFamily: FF_SANS, letterSpacing: "-0.01em", display: "inline-block",
  },
  outline: {
    padding: "13px 28px", border: "2px solid rgba(255,255,255,0.25)", borderRadius: 8,
    fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", background: "transparent",
    color: C.white, fontFamily: FF_SANS, letterSpacing: "-0.01em", display: "inline-block",
  },
  ghost: {
    padding: "13px 28px", border: `2px solid ${C.g2}`, borderRadius: 8,
    fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", background: "transparent",
    color: C.navy, fontFamily: FF_SANS, letterSpacing: "-0.01em", display: "inline-block",
  },
};

const inp = {
  width: "100%", padding: "10px 12px", border: `1px solid ${C.g3}`,
  borderRadius: 8, fontSize: "0.875rem", boxSizing: "border-box",
  outline: "none", background: C.white, color: C.g8, fontFamily: FF_SANS,
};

const goldRule = {
  position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
  background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
};

// ─────────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────────
function Logo({ size = "1.15rem", light = false, tagline = false }) {
  const vidColor = light ? C.white : C.navy;
  const tagColor = light ? "rgba(255,255,255,0.4)" : "rgba(30,45,77,0.45)";
  return (
    <span role="img" aria-label="EvidLY" style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 2, lineHeight: 1 }}>
      <span style={{ fontWeight: 800, fontSize: size, letterSpacing: "-0.03em", fontFamily: FF_HEAD, lineHeight: 1 }}>
        <span style={{ color: C.gold }}>E</span>
        <span style={{ color: vidColor }}>vid</span>
        <span style={{ color: C.gold }}>LY</span>
      </span>
      {tagline && (
        <span style={{ fontSize: `calc(${size} * 0.26)`, fontWeight: 500, letterSpacing: "0.2em", color: tagColor, textTransform: "uppercase", lineHeight: 1, fontFamily: FF_MONO, whiteSpace: "nowrap" }}>
          Answers before you ask.
        </span>
      )}
    </span>
  );
}

function Eyebrow({ children, light = false }) {
  return (
    <div style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: light ? "rgba(255,255,255,0.4)" : C.gold, marginBottom: 12, fontFamily: FF_MONO }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// FOUNDER URGENCY COUNTDOWN
// ─────────────────────────────────────────────
function FounderUrgency({ deadline = "2026-08-07" }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const end = new Date(deadline + "T23:59:59");
  const diff = Math.max(0, end - now);
  const dd = Math.floor(diff / 86400000);
  const hh = Math.floor((diff % 86400000) / 3600000);
  const mm = Math.floor((diff % 3600000) / 60000);
  const ss = Math.floor((diff % 60000) / 1000);
  const expired = diff === 0;
  const urgent = dd <= 7;
  const accent = urgent ? "#ef4444" : C.gold;
  return (
    <div style={{ background: C.navy, borderRadius: 12, padding: "18px 22px", border: `1px solid ${urgent ? "rgba(239,68,68,0.35)" : "rgba(160,140,90,0.25)"}`, position: "relative", overflow: "hidden", marginBottom: 0 }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
      <div style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginBottom: 10, textAlign: "center", fontFamily: FF_SANS }}>
        {expired ? "Founder Pricing Has Ended" : urgent ? "Almost Gone — Founder Pricing" : "Founder Pricing Window Open"}
      </div>
      {expired ? (
        <p style={{ textAlign: "center", fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", margin: 0 }}>
          This window has closed.{" "}
          <a href="mailto:founders@getevidly.com" style={{ color: C.gold }}>Contact us</a> for current rates.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginBottom: 6, fontFamily: FF_SANS }}>Expires August 7, 2026</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {[[dd, "Days"], [hh, "Hrs"], [mm, "Min"], [ss, "Sec"]].map(([val, label]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: "1.4rem", color: C.white, lineHeight: 1, fontVariantNumeric: "tabular-nums", minWidth: 34, fontFamily: FF_SANS }}>{String(val).padStart(2, "0")}</div>
                  <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FF_SANS }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <p style={{ textAlign: "center", fontSize: "0.7rem", color: "rgba(255,255,255,0.22)", marginTop: 10, marginBottom: 0, fontFamily: FF_SANS }}>
        $99/mo first location + $49/mo per additional (up to 10), locked for life. After August 7 — standard rates apply.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// TOUR MODAL
// ─────────────────────────────────────────────
function TourModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ first: "", last: "", email: "", company: "", county: "", locations: "1", challenge: "" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(false);
  const ready = form.first && form.email && form.company && form.county;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit() {
    if (!ready) return;
    setSubmitting(true); setErr(false);
    try {
      const r = await fetch(FORMSPREE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name: form.first + " " + form.last, email: form.email, company: form.company, county: form.county, locations: form.locations, challenge: form.challenge, _subject: "[EvidLY] Guided Tour — " + form.company }),
      });
      if (r.ok) setStep(2); else setErr(true);
    } catch { setErr(true); }
    setSubmitting(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 16, maxWidth: 460, width: "100%", position: "relative", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.g4, lineHeight: 1, zIndex: 1 }}>×</button>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.g2}` }}>
          {["1  Your details", "2  Pick your time"].map((label, i) => {
            const active = step === i + 1;
            const done = step > i + 1;
            return (
              <div key={i} style={{ flex: 1, padding: "12px 16px", textAlign: "center", fontSize: "0.72rem", fontWeight: 700, fontFamily: FF_SANS, color: active ? C.navy : done ? C.green : C.g4, borderBottom: `2px solid ${active ? C.navy : done ? C.green : "transparent"}`, transition: "all 0.2s" }}>
                {done ? "✓ " + label.slice(2) : label}
              </div>
            );
          })}
        </div>
        {step === 1 && (
          <div style={{ padding: "28px 28px 24px" }}>
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ fontWeight: 800, color: C.navy, fontSize: "1.1rem", margin: "0 0 5px", fontFamily: FF_HEAD, letterSpacing: "-0.02em" }}>Book a Guided Tour</h3>
              <p style={{ fontSize: "0.82rem", color: C.g5, margin: 0, fontFamily: FF_SANS, lineHeight: 1.6 }}>Tell us about your operation and we'll align your jurisdictions before we meet. When you join the tour, your county's grading method, thresholds, and risk picture are already configured for you.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <Field label="First Name *"><input value={form.first} onChange={set("first")} style={inp} placeholder="Jane" /></Field>
              <Field label="Last Name"><input value={form.last} onChange={set("last")} style={inp} placeholder="Kim" /></Field>
            </div>
            <Field label="Email *" mb={10}><input value={form.email} onChange={set("email")} style={inp} placeholder="jane@restaurant.com" type="email" /></Field>
            <Field label="Business Name *" mb={10}><input value={form.company} onChange={set("company")} style={inp} placeholder="Pacific Kitchen Group" /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <Field label="County *">
                <select value={form.county} onChange={set("county")} style={inp}>
                  <option value="">Select county…</option>
                  {CA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Locations">
                <select value={form.locations} onChange={set("locations")} style={inp}>
                  <option>1</option><option>2–5</option><option>6–10</option><option>11+</option>
                </select>
              </Field>
            </div>
            <Field label="Biggest compliance challenge right now?" mb={18}>
              <textarea value={form.challenge} onChange={set("challenge")} style={{ ...inp, minHeight: 64, resize: "vertical", fontFamily: FF_SANS }} placeholder="e.g. Inspection prep, temp tracking, knowing where we stand…" />
            </Field>
            <button className="btn-lift" disabled={!ready || submitting} onClick={submit} style={{ ...btn.navy, width: "100%", fontSize: "0.9rem", padding: "14px", opacity: ready && !submitting ? 1 : 0.4, borderRadius: 10 }}>
              {submitting ? "Sending…" : "Submit & Pick a Time →"}
            </button>
            {err && <p style={{ fontSize: "0.75rem", color: C.red, textAlign: "center", marginTop: 8, fontFamily: FF_SANS }}>Something went wrong — email us at <a href="mailto:founders@getevidly.com" style={{ color: C.red }}>founders@getevidly.com</a></p>}
            <p style={{ fontSize: "0.7rem", color: C.g4, textAlign: "center", marginTop: 8, fontFamily: FF_SANS }}>Goes directly to the EvidLY team. No auto-responders.</p>
          </div>
        )}
        {step === 2 && (
          <div style={{ padding: "40px 28px", textAlign: "center" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: 12 }}>✅</div>
            <h3 style={{ fontWeight: 800, color: C.navy, fontSize: "1.1rem", margin: "0 0 8px", fontFamily: FF_HEAD, letterSpacing: "-0.02em" }}>You're all set — pick your time.</h3>
            <p style={{ fontSize: "0.84rem", color: C.g5, marginBottom: 22, lineHeight: 1.7, fontFamily: FF_SANS }}>We received your details. Choose a time that works for you.</p>
            <div style={{ background: C.cream, borderRadius: 10, border: `1px solid ${C.g2}`, padding: "14px 16px", marginBottom: 16 }}>
              <p style={{ fontSize: "0.82rem", color: C.navy, fontWeight: 700, margin: "0 0 4px", fontFamily: FF_SANS }}>Your jurisdictions are being aligned.</p>
              <p style={{ fontSize: "0.78rem", color: C.g5, margin: 0, fontFamily: FF_SANS, lineHeight: 1.6 }}>When you join the tour, <strong>{form.county ? form.county + " County" : "your county"}</strong> will already be loaded — your grading method, your thresholds, your risk picture, live.</p>
            </div>
            <a href={CALENDLY} target="_blank" rel="noreferrer" style={{ display: "block", width: "100%", padding: "14px", background: C.gold, color: C.white, borderRadius: 8, fontWeight: 700, fontSize: "0.92rem", textAlign: "center", textDecoration: "none", fontFamily: FF_SANS, boxSizing: "border-box", marginBottom: 12 }}>Pick a Time on Calendly →</a>
            <p style={{ fontSize: "0.72rem", color: C.g4, fontFamily: FF_SANS }}>Questions? <a href="mailto:founders@getevidly.com" style={{ color: C.navy, fontWeight: 600 }}>founders@getevidly.com</a></p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, mb = 0 }) {
  return (
    <div style={{ marginBottom: mb || 10 }}>
      <label style={{ fontSize: "0.7rem", fontWeight: 700, color: C.g5, display: "block", marginBottom: 4, fontFamily: FF_SANS, letterSpacing: "0.02em" }}>{label}</label>
      {children}
    </div>
  );
}

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────
function NavBar({ onTour, onIRR }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  const NAV = [["How It Works", "how-it-works"], ["Coverage", "coverage"], ["Pricing", "pricing"]];
  return (
    <header style={{ background: scrolled ? "rgba(255,255,255,0.95)" : C.white, backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: `1px solid ${scrolled ? "rgba(231,229,228,0.6)" : C.g2}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 100, transition: "all 0.3s ease" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", height: 68, gap: 12 }}>
        <a href="/" style={{ textDecoration: "none", marginRight: 20, flexShrink: 0 }}><Logo size="1.45rem" tagline /></a>
        <nav className="nav-desktop" style={{ display: "flex", gap: 28, flex: 1, alignItems: "center" }}>
          {NAV.map(([label, id]) => (
            <button key={label} className="nav-link gold-line" onClick={() => scrollTo(id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.g5, fontWeight: 600, fontSize: "0.84rem", fontFamily: FF_SANS, whiteSpace: "nowrap", padding: "4px 0", letterSpacing: "-0.01em" }}>{label}</button>
          ))}
        </nav>
        <div style={{ flexShrink: 0, display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn-lift" onClick={onIRR} style={{ background: C.gold, border: "none", color: C.white, borderRadius: 8, padding: "10px 22px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: FF_SANS, whiteSpace: "nowrap" }}>Free Operations Check</button>
          <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Open menu" style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 4px", display: "flex", flexDirection: "column", gap: 5, marginLeft: 4 }}>
            <span style={{ width: 20, height: 2, background: open ? C.gold : C.g4, borderRadius: 1, display: "block", transition: "all 0.2s" }} />
            <span style={{ width: 20, height: 2, background: open ? C.gold : C.g4, borderRadius: 1, display: "block", transition: "all 0.2s" }} />
            <span style={{ width: 20, height: 2, background: open ? C.gold : C.g4, borderRadius: 1, display: "block", transition: "all 0.2s" }} />
          </button>
        </div>
      </div>
      {open && (
        <div style={{ background: C.white, borderTop: `1px solid ${C.g2}`, padding: "10px 24px 18px" }}>
          {NAV.map(([label, id]) => (
            <button key={label} onClick={() => { setOpen(false); scrollTo(id); }} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "11px 0", fontSize: "0.9rem", color: C.g6, borderBottom: `1px solid ${C.g1}`, fontWeight: 500, fontFamily: FF_SANS }}>{label}</button>
          ))}
          <button className="btn-lift" onClick={() => { setOpen(false); onIRR(); }} style={{ ...btn.gold, width: "100%", marginTop: 14, padding: "13px", fontSize: "0.9rem" }}>Free Operations Check →</button>
        </div>
      )}
    </header>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD MOCKUP (product visual)
// ─────────────────────────────────────────────
function DashboardMockup() {
  const W = "rgba(255,255,255,";
  const pill = (label, val, color, bg, delay) => (
    <div className={`dash-item dash-item-d${delay}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: bg, border: `1px solid ${W}0.06)` }}>
      <span style={{ fontSize: "0.62rem", color: W + "0.5)", fontFamily: FF_SANS, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: "0.62rem", fontWeight: 700, color, fontFamily: FF_MONO }}>{val}</span>
    </div>
  );
  return (
    <div className="dash-float dash-mockup" style={{ width: "100%", maxWidth: 340, borderRadius: 14, overflow: "hidden", background: "rgba(15,24,42,0.85)", border: `1px solid ${W}0.08)`, boxShadow: "0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)", backdropFilter: "blur(20px)" }}>
      {/* Title bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${W}0.06)`, gap: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#28c840" }} />
        <span style={{ flex: 1, textAlign: "center", fontSize: "0.55rem", color: W + "0.25)", fontFamily: FF_SANS }}>EvidLY — Downtown Kitchen</span>
      </div>

      <div style={{ padding: "16px 16px 14px" }}>
        {/* Score + grade row */}
        <div className="dash-item dash-item-d1" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          {/* SVG ring gauge */}
          <svg viewBox="0 0 80 80" width={72} height={72} style={{ flexShrink: 0 }}>
            <circle cx="40" cy="40" r="33" fill="none" stroke={W + "0.06)"} strokeWidth="5" />
            <circle className="score-ring" cx="40" cy="40" r="33" fill="none" stroke={C.gold} strokeWidth="5" strokeLinecap="round" transform="rotate(-90 40 40)" style={{ filter: "drop-shadow(0 0 6px rgba(160,140,90,0.3))" }} />
            <text x="40" y="36" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="20" fontWeight="800" fontFamily="'Syne',system-ui">{91}</text>
            <text x="40" y="52" textAnchor="middle" fill={W + "0.35)"} fontSize="5.5" fontFamily="system-ui">Compliance</text>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <div className="pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
              <span style={{ fontSize: "0.6rem", color: C.green, fontWeight: 700, fontFamily: FF_SANS }}>All Systems Normal</span>
            </div>
            <div style={{ fontSize: "0.56rem", color: W + "0.3)", fontFamily: FF_SANS, lineHeight: 1.5 }}>
              Los Angeles County · Grade A
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
              <span style={{ fontSize: "0.5rem", padding: "2px 7px", borderRadius: 4, background: "rgba(22,163,74,0.15)", color: "#4ade80", fontFamily: FF_MONO, fontWeight: 600 }}>Food 94</span>
              <span style={{ fontSize: "0.5rem", padding: "2px 7px", borderRadius: 4, background: "rgba(160,140,90,0.15)", color: C.gold, fontFamily: FF_MONO, fontWeight: 600 }}>Facility 87</span>
            </div>
          </div>
        </div>

        {/* Temperature readings */}
        <div className="dash-item dash-item-d2" style={{ fontSize: "0.55rem", fontWeight: 700, color: W + "0.22)", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: FF_MONO, marginBottom: 6 }}>Current Readings</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 12 }}>
          {pill("Walk-in #1", "38°F", "#4ade80", "rgba(22,163,74,0.08)", 3)}
          {pill("Walk-in #2", "36°F", "#4ade80", "rgba(22,163,74,0.08)", 3)}
          {pill("Prep Line", "40°F", "#4ade80", "rgba(22,163,74,0.08)", 4)}
          {pill("Freezer", "-2°F", "#4ade80", "rgba(22,163,74,0.08)", 4)}
        </div>

        {/* Mini trend chart */}
        <div className="dash-item dash-item-d5" style={{ background: W + "0.03)", borderRadius: 8, padding: "10px 12px", border: `1px solid ${W}0.05)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: "0.55rem", fontWeight: 700, color: W + "0.22)", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: FF_MONO }}>7-Day Trend</span>
            <span style={{ fontSize: "0.5rem", color: C.green, fontFamily: FF_MONO, fontWeight: 600 }}>+3 pts</span>
          </div>
          <svg viewBox="0 0 200 40" width="100%" height={36} style={{ display: "block" }}>
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.gold} stopOpacity="0.2" />
                <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,32 L33,26 L66,28 L100,18 L133,20 L166,12 L200,14 L200,40 L0,40 Z" fill="url(#cg)" />
            <polyline className="chart-draw" points="0,32 33,26 66,28 100,18 133,20 166,12 200,14" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 4px rgba(160,140,90,0.4))" }} />
            {[[0,32],[33,26],[66,28],[100,18],[133,20],[166,12],[200,14]].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r="2.5" fill={C.gold} stroke="rgba(15,24,42,0.8)" strokeWidth="1" />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────
function HeroSection({ onTour, onIRR }) {
  return (
    <section className="hero-gradient" style={{ padding: "80px 24px 72px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 20% 50%, rgba(160,140,90,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(160,140,90,0.04) 0%, transparent 40%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize: "56px 56px", pointerEvents: "none" }} />
      <div style={goldRule} />
      <div className="hero-split" style={{ maxWidth: 1080, margin: "0 auto", position: "relative", display: "flex", alignItems: "center", gap: 48 }}>
        {/* Left: text */}
        <div className="hero-text" style={{ flex: "1 1 0%", textAlign: "left", minWidth: 0 }}>
          <div className="hero-animate" style={{ display: "inline-block", padding: "5px 18px", background: "rgba(160,140,90,0.12)", border: "1px solid rgba(160,140,90,0.25)", borderRadius: 100, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.gold, marginBottom: 24, fontFamily: FF_MONO }}>
            California's Operations Intelligence Platform
          </div>
          <h1 className="hero-animate hero-animate-d1" style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800, lineHeight: 1.05, margin: "0 0 22px", color: C.white, fontFamily: FF_HEAD, letterSpacing: "-0.03em" }}>
            Know where your operation stands.{" "}
            <span style={{ color: C.gold }}>Before anyone else does.</span>
          </h1>
          <p className="hero-animate hero-animate-d2" style={{ fontSize: "1.02rem", color: "rgba(255,255,255,0.5)", maxWidth: 480, margin: "0 0 36px", lineHeight: 1.8, fontFamily: FF_SANS, letterSpacing: "-0.01em" }}>
            Food safety and fire safety — scored against your county's actual grading method. Every operational signal translated into revenue, liability, cost, and workforce risk.
          </p>
          <div className="hero-animate hero-animate-d3 hero-ctas" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn-lift" onClick={onIRR} style={{ ...btn.gold, padding: "15px 32px", fontSize: "0.97rem", borderRadius: 10 }}>Free Operations Check →</button>
            <button className="btn-lift" onClick={onTour} style={{ ...btn.outline, padding: "15px 28px", fontSize: "0.9rem", borderRadius: 10 }}>Book a Guided Tour →</button>
          </div>
          <p className="hero-animate hero-animate-d3" style={{ marginTop: 20, fontSize: "0.74rem", color: "rgba(255,255,255,0.18)", fontFamily: FF_SANS }}>Serving 300+ commercial kitchens per year across California</p>
        </div>
        {/* Right: product visual */}
        <div className="hero-animate hero-animate-d2" style={{ flexShrink: 0, width: 340 }}>
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// IRR ABOVE FOLD
// ─────────────────────────────────────────────
function IRRAboveFold({ onIRR }) {
  return (
    <section style={{ background: C.navy, padding: "52px 24px", position: "relative", overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 70% 50%, rgba(160,140,90,0.05) 0%, transparent 50%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
      <div style={{ maxWidth: 700, margin: "0 auto", position: "relative", display: "flex", alignItems: "center", gap: 36, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ flex: "1 1 300px", textAlign: "left" }}>
          <div style={{ display: "inline-block", padding: "3px 14px", background: "rgba(160,140,90,0.12)", border: "1px solid rgba(160,140,90,0.25)", borderRadius: 100, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.gold, marginBottom: 14, fontFamily: FF_MONO }}>Free · 2 Minutes</div>
          <h2 style={{ fontSize: "clamp(1.2rem, 3vw, 1.5rem)", fontWeight: 800, color: C.white, margin: "0 0 10px", lineHeight: 1.2, letterSpacing: "-0.02em", fontFamily: FF_HEAD }}>
            See how your operation is running{" "}<span style={{ color: C.gold }}>— right now.</span>
          </h2>
          <p style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.42)", margin: 0, lineHeight: 1.7, fontFamily: FF_SANS }}>11 questions. Every risk in dollars. Takes 2 minutes — no account needed.</p>
        </div>
        <div style={{ flexShrink: 0, textAlign: "center" }}>
          <button className="btn-lift" onClick={onIRR} style={{ ...btn.gold, padding: "14px 30px", fontSize: "0.92rem", display: "block", marginBottom: 10, borderRadius: 10 }}>Get My Free Operations Check →</button>
          <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.2)", margin: 0, fontFamily: FF_SANS }}>Serving 300+ commercial kitchens per year</p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// ANIMATED COUNTER
// ─────────────────────────────────────────────
function AnimatedCounter({ end, suffix = "", duration = 1800 }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) {
        setStarted(true);
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setCount(Math.floor(ease * end));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration, started]);
  return <span ref={ref}>{count}{suffix}</span>;
}

// ─────────────────────────────────────────────
// PLATFORM STATS HOOK (SOCIAL-PROOF-01)
// ─────────────────────────────────────────────
function usePlatformStats() {
  const [stats, setStats] = useState({ kitchens: 300, jurisdictions: 62, tempLogs: 45000, checklistsCompleted: 12000 });
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url) return;
    fetch(`${url}/functions/v1/platform-stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.kitchens) setStats(d); })
      .catch(() => { /* keep fallback */ });
  }, []);
  return stats;
}

// ─────────────────────────────────────────────
// TRUST BAR
// ─────────────────────────────────────────────
function TrustBar() {
  const stats = usePlatformStats();
  return (
    <section style={{ background: "#283f6a", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "26px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 36, flexWrap: "wrap" }}>
        {/* Animated stat counters */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 500, color: C.gold, lineHeight: 1, fontFamily: FF_MONO, letterSpacing: "-0.02em" }}>
            <AnimatedCounter end={stats.kitchens} suffix="+" />
          </div>
          <div style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.35)", marginTop: 4, fontFamily: FF_SANS, letterSpacing: "0.02em" }}>Commercial kitchens</div>
        </div>
        <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 500, color: C.gold, lineHeight: 1, fontFamily: FF_MONO, letterSpacing: "-0.02em" }}>
            <AnimatedCounter end={stats.jurisdictions} />
          </div>
          <div style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.35)", marginTop: 4, fontFamily: FF_SANS, letterSpacing: "0.02em" }}>California jurisdictions</div>
        </div>
        <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 500, color: C.gold, lineHeight: 1, fontFamily: FF_MONO, letterSpacing: "-0.02em" }}>
            <AnimatedCounter end={stats.tempLogs} suffix="+" />
          </div>
          <div style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.35)", marginTop: 4, fontFamily: FF_SANS, letterSpacing: "0.02em" }}>Temperature logs</div>
        </div>
        <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 500, color: C.gold, lineHeight: 1, fontFamily: FF_MONO, letterSpacing: "-0.02em" }}>
            <AnimatedCounter end={stats.checklistsCompleted} suffix="+" />
          </div>
          <div style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.35)", marginTop: 4, fontFamily: FF_SANS, letterSpacing: "0.02em" }}>Checklists completed</div>
        </div>
        <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", fontFamily: FF_SANS, letterSpacing: "0.02em" }}>IKECA Certified · Veteran-Owned</div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────────────
function StepIcon({ step }) {
  const s = { width: 56, height: 56, display: "block" };
  if (step === 0) return (
    <svg viewBox="0 0 56 56" style={s}>
      <rect x="8" y="12" width="40" height="32" rx="4" fill="none" stroke={C.navy} strokeWidth="1.5" opacity="0.15" />
      <circle cx="28" cy="24" r="6" fill="none" stroke={C.gold} strokeWidth="1.5" />
      <path d="M22 36 L28 30 L34 36" fill="none" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="28" cy="24" r="2" fill={C.gold} />
    </svg>
  );
  if (step === 1) return (
    <svg viewBox="0 0 56 56" style={s}>
      <rect x="12" y="10" width="32" height="36" rx="3" fill="none" stroke={C.navy} strokeWidth="1.5" opacity="0.15" />
      <line x1="18" y1="20" x2="26" y2="20" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="26" x2="32" y2="26" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="18" y1="32" x2="30" y2="32" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <polyline points="34,19 36,21 40,17" fill="none" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="37" cy="28" r="4" fill="none" stroke={C.green} strokeWidth="1" opacity="0.3" />
    </svg>
  );
  return (
    <svg viewBox="0 0 56 56" style={s}>
      <circle cx="28" cy="28" r="16" fill="none" stroke={C.navy} strokeWidth="1.5" opacity="0.15" />
      <path d="M16 34 L22 28 L28 32 L34 20 L40 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="40" cy="24" r="3" fill={C.gold} opacity="0.3" />
      <circle cx="40" cy="24" r="1.5" fill={C.gold} />
    </svg>
  );
}

function HowItWorksSection({ onTour }) {
  const steps = [
    { num: "01", title: "Connect your county", body: "We load your jurisdiction's actual grading method — weights, thresholds, and passing criteria — so your data is scored the way your inspector scores it." },
    { num: "02", title: "Log your operations", body: "Temperatures, checklists, certifications, vendor documents, hood cleaning records. Everything in one place, updated in real time by your team." },
    { num: "03", title: "Know where you stand", body: "See your operational picture before anyone else does. Every signal becomes a dollar figure — what's at risk, what's exposed, and what it's costing you right now." },
  ];
  return (
    <section id="how-it-works" style={{ padding: "96px 24px", background: C.white }}>
      <div className="reveal" style={{ maxWidth: 940, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <Eyebrow>How It Works</Eyebrow>
          <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 800, color: C.navy, margin: "0 0 12px", fontFamily: FF_HEAD, letterSpacing: "-0.03em" }}>From your county to your dashboard in minutes.</h2>
          <p style={{ fontSize: "0.92rem", color: C.g5, maxWidth: 480, margin: "0 auto", fontFamily: FF_SANS, lineHeight: 1.75 }}>No manual setup. No generic checklists. EvidLY uses your jurisdiction's real scoring logic from day one.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 6 }}>
          {steps.map((s, i) => (
            <div key={i} className={`card-lift reveal reveal-d${i+1}`} style={{ padding: "36px 30px", background: i % 2 === 0 ? C.cream : C.white, borderRadius: 16, border: `1px solid ${C.g2}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <StepIcon step={i} />
                <div style={{ fontSize: "2.2rem", fontWeight: 500, color: C.g2, lineHeight: 1, fontFamily: FF_MONO }}>{s.num}</div>
              </div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: C.navy, margin: "0 0 10px", fontFamily: FF_HEAD, letterSpacing: "-0.02em" }}>{s.title}</h3>
              <p style={{ fontSize: "0.86rem", color: C.g5, margin: 0, lineHeight: 1.75, fontFamily: FF_SANS }}>{s.body}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 44 }}>
          <button className="btn-lift" onClick={onTour} style={{ ...btn.navy, padding: "14px 32px", borderRadius: 10 }}>See It Live on Your County →</button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// COVERAGE
// ─────────────────────────────────────────────
function CoverageSection() {
  const pillars = [
    { label: "Food Safety", icon: "🌡️", color: C.navy, items: ["Temperature monitoring — receiving, holding, cooling, all tracked", "HACCP documentation built automatically from daily logs", "Food handler cards and ServSafe certs — always current", "Morning and closing checklists mapped to CalCode conditions", "Receiving logs with vendor history and rejection tracking"] },
    { label: "Fire Safety", icon: "🔥", color: C.gold, items: ["Hood cleaning schedules per NFPA 96-2024 Table 12.4 frequencies", "Fire suppression inspection records and due-date alerts", "Extinguisher documentation and service history", "Vendor compliance — certs, insurance, service records", "Equipment calibration logs and maintenance tracking"] },
  ];
  return (
    <section id="coverage" style={{ padding: "96px 24px", background: C.cream }}>
      <div className="reveal" style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <Eyebrow>What's Covered</Eyebrow>
          <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 800, color: C.navy, margin: "0 0 12px", fontFamily: FF_HEAD, letterSpacing: "-0.03em" }}>Food safety and fire safety.<br />One platform.</h2>
          <p style={{ fontSize: "0.92rem", color: C.g5, maxWidth: 460, margin: "0 auto", fontFamily: FF_SANS, lineHeight: 1.75 }}>EvidLY shows you what your county expects for food safety and fire safety. Both authorities. Mapped to your specific county. So the ordinary is handled — and you're free to build as high as you want.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {pillars.map((p, i) => (
            <div key={p.label} className={`card-lift reveal reveal-d${i+1}`} style={{ background: C.white, borderRadius: 18, padding: "34px 28px", border: '1px solid rgba(160,140,90,0.3)' }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                <span style={{ fontSize: "1.4rem" }}>{p.icon}</span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: p.color, margin: 0, fontFamily: FF_HEAD, letterSpacing: "-0.02em" }}>{p.label}</h3>
              </div>
              {p.items.map((item) => (
                <div key={item} style={{ display: "flex", gap: 10, marginBottom: 12, fontSize: "0.85rem", color: C.g6, lineHeight: 1.6, fontFamily: FF_SANS }}>
                  <span style={{ color: p.color, flexShrink: 0, fontWeight: 700 }}>✓</span>{item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// OPERATIONS INTELLIGENCE ENGINE
// ─────────────────────────────────────────────
function IntelligenceSection({ onTour }) {
  const pillars = [
    {
      icon: "📈", label: "Revenue Protected", startingState: "Revenue at Risk",
      color: C.orange, bg: C.orangeBg, bd: "#fdba74", tx: "#7c2d12",
      headline: "Without visibility, revenue loss happens before you can respond.",
      points: ["Temporary closure averages $12,000–$18,000 in lost revenue per event", "Inspection results are posted publicly before you can respond", "Repeat violations trigger more frequent inspections — compounding exposure"],
    },
    {
      icon: "🛡️", label: "Liability Covered", startingState: "Liability Uncovered",
      color: "#991B1B", bg: C.redBg, bd: "#fca5a5", tx: "#7f1d1d",
      headline: "Documentation gaps are your biggest legal exposure — and the easiest to close.",
      points: ["Foodborne illness without documentation logs = presumed negligence", "Fire suppression gaps create premises liability beyond CalCode", "Protective Safeguards Endorsement (PSE) gaps may affect your coverage — consult your carrier"],
    },
    {
      icon: "💡", label: "Costs Controlled", startingState: "Costs Unpredictable",
      color: C.blue, bg: C.blueBg, bd: "#93c5fd", tx: "#1e3a8a",
      headline: "Reactive maintenance costs 2–3× what scheduled maintenance costs.",
      points: ["Emergency hood cleaning runs 2–3× the cost of a scheduled visit", "Reinspection fees: $200–$500 per visit depending on jurisdiction", "Expired certifications mean rushed replacements at premium pricing"],
    },
    {
      icon: "✅", label: "Always Ready", startingState: "Operations Challenged",
      color: "#166534", bg: "#f0fdf4", bd: "#86efac", tx: "#14532d",
      headline: "Documentation gaps always show up at the worst possible moment.",
      points: ["Missing vendor records block your ability to prove due diligence", "Unscheduled equipment downtime from missed calibration logs", "Reinspection window shrinks when corrective actions aren't documented"],
    },
    {
      icon: "👥", label: "Team Current", startingState: "Workforce Uncertified",
      color: "#6B21A8", bg: "#faf5ff", bd: "#d8b4fe", tx: "#581c87",
      headline: "Expired certifications are among the most cited violations in California.",
      points: ["Missing CFPM coverage = immediate critical violation in any CA jurisdiction", "Food handler card gaps expose you to per-employee fines at reinspection", "Staff turnover without onboarding tracking leaves invisible certification holes"],
    },
  ];

  function PillarCard({ p }) {
    return (
      <div className="card-lift" style={{ background: p.bg, borderRadius: 16, border: `1px solid ${p.bd}`, borderLeft: `4px solid ${p.color}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${p.bd}`, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.1rem" }}>{p.icon}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 600, color: p.color, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FF_SANS, lineHeight: 1 }}>{p.startingState}</span>
            <span style={{ fontWeight: 800, fontSize: "0.92rem", color: p.color, fontFamily: FF_SANS, lineHeight: 1.15 }}>{p.label}</span>
          </div>
        </div>
        <div style={{ padding: "16px 18px", flex: 1 }}>
          <p style={{ fontSize: "0.84rem", fontWeight: 700, color: p.tx, margin: "0 0 12px", lineHeight: 1.5, fontFamily: FF_SANS }}>{p.headline}</p>
          {p.points.map((pt) => (
            <div key={pt} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: "0.78rem", color: p.tx, lineHeight: 1.5, fontFamily: FF_SANS }}>
              <span style={{ color: p.color, flexShrink: 0, fontWeight: 700 }}>→</span>{pt}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section style={{ padding: "96px 24px", background: C.white }}>
      <div className="reveal" style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ display: "inline-block", padding: "5px 18px", background: "rgba(160,140,90,0.08)", border: "1px solid rgba(160,140,90,0.2)", borderRadius: 100, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.goldD, marginBottom: 16, fontFamily: FF_MONO }}>Operations Intelligence Engine</div>
          <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 800, color: C.navy, margin: "0 0 14px", fontFamily: FF_HEAD, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
            Every signal, from where you are<br /><span style={{ color: C.gold }}>to where you need to be.</span>
          </h2>
          <p style={{ fontSize: "0.92rem", color: C.g5, maxWidth: 520, margin: "0 auto", fontFamily: FF_SANS, lineHeight: 1.75 }}>
            Most operators don't know where they stand until someone tells them. EvidLY gives you that picture first — every operational signal translated into what it means financially, before it becomes a problem.
          </p>
        </div>
        <div className="intel-row1" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
          {pillars.slice(0, 3).map((p) => <PillarCard key={p.label} p={p} />)}
        </div>
        <div className="intel-row2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, maxWidth: 670, margin: "0 auto" }}>
          {pillars.slice(3).map((p) => <PillarCard key={p.label} p={p} />)}
        </div>
        <div style={{ marginTop: 32, background: C.cream, borderRadius: 12, border: `1px solid ${C.g2}`, padding: "16px 20px" }}>
          <p style={{ fontSize: "0.75rem", color: C.g5, margin: 0, textAlign: "center", lineHeight: 1.6, fontStyle: "italic", fontFamily: FF_SANS }}>
            Revenue and liability figures are general estimates based on publicly available industry data. PSE/insurance impacts vary by carrier, policy, and jurisdiction — consult your carrier and legal counsel regarding your specific coverage.
          </p>
        </div>
        <div style={{ textAlign: "center", marginTop: 36 }}>
          <button className="btn-lift" onClick={onTour} style={{ ...btn.gold, padding: "14px 32px", borderRadius: 10 }}>See Your Operation's Full Picture →</button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// WHO WE ARE
// ─────────────────────────────────────────────
function FoundersSection() {
  return (
    <section style={{ padding: "96px 24px", background: C.cream, borderTop: `1px solid ${C.g2}` }}>
      <div className="reveal" style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
        <Eyebrow>The Mirror</Eyebrow>
        <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 800, color: C.navy, margin: "0 0 24px", fontFamily: FF_HEAD, letterSpacing: "-0.03em" }}>Every choice you've made has set the standard.</h2>
        <p style={{ fontSize: "0.94rem", color: C.g6, lineHeight: 1.85, margin: "0 0 18px", fontFamily: FF_SANS }}>The equipment you invested in. The vendors you vetted. The team you built. The kitchen you run — none of it was accidental.</p>
        <p style={{ fontSize: "0.94rem", color: C.g6, lineHeight: 1.85, margin: "0 0 40px", fontFamily: FF_SANS }}>EvidLY exists because someone who runs a kitchen like yours shouldn't have to wonder whether the ordinary is handled. You should know. That's the whole point.</p>
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.g2}`, padding: "30px 36px" }}>
          <p style={{ fontSize: "1.05rem", fontWeight: 700, color: C.navy, lineHeight: 1.7, margin: 0, fontFamily: FF_HEAD, fontStyle: "italic", letterSpacing: "-0.01em" }}>"The greatest measure of EvidLY isn't what it shows you. It's the confidence you have when the ordinary is already handled."</p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// CREDIBILITY / BIO
// ─────────────────────────────────────────────
function CredibilitySection() {
  return (
    <section style={{ padding: "96px 24px", background: C.white }}>
      <div className="reveal" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Eyebrow>Who Built This</Eyebrow>
          <h2 style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 800, color: C.navy, margin: "0 0 16px", fontFamily: FF_HEAD, letterSpacing: "-0.03em" }}>This didn't come from a boardroom.</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <p style={{ fontSize: "0.92rem", color: C.g6, lineHeight: 1.85, margin: 0, fontFamily: FF_SANS }}>Arthur Haggerty spent 25 years in enterprise IT and cybersecurity — consulting for Deloitte, Cisco, and Dell Technologies, serving clients like American Airlines, Boeing, Burger King, Chase, Netflix, and the NFL. He holds a Master's in Information Technology and is a United States Air Force veteran.</p>
          <p style={{ fontSize: "0.92rem", color: C.g6, lineHeight: 1.85, margin: 0, fontFamily: FF_SANS }}>Then he built Cleaning Pros Plus from the ground up. IKECA certified. CECS. CESI in progress. PECT. Over 300 commercial kitchen exhaust systems cleaned every year. Clients include Cintas, Aramark, and Yosemite National Park — three separate accounts, three different standards, all met.</p>
          <p style={{ fontSize: "0.92rem", color: C.g6, lineHeight: 1.85, margin: 0, fontFamily: FF_SANS }}>EvidLY was built by someone who's cleaned the hoods and read the code. We didn't guess what kitchen leaders need — we've been standing in the kitchen next to them for years.</p>
        </div>
        <div style={{ textAlign: "center", marginTop: 36 }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: C.navy, fontFamily: FF_HEAD, fontStyle: "italic", letterSpacing: "-0.01em" }}>"Cleaning Pros Plus is the hands. EvidLY is the eyes."</p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FEATURE LIST
// ─────────────────────────────────────────────
function FeatureList({ items, check = C.gold }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", marginBottom: 20 }}>
      {items.map((f) => (
        <div key={f} style={{ display: "flex", gap: 8, fontSize: "0.82rem", color: C.g6, fontFamily: FF_SANS, lineHeight: 1.5 }}>
          <span style={{ color: check, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────
function PricingSection({ onTour, onIRR }) {
  const founderFeatures = [
    "1–10 locations, all on one dashboard",
    "Each location scored against its own county",
    "Food safety and fire safety in one place",
    "Your whole team included, no per-seat cost",
    "Know how your operation stands — every day",
    "This price is yours forever — never increases",
    "45-day satisfaction guarantee",
  ];
  const enterpriseFeatures = ["Every location visible in one place", "Each location scored against its own jurisdiction", "Custom branding and API access available", "No per-seat limits — scales with you", "Dedicated account support", "Pricing built around your operation"];
  return (
    <section id="pricing" style={{ padding: "96px 24px", background: C.white }}>
      <div className="reveal" style={{ maxWidth: 840, margin: "0 auto", textAlign: "center" }}>
        <Eyebrow>Pricing</Eyebrow>
        <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 800, color: C.navy, margin: "0 0 12px", fontFamily: FF_HEAD, letterSpacing: "-0.03em" }}>Simple. Fair. Locked.</h2>
        <p style={{ fontSize: "0.92rem", color: C.g5, maxWidth: 460, margin: "0 auto 36px", fontFamily: FF_SANS, lineHeight: 1.75 }}>Transparent pricing that scales with your operation. Lock in founder pricing and it never changes.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28, textAlign: "center" }}>

          {/* FOUNDER — 1–10 locations */}
          <div className="card-lift reveal reveal-d1" style={{ background: C.white, borderRadius: 20, padding: "40px 30px", border: `2px solid ${C.gold}`, position: "relative" }}>
            <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: C.gold, color: C.white, fontWeight: 700, fontSize: "0.65rem", padding: "5px 18px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.12em", whiteSpace: "nowrap", fontFamily: FF_MONO }}>Founder Pricing</div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: C.gold, marginBottom: 12, marginTop: 8, fontFamily: FF_SANS, letterSpacing: "0.08em" }}>1–10 Locations</div>
            <div style={{ background: C.cream, borderRadius: 14, padding: "22px 18px", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: "3rem", fontWeight: 500, color: C.navy, fontFamily: FF_MONO, letterSpacing: "-0.03em" }}>$99</span>
                <span style={{ fontSize: "1rem", color: C.g4, fontFamily: FF_SANS }}>/mo</span>
              </div>
              <p style={{ fontSize: "0.82rem", color: C.g5, margin: "0 0 2px", fontFamily: FF_SANS }}>for your first location</p>
              <div style={{ width: "100%", height: 1, background: C.g2, margin: "12px 0" }} />
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 2 }}>
                <span style={{ fontSize: "1.8rem", fontWeight: 500, color: C.navy, fontFamily: FF_MONO, letterSpacing: "-0.02em" }}>+$49</span>
                <span style={{ fontSize: "0.88rem", color: C.g4, fontFamily: FF_SANS }}>/mo per additional</span>
              </div>
            </div>
            <div style={{ display: "inline-block", background: C.greenBg, color: C.green, fontWeight: 700, fontSize: "0.74rem", padding: "6px 16px", borderRadius: 8, marginBottom: 22, fontFamily: FF_SANS }}>Locked for life — never increases</div>
            <FeatureList items={founderFeatures} check={C.gold} />
            <button className="btn-lift" onClick={onTour} style={{ ...btn.navy, width: "100%", padding: "15px", fontSize: "0.94rem", borderRadius: 10 }}>Get Started →</button>
          </div>

          {/* ENTERPRISE */}
          <div className="card-lift reveal reveal-d2" style={{ background: C.cream, borderRadius: 20, padding: "40px 30px", border: `1px solid ${C.g2}`, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: C.g5, marginBottom: 12, marginTop: 8, fontFamily: FF_SANS, letterSpacing: "0.08em" }}>Enterprise · 11+ Locations</div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 10 }}>
              <span style={{ fontSize: "2.6rem", fontWeight: 800, color: C.navy, fontFamily: FF_HEAD, letterSpacing: "-0.03em" }}>Custom</span>
            </div>
            <p style={{ fontSize: "0.86rem", color: C.g6, marginBottom: 22, fontFamily: FF_SANS, lineHeight: 1.75 }}>For operators and groups running 11 or more locations who need a single operational intelligence picture across their entire portfolio.</p>
            <FeatureList items={enterpriseFeatures} check={C.g5} />
            <div style={{ flex: 1 }} />
            <button className="btn-lift" onClick={onTour} style={{ ...btn.ghost, width: "100%", padding: "15px", fontSize: "0.94rem", borderRadius: 10 }}>Let's Talk →</button>
            <p style={{ marginTop: 12, fontSize: "0.74rem", color: C.g4, fontFamily: FF_SANS }}>founders@getevidly.com · (855) EVIDLY1</p>
          </div>

        </div>

        {/* IRR CTA */}
        <div className="reveal" style={{ marginTop: 40, padding: "30px 34px", background: C.cream, borderRadius: 16, border: `1px solid ${C.g2}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 22 }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.gold, marginBottom: 8, fontFamily: FF_MONO }}>Not ready to commit?</div>
            <p style={{ fontSize: "0.92rem", fontWeight: 700, color: C.navy, margin: "0 0 4px", fontFamily: FF_HEAD, letterSpacing: "-0.02em" }}>Start with a free Operations Check.</p>
            <p style={{ fontSize: "0.84rem", color: C.g5, margin: 0, fontFamily: FF_SANS }}>2 minutes. No account required. See exactly where your operation stands.</p>
          </div>
          <button className="btn-lift" onClick={onIRR} style={{ ...btn.gold, padding: "13px 26px", fontSize: "0.9rem", flexShrink: 0, borderRadius: 10 }}>Get My Free Operations Check →</button>
        </div>

      </div>
    </section>
  );
}
// ─────────────────────────────────────────────
function IRRSection({ onIRR }) {
  return (
    <section id="irr" style={{ padding: "88px 24px", background: `linear-gradient(155deg, #283f6a, ${C.navy})`, textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 50% 50%, rgba(160,140,90,0.05) 0%, transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize: "56px 56px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
      <div className="reveal" style={{ maxWidth: 600, margin: "0 auto", position: "relative" }}>
        <div style={{ display: "inline-block", padding: "5px 18px", background: "rgba(160,140,90,0.12)", border: "1px solid rgba(160,140,90,0.25)", borderRadius: 100, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.gold, marginBottom: 20, fontFamily: FF_MONO }}>Free · 2 Minutes · No Account Required</div>
        <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 800, color: C.white, margin: "0 0 16px", lineHeight: 1.12, letterSpacing: "-0.03em", fontFamily: FF_HEAD }}>
          Your operation, scored.<br /><span style={{ color: C.gold }}>Every risk, in dollars.</span>
        </h2>
        <p style={{ fontSize: "0.92rem", color: "rgba(255,255,255,0.48)", maxWidth: 440, margin: "0 auto 32px", lineHeight: 1.8, fontFamily: FF_SANS }}>11 questions across food safety and fire safety. See where your operation stands — and what it's costing you — in 2 minutes.</p>
        <button className="btn-lift" onClick={onIRR} style={{ ...btn.gold, padding: "15px 36px", fontSize: "0.97rem", borderRadius: 10 }}>Get My Free Operations Check →</button>
        <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.18)", marginTop: 16, fontFamily: FF_SANS }}>Serving 300+ commercial kitchens per year</p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FINAL CTA
// ─────────────────────────────────────────────
function FinalCTA({ onTour, onIRR }) {
  return (
    <section style={{ padding: "88px 24px", background: `linear-gradient(155deg, #283f6a, ${C.navy})`, textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 30% 70%, rgba(160,140,90,0.04) 0%, transparent 50%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
      <div className="reveal" style={{ maxWidth: 580, margin: "0 auto", position: "relative" }}>
        <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 800, color: C.white, margin: "0 0 14px", fontFamily: FF_HEAD, letterSpacing: "-0.03em" }}>Ready to see it for your operation?</h2>
        <p style={{ fontSize: "0.94rem", color: "rgba(255,255,255,0.38)", marginBottom: 36, lineHeight: 1.75, fontFamily: FF_SANS }}>30 minutes. Your county, your numbers, your dashboard — live.</p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn-lift" onClick={onTour} style={{ ...btn.gold, padding: "16px 36px", fontSize: "1rem", borderRadius: 10 }}>Book a Guided Tour →</button>
          <button className="btn-lift" onClick={onIRR} style={{ ...btn.outline, padding: "16px 28px", fontSize: "0.92rem", borderRadius: 10 }}>Free Operations Check →</button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────
function Footer() {
  const col = { fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", textDecoration: "none", display: "block", marginBottom: 10, fontFamily: FF_SANS, transition: "color 0.2s" };
  const head = { fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.28)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.16em", fontFamily: FF_MONO };
  return (
    <footer style={{ background: "#283f6a", padding: "56px 24px 24px" }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32, marginBottom: 40 }}>
          <div>
            <Logo size="1.1rem" light tagline />
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.25)", marginTop: 14, lineHeight: 1.75, fontFamily: FF_SANS, maxWidth: 260 }}>Operations intelligence for California commercial kitchens. Food safety and fire safety in one platform.</p>
            <div style={{ marginTop: 16 }}>
              <a href="mailto:founders@getevidly.com" style={{ ...col, color: "rgba(255,255,255,0.38)" }}>founders@getevidly.com</a>
              <a href="tel:8553843591" style={{ ...col, color: "rgba(255,255,255,0.38)" }}>(855) EVIDLY1</a>
            </div>
          </div>
          <div>
            <div style={head}>Product</div>
            <button onClick={() => scrollTo("how-it-works")} style={{ ...col, background: "none", border: "none", cursor: "pointer", padding: 0 }}>How It Works</button>
            <button onClick={() => scrollTo("coverage")} style={{ ...col, background: "none", border: "none", cursor: "pointer", padding: 0 }}>What's Covered</button>
            <button onClick={() => scrollTo("pricing")} style={{ ...col, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Pricing</button>
            <a href="/operations-check" style={col}>Operations Check</a>
          </div>
          <div>
            <div style={head}>Company</div>
            <a href="/kitchen-to-community" style={col}>Kitchen to Community</a>
            <a href="/blog" style={col}>Blog</a>
            <a href="mailto:founders@getevidly.com" style={col}>About Us</a>
          </div>
          <div>
            <div style={head}>Legal</div>
            <a href="/privacy" style={col}>Privacy Policy</a>
            <a href="/terms" style={col}>Terms of Service</a>
            <a href="/cookies" style={col}>Cookie Policy</a>
            <a href="/security" style={col}>Security</a>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 18, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.14)", fontFamily: FF_SANS }}>© 2026 EvidLY LLC. All rights reserved. · IKECA Member · Veteran-Owned</span>
          <div style={{ display: "flex", gap: 18 }}>
            {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Cookies", "/cookies"]].map(([l, href]) => (
              <a key={l} href={href} style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.14)", textDecoration: "none", fontFamily: FF_SANS }}>{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// COOKIE BANNER
// ─────────────────────────────────────────────
function CookieBanner({ onAccept, onClose }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: C.white, borderTop: `1px solid ${C.g2}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", boxShadow: "0 -2px 12px rgba(0,0,0,0.07)" }}>
      <p style={{ flex: 1, fontSize: "0.8rem", color: C.g6, margin: 0, fontFamily: FF_SANS, minWidth: 200, lineHeight: 1.6 }}>We use cookies to improve your experience. <a href="/cookies" style={{ color: C.navy }}>Cookie Policy</a></p>
      <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${C.g2}`, background: C.white, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", color: C.g6, fontFamily: FF_SANS }}>Decline</button>
      <button onClick={onAccept} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: FF_SANS }}>Accept All</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT — render order locked
// ─────────────────────────────────────────────
export default function LandingPage() {
  useScrollReveal();
  const [tourOpen, setTourOpen] = useState(false);
  const [cookie,   setCookie]   = useState(() => !localStorage.getItem("evidly-cookie-consent"));
  const openTour  = useCallback(() => setTourOpen(true),  []);
  const closeTour = useCallback(() => setTourOpen(false), []);
  const openIRR   = useCallback(() => window.open("/operations-check", "_blank"), []);
  const acceptCookies = useCallback(() => { localStorage.setItem("evidly-cookie-consent", "accepted"); setCookie(false); }, []);
  const declineCookies = useCallback(() => { localStorage.setItem("evidly-cookie-consent", "declined"); setCookie(false); }, []);

  return (
    <div style={{ fontFamily: FF_SANS, color: C.g8, lineHeight: 1.6, background: C.cream, minHeight: "100vh" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        :focus-visible { outline: 2px solid #A08C5A; outline-offset: 2px; }
        input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid #A08C5A; outline-offset: 0; }

        /* Scroll reveal */
        .reveal {
          opacity: 0; transform: translateY(32px);
          transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1);
        }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .reveal-d1 { transition-delay: 0.1s; }
        .reveal-d2 { transition-delay: 0.2s; }
        .reveal-d3 { transition-delay: 0.3s; }

        /* Hero entrance */
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-animate { animation: heroFadeIn 0.9s cubic-bezier(0.16,1,0.3,1) forwards; }
        .hero-animate-d1 { animation-delay: 0.15s; opacity: 0; }
        .hero-animate-d2 { animation-delay: 0.3s; opacity: 0; }
        .hero-animate-d3 { animation-delay: 0.45s; opacity: 0; }

        /* Animated hero gradient */
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .hero-gradient {
          background: linear-gradient(135deg, #283f6a, #1E2D4D, #253356, #1E2D4D, #192540);
          background-size: 300% 300%;
          animation: gradientShift 12s ease infinite;
        }

        /* Button hover effects */
        .btn-lift {
          transition: transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s ease, filter 0.22s ease;
        }
        .btn-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
          filter: brightness(1.06);
        }
        .btn-lift:active { transform: translateY(0); box-shadow: 0 2px 8px rgba(0,0,0,0.12); }

        /* Card hover effects */
        .card-lift {
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease;
        }
        .card-lift:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.1);
        }

        /* Nav link hover */
        .nav-link { transition: color 0.2s ease; }
        .nav-link:hover { color: #1E2D4D !important; }

        /* Gold underline animation */
        .gold-line {
          position: relative;
          display: inline-block;
        }
        .gold-line::after {
          content: '';
          position: absolute; bottom: -4px; left: 0; width: 0; height: 2px;
          background: #A08C5A;
          transition: width 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .gold-line:hover::after { width: 100%; }

        /* Dashboard mockup float */
        @keyframes dashFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(0.5deg); }
        }
        .dash-float {
          animation: dashFloat 6s ease-in-out infinite;
        }

        /* Score ring draw */
        @keyframes ringDraw {
          from { stroke-dashoffset: 264; }
          to { stroke-dashoffset: 24; }
        }
        .score-ring {
          stroke-dasharray: 264;
          stroke-dashoffset: 264;
          animation: ringDraw 2s cubic-bezier(0.16,1,0.3,1) 0.8s forwards;
        }

        /* Chart line draw */
        @keyframes lineDraw {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
        .chart-draw {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: lineDraw 2.5s cubic-bezier(0.16,1,0.3,1) 1.2s forwards;
        }

        /* Stagger fade for dashboard items */
        @keyframes itemFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-item { opacity: 0; animation: itemFade 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
        .dash-item-d1 { animation-delay: 0.4s; }
        .dash-item-d2 { animation-delay: 0.6s; }
        .dash-item-d3 { animation-delay: 0.8s; }
        .dash-item-d4 { animation-delay: 1.0s; }
        .dash-item-d5 { animation-delay: 1.2s; }

        /* Pulse dot */
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(22,163,74,0.4); }
          50% { opacity: 0.8; box-shadow: 0 0 0 6px rgba(22,163,74,0); }
        }
        .pulse-dot { animation: pulse 2s ease-in-out infinite; }

        /* Hero split layout */
        @media (max-width: 900px) {
          .hero-split { flex-direction: column !important; text-align: center !important; }
          .hero-text { text-align: center !important; }
          .hero-text p { margin-left: auto !important; margin-right: auto !important; }
          .hero-ctas { justify-content: center !important; }
          .dash-mockup { max-width: 380px !important; margin: 0 auto !important; }
        }

        @media (max-width: 860px) {
          .intel-row1 { grid-template-columns: 1fr !important; }
          .intel-row2 { grid-template-columns: 1fr !important; max-width: 100% !important; }
        }
        @media (max-width: 640px) {
          .nav-desktop { display: none !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 641px) { .hamburger { display: none !important; } }
      `}</style>

      {tourOpen && <TourModal onClose={closeTour} />}
      {cookie   && <CookieBanner onAccept={acceptCookies} onClose={declineCookies} />}

      {/* RENDER ORDER — do not change */}
      <NavBar         onTour={openTour} onIRR={openIRR} />
      <HeroSection    onTour={openTour} onIRR={openIRR} />
      <IRRAboveFold   onIRR={openIRR} />
      <TrustBar />
      <HowItWorksSection onTour={openTour} />
      <CoverageSection />
      <IntelligenceSection onTour={openTour} />
      <FoundersSection />
      <CredibilitySection />
      <PricingSection onTour={openTour} onIRR={openIRR} />
      <IRRSection     onIRR={openIRR} />
      <FinalCTA       onTour={openTour} onIRR={openIRR} />
      <Footer />
    </div>
  );
}
