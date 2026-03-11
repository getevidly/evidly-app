import { useState, useEffect, useCallback } from "react";

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
  g1:       "#f5f5f4",
  g2:       "#e7e5e4",
  g3:       "#d6d3d1",
  g4:       "#a8a29e",
  g5:       "#78716c",
  g6:       "#57534e",
  g8:       "#1c1917",
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

const FF = "system-ui,-apple-system,sans-serif";
const FF_SANS = "system-ui,-apple-system,sans-serif";
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
  const tagColor = light ? "rgba(255,255,255,0.45)" : "rgba(30,45,77,0.5)";
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 1, lineHeight: 1 }}>
      <span style={{ fontWeight: 800, fontSize: size, letterSpacing: "-0.03em", fontFamily: FF_SANS, lineHeight: 1 }}>
        <span style={{ color: C.gold }}>E</span>
        <span style={{ color: vidColor }}>vid</span>
        <span style={{ color: C.gold }}>LY</span>
      </span>
      {tagline && (
        <span style={{ fontSize: `calc(${size} * 0.28)`, fontWeight: 700, letterSpacing: "0.18em", color: tagColor, textTransform: "uppercase", lineHeight: 1, fontFamily: FF_SANS, whiteSpace: "nowrap" }}>
          Lead with Confidence
        </span>
      )}
    </span>
  );
}

function Eyebrow({ children, light = false }) {
  return (
    <div style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: light ? "rgba(255,255,255,0.4)" : C.gold, marginBottom: 10, fontFamily: FF_SANS }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// FOUNDER URGENCY COUNTDOWN
// ─────────────────────────────────────────────
function FounderUrgency({ spotsLeft = 47, totalSpots = 50, deadline = "2026-07-04", showSpots = false, showDate = true }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!showSpots && !showDate) return null;
  const taken = totalSpots - spotsLeft;
  const pct = Math.min(100, Math.round((taken / totalSpots) * 100));
  const end = new Date(deadline + "T23:59:59");
  const diff = Math.max(0, end - now);
  const dd = Math.floor(diff / 86400000);
  const hh = Math.floor((diff % 86400000) / 3600000);
  const mm = Math.floor((diff % 3600000) / 60000);
  const ss = Math.floor((diff % 60000) / 1000);
  const urgent = spotsLeft <= 10 || dd <= 7;
  const expired = diff === 0;
  const soldOut = spotsLeft <= 0;
  const closed = expired || soldOut;
  const accent = urgent ? "#ef4444" : C.gold;
  return (
    <div style={{ background: C.navy, borderRadius: 12, padding: "18px 22px", border: `1px solid ${urgent ? "rgba(239,68,68,0.35)" : "rgba(160,140,90,0.25)"}`, position: "relative", overflow: "hidden", marginBottom: 0 }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
      <div style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: accent, marginBottom: 10, textAlign: "center", fontFamily: FF_SANS }}>
        {soldOut ? "All Founder Spots Claimed" : expired ? "Founder Pricing Has Ended" : urgent ? "Almost Gone — Founder Pricing" : "Founder Pricing Window Open"}
      </div>
      {closed ? (
        <p style={{ textAlign: "center", fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", margin: 0 }}>
          {soldOut ? `All ${totalSpots} founder spots are claimed.` : "This window has closed."}{" "}
          <a href="mailto:founders@getevidly.com" style={{ color: C.gold }}>Contact us</a> with questions.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          {showSpots && (
            <div style={{ textAlign: "center", minWidth: 180 }}>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginBottom: 6, fontFamily: FF_SANS }}>Spots Remaining</div>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, height: 8, marginBottom: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: `linear-gradient(90deg,${C.gold},${accent})`, borderRadius: 6, transition: "width 0.5s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", fontFamily: FF_SANS }}>
                <span>{taken} of {totalSpots} claimed</span>
                <span style={{ color: accent, fontWeight: 800 }}>{spotsLeft} left</span>
              </div>
            </div>
          )}
          {showSpots && showDate && <div style={{ width: 1, height: 44, background: "rgba(255,255,255,0.1)" }} />}
          {showDate && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginBottom: 6, fontFamily: FF_SANS }}>Expires July 4, 2026</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                {[[dd, "Days"], [hh, "Hrs"], [mm, "Min"], [ss, "Sec"]].map(([val, label]) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 900, fontSize: "1.4rem", color: C.white, lineHeight: 1, fontVariantNumeric: "tabular-nums", minWidth: 34, fontFamily: FF_SANS }}>{String(val).padStart(2, "0")}</div>
                    <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FF_SANS }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <p style={{ textAlign: "center", fontSize: "0.7rem", color: "rgba(255,255,255,0.22)", marginTop: 10, marginBottom: 0, fontFamily: FF_SANS }}>
        $99/mo first location + $49/mo per additional (up to 10), locked for life. After July 4 or 50 founders — $199/mo + $99/mo per location.
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
              <h3 style={{ fontWeight: 800, color: C.navy, fontSize: "1.05rem", margin: "0 0 5px", fontFamily: FF_SANS }}>Book a Guided Tour</h3>
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
            <button disabled={!ready || submitting} onClick={submit} style={{ ...btn.navy, width: "100%", fontSize: "0.9rem", padding: "13px", opacity: ready && !submitting ? 1 : 0.4 }}>
              {submitting ? "Sending…" : "Submit & Pick a Time →"}
            </button>
            {err && <p style={{ fontSize: "0.75rem", color: C.red, textAlign: "center", marginTop: 8, fontFamily: FF_SANS }}>Something went wrong — email us at <a href="mailto:founders@getevidly.com" style={{ color: C.red }}>founders@getevidly.com</a></p>}
            <p style={{ fontSize: "0.7rem", color: C.g4, textAlign: "center", marginTop: 8, fontFamily: FF_SANS }}>Goes directly to the EvidLY team. No auto-responders.</p>
          </div>
        )}
        {step === 2 && (
          <div style={{ padding: "40px 28px", textAlign: "center" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: 12 }}>📬</div>
            <h3 style={{ fontWeight: 800, color: C.navy, fontSize: "1.05rem", margin: "0 0 8px", fontFamily: FF_SANS }}>Check your email to confirm.</h3>
            <p style={{ fontSize: "0.84rem", color: C.g5, marginBottom: 22, lineHeight: 1.7, fontFamily: FF_SANS }}>We sent a confirmation link to <strong>{form.email}</strong>. Click it to verify and book your time.</p>
            <div style={{ background: C.cream, borderRadius: 10, border: `1px solid ${C.g2}`, padding: "14px 16px", marginBottom: 16 }}>
              <p style={{ fontSize: "0.82rem", color: C.navy, fontWeight: 700, margin: "0 0 4px", fontFamily: FF_SANS }}>Your jurisdictions are being aligned.</p>
              <p style={{ fontSize: "0.78rem", color: C.g5, margin: 0, fontFamily: FF_SANS, lineHeight: 1.6 }}>When you join the tour, <strong>{form.county ? form.county + " County" : "your county"}</strong> will already be loaded — your grading method, your thresholds, your risk picture, live.</p>
            </div>
            <div style={{ background: C.cream, borderRadius: 10, border: `1px solid ${C.g2}`, padding: "14px 16px", marginBottom: 16 }}>
              <p style={{ fontSize: "0.78rem", color: C.g5, margin: 0, fontFamily: FF_SANS, lineHeight: 1.6 }}>Didn't get the email? Check spam, or <a href="mailto:founders@getevidly.com" style={{ color: C.navy, fontWeight: 600 }}>email us directly</a>.</p>
            </div>
            <p style={{ fontSize: "0.72rem", color: C.g4, fontFamily: FF_SANS }}>Already confirmed? <a href={CALENDLY} target="_blank" rel="noreferrer" style={{ color: C.gold, fontWeight: 600 }}>Book on Calendly directly →</a></p>
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
  const NAV = [["How It Works", "how-it-works"], ["Coverage", "coverage"], ["Pricing", "pricing"]];
  return (
    <header style={{ background: C.white, borderBottom: `1px solid ${C.g2}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", height: 68, gap: 12 }}>
        <a href="/" style={{ textDecoration: "none", marginRight: 20, flexShrink: 0 }}><Logo size="1.45rem" tagline /></a>
        <nav style={{ display: "flex", gap: 24, flex: 1, alignItems: "center" }}>
          {NAV.map(([label, id]) => (
            <button key={label} onClick={() => scrollTo(id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.g5, fontWeight: 500, fontSize: "0.84rem", fontFamily: FF_SANS, whiteSpace: "nowrap", padding: 0 }}>{label}</button>
          ))}
        </nav>
        <div style={{ flexShrink: 0, display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={onIRR} style={{ background: "transparent", border: `1.5px solid ${C.gold}`, color: C.gold, borderRadius: 6, padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: FF_SANS, whiteSpace: "nowrap" }}>Free Operations Check</button>
          <button onClick={onTour} style={{ ...btn.gold, padding: "9px 20px", fontSize: "0.82rem" }}>Book a Tour</button>
          <button onClick={() => setOpen(!open)} aria-label="Open menu" style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 4px", display: "flex", flexDirection: "column", gap: 4, marginLeft: 4 }}>
            <span style={{ width: 20, height: 2, background: open ? C.gold : C.g4, borderRadius: 1, display: "block" }} />
            <span style={{ width: 20, height: 2, background: open ? C.gold : C.g4, borderRadius: 1, display: "block" }} />
            <span style={{ width: 20, height: 2, background: open ? C.gold : C.g4, borderRadius: 1, display: "block" }} />
          </button>
        </div>
      </div>
      {open && (
        <div style={{ background: C.white, borderTop: `1px solid ${C.g2}`, padding: "10px 24px 18px" }}>
          <button onClick={() => { setOpen(false); onIRR(); }} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "11px 0", fontSize: "0.9rem", color: C.gold, borderBottom: `1px solid ${C.g1}`, fontWeight: 700, fontFamily: FF_SANS }}>✓ Free Operations Check</button>
          {NAV.map(([label, id]) => (
            <button key={label} onClick={() => { setOpen(false); scrollTo(id); }} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "11px 0", fontSize: "0.9rem", color: C.g6, borderBottom: `1px solid ${C.g1}`, fontWeight: 500, fontFamily: FF_SANS }}>{label}</button>
          ))}
          <button onClick={() => { setOpen(false); onTour(); }} style={{ ...btn.gold, width: "100%", marginTop: 14, padding: "13px", fontSize: "0.9rem" }}>Book a Guided Tour →</button>
        </div>
      )}
    </header>
  );
}

// ─────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────
function HeroSection({ onTour }) {
  return (
    <section style={{ padding: "88px 24px 72px", background: `linear-gradient(155deg, #253356, ${C.navy})`, textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />
      <div style={goldRule} />
      <div style={{ maxWidth: 660, margin: "0 auto", position: "relative" }}>
        <div style={{ display: "inline-block", padding: "4px 14px", background: "rgba(160,140,90,0.15)", border: "1px solid rgba(160,140,90,0.3)", borderRadius: 100, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, marginBottom: 20, fontFamily: FF_SANS }}>
          Launching May 5, 2026 · Founder Pricing Open
        </div>
        <h1 style={{ fontSize: "clamp(1.9rem, 5.5vw, 3.1rem)", fontWeight: 700, lineHeight: 1.1, margin: "0 0 20px", color: C.white, fontFamily: FF_SANS, letterSpacing: "-0.02em" }}>
          Operations intelligence for{" "}
          <span style={{ color: C.gold }}>California commercial kitchens.</span>
        </h1>
        <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.55)", maxWidth: 520, margin: "0 auto 32px", lineHeight: 1.75, fontFamily: FF_SANS }}>
          Food safety and facility safety — scored against your county's actual grading method. Every operational signal translated into revenue, liability, cost, and workforce risk. One dashboard. Real answers.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={onTour} style={{ ...btn.gold, padding: "15px 34px", fontSize: "0.97rem" }}>Book a Guided Tour →</button>
          <button onClick={() => scrollTo("pricing")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.18)", paddingBottom: 1, fontFamily: FF_SANS }}>See Pricing ↓</button>
        </div>
        <p style={{ marginTop: 18, fontSize: "0.76rem", color: "rgba(255,255,255,0.22)", fontFamily: FF_SANS }}>$99/mo founder pricing — locked for life through July 4, 2026</p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// IRR ABOVE FOLD
// ─────────────────────────────────────────────
function IRRAboveFold({ onIRR }) {
  return (
    <section style={{ background: C.navy, padding: "48px 24px", position: "relative", overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
      <div style={{ maxWidth: 660, margin: "0 auto", position: "relative", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ flex: "1 1 300px", textAlign: "left" }}>
          <div style={{ display: "inline-block", padding: "3px 12px", background: "rgba(160,140,90,0.15)", border: "1px solid rgba(160,140,90,0.3)", borderRadius: 100, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, marginBottom: 12, fontFamily: FF_SANS }}>Free · 2 Minutes</div>
          <h2 style={{ fontSize: "clamp(1.15rem, 3vw, 1.45rem)", fontWeight: 700, color: C.white, margin: "0 0 8px", lineHeight: 1.2, letterSpacing: "-0.02em", fontFamily: FF_SANS }}>
            See how your operation is running{" "}<span style={{ color: C.gold }}>— right now.</span>
          </h2>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.7, fontFamily: FF_SANS }}>Daily activity, scored. Every risk in dollars. Takes 2 minutes — no account needed, or let it create one for you.</p>
        </div>
        <div style={{ flexShrink: 0, textAlign: "center" }}>
          <button onClick={onIRR} style={{ ...btn.gold, padding: "13px 28px", fontSize: "0.9rem", display: "block", marginBottom: 8 }}>Get My Free Operations Check →</button>
          <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.22)", margin: 0, fontFamily: FF_SANS }}>Used by 100+ California commercial kitchens</p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// TRUST BAR
// ─────────────────────────────────────────────
function TrustBar() {
  const items = [
    { stat: "300+", label: "Commercial kitchens served per year" },
    { stat: "62",   label: "California jurisdictions covered" },
    { stat: null,   label: "Aramark · Cintas · Yosemite NPS" },
    { stat: null,   label: "IKECA Certified · Veteran-Owned" },
  ];
  return (
    <section style={{ background: C.navy, borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "20px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 28, flexWrap: "wrap" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {i > 0 && <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.08)" }} />}
            <div style={{ textAlign: "center" }}>
              {item.stat && <div style={{ fontSize: "1.25rem", fontWeight: 900, color: C.gold, lineHeight: 1, fontFamily: FF_SANS }}>{item.stat}</div>}
              <div style={{ fontSize: item.stat ? "0.66rem" : "0.78rem", color: "rgba(255,255,255,0.35)", marginTop: item.stat ? 2 : 0, fontFamily: FF_SANS }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────────────
function HowItWorksSection({ onTour }) {
  const steps = [
    { num: "01", title: "Connect your county", body: "We load your jurisdiction's actual grading method — weights, thresholds, and passing criteria — so your data is scored the way your inspector scores it." },
    { num: "02", title: "Log your operations", body: "Temperatures, checklists, certifications, vendor documents, hood cleaning records. Everything in one place, updated in real time by your team." },
    { num: "03", title: "Know how your operation stands", body: "See your operational picture before anyone else does. Every signal becomes a dollar figure — what's at risk, what's exposed, and what it's costing you right now." },
  ];
  return (
    <section id="how-it-works" style={{ padding: "80px 24px", background: C.white }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Eyebrow>How It Works</Eyebrow>
          <h2 style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700, color: C.navy, margin: "0 0 10px", fontFamily: FF_SANS, letterSpacing: "-0.02em" }}>From your county to your dashboard in minutes.</h2>
          <p style={{ fontSize: "0.9rem", color: C.g5, maxWidth: 480, margin: "0 auto", fontFamily: FF_SANS, lineHeight: 1.7 }}>No manual setup. No generic checklists. EvidLY uses your jurisdiction's real scoring logic from day one.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 2 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ padding: "32px 28px", background: i % 2 === 0 ? C.cream : C.white, borderRadius: 14, border: `1px solid ${C.g2}` }}>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: C.g2, lineHeight: 1, marginBottom: 14, fontFamily: FF_SANS }}>{s.num}</div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: C.navy, margin: "0 0 10px", fontFamily: FF_SANS }}>{s.title}</h3>
              <p style={{ fontSize: "0.85rem", color: C.g5, margin: 0, lineHeight: 1.7, fontFamily: FF_SANS }}>{s.body}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 36 }}>
          <button onClick={onTour} style={{ ...btn.navy, padding: "13px 30px" }}>See It Live on Your County →</button>
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
    { label: "Facility Safety", icon: "🔥", color: C.gold, items: ["Hood cleaning schedules per NFPA 96-2024 Table 12.4 frequencies", "Fire suppression inspection records and due-date alerts", "Extinguisher documentation and service history", "Vendor compliance — certs, insurance, service records", "Equipment calibration logs and maintenance tracking"] },
  ];
  return (
    <section id="coverage" style={{ padding: "80px 24px", background: C.cream }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <Eyebrow>What's Covered</Eyebrow>
          <h2 style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700, color: C.navy, margin: "0 0 10px", fontFamily: FF_SANS, letterSpacing: "-0.02em" }}>Food safety and facility safety.<br />One place.</h2>
          <p style={{ fontSize: "0.9rem", color: C.g5, maxWidth: 460, margin: "0 auto", fontFamily: FF_SANS, lineHeight: 1.7 }}>Most platforms cover one or the other. EvidLY covers both — scored against your county, not a generic national checklist.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {pillars.map((p) => (
            <div key={p.label} style={{ background: C.white, borderRadius: 16, padding: "30px 26px", border: `1px solid ${C.g2}`, borderTop: `4px solid ${p.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: "1.4rem" }}>{p.icon}</span>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: p.color, margin: 0, fontFamily: FF_SANS }}>{p.label}</h3>
              </div>
              {p.items.map((item) => (
                <div key={item} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: "0.84rem", color: C.g6, lineHeight: 1.55, fontFamily: FF_SANS }}>
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
      points: ["Foodborne illness without documentation logs = presumed negligence", "Fire suppression gaps create premises liability beyond CalCode", "PSE non-compliance may affect your coverage — consult your carrier"],
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
      headline: "Documentation gaps always surface at the worst possible moment.",
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
      <div style={{ background: p.bg, borderRadius: 14, border: `1px solid ${p.bd}`, borderLeft: `4px solid ${p.color}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
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
    <section style={{ padding: "80px 24px", background: C.white }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ display: "inline-block", padding: "4px 14px", background: "rgba(160,140,90,0.1)", border: "1px solid rgba(160,140,90,0.25)", borderRadius: 100, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.goldD, marginBottom: 14, fontFamily: FF_SANS }}>Operations Intelligence Engine</div>
          <h2 style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 800, color: C.navy, margin: "0 0 12px", fontFamily: FF_SANS, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Every signal, from where you are<br /><span style={{ color: C.gold }}>to where you need to be.</span>
          </h2>
          <p style={{ fontSize: "0.9rem", color: C.g5, maxWidth: 500, margin: "0 auto", fontFamily: FF_SANS, lineHeight: 1.7 }}>
            Most operators don't know where they stand until someone tells them. EvidLY gives you that picture first — every operational signal translated into what it means financially, before it becomes a problem.
          </p>
        </div>
        <div className="intel-row1" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
          {pillars.slice(0, 3).map((p) => <PillarCard key={p.label} p={p} />)}
        </div>
        <div className="intel-row2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, maxWidth: 660, margin: "0 auto" }}>
          {pillars.slice(3).map((p) => <PillarCard key={p.label} p={p} />)}
        </div>
        <div style={{ marginTop: 28, background: C.cream, borderRadius: 12, border: `1px solid ${C.g2}`, padding: "16px 20px" }}>
          <p style={{ fontSize: "0.75rem", color: C.g5, margin: 0, textAlign: "center", lineHeight: 1.6, fontStyle: "italic", fontFamily: FF_SANS }}>
            Revenue and liability figures are general estimates based on publicly available industry data. PSE/insurance impacts vary by carrier, policy, and jurisdiction — consult your carrier and legal counsel regarding your specific coverage.
          </p>
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button onClick={onTour} style={{ ...btn.gold, padding: "13px 30px" }}>See Your Operation's Full Picture →</button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// WHO WE ARE
// ─────────────────────────────────────────────
function FoundersSection() {
  const stats = [{ n: "300+", l: "Commercial kitchens per year" }, { n: "20+", l: "Years in enterprise compliance" }, { n: "62", l: "CA jurisdictions mapped" }];
  return (
    <section style={{ padding: "80px 24px", background: C.cream, borderTop: `1px solid ${C.g2}` }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Eyebrow>Who Built This</Eyebrow>
          <h2 style={{ fontSize: "clamp(1.3rem, 4vw, 1.9rem)", fontWeight: 700, color: C.navy, margin: "0 0 16px", fontFamily: FF_SANS, letterSpacing: "-0.02em" }}>Built from 300 kitchens a year. Not a whitepaper.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 28 }}>
          <div style={{ background: C.white, borderRadius: 14, padding: "26px 22px", border: `1px solid ${C.g2}`, borderTop: `4px solid ${C.navy}` }}>
            <p style={{ fontSize: "0.86rem", color: C.g6, lineHeight: 1.75, margin: 0, fontFamily: FF_SANS }}>We're in over <strong>300 commercial kitchens every year</strong> — including Aramark's seven locations at Yosemite National Park, Cintas, and the largest operators across California's Central Valley. EvidLY was built from what we see on the ground every day.</p>
          </div>
          <div style={{ background: C.white, borderRadius: 14, padding: "26px 22px", border: `1px solid ${C.g2}`, borderTop: `4px solid ${C.gold}` }}>
            <p style={{ fontSize: "0.86rem", color: C.g6, lineHeight: 1.75, margin: 0, fontFamily: FF_SANS }}>The compliance frameworks behind EvidLY come from two decades of enterprise security and regulatory consulting — for Blue Cross, Kaiser, the NFL, the State of Tennessee, and organizations that cannot afford to get it wrong. That's the standard we hold ourselves to.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0, justifyContent: "center", flexWrap: "wrap", borderRadius: 14, overflow: "hidden", border: `1px solid ${C.g2}` }}>
          {stats.map((s, i) => (
            <div key={i} style={{ flex: "1 1 160px", padding: "22px 20px", textAlign: "center", background: C.white, borderLeft: i > 0 ? `1px solid ${C.g2}` : "none" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: C.navy, lineHeight: 1, fontFamily: FF_SANS }}>{s.n}</div>
              <div style={{ fontSize: "0.72rem", color: C.g4, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FF_SANS }}>{s.l}</div>
            </div>
          ))}
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
    "Each location scored against its own county — not a generic checklist",
    "Food safety and facility safety in one place",
    "Your whole team included, no per-seat cost",
    "Know how your operation stands — every single day",
    "This price is yours forever — never increases",
    "If it's not right in 45 days, you pay nothing",
  ];
  const enterpriseFeatures = ["Every location visible in one place", "Each location scored against its own jurisdiction", "Custom branding and API access available", "No per-seat limits — scales with you", "Dedicated account support", "Pricing built around your operation"];
  return (
    <section id="pricing" style={{ padding: "80px 24px", background: C.white }}>
      <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
        <Eyebrow>Pricing</Eyebrow>
        <h2 style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700, color: C.navy, margin: "0 0 8px", fontFamily: FF_SANS, letterSpacing: "-0.02em" }}>Simple. Fair. Locked.</h2>
        <p style={{ fontSize: "0.9rem", color: C.g5, maxWidth: 460, margin: "0 auto 28px", fontFamily: FF_SANS, lineHeight: 1.7 }}>Founder pricing is available through July 4, 2026 — or the first 50 founders. Lock it in now and it never changes.</p>
        <FounderUrgency spotsLeft={47} totalSpots={50} deadline="2026-07-04" showSpots={true} showDate={true} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginTop: 28, textAlign: "center" }}>

          {/* FOUNDER — 1–10 locations */}
          <div style={{ background: C.white, borderRadius: 16, padding: "36px 28px", border: `2px solid ${C.gold}`, position: "relative" }}>
            <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: C.gold, color: C.white, fontWeight: 700, fontSize: "0.68rem", padding: "4px 16px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap", fontFamily: FF_SANS }}>Founder Pricing</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: C.gold, marginBottom: 10, marginTop: 6, fontFamily: FF_SANS, letterSpacing: "0.06em" }}>1–10 Locations · Through July 4 or 50 Founders</div>
            <div style={{ background: C.cream, borderRadius: 12, padding: "18px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: "2.8rem", fontWeight: 900, color: C.navy, fontFamily: FF_SANS }}>$99</span>
                <span style={{ fontSize: "1rem", color: C.g4, fontFamily: FF_SANS }}>/mo</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: C.g5, margin: "0 0 2px", fontFamily: FF_SANS }}>for your first location</p>
              <div style={{ width: "100%", height: 1, background: C.g2, margin: "10px 0" }} />
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 2 }}>
                <span style={{ fontSize: "1.8rem", fontWeight: 900, color: C.navy, fontFamily: FF_SANS }}>+$49</span>
                <span style={{ fontSize: "0.9rem", color: C.g4, fontFamily: FF_SANS }}>/mo per additional location</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: C.g5, margin: 0, fontFamily: FF_SANS }}>up to 10 locations total</p>
            </div>
            <div style={{ display: "inline-block", background: C.greenBg, color: C.green, fontWeight: 700, fontSize: "0.74rem", padding: "5px 14px", borderRadius: 8, marginBottom: 20, fontFamily: FF_SANS }}>This price is yours forever — never increases</div>
            <FeatureList items={founderFeatures} check={C.gold} />
            <button onClick={onTour} style={{ ...btn.navy, width: "100%", padding: "14px", fontSize: "0.92rem" }}>Reserve My Founder Spot →</button>
            <p style={{ marginTop: 10, fontSize: "0.74rem", color: C.g4, fontFamily: FF_SANS }}>After July 4 or 50 founders — $199/mo + $99/mo per location</p>
          </div>

          {/* ENTERPRISE */}
          <div style={{ background: C.cream, borderRadius: 16, padding: "36px 28px", border: `1px solid ${C.g2}`, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: C.g5, marginBottom: 10, marginTop: 6, fontFamily: FF_SANS, letterSpacing: "0.06em" }}>Enterprise · 11+ Locations</div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: "2.4rem", fontWeight: 900, color: C.navy, fontFamily: FF_SANS }}>Custom</span>
            </div>
            <p style={{ fontSize: "0.84rem", color: C.g6, marginBottom: 20, fontFamily: FF_SANS, lineHeight: 1.7 }}>For operators and groups running 11 or more locations who need a single operational intelligence picture across their entire portfolio.</p>
            <FeatureList items={enterpriseFeatures} check={C.g5} />
            <div style={{ flex: 1 }} />
            <button onClick={onTour} style={{ ...btn.ghost, width: "100%", padding: "14px", fontSize: "0.92rem" }}>Let's Talk →</button>
            <p style={{ marginTop: 10, fontSize: "0.74rem", color: C.g4, fontFamily: FF_SANS }}>founders@getevidly.com · (855) EVIDLY1</p>
          </div>

        </div>

        {/* IRR CTA */}
        <div style={{ marginTop: 36, padding: "28px 32px", background: C.cream, borderRadius: 14, border: `1px solid ${C.g2}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, marginBottom: 6, fontFamily: FF_SANS }}>Not ready to commit?</div>
            <p style={{ fontSize: "0.9rem", fontWeight: 700, color: C.navy, margin: "0 0 4px", fontFamily: FF_SANS }}>Start with a free Operations Check.</p>
            <p style={{ fontSize: "0.82rem", color: C.g5, margin: 0, fontFamily: FF_SANS }}>2 minutes. No account required. See exactly where your operation stands before you decide anything.</p>
          </div>
          <button onClick={onIRR} style={{ ...btn.gold, padding: "12px 24px", fontSize: "0.88rem", flexShrink: 0 }}>Get My Free Operations Check →</button>
        </div>

      </div>
    </section>
  );
}
// ─────────────────────────────────────────────
function IRRSection({ onIRR }) {
  return (
    <section id="irr" style={{ padding: "72px 24px", background: `linear-gradient(155deg, #253356, ${C.navy})`, textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
      <div style={{ maxWidth: 580, margin: "0 auto", position: "relative" }}>
        <div style={{ display: "inline-block", padding: "4px 14px", background: "rgba(160,140,90,0.15)", border: "1px solid rgba(160,140,90,0.3)", borderRadius: 100, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, marginBottom: 18, fontFamily: FF_SANS }}>Free · Creates Your EvidLY Account</div>
        <h2 style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700, color: C.white, margin: "0 0 14px", lineHeight: 1.15, letterSpacing: "-0.02em", fontFamily: FF_SANS }}>
          Your operation, scored.<br /><span style={{ color: C.gold }}>Every risk, in dollars.</span>
        </h2>
        <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", maxWidth: 420, margin: "0 auto 28px", lineHeight: 1.75, fontFamily: FF_SANS }}>See how your operation is running in 2 minutes. Get your baseline report and your EvidLY account — instantly.</p>
        <button onClick={onIRR} style={{ ...btn.gold, padding: "14px 34px", fontSize: "0.95rem" }}>Get My Free Operations Check →</button>
        <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", marginTop: 12, fontFamily: FF_SANS }}>Used by 100+ California commercial kitchens</p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FINAL CTA
// ─────────────────────────────────────────────
function FinalCTA({ onTour, onIRR }) {
  return (
    <section style={{ padding: "72px 24px", background: `linear-gradient(155deg, #253356, ${C.navy})`, textAlign: "center", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700, color: C.white, margin: "0 0 12px", fontFamily: FF_SANS, letterSpacing: "-0.02em" }}>Ready to see it for your operation?</h2>
        <p style={{ fontSize: "0.92rem", color: "rgba(255,255,255,0.4)", marginBottom: 28, lineHeight: 1.7, fontFamily: FF_SANS }}>45 minutes. Your county, your numbers, your dashboard — live.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={onTour} style={{ ...btn.gold, padding: "15px 34px", fontSize: "0.97rem" }}>Book a Guided Tour →</button>
          <button onClick={() => scrollTo("pricing")} style={{ ...btn.outline, padding: "15px 24px", fontSize: "0.9rem" }}>See Pricing ↓</button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────
function Footer() {
  const col = { fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", textDecoration: "none", display: "block", marginBottom: 8, fontFamily: FF_SANS };
  const head = { fontSize: "0.65rem", fontWeight: 800, color: "rgba(255,255,255,0.3)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: FF_SANS };
  return (
    <footer style={{ background: "#283f6a", padding: "48px 24px 20px" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 28, marginBottom: 32 }}>
          <div>
            <Logo size="1rem" light tagline />
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.28)", marginTop: 12, lineHeight: 1.7, fontFamily: FF_SANS, maxWidth: 260 }}>The operations intelligence platform for California commercial kitchens. Launching May 5, 2026.</p>
            <div style={{ marginTop: 14 }}>
              <a href="mailto:founders@getevidly.com" style={{ ...col, color: "rgba(255,255,255,0.4)" }}>founders@getevidly.com</a>
              <a href="tel:8553843591" style={{ ...col, color: "rgba(255,255,255,0.4)" }}>(855) EVIDLY1</a>
            </div>
          </div>
          <div>
            <div style={head}>Product</div>
            <button onClick={() => scrollTo("how-it-works")} style={{ ...col, background: "none", border: "none", cursor: "pointer", padding: 0 }}>How It Works</button>
            <button onClick={() => scrollTo("coverage")} style={{ ...col, background: "none", border: "none", cursor: "pointer", padding: 0 }}>What's Covered</button>
            <button onClick={() => scrollTo("pricing")} style={{ ...col, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Pricing</button>
            <a href="/merced-county" style={col}>Your County</a>
            <a href="/inspection-readiness/merced-county" style={col}>Inspection Readiness</a>
            <a href="/scoretable/merced-county" style={{ ...col, fontSize: "0.72rem", color: "rgba(255,255,255,0.2)" }}>ScoreTable ↗</a>
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
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.15)", fontFamily: FF_SANS }}>© 2026 EvidLY LLC. All rights reserved. · IKECA Member #76716495 · Veteran-Owned</span>
          <div style={{ display: "flex", gap: 16 }}>
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((l) => (
              <a key={l} href="#" style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.15)", textDecoration: "none", fontFamily: FF_SANS }}>{l}</a>
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
      <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${C.g2}`, background: C.white, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", color: C.g6, fontFamily: FF_SANS }}>Manage</button>
      <button onClick={onAccept} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: C.navy, color: C.white, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: FF_SANS }}>Accept All</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// IRR STUB
// ─────────────────────────────────────────────
function InspectionReadinessForm({ onClose }) {
  return (
    <div style={{ position: "fixed", bottom: 80, right: 24, zIndex: 300, background: C.navy, borderRadius: 12, padding: "14px 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.22)", border: "1px solid rgba(160,140,90,0.3)", maxWidth: 300, display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: C.gold, marginBottom: 4, fontFamily: FF_SANS }}>Mockup — IRR Stub</div>
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", margin: 0, fontFamily: FF_SANS, lineHeight: 1.5 }}>Real InspectionReadinessForm component is wired in the codebase.</p>
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 18, cursor: "pointer", lineHeight: 1, flexShrink: 0, padding: 0 }}>x</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT — render order locked
// ─────────────────────────────────────────────
export default function LandingPage() {
  const [tourOpen, setTourOpen] = useState(false);
  const [irrOpen,  setIrrOpen]  = useState(false);
  const [cookie,   setCookie]   = useState(true);
  const openTour  = useCallback(() => setTourOpen(true),  []);
  const closeTour = useCallback(() => setTourOpen(false), []);
  const openIRR   = useCallback(() => setIrrOpen(true),   []);
  const closeIRR  = useCallback(() => setIrrOpen(false),  []);

  return (
    <div style={{ fontFamily: FF_SANS, color: C.g8, lineHeight: 1.6, background: C.cream, minHeight: "100vh" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        button { all: unset; cursor: pointer; }
        button:disabled { cursor: not-allowed; }
        @media (max-width: 860px) {
          .intel-row1 { grid-template-columns: 1fr !important; }
          .intel-row2 { grid-template-columns: 1fr !important; max-width: 100% !important; }
        }
        @media (max-width: 640px) { .hide-mobile { display: none !important; } }
        @media (min-width: 641px) { .hamburger { display: none !important; } }
      `}</style>

      {tourOpen && <TourModal onClose={closeTour} />}
      {irrOpen  && <InspectionReadinessForm sourcePage="landing" onClose={closeIRR} />}
      {cookie   && <CookieBanner onAccept={() => setCookie(false)} onClose={() => setCookie(false)} />}

      {/* RENDER ORDER — do not change */}
      <NavBar         onTour={openTour} onIRR={openIRR} />
      <HeroSection    onTour={openTour} />
      <IRRAboveFold   onIRR={openIRR} />
      <TrustBar />
      <HowItWorksSection onTour={openTour} />
      <CoverageSection />
      <IntelligenceSection onTour={openTour} />
      <FoundersSection />
      <PricingSection onTour={openTour} onIRR={openIRR} />
      <IRRSection     onIRR={openIRR} />
      <FinalCTA       onTour={openTour} onIRR={openIRR} />
      <Footer />
    </div>
  );
}
