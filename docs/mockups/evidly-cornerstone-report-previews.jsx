import { useState } from "react";

/* ─────────────────────────────────────────────────────────
   EvidLY cornerstone report previews — rendered document
   layouts (hosted view + PDF source of truth)
   4 cornerstones: Food Safety Compliance Summary,
   HACCP & Active Managerial Control, PSE Compliance
   Summary, Insurance Package.
   Rules: pillars separate, three-act spine, prose exec
   summary, co-branded, gold keylines only, CalCode/NFPA
   citations, banned vocab clean.
   Sample org: Riverstone Vineyards · Merced County
   ───────────────────────────────────────────────────────── */

const C = {
  navy: "#1E2D4D", cream: "#FAF7F0", ink: "#21242B", slate: "#5B6472",
  line: "#E3DDD0", gold: "#A08C5A",
  food: "#2F6F4F", foodBg: "#EAF3EE",
  fire: "#9E3B2F", fireBg: "#F8ECE9",
  white: "#FFFFFF", pass: "#2F6F4F", fail: "#9E3B2F", warn: "#8A6D1F",
};
const font = {
  display: "'Fraunces', Georgia, serif",
  body: "'Source Sans 3', 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

/* ── document atoms ── */

function DocShell({ children, title, subtitle, pillar }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.line}`, borderRadius: 12,
      maxWidth: 760, margin: "0 auto", overflow: "hidden",
      boxShadow: "0 2px 16px rgba(30,45,77,0.08)",
    }}>
      {/* co-branded header: customer = subject, EvidLY = producer credit */}
      <div style={{ background: C.navy, padding: "26px 36px 22px", borderBottom: `3px solid ${C.gold}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: font.display, fontSize: 22, color: C.cream, fontWeight: 600 }}>
              Riverstone Vineyards
            </div>
            <div style={{ fontFamily: font.body, fontSize: 12.5, color: "#B9C2D4", marginTop: 3 }}>
              Main Street Kitchen · Merced County, California
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase" }}>
              {pillar}
            </div>
            <div style={{ fontFamily: font.mono, fontSize: 10.5, color: "#B9C2D4", marginTop: 4 }}>
              May 1 – May 31, 2026
            </div>
          </div>
        </div>
        <div style={{ fontFamily: font.display, fontSize: 27, color: C.cream, fontWeight: 600, marginTop: 18, lineHeight: 1.2 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontFamily: font.body, fontSize: 13, color: "#B9C2D4", marginTop: 5 }}>{subtitle}</div>
        )}
      </div>
      <div style={{ padding: "30px 36px 26px" }}>{children}</div>
      <div style={{
        borderTop: `1px solid ${C.line}`, padding: "12px 36px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontFamily: font.body, fontSize: 11, color: C.slate }}>
          Produced by Evid<span style={{ color: C.gold, fontWeight: 700 }}>LY</span> from Riverstone Vineyards records
        </span>
        <span style={{ fontFamily: font.mono, fontSize: 10, color: C.slate }}>
          Generated Jun 5, 2026 · Live copy: evidly.com/r/8kF2…
        </span>
      </div>
    </div>
  );
}

function ExecSummary({ children }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <SectionHead>Executive Summary</SectionHead>
      <p style={{
        fontFamily: font.body, fontSize: 14.5, lineHeight: 1.75, color: C.ink, margin: 0,
        paddingLeft: 14, borderLeft: `2px solid ${C.gold}`,
      }}>{children}</p>
    </section>
  );
}

function SectionHead({ children, act }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
      {act && (
        <span style={{
          fontFamily: font.mono, fontSize: 9.5, letterSpacing: 1.6, textTransform: "uppercase",
          color: C.gold,
        }}>{act}</span>
      )}
      <h3 style={{ fontFamily: font.display, fontSize: 17, fontWeight: 600, color: C.navy, margin: 0 }}>
        {children}
      </h3>
      <div style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );
}

function Result({ v }) {
  const col = v === "PASS" ? C.pass : v === "FAIL" ? C.fail : C.warn;
  return <span style={{ fontFamily: font.mono, fontSize: 11, fontWeight: 600, color: col }}>{v}</span>;
}

function Tbl({ cols, rows }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font.body, fontSize: 12.5 }}>
      <thead>
        <tr>
          {cols.map(c => (
            <th key={c} style={{
              textAlign: "left", padding: "7px 10px", fontFamily: font.mono, fontSize: 10,
              letterSpacing: 1.2, textTransform: "uppercase", color: C.slate,
              borderBottom: `1.5px solid ${C.navy}22`,
            }}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
            {r.map((cell, j) => (
              <td key={j} style={{ padding: "8px 10px", color: C.ink, verticalAlign: "top" }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Cite({ children }) {
  return (
    <div style={{ fontFamily: font.mono, fontSize: 10.5, color: C.slate, marginTop: 8 }}>
      {children}
    </div>
  );
}

function CrossRef({ children }) {
  return (
    <div style={{
      marginTop: 10, padding: "8px 12px", background: "#F6F3EB",
      border: `1px solid ${C.line}`, borderRadius: 6,
      fontFamily: font.body, fontSize: 12, color: C.slate,
    }}>
      ↪ {children}
    </div>
  );
}

/* ── 1. FOOD SAFETY COMPLIANCE SUMMARY ── */

function FoodSafetySummary() {
  return (
    <DocShell title="Food Safety Compliance Summary" pillar="Food Safety · EHD"
      subtitle="Standing with the Merced County Department of Public Health, Environmental Health Division">
      <ExecSummary>
        Riverstone Vineyards enters June with both locations holding their most recent county
        evaluations and no open major violations. The pattern across May identifies refrigeration
        holding at the Main Street walk-in as the one area trending toward a finding before the
        next county visit. The corrective work completed on May 19 closed that gap the same week
        it appeared, and the records behind every reading in this summary are attached and
        current. What the county will see is what this report shows.
      </ExecSummary>

      <section style={{ marginBottom: 24 }}>
        <SectionHead act="Predict">County Standing by Location</SectionHead>
        <Tbl
          cols={["Location", "County Evaluation", "Date", "Result"]}
          rows={[
            ["Main Street Kitchen", "Routine inspection — Merced County EHD", "Apr 22, 2026", <Result v="PASS" />],
            ["Riverbank Tasting Room", "Routine inspection — Merced County EHD", "Mar 9, 2026", <Result v="PASS" />],
          ]}
        />
        <Cite>Displayed exactly as Merced County Environmental Health produces it. 2026 California Retail Food Code.</Cite>
      </section>

      <section style={{ marginBottom: 24 }}>
        <SectionHead act="Reduce">What Was Found and Corrected</SectionHead>
        <Tbl
          cols={["Identified", "Finding", "Action", "Closed"]}
          rows={[
            ["May 17", "Walk-in cooler reading 44°F, above 41°F holding limit", "Compressor serviced; product moved; re-check at 38°F", <Result v="PASS" />],
            ["May 24", "Sanitizer at 80 ppm, below 100 ppm chlorine minimum", "Re-mixed and verified by test strip same shift", <Result v="PASS" />],
          ]}
        />
        <Cite>CalCode §113996 (holding temperatures) · §114117 (sanitizer concentration)</Cite>
      </section>

      <section>
        <SectionHead act="Prove">The Record Behind This Summary</SectionHead>
        <Tbl
          cols={["Evidence", "Period Count", "Pass Rate"]}
          rows={[
            ["Temperature readings", "412", "97.6%"],
            ["Checklist completions", "58", "94.8%"],
            ["Corrective actions closed", "2 of 2", "100%"],
          ]}
        />
        <CrossRef>Full readings in the <b>Temperature Log Summary</b> · each correction detailed in the <b>Corrective Action Record</b></CrossRef>
      </section>
    </DocShell>
  );
}

/* ── 2. HACCP / ACTIVE MANAGERIAL CONTROL ── */

function HaccpReport() {
  return (
    <DocShell title="Active Managerial Control & HACCP" pillar="Food Safety · EHD"
      subtitle="Control of the five CDC-identified foodborne illness risk factors">
      <ExecSummary>
        This report shows how Riverstone Vineyards exercises active managerial control over the
        five CDC-identified risk factors, with its HACCP plan as the written backbone. Every
        critical control point was monitored through May, and the two readings that crossed a
        critical limit were caught by the people on shift and corrected before service. The
        depth of the record — 412 temperature readings, 31 CCP checks, every deviation closed —
        is the strongest evidence a county inspector can ask for that control here is active,
        not assumed.
      </ExecSummary>

      <section style={{ marginBottom: 24 }}>
        <SectionHead act="Predict">Plan & Critical Control Points</SectionHead>
        <Tbl
          cols={["CCP", "Hazard", "Critical Limit"]}
          rows={[
            ["CCP-1: Cold Holding", "Bacterial growth in TCS foods", "≤ 41°F"],
            ["CCP-2: Cooking", "Survival of pathogens", "≥ 165°F poultry / 155°F ground"],
            ["CCP-3: Cooling", "Growth during cooling", "135→70°F in 2h; 70→41°F in 4h"],
          ]}
        />
        <Cite>Plan: Riverstone Vineyards HACCP v3 · adopted Feb 2026 · TPHC written procedure on file (CalCode §114000)</Cite>
        <CrossRef>Active policy: <b>Time as a Public Health Control (TPHC) Written Procedure</b> — adopted from the Policies &amp; Procedures library, v2</CrossRef>
      </section>

      <section style={{ marginBottom: 24 }}>
        <SectionHead act="Reduce">Deviations Caught and Corrected</SectionHead>
        <Tbl
          cols={["CCP", "Recorded", "Limit", "Action", "Status"]}
          rows={[
            ["CCP-1", "44°F · May 17, 6:12a", "≤ 41°F", "Product relocated, unit serviced, re-check 38°F", <Result v="CLOSED" />],
            ["CCP-3", "74°F at 2h · May 28", "≤ 70°F at 2h", "Ice bath, re-portioned, hit 41°F at 3h40m", <Result v="CLOSED" />],
          ]}
        />
      </section>

      <section>
        <SectionHead act="Prove">Monitoring Record — May 2026</SectionHead>
        <Tbl
          cols={["Evidence Type", "Count", "In Limit"]}
          rows={[
            ["Temperature readings", "412", "97.6%"],
            ["CCP monitoring checks", "31", "93.5%"],
            ["Checklist completions", "58", "94.8%"],
            ["Corrective actions", "2", "2 closed"],
          ]}
        />
        <Cite>Scope: food safety only. This report makes no warranties; it presents the records as kept.</Cite>
      </section>
    </DocShell>
  );
}

/* ── 3. PSE COMPLIANCE SUMMARY (FIRE) ── */

function PseReport() {
  return (
    <DocShell title="Protective Safeguards Compliance Summary" pillar="Fire Safety · AHJ"
      subtitle="Standing against the Protective Safeguards Endorsement on the property policy">
      <ExecSummary>
        Every safeguard the endorsement names is in service and inside its required interval as
        of this report. The kitchen exhaust cleaning was completed to bare metal on May 12, ahead of
        its quarterly date, and the suppression carries a current certification through
        October. One item deserves attention before renewal: the Riverbank location's extinguisher
        annual service comes due June 20, and scheduling it this week keeps the record unbroken.
        An unbroken record here is what keeps a fire loss claim from being contested.
      </ExecSummary>

      <section style={{ marginBottom: 24 }}>
        <SectionHead act="Predict">Safeguards Named on the Endorsement</SectionHead>
        <Tbl
          cols={["Safeguard", "Requirement", "Next Due", "Standing"]}
          rows={[
            ["Exhaust cleaning", "Quarterly — high-volume cooking", "Aug 12, 2026", <Result v="CURRENT" />],
            ["Suppression service", "Semiannual", "Oct 28, 2026", <Result v="CURRENT" />],
            ["Class K extinguishers", "Annual service", "Jun 20, 2026", <Result v="DUE SOON" />],
          ]}
        />
        <Cite>NFPA 96 (2021) Table 12.4 · NFPA 17A §7.3 · CFC §906 — as enforced by the Merced County Fire Department</Cite>
      </section>

      <section style={{ marginBottom: 24 }}>
        <SectionHead act="Reduce">Service Completed This Period</SectionHead>
        <Tbl
          cols={["Date", "Service", "Performed By", "Record"]}
          rows={[
            ["May 12", "Hood, duct & fan cleaned to bare metal", "Cleaning Pros Plus (IKECA cert.)", "Report + sticker on file"],
            ["May 12", "Inaccessible duct section noted (8 ft, roof transition)", "—", "Disclosed on service report"],
          ]}
        />
      </section>

      <section>
        <SectionHead act="Prove">Certification Trail</SectionHead>
        <Tbl
          cols={["Document", "Issued", "Expires"]}
          rows={[
            ["Exhaust cleaning certificate — Main Street", "May 12, 2026", "Aug 12, 2026"],
            ["Suppression certification tag", "Apr 28, 2026", "Oct 28, 2026"],
            ["Extinguisher service tags (6 units)", "Jun 20, 2025", "Jun 20, 2026"],
          ]}
        />
        <CrossRef>Each certificate is attached as a component record in the <b>Insurance Package</b></CrossRef>
      </section>
    </DocShell>
  );
}

/* ── 4. INSURANCE PACKAGE (composed, pillar-separated) ── */

function InsurancePackage() {
  return (
    <DocShell title="Insurance Package" pillar="Renewal Documentation"
      subtitle="Assembled for the insurance professional of record — food and fire records presented separately">
      <ExecSummary>
        This package assembles what an underwriter asks for at renewal: the county's own food
        safety evaluations, the fire safeguard service trail, and the certificates behind both.
        Food safety and fire safety are presented separately because they answer to different
        authorities — the county environmental health department and the fire authority — and an
        underwriter reads them separately. Every document referenced is attached, current, and
        traceable to the vendor or county that produced it.
      </ExecSummary>

      {/* FOOD pillar block */}
      <div style={{
        border: `1px solid ${C.food}33`, borderRadius: 10, padding: "18px 22px",
        marginBottom: 18, background: C.foodBg + "55",
      }}>
        <div style={{
          fontFamily: font.mono, fontSize: 10.5, letterSpacing: 1.6, textTransform: "uppercase",
          color: C.food, marginBottom: 12,
        }}>Part I — Food Safety · County EHD</div>
        <Tbl
          cols={["Item", "Status", "Reference"]}
          rows={[
            ["County evaluations — both locations", <Result v="PASS" />, "Food Safety Compliance Summary §1"],
            ["Active managerial control record", "412 readings · 2/2 closed", "Active Managerial Control & HACCP"],
            ["Written procedures (TPHC, illness policy)", "Active, v2", "Policies & Procedures"],
          ]}
        />
      </div>

      {/* FIRE pillar block */}
      <div style={{
        border: `1px solid ${C.fire}33`, borderRadius: 10, padding: "18px 22px",
        marginBottom: 18, background: C.fireBg + "55",
      }}>
        <div style={{
          fontFamily: font.mono, fontSize: 10.5, letterSpacing: 1.6, textTransform: "uppercase",
          color: C.fire, marginBottom: 12,
        }}>Part II — Fire Safety · Fire Authority</div>
        <Tbl
          cols={["Item", "Status", "Reference"]}
          rows={[
            ["Exhaust cleaning — within interval", <Result v="CURRENT" />, "PSE Compliance Summary §1"],
            ["Suppression certification", <Result v="CURRENT" />, "Cert. tag Apr 28, 2026"],
            ["Extinguisher annual service", <Result v="DUE SOON" />, "Due Jun 20 — scheduled"],
          ]}
        />
      </div>

      <section>
        <SectionHead>Attached Documents</SectionHead>
        <Tbl
          cols={["Document", "Source", "Date"]}
          rows={[
            ["Merced County EHD inspection report (×2)", "County", "Apr 22 / Mar 9"],
            ["Exhaust cleaning certificate + service report", "Cleaning Pros Plus", "May 12"],
            ["Suppression certification", "Fire protection vendor", "Apr 28"],
            ["Written procedures (2 active)", "Riverstone Vineyards", "Current versions"],
          ]}
        />
        <Cite>Prepared for review by the insured's insurance professional. EvidLY reads the records; your agent evaluates the coverage.</Cite>
      </section>
    </DocShell>
  );
}

/* ── shell ── */

const tabs = [
  ["food", "Food Safety Summary", FoodSafetySummary],
  ["haccp", "HACCP / AMC", HaccpReport],
  ["pse", "PSE Summary", PseReport],
  ["ins", "Insurance Package", InsurancePackage],
];

export default function CornerstonePreviews() {
  const [tab, setTab] = useState("food");
  const Active = tabs.find(t => t[0] === tab)[2];
  return (
    <div style={{ minHeight: "100vh", background: C.cream, padding: "26px 18px 70px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Source+Sans+3:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 760, margin: "0 auto 18px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            fontFamily: font.body, fontWeight: 600, fontSize: 12.5,
            padding: "7px 14px", borderRadius: 20, cursor: "pointer",
            border: tab === k ? `1.5px solid ${C.navy}` : `1px solid ${C.line}`,
            background: tab === k ? C.navy : C.white,
            color: tab === k ? C.cream : C.slate,
          }}>{label}</button>
        ))}
      </div>
      <Active />
    </div>
  );
}
