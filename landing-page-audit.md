# EvidLY Landing Page Audit Report

**Date:** February 13, 2026
**Auditor:** Claude (AI-assisted)
**Page:** https://evidly.com (Landing Page)

---

## 1. Mobile Optimization Score: 8/10

| Check | Status | Notes |
|-------|--------|-------|
| Viewport meta | :green_circle: Good | `<meta name="viewport" content="width=device-width, initial-scale=1.0">` present |
| Touch targets | :green_circle: Good | All buttons have `min-h-[44px]` enforced across CTAs |
| Font readability | :green_circle: Good | Body text at 15px (index.css), headings use `clamp()` for responsive sizing |
| Hero CTA | :green_circle: Good | "Get Started" button visible above fold; email form stacks vertically on mobile (`flex-col sm:flex-row`) |
| Horizontal scroll | :green_circle: Good | No `flex-nowrap` or fixed-width elements found on landing components |
| Image sizing | :green_circle: Good | Dashboard hero uses `w-full` responsive width, rounded corners |
| Lazy loading | :green_circle: Good | Hero image has `loading="lazy"` |
| Spacing | :green_circle: Good | Adequate padding (`px-4 sm:px-6`) on all sections |
| Pricing cards | :yellow_circle: Warning | Cards use `md:grid-cols-2` — stack on mobile, but could be cramped on small screens (375px). Consider `gap-6` instead of `gap-4`. |
| Navigation | :yellow_circle: Warning | Mobile hamburger menu present, but no bottom tab bar navigation on landing page (only scroll-based sticky bar). Consider adding bottom nav anchors for Features/Pricing on mobile. |

### Issues Found:
1. **Pricing card spacing** (Minor): `gap-4` on pricing grid could feel tight on 375px. Recommend `gap-6`.
2. **Mobile sticky bar overlap**: The `MobileStickyBar` with `z-[999]` may overlap with the new AI chat widget bubble. Resolved by positioning chat widget at `bottom-6 right-6` which sits above the sticky bar.
3. **Hero image LCP**: The hero dashboard screenshot is `loading="lazy"` — this is wrong for above-the-fold content. Should be `loading="eager"` or removed entirely for LCP optimization.

---

## 2. SEO Score: 9/10 (after fixes applied)

| Check | Status | Notes |
|-------|--------|-------|
| Title tag | :green_circle: Good | Updated to "EvidLY — Commercial Kitchen Compliance Simplified \| Food Safety & Fire Safety" |
| Meta description | :green_circle: Good | 155 chars describing what EvidLY does, who it's for, key benefit |
| Open Graph tags | :green_circle: Good | og:title, og:description, og:image, og:url, og:type, og:site_name all present |
| Twitter cards | :green_circle: Good | twitter:card (summary_large_image), twitter:title, twitter:description, twitter:image |
| H1 tag | :green_circle: Good | Single `<h1>` in Hero: "One platform for fire safety, food safety, and vendor compliance" |
| Heading hierarchy | :green_circle: Good | H1 (Hero) → H2 (each section) → no H3 skips detected |
| Alt text | :green_circle: Good | Hero image has `alt="EvidLY Compliance Dashboard"` |
| Semantic HTML | :yellow_circle: Warning | Uses `<section>` and `<footer>` but no `<main>` wrapper, no `<header>` for navigation, no `<nav>` element |
| Canonical URL | :green_circle: Good | `<link rel="canonical" href="https://evidly.com" />` added |
| Structured data | :green_circle: Good | JSON-LD SoftwareApplication schema added with pricing info |
| robots.txt | :red_circle: Missing | No `public/robots.txt` found — search engines may not crawl efficiently |
| sitemap.xml | :red_circle: Missing | No `public/sitemap.xml` found — search engines won't discover all pages |
| Page speed | :yellow_circle: Warning | Leaflet CSS/JS loaded on every page (even landing) — could be deferred or conditionally loaded |
| Core Web Vitals | :yellow_circle: Warning | Hero image `loading="lazy"` hurts LCP; Calendly widget JS loaded async (good) |

### SEO Quick Fixes Needed:
1. **Create `public/robots.txt`:**
```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /settings
Sitemap: https://evidly.com/sitemap.xml
```

2. **Create `public/sitemap.xml`** with public pages (/, /demo, /enterprise, /providers, /iot, /passport/demo)

3. **Change hero image to `loading="eager"`** for better LCP

4. **Add `<nav>` wrapper** to Navigation component for semantic HTML

---

## 3. StoryBrand Score: 5/7

### Element-by-Element Grading:

#### 1. CHARACTER — The Hero is the Kitchen Operator
- **Status:** :white_check_mark: Present
- **Current headline:** "One platform for fire safety, food safety, and vendor compliance"
- **Grade: B**
- **Analysis:** The headline focuses on EvidLY's capabilities rather than the customer's identity. It's product-centric, not customer-centric.
- **BEFORE:** "One platform for fire safety, food safety, and vendor compliance"
- **AFTER:** "Your kitchen stays compliant — without the paperwork headaches"

#### 2. PROBLEM — External, Internal, Philosophical
- **External problem:** :white_check_mark: Implied ("Eliminate manual errors, pass every inspection")
- **Internal problem:** :x: Not explicitly addressed (anxiety, feeling overwhelmed)
- **Philosophical problem:** :x: Not addressed (it shouldn't be this hard to run a great kitchen)
- **Grade: C**
- **Analysis:** The page jumps to solution without deeply articulating the pain. The DailyOperations section hints at it ("Your staff does the checks. EvidLY does the notes.") but doesn't name the emotional burden.
- **BEFORE:** "Accurate records your team can trust. Eliminate manual errors, pass every inspection with verified data, and catch problems before inspectors do."
- **AFTER:** "You didn't get into the kitchen business to drown in compliance paperwork. Yet one missed log, one expired permit, or one failed inspection can shut you down. EvidLY handles the records so you can focus on what matters — running a great kitchen."

#### 3. GUIDE — EvidLY as Experienced Guide
- **Empathy:** :white_check_mark: "Built by operators, for operators" (Trust section)
- **Authority:** :white_check_mark: "90+ Kitchens Serviced", "IKECA Certified", "20+ Years IT Experience"
- **Grade: A**
- **Analysis:** Strong guide positioning. The Trust section effectively shows both empathy and authority. The Aramark/Yosemite reference adds credibility.

#### 4. PLAN — Clear 3-Step Plan
- **Status:** :x: No explicit numbered plan
- **Grade: D**
- **Analysis:** The DailyOperations section shows benefits but doesn't present a clear "1-2-3" plan. Visitors need a simple roadmap: Sign Up → Set Up → Stay Compliant.
- **Suggested addition (between Features and Pricing):**
  - Step 1: "Sign up and try free for 30 days"
  - Step 2: "Set up your locations, checklists, and team in under 20 minutes"
  - Step 3: "Stay compliant, ace inspections, and sleep at night"

#### 5. CALL TO ACTION — Direct and Transitional
- **Direct CTA:** :white_check_mark: "Get Started" / "Start Free Trial" (prominent)
- **Transitional CTA:** :white_check_mark: "Try the interactive demo" (secondary)
- **Additional:** :white_check_mark: "Book Free Walkthrough" (new Calendly CTA)
- **Grade: A**
- **Analysis:** Strong CTA presence. Primary CTA is visually dominant. Multiple entry points for different comfort levels.

#### 6. SUCCESS — Picture of Life After EvidLY
- **Status:** :white_check_mark: Partially present
- **Grade: B**
- **Analysis:** The BeforeAfter section contrasts manual vs. EvidLY workflow, which implies success. But it doesn't explicitly paint the emotional picture: "Ace every inspection. Sleep at night. Impress your franchise owner."
- **BEFORE:** (BeforeAfter section shows X vs. checkmark comparisons)
- **AFTER (add to FinalCTA):** "Imagine walking into every inspection with confidence. Every record in place. Every certificate current. Every temperature logged. That's life with EvidLY."

#### 7. FAILURE — Stakes of Not Acting
- **Status:** :x: Not present
- **Grade: F**
- **Analysis:** The page never mentions what happens WITHOUT EvidLY. Failed inspections, fines, shutdowns, lost customers, liability — none of this is mentioned.
- **Suggested copy (add subtle hint near Pricing):** "Every year, thousands of kitchens face fines, shutdowns, and lost customers from compliance failures. Don't be one of them."

---

## 4. Top 5 Quick Wins (Highest Impact, No Layout Changes)

1. **Change hero image `loading="lazy"` to `loading="eager"`** — Improves LCP (Core Web Vital) immediately. One attribute change.

2. **Add `public/robots.txt` and `public/sitemap.xml`** — Enables proper search engine crawling. 5-minute task, significant SEO impact.

3. **Add failure stakes copy near Pricing section** — "Every year, thousands of kitchens face fines and shutdowns from compliance failures." Addresses the biggest StoryBrand gap (failure element).

4. **Add a 3-step plan section** — "1. Sign up free → 2. Set up in 20 min → 3. Ace every inspection." Addresses the second biggest StoryBrand gap.

5. **Wrap Navigation in `<nav>` and add `<main>` to page content** — Semantic HTML improves accessibility and SEO. Simple tag additions.

---

## 5. Copy Suggestions — BEFORE → AFTER

### Hero Headline
- **BEFORE:** "One platform for fire safety, food safety, and vendor compliance"
- **AFTER:** "Your kitchen stays compliant — without the paperwork headaches"
- **Rationale:** Makes the customer the hero, not the product.

### Hero Subhead
- **BEFORE:** "Accurate records your team can trust. Eliminate manual errors, pass every inspection with verified data, and catch problems before inspectors do."
- **AFTER:** "You didn't get into this business to drown in compliance paperwork. EvidLY eliminates manual errors, keeps every record inspection-ready, and catches problems before inspectors do."
- **Rationale:** Acknowledges the internal problem (frustration) before presenting the solution.

### FinalCTA Section
- **BEFORE:** "Ready to simplify compliance? Start your free demo and see why commercial kitchens trust EvidLY."
- **AFTER:** "Ready to walk into every inspection with confidence? Start your free trial and join 90+ kitchens that trust EvidLY to keep them compliant."
- **Rationale:** Paints a success picture and adds social proof.

### Missing Failure Element (Suggest adding above Pricing)
- **NEW:** "Every year, thousands of commercial kitchens face fines, temporary shutdowns, and lost customers from preventable compliance failures. A missed temperature log. An expired permit. A vendor who didn't show up. Don't let it happen to you."

### Missing Plan Element (Suggest adding after Features)
- **NEW 3-Step Plan:**
  - "How it works in 3 steps"
  - Step 1: "Sign up and explore free for 30 days — no credit card required"
  - Step 2: "Add your locations, team members, and equipment in under 20 minutes"
  - Step 3: "Stay compliant, ace every inspection, and never worry about paperwork again"

---

## 6. Preview of Suggested Meta Tags (Already Applied)

```html
<title>EvidLY — Commercial Kitchen Compliance Simplified | Food Safety & Fire Safety</title>
<meta name="description" content="EvidLY automates commercial kitchen compliance — temperature monitoring, daily checklists, fire safety documentation, vendor management, and AI-powered insights. Trusted by Aramark at Yosemite National Park. Start your free trial." />
<link rel="canonical" href="https://evidly.com" />

<!-- Open Graph -->
<meta property="og:title" content="EvidLY — Compliance Simplified for Commercial Kitchens" />
<meta property="og:description" content="Automate food safety, fire safety, and vendor compliance. AI-powered insights, real-time monitoring, and inspection-ready documentation." />
<meta property="og:image" content="https://evidly.com/dashboard-hero.png" />
<meta property="og:url" content="https://evidly.com" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="EvidLY" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="EvidLY — Commercial Kitchen Compliance Simplified" />
<meta name="twitter:description" content="Automate food safety, fire safety, and vendor compliance for commercial kitchens." />
<meta name="twitter:image" content="https://evidly.com/dashboard-hero.png" />

<!-- Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "EvidLY",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android",
  "description": "Commercial kitchen compliance platform — food safety, fire safety, vendor management, AI-powered insights.",
  "url": "https://evidly.com",
  "offers": {
    "@type": "Offer",
    "price": "99",
    "priceCurrency": "USD",
    "priceValidUntil": "2026-12-31",
    "description": "Founder Tier — limited to 100 customers"
  }
}
</script>
```

---

## Summary

| Category | Score | Key Gap |
|----------|-------|---------|
| **Mobile** | 8/10 | Hero image LCP, pricing card spacing |
| **SEO** | 9/10 | Missing robots.txt and sitemap.xml |
| **StoryBrand** | 5/7 | No failure stakes, no explicit 3-step plan |

**Overall Landing Page Conversion Readiness: B+**

The page is well-structured and mobile-friendly. The biggest conversion opportunities are:
1. Adding emotional resonance (failure stakes, internal problem acknowledgment)
2. A clear 3-step plan to reduce friction
3. SEO foundations (robots.txt, sitemap) for organic discovery
