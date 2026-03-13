/**
 * EvidLY — Role Preview Design Audit
 * Run from project root: node role-preview-audit.mjs
 * Compares production RolePreview.jsx against V7 mockup spec.
 */

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

// ── CONFIG ───────────────────────────────────────────────────────────────────
const ROOT = resolve(".");
const PROD_FILE = "src/pages/admin/RolePreview.jsx";
const SIDEBAR_CONFIG = "src/config/sidebarConfig.ts";

// ── MOCKUP SPEC (source of truth from V7/V8) ─────────────────────────────────
const SPEC = {
  colors: {
    NAVY:  "#0B1628",
    GOLD:  "#C49A2B",
    BODY:  "#1A2535",
    MUTED: "#6B7F96",
    SB:    "#1E3A5F",
    PBG:   "#F5F6F8",
  },
  headerBorder: "#A08C5A",
  roles: ["owner_operator","executive","compliance_manager","facilities","chef","kitchen_manager","kitchen_staff"],
  headerActions: ["+ Log Temp","Checklist"],
  sidebarSections: ["FOOD SAFETY","FACILITY SAFETY","COMPLIANCE","INSIGHTS","TOOLS","ADMINISTRATION"],
  ownerPages: [
    "dashboard","calendar","checklists","temperatures","log-temp","haccp",
    "corrective","incidents","report-issue","fire-safety","vendor-services",
    "documents","self-inspection","training","ai-insights","alerts","analytics",
    "operations-intel","jurisdiction-intel","regulatory","insurance-score",
    "leaderboard","reporting","iot-monitoring","benchmarks","inspector-view",
    "photos","vendor-connect","self-diagnosis","locations","team","equipment",
    "vendors","roles","settings",
  ],
};

const PASS="✅", FAIL="❌", WARN="⚠️ ";
let results=[], p=0, f=0, w=0;
const check=(label,status,detail="")=>{
  results.push({icon:status==="pass"?PASS:status==="warn"?WARN:FAIL,label,detail,status});
  if(status==="pass")p++; else if(status==="fail")f++; else w++;
};

// ── READ FILES ────────────────────────────────────────────────────────────────
const prodExists = existsSync(join(ROOT, PROD_FILE));
const sidebarExists = existsSync(join(ROOT, SIDEBAR_CONFIG));

check(`File exists: ${PROD_FILE}`, prodExists ? "pass" : "fail", prodExists ? "" : `Not found at ${PROD_FILE} — run from project root`);
check(`File exists: ${SIDEBAR_CONFIG}`, sidebarExists ? "pass" : "warn", sidebarExists ? "" : "Not found — sidebar checks may be incomplete");

if (!prodExists) {
  console.log(`\n${FAIL} Cannot read ${PROD_FILE}. Run this script from your project root.\n`);
  process.exit(1);
}

const prodCode    = readFileSync(join(ROOT, PROD_FILE), "utf8");
const sidebarCode = sidebarExists ? readFileSync(join(ROOT, SIDEBAR_CONFIG), "utf8") : "";
const code        = prodCode + "\n" + sidebarCode;
const has         = (src, pat) => pat instanceof RegExp ? pat.test(src) : src.includes(pat);

// ── SECTION 2: COLOR TOKENS ───────────────────────────────────────────────────
for (const [name, hex] of Object.entries(SPEC.colors)) {
  check(`Color ${name} (${hex})`, has(code, hex) ? "pass" : "warn", has(code, hex) ? "" : `${hex} not found — may use a different token`);
}
check(`Header border ${SPEC.headerBorder}`, has(code, SPEC.headerBorder) ? "pass" : "warn", has(code, SPEC.headerBorder) ? "" : `${SPEC.headerBorder} not found — header may not match mockup`);

// ── SECTION 3: ROLES ─────────────────────────────────────────────────────────
for (const role of SPEC.roles) {
  check(`Role: ${role}`, has(code, role) ? "pass" : "fail", has(code, role) ? "" : `"${role}" not found`);
}
check("isStaff no-sidebar logic", has(code, "isStaff") ? "pass" : "warn", has(code, "isStaff") ? "" : "isStaff check not found — kitchen_staff may see sidebar");

// ── SECTION 4: PAGES ─────────────────────────────────────────────────────────
const missingPages = SPEC.ownerPages.filter(pg => !has(code, pg));
check(
  `Pages (${SPEC.ownerPages.length - missingPages.length}/${SPEC.ownerPages.length})`,
  missingPages.length === 0 ? "pass" : missingPages.length <= 3 ? "warn" : "fail",
  missingPages.length ? `Missing: ${missingPages.join(", ")}` : ""
);

// ── SECTION 5: HEADER ────────────────────────────────────────────────────────
check(`Header border: ${SPEC.headerBorder}`, has(code, SPEC.headerBorder) ? "pass" : "warn");
check("Breadcrumb (Dashboard ›)", has(code, /Dashboard.*›|breadcrumb/i) ? "pass" : "warn", has(code, /Dashboard.*›|breadcrumb/i) ? "" : "No breadcrumb pattern found");
for (const action of SPEC.headerActions) {
  check(`Header action: "${action}"`, has(code, action) ? "pass" : "warn", has(code, action) ? "" : `"${action}" not found in header`);
}

// ── SECTION 6: SIDEBAR ───────────────────────────────────────────────────────
check(`Sidebar bg: ${SPEC.colors.SB}`, has(code, SPEC.colors.SB) ? "pass" : "warn");
for (const sec of SPEC.sidebarSections) {
  check(`Sidebar section: ${sec}`, has(code, sec) ? "pass" : "warn", has(code, sec) ? "" : `"${sec}" label not found`);
}
check("Sidebar collapse toggle", has(code, /collapse|Collapse|collapsed/i) ? "pass" : "warn");
check("Active nav: gold highlight", has(code, SPEC.colors.GOLD) || has(code, SPEC.headerBorder) ? "pass" : "warn");

// ── SECTION 7: MOBILE ────────────────────────────────────────────────────────
check("BottomBar / mobile bottom nav", has(code, /BottomBar|bottom.*nav|bottomNav/i) ? "pass" : "warn");
check("kitchen_staff 4-item bottom nav", has(code, /kitchen_staff/) && has(code, /\[.*kitchen_staff.*\]|MNAV.*kitchen_staff/s) ? "pass" : "warn", "Verify kitchen_staff has exactly 4 bottom nav items");
check("Mobile hamburger menu", has(code, /☰|mMenu|hamburger/i) ? "pass" : "warn");

// ── SECTION 8: BUTTONS ───────────────────────────────────────────────────────
const allBtns   = [...code.matchAll(/<button(?:[^>]*)>/g)];
const noOnClick = allBtns.filter(m => !m[0].includes("onClick"));
check(
  `Buttons with onClick (${allBtns.length - noOnClick.length}/${allBtns.length})`,
  noOnClick.length === 0 ? "pass" : noOnClick.length <= 3 ? "warn" : "fail",
  noOnClick.length ? `${noOnClick.length} button(s) missing onClick` : ""
);
check("Modal / action sheet system", has(code, /modal|Modal|sheet|Sheet|dialog|Dialog|overlay|Overlay|setPan/i) ? "pass" : "fail", has(code, /modal|Modal|sheet|Sheet|dialog|Dialog|overlay|Overlay|setPan/i) ? "" : "No modal system found — action buttons likely inert");

// ── SECTION 9: COMPLIANCE RULES ──────────────────────────────────────────────
check("No operator-facing compliance score", !has(code, /complianceScore\s*[=:]\s*\d|overallScore/) ? "pass" : "fail", "ZERO SCORE rule — jurisdiction is only scoring authority");
check("CIC score not visible to operators", !has(code, /CIC.*score.*<|<.*CIC.*score/i) ? "pass" : "fail", "CIC scores are carrier-facing only");
check("No seeded/hardcoded fake data", !has(code, /seedData|fakeTenants|mockData\s*=\s*\[/) ? "pass" : "warn", "Verify any mock data is demo-mode-only");
check("guardOperation() present", has(code, "guardOperation") ? "pass" : "warn", has(code, "guardOperation") ? "" : "Write-protection guard not found");
check("isDemoMode present", has(code, "isDemoMode") ? "pass" : "warn");

// ── SECTION 10: ROUTING ──────────────────────────────────────────────────────
check("No window.open", !has(code, "window.open") ? "pass" : "fail", has(code, "window.open") ? "window.open found — must use react-router only" : "");
check("React-router navigation", has(code, /useNavigate|navigate\(|<Link/) ? "pass" : "warn", has(code, /useNavigate|navigate\(|<Link/) ? "" : "No react-router pattern found");
check("No target='_blank'", !has(code, "target=\"_blank\"") ? "pass" : "warn", has(code, "target=\"_blank\"") ? "Found target=_blank — all nav must stay in-app" : "");

// ── SECTION 11: BRANDING ─────────────────────────────────────────────────────
check("EvidLY logo markup", has(code, /EvidLY|Evid.*LY/i) ? "pass" : "warn");
check("system-ui font stack", has(code, "system-ui") ? "pass" : "warn");

// ── SECTION 12: TAILWIND vs INLINE ───────────────────────────────────────────
const inlineCount = (code.match(/style=\{\{/g) || []).length;
const cnCount     = (code.match(/className=/g) || []).length;
check(
  `Style approach: ${inlineCount} inline / ${cnCount} className`,
  inlineCount <= cnCount ? "pass" : "warn",
  inlineCount > cnCount ? "More inline styles than Tailwind classes — production should prefer Tailwind" : ""
);

// ── SUMMARY ──────────────────────────────────────────────────────────────────
const SEP = "─".repeat(72);
console.log(`\n${"═".repeat(72)}`);
console.log("EVIDLY — ROLE PREVIEW DESIGN AUDIT");
console.log(`Target: ${PROD_FILE}`);
console.log("═".repeat(72));

const sections = [
  ["FILES",            results.filter(r => r.label.startsWith("File exists"))],
  ["COLOR TOKENS",     results.filter(r => r.label.startsWith("Color") || r.label.startsWith("Header border"))],
  ["ROLES",            results.filter(r => r.label.startsWith("Role:") || r.label.includes("no-sidebar"))],
  ["PAGES",            results.filter(r => r.label.startsWith("Pages"))],
  ["HEADER",           results.filter(r => r.label.startsWith("Header action") || r.label.startsWith("Breadcrumb"))],
  ["SIDEBAR",          results.filter(r => r.label.startsWith("Sidebar") || r.label.startsWith("Active nav"))],
  ["MOBILE",           results.filter(r => r.label.startsWith("BottomBar") || r.label.startsWith("Mobile") || r.label.includes("4-item"))],
  ["BUTTONS",          results.filter(r => r.label.startsWith("Button") || r.label.startsWith("Modal"))],
  ["COMPLIANCE RULES", results.filter(r => ["No operator","CIC score","No seeded","guardOp","isDemoMode"].some(k => r.label.toLowerCase().includes(k.toLowerCase())))],
  ["ROUTING",          results.filter(r => r.label.startsWith("No window") || r.label.startsWith("React-router") || r.label.startsWith("No target"))],
  ["BRANDING/FONT",    results.filter(r => r.label.startsWith("EvidLY") || r.label.startsWith("system-ui"))],
  ["STYLING",          results.filter(r => r.label.startsWith("Style approach"))],
];

for (const [title, items] of sections) {
  if (!items.length) continue;
  const sp = items.filter(r => r.status === "pass").length;
  const sf = items.filter(r => r.status === "fail").length;
  const sw = items.filter(r => r.status === "warn").length;
  console.log(`\n▸ ${title}  (${sp}✅  ${sw}⚠️   ${sf}❌)`);
  for (const r of items) {
    const d = r.detail ? `\n       → ${r.detail}` : "";
    console.log(`  ${r.icon}  ${r.label}${d}`);
  }
}

console.log(`\n${SEP}`);
console.log(`TOTALS:  ✅ PASS: ${p}   ⚠️  WARN: ${w}   ❌ FAIL: ${f}   TOTAL: ${results.length}`);
console.log(`Score: ${Math.round(p / results.length * 100)}% alignment with mockup spec`);
console.log(SEP);

const fails = results.filter(r => r.status === "fail");
if (fails.length) {
  console.log("\n🚨 CRITICAL — MUST FIX BEFORE DEPLOY:");
  fails.forEach(r => {
    console.log(`   ${FAIL}  ${r.label}`);
    if (r.detail) console.log(`        ${r.detail}`);
  });
}

const warns = results.filter(r => r.status === "warn");
if (warns.length) {
  console.log("\n⚠️  WARNINGS — REVIEW BEFORE LAUNCH:");
  warns.forEach(r => {
    console.log(`   ${WARN}  ${r.label}`);
    if (r.detail) console.log(`        ${r.detail}`);
  });
}

console.log();
