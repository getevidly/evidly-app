// @ts-nocheck
import { useState } from "react";

// ─── EvidLY brand tokens ───────────────────────────────────────────
const NAVY = "#1E2D4D";
const GOLD = "#A08C5A";
const CREAM = "#FAF7F0";
const TEAL = "#0F766E";
const CORAL = "#C2553A";
const INK = "#26303F";
const MUTE = "#6B7280";
const LINE = "#E5E0D5";
const AMBER = "#9A7B2D";

const FONT_HEAD = "'Montserrat', 'Helvetica Neue', sans-serif";
const FONT_BODY = "'Georgia', 'Times New Roman', serif";
const FONT_UI = "'Helvetica Neue', Arial, sans-serif";

// ─── Sample preview data (mockup only) ─────────────────────────────
const POLICY = {
  carrier: "Sample Mutual Insurance Co.",
  policyNo: "CPP-2026-048291",
  form: "Commercial Package — Property (CP 00 10) + General Liability (CG 00 01); CP 04 11 Protective Safeguards (P-1, P-5)",
  period: "03/01/2026 – 03/01/2027",
  insured: "Valley Grill Group LLC",
  agent: "J. Martinez, Lic. #0K12345 — Central Valley Insurance Services",
  readDate: "June 7, 2026",
  authDate: "June 5, 2026",
};
const LOCS = [
  { id: "fre", name: "Fresno" },
  { id: "mod", name: "Modesto" },
  { id: "mer", name: "Merced" },
];

// state per finding × location × mode: 'ok' | 'gap' | 'norec' | 'item'
function stateFor(fid, loc, mode) {
  if (mode === "prospect") return ["F-04", "F-05", "F-06", "G-01"].includes(fid) ? "item" : "norec";
  const bound = {
    "F-01": { fre: "gap", mod: "ok", mer: "gap" },
    "F-02": { fre: "gap", mod: "gap", mer: "gap" },
    "F-03": { fre: "ok", mod: "ok", mer: "ok" },
    "F-04": { fre: "item", mod: "item", mer: "item" },
    "F-05": { fre: "item", mod: "item", mer: "item" },
    "F-06": { fre: "item", mod: "item", mer: "item" },
    "G-01": { fre: "item", mod: "item", mer: "item" },
    "G-02": { fre: "ok", mod: "gap", mer: "ok" },
  };
  return bound[fid][loc];
}

const STATE_META = {
  ok: { c: TEAL, agent: "satisfied", kitchen: "no gap" },
  gap: { c: CORAL, agent: "documented gap", kitchen: "to discuss" },
  norec: { c: AMBER, agent: "no record bound", kitchen: "no record yet" },
  item: { c: NAVY, agent: "evaluation item", kitchen: "for your agent" },
};

function locLabel(fid, mode) {
  if (mode === "prospect") return "All listed locations · no record yet";
  return {
    "F-01": "Fresno & Merced (gap) · Modesto clear",
    "F-02": "All locations",
    "F-03": "All locations · clear",
    "F-04": "All locations",
    "F-05": "All locations · shared limit",
    "F-06": "All locations",
    "G-01": "Per building · all locations",
    "G-02": "Modesto (gap) · others clear",
  }[fid];
}

// ─── Atoms ─────────────────────────────────────────────────────────
function GoldRule({ w = 32 }) {
  return <div style={{ width: w, height: 2, background: GOLD, margin: "6px 0 14px" }} />;
}
function PartTag({ part }) {
  const m = { fire: { c: CORAL, label: "Fire Safety — AHJ" }, food: { c: TEAL, label: "Food Safety — EHD" }, general: { c: NAVY, label: "Policy-Wide Conditions" } }[part];
  return <span style={{ display: "inline-block", fontFamily: FONT_UI, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: m.c, border: `1px solid ${m.c}`, borderRadius: 3, padding: "2px 8px" }}>{m.label}</span>;
}
function ExposureChip({ flag }) {
  const m = {
    high: { bg: "#FBEAE5", fg: CORAL, label: "EXPOSURE: HIGH" },
    elevated: { bg: "#FBF3E0", fg: AMBER, label: "EXPOSURE: ELEVATED" },
    low: { bg: "#EEF1F6", fg: NAVY, label: "EXPOSURE: LOW" },
    satisfied: { bg: "#E8F2F1", fg: TEAL, label: "CONDITION SATISFIED" },
  }[flag];
  if (!m) return null;
  return <span style={{ fontFamily: FONT_UI, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", background: m.bg, color: m.fg, borderRadius: 3, padding: "3px 8px", whiteSpace: "nowrap" }}>{m.label}</span>;
}
function SatisfiedChip() {
  return <span style={{ fontFamily: FONT_UI, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", background: "#E8F2F1", color: TEAL, borderRadius: 3, padding: "3px 8px", whiteSpace: "nowrap" }}>YOU'RE MEETING THIS</span>;
}
function CiteGate({ children }) {
  return <span style={{ fontFamily: FONT_UI, fontSize: 9.5, fontWeight: 700, color: AMBER, border: `1px dashed ${AMBER}`, borderRadius: 3, padding: "1px 5px", marginLeft: 6, whiteSpace: "nowrap", verticalAlign: "middle" }}>{children || "VERIFY BEFORE RELEASE"}</span>;
}
function ActTag({ act }) {
  return <span style={{ fontFamily: FONT_UI, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: GOLD, textTransform: "uppercase" }}>{act}</span>;
}
function LocChip({ children }) {
  return <span style={{ fontFamily: FONT_UI, fontSize: 10, fontWeight: 600, color: MUTE, background: "#F1EEE6", border: `1px solid ${LINE}`, borderRadius: 3, padding: "2px 7px" }}>{children}</span>;
}
function SectionHead({ kicker, title, part, act }) {
  return (
    <div style={{ marginTop: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: FONT_UI, fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: MUTE, textTransform: "uppercase" }}>{kicker}</span>
        {part && <PartTag part={part} />}
        {act && <ActTag act={act} />}
      </div>
      <h2 style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 19, color: NAVY, margin: "6px 0 0" }}>{title}</h2>
      <GoldRule />
    </div>
  );
}

// ─── Roll-up matrix (portfolio scope) — enumeration, NO composite ──
function StateDot({ state, showId, id }) {
  const m = STATE_META[state];
  const filled = state === "gap" || state === "item";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginRight: 8 }} title={m.agent}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: filled ? m.c : "transparent", border: `1.5px solid ${m.c}` }} />
      {showId && <span style={{ fontFamily: FONT_UI, fontSize: 9.5, color: MUTE }}>{id}</span>}
    </span>
  );
}

function RollupMatrix({ edition, mode }) {
  const e = edition;
  const byPart = (p) => FINDINGS.filter((f) => f.part === p);
  const cell = (loc) => (part) => (
    <td key={loc.id + part} style={{ padding: "10px 12px", borderLeft: part === "fire" ? `1px solid ${LINE}` : "none", verticalAlign: "top" }}>
      <div style={{ display: "flex", flexWrap: "wrap", rowGap: 6 }}>
        {byPart(part).map((f) => (
          <StateDot key={f.id} state={stateFor(f.id, loc.id, mode)} showId={e === "agent"} id={f.id} />
        ))}
      </div>
    </td>
  );
  const patterns = e === "agent"
    ? [
        "Fire — P-5 safeguard documentation gap at Fresno and Merced (2 of 3); exposure: HIGH where present.",
        "Food — communicable disease / contamination boundaries apply uniformly; producer evaluation items, all 3.",
        "Policy-wide — corrective-action file incomplete at Modesto; valuation currency open across the account.",
      ]
    : [
        "The same fire-cleaning paperwork gap shows up at two of your three kitchens.",
        "The food coverage boundaries are the same at every kitchen — all worth raising with your agent.",
        "One kitchen, Modesto, has a thin correction file; the others are in good shape.",
      ];
  return (
    <>
      <SectionHead kicker="Roll-Up" title={e === "agent" ? "Portfolio & Location Findings" : "Where Each Kitchen Stands"} act="Prove" />
      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, lineHeight: 1.6, color: MUTE, marginBottom: 10 }}>
        Each finding is shown per location, Fire and Food kept separate. No combined location figure and no
        account total — by design.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6 }}>
          <thead>
            <tr style={{ background: "#F4F1E9" }}>
              <th style={{ textAlign: "left", padding: "9px 12px", fontFamily: FONT_UI, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: NAVY }}>Location</th>
              <th style={{ textAlign: "left", padding: "9px 12px", fontFamily: FONT_UI, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: CORAL, borderLeft: `1px solid ${LINE}` }}>Fire Safety</th>
              <th style={{ textAlign: "left", padding: "9px 12px", fontFamily: FONT_UI, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEAL }}>Food Safety</th>
              <th style={{ textAlign: "left", padding: "9px 12px", fontFamily: FONT_UI, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: NAVY }}>Policy-Wide</th>
            </tr>
          </thead>
          <tbody>
            {LOCS.map((loc) => (
              <tr key={loc.id} style={{ borderTop: `1px solid ${LINE}` }}>
                <td style={{ padding: "10px 12px", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: NAVY }}>{loc.name}</td>
                {["fire", "food", "general"].map((p) => cell(loc)(p))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
        {["ok", "gap", "norec", "item"].map((s) => (
          <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_UI, fontSize: 10.5, color: INK }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: (s === "gap" || s === "item") ? STATE_META[s].c : "transparent", border: `1.5px solid ${STATE_META[s].c}` }} />
            {STATE_META[s][edition]}
          </span>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", color: NAVY, textTransform: "uppercase", marginBottom: 6 }}>Patterns across locations</div>
        {patterns.map((p, i) => (
          <div key={i} style={{ fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.6, color: INK, marginBottom: 5, display: "flex", gap: 8 }}>
            <span style={{ color: GOLD }}>—</span><span>{p}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Correlation block ─────────────────────────────────────────────
function CorrRow({ label, children, accent }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "7px 0", borderTop: `1px dashed ${LINE}` }}>
      <div style={{ fontFamily: FONT_UI, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: accent || MUTE, width: 118, flexShrink: 0, paddingTop: 2 }}>{label}</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, lineHeight: 1.6, color: INK, flex: 1 }}>{children}</div>
    </div>
  );
}
function CorrelationBlock({ edition, mode, corr }) {
  const e = edition, m = mode;
  return (
    <div style={{ background: "#FBFAF6", border: `1px solid ${LINE}`, borderRadius: 5, padding: "4px 14px 8px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 6 }}><ActTag act="Prove" /></div>
      <CorrRow label={e === "agent" ? "Clause expects" : "Your policy expects"}>{corr.expects[e]}</CorrRow>
      <CorrRow label={e === "agent" ? "Record shows" : "Your file shows"} accent={m === "prospect" ? AMBER : undefined}>{corr.shows[m][e]}</CorrRow>
      <CorrRow label="Gap" accent={corr.gapAccent || CORAL}>{corr.gap[m][e]}</CorrRow>
    </div>
  );
}

// ─── Findings data — ONE store, two renderers ──────────────────────
const FINDINGS = [
  {
    id: "F-01", part: "fire", flag: "high",
    agent: { title: "CP 04 11 — P-5 named safeguard vs. documented service record",
      body: <>The P-5 entry names automatic extinguishing equipment over cooking surfaces and hood &amp; duct cleaning under contract. Suspension wording (¶B.1) is unqualified: failure to maintain a named safeguard suspends fire coverage at the affected location, independent of causation. For this carrier's claim file, documentation — not performance — is the operative question. Reference loss: Razuki v. AmGUARD, CA protective-safeguards denial, $2M+ <CiteGate>CASE CITE — PRIMARY-SOURCE VERIFY</CiteGate></>,
      refs: <>Source: insured's policy, CP 04 11 ¶B.1–B.3 (p. 41–42). Service intervals: NFPA 96 / NFPA 17A per county fire code adoption <CiteGate>PULL FROM VERIFIED CITATION TABLE</CiteGate></> },
    kitchen: { title: "Your fire coverage is conditional on named protections",
      body: <>Your policy's wording names specific protections — the extinguishing equipment over your cooking line, and professional hood &amp; duct cleaning under contract — and provides that if a named protection isn't maintained, fire coverage at that kitchen can be suspended. California restaurants have lost seven-figure fire claims on this clause <CiteGate>CASE REF — VERIFY</CiteGate>. The work being done is not enough by itself: if the certificate isn't in the file, the carrier reads it as not done.</> },
    corr: {
      expects: { agent: "Semiannual service on extinguishing equipment; contracted hood & duct cleaning on interval; certificates retained as proof.", kitchen: "Cleaning and equipment service on schedule, with dated certificates kept for every visit." },
      shows: { bound: { agent: "Fresno: most recent exhaust cleaning certificate dated 11/14/2025 — outside the presumed interval. Suppression tags current at 2 of 3 locations. All completed-service certificates on file.", kitchen: "One kitchen's most recent cleaning certificate is dated 11/14/2025 — older than the schedule your policy assumes. Equipment service tags are current at two of your three kitchens." },
        prospect: { agent: "No service record bound. Answering records: dated cleaning certificates and suppression tags, per location.", kitchen: "We don't hold your service records yet. The records that answer it: dated cleaning certificates and equipment service tags, kitchen by kitchen." } },
      gap: { bound: { agent: "Documented-service gap at one location on the named P-5 safeguard — the suspension condition's trigger.", kitchen: "One kitchen has a paperwork gap on the exact item your fire coverage is conditioned on." },
        prospect: { agent: "Unverifiable as filed. In a claim, an absent record is read as an unmaintained safeguard.", kitchen: "Unknown — and in a claim, an empty file reads the same as work not done." } },
    },
  },
  {
    id: "F-02", part: "fire", flag: "elevated",
    agent: { title: "¶B.2 impairment notice — no internal trigger identified",
      body: <>The endorsement requires notice to the carrier when a named safeguard is impaired beyond 48 hours and not restored. An unreported multi-day impairment gives the carrier a second, independent denial path on top of ¶B.1.</>,
      refs: <>Source: insured's policy, CP 04 11 ¶B.2 (p. 42).</> },
    kitchen: { title: "A 48-hour clock you may not know is running",
      body: <>If a named fire protection is out of service for more than 48 hours, your policy's wording requires you to tell your carrier. This is a process question, not an equipment question — and it's fixable in an afternoon.</> },
    corr: {
      expects: { agent: "Insured detects impairment and issues carrier notice inside the 48-hour window.", kitchen: "Someone in your operation notices an outage and notifies the carrier within 48 hours." },
      shows: { bound: { agent: "No impairment-notice step or designated notifier in the operating documentation on file.", kitchen: "Nothing in your written procedures says who notices, or who calls." },
        prospect: { agent: "No operating documentation bound; no basis to confirm a notice procedure exists.", kitchen: "We don't hold your written procedures, so we can't confirm a step like this exists." } },
      gap: { bound: { agent: "Process gap — a written impairment procedure with a named owner closes it.", kitchen: "A one-page written step with a name on it closes this." },
        prospect: { agent: "Unverified — a written impairment procedure with a named owner is the closing record.", kitchen: "Unknown — a one-page written step with a name on it is what closes this." } },
    },
  },
  {
    id: "F-03", part: "fire", flag: "satisfied",
    agent: { title: "P-1 automatic sprinkler — condition satisfied",
      body: <>P-1 names an operational automatic sprinkler. Current certification satisfies the named-safeguard condition as documented.</>,
      refs: <>Source: insured's policy, CP 04 11 schedule (p. 41).</> },
    kitchen: { title: "One condition you're already meeting",
      body: <>Your policy also names your sprinkler. Your certifications are current — this is what a closed gap looks like: the requirement, the work, and the paper all lining up.</> },
    corr: { gapAccent: TEAL,
      expects: { agent: "Operational automatic sprinkler; current certification retained.", kitchen: "A working sprinkler with up-to-date certification on file." },
      shows: { bound: { agent: "Sprinkler certification current at all 3 locations; certificates on file.", kitchen: "Certifications current at all three kitchens, certificates on file." },
        prospect: { agent: "No certificate bound. If certifications are current, providing them completes the file.", kitchen: "We don't hold the certificates yet — if they're current, getting them on file completes this one." } },
      gap: { bound: { agent: "None — condition satisfied as documented.", kitchen: "None — you're covered on this one, and you can prove it." },
        prospect: { agent: "Documentation only.", kitchen: "Paperwork only." } },
    },
  },
  {
    id: "F-04", part: "food", flag: "high",
    agent: { title: "GL — communicable disease exclusion reaches foodborne illness claims",
      body: <>An exclusion endorsement (endorsement index #14 of 22) removes bodily injury arising from transmission of communicable disease from the GL coverage part. As worded, third-party foodborne illness claims — the operation's largest liability scenario — fall inside the exclusion. A coverage boundary, not a documentation gap; an evaluation item for the producer of record.</>,
      refs: <>Source: insured's policy, endorsement #14 (p. 67).</> },
    kitchen: { title: "A foodborne illness claim is mostly on you",
      body: <>Your policy's wording excludes injury claims arising from communicable disease — which, as written, reaches the customer claims that follow a foodborne illness event. This isn't a flaw in your kitchen; it's a boundary in your policy worth understanding before it's ever tested.</> },
    corr: {
      expects: { agent: "N/A — exclusion operates regardless of the insured's practice.", kitchen: "Nothing — this clause applies no matter how well you run your kitchens." },
      shows: { bound: { agent: "Continuous temperature documentation and county inspection history support prevention and defense posture; they do not alter the exclusion's wording.", kitchen: "Your temperature records and county inspection history strengthen prevention and any defense — they don't change what the clause says." },
        prospect: { agent: "No records bound. Temperature documentation and inspection history would bear on defense posture, not the exclusion's wording.", kitchen: "We don't hold your records yet. Temperature records and inspection history would help your defense — not change the clause." } },
      gap: { bound: { agent: "Coverage boundary — evaluation belongs to the licensed producer.", kitchen: "A question for your insurance professional, not a record you can fix." },
        prospect: { agent: "Coverage boundary — evaluation belongs to the licensed producer.", kitchen: "A question for your insurance professional, not a record you can fix." } },
    },
  },
  {
    id: "F-05", part: "food", flag: "elevated",
    agent: { title: "Property — $25,000 contamination/spoilage sublimit on stock",
      body: <>The spoilage/contamination sublimit caps recovery on stock at $25,000 per occurrence across three locations. No scheduled stock valuation appears in the policy file to test the sublimit against actual values at risk.</>,
      refs: <>Source: insured's policy, sublimit schedule ¶C (p. 18).</> },
    kitchen: { title: "A $25,000 ceiling on lost product — across three kitchens",
      body: <>If product is lost to contamination or spoilage, your policy's wording caps that recovery at $25,000 per event — one limit shared across your whole operation. Whether that matches what you actually keep on hand is worth a direct conversation.</> },
    corr: {
      expects: { agent: "Stock values at risk reconciled against the $25,000 per-occurrence sublimit.", kitchen: "The limit roughly matching the product you'd actually lose in one event." },
      shows: { bound: { agent: "Stock valuation sits outside EvidLY's record scope — no correlating record exists here by design. Flagged for producer review.", kitchen: "We don't keep your inventory values — no one's records would close this one. It's a numbers conversation with your agent." },
        prospect: { agent: "Stock valuation sits outside EvidLY's record scope — flagged for producer review.", kitchen: "We wouldn't hold your inventory values either way — it's a numbers conversation with your agent." } },
      gap: { bound: { agent: "Valuation reconciliation — producer evaluation item.", kitchen: "Unknown until you and your agent put numbers next to it." },
        prospect: { agent: "Valuation reconciliation — producer evaluation item.", kitchen: "Unknown until you and your agent put numbers next to it." } },
    },
  },
  {
    id: "F-06", part: "food", flag: "elevated",
    agent: { title: "Business income — physical-damage trigger; no response to EHD closure without damage",
      body: <>BI coverage triggers on direct physical loss; civil authority carries the same damage predicate (4 weeks). A county environmental health closure absent physical damage — the most common food-safety shutdown — sits outside the wording as written. No food-contamination income endorsement is attached.</>,
      refs: <>Source: insured's policy, BI conditions (p. 22–24); civil authority (p. 25).</> },
    kitchen: { title: "A county-ordered closure may not pay your lost income",
      body: <>Your lost-income coverage turns on physical damage to the building. If the county closes one of your kitchens over a food safety issue with nothing physically damaged — the most common closure scenario — the policy as written may not respond.</> },
    corr: {
      expects: { agent: "Closure scenarios mapped against the physical-damage predicate in the BI wording.", kitchen: "Income protection that responds to the closures most likely to actually happen." },
      shows: { bound: { agent: "County inspection history on file: zero closures; two major violations 2024–25, both corrected with documentation. Bears on closure likelihood, not the trigger's wording.", kitchen: "Your county inspection history shows no closures and two corrected violations — a record that lowers the odds, without changing the clause." },
        prospect: { agent: "No inspection history bound. County record would establish closure likelihood; it does not alter the trigger.", kitchen: "We don't hold your inspection history yet — it would show how likely this scenario is, not change the clause." } },
      gap: { bound: { agent: "Most probable closure scenario sits outside the wording — producer evaluation item.", kitchen: "The likeliest closure isn't the one your policy responds to — a question for your insurance professional." },
        prospect: { agent: "Most probable closure scenario sits outside the wording — producer evaluation item.", kitchen: "The likeliest closure isn't the one your policy responds to — a question for your insurance professional." } },
    },
  },
  {
    id: "G-01", part: "general", flag: "low",
    agent: { title: "80% co-insurance — no valuation date in file",
      body: <>80% co-insurance applies to building ($1.4M) and BPP. No appraisal or valuation date appears in the policy file. Kitchen build-outs commonly drift above scheduled limits between renewals; underinsurance would penalize any partial loss.</>,
      refs: <>Source: insured's policy, loss conditions (p. 15); declarations (p. 2).</> },
    kitchen: { title: "If your building limit lags reality, a partial loss pays partially",
      body: <>Your policy's wording requires insuring to at least 80% of your building's real value. Kitchen build-outs push real rebuild costs up between renewals. If the limit lags, the policy pays a reduced share of even a partial loss.</> },
    corr: {
      expects: { agent: "Scheduled limits ≥ 80% of current replacement cost, evidenced by a dated valuation.", kitchen: "Your insured amount keeping pace with what rebuilding would actually cost." },
      shows: { bound: { agent: "Valuation sits outside EvidLY's record scope — flagged for producer review.", kitchen: "Rebuild values aren't a record we keep — this one belongs entirely to your agent." },
        prospect: { agent: "Valuation sits outside EvidLY's record scope — flagged for producer review.", kitchen: "Rebuild values aren't a record we keep — this one belongs entirely to your agent." } },
      gap: { bound: { agent: "Valuation currency — producer evaluation item.", kitchen: "Unknown until the limit is checked against today's costs." },
        prospect: { agent: "Valuation currency — producer evaluation item.", kitchen: "Unknown until the limit is checked against today's costs." } },
    },
  },
  {
    id: "G-02", part: "general", flag: "elevated",
    agent: { title: "Application warranty — 'no uncorrected health or fire code violations'",
      body: <>The signed application (¶12) warrants no uncorrected health or fire code violations and is incorporated by reference. Misrepresentation defenses reach back to application warranties; the closing record is a complete corrective-action file across both code histories. Policy-wide finding — touches food and fire history without blending either.</>,
      refs: <>Source: insured's application ¶12, incorporated at policy p. 3.</> },
    kitchen: { title: "Your application made a promise your records should back up",
      body: <>When this policy was bought, the application stated there were no uncorrected health or fire code violations. That statement lives inside your policy. The protection isn't the statement — it's the paper trail showing every correction actually happened.</> },
    corr: {
      expects: { agent: "Corrective-action documentation matching the county record for every cited violation, both code histories.", kitchen: "Proof on paper that every past violation was fixed — health and fire alike." },
      shows: { bound: { agent: "County record: all violations corrected. Corrective-action documentation incomplete for one location prior to onboarding; back-fillable.", kitchen: "The county shows everything corrected. Your own written record is thin for one kitchen from before your current documentation practice — and it can be completed." },
        prospect: { agent: "No corrective-action record bound. County results alone do not evidence the insured's documentation of correction.", kitchen: "We don't hold your correction records yet — the county's results alone don't show your side of the paper trail." } },
      gap: { bound: { agent: "Documentation back-fill at one location neutralizes a misrepresentation defense.", kitchen: "Completing the paper trail at one kitchen closes this." },
        prospect: { agent: "Unverified — a complete corrective-action file is the closing record.", kitchen: "Unknown — a complete correction file is what closes it." } },
    },
  },
];

const QUESTIONS = {
  fire: [
    "Given the certificate dates on file, where does fire coverage stand at each kitchen today?",
    "What will the carrier accept as proof that each named protection was maintained?",
    "If the extinguishing equipment is impaired for more than 48 hours, who do we notify, and how?",
  ],
  food: [
    "How would this policy respond to a confirmed foodborne illness event at one kitchen?",
    "How would it respond to a county-ordered closure with no physical damage?",
  ],
  general: [
    "When was the building limit last checked against current rebuild cost?",
    "Does the application's violation statement match the county record as it stands today?",
  ],
};

// ─── Composite components ──────────────────────────────────────────
function FindingCard({ f, edition, mode }) {
  const e = f[edition];
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderLeft: `2px solid ${GOLD}`, borderRadius: 6, padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: 13.5, color: NAVY }}>
          <span style={{ color: GOLD, marginRight: 8 }}>{f.id}</span>{e.title}
        </div>
        {edition === "agent" ? <ExposureChip flag={f.flag} /> : (f.flag === "satisfied" ? <SatisfiedChip /> : null)}
      </div>
      <div style={{ marginTop: 8 }}><LocChip>{locLabel(f.id, mode)}</LocChip></div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, lineHeight: 1.65, color: INK, marginTop: 10 }}>{e.body}</div>
      <CorrelationBlock edition={edition} mode={mode} corr={f.corr} />
      {edition === "agent" && e.refs && (
        <div style={{ fontFamily: FONT_UI, fontSize: 10.5, color: MUTE, marginTop: 10, borderTop: `1px dashed ${LINE}`, paddingTop: 8, lineHeight: 1.7 }}>{e.refs}</div>
      )}
    </div>
  );
}
function QuestionBox({ items }) {
  return (
    <div style={{ background: "#F4F1E9", border: `1px solid ${LINE}`, borderRadius: 6, padding: "14px 18px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", color: NAVY, textTransform: "uppercase" }}>Questions for your insurance professional</div>
        <ActTag act="Reduce" />
      </div>
      {items.map((q, i) => (
        <div key={i} style={{ fontFamily: FONT_BODY, fontSize: 13.5, lineHeight: 1.6, color: INK, marginBottom: 6, display: "flex", gap: 8 }}>
          <span style={{ color: GOLD, fontFamily: FONT_UI, fontWeight: 700 }}>{i + 1}.</span><span>{q}</span>
        </div>
      ))}
    </div>
  );
}
function ReportHeader({ edition, scope }) {
  return (
    <div style={{ background: NAVY, borderRadius: "8px 8px 0 0", padding: "26px 28px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 24, letterSpacing: "0.01em" }}>
            <span style={{ color: GOLD }}>E</span><span style={{ color: "#fff" }}>vid</span><span style={{ color: GOLD }}>LY</span>
            <span style={{ color: "#C9C2B2", fontWeight: 500, fontSize: 14, marginLeft: 10, letterSpacing: "0.04em" }}>Policy Lens</span>
          </div>
          <div style={{ width: 24, height: 2, background: GOLD, margin: "10px 0" }} />
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15, color: "#fff" }}>
            {edition === "agent" ? "Policy Findings Brief — For the Producer of Record" : "Your Policy Reading — Business Brief"}
          </div>
          <div style={{ fontFamily: FONT_UI, fontSize: 11, color: "#AEB6C6", marginTop: 4 }}>
            {edition === "agent" ? "Clause-level findings for licensed coverage evaluation" : "What we read in your policy, in plain English"}
          </div>
        </div>
        <div style={{ fontFamily: FONT_UI, fontSize: 11, color: "#C9CFDB", textAlign: "right", lineHeight: 1.7 }}>
          <div style={{ color: "#fff", fontWeight: 700 }}>{POLICY.insured}</div>
          <div>{scope === "portfolio" ? "Portfolio · 3 locations" : "Single policy · 3 locations"}</div>
          <div>{POLICY.carrier}</div>
          <div>Policy {POLICY.policyNo}</div>
          <div>{POLICY.period}</div>
        </div>
      </div>
    </div>
  );
}
function MetaStrip({ mode }) {
  const items = [
    `Reading completed ${POLICY.readDate}`,
    "Cross-checked by two independent readings",
    "Reviewed before release",
    mode === "bound" ? "EvidLY record: 3 locations bound" : "EvidLY record: none bound — prospect reading",
  ];
  return (
    <div style={{ background: "#16223C", padding: "8px 28px", display: "flex", gap: 18, flexWrap: "wrap" }}>
      {items.map((t, i) => (
        <span key={i} style={{ fontFamily: FONT_UI, fontSize: 10, letterSpacing: "0.06em", color: i === 3 && mode === "prospect" ? "#D9B97A" : "#9AA4B8", textTransform: "uppercase", fontWeight: 600 }}>{t}</span>
      ))}
    </div>
  );
}
function Snapshot({ edition }) {
  const rows = edition === "agent"
    ? [["Coverage form", POLICY.form], ["Protective safeguards", "CP 04 11 — P-1 (automatic sprinkler); P-5 (other: automatic extinguishing equipment over cooking surfaces; hood & duct cleaning by contract)"], ["Producer of record", POLICY.agent], ["Source document", "Full policy PDF, 84 pp., received via authorized intake 06/05/2026"]]
    : [["Your carrier", POLICY.carrier], ["Your policy period", POLICY.period], ["Fire protections your policy names", "A working sprinkler, plus serviced extinguishing equipment over your cooking line — including documented hood & duct cleaning"], ["Your insurance professional", POLICY.agent]];
  return (
    <div style={{ background: "#fff", borderBottom: `1px solid ${LINE}`, padding: "18px 28px" }}>
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: "flex", gap: 14, padding: "5px 0", flexWrap: "wrap" }}>
          <div style={{ fontFamily: FONT_UI, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTE, width: 200, flexShrink: 0 }}>{k}</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: INK, flex: 1, minWidth: 220 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}
function EvidlySection({ edition, mode }) {
  const agent = edition === "agent";
  return (
    <>
      <SectionHead kicker="Closing" title={agent ? "Record Availability" : "How EvidLY Helps"} act="Prove" />
      <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, lineHeight: 1.7, color: INK }}>
        {agent && mode === "bound" && <>Where a finding turns on documentation, the answering record is maintained in the kitchen's EvidLY file: dated service certificates and vendor service records (F-01, F-03), service intervals with completion evidence (F-01, F-02), continuous temperature documentation (F-04), county inspection history with corrective-action records (F-06, G-02). Records are kept per location, each held to its own county's methodology, food safety and fire safety kept separate. With the insured's authorization, these are available to you as claim-file or submission evidence. F-05 and G-01 sit outside this record's scope and are noted as producer evaluation items. Coverage evaluation and placement remain yours.</>}
        {agent && mode === "prospect" && <>No EvidLY record is bound to this reading, so each correlation above reflects the policy document alone. The record families that would answer the documentation-dependent findings: dated service certificates and vendor service records (F-01, F-03), service schedules with completion evidence (F-02), continuous temperature documentation (F-04), county inspection history with corrective-action records (F-06, G-02) — kept per location, food and fire separate. F-05 and G-01 sit outside that scope regardless. Coverage evaluation and placement remain yours.</>}
        {!agent && mode === "bound" && <>Most of what this reading identified comes down to records: certificates with dates, service that matches the schedule your policy expects, corrections tied to your county's inspection results, and temperature records that stand behind your food safety practice. EvidLY keeps that record current for each of your kitchens — food safety and fire safety kept separate, each kitchen held to its own county's methodology — so the proof your policy depends on exists before anyone asks. Two findings (the stock limit and the building value) aren't record questions at all; those belong to you and your agent. What you do with all of this is between you and your insurance professional — our part is making sure the record is there.</>}
        {!agent && mode === "prospect" && <>Most of what this reading identified comes down to records that don't yet exist in one place: dated cleaning certificates, equipment service tags, a written impairment step, correction files that match your county's results, temperature records. Whoever keeps them, these are the records to start keeping now — they're what your policy's conditions quietly depend on. EvidLY's part, if you choose it, is holding that record per kitchen, food and fire kept separate. Two findings (the stock limit and the building value) aren't record questions at all; those belong to you and your agent.</>}
      </div>
    </>
  );
}
function Footer({ edition }) {
  return (
    <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 24, paddingTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: FONT_UI, fontSize: 9.5, fontWeight: 700, color: "#fff", background: AMBER, borderRadius: 3, padding: "2px 7px", letterSpacing: "0.08em" }}>DISCLOSURE DRAFT-1 — ATTORNEY GATE BEFORE RELEASE</span>
      </div>
      <div style={{ fontFamily: FONT_UI, fontSize: 10, lineHeight: 1.7, color: MUTE }}>
        {edition === "agent"
          ? <>PREPARED FOR LICENSED INSURANCE PROFESSIONAL USE. EvidLY reads policy documents and identifies clause-level findings. EvidLY is not an insurer, agent, or broker and does not evaluate, rate, or recommend coverage. Exposure indicators are document-and-record correlation observations provided to the producer of record, who is solely responsible for coverage evaluation. Findings reflect the documents and records listed as sources on the date of reading. Independently cross-checked by two readings; any inconsistency held for human review before release. Authorization on file: signed {POLICY.authDate}.</>
          : <>EvidLY reads policy documents and identifies items for discussion with your licensed insurance professional. EvidLY is not an insurance agent or broker and does not evaluate, rate, or recommend insurance coverage. Coverage decisions belong to you and your licensed agent. Findings reflect the documents and records available on the date of reading. Independently cross-checked and reviewed before release. Authorization on file: signed {POLICY.authDate}.</>}
      </div>
    </div>
  );
}

const PARTS = [
  { key: "fire", kicker: "Part I", title: { agent: "Fire Safety Findings", kitchen: "Fire Safety — What Your Policy Expects From Your Kitchens" } },
  { key: "food", kicker: "Part II", title: { agent: "Food Safety Findings", kitchen: "Food Safety — Where Your Policy May Not Respond" } },
  { key: "general", kicker: "Part III", title: { agent: "Policy-Wide Conditions", kitchen: "Conditions That Sit Over Everything" } },
];

function Edition({ edition, mode, scope }) {
  return (
    <div style={{ padding: "8px 28px 28px" }}>
      {edition === "kitchen" && (
        <div style={{ background: "#F4F1E9", borderLeft: `2px solid ${GOLD}`, borderRadius: 6, padding: "16px 18px", marginTop: 22 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.7, color: INK }}>
            We read your full policy the way a carrier reads it after a loss. Most of what matters to your
            business isn't on the declarations page — it's in the conditions. Below is what we identified, in
            business terms, with the questions worth bringing to your insurance professional. Nothing here is
            insurance advice; evaluating your coverage is your licensed agent's work.
          </div>
        </div>
      )}
      {scope === "portfolio" && <RollupMatrix edition={edition} mode={mode} />}
      {PARTS.map((p) => (
        <div key={p.key}>
          <SectionHead kicker={p.kicker} title={p.title[edition]} part={p.key} act="Predict" />
          {FINDINGS.filter((f) => f.part === p.key).map((f) => <FindingCard key={f.id} f={f} edition={edition} mode={mode} />)}
          {edition === "kitchen" && <QuestionBox items={QUESTIONS[p.key]} />}
        </div>
      ))}
      <EvidlySection edition={edition} mode={mode} />
      <Footer edition={edition} />
    </div>
  );
}

function Toggle({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", border: `1px solid ${NAVY}`, borderRadius: 6, overflow: "hidden" }}>
      {options.map(([key, label]) => (
        <button key={key} onClick={() => onChange(key)} style={{ fontFamily: FONT_UI, fontSize: 11.5, fontWeight: 700, padding: "7px 13px", border: "none", cursor: "pointer", background: value === key ? NAVY : "#fff", color: value === key ? "#fff" : NAVY }}>{label}</button>
      ))}
    </div>
  );
}

export default function PolicyLensFindingsPreview() {
  const [edition, setEdition] = useState("kitchen");
  const [mode, setMode] = useState("bound");
  const [scope, setScope] = useState("portfolio");
  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "24px 12px", fontFamily: FONT_UI }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: MUTE, textTransform: "uppercase" }}>Preview · one findings store, two renderers</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Toggle value={edition} onChange={setEdition} options={[["kitchen", "Kitchen"], ["agent", "Agent"]]} />
            <Toggle value={mode} onChange={setMode} options={[["bound", "Record on file"], ["prospect", "Prospect"]]} />
            <Toggle value={scope} onChange={setScope} options={[["policy", "Single policy"], ["portfolio", "Portfolio roll-up"]]} />
          </div>
        </div>
        <div style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 8px 28px rgba(30,45,77,0.12)", border: `1px solid ${LINE}` }}>
          <ReportHeader edition={edition} scope={scope} />
          <MetaStrip mode={mode} />
          <Snapshot edition={edition} />
          <div style={{ background: CREAM }}><Edition edition={edition} mode={mode} scope={scope} /></div>
        </div>
      </div>
    </div>
  );
}
