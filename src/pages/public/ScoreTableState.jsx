/**
 * SCORETABLE STATE PAGE — County grid for one state
 * URL: /scoretable/:stateSlug
 *
 * Replaces ScoreTableWashington.jsx with a generic state page.
 * Queries jurisdictions by state code, shows counties + tribal in grid.
 * If stateSlug is not in STATE_MAP, attempts redirect for old CA URLs.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  E, S, ff, STATE_MAP, toSlug,
  STGlobalStyle, STHeader, STBreadcrumb, STCtaForm, STCookieBanner, STFooter,
  STIcon, STLogo, Logo, bN, dinp, StatCard, TBadge,
  GRADING_TYPE_LABELS, FIRE_AHJ_TYPE_LABELS,
} from "./scoreTableShared";

export default function ScoreTableState() {
  var { stateSlug } = useParams();
  var navigate = useNavigate();
  var stateInfo = STATE_MAP[stateSlug];

  var [rows, setRows] = useState([]);
  var [loading, setLoading] = useState(true);
  var [search, setSearch] = useState("");

  // Redirect old CA slugs: /scoretable/merced-county → /scoretable/california/merced
  useEffect(function () {
    if (!stateInfo && stateSlug) {
      var cleaned = stateSlug.replace(/-county$/, "");
      navigate("/scoretable/california/" + cleaned, { replace: true });
    }
  }, [stateSlug, stateInfo, navigate]);

  useEffect(function () {
    if (!stateInfo) return;
    document.title = stateInfo.name + " Restaurant Inspection Scores by County | ScoreTable by EvidLY";
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "How does " + stateInfo.name + " score restaurant inspections? Browse all " + stateInfo.countyCount + " counties, grading systems, fire AHJ, and enforcement details.");
  }, [stateInfo]);

  useEffect(function () {
    if (!stateInfo) return;
    supabase
      .from("jurisdictions")
      .select("slug, county, agency_name, grading_type, scoring_type, fire_ahj_name, fire_ahj_type, governmental_level, tribal_entity_name, grading_config")
      .eq("state", stateInfo.code)
      .order("county")
      .then(function (res) {
        if (res.data) setRows(res.data);
        setLoading(false);
      });
  }, [stateInfo]);

  if (!stateInfo) return null; // redirect in progress

  var counties = rows.filter(function (r) { return r.governmental_level !== "tribal"; });
  var tribal = rows.filter(function (r) { return r.governmental_level === "tribal"; });

  var filtered = counties.filter(function (c) {
    if (!search) return true;
    var s = search.toLowerCase();
    return (c.county || "").toLowerCase().includes(s) || (c.agency_name || "").toLowerCase().includes(s);
  });

  return (
    <div style={{ fontFamily: ff, color: E.g8, lineHeight: 1.6, background: E.cream, minHeight: "100vh" }}>
      <STGlobalStyle />
      <STCookieBanner />
      <STHeader navLinks={[["Counties", "#counties"], ["About", "#about"]]} />
      <STBreadcrumb items={[
        { label: "ScoreTable", to: "/scoretable" },
        { label: stateInfo.name },
      ]} />

      {/* ═══ HERO ═══ */}
      <section style={{ padding: "56px 24px 48px", background: "linear-gradient(160deg,#F5F3F0," + E.cream + ")", borderBottom: "1px solid " + E.g2, textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            <STIcon sz={32} /><STLogo s="1.1rem" />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
            <TBadge label={stateInfo.name} color={E.gold} />
            <TBadge label={stateInfo.regulatory.split("/")[0].trim()} color="#15803d" bg="#f0fdf4" />
          </div>
          <h1 style={{ fontSize: "clamp(1.8rem,5vw,2.6rem)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 14px", color: E.navy }}>
            {stateInfo.name} food safety inspection scores
          </h1>
          <p style={{ fontSize: "0.96rem", color: E.g5, maxWidth: 560, margin: "0 auto 8px", lineHeight: 1.7 }}>
            {stateInfo.name} enforces food safety under {stateInfo.regulatory}. Browse all {stateInfo.countyCount} counties below.
          </p>
          <p style={{ fontSize: "0.92rem", color: E.gold, fontStyle: "italic", margin: "0 auto 28px" }}>The score behind every table.</p>
          <a className="btn" href="#counties" style={Object.assign({}, bN, { textDecoration: "none", display: "inline-block" })}>Browse All {stateInfo.countyCount} Counties</a>
        </div>
      </section>

      {/* ═══ STAT CARDS ═══ */}
      <section style={{ padding: "44px 24px", background: E.w, borderBottom: "1px solid " + E.g2 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            <StatCard label="Counties" value={String(counties.length || stateInfo.countyCount)} />
            <StatCard label="Authority" value={stateInfo.regulatory.split("/")[0].trim()} />
            <StatCard label="Fire Code" value={stateInfo.fireCode} />
            <StatCard label="Data" value="Live JIE" />
          </div>
        </div>
      </section>

      {/* ═══ COUNTY GRID ═══ */}
      <section id="counties" style={{ padding: "64px 24px", background: E.cream }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.3rem,4vw,1.8rem)", fontWeight: 800, color: E.navy, marginBottom: 8, textAlign: "center" }}>
            All {stateInfo.name} Counties
          </h2>
          <p style={{ fontSize: "0.88rem", color: E.g5, textAlign: "center", maxWidth: 560, margin: "0 auto 24px", lineHeight: 1.7 }}>
            Select a county to see its food safety inspection methodology, fire safety AHJ, and enforcement details.
          </p>

          {/* SEARCH */}
          <div style={{ maxWidth: 400, margin: "0 auto 28px" }}>
            <input
              value={search}
              onChange={function (e) { setSearch(e.target.value); }}
              placeholder={"Search " + stateInfo.name + " counties..."}
              style={Object.assign({}, dinp, { textAlign: "center" })}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: "0.88rem", color: E.g4 }}>Loading counties...</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
              {filtered.map(function (c) {
                var slug = c.slug || toSlug(c.county);
                var gc = c.grading_config || {};
                var gradingLabel = GRADING_TYPE_LABELS[c.grading_type] || c.grading_type || "";
                return (
                  <Link key={slug} to={"/scoretable/" + stateSlug + "/" + slug} style={{ textDecoration: "none", background: E.w, borderRadius: 10, padding: "16px", border: "1px solid " + E.g2, display: "block", transition: "border-color 0.15s" }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: E.navy, marginBottom: 4 }}>{c.county} County</div>
                    <div style={{ fontSize: "0.72rem", color: E.g5, lineHeight: 1.5, marginBottom: 6 }}>{c.agency_name || ""}</div>
                    {gradingLabel && <div style={{ fontSize: "0.66rem", color: E.g4 }}>{gradingLabel}</div>}
                    {c.fire_ahj_name && <div style={{ fontSize: "0.64rem", color: E.g4, marginTop: 3 }}>{c.fire_ahj_name}</div>}
                  </Link>
                );
              })}
            </div>
          )}

          {!loading && search && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <p style={{ fontSize: "0.88rem", color: E.g5 }}>No counties match "{search}"</p>
            </div>
          )}
        </div>
      </section>

      {/* ═══ TRIBAL JURISDICTIONS ═══ */}
      {tribal.length > 0 && (
        <section style={{ padding: "64px 24px", background: E.w, borderTop: "1px solid " + E.g2 }}>
          <div style={{ maxWidth: 920, margin: "0 auto" }}>
            <h2 style={{ fontSize: "clamp(1.2rem,3.5vw,1.6rem)", fontWeight: 800, color: E.navy, marginBottom: 8, textAlign: "center" }}>
              Tribal Jurisdictions
            </h2>
            <p style={{ fontSize: "0.88rem", color: E.g5, textAlign: "center", maxWidth: 560, margin: "0 auto 24px", lineHeight: 1.7 }}>
              Sovereign tribal nations in {stateInfo.name} with independent food safety and fire enforcement.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
              {tribal.map(function (t) {
                var slug = t.slug || toSlug(t.tribal_entity_name || t.county || "tribal");
                return (
                  <Link key={slug} to={"/scoretable/" + stateSlug + "/" + slug} style={{ textDecoration: "none", background: E.cream, borderRadius: 10, padding: "16px", border: "1px solid " + E.g2, display: "block" }}>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700, color: E.navy, marginBottom: 4 }}>{t.tribal_entity_name || t.county}</div>
                    {t.fire_ahj_type && <div style={{ fontSize: "0.66rem", color: E.g4 }}>{FIRE_AHJ_TYPE_LABELS[t.fire_ahj_type] || t.fire_ahj_type}</div>}
                    <div style={{ fontSize: "0.64rem", color: E.gold, marginTop: 4, fontWeight: 600 }}>Sovereign jurisdiction</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ ABOUT ═══ */}
      <section id="about" style={{ padding: "64px 24px", background: E.cream, borderTop: "1px solid " + E.g2 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.2rem,3.5vw,1.6rem)", fontWeight: 800, color: E.navy, marginBottom: 16, textAlign: "center" }}>
            How {stateInfo.name} inspects commercial kitchens
          </h2>
          <div style={{ fontSize: "0.88rem", color: E.g5, lineHeight: 1.8 }}>
            <p style={{ marginBottom: 16 }}>
              {stateInfo.name} food safety is enforced under <strong>{stateInfo.regulatory}</strong>. Local health jurisdictions conduct inspections at the county level, each with their own grading methodology and scoring system.
            </p>
            <p style={{ marginBottom: 16 }}>
              Fire safety for commercial kitchens in {stateInfo.name} is governed by the <strong>{stateInfo.fireCode}</strong>, with enforcement coordinated through {stateInfo.stateSfm} and local fire AHJs (Authorities Having Jurisdiction).
            </p>
            <p>
              ScoreTable maps the exact methodology for every county — scoring weights, thresholds, grade posting requirements, and fire safety enforcement details. All data sourced from official state and county agencies.
            </p>
          </div>
        </div>
      </section>

      <STCtaForm stateName={stateInfo.name} />
      <STFooter stateName={stateInfo.name} />
    </div>
  );
}
