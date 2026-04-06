/**
 * SCORETABLE COUNTY DETAIL — Dual-pillar Food + Fire
 * URL: /scoretable/:stateSlug/:countySlug
 *
 * Replaces ScoreTableCountyPage (hardcoded CA) and ScoreTableWACounty (WA only).
 * Queries jurisdictions by (state, slug). Renders food safety + fire safety side-by-side.
 * Auto-generated FAQ with JSON-LD FAQPage schema.
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  E, S, ff, STATE_MAP, toSlug,
  STGlobalStyle, STHeader, STBreadcrumb, STCtaForm, STCookieBanner, STFooter,
  STIcon, STLogo, Logo, bN, StatCard, TBadge, SL,
  GRADING_TYPE_LABELS, SCORING_TYPE_LABELS, FIRE_AHJ_TYPE_LABELS, PSE_LABELS, FREQ_LABELS,
} from "./scoreTableShared";

// ═══ Render grading_config details ═══
function GradingDetails({ gc, gradingType }) {
  if (!gc) return null;
  var scoringType = gc.scoring_type || "";
  var display = gc.display || "";
  var sections = [];

  // Letter grades
  var letterKeys = ["A", "B", "C", "D", "F"];
  var hasLetterGrades = letterKeys.some(function (k) { return Array.isArray(gc[k]); });
  if (hasLetterGrades) {
    sections.push(
      <div key="letters" style={{ marginBottom: 14 }}>
        <SL>Grade Scale</SL>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {letterKeys.filter(function (k) { return Array.isArray(gc[k]); }).map(function (k) {
            return <span key={k} style={{ padding: "4px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700, background: k === "A" ? E.grnBg : k === "B" ? E.wrnBg : E.redBg, color: k === "A" ? E.grn : k === "B" ? E.wrn : E.red }}>{k}: {gc[k][0]}–{gc[k][1]}</span>;
          })}
        </div>
      </div>
    );
  }

  // Tiers
  if (Array.isArray(gc.tiers)) {
    sections.push(
      <div key="tiers" style={{ marginBottom: 14 }}>
        <SL>Rating Tiers</SL>
        {gc.tiers.map(function (t) {
          var detail = gc[t] || {};
          var range = detail.min_points != null ? (detail.max_points != null ? detail.min_points + "–" + detail.max_points + " points" : detail.min_points + "+ points") : "";
          return <div key={t} style={{ fontSize: "0.84rem", color: E.g6, marginBottom: 3 }}><strong>{t}</strong>{range ? " (" + range + ")" : ""}</div>;
        })}
      </div>
    );
  }

  // Color placards
  if (Array.isArray(gc.placards)) {
    sections.push(
      <div key="placards" style={{ marginBottom: 14 }}>
        <SL>Placard System</SL>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {gc.placards.map(function (p) {
            var info = gc[p] || {};
            var bg = p === "Green" ? E.grnBg : p === "Yellow" ? E.wrnBg : E.redBg;
            var clr = p === "Green" ? E.grn : p === "Yellow" ? E.wrn : E.red;
            return <span key={p} style={{ padding: "4px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700, background: bg, color: clr }}>{p}{info.label ? " — " + info.label : ""}</span>;
          })}
        </div>
      </div>
    );
  }

  // Key metrics
  var metrics = [];
  if (gc.fail_below != null) metrics.push({ label: "Fail Below", value: gc.fail_below });
  if (gc.passing_threshold != null) metrics.push({ label: "Pass Threshold", value: gc.passing_threshold });
  if (gc.max_score != null) metrics.push({ label: "Max Score", value: gc.max_score });
  if (gc.grade_posting) metrics.push({ label: "Posting", value: gc.grade_posting.replace(/_/g, " ") });
  if (gc.inspection_frequency) metrics.push({ label: "Frequency", value: gc.inspection_frequency });
  if (gc.reports_public) metrics.push({ label: "Public Reports", value: "Yes" });

  if (metrics.length > 0) {
    sections.push(
      <div key="metrics" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {metrics.map(function (m) {
          return (
            <div key={m.label} style={{ fontSize: "0.82rem" }}>
              <span style={{ color: E.g4, fontWeight: 600 }}>{m.label}: </span>
              <span style={{ color: E.g6 }}>{String(m.value)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (gc.source) {
    sections.push(<div key="source" style={{ fontSize: "0.72rem", color: E.g4, marginTop: 8 }}>Source: {gc.source}</div>);
  }

  return sections.length > 0 ? <div>{sections}</div> : null;
}

// ═══ Render fire_jurisdiction_config details ═══
function FireDetails({ fc }) {
  if (!fc) return null;
  var sections = [];

  // Table 12.4 frequencies
  var t124 = fc.nfpa_96_table_12_4;
  if (t124) {
    sections.push(
      <div key="t124" style={{ marginBottom: 14 }}>
        <SL>NFPA 96 Table 12.4 — Cleaning Frequencies</SL>
        <div style={{ background: E.cream, borderRadius: 8, padding: 12, border: "1px solid " + E.g2 }}>
          <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Type I — Heavy Volume", t124.type_i_heavy_volume],
                ["Type I — Moderate Volume", t124.type_i_moderate_volume],
                ["Type I — Low Volume", t124.type_i_low_volume],
                ["Type II", t124.type_ii],
                ["Solid Fuel Cooking", t124.solid_fuel_cooking],
              ].map(function (row) {
                return (
                  <tr key={row[0]} style={{ borderBottom: "1px solid " + E.g2 }}>
                    <td style={{ padding: "6px 8px", color: E.g6, fontWeight: 600 }}>{row[0]}</td>
                    <td style={{ padding: "6px 8px", color: E.navy, fontWeight: 700, textAlign: "right" }}>{FREQ_LABELS[row[1]] || row[1] || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {t124.source && <div style={{ fontSize: "0.68rem", color: E.g4, marginTop: 6 }}>{t124.source}</div>}
        </div>
      </div>
    );
  }

  // PSE safeguards
  if (Array.isArray(fc.pse_safeguards) && fc.pse_safeguards.length > 0) {
    sections.push(
      <div key="pse" style={{ marginBottom: 14 }}>
        <SL>PSE Safeguards</SL>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {fc.pse_safeguards.map(function (p) {
            return <span key={p} style={{ display: "inline-block", padding: "4px 12px", borderRadius: 100, fontSize: "0.7rem", fontWeight: 700, border: "1px solid " + S.grnL, color: S.grn, background: E.grnBg }}>{PSE_LABELS[p] || p.replace(/_/g, " ")}</span>;
          })}
        </div>
      </div>
    );
  }

  // Equipment
  var equipItems = [];
  if (fc.hood_suppression) equipItems.push({ label: "Hood Suppression", value: fc.hood_suppression.system_type, note: fc.hood_suppression.standard });
  if (fc.ansul_system) equipItems.push({ label: "Ansul System", value: fc.ansul_system.system_type || "Pre-engineered", note: fc.ansul_system.standard });
  if (fc.fire_extinguisher) equipItems.push({ label: "Extinguishers", value: (fc.fire_extinguisher.types || []).join(", "), note: fc.fire_extinguisher.standard });
  if (fc.fire_alarm) equipItems.push({ label: "Fire Alarm", value: fc.fire_alarm.system_type || "Monitored", note: fc.fire_alarm.standard });
  if (fc.sprinkler_system) equipItems.push({ label: "Sprinkler", value: fc.sprinkler_system.system_type || "NFPA 13", note: fc.sprinkler_system.standard });
  if (fc.grease_trap) equipItems.push({ label: "Grease Trap", value: fc.grease_trap.system_type || "Required", note: fc.grease_trap.standard });

  if (equipItems.length > 0) {
    sections.push(
      <div key="equip" style={{ marginBottom: 14 }}>
        <SL>Equipment Standards</SL>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {equipItems.map(function (item) {
            return (
              <div key={item.label} style={{ fontSize: "0.82rem" }}>
                <div style={{ fontWeight: 600, color: E.g6 }}>{item.label}</div>
                <div style={{ color: E.navy, fontSize: "0.78rem" }}>{item.value}</div>
                {item.note && <div style={{ color: E.g4, fontSize: "0.68rem" }}>{item.note}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Federal overlay
  if (fc.federal_overlay) {
    sections.push(
      <div key="fed" style={{ padding: "10px 14px", background: E.bluePale, borderRadius: 8, border: "1px solid " + E.g3, marginBottom: 14 }}>
        <SL>Federal Overlay</SL>
        <div style={{ fontSize: "0.82rem", color: E.g6 }}>
          <strong>{fc.federal_overlay.agency}</strong>{fc.federal_overlay.note ? " — " + fc.federal_overlay.note : ""}
        </div>
      </div>
    );
  }

  // Enabling statute
  if (fc.enabling_statute) {
    sections.push(
      <div key="statute" style={{ fontSize: "0.78rem", color: E.g5, marginTop: 4 }}>
        <span style={{ fontWeight: 600, color: E.g4 }}>Enabling Statute: </span>{fc.enabling_statute}
      </div>
    );
  }

  return sections.length > 0 ? <div>{sections}</div> : null;
}

// ═══ Auto-generate FAQ from DB data ═══
function buildFaq(j, stateInfo, gc, fc) {
  var county = j.governmental_level === "tribal" ? (j.tribal_entity_name || j.county) : j.county + " County";
  var stateName = stateInfo.name;
  var faq = [];

  // Q1: Scoring system
  var gradingLabel = GRADING_TYPE_LABELS[j.grading_type] || j.grading_type || "inspection-based evaluation";
  faq.push({
    q: "What is " + county + "'s restaurant inspection scoring system?",
    a: county + ", " + stateName + " uses a " + gradingLabel + " system for food safety inspections. Enforcement is conducted by " + (j.agency_name || "the local health department") + " under " + stateInfo.regulatory + ".",
  });

  // Q2: Fire AHJ
  if (j.fire_ahj_name) {
    var ahjLabel = FIRE_AHJ_TYPE_LABELS[j.fire_ahj_type] || j.fire_ahj_type || "";
    faq.push({
      q: "Who handles fire safety inspections for " + county + " commercial kitchens?",
      a: "Fire safety for commercial kitchens in " + county + " is handled by " + j.fire_ahj_name + (ahjLabel ? " (" + ahjLabel + ")" : "") + ". The jurisdiction enforces " + (j.fire_code_edition || stateInfo.fireCode) + " with NFPA 96 standards for kitchen hood and duct cleaning.",
    });
  }

  // Q3: Hood cleaning
  if (fc && fc.nfpa_96_table_12_4) {
    var heavyFreq = FREQ_LABELS[fc.nfpa_96_table_12_4.type_i_heavy_volume] || fc.nfpa_96_table_12_4.type_i_heavy_volume || "monthly";
    faq.push({
      q: "How often must commercial kitchen hoods be cleaned in " + county + "?",
      a: "Under NFPA 96 Table 12.4, heavy-volume Type I hoods in " + county + " require " + heavyFreq.toLowerCase() + " cleaning. Moderate-volume hoods require quarterly cleaning, and low-volume hoods require semi-annual cleaning. All cleaning must be performed by certified hood cleaning contractors.",
    });
  }

  // Q4: Pass threshold
  if (gc && (gc.fail_below != null || gc.passing_threshold != null)) {
    var thresh = gc.fail_below || gc.passing_threshold;
    faq.push({
      q: "What score do you need to pass a " + county + " health inspection?",
      a: county + " requires a minimum score of " + thresh + " to pass a food safety inspection. Facilities scoring below this threshold may face reinspection, conditional permits, or closure.",
    });
  }

  // Q5: EvidLY pitch
  faq.push({
    q: "How can EvidLY help my " + county + " restaurant stay compliant?",
    a: "EvidLY applies " + county + "'s exact inspection methodology to your daily operations — including checklists, temperature logs, and facility safety documentation. You see your projected score in real time, before an inspector arrives.",
  });

  return faq;
}

export default function ScoreTableCountyDetail() {
  var { stateSlug, countySlug } = useParams();
  var stateInfo = STATE_MAP[stateSlug];
  var [j, setJ] = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function () {
    if (!stateInfo || !countySlug) return;
    supabase
      .from("jurisdictions")
      .select("*")
      .eq("state", stateInfo.code)
      .eq("slug", countySlug)
      .maybeSingle()
      .then(function (res) {
        if (res.data) setJ(res.data);
        setLoading(false);
      });
  }, [stateInfo, countySlug]);

  useEffect(function () {
    if (!j || !stateInfo) return;
    var name = j.governmental_level === "tribal" ? (j.tribal_entity_name || j.county) : j.county + " County";
    document.title = name + " Restaurant Inspection Scores | " + stateInfo.name + " | ScoreTable by EvidLY";
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "How does " + name + ", " + stateInfo.name + " score restaurant inspections? Full food safety methodology, fire AHJ, NFPA 96 cleaning frequencies, and PSE safeguards.");
  }, [j, stateInfo]);

  if (!stateInfo) {
    return (
      <div style={{ fontFamily: ff, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: E.cream, gap: 16 }}>
        <h1 style={{ color: E.navy, fontSize: "1.4rem", fontWeight: 800 }}>State not found</h1>
        <Link to="/scoretable" style={{ color: E.gold, fontWeight: 700, fontSize: "0.88rem" }}>All States</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ fontFamily: ff, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: E.cream }}>
        <p style={{ color: E.g4 }}>Loading...</p>
      </div>
    );
  }

  if (!j) {
    return (
      <div style={{ fontFamily: ff, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: E.cream, gap: 16 }}>
        <h1 style={{ color: E.navy, fontSize: "1.4rem", fontWeight: 800 }}>Jurisdiction not found</h1>
        <p style={{ color: E.g5, fontSize: "0.88rem" }}>No {stateInfo.name} jurisdiction found for "{countySlug}".</p>
        <Link to={"/scoretable/" + stateSlug} style={{ color: E.gold, fontWeight: 700, fontSize: "0.88rem" }}>All {stateInfo.name} counties</Link>
      </div>
    );
  }

  var gc = j.grading_config || {};
  var fc = j.fire_jurisdiction_config || null;
  var isTribal = j.governmental_level === "tribal";
  var displayName = isTribal ? (j.tribal_entity_name || j.county) : j.county + " County";
  var gradingLabel = GRADING_TYPE_LABELS[j.grading_type] || j.grading_type || "";
  var scoringLabel = SCORING_TYPE_LABELS[j.scoring_type] || j.scoring_type || "";
  var ahjTypeLabel = FIRE_AHJ_TYPE_LABELS[j.fire_ahj_type] || j.fire_ahj_type || "";

  var faq = buildFaq(j, stateInfo, gc, fc);

  // JSON-LD FAQPage
  var faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(function (f) {
      return { "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } };
    }),
  };

  return (
    <div style={{ fontFamily: ff, color: E.g8, lineHeight: 1.6, background: E.cream, minHeight: "100vh" }}>
      <STGlobalStyle />
      <STCookieBanner />
      <STHeader navLinks={[["Food Safety", "#food"], ["Fire Safety", "#fire"], ["FAQ", "#faq"]]} />
      <STBreadcrumb items={[
        { label: "ScoreTable", to: "/scoretable" },
        { label: stateInfo.name, to: "/scoretable/" + stateSlug },
        { label: displayName },
      ]} />

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* ═══ HERO ═══ */}
      <section style={{ padding: "56px 24px 48px", background: "linear-gradient(160deg,#F5F3F0," + E.cream + ")", borderBottom: "1px solid " + E.g2, textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            <STIcon sz={32} /><STLogo s="1.1rem" />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
            <TBadge label={stateInfo.name} color={E.gold} />
            {isTribal && <TBadge label="Tribal Sovereignty" color="#92400e" bg={E.wrnBg} />}
            {!isTribal && gradingLabel && <TBadge label={gradingLabel} color="#15803d" bg="#f0fdf4" />}
          </div>
          <h1 style={{ fontSize: "clamp(1.8rem,5vw,2.6rem)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 14px", color: E.navy }}>
            {displayName} food safety inspection scores
          </h1>
          <p style={{ fontSize: "0.96rem", color: E.g5, maxWidth: 560, margin: "0 auto 8px", lineHeight: 1.7 }}>
            {isTribal
              ? displayName + " operates under sovereign tribal authority with independent food safety and fire enforcement."
              : "Inspections by " + (j.agency_name || "the local health department") + ". " + stateInfo.name + " food safety enforcement under " + stateInfo.regulatory + "."}
          </p>
          <p style={{ fontSize: "0.92rem", color: E.gold, fontStyle: "italic", margin: "0 auto 28px" }}>The score behind every table.</p>
        </div>
      </section>

      {/* ═══ STAT CARDS ═══ */}
      <section style={{ padding: "44px 24px", background: E.w, borderBottom: "1px solid " + E.g2 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            <StatCard label="Grading" value={gradingLabel || "—"} />
            <StatCard label="Fire AHJ" value={ahjTypeLabel || "—"} />
            <StatCard label="Fire Code" value={j.fire_code_edition || stateInfo.fireCode} />
            <StatCard label="NFPA 96" value={j.nfpa96_edition ? "NFPA 96-" + j.nfpa96_edition : "—"} />
          </div>
        </div>
      </section>

      {/* ═══ TRIBAL SOVEREIGNTY MESSAGE ═══ */}
      {isTribal && (
        <section style={{ padding: "32px 24px", background: E.wrnBg, borderBottom: "1px solid " + E.g2 }}>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: "0.88rem", color: "#92400e", fontWeight: 600, margin: 0 }}>
              {displayName} is a sovereign tribal nation. Food safety and fire enforcement operate under tribal authority, not state or county jurisdiction. Inspection methodologies, scoring systems, and enforcement actions are determined by the tribal government.
            </p>
          </div>
        </section>
      )}

      {/* ═══ DUAL-PILLAR LAYOUT ═══ */}
      <section style={{ padding: "64px 24px", background: E.cream }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* LEFT — Food Safety */}
          <div id="food" style={{ background: E.w, borderRadius: 14, padding: "28px 24px", border: "1px solid " + E.g2 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: E.navy, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: S.grn }}></span>
              Food Safety
            </h2>

            {/* Agency */}
            {j.agency_name && (
              <div style={{ marginBottom: 14 }}>
                <SL>Enforcement Agency</SL>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: E.navy }}>{j.agency_name}</div>
              </div>
            )}

            {/* Grading system */}
            {gradingLabel && (
              <div style={{ marginBottom: 14 }}>
                <SL>Grading System</SL>
                <div style={{ fontSize: "0.84rem", color: E.g6 }}>{gradingLabel}</div>
              </div>
            )}

            {/* Scoring method */}
            {scoringLabel && (
              <div style={{ marginBottom: 14 }}>
                <SL>Scoring Method</SL>
                <div style={{ fontSize: "0.84rem", color: E.g6 }}>{scoringLabel}</div>
              </div>
            )}

            {/* Grading config details */}
            <GradingDetails gc={gc} gradingType={j.grading_type} />

            {/* Regulatory basis */}
            <div style={{ marginTop: 14 }}>
              <SL>Regulatory Basis</SL>
              <div style={{ fontSize: "0.82rem", color: E.g5 }}>{stateInfo.regulatory}</div>
            </div>
          </div>

          {/* RIGHT — Fire Safety */}
          <div id="fire" style={{ background: E.w, borderRadius: 14, padding: "28px 24px", border: "1px solid " + E.g2 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: E.navy, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: E.red }}></span>
              Fire Safety
            </h2>

            {/* Fire AHJ */}
            {j.fire_ahj_name && (
              <div style={{ marginBottom: 14 }}>
                <SL>Fire AHJ</SL>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: E.navy }}>{j.fire_ahj_name}</div>
                {ahjTypeLabel && <div style={{ fontSize: "0.78rem", color: E.g4 }}>{ahjTypeLabel}</div>}
              </div>
            )}

            {/* Fire code */}
            {j.fire_code_edition && (
              <div style={{ marginBottom: 14 }}>
                <SL>Fire Code Edition</SL>
                <div style={{ fontSize: "0.84rem", color: E.g6 }}>{j.fire_code_edition}</div>
              </div>
            )}

            {/* NFPA 96 */}
            {j.nfpa96_edition && (
              <div style={{ marginBottom: 14 }}>
                <SL>NFPA 96 Edition</SL>
                <div style={{ fontSize: "0.84rem", color: E.g6 }}>NFPA 96-{j.nfpa96_edition}</div>
              </div>
            )}

            {/* State fire marshal */}
            {fc && fc.state_fire_marshal && (
              <div style={{ marginBottom: 14 }}>
                <SL>State Fire Marshal</SL>
                <div style={{ fontSize: "0.82rem", color: E.g5 }}>{fc.state_fire_marshal}</div>
              </div>
            )}

            {/* AHJ split notes */}
            {j.has_local_amendments && j.local_amendment_notes && (
              <div style={{ marginBottom: 14, padding: "10px 14px", background: E.bluePale, borderRadius: 8, border: "1px solid " + E.g3 }}>
                <div style={{ fontSize: "0.78rem", color: E.g6 }}>{j.local_amendment_notes}</div>
              </div>
            )}

            {/* Fire jurisdiction config details */}
            <FireDetails fc={fc} />
          </div>
        </div>

        {/* Mobile stacking */}
        <style>{`@media(max-width:768px){section > div[style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr !important;}}`}</style>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" style={{ padding: "64px 24px", background: E.w, borderTop: "1px solid " + E.g2 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.2rem,3.5vw,1.6rem)", fontWeight: 800, color: E.navy, marginBottom: 24, textAlign: "center" }}>
            Frequently asked questions
          </h2>
          {faq.map(function (f, i) {
            return (
              <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < faq.length - 1 ? "1px solid " + E.g2 : "none" }}>
                <h3 style={{ fontSize: "0.92rem", fontWeight: 700, color: E.navy, margin: "0 0 8px" }}>{f.q}</h3>
                <p style={{ fontSize: "0.84rem", color: E.g5, lineHeight: 1.7, margin: 0 }}>{f.a}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ BACK LINK ═══ */}
      <section style={{ padding: "24px", background: E.cream, borderTop: "1px solid " + E.g2, textAlign: "center" }}>
        <Link to={"/scoretable/" + stateSlug} style={{ fontSize: "0.88rem", fontWeight: 700, color: E.gold, textDecoration: "none" }}>
          &larr; All {stateInfo.name} counties
        </Link>
      </section>

      <STCtaForm countyName={displayName} stateName={stateInfo.name} />
      <STFooter stateName={stateInfo.name} />
    </div>
  );
}
