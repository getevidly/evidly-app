// src/components/PolicyLensReport.jsx
// In-app Policy Lens report — prop-wired (no token fetch). Page fetches via
// pl-get-findings-insured and passes data as props. refs citation footer
// shows for both editions (owner hands report to agent who needs the reference).

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

function GoldRule({ w = 32 }) {
  return <div style={{ width: w, height: 2, background: GOLD, margin: "6px 0 14px" }} />;
}
function PartTag({ part }) {
  const m = { fire: { c: CORAL, label: "Fire Safety — AHJ" }, food: { c: TEAL, label: "Food Safety — EHD" }, general: { c: NAVY, label: "Policy-Wide Conditions" } }[part] || { c: NAVY, label: part };
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
function ActTag({ act }) {
  return <span style={{ fontFamily: FONT_UI, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: GOLD, textTransform: "uppercase" }}>{act}</span>;
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
function BodyText({ text }) {
  const s = String(text ?? "");
  const paras = s.split(/\n{2,}/);
  return (
    <>
      {paras.map((p, i) => (
        <div key={i} style={{ marginTop: i === 0 ? 0 : 10 }}>
          {p.split("\n").map((line, j) => (<span key={j} style={{ display: "block" }}>{line}</span>))}
        </div>
      ))}
    </>
  );
}
function CorrRow({ label, children, accent }) {
  if (children == null) return null;
  return (
    <div style={{ display: "flex", gap: 12, padding: "7px 0", borderTop: `1px dashed ${LINE}` }}>
      <div style={{ fontFamily: FONT_UI, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: accent || MUTE, width: 118, flexShrink: 0, paddingTop: 2 }}>{label}</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, lineHeight: 1.6, color: INK, flex: 1 }}>{children}</div>
    </div>
  );
}
function CorrelationBlock({ edition, mode, corr }) {
  if (!corr) return null;
  const e = edition, m = mode;
  const pick = (node) => {
    if (!node) return null;
    if (node[m] && typeof node[m] === "object") return node[m][e];
    return node[e];
  };
  const expects = pick(corr.expects);
  const shows = pick(corr.shows);
  const gap = pick(corr.gap);
  if (expects == null && shows == null && gap == null) return null;
  return (
    <div style={{ background: "#FBFAF6", border: `1px solid ${LINE}`, borderRadius: 5, padding: "4px 14px 8px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 6 }}><ActTag act="Prove" /></div>
      <CorrRow label={e === "agent" ? "Clause expects" : "Your policy expects"}>{expects}</CorrRow>
      <CorrRow label={e === "agent" ? "Record shows" : "Your file shows"} accent={m === "prospect" ? AMBER : undefined}>{shows}</CorrRow>
      <CorrRow label="Gap" accent={corr.gapAccent || (corr.flag === "satisfied" ? TEAL : CORAL)}>{gap}</CorrRow>
    </div>
  );
}
function FindingCard({ f, edition, mode }) {
  const e = f[edition] || {};
  const corr = f.correlation ? { ...f.correlation, flag: f.flag } : null;
  const refs = e.refs || (f.agent && f.agent.refs) || null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderLeft: `2px solid ${GOLD}`, borderRadius: 6, padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: 13.5, color: NAVY }}>
          <span style={{ color: GOLD, marginRight: 8 }}>{f.id}</span>{e.title}
        </div>
        {edition === "agent" ? <ExposureChip flag={f.flag} /> : (f.flag === "satisfied" ? <SatisfiedChip /> : null)}
      </div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, lineHeight: 1.65, color: INK, marginTop: 10 }}>
        <BodyText text={e.body} />
      </div>
      <CorrelationBlock edition={edition} mode={mode} corr={corr} />
      {refs && (
        <div style={{ fontFamily: FONT_UI, fontSize: 10.5, color: MUTE, marginTop: 10, borderTop: `1px dashed ${LINE}`, paddingTop: 8, lineHeight: 1.7 }}>
          <BodyText text={refs} />
        </div>
      )}
    </div>
  );
}
function ReportHeader({ edition, policy, locCount }) {
  const p = policy || {};
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
          {p.insured && <div style={{ color: "#fff", fontWeight: 700 }}>{p.insured}</div>}
          <div>{locCount > 1 ? `${locCount} locations` : "Single location"}</div>
          {p.carrier && <div>{p.carrier}</div>}
          {p.policyNo && <div>Policy {p.policyNo}</div>}
          {p.period && <div>{p.period}</div>}
        </div>
      </div>
    </div>
  );
}
function MetaStrip({ mode }) {
  const items = [
    "Policy reading complete",
    "Cross-checked by two independent readings",
    "Reviewed before release",
    mode === "bound" ? "EvidLY record: locations bound" : "EvidLY record: none bound — prospect reading",
  ];
  return (
    <div style={{ background: "#16223C", padding: "8px 28px", display: "flex", gap: 18, flexWrap: "wrap" }}>
      {items.map((t, i) => (
        <span key={i} style={{ fontFamily: FONT_UI, fontSize: 10, letterSpacing: "0.06em", color: i === 3 && mode === "prospect" ? "#D9B97A" : "#9AA4B8", textTransform: "uppercase", fontWeight: 600 }}>{t}</span>
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
        {!agent && mode === "bound" && <>Most of what this reading identified comes down to records: certificates with dates, service that matches the schedule your policy expects, corrections tied to your county's inspection results, and temperature records that stand behind your food safety practice. EvidLY keeps that record current for each of your kitchens — food safety and fire safety kept separate, each kitchen held to its own county's methodology — so the proof your policy depends on exists before anyone asks. Some findings aren't record questions at all; those belong to you and your agent.</>}
        {!agent && mode === "prospect" && <>Most of what this reading identified comes down to records that don't yet exist in one place: dated cleaning certificates, equipment service tags, a written impairment step, correction files that match your county's results, temperature records. Whoever keeps them, these are the records to start keeping now — they're what your policy's conditions quietly depend on. EvidLY's part, if you choose it, is holding that record per kitchen, food and fire kept separate.</>}
      </div>
    </>
  );
}
function Footer({ edition }) {
  return (
    <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 24, paddingTop: 14 }}>
      <div style={{ fontFamily: FONT_UI, fontSize: 10, lineHeight: 1.7, color: MUTE }}>
        EvidLY reads policy documents and identifies items for discussion with your licensed insurance professional. EvidLY is not an insurance agent or broker and does not evaluate, rate, or recommend insurance coverage. Coverage decisions belong to you and your licensed agent. Findings reflect the documents and records available on the date of reading. Independently cross-checked and reviewed before release.
      </div>
    </div>
  );
}
const PARTS = [
  { key: "fire", kicker: "Part I", title: { agent: "Fire Safety Findings", kitchen: "Fire Safety — What Your Policy Expects From Your Kitchens" } },
  { key: "food", kicker: "Part II", title: { agent: "Food Safety Findings", kitchen: "Food Safety — Where Your Policy May Not Respond" } },
  { key: "general", kicker: "Part III", title: { agent: "Policy-Wide Conditions", kitchen: "Conditions That Sit Over Everything" } },
];
function Edition({ findings, edition, mode }) {
  const used = new Set(PARTS.map((p) => p.key));
  const otherParts = [...new Set(findings.map((f) => f.part).filter((p) => p && !used.has(p)))];
  return (
    <div style={{ padding: "8px 28px 28px" }}>
      {edition === "kitchen" && (
        <div style={{ background: "#F4F1E9", borderLeft: `2px solid ${GOLD}`, borderRadius: 6, padding: "16px 18px", marginTop: 22 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.7, color: INK }}>
            We read your full policy the way a carrier reads it after a loss. Most of what matters to your business isn't on the declarations page — it's in the conditions. Below is what we identified, in business terms. Nothing here is insurance advice; evaluating your coverage is your licensed agent's work.
          </div>
        </div>
      )}
      {PARTS.map((p) => {
        const items = findings.filter((f) => (f.part || "general") === p.key);
        if (items.length === 0) return null;
        return (
          <div key={p.key}>
            <SectionHead kicker={p.kicker} title={p.title[edition]} part={p.key} act="Predict" />
            {items.map((f, i) => <FindingCard key={`${f.id}-${i}`} f={f} edition={edition} mode={mode} />)}
          </div>
        );
      })}
      {otherParts.map((pk) => (
        <div key={pk}>
          <SectionHead kicker="Additional" title={pk} part={pk} act="Predict" />
          {findings.filter((f) => f.part === pk).map((f, i) => <FindingCard key={`${f.id}-${i}`} f={f} edition={edition} mode={mode} />)}
        </div>
      ))}
      <EvidlySection edition={edition} mode={mode} />
      <Footer edition={edition} />
    </div>
  );
}
export default function PolicyLensReport({ findings = [], coverage = null, mode = "bound", edition = "kitchen" }) {
  const list = Array.isArray(findings) ? findings : [];
  const locCount = 1;
  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "24px 12px", fontFamily: FONT_UI }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: `1px solid ${LINE}` }}>
          <ReportHeader edition={edition} policy={null} locCount={locCount} />
          <MetaStrip mode={mode} />
          <Edition findings={list} edition={edition} mode={mode} />
        </div>
      </div>
    </div>
  );
}
