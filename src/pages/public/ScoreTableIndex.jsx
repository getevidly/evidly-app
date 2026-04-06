/**
 * SCORETABLE INDEX — All States Landing
 * URL: /scoretable
 *
 * Static render from STATE_MAP — 5 state cards in grid.
 * No DB query needed. Each card links to /scoretable/:stateSlug.
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  E, S, ff, Logo, STIcon, STLogo, STATE_MAP,
  STGlobalStyle, STHeader, STBreadcrumb, STCtaForm, STCookieBanner, STFooter,
  bN, StatCard, TBadge,
} from "./scoreTableShared";

export default function ScoreTableIndex() {
  useEffect(function () {
    document.title = "Restaurant Inspection Scores by State | ScoreTable by EvidLY";
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Compare restaurant inspection scoring systems across California, Nevada, Oregon, Washington, and Arizona. Free public resource by ScoreTable.");
  }, []);

  var states = Object.entries(STATE_MAP);

  return (
    <div style={{ fontFamily: ff, color: E.g8, lineHeight: 1.6, background: E.cream, minHeight: "100vh" }}>
      <STGlobalStyle />
      <STCookieBanner />
      <STHeader navLinks={[["States", "#states"], ["About", "#about"]]} />
      <STBreadcrumb items={[{ label: "ScoreTable" }]} />

      {/* ═══ HERO ═══ */}
      <section style={{ padding: "56px 24px 48px", background: "linear-gradient(160deg,#F5F3F0," + E.cream + ")", borderBottom: "1px solid " + E.g2, textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            <STIcon sz={32} /><STLogo s="1.1rem" />
          </div>
          <h1 style={{ fontSize: "clamp(1.8rem,5vw,2.6rem)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 14px", color: E.navy }}>
            Restaurant inspection scores by state
          </h1>
          <p style={{ fontSize: "0.96rem", color: E.g5, maxWidth: 560, margin: "0 auto 8px", lineHeight: 1.7 }}>
            Every state grades differently. ScoreTable maps the exact methodology, scoring system, and fire safety requirements for every county in 5 states.
          </p>
          <p style={{ fontSize: "0.92rem", color: E.gold, fontStyle: "italic", margin: "0 auto 28px" }}>The score behind every table.</p>
          <a className="btn" href="#states" style={Object.assign({}, bN, { textDecoration: "none", display: "inline-block" })}>Browse All 5 States</a>
        </div>
      </section>

      {/* ═══ STAT CARDS ═══ */}
      <section style={{ padding: "44px 24px", background: E.w, borderBottom: "1px solid " + E.g2 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            <StatCard label="States" value="5" />
            <StatCard label="Counties" value="165+" />
            <StatCard label="Tribal" value="16 nations" />
            <StatCard label="Data" value="Live JIE" />
          </div>
        </div>
      </section>

      {/* ═══ STATE GRID ═══ */}
      <section id="states" style={{ padding: "64px 24px", background: E.cream }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.3rem,4vw,1.8rem)", fontWeight: 800, color: E.navy, marginBottom: 8, textAlign: "center" }}>Choose a state</h2>
          <p style={{ fontSize: "0.88rem", color: E.g5, textAlign: "center", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>
            Select a state to browse its counties, grading systems, and fire safety enforcement.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
            {states.map(function (entry) {
              var slug = entry[0];
              var st = entry[1];
              return (
                <Link key={slug} to={"/scoretable/" + slug} style={{ textDecoration: "none", background: E.w, borderRadius: 14, padding: "28px 24px", border: "1px solid " + E.g2, display: "block", transition: "border-color 0.15s, box-shadow 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: "1.6rem", fontWeight: 800, color: E.navy, fontFamily: ff }}>{st.code}</span>
                    <span style={{ fontSize: "1.1rem", fontWeight: 700, color: E.navy }}>{st.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    <TBadge label={st.countyCount + " counties"} color={S.grn} />
                    <TBadge label={st.regulatory.split("/")[0].trim()} color={E.g4} />
                  </div>
                  <div style={{ fontSize: "0.78rem", color: E.g5, lineHeight: 1.6 }}>
                    <div><strong>Fire Code:</strong> {st.fireCode}</div>
                    <div><strong>State Fire Marshal:</strong> {st.stateSfm}</div>
                  </div>
                  <div style={{ marginTop: 14, fontSize: "0.82rem", fontWeight: 700, color: E.gold }}>Browse counties &rarr;</div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ ABOUT ═══ */}
      <section id="about" style={{ padding: "64px 24px", background: E.w, borderTop: "1px solid " + E.g2 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.2rem,3.5vw,1.6rem)", fontWeight: 800, color: E.navy, marginBottom: 16, textAlign: "center" }}>What is ScoreTable?</h2>
          <div style={{ fontSize: "0.88rem", color: E.g5, lineHeight: 1.8 }}>
            <p style={{ marginBottom: 16 }}>ScoreTable is a free public resource that maps exactly how each county in the United States inspects and grades commercial kitchens. Every jurisdiction has its own methodology, scoring weights, thresholds, and enforcement patterns.</p>
            <p style={{ marginBottom: 16 }}>We currently cover <strong>California, Nevada, Oregon, Washington, and Arizona</strong> — including county fire safety enforcement (AHJ), NFPA 96 cleaning frequencies, and tribal sovereignty jurisdictions.</p>
            <p>All data is sourced from official state and county health departments, fire marshal offices, and verified through EvidLY's Jurisdiction Intelligence Engine (JIE).</p>
          </div>
        </div>
      </section>

      <STCtaForm stateName="all 5 states" />
      <STFooter />
    </div>
  );
}
