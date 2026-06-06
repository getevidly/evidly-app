import { useState } from "react";

/* ─────────────────────────────────────────────────────────
   EvidLY Tier 1 — remaining 15 report previews
   (cornerstones already approved in
   evidly-cornerstone-report-previews.jsx — same document
   language: co-branded header, prose exec summary w/ gold
   keyline, Predict/Reduce/Prove act sections, citations,
   cross-refs, pillars never blended.)
   #15 = Prospect Marketing Report (hidden-route internal
   sales artifact — marketing rendering mode).
   Sample org: Riverstone Vineyards · Merced County
   ───────────────────────────────────────────────────────── */

const C = {
  navy: "#1E2D4D", cream: "#FAF7F0", ink: "#21242B", slate: "#5B6472",
  line: "#E3DDD0", gold: "#A08C5A",
  food: "#2F6F4F", foodBg: "#EAF3EE",
  fire: "#9E3B2F", fireBg: "#F8ECE9",
  ops: "#3D5A80", bizBg: "#EDF0F5",
  white: "#FFFFFF", pass: "#2F6F4F", fail: "#9E3B2F", warn: "#8A6D1F",
};
const font = {
  display: "'Fraunces', Georgia, serif",
  body: "'Source Sans 3', 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

/* ── shared document atoms (same language as cornerstones) ── */

function DocShell({ children, title, subtitle, pillar }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.line}`, borderRadius: 12,
      maxWidth: 760, margin: "0 auto", overflow: "hidden",
      boxShadow: "0 2px 16px rgba(30,45,77,0.08)",
    }}>
      <div style={{ background: C.navy, padding: "22px 34px 18px", borderBottom: `3px solid ${C.gold}` }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: font.display, fontSize: 19, color: C.cream, fontWeight: 600 }}>
              Riverstone Vineyards
            </div>
            <div style={{ fontFamily: font.body, fontSize: 12, color: "#B9C2D4", marginTop: 2 }}>
              Main Street Kitchen · Merced County, California
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: font.mono, fontSize: 9.5, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase" }}>
              {pillar}
            </div>
            <div style={{ fontFamily: font.mono, fontSize: 10, color: "#B9C2D4", marginTop: 4 }}>
              May 1 – May 31, 2026
            </div>
          </div>
        </div>
        <div style={{ fontFamily: font.display, fontSize: 23, color: C.cream, fontWeight: 600, marginTop: 14, lineHeight: 1.2 }}>
          {title}
        </div>
        {subtitle && <div style={{ fontFamily: font.body, fontSize: 12.5, color: "#B9C2D4", marginTop: 4 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: "26px 34px 22px" }}>{children}</div>
      <div style={{
        borderTop: `1px solid ${C.line}`, padding: "10px 34px",
        display: "flex", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: font.body, fontSize: 10.5, color: C.slate }}>
          Produced by Evid<span style={{ color: C.gold, fontWeight: 700 }}>LY</span> from Riverstone Vineyards records
        </span>
        <span style={{ fontFamily: font.mono, fontSize: 9.5, color: C.slate }}>
          Generated Jun 5, 2026 · Live copy: evidly.com/r/…
        </span>
      </div>
    </div>
  );
}

function Exec({ children }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <Head>Executive Summary</Head>
      <p style={{
        fontFamily: font.body, fontSize: 13.5, lineHeight: 1.7, color: C.ink, margin: 0,
        paddingLeft: 13, borderLeft: `2px solid ${C.gold}`,
      }}>{children}</p>
    </section>
  );
}

function Head({ children, act }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 8 }}>
      {act && <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: C.gold }}>{act}</span>}
      <h3 style={{ fontFamily: font.display, fontSize: 15.5, fontWeight: 600, color: C.navy, margin: 0 }}>{children}</h3>
      <div style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );
}

function R({ v }) {
  const col = ["PASS", "CURRENT", "CLOSED", "ACTIVE", "ON TIME"].includes(v) ? C.pass
    : ["FAIL", "OVERDUE", "MISSED", "EXPIRED"].includes(v) ? C.fail : C.warn;
  return <span style={{ fontFamily: font.mono, fontSize: 10.5, fontWeight: 600, color: col }}>{v}</span>;
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

function Cite({ children }) {
  return <div style={{ fontFamily: font.mono, fontSize: 10, color: C.slate, marginTop: 7 }}>{children}</div>;
}
function Xref({ children }) {
  return <div style={{
    marginTop: 9, padding: "7px 11px", background: "#F6F3EB", border: `1px solid ${C.line}`,
    borderRadius: 6, fontFamily: font.body, fontSize: 11.5, color: C.slate,
  }}>↪ {children}</div>;
}
function S({ act, head, children }) {
  return <section style={{ marginBottom: 20 }}><Head act={act}>{head}</Head>{children}</section>;
}

/* ── FOOD SAFETY (5) ── */

const TempLogSummary = () => (
  <DocShell title="Temperature Log Summary" pillar="Food Safety · EHD"
    subtitle="Every reading, by equipment, against its required range">
    <Exec>
      Across 412 readings this period, the kitchen's cold chain held inside its required ranges
      97.6 percent of the time, and the ten readings that fell outside were each corrected on the
      shift they appeared. The walk-in cooler accounts for six of the ten, which identifies it as
      the unit to watch before it becomes a county finding. Every number below traces to a logged
      reading with a time, an equipment record, and the person who took it.
    </Exec>
    <S act="Predict" head="Equipment Watch List">
      <T cols={["Equipment", "Readings", "In Range", "Trend"]} rows={[
        ["Walk-in cooler — Main St", "124", "95.2%", <R v="WATCH" />],
        ["Reach-in #2", "96", "99.0%", <R v="ON TIME" />],
        ["Hot hold — line", "88", "98.9%", <R v="ON TIME" />],
      ]} />
    </S>
    <S act="Reduce" head="Out-of-Range Readings & Same-Shift Corrections">
      <T cols={["Date", "Equipment", "Reading", "Required", "Correction"]} rows={[
        ["May 17", "Walk-in cooler", "44°F", "≤ 41°F", "Serviced; re-check 38°F"],
        ["May 24", "Hot hold — line", "129°F", "≥ 135°F", "Reheated to 165°F; re-checked"],
      ]} />
      <Cite>CalCode §113996, §114000 holding requirements</Cite>
    </S>
    <S act="Prove" head="The Complete Record">
      <T cols={["Week", "Readings", "Pass", "Logged By"]} rows={[
        ["May 1–7", "98", "96", "4 staff"],
        ["May 8–14", "104", "102", "4 staff"],
        ["May 15–21", "102", "99", "5 staff"],
        ["May 22–31", "108", "105", "5 staff"],
      ]} />
      <Xref>Deviations detailed in the <b>Corrective Action Record</b> · feeds the <b>Active Managerial Control &amp; HACCP</b> report</Xref>
    </S>
  </DocShell>
);

const CorrectiveActionRecord = () => (
  <DocShell title="Corrective Action Record" pillar="Food Safety · EHD"
    subtitle="Every deviation: what was found, what was done, who closed it">
    <Exec>
      Two deviations were recorded in May and both were closed inside the same shift they were
      found — a closure pattern a county inspector reads as active control, not paperwork.
      Neither recurred after correction. The root causes named below were equipment-side, not
      training-side, which is why the fix list runs through the service vendor rather than
      the schedule.
    </Exec>
    <S act="Predict" head="Pattern Across the Period">
      <T cols={["Category", "Count", "Repeat?"]} rows={[
        ["Cold holding", "1", "No"],
        ["Hot holding", "1", "No"],
        ["Sanitizer concentration", "0", "—"],
      ]} />
    </S>
    <S act="Reduce" head="Actions Taken">
      <T cols={["Found", "Deviation", "Root Cause", "Action", "Status"]} rows={[
        ["May 17, 6:12a", "Walk-in 44°F", "Compressor wear", "Vendor service same day", <R v="CLOSED" />],
        ["May 24, 1:40p", "Hot hold 129°F", "Lamp element failing", "Element replaced; product reheated", <R v="CLOSED" />],
      ]} />
    </S>
    <S act="Prove" head="Closure Trail">
      <T cols={["Action", "Closed By", "Verified", "Record"]} rows={[
        ["Walk-in service", "S. Haggerty", "Re-check 38°F logged 9:05a", "Photo + invoice on file"],
        ["Hot hold element", "Line lead", "Re-check 152°F logged 3:10p", "Reading logged"],
      ]} />
      <Cite>CalCode §113980 · corrective action documentation maintained on premises</Cite>
    </S>
  </DocShell>
);

const ChecklistRecord = () => (
  <DocShell title="Checklist Completion Record" pillar="Food Safety · EHD"
    subtitle="Opening, closing, and food safety checklists — completion and findings">
    <Exec>
      Fifty-eight checklists were completed in May at a 94.8 percent completion rate, with closing
      checklists on weekends identifying themselves as the soft spot — three of the four misses
      landed on Saturday nights. The items most often marked failing are the same two surfaces
      every week, which makes the fix a station assignment, not a policy change. Every completion
      below carries its checker's name and time.
    </Exec>
    <S act="Predict" head="Completion Pattern">
      <T cols={["Checklist", "Scheduled", "Completed", "Rate"]} rows={[
        ["Opening — food safety", "31", "31", "100%"],
        ["Closing — food safety", "31", "27", <R v="WATCH" />],
        ["Weekly deep clean", "4", "4", "100%"],
      ]} />
    </S>
    <S act="Reduce" head="Items Most Often Failing">
      <T cols={["Item", "Fails", "Correction Applied"]} rows={[
        ["Prep table undershelf cleaned", "5", "Assigned to closing station 2"],
        ["Sanitizer bucket changed (4h)", "3", "Timer added to line routine"],
      ]} />
    </S>
    <S act="Prove" head="Sign-Off Record">
      <T cols={["Week", "Completions", "Distinct Staff"]} rows={[
        ["May 1–7", "14", "5"], ["May 8–14", "15", "6"], ["May 15–21", "14", "5"], ["May 22–31", "15", "6"],
      ]} />
      <Xref>Failed items with corrections feed the <b>Corrective Action Record</b></Xref>
    </S>
  </DocShell>
);

const TrainingReport = () => (
  <DocShell title="Training & Certification Record" pillar="Food Safety · EHD"
    subtitle="Food handler cards, manager certification, and policy training">
    <Exec>
      Every active employee holds a current California food handler card, and both locations have
      a certified food protection manager on staff — the two credentials a county inspector asks
      for first. Two cards expire inside the next sixty days and renewals are scheduled, which
      keeps the record unbroken through summer. Policy training on the illness reporting and TPHC
      procedures is documented for all kitchen staff hired this year.
    </Exec>
    <S act="Predict" head="Credentials Expiring Soon">
      <T cols={["Employee", "Credential", "Expires", "Status"]} rows={[
        ["M. Torres", "CA Food Handler Card", "Jul 18, 2026", <R v="DUE SOON" />],
        ["J. Chen", "CA Food Handler Card", "Aug 2, 2026", <R v="DUE SOON" />],
      ]} />
      <Cite>CalCode §113948 (manager certification) · §113947.1 (food handler cards, 30-day rule)</Cite>
    </S>
    <S act="Reduce" head="Gaps Closed This Period">
      <T cols={["Gap", "Action", "Status"]} rows={[
        ["New hire (May 5) card pending", "Card obtained May 21 — inside 30-day window", <R v="CLOSED" />],
      ]} />
    </S>
    <S act="Prove" head="Current Roster">
      <T cols={["Role", "Headcount", "Cards Current", "Mgr Cert"]} rows={[
        ["Main Street Kitchen", "9", "9 / 9", "2 certified"],
        ["Riverbank Tasting Room", "5", "5 / 5", "1 certified"],
      ]} />
      <Xref>Policy training sign-offs reference active <b>Policies &amp; Procedures</b> versions</Xref>
    </S>
  </DocShell>
);

const InspectionHistory = () => (
  <DocShell title="County Inspection History" pillar="Food Safety · EHD"
    subtitle="Every county evaluation on record, displayed exactly as the county produced it">
    <Exec>
      Riverstone Vineyards' county record runs eight evaluations across both locations since
      opening, with the last four clean of major violations. The one repeat finding in the
      history — cold holding in 2024 — has not reappeared since the walk-in replacement that
      year, which is the strongest line in this report. Nothing here is restated or rescored:
      each entry is the county's own result.
    </Exec>
    <S act="Predict" head="Where the Record Points">
      <T cols={["Location", "Last Visit", "Result", "Typical Interval", "Window Opens"]} rows={[
        ["Main Street Kitchen", "Apr 22, 2026", <R v="PASS" />, "~6 months", "Oct 2026"],
        ["Riverbank Tasting Room", "Mar 9, 2026", <R v="PASS" />, "~6 months", "Sep 2026"],
      ]} />
    </S>
    <S act="Reduce" head="Findings History & Resolution">
      <T cols={["Date", "Finding", "Resolved"]} rows={[
        ["Nov 2024", "Cold holding — walk-in at 45°F", "Unit replaced Dec 2024; no recurrence"],
        ["Jun 2025", "Minor: wiping cloth storage", "Corrected on site"],
      ]} />
    </S>
    <S act="Prove" head="Full Evaluation Record">
      <T cols={["Date", "Location", "Type", "Result"]} rows={[
        ["Apr 22, 2026", "Main Street", "Routine", <R v="PASS" />],
        ["Mar 9, 2026", "Riverbank", "Routine", <R v="PASS" />],
        ["Oct 14, 2025", "Main Street", "Routine", <R v="PASS" />],
        ["Jun 3, 2025", "Riverbank", "Routine", <R v="PASS" />],
      ]} />
      <Cite>Source: Merced County Department of Public Health, Environmental Health Division</Cite>
    </S>
  </DocShell>
);

/* ── FIRE SAFETY (4) ── */

const ExhaustHistory = () => (
  <DocShell title="Exhaust System Service History" pillar="Fire Safety · AHJ"
    subtitle="Hood, duct, and fan cleanings against the required interval">
    <Exec>
      The exhaust system over the main cooking line has been cleaned to bare metal on or ahead of
      its quarterly interval for six consecutive services, and the certification trail is
      unbroken. One duct section at the roof transition remains inaccessible and is disclosed on
      every service report — disclosed is defensible; hidden is not. The next service window
      opens in August, already on the vendor's schedule.
    </Exec>
    <S act="Predict" head="Interval Standing">
      <T cols={["System", "Required Interval", "Last Cleaned", "Next Due", "Standing"]} rows={[
        ["Main line hood + duct", "Quarterly (high-volume)", "May 12, 2026", "Aug 12, 2026", <R v="CURRENT" />],
        ["Tasting room hood", "Semiannual (moderate)", "Feb 3, 2026", "Aug 3, 2026", <R v="CURRENT" />],
      ]} />
      <Cite>NFPA 96 (2021) Table 12.4 — interval by cooking volume, as enforced by the fire authority</Cite>
    </S>
    <S act="Reduce" head="Conditions Noted by the Service Company">
      <T cols={["Date", "Noted", "Disposition"]} rows={[
        ["May 12", "Inaccessible duct section — roof transition (8 ft)", "Disclosed on report; access panel quoted"],
        ["Feb 12", "Fan belt wear", "Replaced at May service"],
      ]} />
    </S>
    <S act="Prove" head="Certification Trail">
      <T cols={["Service", "Performed By", "Certificate", "Sticker"]} rows={[
        ["May 12, 2026", "Cleaning Pros Plus (IKECA cert.)", "On file", "Affixed"],
        ["Feb 12, 2026", "Cleaning Pros Plus (IKECA cert.)", "On file", "Affixed"],
        ["Nov 8, 2025", "Cleaning Pros Plus (IKECA cert.)", "On file", "Affixed"],
      ]} />
      <Xref>Certificates attached in the <b>Insurance Package</b> · interval drives the <b>PSE Compliance Summary</b></Xref>
    </S>
  </DocShell>
);

const SuppressionRecord = () => (
  <DocShell title="Suppression & Extinguisher Record" pillar="Fire Safety · AHJ"
    subtitle="Semiannual suppression service and extinguisher maintenance, by location">
    <Exec>
      The wet chemical protecting the main line carries a current certification through
      October, with all fusible links replaced at the April service. The extinguisher fleet is
      the item this report flags: all six units at Riverbank come due for annual service on
      June 20, and completing it on schedule is what keeps a protective safeguards clause from
      having anything to point at.
    </Exec>
    <S act="Predict" head="Service Horizon">
      <T cols={["Item", "Interval", "Next Due", "Standing"]} rows={[
        ["Suppression — main line", "Semiannual", "Oct 28, 2026", <R v="CURRENT" />],
        ["Extinguishers — Main St (8)", "Annual", "Jan 15, 2027", <R v="CURRENT" />],
        ["Extinguishers — Riverbank (6)", "Annual", "Jun 20, 2026", <R v="DUE SOON" />],
      ]} />
    </S>
    <S act="Reduce" head="Findings at Last Service">
      <T cols={["Date", "Finding", "Resolution"]} rows={[
        ["Apr 28", "Two fusible links at replacement age", "Replaced during service"],
        ["Apr 28", "One nozzle cap missing", "Replaced; coverage verified"],
      ]} />
      <Cite>NFPA 17A §7.3 (semiannual) · NFPA 10 §7.2–7.3 · CFC §904.13, §906</Cite>
    </S>
    <S act="Prove" head="Tag & Certification Record">
      <T cols={["Item", "Serviced", "By", "Tag"]} rows={[
        ["Suppression", "Apr 28, 2026", "Licensed fire protection co.", "Current"],
        ["Class K — main line", "Jan 15, 2026", "Licensed fire protection co.", "Current"],
        ["Monthly quick checks", "May: 14/14 units", "Designated staff", "Logged"],
      ]} />
    </S>
  </DocShell>
);

const FireScheduleReport = () => (
  <DocShell title="Fire Safeguard Schedule" pillar="Fire Safety · AHJ"
    subtitle="Every required fire service, its interval, and who performs it">
    <Exec>
      Five recurring fire safeguards govern these two kitchens, and all five are scheduled with
      named vendors through the end of 2026. The schedule below is the same one the fire
      authority and the insurance professional read from, so a date moving here moves everywhere.
      Nothing on this schedule is more than one service away from current.
    </Exec>
    <S act="Predict" head="Twelve-Month Service Calendar">
      <T cols={["Safeguard", "Interval", "Next", "Vendor"]} rows={[
        ["Exhaust cleaning — main line", "Quarterly", "Aug 12", "Cleaning Pros Plus"],
        ["Exhaust cleaning — tasting room", "Semiannual", "Aug 3", "Cleaning Pros Plus"],
        ["Suppression service", "Semiannual", "Oct 28", "Fire protection co."],
        ["Extinguisher annual", "Annual", "Jun 20", "Fire protection co."],
        ["Hood filter exchange", "Monthly", "Jul 1", "In-house per policy"],
      ]} />
    </S>
    <S act="Reduce" head="Schedule Risks">
      <T cols={["Risk", "Why It Matters", "Mitigation"]} rows={[
        ["Riverbank extinguishers due Jun 20", "Lapse breaks the safeguard record", "Service confirmed for Jun 17"],
      ]} />
    </S>
    <S act="Prove" head="On-Time History (trailing 12 months)">
      <T cols={["Safeguard", "Services", "On Time"]} rows={[
        ["Exhaust cleaning", "6", "6 / 6"], ["Suppression", "2", "2 / 2"], ["Extinguishers", "2", "2 / 2"],
      ]} />
      <Xref>Feeds the <b>PSE Compliance Summary</b> standing table</Xref>
    </S>
  </DocShell>
);

const FireDocVault = () => (
  <DocShell title="Fire Documentation Status" pillar="Fire Safety · AHJ"
    subtitle="Certificates, tags, and reports the fire authority can ask for">
    <Exec>
      Eleven fire safety documents are on file and current, from exhaust cleaning certificates to
      the suppression certification tag, and each is attached to the location and it
      covers. One document ages out this month — the extinguisher tags renewing June 20 — and its
      replacement is already scheduled. When the fire inspector asks, everything on this list
      opens in two taps.
    </Exec>
    <S act="Predict" head="Expiring Within 90 Days">
      <T cols={["Document", "Expires", "Renewal"]} rows={[
        ["Extinguisher service tags — Riverbank (6)", "Jun 20, 2026", "Service Jun 17"],
      ]} />
    </S>
    <S act="Reduce" head="Gaps Closed This Period">
      <T cols={["Gap", "Closed"]} rows={[
        ["Feb service report missing fan section page", "Vendor reissued complete report May 14"],
      ]} />
    </S>
    <S act="Prove" head="Document Inventory">
      <T cols={["Document", "Location", "Issued", "Status"]} rows={[
        ["Exhaust cleaning certificate", "Main Street", "May 12, 2026", <R v="CURRENT" />],
        ["Suppression certification tag", "Main Street", "Apr 28, 2026", <R v="CURRENT" />],
        ["Extinguisher tags (8)", "Main Street", "Jan 15, 2026", <R v="CURRENT" />],
        ["Extinguisher tags (6)", "Riverbank", "Jun 20, 2025", <R v="DUE SOON" />],
      ]} />
    </S>
  </DocShell>
);

/* ── OPERATIONS (3) ── */

const ShiftIntelligence = () => (
  <DocShell title="Shift Intelligence Report" pillar="Operations"
    subtitle="Where the evidence is strong and where it thins out, by shift">
    <Exec>
      Morning shifts produce the deepest record — readings, checklists, and sign-offs land on
      time with five different staff contributing. The record thins on Saturday closes, where
      three of May's four missed checklists landed, all under the same two-person staffing
      pattern. This is a scheduling observation, not a people problem: every named shift that
      missed was also the thinnest-staffed shift of its week.
    </Exec>
    <S act="Predict" head="Shift Pattern">
      <T cols={["Shift", "Evidence Items", "Completion", "Trend"]} rows={[
        ["Open (6a–11a)", "248", "99.1%", <R v="ON TIME" />],
        ["Mid (11a–4p)", "201", "97.4%", <R v="ON TIME" />],
        ["Close (4p–10p)", "188", "92.6%", <R v="WATCH" />],
      ]} />
    </S>
    <S act="Reduce" head="Thin Spots & Fixes">
      <T cols={["Pattern", "Fix Applied"]} rows={[
        ["Sat close misses (3 of 4 total)", "Closing checklist owner named per shift starting Jun 7"],
      ]} />
    </S>
    <S act="Prove" head="Contribution Record">
      <T cols={["Week", "Staff Contributing", "Items Logged"]} rows={[
        ["May 1–7", "7", "156"], ["May 8–14", "8", "162"], ["May 15–21", "7", "158"], ["May 22–31", "8", "161"],
      ]} />
    </S>
  </DocShell>
);

const MultiLocationMirror = () => (
  <DocShell title="Multi-Location Mirror" pillar="Operations"
    subtitle="Every location side by side — each pillar shown separately">
    <Exec>
      Both locations hold current county evaluations and current fire safeguards, with Main
      Street carrying the deeper evidence record simply because it runs more covers. The mirror
      identifies one divergence worth a phone call: Riverbank's checklist completion trails Main
      Street by six points, and its extinguisher service lands this month. Food and fire are
      shown separately below because they answer to different authorities.
    </Exec>
    <S head="Food Safety — by Location">
      <T cols={["", "Main Street", "Riverbank"]} rows={[
        ["County evaluation", <R v="PASS" />, <R v="PASS" />],
        ["Temp readings (May)", "264", "148"],
        ["Checklist completion", "96.8%", "90.7%"],
        ["Open corrective actions", "0", "0"],
      ]} />
    </S>
    <S head="Fire Safety — by Location">
      <T cols={["", "Main Street", "Riverbank"]} rows={[
        ["Exhaust cleaning", <R v="CURRENT" />, <R v="CURRENT" />],
        ["Suppression cert", <R v="CURRENT" />, <R v="CURRENT" />],
        ["Extinguishers", <R v="CURRENT" />, <R v="DUE SOON" />],
      ]} />
      <Xref>Per-location detail in each location's <b>Food Safety Compliance Summary</b> and <b>PSE Compliance Summary</b></Xref>
    </S>
  </DocShell>
);

const DocVaultStatus = () => (
  <DocShell title="Document Vault Status" pillar="Operations"
    subtitle="Everything on file, everything expiring, across both pillars — kept separate">
    <Exec>
      Twenty-nine documents are on file across both locations: county evaluations, service
      certificates, written procedures, and credentials. Three age out inside ninety days and
      each has a renewal already scheduled, which means nothing on this list will lapse
      unattended. A document vault is only as good as its weakest expiration — today that is
      the Riverbank extinguisher tags, fifteen days out.
    </Exec>
    <S act="Predict" head="Expiring Within 90 Days">
      <T cols={["Document", "Pillar", "Expires", "Renewal"]} rows={[
        ["Extinguisher tags — Riverbank", "Fire Safety", "Jun 20", "Jun 17 service"],
        ["Food handler card — M. Torres", "Food Safety", "Jul 18", "Course scheduled"],
        ["Food handler card — J. Chen", "Food Safety", "Aug 2", "Course scheduled"],
      ]} />
    </S>
    <S act="Reduce" head="Vault Gaps Closed">
      <T cols={["Gap", "Closed"]} rows={[
        ["Riverbank 2024 county report missing", "Requested and filed May 9"],
      ]} />
    </S>
    <S act="Prove" head="Inventory by Category">
      <T cols={["Category", "Count", "Current"]} rows={[
        ["County evaluations", "8", "8"], ["Fire service certificates", "11", "10"],
        ["Written procedures (active)", "4", "4"], ["Staff credentials", "6", "6"],
      ]} />
    </S>
  </DocShell>
);

/* ── BUSINESS (3) ── */

const VendorSummary = () => (
  <DocShell title="Vendor Service Summary" pillar="Business"
    subtitle="Every service vendor: what they did, when, and what it cost">
    <Exec>
      Four vendors performed eleven services across the trailing six months, all on schedule and
      all documented. Exhaust cleaning is the largest line and is locked at a negotiated rate
      through 2026. The one open vendor item is the access panel quote for the roof-transition
      duct — accepting it removes the single recurring disclosure on the exhaust record.
    </Exec>
    <S act="Predict" head="Upcoming Spend">
      <T cols={["Service", "Due", "Vendor", "Negotiated"]} rows={[
        ["Extinguisher annual (6)", "Jun 17", "Fire protection co.", "$240"],
        ["Exhaust cleaning Q3", "Aug 12", "Cleaning Pros Plus", "$685"],
      ]} />
    </S>
    <S act="Reduce" head="Open Vendor Items">
      <T cols={["Item", "Status"]} rows={[
        ["Access panel install quote — roof duct", "Quoted $410 · pending approval"],
      ]} />
    </S>
    <S act="Prove" head="Trailing Six-Month Service Record">
      <T cols={["Date", "Vendor", "Service", "Amount", "Record"]} rows={[
        ["May 12", "Cleaning Pros Plus", "Exhaust cleaning — bare metal", "$685", "Cert + report"],
        ["Apr 28", "Fire protection co.", "Suppression semiannual", "$385", "Cert tag"],
        ["Feb 12", "Cleaning Pros Plus", "Exhaust cleaning", "$685", "Cert + report"],
        ["Jan 15", "Fire protection co.", "Extinguisher annual (8)", "$320", "Tags"],
      ]} />
    </S>
  </DocShell>
);

const RenewalReadiness = () => (
  <DocShell title="Renewal Readiness Report" pillar="Business"
    subtitle="What the insurance professional will ask for, and whether it's ready">
    <Exec>
      Of the nine items an underwriter typically requests at renewal for a kitchen with a
      protective safeguards clause, eight are ready today and the ninth — current extinguisher
      tags — becomes ready June 17. Renewal lands in September; entering it with a complete,
      unbroken safeguard record is the difference between answering questions and negotiating
      from strength. Food and fire records are packaged separately, as the carrier reads them.
    </Exec>
    <S act="Predict" head="Renewal Checklist">
      <T cols={["Item", "Pillar", "Status"]} rows={[
        ["County evaluation history", "Food Safety", <R v="CURRENT" />],
        ["Exhaust cleaning certificates (4 qtrs)", "Fire Safety", <R v="CURRENT" />],
        ["Suppression certification", "Fire Safety", <R v="CURRENT" />],
        ["Extinguisher tags — all units", "Fire Safety", <R v="DUE SOON" />],
        ["Written procedures (active)", "Food Safety", <R v="CURRENT" />],
      ]} />
    </S>
    <S act="Reduce" head="The One Gap & Its Close Date">
      <T cols={["Gap", "Closes"]} rows={[["Riverbank extinguisher service", "Jun 17 — confirmed"]]} />
    </S>
    <S act="Prove" head="Package Status">
      <T cols={["Component", "Last Generated", "Status"]} rows={[
        ["Insurance Package", "Jun 5, 2026", <R v="CURRENT" />],
        ["PSE Compliance Summary", "Jun 5, 2026", <R v="CURRENT" />],
      ]} />
      <Xref>Generates into the <b>Insurance Package</b> for the agent of record</Xref>
    </S>
  </DocShell>
);

const ExecutiveQuarterly = () => (
  <DocShell title="Owner's Quarterly Letter" pillar="Business"
    subtitle="The quarter in one page — written for the owner, not the inspector">
    <Exec>
      The second quarter closes with both locations holding clean county evaluations, an unbroken
      fire safeguard record, and an evidence base that grew every month — 412 temperature
      readings in May alone against 380 in March. Two equipment-side deviations were caught and
      closed by the people on shift, which is the working as designed. The quarter's one
      standing recommendation: approve the duct access panel and the exhaust record loses its
      only disclosure.
    </Exec>
    <S act="Predict" head="Next Quarter's Calendar">
      <T cols={["Event", "When"]} rows={[
        ["County visit window opens — Riverbank", "September"],
        ["Insurance renewal", "September"],
        ["Exhaust cleaning Q3", "August 12"],
      ]} />
    </S>
    <S act="Reduce" head="Decisions on the Owner's Desk">
      <T cols={["Decision", "Cost", "What It Buys"]} rows={[
        ["Duct access panel", "$410", "Removes the only exhaust disclosure"],
        ["Saturday close staffing", "1 shift/wk", "Closes the checklist soft spot"],
      ]} />
    </S>
    <S act="Prove" head="Quarter at a Glance">
      <T cols={["", "Mar", "Apr", "May"]} rows={[
        ["Evidence items", "496", "517", "503"],
        ["County findings", "0", "0", "0"],
        ["Fire services on time", "1/1", "1/1", "1/1"],
      ]} />
    </S>
  </DocShell>
);

/* ── 15. PROSPECT MARKETING REPORT (hidden route) ── */

const ProspectMarketingReport = () => (
  <div style={{
    background: C.white, border: `1px solid ${C.line}`, borderRadius: 12,
    maxWidth: 760, margin: "0 auto", overflow: "hidden",
    boxShadow: "0 2px 16px rgba(30,45,77,0.08)",
  }}>
    <div style={{ background: C.navy, padding: "30px 36px", borderBottom: `3px solid ${C.gold}` }}>
      <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: 2, color: C.gold, textTransform: "uppercase" }}>
        Prepared for
      </div>
      <div style={{ fontFamily: font.display, fontSize: 26, color: C.cream, fontWeight: 600, marginTop: 6 }}>
        Bella Vista Trattoria
      </div>
      <div style={{ fontFamily: font.body, fontSize: 13, color: "#B9C2D4", marginTop: 4 }}>
        Fresno County, California · prepared from public county records
      </div>
    </div>
    <div style={{ padding: "28px 36px 24px" }}>
      <Exec>
        Bella Vista Trattoria's public county record shows a kitchen that passes — and a record
        that says less than it could. Your last evaluation is eight months old, your fire
        safeguard history lives in a filing cabinet only your vendor can reconstruct, and at
        renewal your insurance professional will ask for documents that take days to assemble.
        The kitchens on the next page assemble them in one tap. This report shows what your
        county already publishes about you, and what the kitchens you compete with prove
        alongside it.
      </Exec>
      <S act="Predict" head="What Fresno County Publishes About You">
        <T cols={["Evaluation", "Date", "Result"]} rows={[
          ["Routine inspection", "Oct 3, 2025", <R v="PASS" />],
          ["Routine inspection", "Mar 18, 2025", <R v="PASS" />],
        ]} />
        <Cite>Source: Fresno County Department of Public Health — public record</Cite>
      </S>
      <S act="Reduce" head="What the Record Doesn't Show — Yet">
        <T cols={["Question an inspector or underwriter asks", "Today", "With a kept record"]} rows={[
          ["Temperature logs for the last 30 days?", "Paper, if kept", "412 readings, named, timestamped"],
          ["Exhaust cleaning certificates, 4 quarters?", "Call the vendor", "On file, one tap"],
          ["Written TPHC procedure?", "Often missing", "Active, cited to CalCode §114000"],
        ]} />
      </S>
      <S act="Prove" head="What Founder Kitchens Hold">
        <T cols={["", "Kitchens like yours on EvidLY"]} rows={[
          ["County evaluations on file", "Every one, displayed as the county produced it"],
          ["Fire safeguard record", "Unbroken certification trail, NFPA 96 intervals"],
          ["Renewal package", "Assembled and current before the agent asks"],
        ]} />
      </S>
      <div style={{
        marginTop: 6, padding: "16px 20px", border: `1px solid ${C.gold}`,
        borderRadius: 8, background: "#FBF8F1",
      }}>
        <div style={{ fontFamily: font.display, fontSize: 15.5, fontWeight: 600, color: C.navy }}>
          250 Founder seats. When they're claimed, the window closes.
        </div>
        <div style={{ fontFamily: font.body, fontSize: 12.5, color: C.slate, marginTop: 4 }}>
          Founder kitchens lock their rate for 36 months. No date deadline — seat 250 ends it.
        </div>
      </div>
    </div>
    <div style={{ borderTop: `1px solid ${C.line}`, padding: "11px 36px", display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontFamily: font.body, fontSize: 10.5, color: C.slate }}>
        Prepared by Evid<span style={{ color: C.gold, fontWeight: 700 }}>LY</span> · Predict the failure, reduce the cost.
      </span>
      <span style={{ fontFamily: font.mono, fontSize: 9.5, color: C.slate }}>Internal sales artifact — hidden route</span>
    </div>
  </div>
);

/* ── shell ── */

const groups = [
  ["Food Safety", C.food, [
    ["Temperature Log Summary", TempLogSummary],
    ["Corrective Action Record", CorrectiveActionRecord],
    ["Checklist Completion Record", ChecklistRecord],
    ["Training & Certification", TrainingReport],
    ["County Inspection History", InspectionHistory],
  ]],
  ["Fire Safety", C.fire, [
    ["Exhaust Service History", ExhaustHistory],
    ["Suppression & Extinguisher", SuppressionRecord],
    ["Fire Safeguard Schedule", FireScheduleReport],
    ["Fire Documentation Status", FireDocVault],
  ]],
  ["Operations", C.ops, [
    ["Shift Intelligence", ShiftIntelligence],
    ["Multi-Location Mirror", MultiLocationMirror],
    ["Document Vault Status", DocVaultStatus],
  ]],
  ["Business", C.navy, [
    ["Vendor Service Summary", VendorSummary],
    ["Renewal Readiness", RenewalReadiness],
    ["Owner's Quarterly Letter", ExecutiveQuarterly],
  ]],
  ["Internal", C.gold, [
    ["Prospect Marketing Report", ProspectMarketingReport],
  ]],
];

export default function Tier1RemainingPreviews() {
  const [active, setActive] = useState("Temperature Log Summary");
  let ActiveComp = TempLogSummary;
  groups.forEach(([, , items]) => items.forEach(([label, Comp]) => {
    if (label === active) ActiveComp = Comp;
  }));
  return (
    <div style={{ minHeight: "100vh", background: C.cream, padding: "24px 16px 70px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Source+Sans+3:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 760, margin: "0 auto 16px" }}>
        {groups.map(([gLabel, color, items]) => (
          <div key={gLabel} style={{ marginBottom: 8 }}>
            <span style={{
              fontFamily: font.mono, fontSize: 9.5, letterSpacing: 1.5, textTransform: "uppercase",
              color, marginRight: 10,
            }}>{gLabel}</span>
            {items.map(([label]) => (
              <button key={label} onClick={() => setActive(label)} style={{
                fontFamily: font.body, fontWeight: 600, fontSize: 11.5,
                padding: "5px 11px", borderRadius: 16, cursor: "pointer", margin: "0 5px 5px 0",
                border: active === label ? `1.5px solid ${color}` : `1px solid ${C.line}`,
                background: active === label ? color : C.white,
                color: active === label ? C.white : C.slate,
              }}>{label}</button>
            ))}
          </div>
        ))}
      </div>
      <ActiveComp />
    </div>
  );
}
