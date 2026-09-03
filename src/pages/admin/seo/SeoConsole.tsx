import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from '../../../lib/supabase';

// ---------- Palette ----------
const C = {
  paper: "#F7F6F3",
  panel: "#FFFFFF",
  ink: "#21242B",
  navy: "#1E2D4D",
  navySoft: "#41505F",
  ember: "#B24A2E",
  green: "#2E6B4F",
  line: "#DFDCD4",
  dim: "#8B8A84",
  wash: "#EFEDE7",
};

const FONT = `"Avenir Next", "Segoe UI", -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif`;

// The plan begins the week of Monday, September 7, 2026.
const PLAN_START = "2026-09-07";

// ---------- Brands ----------
const BRANDS = [
  { id: "stovio", name: "Stovio" },
  { id: "cpp", name: "CPP" },
  { id: "evidly", name: "EvidLY" },
  { id: "hoodops", name: "HoodOps" },
];

const BRAND_INFO: Record<string, { domain: string; money: string; events: string }> = {
  stovio: {
    domain: "getstovio.com",
    money: "the matching jurisdiction pages, the study page, and a natural ScoreTable, EvidLY, or CPP cross-link",
    events: "study starts and outbound clicks to ScoreTable, EvidLY, and CPP",
  },
  cpp: {
    domain: "cleaningprosplus.com",
    money: "the nearest city and service pages, plus the estimate page",
    events: "estimate_click, call_click, text_click, and the gate submit",
  },
  evidly: {
    domain: "getevidly.com",
    money: "/software, /policy-lens, and /pricing",
    events: "gate submits, study starts, and demo requests",
  },
  hoodops: {
    domain: "gethoodops.com",
    money: "/pricing, /features, and the matching /for page",
    events: "the waitlist and gate submits",
  },
};

// ---------- Week math ----------
function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function keyOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}
function parseKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function shiftWeek(k: string, n: number): string {
  const d = parseKey(k);
  d.setDate(d.getDate() + n * 7);
  return keyOf(d);
}
function weekLabel(k: string): string {
  const d = parseKey(k);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function rotationOf(k: string): { n: number; name: string } {
  const d = parseKey(k);
  const n = Math.min(4, Math.ceil(d.getDate() / 7));
  const names: Record<number, { n: number; name: string }> = {
    1: { n: 1, name: "Technical and indexation" },
    2: { n: 2, name: "Striking-distance sprint" },
    3: { n: 3, name: "Link push" },
    4: { n: 4, name: "Refresh and competitive" },
  };
  return names[n];
}

// ---------- Step builders ----------
function ampSteps(b: { id: string; name: string }): string[] {
  const info = BRAND_INFO[b.id];
  const steps = [
    `List every post that went live on ${info.domain} in the last 7 days.`,
    `Open search.google.com/search-console and pick the ${info.domain} property.`,
    `Paste each new post's full URL into the inspection bar at the very top, press Enter, then click "Request indexing." That gets Google to crawl it in hours instead of weeks.`,
    `Inside each new post, add 2–3 links pointing to ${info.money}. Site edits go through Claude Code — ask and the prompt comes back in the same turn.`,
    `Add one link TO the new post from an older page that already ranks. Find those ranking pages under Performance → Pages in the same GSC property.`,
  ];
  if (b.id === "cpp") {
    steps.push(
      `Repost the article to the Google Business Profile: google.com/business → Add update → one job photo, a sentence or two, and the link to the post.`
    );
  }
  return steps;
}

function gscSteps(b: { id: string; name: string }): string[] {
  const info = BRAND_INFO[b.id];
  return [
    `Open search.google.com/search-console and pick the ${info.domain} property.`,
    `Left menu → Performance. Click the date filter above the chart → Compare tab → "Last 7 days vs previous 7 days" → Apply.`,
    `Read the four totals across the top: clicks, impressions, CTR, average position. These go into Friday's scorecard.`,
    `Turn on the "Average position" checkbox above the chart so the Queries table shows position. Sort the table by Impressions.`,
    `Find one query sitting at position 4–15 — close enough to page 1 to win. Click it, then click the Pages tab: that is the page Google serves for it.`,
    `This week's job for that page: add a section that answers the query in the query's own words, link to the page from two other pages on the site, then Request indexing on it. That is the whole striking-distance play.`,
    `Left menu → Indexing → Pages. Scroll to "Why pages aren't indexed." Anything NEW since last week on a page that matters gets fixed this week — paste what it says to me and the fix prompt comes back.`,
    `Left menu → Manual actions, then Security issues. Both should read "No issues detected." Thirty seconds — almost always clean, catastrophic if not.`,
  ];
}

function ga4Steps(b: { id: string; name: string }): string[] {
  const info = BRAND_INFO[b.id];
  return [
    `Open analytics.google.com and pick the ${info.domain} property.`,
    `Reports → Acquisition → Traffic acquisition. Set the date (top right) to Last 7 days. Find the "Organic Search" row and note the Sessions number for Friday.`,
    `Reports → Engagement → Events. Confirm ${info.events} fired this week.`,
    `The diagnostic: zero events while traffic looks normal means tracking broke — fix this week. Zero traffic means visibility broke — the answer is in GSC, not here.`,
    `Reports → Engagement → Landing page, sorted by sessions. A page pulling organic visits but producing no key events needs a stronger call to action or a link to the money page.`,
  ];
}

const LINKS_HOW = [
  `Check this week's target in the Link log tab header — 3–5 normally, 6–10 in a link-push week.`,
  `Open the Playbook tab and pick targets for whichever brand has the fewest live links.`,
  `One touch = one directory profile claimed, one citation submitted, one pitch email sent, or one journalist query answered.`,
  `Log every touch the moment it goes out. Tap the status forward when they reply and again when the link is live.`,
];

const GBP_HOW = [
  `Open google.com/business, or edit the profile straight from Google Maps while signed in.`,
  `Add one update: a photo from this week's jobs — fan, duct, before/after — one or two sentences, and the link to cleaningprosplus.com.`,
  `Reply to every new review. Use the reviewer's name and one specific detail from their job.`,
  `Open Performance → Calls and note the weekly number — it goes in Friday's scorecard.`,
];

const ROT_HOW: Record<string, string[]> = {
  "rot1-sitemaps": [
    `For each of the four properties in GSC: left menu → Indexing → Sitemaps.`,
    `Check Status reads "Success" and "Discovered pages" is roughly the expected count — Stovio ~81, EvidLY ~110, CPP ~92, HoodOps ~39.`,
    `A failure or a big drop means pages fell out of the sitemap or the build broke — tell me which property and what it shows, and the diagnostic prompt comes back.`,
  ],
  "rot1-coverage": [
    `For each property: Indexing → Pages.`,
    `Look at the "Why pages aren't indexed" table. You are looking for anything NEW since last month — a reason that wasn't there, or a count that jumped.`,
    `"Crawled — currently not indexed" on real pages, redirect errors, or 404s on pages that should exist all get a fix this week.`,
  ],
  "rot1-cwv": [
    `For each property: left menu → Experience → Core Web Vitals.`,
    `Both Mobile and Desktop should show URLs in "Good." New "Poor" URLs mean the site got slow — tell me which pages and the fix prompt follows.`,
  ],
  "rot1-llms": [
    `Open each site's llms.txt in the browser: getstovio.com/llms.txt, cleaningprosplus.com/llms.txt, getevidly.com/llms.txt, gethoodops.com/llms.txt.`,
    `Skim for anything no longer true — old numbers, dead pages, sections that changed. This file is what AI assistants read about the sites.`,
    `Anything stale: tell me the line and the fix prompt comes back.`,
  ],
  "rot2-pick": [
    `Same play as the weekly GSC striking-distance step, three times per brand instead of once.`,
    `GSC → Performance → Queries sorted by Impressions, position column on. Pick three queries per brand at position 4–15.`,
    `For each: strengthen the page that ranks for it — a section in the query's words, two internal links pointing at it, Request indexing.`,
  ],
  "rot3-double": [
    `This week the outreach batch doubles: 6–10 touches instead of 3–5. Same motion, same Link log.`,
  ],
  "rot3-dirs": [
    `Work down the unclaimed items in the Listings tab — every one has its own steps.`,
    `Each profile claimed or citation submitted is one logged touch.`,
  ],
  "rot3-expert": [
    `Open qwoted.com and featured.com. Create the free source profile once as Arthur Haggerty — IKECA CECS, retained NFPA 96 expert witness, 25+ years enterprise consulting.`,
    `Search open journalist requests for: kitchen fire, NFPA 96, hood cleaning, restaurant inspection, fire code.`,
    `Answer 2–3 with three to four sentences of specific expertise plus the credentials line. When a quote runs, it usually carries a link — log it and mark it Live when published.`,
  ],
  "rot4-refresh": [
    `Per brand: GSC → Performance → Pages, date set to Last 3 months. Pick one post older than ~90 days that still gets impressions.`,
    `Improve the answer — tighter intro, updated facts, a section for what people actually ask — update the visible date, then Request indexing.`,
    `Site edits go through Claude Code; say which post and the prompt comes back.`,
  ],
  "rot4-serp": [
    `In an incognito window, search each brand's head terms (they're in the Playbook tab).`,
    `Note who sits above each brand and what their page has that ours doesn't — a calculator, a bigger guide, more reviews, a video.`,
    `That gap list feeds next month's striking-distance and refresh weeks.`,
  ],
  "rot4-nap": [
    `Open CPP's listings side by side: GBP, Yelp, BBB, Angi, Apple Maps, Bing Places.`,
    `Confirm the business name, office address, and office phone are character-for-character identical everywhere. Mismatched listings quietly kill map-pack rankings.`,
    `Fix any mismatch on the listing itself, not the site.`,
  ],
};

// ---------- Weekly checklist definition ----------
interface CheckItem { id: string; label: string; how: string[] }
interface CheckGroup { id: string; title: string; hint: string; items: CheckItem[] }

function buildGroups(rotN: { n: number; name: string }): CheckGroup[] {
  const groups: CheckGroup[] = [
    {
      id: "amp",
      title: "Content amplification",
      hint: "Get last week's posts indexed and linked. The posting is already running — this makes each post count.",
      items: BRANDS.map((b) => ({ id: `amp-${b.id}`, label: `${b.name} — index and link last week's posts`, how: ampSteps(b) })),
    },
    {
      id: "gsc",
      title: "GSC sweep",
      hint: "Ten minutes per brand in Google Search Console: the numbers, one winnable query, and any indexing problems.",
      items: BRANDS.map((b) => ({ id: `gsc-${b.id}`, label: `${b.name} — performance, striking-distance pick, indexing check`, how: gscSteps(b) })),
    },
    {
      id: "ga4",
      title: "GA4 pulse",
      hint: "Five minutes per brand in Google Analytics: is traffic normal, and did the money events fire.",
      items: BRANDS.map((b) => ({ id: `ga4-${b.id}`, label: `${b.name} — sessions, key events, top landers`, how: ga4Steps(b) })),
    },
    {
      id: "links",
      title: "Backlink batch",
      hint: "The week's outreach touches, logged in the Link log tab.",
      items: [{ id: "links-batch", label: "This week's outreach touches sent and logged", how: LINKS_HOW }],
    },
    {
      id: "gbp",
      title: "Google Business Profile — CPP",
      hint: "The map pack decides the phone. One post, every review answered, calls noted.",
      items: [{ id: "gbp-cpp", label: "CPP — GBP post, reviews answered, calls trend noted", how: GBP_HOW }],
    },
  ];

  const rot: Record<number, CheckItem[]> = {
    1: [
      { id: "rot1-sitemaps", label: "Sitemap counts vs expected — Stovio ~81 · EvidLY ~110 · CPP ~92 · HoodOps ~39", how: ROT_HOW["rot1-sitemaps"] },
      { id: "rot1-coverage", label: "Coverage report sweep, all four properties", how: ROT_HOW["rot1-coverage"] },
      { id: "rot1-cwv", label: "Core Web Vitals check in GSC", how: ROT_HOW["rot1-cwv"] },
      { id: "rot1-llms", label: "llms.txt still accurate on all four sites", how: ROT_HOW["rot1-llms"] },
    ],
    2: [
      { id: "rot2-stovio", label: "Stovio — 3 striking-distance pages strengthened", how: ROT_HOW["rot2-pick"] },
      { id: "rot2-cpp", label: "CPP — 3 striking-distance pages strengthened", how: ROT_HOW["rot2-pick"] },
      { id: "rot2-evidly", label: "EvidLY — 3 striking-distance pages strengthened", how: ROT_HOW["rot2-pick"] },
      { id: "rot2-hoodops", label: "HoodOps — 3 striking-distance pages strengthened", how: ROT_HOW["rot2-pick"] },
    ],
    3: [
      { id: "rot3-double", label: "Outreach batch doubled (6–10 touches)", how: ROT_HOW["rot3-double"] },
      { id: "rot3-dirs", label: "Directory and citation submissions", how: ROT_HOW["rot3-dirs"] },
      { id: "rot3-expert", label: "Expert-source day — 2–3 journalist queries answered", how: ROT_HOW["rot3-expert"] },
    ],
    4: [
      { id: "rot4-refresh", label: "One older post refreshed per brand", how: ROT_HOW["rot4-refresh"] },
      { id: "rot4-serp", label: "Head-term SERP check — who holds page 1 and what changed", how: ROT_HOW["rot4-serp"] },
      { id: "rot4-nap", label: "CPP citation and NAP consistency spot-check", how: ROT_HOW["rot4-nap"] },
    ],
  };

  groups.push({
    id: "rot",
    title: `Rotation — week ${rotN.n}: ${rotN.name}`,
    hint: "The variable half of the Monday block. Changes automatically with the week of the month.",
    items: rot[rotN.n],
  });

  return groups;
}

// ---------- Scorecard fields ----------
const SCORE_FIELDS = [
  { id: "clicks", label: "Organic clicks", num: true, src: "GSC → Performance, date set to Last 7 days — the Clicks total at the top." },
  { id: "impressions", label: "Impressions", num: true, src: "Same screen — the Impressions total next to Clicks." },
  { id: "positions", label: "Head-term positions", num: false, ph: "e.g. 6.2 / 11 / 19", src: "GSC → Performance → + New → Query → type one head term (Playbook tab has them) → read Average position. One number per head term, written like 6.2 / 11 / 19." },
  { id: "sessions", label: "Organic sessions", num: true, src: "GA4 → Reports → Acquisition → Traffic acquisition, Last 7 days — the Organic Search row's Sessions." },
  { id: "conversions", label: "Conversions", num: true, src: "GA4 → Reports → Engagement → Events — add up the week's counts for the brand's key events (listed in Setup)." },
  { id: "refdomains", label: "New referring domains", num: true, src: "GSC → Links (bottom of the left menu) → Top linking sites — count any site there that wasn't last week." },
];

const PLAYS = ["Directory", "Citation", "Data PR", "Expert source", "Resource page", "Guest byline", "Partner link", "Local news", "Other"];
const LINK_STATUSES = ["Sent", "Replied", "Live"];

// ---------- Playbook content ----------
const PLAYBOOK = [
  {
    brand: "Stovio",
    role: "The editorial moat that feeds all three brands",
    terms: "Fire code and NFPA 96 queries · per-jurisdiction inspection queries · statewide CA compliance queries",
    plays: [
      "Data PR — pitch study findings and jurisdiction data to restaurant and insurance trade press, one pitch per link week",
      "Expert-source responses under Arthur's byline — 2–3 per link week; expert-witness retention and CECS are the qualifier",
      "Resource-page outreach — fire-protection associations, food-safety consultants, culinary programs link the 62-jurisdiction guide",
      "AI-search spot check monthly — ask the major assistants three jurisdiction questions, note whether Stovio is cited",
    ],
    measure: "Jurisdiction-page impressions · cross-brand outbound clicks to ScoreTable, EvidLY, and CPP",
  },
  {
    brand: "CPP",
    role: "Local domination — the revenue site",
    terms: '"Hood cleaning [city]" · "kitchen exhaust cleaning [city]" · "NFPA 96 hood cleaning" across Central Valley, Bay Area, NorCal',
    plays: [
      "Tier-1 citations verified on the office NAP — GBP, Yelp, BBB, Angi, Nextdoor, Apple Maps, Bing Places",
      "Chambers in served metros — Merced first, then Fresno, Modesto, Stockton",
      "IKECA member directory listing live and linked (member #76716495) · CRA vendor directory",
      "One local-news pitch per month — Fire Prevention Week (Oct 4–10) is the October hook",
      "Partner links — insurance brokers, equipment dealers, property managers",
    ],
    measure: "GBP calls · estimate/call/text clicks · gate submits. The success condition is the phone ringing.",
  },
  {
    brand: "EvidLY",
    role: "Own the category",
    terms: '"Commercial kitchen risk management" (own page 1 outright) · "commercial kitchen compliance software" · "restaurant compliance records"',
    plays: [
      "SaaS directories — G2, Capterra, GetApp, Software Advice, one claimed per link week, category name in every listing",
      "Trusted Partner Alliance — every listed partner links their EvidLY profile; the linked badge is part of onboarding",
      "Golden Table Awards — quarterly winner badges link back, plus a local-press announcement per winner",
      "Guest bylines in insurance trade press through the IIABCal lane",
    ],
    measure: "Category-term positions · gate submits · demo and meeting requests",
  },
  {
    brand: "HoodOps",
    role: "Win the software SERP",
    terms: '"Hood cleaning software" · "kitchen exhaust cleaning software" · "hood cleaning business software"',
    plays: [
      "The same four SaaS directories, listed under field-service and compliance categories",
      "Comparison-roundup pitches — get HoodOps into best-software-for-hood-cleaners lists; the vs pages already exist",
      "Trade press — Cleaner Times and pressure-washing publications (hood cleaning as the add-on service line)",
      "Facebook trade groups build branded-search volume through September; the Oct 1 channel start pours fuel on it",
    ],
    measure: "Waitlist and gate submits · positions on the three head terms · branded-search impressions",
  },
];

interface SetupItem { id: string; label: string; how: string[] }
const SETUP_ITEMS: SetupItem[] = [
  {
    id: "s-gsc",
    label: "GSC — all four verified as domain properties, sitemaps submitted (EvidLY resubmit first)",
    how: [
      `Open search.google.com/search-console. The property switcher (top left) should show all four domains. Missing one: Add property → Domain → enter the bare domain → copy the TXT record it gives you → add that record at the domain's DNS host → back in GSC, click Verify.`,
      `For each property: Indexing → Sitemaps → enter sitemap.xml → Submit. Status should turn to "Success."`,
      `EvidLY first: its sitemap changed, so resubmit it even though it was submitted before — same Submit button, same URL.`,
    ],
  },
  {
    id: "s-link",
    label: "GSC linked to GA4 on all four properties",
    how: [
      `Open analytics.google.com → Admin (bottom left gear) → under Product links, click Search Console links → Link.`,
      `Choose the matching Search Console property and the web data stream → Submit. Repeat per brand.`,
      `This puts Search Console reports inside GA4 so queries and conversions sit in one place.`,
    ],
  },
  {
    id: "s-ga4",
    label: "GA4 confirmed live on all four sites",
    how: [
      `CPP is confirmed (G-BW4VZSHE11). For the other three: open analytics.google.com → property switcher — is there a property for the domain at all?`,
      `Quick live test: open GA4 → Reports → Realtime, then browse the site in another tab. Your visit should appear within seconds.`,
      `A site with no GA4 property or no realtime activity needs the tag installed — tell me which site and the install prompt comes back.`,
    ],
  },
  {
    id: "s-events",
    label: "Key Events marked per brand",
    how: [
      `GA4 → Admin → Events (under Data display). Every event the site fires is listed with a "Mark as key event" toggle.`,
      `Turn the toggle on for the money actions: CPP — estimate_click, call_click, text_click, gate submit · EvidLY — gate submit, study start, demo request · HoodOps — waitlist/gate submit · Stovio — study start and outbound clicks to the three brands.`,
      `If a money action has no event in the list at all, the site isn't sending it — tell me which one and the tracking prompt comes back.`,
    ],
  },
  {
    id: "s-alerts",
    label: "Alerts on — GSC coverage emails, GA4 anomaly insights",
    how: [
      `GSC emails coverage problems automatically to every user on the property — just confirm your email is a user: Settings → Users and permissions.`,
      `GA4 surfaces anomalies on its own: the Insights cards on the Reports snapshot flag unusual drops. Glance at them during the weekly pulse — nothing to configure.`,
    ],
  },
  {
    id: "s-regex",
    label: "Head-term filters bookmarked per brand",
    how: [
      `GSC → Performance → + New (above the chart) → Query → type the brand's first head term → Apply.`,
      `The page URL now carries the filter. Bookmark it, named like "GSC — CPP hood cleaning." One bookmark per head term.`,
      `Friday's positions pull becomes one click per term instead of retyping filters.`,
    ],
  },
  {
    id: "s-baseline",
    label: "First Friday scorecard entered as the baseline week",
    how: [
      `This Friday, open the Scorecard tab and fill all four brands using the "Where each number comes from" guide there.`,
      `That row is week zero. Every arrow and off-target flag after this measures against real history.`,
    ],
  },
];

interface ListingItem { id: string; brand: string; name: string; play: string; how: string[] }
interface ListingGroup { group: string; hint: string; items: ListingItem[] }
const LISTINGS: ListingGroup[] = [
  {
    group: "EvidLY — software directories",
    hint: "Category everywhere: compliance and risk management software. Every description leads with Commercial Kitchen Risk Management and links getevidly.com.",
    items: [
      {
        id: "l-ev-g2",
        brand: "evidly",
        name: "G2 profile — EvidLY",
        play: "Directory",
        how: [
          "Go to g2.com and search EvidLY. If no profile exists, go to sell.g2.com and create the free vendor profile.",
          "Category: compliance or risk management software. The description leads with Commercial Kitchen Risk Management and links getevidly.com.",
          "When the profile is approved and public, check this off — it logs as a live directory link automatically.",
        ],
      },
      {
        id: "l-ev-gdm",
        brand: "evidly",
        name: "Capterra + GetApp + Software Advice — EvidLY (one signup)",
        play: "Directory",
        how: [
          "These three run on one system, Gartner Digital Markets — one vendor account publishes to all three sites.",
          "Go to capterra.com, find the vendor sign-up link in the footer, and create the free vendor account.",
          "Build one product profile: same category and description as G2, linked to getevidly.com.",
          "When the listing shows live on Capterra, check this off.",
        ],
      },
    ],
  },
  {
    group: "HoodOps — software directories",
    hint: "Category everywhere: field service management software. Every description says hood cleaning software plainly and links gethoodops.com.",
    items: [
      {
        id: "l-ho-g2",
        brand: "hoodops",
        name: "G2 profile — HoodOps",
        play: "Directory",
        how: [
          "Go to g2.com and search HoodOps. If no profile exists, go to sell.g2.com and create the free vendor profile.",
          "Category: field service management software. The description says hood cleaning software plainly and links gethoodops.com.",
          "When the profile is approved and public, check this off.",
        ],
      },
      {
        id: "l-ho-gdm",
        brand: "hoodops",
        name: "Capterra + GetApp + Software Advice — HoodOps (one signup)",
        play: "Directory",
        how: [
          "Same Gartner Digital Markets account as EvidLY — add HoodOps as a second product, or create its own vendor account if you want the brands separate.",
          "One product profile publishes to all three sites: field service management category, hood cleaning software description, linked to gethoodops.com.",
          "When the listing shows live on Capterra, check this off.",
        ],
      },
    ],
  },
  {
    group: "CPP — local listings and citations",
    hint: "Every listing carries the identical office name, address, and phone. Each one is a citation Google cross-checks for the map pack — mismatches quietly cost rankings.",
    items: [
      {
        id: "l-cpp-yelp",
        brand: "cpp",
        name: "Yelp business listing",
        play: "Citation",
        how: [
          "Go to biz.yelp.com → Manage my free listing → search Cleaning Pros Plus. Claim it if it exists, add it if not.",
          "Office name, address, and phone exactly as on the Google Business Profile. Add job photos and the link to cleaningprosplus.com.",
        ],
      },
      {
        id: "l-cpp-bbb",
        brand: "cpp",
        name: "BBB business profile",
        play: "Citation",
        how: [
          "Go to bbb.org → search the business → claim or create the free business profile.",
          "The free profile is the citation. Accreditation is optional and paid — skip unless wanted.",
        ],
      },
      {
        id: "l-cpp-angi",
        brand: "cpp",
        name: "Angi business listing",
        play: "Citation",
        how: [
          "Go to angi.com → join as a professional → create the free business listing with the office NAP and site link.",
          "Skip the paid leads program unless wanted — the listing itself is the point.",
        ],
      },
      {
        id: "l-cpp-nextdoor",
        brand: "cpp",
        name: "Nextdoor business page",
        play: "Citation",
        how: [
          "Go to business.nextdoor.com → Claim your business page.",
          "Set the service area to the served metros. Same office NAP as everywhere else.",
        ],
      },
      {
        id: "l-cpp-apple",
        brand: "cpp",
        name: "Apple Business Connect",
        play: "Citation",
        how: [
          "Go to businessconnect.apple.com → sign in with an Apple ID → add or claim the business.",
          "This is what Apple Maps shows — same office NAP, add the site link and photos.",
        ],
      },
      {
        id: "l-cpp-bing",
        brand: "cpp",
        name: "Bing Places",
        play: "Citation",
        how: [
          "Go to bingplaces.com → choose Import from Google Business Profile — it copies the GBP listing straight over.",
          "Fastest one on the list. Verify the office NAP came through unchanged.",
        ],
      },
      {
        id: "l-cpp-ikeca",
        brand: "cpp",
        name: "IKECA member directory",
        play: "Directory",
        how: [
          "Open the member directory at ikeca.org and confirm the Cleaning Pros Plus listing appears (member #76716495) and links cleaningprosplus.com.",
          "Missing or wrong: email IKECA member services with the correction.",
        ],
      },
      {
        id: "l-cpp-cra",
        brand: "cpp",
        name: "CRA vendor directory",
        play: "Directory",
        how: [
          "The California Restaurant Association vendor directory listing comes with vendor membership.",
          "Once membership is active, confirm the listing is live and links cleaningprosplus.com, then check this off.",
        ],
      },
    ],
  },
];

// ---------- Storage (Supabase seo_console_state: key text PK, value jsonb) ----------
async function loadKey(k: string, fallback: any): Promise<any> {
  try {
    const { data, error } = await supabase.from("seo_console_state").select("value").eq("key", k).maybeSingle();
    if (error || !data) return fallback;
    return data.value ?? fallback;
  } catch (e) {
    return fallback;
  }
}
async function saveKey(k: string, value: any): Promise<boolean> {
  const { error } = await supabase
    .from("seo_console_state")
    .upsert({ key: k, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return !error;
}

interface LinkRow { id: number; date: string; brand: string; target: string; play: string; status: string }

// ---------- Small UI atoms ----------
function Check({ on, onClick, size = 18 }: { on: boolean; onClick: () => void; size?: number }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: size, height: size, minWidth: size, borderRadius: 3,
        border: `1.5px solid ${on ? C.navy : "#B7B4AC"}`,
        background: on ? C.navy : "#FFFFFF",
        cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, marginTop: 2,
      }}
    >
      {on && (
        <svg width={size - 7} height={size - 7} viewBox="0 0 12 12" fill="none">
          <path d="M2 6.5L4.8 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function BrandTag({ name }: { name: string }) {
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, color: C.navy, border: `1px solid ${C.line}`, background: C.wash, borderRadius: 3, padding: "1px 7px" }}>
      {name}
    </span>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol style={{ margin: "8px 0 4px", padding: "10px 14px 10px 30px", background: C.paper, border: `1px solid ${C.wash}`, borderLeft: `3px solid ${C.navy}`, borderRadius: 4, fontSize: 13, lineHeight: 1.55, color: C.ink }}>
      {steps.map((s, i) => (
        <li key={i} style={{ marginBottom: i === steps.length - 1 ? 0 : 6 }}>{s}</li>
      ))}
    </ol>
  );
}

// ---------- Main ----------
export default function SeoConsole() {
  const [view, setView] = useState<string>("week");
  const [weekKey, setWeekKey] = useState<string>(() => {
    const m = keyOf(mondayOf(new Date()));
    return m < PLAN_START ? PLAN_START : m;
  });
  const [checks, setChecks] = useState<Record<string, Record<string, boolean>>>({});
  const [scores, setScores] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [setup, setSetup] = useState<Record<string, boolean>>({});
  const [listings, setListings] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [scoreBrand, setScoreBrand] = useState<string>("stovio");
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});
  const [expandAll, setExpandAll] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const realMonday = keyOf(mondayOf(new Date()));
  const thisMonday = realMonday < PLAN_START ? PLAN_START : realMonday;
  const rot = rotationOf(weekKey);
  const groups = useMemo(() => buildGroups(rot), [weekKey]);

  useEffect(() => {
    (async () => {
      const [c, s, l, st, li] = await Promise.all([
        loadKey("seo:checks", {}),
        loadKey("seo:scores", {}),
        loadKey("seo:links", []),
        loadKey("seo:setup", {}),
        loadKey("seo:listings", {}),
      ]);
      setChecks(c); setScores(s); setLinks(l); setSetup(st); setListings(li);
      setLoaded(true);
    })();
  }, []);

  function persist(key: string, value: any) {
    if (timers.current[key]) clearTimeout(timers.current[key]);
    setSaveState("saving");
    timers.current[key] = setTimeout(async () => {
      const ok = await saveKey(key, value);
      setSaveState(ok ? "saved" : "error");
      setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1500);
    }, 500);
  }

  // ----- Checklist -----
  const weekChecks = checks[weekKey] || {};
  function toggleCheck(id: string) {
    const next = { ...checks, [weekKey]: { ...weekChecks, [id]: !weekChecks[id] } };
    setChecks(next);
    persist("seo:checks", next);
  }
  function clearWeek() {
    const next = { ...checks, [weekKey]: {} };
    setChecks(next);
    persist("seo:checks", next);
  }
  const allItems = groups.flatMap((g) => g.items);
  const doneCount = allItems.filter((i) => weekChecks[i.id]).length;

  function stepsOpen(id: string) {
    return expandAll || !!openSteps[id];
  }
  function toggleSteps(id: string) {
    setOpenSteps((o) => ({ ...o, [id]: !stepsOpen(id) }));
    if (expandAll) {
      const all: Record<string, boolean> = {};
      allItems.forEach((i) => (all[i.id] = i.id !== id));
      setExpandAll(false);
      setOpenSteps(all);
    }
  }

  // ----- Scorecard -----
  const weekScores = scores[weekKey] || {};
  function setScore(brand: string, field: string, val: string) {
    const next = { ...scores, [weekKey]: { ...weekScores, [brand]: { ...(weekScores[brand] || {}), [field]: val } } };
    setScores(next);
    persist("seo:scores", next);
  }
  const scoredBrandsThisWeek = BRANDS.filter((b) => {
    const e = weekScores[b.id];
    return e && Object.values(e).some((v) => v !== "" && v != null);
  }).length;

  const offTarget = useMemo(() => {
    const out: string[] = [];
    const weekKeys = Object.keys(scores).sort();
    for (const b of BRANDS) {
      const series = weekKeys
        .map((k) => scores[k]?.[b.id])
        .filter((e) => e && (e.clicks !== "" || e.conversions !== ""))
        .slice(-3);
      if (series.length === 3) {
        const down = (f: string) => {
          const v = series.map((e) => parseFloat(e[f]));
          return v.every((n) => !isNaN(n)) && v[2] < v[1] && v[1] < v[0];
        };
        if (down("clicks") || down("conversions")) out.push(b.name);
      }
    }
    return out;
  }, [scores]);

  // ----- Links -----
  const [lf, setLf] = useState({ date: keyOf(new Date()), brand: "stovio", target: "", play: PLAYS[0] });
  function addLink() {
    if (!lf.target.trim()) return;
    const next: LinkRow[] = [{ id: Date.now(), ...lf, target: lf.target.trim(), status: "Sent" }, ...links];
    setLinks(next);
    persist("seo:links", next);
    setLf({ ...lf, target: "" });
  }
  function cycleStatus(id: number) {
    const next = links.map((l) => (l.id === id ? { ...l, status: LINK_STATUSES[(LINK_STATUSES.indexOf(l.status) + 1) % 3] } : l));
    setLinks(next);
    persist("seo:links", next);
  }
  function removeLink(id: number) {
    const next = links.filter((l) => l.id !== id);
    setLinks(next);
    persist("seo:links", next);
  }
  const weekEnd = shiftWeek(weekKey, 1);
  const weekTouches = links.filter((l) => l.date >= weekKey && l.date < weekEnd).length;
  const linkTarget = rot.n === 3 ? "6–10" : "3–5";
  const liveByBrand = BRANDS.map((b) => ({ b, n: links.filter((l) => l.brand === b.id && l.status === "Live").length }));

  // ----- Setup -----
  function toggleSetup(id: string) {
    const next = { ...setup, [id]: !setup[id] };
    setSetup(next);
    persist("seo:setup", next);
  }
  const setupDone = SETUP_ITEMS.filter((i) => setup[i.id]).length;

  // ----- Listings -----
  const ALL_LISTINGS = LISTINGS.flatMap((g) => g.items);
  const listingsDone = ALL_LISTINGS.filter((i) => listings[i.id]).length;
  function toggleListing(item: ListingItem) {
    const turningOn = !listings[item.id];
    const next = { ...listings, [item.id]: turningOn };
    setListings(next);
    persist("seo:listings", next);
    if (turningOn && !links.some((x) => x.brand === item.brand && x.target === item.name)) {
      const entry: LinkRow = { id: Date.now(), date: keyOf(new Date()), brand: item.brand, target: item.name, play: item.play, status: "Live" };
      const nl = [entry, ...links];
      setLinks(nl);
      persist("seo:links", nl);
    }
  }

  // ---------- Styles ----------
  const S: { [k: string]: any } = {
    page: { minHeight: "100vh", background: C.paper, fontFamily: FONT, color: C.ink, paddingBottom: 60 },
    shell: { maxWidth: 880, margin: "0 auto", padding: "0 18px" },
    masthead: { borderBottom: `1px solid ${C.line}`, background: C.panel },
    mastInner: { maxWidth: 880, margin: "0 auto", padding: "18px 18px 0" },
    title: { fontSize: 21, fontWeight: 700, color: C.navy, letterSpacing: "-0.01em", margin: 0 },
    sub: { fontSize: 13, color: C.navySoft, marginTop: 2 },
    tabs: { display: "flex", gap: 2, marginTop: 14, flexWrap: "wrap" },
    tab: (on: boolean) => ({
      appearance: "none", border: "none", background: "transparent", fontFamily: FONT, fontSize: 13.5,
      fontWeight: on ? 700 : 500, color: on ? C.navy : C.navySoft, padding: "8px 12px 10px", cursor: "pointer",
      borderBottom: on ? `2.5px solid ${C.navy}` : "2.5px solid transparent",
    }),
    weekBar: { display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", padding: "20px 0 6px" },
    weekNav: {
      appearance: "none", border: `1px solid ${C.line}`, background: C.panel, borderRadius: 4,
      width: 30, height: 30, fontSize: 15, color: C.navy, cursor: "pointer", fontFamily: FONT,
    },
    weekTitle: { fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" },
    rotBadge: { fontSize: 13, color: C.navySoft },
    panel: { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, padding: "14px 16px", marginTop: 12 },
    groupTitle: { fontSize: 14.5, fontWeight: 700, color: C.navy, margin: 0 },
    hint: { fontSize: 12.5, color: C.dim, margin: "3px 0 8px", lineHeight: 1.45 },
    row: { padding: "7px 0", borderTop: `1px solid ${C.wash}` },
    rowTop: { display: "flex", alignItems: "flex-start", gap: 10 },
    rowLabel: (on: boolean) => ({ fontSize: 14, lineHeight: 1.4, color: on ? C.dim : C.ink, flex: 1 }),
    stepsBtn: (open: boolean) => ({
      fontFamily: FONT, fontSize: 12, fontWeight: 600, color: open ? C.navy : C.navySoft,
      background: open ? C.wash : "transparent", border: `1px solid ${open ? C.line : "transparent"}`,
      borderRadius: 3, padding: "2px 8px", cursor: "pointer", whiteSpace: "nowrap",
    }),
    meter: { height: 4, background: C.wash, borderRadius: 2, marginTop: 10, overflow: "hidden" },
    meterFill: (pct: number) => ({ height: "100%", width: `${pct}%`, background: pct === 100 ? C.green : C.navy, transition: "width .25s" }),
    input: {
      fontFamily: FONT, fontSize: 13.5, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 4,
      padding: "7px 9px", background: "#FFFFFF", width: "100%", boxSizing: "border-box",
    },
    fieldLabel: { fontSize: 12, color: C.navySoft, fontWeight: 600, marginBottom: 4, display: "block" },
    btn: { fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: "#fff", background: C.navy, border: "none", borderRadius: 4, padding: "9px 16px", cursor: "pointer" },
    ghost: { fontFamily: FONT, fontSize: 12.5, color: C.navySoft, background: "transparent", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: 3 },
    banner: { background: "#FBEFEA", border: `1px solid ${C.ember}`, color: C.ember, borderRadius: 6, padding: "10px 14px", fontSize: 13.5, fontWeight: 600, marginTop: 12 },
    tableWrap: { overflowX: "auto", marginTop: 10 },
    th: { textAlign: "left", fontSize: 12, color: C.navySoft, fontWeight: 600, padding: "6px 10px 6px 0", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" },
    td: { fontSize: 13.5, padding: "7px 10px 7px 0", borderBottom: `1px solid ${C.wash}`, whiteSpace: "nowrap", verticalAlign: "top" },
  };

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Couldn't save — check connection and retry" : "";

  if (!loaded) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: C.navySoft, fontFamily: FONT, fontSize: 14 }}>Loading your data…</div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.masthead}>
        <div style={S.mastInner}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <div>
              <h1 style={S.title}>SEO operations</h1>
              <div style={S.sub}>Stovio · Cleaning Pros Plus · EvidLY · HoodOps</div>
            </div>
            <div style={{ fontSize: 12, color: saveState === "error" ? C.ember : C.dim, minHeight: 16 }}>{saveLabel}</div>
          </div>
          <div style={S.tabs}>
            {[
              ["week", "This week"],
              ["scorecard", "Scorecard"],
              ["links", "Link log"],
              ["listings", "Listings"],
              ["setup", "Setup"],
              ["playbook", "Playbook"],
            ].map(([id, label]) => (
              <button key={id} style={S.tab(view === id)} onClick={() => setView(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={S.shell}>
        {(view === "week" || view === "scorecard") && (
          <div style={S.weekBar}>
            <button
              style={{ ...S.weekNav, opacity: weekKey <= PLAN_START ? 0.35 : 1, cursor: weekKey <= PLAN_START ? "default" : "pointer" }}
              onClick={() => weekKey > PLAN_START && setWeekKey(shiftWeek(weekKey, -1))}
              aria-label="Previous week"
            >‹</button>
            <button style={S.weekNav} onClick={() => setWeekKey(shiftWeek(weekKey, 1))} aria-label="Next week">›</button>
            <span style={S.weekTitle}>Week of {weekLabel(weekKey)}</span>
            <span style={S.rotBadge}>Rotation week {rot.n} — {rot.name}</span>
            {weekKey === PLAN_START && (
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: C.green, borderRadius: 3, padding: "2px 8px" }}>Plan start</span>
            )}
            {weekKey !== thisMonday && (
              <button style={S.ghost} onClick={() => setWeekKey(thisMonday)}>Back to current week</button>
            )}
          </div>
        )}

        {view === "week" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 2, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13.5, color: C.navySoft }}>
                <strong style={{ color: C.ink }}>{doneCount}</strong> of {allItems.length} done
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={S.meter}><div style={S.meterFill(Math.round((doneCount / allItems.length) * 100))} /></div>
              </div>
              <button style={S.ghost} onClick={() => { setExpandAll(!expandAll); setOpenSteps({}); }}>
                {expandAll ? "Hide all steps" : "Show all steps"}
              </button>
              <button style={S.ghost} onClick={clearWeek}>Clear this week's checks</button>
            </div>

            {offTarget.length > 0 && (
              <div style={S.banner}>
                Off target: {offTarget.join(", ")} — two straight down weeks. This Monday block goes 100% to {offTarget.length === 1 ? offTarget[0] : "those brands"} until it turns.
              </div>
            )}

            {groups.map((g) => {
              const gDone = g.items.filter((i) => weekChecks[i.id]).length;
              return (
                <div key={g.id} style={S.panel}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                    <h2 style={S.groupTitle}>{g.title}</h2>
                    <span style={{ fontSize: 12, color: gDone === g.items.length ? C.green : C.dim, fontWeight: 600 }}>
                      {gDone}/{g.items.length}
                    </span>
                  </div>
                  <p style={S.hint}>{g.hint}</p>
                  {g.items.map((i) => (
                    <div key={i.id} style={S.row}>
                      <div style={S.rowTop}>
                        <Check on={!!weekChecks[i.id]} onClick={() => toggleCheck(i.id)} />
                        <span style={S.rowLabel(!!weekChecks[i.id])}>{i.label}</span>
                        <button style={S.stepsBtn(stepsOpen(i.id))} onClick={() => toggleSteps(i.id)}>
                          {stepsOpen(i.id) ? "Hide steps" : "Show steps"}
                        </button>
                      </div>
                      {stepsOpen(i.id) && <Steps steps={i.how} />}
                    </div>
                  ))}
                </div>
              );
            })}

            <div style={S.panel}>
              <h2 style={S.groupTitle}>Friday scorecard</h2>
              <p style={S.hint}>Entered from the Scorecard tab — it tells you exactly where each number comes from. {scoredBrandsThisWeek} of 4 brands entered for this week.</p>
              <div style={S.meter}><div style={S.meterFill(scoredBrandsThisWeek * 25)} /></div>
            </div>
          </>
        )}

        {view === "scorecard" && (
          <>
            {offTarget.length > 0 && (
              <div style={S.banner}>
                Off target: {offTarget.join(", ")} — two straight down weeks on clicks or conversions.
              </div>
            )}

            <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
              {BRANDS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setScoreBrand(b.id)}
                  style={{
                    fontFamily: FONT, fontSize: 13, fontWeight: scoreBrand === b.id ? 700 : 500,
                    color: scoreBrand === b.id ? "#fff" : C.navy,
                    background: scoreBrand === b.id ? C.navy : C.panel,
                    border: `1px solid ${scoreBrand === b.id ? C.navy : C.line}`,
                    borderRadius: 4, padding: "7px 14px", cursor: "pointer",
                  }}
                >
                  {b.name}
                </button>
              ))}
              <button style={{ ...S.ghost, marginLeft: "auto" }} onClick={() => setShowSources(!showSources)}>
                {showSources ? "Hide the where-to-find guide" : "Where each number comes from"}
              </button>
            </div>

            {showSources && (
              <div style={S.panel}>
                <h2 style={S.groupTitle}>Where each number comes from</h2>
                {SCORE_FIELDS.map((f) => (
                  <div key={f.id} style={{ ...S.row }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{f.label}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 2 }}>{f.src}</div>
                  </div>
                ))}
                <div style={{ ...S.row }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>GBP calls (CPP only)</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 2 }}>Google Business Profile → Performance → Calls — the week's count.</div>
                </div>
              </div>
            )}

            <div style={S.panel}>
              <h2 style={S.groupTitle}>{(BRANDS.find((b) => b.id === scoreBrand) || BRANDS[0]).name} — week of {weekLabel(weekKey)}</h2>
              <p style={S.hint}>Pulled every Friday. Tap "Where each number comes from" above the first time through.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {SCORE_FIELDS.map((f) => (
                  <div key={f.id}>
                    <label style={S.fieldLabel}>{f.label}</label>
                    <input
                      style={S.input}
                      inputMode={f.num ? "numeric" : "text"}
                      placeholder={f.ph || ""}
                      value={(weekScores[scoreBrand] || {})[f.id] || ""}
                      onChange={(e) => setScore(scoreBrand, f.id, e.target.value)}
                    />
                  </div>
                ))}
                {scoreBrand === "cpp" && (
                  <div>
                    <label style={S.fieldLabel}>GBP calls</label>
                    <input
                      style={S.input}
                      inputMode="numeric"
                      value={(weekScores.cpp || {}).gbpcalls || ""}
                      onChange={(e) => setScore("cpp", "gbpcalls", e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div style={S.panel}>
              <h2 style={S.groupTitle}>History — {(BRANDS.find((b) => b.id === scoreBrand) || BRANDS[0]).name}</h2>
              <p style={S.hint}>Most recent first. Arrows compare clicks and conversions to the prior entered week.</p>
              <div style={S.tableWrap}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={S.th}>Week of</th>
                      <th style={S.th}>Clicks</th>
                      <th style={S.th}>Impressions</th>
                      <th style={S.th}>Positions</th>
                      <th style={S.th}>Sessions</th>
                      <th style={S.th}>Conversions</th>
                      <th style={S.th}>Ref. domains</th>
                      {scoreBrand === "cpp" && <th style={S.th}>GBP calls</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const ks = Object.keys(scores)
                        .filter((k) => scores[k][scoreBrand] && Object.values(scores[k][scoreBrand]).some((v) => v))
                        .sort()
                        .reverse();
                      if (ks.length === 0)
                        return (
                          <tr>
                            <td style={{ ...S.td, color: C.dim, whiteSpace: "normal" }} colSpan={8}>No weeks entered yet. Enter the first Friday above — that row becomes the baseline.</td>
                          </tr>
                        );
                      return ks.map((k, idx) => {
                        const e = scores[k][scoreBrand] || {};
                        const prev = idx < ks.length - 1 ? scores[ks[idx + 1]][scoreBrand] || {} : null;
                        const arrow = (f: string) => {
                          if (!prev) return "";
                          const a = parseFloat(e[f]);
                          const b = parseFloat(prev[f]);
                          if (isNaN(a) || isNaN(b) || a === b) return "";
                          return a > b ? " ▲" : " ▼";
                        };
                        const col = (f: string) => {
                          if (!prev) return C.ink;
                          const a = parseFloat(e[f]);
                          const b = parseFloat(prev[f]);
                          if (isNaN(a) || isNaN(b) || a === b) return C.ink;
                          return a > b ? C.green : C.ember;
                        };
                        return (
                          <tr key={k}>
                            <td style={S.td}>{weekLabel(k)}</td>
                            <td style={{ ...S.td, color: col("clicks"), fontWeight: 600 }}>{e.clicks || "—"}{arrow("clicks")}</td>
                            <td style={S.td}>{e.impressions || "—"}</td>
                            <td style={S.td}>{e.positions || "—"}</td>
                            <td style={S.td}>{e.sessions || "—"}</td>
                            <td style={{ ...S.td, color: col("conversions"), fontWeight: 600 }}>{e.conversions || "—"}{arrow("conversions")}</td>
                            <td style={S.td}>{e.refdomains || "—"}</td>
                            {scoreBrand === "cpp" && <td style={S.td}>{e.gbpcalls || "—"}</td>}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {view === "links" && (
          <>
            <div style={{ ...S.weekBar, paddingBottom: 0 }}>
              <span style={S.weekTitle}>Link log</span>
              <span style={S.rotBadge}>
                {weekTouches} touch{weekTouches === 1 ? "" : "es"} this week · target {linkTarget}
              </span>
            </div>

            <div style={S.panel}>
              <h2 style={S.groupTitle}>Log a touch</h2>
              <p style={S.hint}>A touch is one directory profile claimed, one citation submitted, one pitch email sent, or one journalist query answered. Log it the moment it goes out — targets come from the Playbook tab.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginTop: 10 }}>
                <div>
                  <label style={S.fieldLabel}>Date</label>
                  <input type="date" style={S.input} value={lf.date} onChange={(e) => setLf({ ...lf, date: e.target.value })} />
                </div>
                <div>
                  <label style={S.fieldLabel}>Brand</label>
                  <select style={S.input} value={lf.brand} onChange={(e) => setLf({ ...lf, brand: e.target.value })}>
                    {BRANDS.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={S.fieldLabel}>Play</label>
                  <select style={S.input} value={lf.play} onChange={(e) => setLf({ ...lf, play: e.target.value })}>
                    {PLAYS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={S.fieldLabel}>Target — site, publication, or directory</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      style={S.input}
                      placeholder="e.g. Capterra listing, Merced chamber, FSR pitch"
                      value={lf.target}
                      onChange={(e) => setLf({ ...lf, target: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && addLink()}
                    />
                    <button style={S.btn} onClick={addLink}>Log touch</button>
                  </div>
                </div>
              </div>
            </div>

            <div style={S.panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                <h2 style={S.groupTitle}>All touches</h2>
                <div style={{ fontSize: 12.5, color: C.navySoft }}>
                  Live links — {liveByBrand.map(({ b, n }) => `${b.name} ${n}`).join(" · ")}
                </div>
              </div>
              <p style={S.hint}>Tap a status to advance it: Sent → Replied → Live.</p>
              {links.length === 0 ? (
                <div style={{ fontSize: 13.5, color: C.dim, padding: "8px 0" }}>No touches logged yet. Add the first one above.</div>
              ) : (
                <div style={S.tableWrap}>
                  <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Brand</th>
                        <th style={S.th}>Target</th>
                        <th style={S.th}>Play</th>
                        <th style={S.th}>Status</th>
                        <th style={S.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {links.map((l) => (
                        <tr key={l.id}>
                          <td style={S.td}>{l.date}</td>
                          <td style={S.td}><BrandTag name={(BRANDS.find((b) => b.id === l.brand) || { name: l.brand }).name} /></td>
                          <td style={{ ...S.td, whiteSpace: "normal", minWidth: 160 }}>{l.target}</td>
                          <td style={S.td}>{l.play}</td>
                          <td style={S.td}>
                            <button
                              onClick={() => cycleStatus(l.id)}
                              style={{
                                fontFamily: FONT, fontSize: 12, fontWeight: 700,
                                color: l.status === "Live" ? "#fff" : l.status === "Replied" ? C.navy : C.navySoft,
                                background: l.status === "Live" ? C.green : l.status === "Replied" ? C.wash : "#fff",
                                border: `1px solid ${l.status === "Live" ? C.green : C.line}`,
                                borderRadius: 3, padding: "3px 10px", cursor: "pointer",
                              }}
                            >
                              {l.status}
                            </button>
                          </td>
                          <td style={S.td}>
                            <button style={{ ...S.ghost, color: C.dim }} onClick={() => removeLink(l.id)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {view === "listings" && (
          <>
            <div style={{ ...S.weekBar, paddingBottom: 0 }}>
              <span style={S.weekTitle}>Listings</span>
              <span style={S.rotBadge}>{listingsDone} of {ALL_LISTINGS.length} live — checking one off logs it as a live link automatically</span>
            </div>
            <p style={{ ...S.hint, marginTop: 6 }}>
              The get-listed work, item by item. These are backlinks and citations in their own right — each is worked once during a link-push week and then it compounds. Stovio has no directory play; it earns links editorially through the Playbook.
            </p>
            {LISTINGS.map((g) => {
              const gDone = g.items.filter((i) => listings[i.id]).length;
              return (
                <div key={g.group} style={S.panel}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                    <h2 style={S.groupTitle}>{g.group}</h2>
                    <span style={{ fontSize: 12, color: gDone === g.items.length ? C.green : C.dim, fontWeight: 600 }}>
                      {gDone}/{g.items.length}
                    </span>
                  </div>
                  <p style={S.hint}>{g.hint}</p>
                  {g.items.map((i) => (
                    <div key={i.id} style={S.row}>
                      <div style={S.rowTop}>
                        <Check on={!!listings[i.id]} onClick={() => toggleListing(i)} />
                        <span style={S.rowLabel(!!listings[i.id])}>{i.name}</span>
                        <button style={S.stepsBtn(!!openSteps[i.id])} onClick={() => setOpenSteps((o) => ({ ...o, [i.id]: !o[i.id] }))}>
                          {openSteps[i.id] ? "Hide steps" : "Show steps"}
                        </button>
                      </div>
                      {openSteps[i.id] && <Steps steps={i.how} />}
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}

        {view === "setup" && (
          <>
            <div style={{ ...S.weekBar, paddingBottom: 0 }}>
              <span style={S.weekTitle}>Setup</span>
              <span style={S.rotBadge}>{setupDone} of {SETUP_ITEMS.length} done — one-time, then this tab retires</span>
            </div>
            <div style={S.panel}>
              <p style={S.hint}>GSC and GA4 get configured for maximum benefit, not just read. Work these across the next two Monday blocks — every item has its steps.</p>
              {SETUP_ITEMS.map((i) => (
                <div key={i.id} style={S.row}>
                  <div style={S.rowTop}>
                    <Check on={!!setup[i.id]} onClick={() => toggleSetup(i.id)} />
                    <span style={S.rowLabel(!!setup[i.id])}>{i.label}</span>
                    <button style={S.stepsBtn(!!openSteps[i.id])} onClick={() => setOpenSteps((o) => ({ ...o, [i.id]: !o[i.id] }))}>
                      {openSteps[i.id] ? "Hide steps" : "Show steps"}
                    </button>
                  </div>
                  {openSteps[i.id] && <Steps steps={i.how} />}
                </div>
              ))}
            </div>
          </>
        )}

        {view === "playbook" && (
          <>
            <div style={{ ...S.weekBar, paddingBottom: 0 }}>
              <span style={S.weekTitle}>Playbook</span>
              <span style={S.rotBadge}>The per-brand battle plans behind the weekly work</span>
            </div>
            {PLAYBOOK.map((p) => (
              <div key={p.brand} style={S.panel}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <h2 style={{ ...S.groupTitle, fontSize: 16 }}>{p.brand}</h2>
                  <span style={{ fontSize: 13, color: C.navySoft }}>{p.role}</span>
                </div>
                <div style={{ fontSize: 13, color: C.ink, marginTop: 8 }}>
                  <span style={{ fontWeight: 700, color: C.navy }}>Head terms. </span>{p.terms}
                </div>
                <div style={{ marginTop: 8 }}>
                  {p.plays.map((pl, i) => (
                    <div key={i} style={{ ...S.row, borderTop: i === 0 ? "none" : `1px solid ${C.wash}`, display: "flex", gap: 10 }}>
                      <span style={{ color: C.navy, fontWeight: 700, fontSize: 13, minWidth: 10 }}>—</span>
                      <span style={{ fontSize: 13.5, lineHeight: 1.45 }}>{pl}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: C.ink, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.wash}` }}>
                  <span style={{ fontWeight: 700, color: C.navy }}>Measure. </span>{p.measure}
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12.5, color: C.dim, marginTop: 14, lineHeight: 1.5 }}>
              On target means week-over-week flat or up in at least 3 of any 4 weeks. Two straight down weeks on clicks or conversions flags the brand, and the next Monday block goes entirely to it until it turns.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
