import { useState } from "react";

/* ─────────────────────────────────────────────────────────
   EvidLY — CIC Five-Pillar Correlation Report previews
   Pillars: Revenue · Cost · Operations · Workforce · Liability
   Two renderings:
   1. CUSTOMER — "Business Impact Report" (kitchen-leader
      vocabulary, softened, banned-word clean)
   2. CARRIER/PARTNER — "Five-Pillar Risk Intelligence"
      (report_type partner_risk, underwriter audience)
   Sources: intelligence_signals (county-matched via
   get_signals_for_org) correlated against the org's own
   evidence base. Food/fire data always attributed
   separately where it appears.
   Sample org: Riverstone Vineyards · Merced County
   ───────────────────────────────────────────────────────── */

const C = {
  navy: "#1E2D4D", cream: "#FAF7F0", ink: "#21242B", slate: "#5B6472",
  line: "#E3DDD0", gold: "#A08C5A",
  food: "#2F6F4F", fire: "#9E3B2F",
  white: "#FFFFFF", pass: "#2F6F4F", fail: "#9E3B2F", warn: "#8A6D1F",
  rev: "#3D5A80", cost: "#7A5C3D", ops: "#4A6B57", wf: "#5C4A78", liab: "#8A3B4F",
};
const font = {
  display: "'Fraunces', Georgia, serif",
  body: "'Source Sans 3', 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

function Shell({ children, title, subtitle, badge, badgeColor }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.line}`, borderRadius: 12,
      maxWidth: 760, margin: "0 auto", overflow: "hidden",
      boxShadow: "0 2px 16px rgba(30,45,77,0.08)",
    }}>
      <div style={{ background: C.navy, padding: "24px 36px 20px", borderBottom: `3px solid ${C.gold}` }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: font.display, fontSize: 20, color: C.cream, fontWeight: 600 }}>
              Riverstone Vineyards
            </div>
            <div style={{ fontFamily: font.body, fontSize: 12, color: "#B9C2D4", marginTop: 2 }}>
              Main Street Kitchen · Merced County, California
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{
              fontFamily: font.mono, fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase",
              color: C.white, background: badgeColor, padding: "4px 10px", borderRadius: 3,
            }}>{badge}</span>
            <div style={{ fontFamily: font.mono, fontSize: 10, color: "#B9C2D4", marginTop: 8 }}>
              Q2 2026 · generated Jun 5
            </div>
          </div>
        </div>
        <div style={{ fontFamily: font.display, fontSize: 25, color: C.cream, fontWeight: 600, marginTop: 14, lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ fontFamily: font.body, fontSize: 12.5, color: "#B9C2D4", marginTop: 4 }}>{subtitle}</div>
      </div>
      <div style={{ padding: "28px 36px 24px" }}>{children}</div>
      <div style={{
        borderTop: `1px solid ${C.line}`, padding: "11px 36px",
        display: "flex", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: font.body, fontSize: 10.5, color: C.slate }}>
          Produced by Evid<span style={{ color: C.gold, fontWeight: 700 }}>LY</span> from county records, public signals, and Riverstone Vineyards records
        </span>
        <span style={{ fontFamily: font.mono, fontSize: 9.5, color: C.slate }}>evidly.com/r/…</span>
      </div>
    </div>
  );
}

function Exec({ children }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <Head>Executive Summary</Head>
      <p style={{
        fontFamily: font.body, fontSize: 13.5, lineHeight: 1.7, color: C.ink, margin: 0,
        paddingLeft: 13, borderLeft: `2px solid ${C.gold}`,
      }}>{children}</p>
    </section>
  );
}

function Head({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 9 }}>
      <h3 style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600, color: C.navy, margin: 0 }}>{children}</h3>
      <div style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );
}

function T({ cols, rows }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font.body, fontSize: 12 }}>
      <thead><tr>{cols.map(c => (
        <th key={c} style={{
          textAlign: "left", padding: "6px 9px", fontFamily: font.mono, fontSize: 9.5,
          letterSpacing: 1.1, textTransform: "uppercase", color: C.slate,
          borderBottom: `1.5px solid ${C.navy}22`,
        }}>{c}</th>))}</tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
          {r.map((cell, j) => <td key={j} style={{ padding: "7px 9px", color: C.ink, verticalAlign: "top" }}>{cell}</td>)}
        </tr>))}</tbody>
    </table>
  );
}

function Src({ children }) {
  return <div style={{ fontFamily: font.mono, fontSize: 10, color: C.slate, marginTop: 7 }}>{children}</div>;
}

/* Pillar block — left color bar per CIC pillar (not gold) */
function Pillar({ color, name, signal, children }) {
  return (
    <section style={{
      marginBottom: 18, borderLeft: `3px solid ${color}`,
      paddingLeft: 16,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
        <span style={{
          fontFamily: font.mono, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase",
          color, fontWeight: 600,
        }}>{name}</span>
        {signal && <span style={{ fontFamily: font.body, fontSize: 11.5, color: C.slate, fontStyle: "italic" }}>{signal}</span>}
      </div>
      {children}
    </section>
  );
}

function Tag({ pillar }) {
  const food = pillar === "food";
  return (
    <span style={{
      fontFamily: font.mono, fontSize: 9, letterSpacing: 0.8, padding: "2px 6px",
      borderRadius: 3, color: food ? C.food : C.fire,
      background: food ? "#EAF3EE" : "#F8ECE9",
    }}>{food ? "FOOD" : "FIRE"}</span>
  );
}

/* ── CUSTOMER RENDERING — Business Impact Report ── */

function CustomerVersion() {
  return (
    <Shell
      title="Business Impact Report"
      subtitle="What the signals around your kitchen mean for revenue, cost, operations, workforce, and liability"
      badge="For Kitchen Leaders" badgeColor={C.food}
    >
      <Exec>
        Three outside signals reached Merced County kitchens this quarter — a county fee
        schedule change, a regional insurance market shift, and a minimum wage step — and this
        report reads each one against Riverstone Vineyards' own records to show where it lands.
        The short version: your evidence base absorbs two of the three without action, and the
        insurance shift is the one worth a conversation with your agent before September. Each
        section below names the signal, its source, and the one move that reduces its cost.
      </Exec>

      <Pillar color={C.rev} name="Revenue" signal="1 signal identified this quarter">
        <T cols={["Signal", "Source", "What It Means Here"]} rows={[
          ["County public portal now shows evaluation history to diners",
           "Merced County EHD portal change, May 2026",
           "Your clean record is now a public asset — both locations show PASS to anyone who looks"],
        ]} />
        <Src>Reading: favorable. A kept record becomes visible marketing without spend.</Src>
      </Pillar>

      <Pillar color={C.cost} name="Cost" signal="2 signals identified">
        <T cols={["Signal", "Source", "What It Means Here"]} rows={[
          ["County health permit fees rise 6% July 1",
           "Merced County fee schedule FY26-27",
           "≈ $114/yr across both permits — budget line, no action"],
          ["Regional exhaust service rates up ~8% on new contracts",
           "Trade signal, Central Valley",
           "Your negotiated rate is locked through 2026 — renewal timing matters in December"],
        ]} />
      </Pillar>

      <Pillar color={C.ops} name="Operations" signal="1 signal identified">
        <T cols={["Signal", "Source", "What It Means Here"]} rows={[
          [<span>County moving to risk-based visit intervals <Tag pillar="food" /></span>,
           "Merced County EHD program notice",
           "Kitchens with clean histories get longer intervals — your record points to fewer visits, not more"],
        ]} />
        <Src>Your last four county evaluations carry no major findings; that history is what the interval model reads.</Src>
      </Pillar>

      <Pillar color={C.wf} name="Workforce" signal="1 signal identified">
        <T cols={["Signal", "Source", "What It Means Here"]} rows={[
          ["State minimum wage step January 2027",
           "CA Department of Industrial Relations",
           "Affects 4 of 14 staff at current rates — roughly $9.1K/yr at current hours"],
        ]} />
        <Src>Training records stay unaffected: all credentials current regardless of roster changes.</Src>
      </Pillar>

      <Pillar color={C.liab} name="Liability" signal="1 signal identified — worth a conversation">
        <T cols={["Signal", "Source", "What It Means Here"]} rows={[
          [<span>Carriers in the region adding protective safeguards language to renewals <Tag pillar="fire" /></span>,
           "Regional market signal, Q2 2026",
           "If your September renewal adds this clause, your unbroken service record is exactly what it asks for — but the clause wording matters"],
        ]} />
        <Src>EvidLY reads the signals. Your insurance professional evaluates the coverage — bring this report to that conversation.</Src>
      </Pillar>

      <div style={{
        marginTop: 4, padding: "12px 16px", background: "#F6F3EB",
        border: `1px solid ${C.line}`, borderRadius: 8,
        fontFamily: font.body, fontSize: 12, color: C.slate,
      }}>
        ↪ Evidence referenced: <b>PSE Compliance Summary</b> · <b>County Inspection History</b> · <b>Training &amp; Certification Record</b>
      </div>
      <div style={{
        marginTop: 10, fontFamily: font.body, fontSize: 11, color: C.slate, lineHeight: 1.6,
      }}>
        <b>Disclosures.</b> Signals are reported with their sources as received; figures shown
        are estimates from your records and public information, not financial, legal, or
        insurance advice. Insurance items are observations and questions for your insurance
        professional — EvidLY reads; your agent evaluates the coverage. Decisions about your
        business remain yours.
      </div>
    </Shell>
  );
}

/* ── CARRIER RENDERING — partner_risk ── */

function CarrierVersion() {
  return (
    <Shell
      title="Five-Pillar Risk Intelligence"
      subtitle="Account risk profile: external signals correlated against verified compliance evidence"
      badge="Partner · Underwriting" badgeColor={C.navy}
    >
      <Exec>
        This account presents a verified evidence base across both regulatory pillars: 8 county
        food safety evaluations with no open findings, and an unbroken fire safeguard service
        trail meeting NFPA 96 quarterly intervals. Correlated against six external signals
        active in Merced County this quarter, the account's exposure concentrates in workforce
        cost absorption, not in compliance risk. Record depth — 412 verified temperature
        readings in May, same-shift deviation closure — places this account in the strongest
        documentation tier this engine produces.
      </Exec>

      <Pillar color={C.rev} name="Revenue Pillar" signal="exposure: low">
        <T cols={["Factor", "Evidence Basis", "Direction"]} rows={[
          ["Closure risk from regulatory action", "0 closure-trigger findings in 8 evaluations", "Favorable"],
          ["Public record visibility", "Both locations display PASS on county portal", "Favorable"],
        ]} />
      </Pillar>

      <Pillar color={C.cost} name="Cost Pillar" signal="exposure: low">
        <T cols={["Factor", "Evidence Basis", "Direction"]} rows={[
          ["Deferred maintenance indicator", "2 equipment deviations, both vendor-corrected same week", "Favorable"],
          ["Service contract stability", "Exhaust vendor rate locked through 2026", "Neutral"],
        ]} />
      </Pillar>

      <Pillar color={C.ops} name="Operational Pillar" signal="exposure: low">
        <T cols={["Factor", "Evidence Basis", "Direction"]} rows={[
          [<span>Record fabrication screening <Tag pillar="food" /></span>, "Reading-interval and author-variance patterns consistent with live logging", "No flags"],
          ["Process control depth", "5–8 distinct staff contributing weekly evidence", "Favorable"],
        ]} />
        <Src>Five-signal fabrication screen: no signals raised this period.</Src>
      </Pillar>

      <Pillar color={C.wf} name="Workforce Pillar" signal="exposure: moderate">
        <T cols={["Factor", "Evidence Basis", "Direction"]} rows={[
          ["Credential currency", "14/14 food handler cards current; 3 certified managers", "Favorable"],
          ["Wage step absorption (Jan 2027)", "≈ $9.1K annualized at current roster", "Watch"],
        ]} />
      </Pillar>

      <Pillar color={C.liab} name="Liability Pillar" signal="exposure: low">
        <T cols={["Factor", "Evidence Basis", "Direction"]} rows={[
          [<span>PSE conformance <Tag pillar="fire" /></span>, "All named safeguards in interval; extinguisher service scheduled ahead of due date", "Favorable"],
          [<span>Foodborne illness exposure <Tag pillar="food" /></span>, "AMC record: 2/2 deviations closed same shift; written procedures active", "Favorable"],
        ]} />
        <Src>NFPA 96 (2021) Table 12.4 · CalCode 2026 · evidence verified against source records, not attestations.</Src>
      </Pillar>

      <div style={{
        marginTop: 4, padding: "12px 16px", background: "#F0EDE5",
        border: `1px solid ${C.line}`, borderRadius: 8,
        fontFamily: font.body, fontSize: 11.5, color: C.slate, lineHeight: 1.6,
      }}>
        <b>Disclosures.</b> Prepared for appointed partners under a written data-sharing
        authorization executed by the insured; the insured may revoke authorization at any
        time, ending future reports. Food safety and fire safety evidence is attributed to its
        separate authority (county environmental health department; fire authority) throughout
        and is never combined. External signals are reported with their sources and are not
        independently adjudicated. This report presents records and signals as kept and
        received; it is not a coverage recommendation, an underwriting decision, a guarantee of
        future compliance, or advice of any kind. EvidLY is not an insurance producer, adjuster,
        or analyst. Coverage decisions rest solely with the licensed professionals receiving
        this report.
      </div>
    </Shell>
  );
}

/* ── shell ── */

export default function CicPillarPreviews() {
  const [tab, setTab] = useState("customer");
  return (
    <div style={{ minHeight: "100vh", background: C.cream, padding: "26px 16px 70px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Source+Sans+3:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 760, margin: "0 auto 16px", display: "flex", gap: 8 }}>
        {[["customer", "Customer — Business Impact Report"], ["carrier", "Carrier — Five-Pillar Risk Intelligence"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            fontFamily: font.body, fontWeight: 600, fontSize: 12.5,
            padding: "8px 16px", borderRadius: 20, cursor: "pointer",
            border: tab === k ? `1.5px solid ${C.navy}` : `1px solid ${C.line}`,
            background: tab === k ? C.navy : C.white,
            color: tab === k ? C.cream : C.slate,
          }}>{label}</button>
        ))}
      </div>
      {tab === "customer" ? <CustomerVersion /> : <CarrierVersion />}
    </div>
  );
}
