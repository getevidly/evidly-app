import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const C = {
  navy: "#1E2D4D", gold: "#A08C5A",
  white: "#FFFFFF", cream: "#F8F7F4", g1: "#f5f5f4", g2: "#e7e5e4",
  g3: "#d6d3d1", g4: "#a8a29e", g5: "#78716c", g8: "#1c1917",
  green: "#16a34a", greenBg: "#f0fdf4", greenBd: "#86efac",
  red: "#dc2626", redBg: "#fef2f2", redBd: "#fca5a5",
  amber: "#d97706", amberBg: "#fffbeb", amberBd: "#fcd34d",
  blue: "#1d4ed8", blueBg: "#eff6ff", blueBd: "#93c5fd",
  orange: "#c2410c", orangeBg: "#fff7ed", orangeBd: "#fdba74",
  purple: "#6B21A8", purpleBg: "#faf5ff", purpleBd: "#d8b4fe",
  darkred: "#991B1B", darkgreen: "#166534",
};
const FF = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
const FF_HEAD = "'Syne',system-ui,sans-serif";
const FF_MONO = "'DM Mono','SF Mono','Fira Code',monospace";
const CALENDLY = "https://calendly.com/founders-getevidly/60min";
const FORMSPREE = "https://formspree.io/f/meeredlg";
const inp = (extra = {}) => ({ width: "100%", padding: "10px 12px", border: `1px solid ${C.g3}`, borderRadius: 8, fontSize: "0.875rem", boxSizing: "border-box", outline: "none", background: C.white, color: C.g8, fontFamily: FF, ...extra });

const CA_COUNTIES = [
  "Alameda","Alpine","Amador","Butte","Calaveras","Colusa","Contra Costa","Del Norte",
  "El Dorado","Fresno","Glenn","Humboldt","Imperial","Inyo","Kern","Kings","Lake",
  "Lassen","Los Angeles","Madera","Marin","Mariposa","Mendocino","Merced","Modoc",
  "Mono","Monterey","Napa","Nevada","Orange","Placer","Plumas","Riverside","Sacramento",
  "San Benito","San Bernardino","San Diego","San Francisco","San Joaquin","San Luis Obispo",
  "San Mateo","Santa Barbara","Santa Clara","Santa Cruz","Shasta","Sierra","Siskiyou",
  "Solano","Sonoma","Stanislaus","Sutter","Tehama","Trinity","Tulare","Tuolumne",
  "Ventura","Yolo","Yuba",
];
const OP_TYPES = [
  "Full-Service Restaurant","Quick-Service / Fast Casual","Hotel / Banquet Kitchen",
  "Hospital / Healthcare Kitchen","School / K-12 Kitchen","Catering Operation",
  "Bar / Nightclub with Food","Commissary Kitchen","Other",
];

const GROUPS = [
  {
    key: "food", label: "Food Safety", icon: "\u{1F321}\uFE0F", color: C.orange,
    questions: [
      {
        cardLabel: "Receiving Temps",
        pillar: "Receiving Documented", startState: "Receiving Undocumented",
        icon: "\u{1F4E6}", color: C.orange, bg: C.orangeBg, bd: C.orangeBd, tx: "#7c2d12",
        question: "Do you log the temperature of every food delivery at the time of receiving \u2014 before it goes into storage?",
        hint: "Receiving temp logs are one of the first things pulled during a regulatory visit. A single missing entry on a delivery is a documented critical violation.",
        riskIfNo: "$12,000\u2013$18,000", riskLabel: "avg. revenue lost per temporary closure",
        yesSignal: "Receiving temps are logged on every delivery. That\u2019s your most visible food safety exposure \u2014 and it\u2019s covered.",
        noSignal: "No receiving temp log means no proof you accepted food at a safe temperature. That\u2019s a documented critical violation \u2014 and a financial and legal exposure.",
        partialSignal: "Partial receiving logs create the same exposure as none \u2014 every unlogged delivery is a separate documented gap.",
      },
      {
        cardLabel: "Cold & Hot Holding",
        pillar: "Holding Temps Controlled", startState: "Holding Temps at Risk",
        icon: "\u{1F321}\uFE0F", color: C.orange, bg: C.orangeBg, bd: C.orangeBd, tx: "#7c2d12",
        question: "Are you logging temperatures on cold and hot holding equipment throughout every service period \u2014 with 7 days of logs available right now?",
        hint: "Cold hold: 41\u00B0F or below. Hot hold: 135\u00B0F or above. Each unlogged period per unit is a separate citation.",
        riskIfNo: "$12,000\u2013$18,000", riskLabel: "avg. revenue lost per temporary closure",
        yesSignal: "Holding temps are logged consistently. Inspectors see a complete, defensible record.",
        noSignal: "Missing holding logs are a documented critical violation. Each unlogged period per unit is a separate citation \u2014 and a liability exposure.",
        partialSignal: "Inconsistent holding logs signal that monitoring isn\u2019t happening. Even one gap per unit per day compounds fast.",
      },
      {
        cardLabel: "Cooldown Logs",
        pillar: "Cooldown Documented", startState: "Cooldown Undocumented",
        icon: "\u2744\uFE0F", color: C.orange, bg: C.orangeBg, bd: C.orangeBd, tx: "#7c2d12",
        question: "When you cool cooked food, are you documenting the two-stage process \u2014 135\u00B0F to 70\u00B0F within 2 hours, then 70\u00B0F to 41\u00B0F within the next 4?",
        hint: "Improper cooling is the leading cause of foodborne illness. Without the log, you cannot prove it was done correctly \u2014 and you bear full liability if it wasn\u2019t.",
        riskIfNo: "Full liability", riskLabel: "presumed if a foodborne illness is ever traced to your kitchen",
        yesSignal: "Cooldown logs are complete and two-stage. If a foodborne illness is ever alleged, you can prove what happened.",
        noSignal: "No cooldown log means presumed negligence if anything is ever traced to your kitchen. This is the highest liability gap in food safety.",
        partialSignal: "A partial cooldown log signals to regulators and attorneys alike that monitoring was inconsistent.",
      },
      {
        cardLabel: "Daily Checklists & HACCP",
        pillar: "HACCP in Practice", startState: "HACCP on Paper Only",
        icon: "\u2705", color: C.darkgreen, bg: "#f0fdf4", bd: C.greenBd, tx: "#14532d",
        question: "Do you run documented opening, closing, and line-check checklists every shift \u2014 and do those records feed into your HACCP plan?",
        hint: "Daily checklists are the only proof your HACCP plan is being followed. Without them, your HACCP is a document \u2014 not a practice.",
        riskIfNo: "HACCP gap", riskLabel: "daily records are the only proof your plan was followed",
        yesSignal: "Checklists are running every shift and feeding your HACCP. Your food safety program is documented, not just described.",
        noSignal: "Without daily checklists, your HACCP plan is theoretical. Inspectors and attorneys look for proof the plan was followed \u2014 not just written.",
        partialSignal: "Inconsistent checklists create gaps in your HACCP record. Partial documentation suggests the plan isn\u2019t consistently followed.",
      },
      {
        cardLabel: "Food Handler Cards & CFPM",
        pillar: "Certifications Current", startState: "Certifications at Risk",
        icon: "\u{1F4CB}", color: C.darkred, bg: C.redBg, bd: C.redBd, tx: "#7f1d1d",
        question: "Are every single employee\u2019s food handler cards current \u2014 and is your Certified Food Protection Manager on your permit for every location?",
        hint: "One expired card per employee is a separate violation. A missing CFPM is an immediate critical under CalCode.",
        riskIfNo: "$500\u2013$5,000+", riskLabel: "per-violation fines \u2014 each expired card is separate",
        yesSignal: "All certs are current. This is the #1 cited violation in California \u2014 and you\u2019re clean.",
        noSignal: "Expired cards are top 3 cited violations statewide. Each one is a separate fine. A missing CFPM alone can suspend your permit.",
        partialSignal: "Most of your staff doesn\u2019t satisfy CalCode. Every card must be current, every shift, every location.",
      },
      {
        cardLabel: "Staff Cert Tracking",
        pillar: "Team Always Current", startState: "Cert Gaps Hidden",
        icon: "\u{1F465}", color: C.purple, bg: C.purpleBg, bd: C.purpleBd, tx: "#581c87",
        question: "When a new employee is hired, does your process capture their food handler card expiration and flag it automatically before it lapses?",
        hint: "Turnover without cert tracking creates gaps you won\u2019t know exist until they surface \u2014 often at the worst possible time.",
        riskIfNo: "Hidden", riskLabel: "certification gaps accumulating with every new hire",
        yesSignal: "Onboarding captures cert expirations from day one. You won\u2019t be blindsided by a gap you didn\u2019t know about.",
        noSignal: "Without a tracking system, every new hire is a potential unknown violation. You won\u2019t know until it costs you.",
        partialSignal: "A spreadsheet or reminder system fails the moment someone forgets to update it. You need a process, not a workaround.",
      },
    ],
  },
  {
    key: "fire", label: "Fire & Facility Safety", icon: "\u{1F525}", color: C.blue,
    questions: [
      {
        cardLabel: "Hood Cleaning Schedule",
        pillar: "Hood Cleaning Compliant", startState: "Hood Cleaning at Risk",
        icon: "\u{1F525}", color: C.blue, bg: C.blueBg, bd: C.blueBd, tx: "#1e3a8a",
        question: "Is your hood cleaning frequency set by your actual cooking load \u2014 and do you have signed service reports on file for every cleaning?",
        hint: "NFPA 96-2024 Table 12.4 requires frequency by fuel type and cooking volume \u2014 not the calendar. Once a year may not be compliant for your operation.",
        riskIfNo: "2\u20133\u00D7", riskLabel: "cost premium when the AHJ finds it before you do",
        yesSignal: "Hood cleaning is on the right schedule and documented. You\u2019re meeting NFPA 96-2024 Table 12.4 and your AHJ relationship is protected.",
        noSignal: "When the fire marshal finds it before you fix it, you pay emergency rates and get flagged for non-compliance \u2014 2\u20133\u00D7 the cost of a scheduled visit.",
        partialSignal: "Incomplete service reports fail an AHJ review the same way missing ones do \u2014 and leave you personally exposed.",
      },
      {
        cardLabel: "Ansul / Fire Suppression",
        pillar: "Suppression System Current", startState: "Suppression System at Risk",
        icon: "\u{1F9EF}", color: C.blue, bg: C.blueBg, bd: C.blueBd, tx: "#1e3a8a",
        question: "Has your Ansul or fire suppression system been inspected within the past 6 months \u2014 and is the signed inspection report tagged and on site?",
        hint: "NFPA 17A requires semi-annual inspection. The tag must be visible on the system. An uninspected suppression system can void your insurance coverage.",
        riskIfNo: "Policy void", riskLabel: "insurance may not cover a fire in an uninspected system",
        yesSignal: "Suppression system is current and tagged. You\u2019re meeting NFPA 17A and your insurance coverage is intact.",
        noSignal: "An uninspected suppression system can void your insurance for a fire event. This is your highest single facility liability.",
        partialSignal: "Missing the signed tag or an incomplete report creates the same insurance exposure as no inspection at all.",
      },
      {
        cardLabel: "Vendor Performance",
        pillar: "Vendors Performing to Standard", startState: "Vendor Performance Unverified",
        icon: "\u{1F50D}", color: C.darkgreen, bg: "#f0fdf4", bd: C.greenBd, tx: "#14532d",
        question: "For every service visit \u2014 hood cleaning, fire suppression, pest control, backflow \u2014 do you verify the work was done to standard before the vendor leaves your kitchen?",
        hint: "A signed work order means they showed up. It does not mean the work was done correctly. Deficiencies found after a vendor leaves become your problem.",
        riskIfNo: "Deferred liability", riskLabel: "deficiencies found later are attributed to your operation, not the vendor",
        yesSignal: "You verify vendor work before sign-off. Deficiencies get corrected on-site \u2014 not discovered when they cost you.",
        noSignal: "If work isn\u2019t verified on-site, deficiencies become your liability \u2014 not the vendor\u2019s problem.",
        partialSignal: "Selective verification creates blind spots. Every service visit needs a performance check before you sign off.",
      },
      {
        cardLabel: "Vendor Performance Records",
        pillar: "Performance Documented", startState: "Performance Undocumented",
        icon: "\u{1F4DD}", color: C.darkgreen, bg: "#f0fdf4", bd: C.greenBd, tx: "#14532d",
        question: "For every service visit, do you have a signed record documenting what was done, what was found, what was corrected, and who performed the work?",
        hint: "A COI proves a vendor was insured. A performance record proves the work was done correctly. You need both \u2014 and they serve different purposes.",
        riskIfNo: "$200\u2013$500+", riskLabel: "per regulatory follow-up visit plus inability to prove due diligence",
        yesSignal: "Service records document every visit \u2014 work performed, findings, corrections, and technician. That\u2019s a complete due diligence defense.",
        noSignal: "No performance record means you can\u2019t prove the work was done \u2014 even if it was. Inspectors and attorneys treat missing records as missing work.",
        partialSignal: "Incomplete records \u2014 missing signatures, no findings noted \u2014 are treated the same as no record by your AHJ and your insurer.",
      },
      {
        cardLabel: "Vendor COI, Licensing & Certifications",
        pillar: "Vendors Fully Verified", startState: "Vendor Qualifications Unverified",
        icon: "\u{1F4C1}", color: C.darkgreen, bg: "#f0fdf4", bd: C.greenBd, tx: "#14532d",
        question: "Do you have on file for every vendor: a current certificate of insurance, their state contractor license number, and applicable trade certifications \u2014 such as IKECA for hood cleaning?",
        hint: "A vendor without a current COI transfers their liability to you. A vendor without the right license or certification may invalidate your compliance documentation entirely.",
        riskIfNo: "Full liability", riskLabel: "absorbed from any incident \u2014 plus compliance docs may be void",
        yesSignal: "COIs, contractor licenses, and trade certifications are on file for every vendor. You\u2019ve verified they\u2019re qualified and insured.",
        noSignal: "A missing COI means you absorb the vendor\u2019s liability entirely. An unlicensed or uncertified vendor may void your hood cleaning or suppression system records entirely.",
        partialSignal: "Partial vendor qualification files create the gaps attorneys look for. COI alone isn\u2019t enough \u2014 license and certification must both be verified and current.",
      },
    ],
  },
];

const ALL_Q = GROUPS.flatMap((g, gi) =>
  g.questions.map((q, qi) => ({
    ...q, groupKey: g.key, groupLabel: g.label,
    globalIndex: GROUPS.slice(0, gi).reduce((s, x) => s + x.questions.length, 0) + qi,
  }))
);
const TOTAL = ALL_Q.length;

// ── UTILS ────────────────────────────────────────────────
function Logo({ size = "1.1rem", light = false }) {
  return (
    <span style={{ fontWeight: 800, fontSize: size, letterSpacing: "-0.03em", fontFamily: FF_HEAD, lineHeight: 1 }}>
      <span style={{ color: C.gold }}>E</span>
      <span style={{ color: light ? C.white : C.navy }}>vid</span>
      <span style={{ color: C.gold }}>LY</span>
    </span>
  );
}
function Label({ children }) {
  return <label style={{ fontSize: "0.7rem", fontWeight: 700, color: C.g5, display: "block", marginBottom: 5, fontFamily: FF, textTransform: "uppercase", letterSpacing: "0.04em" }}>{children}</label>;
}
function Select({ value, onChange, children, placeholder, "data-testid": testId }) {
  return (
    <select data-testid={testId} value={value} onChange={e => onChange(e.target.value)}
      style={{ ...inp(), color: value ? C.g8 : C.g4, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23a8a29e' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}

// ── STEP 1 — INTAKE FORM ─────────────────────────────────
function IntakeForm({ onSubmit }) {
  const [searchParams] = useSearchParams();
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", phone: "", businessName: "", street: "", city: "", state: "CA", zip: "", county: "", locations: "", opType: "", _source: "" });
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  // Pre-fill from URL params (e.g. from ScoreTable links)
  useEffect(() => {
    const countyParam = searchParams.get("county");
    const sourceParam = searchParams.get("source");
    if (countyParam) set("county", countyParam);
    if (sourceParam) setF(p => ({ ...p, _source: sourceParam }));
  }, []);

  function validate() {
    const e = {};
    if (!f.firstName.trim()) e.firstName = "Required";
    if (!f.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Valid email required";
    if (!f.county)     e.county = "Required";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    // Fire-and-forget lead capture — never blocks the user
    fetch(FORMSPREE, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: (f.firstName + " " + f.lastName).trim(),
        email: f.email,
        phone: f.phone || "(not provided)",
        company: f.businessName || "(not provided)",
        address: [f.street, f.city, f.state, f.zip].filter(Boolean).join(", ") || "(not provided)",
        county: f.county,
        locations: f.locations || "1",
        opType: f.opType || "(not provided)",
        source: f._source || "direct",
        _subject: "[EvidLY] Operations Check — " + (f.businessName || f.firstName),
      }),
    }).catch(() => {});
    onSubmit(f);
  }

  const fld = (key, label, node) => (
    <div style={{ marginBottom: 13 }}>
      <Label>{label}</Label>
      {node}
      {errors[key] && <div style={{ fontSize: "0.68rem", color: C.red, marginTop: 3, fontFamily: FF }}>{errors[key]}</div>}
    </div>
  );

  return (
    <div data-testid="intake-form" style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.g2}`, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #253356, ${C.navy})`, padding: "24px 26px 20px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
        <div style={{ position: "relative" }}>
          <Logo size="1rem" light />
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: "0.58rem", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gold, marginBottom: 6, fontFamily: FF_MONO }}>Free Operations Check</div>
            <div style={{ fontWeight: 800, fontSize: "1.15rem", color: C.white, fontFamily: FF_HEAD, letterSpacing: "-0.03em", lineHeight: 1.25 }}>Know where your operation stands — before it costs you.</div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", marginTop: 6, fontFamily: FF, lineHeight: 1.5 }}>11 questions across Food Safety and Fire &amp; Facility Safety. Your full risk report generated instantly.</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "22px 26px 28px" }}>
        <div style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.g4, marginBottom: 16, fontFamily: FF }}>Tell us about your operation</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
          {fld("firstName", "First Name *", <input data-testid="intake-first-name" style={inp({ borderColor: errors.firstName ? C.red : C.g3 })} value={f.firstName} onChange={e => set("firstName", e.target.value)} placeholder="First name" />)}
          {fld("lastName",  "Last Name",  <input style={inp({ borderColor: errors.lastName  ? C.red : C.g3 })} value={f.lastName}  onChange={e => set("lastName",  e.target.value)} placeholder="Last name"  />)}
        </div>

        {fld("email", "Work Email *", <input data-testid="intake-email" type="email" style={inp({ borderColor: errors.email ? C.red : C.g3 })} value={f.email} onChange={e => set("email", e.target.value)} placeholder="you@yourbusiness.com" />)}
        {fld("businessName", "Business Name", <input data-testid="intake-business" style={inp({ borderColor: errors.businessName ? C.red : C.g3 })} value={f.businessName} onChange={e => set("businessName", e.target.value)} placeholder="Your business or DBA name" />)}
        {fld("phone", "Phone", <input type="tel" style={inp()} value={f.phone} onChange={e => set("phone", e.target.value)} placeholder="(555) 123-4567" />)}
        {fld("street", "Street Address", <input style={inp()} value={f.street} onChange={e => set("street", e.target.value)} placeholder="123 Main Street" />)}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0 14px" }}>
          {fld("city", "City", <input style={inp()} value={f.city} onChange={e => set("city", e.target.value)} placeholder="City" />)}
          {fld("state", "State", <input style={inp()} value={f.state} onChange={e => set("state", e.target.value)} placeholder="CA" />)}
          {fld("zip", "Zip", <input style={inp()} value={f.zip} onChange={e => set("zip", e.target.value)} placeholder="90210" />)}
        </div>
        {fld("county", "County *", <Select data-testid="intake-county" value={f.county} onChange={v => set("county", v)} placeholder="Select county">{CA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}</Select>)}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
          {fld("locations", "Number of Locations",
            <Select value={f.locations} onChange={v => set("locations", v)} placeholder="How many?">
              {["1","2","3","4","5","6","7","8","9","10","11+"].map(n => <option key={n} value={n}>{n}</option>)}
            </Select>
          )}
          {fld("opType", "Operation Type",
            <Select value={f.opType} onChange={v => set("opType", v)} placeholder="Select type">
              {OP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          )}
        </div>

        <button data-testid="intake-submit" className="btn-lift" onClick={handleSubmit} style={{ width: "100%", padding: "15px", background: C.gold, color: C.white, border: "none", borderRadius: 10, fontWeight: 800, fontSize: "0.96rem", cursor: "pointer", fontFamily: FF, marginTop: 4 }}>
          Start My Operations Check →
        </button>
        <p style={{ textAlign: "center", fontSize: "0.7rem", color: C.g4, margin: "10px 0 0", fontFamily: FF, lineHeight: 1.5 }}>
          Free. No credit card. Your report is ready the moment you finish.
        </p>
      </div>
    </div>
  );
}

// ── STEP 2 — ASSESSMENT (one question per screen) ────────
function Assessment({ form, onComplete, onRestartQuestions }) {
  const [answers, setAnswers] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);

  const q = ALL_Q[currentQ];
  const group = GROUPS.find(g => g.key === q.groupKey);

  function handleAnswer(val) {
    const next = [...answers, val];
    setAnswers(next);
    if (next.length < TOTAL) {
      setCurrentQ(i => i + 1);
    } else {
      setTimeout(() => onComplete(next), 300);
    }
  }

  function handleBack() {
    if (currentQ > 0) {
      setCurrentQ(i => i - 1);
      setAnswers(a => a.slice(0, -1));
    }
  }

  const aColor = { yes: C.green, partial: C.amber, no: C.red };
  const aLabel = { yes: "\u2713 On track", partial: "~ Gaps present", no: "\u2717 Needs attention" };

  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.g2}`, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.g2}`, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Logo size="0.9rem" />
          <div style={{ fontSize: "0.58rem", color: C.g4, marginTop: 1, fontFamily: FF }}>{form.businessName || form.firstName + " · " + form.county + " County"}</div>
        </div>
        {/* Progress dots */}
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          {ALL_Q.map((_, i) => {
            const ans = answers[i];
            const isCurr = i === currentQ;
            return (
              <div key={i} style={{
                width: isCurr ? 12 : ans ? 10 : 6,
                height: 6, borderRadius: 3,
                background: ans === "yes" ? C.green : ans === "partial" ? C.amber : ans === "no" ? C.red : isCurr ? C.navy : C.g2,
                transition: "all 0.25s",
              }} />
            );
          })}
        </div>
        {currentQ > 0 && <button onClick={handleBack} style={{ fontSize: "0.65rem", color: C.g5, background: "none", border: `1px solid ${C.g2}`, cursor: "pointer", fontFamily: FF, whiteSpace: "nowrap", padding: "3px 8px", borderRadius: 4 }}>{"\u2190"} Back</button>}
        <button onClick={onRestartQuestions} style={{ fontSize: "0.65rem", color: C.g4, background: "none", border: "none", cursor: "pointer", fontFamily: FF, whiteSpace: "nowrap", marginLeft: 4 }}>Restart \u21BA</button>
      </div>

      {/* Group label + progress */}
      <div style={{ padding: "12px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.85rem" }}>{group.icon}</span>
          <div style={{ fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: group.color, fontFamily: FF }}>{group.label}</div>
        </div>
        <div style={{ fontSize: "0.65rem", color: C.g4, fontFamily: FF }}>{currentQ + 1} of {TOTAL}</div>
      </div>

      {/* Question card */}
      <div style={{ padding: "16px 20px 24px" }}>
        <div data-testid="assessment-question" key={currentQ} className="slide-in" style={{ borderRadius: 14, border: `2px solid ${q.color}`, borderLeft: `5px solid ${q.color}`, background: q.bg, padding: "22px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: "1.4rem" }}>{q.icon}</span>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", color: q.tx, fontFamily: FF_HEAD, lineHeight: 1.25, letterSpacing: "-0.02em" }}>{q.cardLabel}</div>
          </div>
          <p style={{ fontSize: "0.93rem", fontWeight: 700, color: q.tx, margin: "0 0 8px", lineHeight: 1.6, fontFamily: FF }}>{q.question}</p>
          <p style={{ fontSize: "0.73rem", color: q.tx, opacity: 0.55, margin: "0 0 20px", lineHeight: 1.55, fontFamily: FF, fontStyle: "italic" }}>{q.hint}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button data-testid="answer-yes" className="answer-btn" onClick={() => handleAnswer("yes")}     style={{ padding: "14px 18px", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, textAlign: "left", background: C.greenBg, color: "#14532d", border: `1.5px solid ${C.greenBd}`, fontFamily: FF, cursor: "pointer" }}>{"\u2713"}&nbsp;&nbsp;Yes — documented and current</button>
            <button data-testid="answer-partial" className="answer-btn" onClick={() => handleAnswer("partial")} style={{ padding: "14px 18px", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, textAlign: "left", background: C.amberBg, color: "#78350f", border: `1.5px solid ${C.amberBd}`, fontFamily: FF, cursor: "pointer" }}>~&nbsp;&nbsp;Partially — some gaps I'm aware of</button>
            <button data-testid="answer-no" className="answer-btn" onClick={() => handleAnswer("no")}      style={{ padding: "14px 18px", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, textAlign: "left", background: C.redBg,   color: "#7f1d1d", border: `1.5px solid ${C.redBd}`,   fontFamily: FF, cursor: "pointer" }}>{"\u2717"}&nbsp;&nbsp;No — not current or not sure</button>
          </div>
        </div>

        {/* Previous answers summary (last 3 only) */}
        {answers.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: "0.57rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.g4, fontFamily: FF, marginBottom: 2 }}>Answered</div>
            {answers.slice(-3).map((a, idx) => {
              const qi = answers.length - answers.slice(-3).length + idx;
              const prev = ALL_Q[qi];
              const col = aColor[a];
              return (
                <div key={qi} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", borderRadius: 8, background: C.g1, border: `1px solid ${C.g2}`, borderLeft: `3px solid ${col}` }}>
                  <span style={{ fontSize: "0.8rem" }}>{prev.icon}</span>
                  <span style={{ flex: 1, fontSize: "0.72rem", fontWeight: 600, color: C.g5, fontFamily: FF }}>{prev.cardLabel}</span>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, color: col, background: C.white, border: `1px solid ${col}22`, padding: "2px 8px", borderRadius: 100, fontFamily: FF, whiteSpace: "nowrap" }}>{aLabel[a]}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── STEP 3 — REPORT ──────────────────────────────────────
function Report({ form, answers, onBookTour, magicLinkSent }) {
  const yesCount     = answers.filter(a => a === "yes").length;
  const noCount      = answers.filter(a => a === "no").length;
  const partialCount = answers.filter(a => a === "partial").length;
  const gapCount     = noCount + partialCount;

  const posture = noCount >= 4 ? "critical" : noCount >= 2 ? "high" : noCount >= 1 || partialCount >= 3 ? "moderate" : "strong";
  const PM = {
    critical: { label: "Critical Gaps Identified",  color: "#991B1B", bg: "#fef2f2", bd: "#fca5a5", dot: C.red },
    high:     { label: "High-Risk Areas Found",     color: C.orange,  bg: C.orangeBg, bd: C.orangeBd, dot: C.orange },
    moderate: { label: "Some Areas Need Attention", color: C.amber,   bg: C.amberBg,  bd: C.amberBd,  dot: C.amber },
    strong:   { label: "Well Positioned",           color: C.green,   bg: C.greenBg,  bd: C.greenBd,  dot: C.green },
  };
  const P = PM[posture];
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div data-testid="operations-check-report" style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.g2}`, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
      <div style={{ padding: "22px 22px 28px" }}>

        {/* REPORT HEADER */}
        <div style={{ background: `linear-gradient(135deg, #253356, ${C.navy})`, borderRadius: 14, padding: "22px 22px 18px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
              <div>
                <Logo size="0.95rem" light />
                <div style={{ fontSize: "0.57rem", fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 2, fontFamily: FF }}>Free Operations Check</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.67rem", color: "rgba(255,255,255,0.28)", fontFamily: FF }}>{dateStr}</div>
                <div style={{ fontSize: "0.67rem", color: "rgba(255,255,255,0.28)", fontFamily: FF }}>{form.county} County, CA</div>
                <div style={{ fontSize: "0.58rem", color: C.gold, fontFamily: FF_MONO, marginTop: 3, letterSpacing: "0.08em" }}>Jurisdiction: {form.county} County, California</div>
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem", color: C.white, fontFamily: FF_HEAD, marginBottom: 2, letterSpacing: "-0.03em" }}>{form.businessName || form.firstName + "'s Operation"}</div>
            <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.38)", fontFamily: FF }}>{[form.opType, form.locations !== "1" && form.locations ? form.locations + " Locations" : "1 Location"].filter(Boolean).join(" · ")}</div>
          </div>
        </div>

        {/* REPORT READY BANNER */}
        <div style={{ background: C.greenBg, border: `1px solid ${C.greenBd}`, borderLeft: `4px solid ${C.green}`, borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{"\u2705"}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.86rem", color: C.darkgreen, fontFamily: FF }}>Your Operations Check is ready.</div>
            <div style={{ fontSize: "0.73rem", color: C.darkgreen, opacity: 0.75, fontFamily: FF, marginTop: 2 }}>
              Review your results below. Book a guided tour to see your full dashboard live with your county's data.
            </div>
          </div>
        </div>

        {/* MAGIC LINK BANNER */}
        {magicLinkSent && (
          <div style={{ background: C.blueBg, border: `1px solid ${C.blueBd}`, borderLeft: `4px solid ${C.blue}`, borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{"\u2709\uFE0F"}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.86rem", color: "#1e3a8a", fontFamily: FF }}>Check your email for dashboard access.</div>
              <div style={{ fontSize: "0.73rem", color: "#1e3a8a", opacity: 0.75, fontFamily: FF, marginTop: 2 }}>
                We sent a link to <strong>{form.email}</strong> — click to unlock your full dashboard with {form.county} County data pre-loaded.
              </div>
            </div>
          </div>
        )}

        {/* POSTURE */}
        <div style={{ background: P.bg, border: `1px solid ${P.bd}`, borderLeft: `4px solid ${P.dot}`, borderRadius: 10, padding: "13px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: P.dot, flexShrink: 0, boxShadow: `0 0 0 3px ${P.bd}` }} />
          <div style={{ flex: 1 }}>
            <div data-testid="posture-badge" style={{ fontWeight: 800, fontSize: "0.96rem", color: P.color, fontFamily: FF_HEAD, letterSpacing: "-0.02em" }}>{P.label}</div>
            <div style={{ fontSize: "0.73rem", color: P.color, opacity: 0.65, fontFamily: FF, marginTop: 2 }}>
              {yesCount} on track · {partialCount} partial · {noCount} {noCount === 1 ? "area needs" : "areas need"} attention — across {TOTAL} questions
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 110, justifyContent: "flex-end" }}>
            {answers.map((a, i) => (
              <div key={i} title={ALL_Q[i]?.cardLabel} style={{ width: 8, height: 8, borderRadius: "50%", background: a === "yes" ? C.green : a === "partial" ? C.amber : C.red }} />
            ))}
          </div>
        </div>

        {/* EXECUTIVE NARRATIVE */}
        <div style={{ background: C.cream, border: `1px solid ${C.g2}`, borderRadius: 10, padding: "16px 18px", marginBottom: 14 }}>
          <div style={{ fontSize: "0.58rem", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gold, marginBottom: 8, fontFamily: FF_MONO }}>Executive Summary</div>
          <p style={{ fontSize: "0.82rem", color: C.g8, margin: 0, lineHeight: 1.7, fontFamily: FF }}>
            {posture === "strong"
              ? `${form.businessName || form.firstName + "\u2019s operation"} in ${form.county} County is well positioned across both food safety and facility safety. ${yesCount} of ${TOTAL} operational areas are documented and current. Continue maintaining your current practices and ensure records remain accessible for your next unannounced inspection.`
              : posture === "moderate"
              ? `${form.businessName || form.firstName + "\u2019s operation"} in ${form.county} County has ${gapCount} area${gapCount > 1 ? "s" : ""} that need attention. ${noCount > 0 ? `${noCount} area${noCount > 1 ? "s" : ""} currently lack${noCount === 1 ? "s" : ""} documentation or compliance \u2014 each representing a potential citation. ` : ""}${partialCount > 0 ? `${partialCount} area${partialCount > 1 ? "s" : ""} ha${partialCount > 1 ? "ve" : "s"} partial gaps that should be closed before your next inspection. ` : ""}Addressing these gaps proactively is significantly less costly than addressing them after an inspector documents them.`
              : posture === "high"
              ? `${form.businessName || form.firstName + "\u2019s operation"} in ${form.county} County has ${noCount} undocumented area${noCount > 1 ? "s" : ""} and ${partialCount} partial gap${partialCount > 1 ? "s" : ""}. These represent significant financial exposure \u2014 from per-violation fines to temporary closure risk. The areas identified in this report are the same ones ${form.county} County inspectors prioritize during unannounced visits.`
              : `${form.businessName || form.firstName + "\u2019s operation"} in ${form.county} County has critical gaps across ${noCount} area${noCount > 1 ? "s" : ""}. This level of undocumented compliance represents immediate financial and operational risk \u2014 including potential temporary closure, per-violation fines, and insurance coverage gaps. Addressing these gaps should be treated as an urgent priority.`
            }
          </p>
        </div>

        {/* RISK SUMMARY */}
        {gapCount > 0 && (
          <div style={{ background: C.navy, borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ fontSize: "0.58rem", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gold, marginBottom: 10, fontFamily: FF_MONO }}>What These Gaps Mean for Your Business</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {answers.map((a, i) => {
                if (a === "yes") return null;
                const q = ALL_Q[i];
                return (
                  <div key={i} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.1)", flex: "1 1 110px" }}>
                    <div style={{ fontSize: "0.95rem", marginBottom: 4 }}>{q.icon}</div>
                    <div style={{ fontSize: "0.66rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", fontFamily: FF, marginBottom: 3, lineHeight: 1.3 }}>{q.cardLabel}</div>
                    <div style={{ fontWeight: 500, fontSize: "1rem", color: C.gold, fontFamily: FF_MONO, lineHeight: 1, letterSpacing: "-0.02em" }}>{q.riskIfNo}</div>
                    <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.28)", fontFamily: FF, marginTop: 3, lineHeight: 1.4 }}>{q.riskLabel}</div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          </div>
        )}

        {/* PSE & SUPPRESSION ADVISORY */}
        {answers.slice(6, 8).some(a => a !== "yes") && (
          <div style={{ background: "#eff6ff", border: `1px solid ${C.blueBd}`, borderLeft: `4px solid ${C.blue}`, borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: "1rem" }}>{"\uD83E\uDDEF"}</span>
              <div style={{ fontWeight: 800, fontSize: "0.86rem", color: "#1e3a8a", fontFamily: FF_HEAD }}>PSE & Suppression System Advisory</div>
            </div>
            <p style={{ fontSize: "0.78rem", color: "#1e3a8a", margin: "0 0 6px", lineHeight: 1.6, fontFamily: FF }}>
              Your answers indicate gaps in hood cleaning documentation or fire suppression system inspection records. Under NFPA 96-2024 Table 12.4, hood cleaning frequency is determined by your cooking load and fuel type — not a fixed calendar schedule. Your Ansul or suppression system requires semi-annual inspection per NFPA 17A, and the signed tag must be visible on-site.
            </p>
            <p style={{ fontSize: "0.74rem", color: "#1e3a8a", opacity: 0.7, margin: 0, lineHeight: 1.55, fontFamily: FF, fontStyle: "italic" }}>
              An uninspected suppression system can void your insurance coverage for a fire event. This is your highest single facility liability.
            </p>
          </div>
        )}

        {/* PRIORITY ACTION ITEMS */}
        {gapCount > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: C.navy, fontFamily: FF, marginBottom: 10 }}>Priority Action Items</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {[...ALL_Q]
                .map((q, i) => ({ ...q, ans: answers[i], origIndex: i }))
                .filter(q => q.ans !== "yes")
                .sort((a, b) => (a.ans === "no" ? 0 : 1) - (b.ans === "no" ? 0 : 1))
                .map((q, rank) => (
                  <div key={q.origIndex} style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "13px 15px", borderRadius: 10,
                    background: q.ans === "no" ? C.redBg : C.amberBg,
                    border: `1px solid ${q.ans === "no" ? C.redBd : C.amberBd}`,
                    borderLeft: `4px solid ${q.ans === "no" ? C.red : C.amber}`,
                  }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: q.ans === "no" ? C.red : C.amber, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800, fontFamily: FF, flexShrink: 0, marginTop: 2 }}>
                      {rank + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "0.86rem", color: q.ans === "no" ? "#7f1d1d" : "#78350f", fontFamily: FF, lineHeight: 1.3 }}>{q.cardLabel}</div>
                      <p style={{ fontSize: "0.74rem", color: q.ans === "no" ? "#7f1d1d" : "#78350f", margin: "4px 0 6px", lineHeight: 1.5, fontFamily: FF, opacity: 0.8 }}>
                        {q.ans === "no" ? q.noSignal : q.partialSignal}
                      </p>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.white, border: `1px solid ${q.ans === "no" ? C.redBd : C.amberBd}`, borderRadius: 6, padding: "4px 10px" }}>
                        <span style={{ fontSize: "0.76rem", fontWeight: 900, color: q.color, fontFamily: FF }}>{q.riskIfNo}</span>
                        <span style={{ fontSize: "0.62rem", color: q.tx, opacity: 0.6, fontFamily: FF }}>{q.riskLabel}</span>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* GROUPED BREAKDOWN */}
        {GROUPS.map((group) => {
          const gqs = ALL_Q.filter(q => q.groupKey === group.key);
          return (
            <div key={group.key} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: "0.9rem" }}>{group.icon}</span>
                <div style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: group.color, fontFamily: FF }}>{group.label}</div>
                <div style={{ flex: 1, height: 1, background: C.g2 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {gqs.map((q) => {
                  const ans    = answers[q.globalIndex];
                  const isGood = ans === "yes";
                  const signal = ans === "yes" ? q.yesSignal : ans === "partial" ? q.partialSignal : q.noSignal;
                  const cardColor = isGood ? C.green : ans === "partial" ? C.amber : C.red;
                  const aBg    = isGood ? C.greenBg : ans === "partial" ? C.amberBg : C.redBg;
                  const aBd    = isGood ? C.greenBd : ans === "partial" ? C.amberBd : C.redBd;
                  const statusLabel = isGood ? "On Track" : ans === "partial" ? "Gaps Present" : "Needs Attention";
                  return (
                    <div key={q.globalIndex} style={{ borderRadius: 10, border: `1px solid ${isGood ? C.g2 : aBd}`, borderLeft: `4px solid ${isGood ? C.green : q.color}`, background: isGood ? C.g1 : aBg }}>
                      <div style={{ padding: "11px 13px", display: "flex", alignItems: "center", gap: 9 }}>
                        <span style={{ fontSize: "1rem", flexShrink: 0 }}>{q.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.56rem", fontWeight: 600, color: isGood ? C.g4 : q.color, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FF, lineHeight: 1 }}>{q.startState}</div>
                          <div style={{ fontWeight: 800, fontSize: "0.86rem", color: isGood ? C.green : q.color, fontFamily: FF, lineHeight: 1.2 }}>{isGood ? q.pillar : q.cardLabel}</div>
                        </div>
                        <span style={{ fontSize: "0.63rem", fontWeight: 700, color: cardColor, background: C.white, border: `1px solid ${aBd}`, padding: "3px 9px", borderRadius: 100, flexShrink: 0, fontFamily: FF, whiteSpace: "nowrap" }}>{statusLabel}</span>
                      </div>
                      <div style={{ padding: "0 13px 11px", paddingLeft: 44 }}>
                        <p style={{ fontSize: "0.74rem", color: isGood ? C.g5 : q.tx, margin: "0 0 6px", lineHeight: 1.55, fontFamily: FF }}>{signal}</p>
                        {!isGood && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.white, border: `1px solid ${aBd}`, borderRadius: 6, padding: "4px 10px" }}>
                            <span style={{ fontSize: "0.76rem", fontWeight: 900, color: q.color, fontFamily: FF }}>{q.riskIfNo}</span>
                            <span style={{ fontSize: "0.62rem", color: q.tx, opacity: 0.6, fontFamily: FF }}>{q.riskLabel}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* DISCLAIMER */}
        <div style={{ background: C.cream, border: `1px solid ${C.g2}`, borderRadius: 9, padding: "10px 13px", marginBottom: 16 }}>
          <p style={{ fontSize: "0.69rem", color: C.g5, margin: 0, lineHeight: 1.6, fontFamily: FF, fontStyle: "italic" }}>
            This report reflects what you shared — it is not an inspection result, a compliance score, or a rating. Your actual standing is determined by your jurisdiction. EvidLY translates operational signals into financial risk — so you can see gaps, close them, and lead with confidence.
          </p>
        </div>

        {/* CTAs */}
        <div className="report-ctas" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="btn-lift" onClick={onBookTour} style={{ background: C.navy, borderRadius: 14, padding: "18px 15px", textAlign: "center", position: "relative", overflow: "hidden", border: "none", cursor: "pointer", width: "100%" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
            <div style={{ fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, marginBottom: 5, fontFamily: FF }}>Book a Guided Tour</div>
            <p style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.45)", margin: "0 0 13px", lineHeight: 1.6, fontFamily: FF }}>30 minutes. Your county, your data, your dashboard — live.</p>
            <div style={{ width: "100%", padding: "10px", background: C.gold, color: C.white, borderRadius: 7, fontWeight: 700, fontSize: "0.8rem", fontFamily: FF }}>
              Schedule Now →
            </div>
          </button>
          <div style={{ background: C.cream, border: `1px solid ${C.g2}`, borderRadius: 12, padding: "18px 15px", textAlign: "center" }}>
            <div style={{ fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.navy, marginBottom: 5, fontFamily: FF }}>Start Your Free Trial</div>
            <p style={{ fontSize: "0.74rem", color: C.g5, margin: "0 0 13px", lineHeight: 1.6, fontFamily: FF }}>45 days free. No credit card required. Your county is pre-loaded.</p>
            <a href="/signup" style={{ display: "block", width: "100%", padding: "10px", background: C.navy, color: C.white, borderRadius: 7, fontWeight: 700, fontSize: "0.8rem", fontFamily: FF, boxSizing: "border-box", textDecoration: "none", textAlign: "center" }}>
              Get Started Free →
            </a>
          </div>
        </div>

        {magicLinkSent && (
          <p style={{ textAlign: "center", fontSize: "0.73rem", color: C.navy, marginTop: 10, fontFamily: FF, fontWeight: 600 }}>
            {"\u{1F4E7}"} We've sent a dashboard access link to {form.email} — check your inbox.
          </p>
        )}

        <p style={{ textAlign: "center", fontSize: "0.67rem", color: C.g4, marginTop: 14, fontFamily: FF }}>
          Questions? <a href="mailto:founders@getevidly.com" style={{ color: C.navy }}>founders@getevidly.com</a> · (855) EVIDLY1
        </p>
      </div>
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────
export default function OperationsCheck() {
  const [step, setStep]       = useState("form");
  const [form, setForm]       = useState(null);
  const [answers, setAnswers] = useState([]);
  const [showTourModal, setShowTourModal] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => { document.title = "Free Operations Check — EvidLY"; }, []);

  function handleFormSubmit(f) { setForm(f); setStep("assessment"); window.scrollTo(0, 0); }

  function handleAssessmentComplete(a) {
    setAnswers(a);
    setStep("report");
    window.scrollTo(0, 0);

    // Map answers: "yes"→1, "partial"→2, "no"→3
    const M = { yes: 1, partial: 2, no: 3 };
    const noCount = a.filter(x => x === "no").length;
    const partialCount = a.filter(x => x === "partial").length;
    const posture = noCount >= 4 ? "critical" : noCount >= 2 ? "high" : noCount >= 1 || partialCount >= 3 ? "moderate" : "strong";
    const foodYes = a.slice(0, 6).filter(x => x === "yes").length;
    const fireYes = a.slice(6).filter(x => x === "yes").length;

    // Fire-and-forget DB persist
    supabase.from("irr_submissions").insert({
      first_name: form.firstName,
      last_name: form.lastName || null,
      email: form.email,
      phone: form.phone || null,
      business_name: form.businessName || null,
      street: form.street || null,
      city: form.city || null,
      state: form.state || "CA",
      zip: form.zip || null,
      county: form.county,
      locations: form.locations || null,
      op_type: form.opType || null,
      q1_receiving_temps: M[a[0]],
      q2_cold_hot_holding: M[a[1]],
      q3_cooldown_logs: M[a[2]],
      q4_checklists_haccp: M[a[3]],
      q5_food_handler_cards: M[a[4]],
      q6_staff_cert_tracking: M[a[5]],
      q7_hood_cleaning: M[a[6]],
      q8_fire_suppression: M[a[7]],
      q9_vendor_performance: M[a[8]],
      q10_vendor_records: M[a[9]],
      q11_vendor_coi: M[a[10]],
      posture,
      food_safety_score: foodYes,
      facility_safety_score: fireYes,
      source_page: form._source || "operations-check",
    }).then(() => {}).catch(() => {});

    // Fire-and-forget magic link — sends dashboard access email
    supabase.auth.signInWithOtp({
      email: form.email,
      options: {
        emailRedirectTo: window.location.origin + "/onboarding",
        data: { source: "irr", county: form.county, business_name: form.businessName },
      },
    }).then(() => setMagicLinkSent(true)).catch(() => {});
  }
  function handleRestartQuestions() { setStep("assessment"); setAnswers([]); window.scrollTo(0, 0); }
  function handleFullReset() { setStep("form"); setForm(null); setAnswers([]); }

  return (
    <div style={{ fontFamily: FF, background: C.cream, minHeight: "100vh" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        button, a { font-family: inherit; cursor: pointer; }
        select option { color: #1c1917; }
        :focus-visible { outline: 2px solid #A08C5A; outline-offset: 2px; }
        input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid #A08C5A; outline-offset: 0; }
        .answer-btn {
          transition: transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s ease, filter 0.15s ease;
        }
        .answer-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
          filter: brightness(0.97);
        }
        .answer-btn:active { transform: translateY(0); }
        .btn-lift {
          transition: transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s ease;
        }
        .btn-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .slide-in { animation: slideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
        @media (max-width: 480px) { .report-ctas { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Tour modal */}
      {showTourModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.white, borderRadius: 16, maxWidth: 480, width: "100%", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ background: `linear-gradient(135deg, #253356, ${C.navy})`, padding: "22px 24px 18px", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
              <Logo size="0.95rem" light />
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: C.white, fontFamily: FF_HEAD, marginTop: 10, letterSpacing: "-0.03em" }}>Book Your 30-Minute Guided Tour</div>
              <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.4)", marginTop: 4, fontFamily: FF }}>Your county, your data, your dashboard — live.</div>
            </div>
            <div style={{ padding: "20px 24px 24px" }}>
              <p style={{ fontSize: "0.8rem", color: C.g5, margin: "0 0 18px", lineHeight: 1.6, fontFamily: FF }}>
                We'll show you exactly how EvidLY works for your operation — real jurisdiction data, your compliance picture, and a walkthrough of every dashboard.
              </p>
              <a href={CALENDLY} target="_blank" rel="noreferrer" style={{ display: "block", width: "100%", padding: "13px", background: C.gold, color: C.white, borderRadius: 9, fontWeight: 800, fontSize: "0.92rem", textAlign: "center", fontFamily: FF, border: "none", cursor: "pointer", boxSizing: "border-box", textDecoration: "none" }}>
                Open Scheduling Page →
              </a>
              <button onClick={() => setShowTourModal(false)} style={{ width: "100%", padding: "10px", background: "none", border: "none", color: C.g4, fontSize: "0.75rem", fontFamily: FF, marginTop: 10, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.g2}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", height: 52 }}>
          <a href="/" style={{ textDecoration: "none" }}><Logo size="1rem" /></a>
          <div style={{ marginLeft: 14, display: "flex", gap: 6 }}>
            {[["form","1 \u00B7 Info"],["assessment","2 \u00B7 Check"],["report","3 \u00B7 Report"]].map(([k, label]) => (
              <div key={k} style={{ fontSize: "0.68rem", fontWeight: step === k ? 700 : 400, color: step === k ? C.navy : C.g4, fontFamily: FF, padding: "2px 0", borderBottom: `2px solid ${step === k ? C.gold : "transparent"}` }}>
                {label}
              </div>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={handleFullReset} style={{ fontSize: "0.7rem", color: C.g4, background: "none", border: "none", cursor: "pointer", fontFamily: FF }}>Start Over {"\u21BA"}</button>
            <a href="/" style={{ fontSize: "0.7rem", color: C.g4, textDecoration: "none", fontFamily: FF }}>{"\u2190"} EvidLY</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px 20px 60px" }}>
        <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>Free Operations Check for California Commercial Kitchens</h1>
        {step === "form"       && <IntakeForm onSubmit={handleFormSubmit} />}
        {step === "assessment" && <Assessment form={form} onComplete={handleAssessmentComplete} onRestartQuestions={handleRestartQuestions} />}
        {step === "report"     && <Report form={form} answers={answers} onBookTour={() => setShowTourModal(true)} magicLinkSent={magicLinkSent} />}
      </div>
    </div>
  );
}
