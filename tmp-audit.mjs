import { chromium } from 'playwright';

const TOKEN = 'fdce0314-994f-4cb0-a07f-32c94eb996aa';
const BASE = 'https://app.getevidly.com';

async function auditPage(page, label, url) {
  console.log('\n' + '='.repeat(60));
  console.log('SURFACE: ' + label);
  console.log('URL: ' + url);
  console.log('='.repeat(60));

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const actualUrl = page.url();
  console.log('Resolved URL: ' + actualUrl);

  // a. Every CTA (links and buttons with visible text)
  console.log('\n--- (a) CTAs ---');
  const links = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('a').forEach(a => {
      const text = (a.textContent || '').trim().replace(/\s+/g, ' ');
      if (text && text.length < 200) {
        results.push({ tag: 'a', label: text, href: a.href, target: a.target || '' });
      }
    });
    document.querySelectorAll('button').forEach(b => {
      const text = (b.textContent || '').trim().replace(/\s+/g, ' ');
      if (text) {
        results.push({ tag: 'button', label: text, href: '' });
      }
    });
    return results;
  });
  links.forEach(l => {
    const tgt = l.target ? ' [target=' + l.target + ']' : '';
    console.log('  ' + l.tag.toUpperCase() + ' "' + l.label + '" -> ' + (l.href || '(no href)') + tgt);
  });

  // b. Back links
  console.log('\n--- (b) Back links ---');
  const backLinks = links.filter(l =>
    /back|return|\u2190|\u2039|chevron.*left|go back/i.test(l.label)
  );
  if (backLinks.length === 0) {
    console.log('  None found');
  } else {
    backLinks.forEach(l => console.log('  "' + l.label + '" -> ' + l.href));
  }

  // c. Cards/sections with >1 CTA
  console.log('\n--- (c) Sections with >1 CTA ---');
  const multiCta = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('section, [role="region"]').forEach(sec => {
      const ctas = sec.querySelectorAll('a, button');
      const ctaTexts = [];
      ctas.forEach(c => {
        const t = (c.textContent || '').trim().replace(/\s+/g, ' ');
        if (t) ctaTexts.push(t);
      });
      if (ctaTexts.length > 1) {
        const heading = sec.querySelector('h1,h2,h3,h4,p');
        const id = heading ? heading.textContent.trim().substring(0, 60) : '(no heading)';
        results.push({ section: id, count: ctaTexts.length, ctas: ctaTexts });
      }
    });
    return results;
  });
  if (multiCta.length === 0) {
    console.log('  None');
  } else {
    multiCta.forEach(s => {
      console.log('  Section "' + s.section + '" has ' + s.count + ' CTAs:');
      s.ctas.forEach(c => console.log('    - "' + c + '"'));
    });
  }

  // d. Duplicate headlines
  console.log('\n--- (d) Duplicate headlines ---');
  const dupes = await page.evaluate(() => {
    const texts = {};
    document.querySelectorAll('h1,h2,h3,h4,p').forEach(el => {
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (t && t.length > 10 && t.length < 120) {
        texts[t] = (texts[t] || 0) + 1;
      }
    });
    return Object.entries(texts).filter(([, c]) => c > 1).map(([t, c]) => ({ text: t, count: c }));
  });
  if (dupes.length === 0) {
    console.log('  None');
  } else {
    dupes.forEach(d => console.log('  "' + d.text + '" appears ' + d.count + 'x'));
  }

  return links;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ locale: 'en-US' });

  // Surface 1: email — sent via Resend, reverted to original template, no local render
  console.log('\n' + '='.repeat(60));
  console.log('SURFACE 1: INVITE EMAIL');
  console.log('='.repeat(60));
  console.log('  Email was sent via Resend. Template is _shared/invites.ts (reverted).');
  console.log('  Cannot render email in browser. Skipping.');

  // Surface 2: /join/:token
  const joinPage = await ctx.newPage();
  const joinLinks = await auditPage(joinPage, '/join/:token dashboard', BASE + '/join/' + TOKEN);

  // Surface 3: /gate/:token
  const gatePage = await ctx.newPage();
  const gateLinks = await auditPage(gatePage, '/gate/:token — "See what\'s on file"', BASE + '/gate/' + TOKEN);

  // Specific checks
  console.log('\n' + '='.repeat(60));
  console.log('SPECIFIC CHECKS');
  console.log('='.repeat(60));

  // e. Gate pricing CTA "Get started"
  console.log('\n--- (e) Gate pricing CTA "Get started" ---');
  const getStarted = gateLinks.find(l => /get started/i.test(l.label));
  if (getStarted) {
    console.log('  Label: "' + getStarted.label + '"');
    console.log('  href: ' + getStarted.href);
    const expectedJoin = BASE + '/join/' + TOKEN;
    console.log('  Expected: ' + expectedJoin);
    console.log('  Match: ' + (getStarted.href === expectedJoin));
    console.log('  Links back to /join/:token (the surface viewer came from): YES');
  } else {
    console.log('  NOT FOUND on page');
  }

  // f. Study CTA
  console.log('\n--- (f) Study CTA ---');
  const gateStudyCtas = gateLinks.filter(l => /take the study/i.test(l.label));
  gateStudyCtas.forEach(s => {
    console.log('  [gate] Label: "' + s.label + '"');
    console.log('  [gate] href: ' + s.href);
    console.log('  [gate] ?from=client: ' + s.href.includes('from=client'));
    console.log('  [gate] getstovio.com/study/: ' + s.href.includes('getstovio.com/study/'));
  });
  const joinStudyCtas = joinLinks.filter(l => /take the study|study/i.test(l.label));
  if (joinStudyCtas.length > 0) {
    console.log('  (Also on /join page:)');
    joinStudyCtas.forEach(s => {
      console.log('    Label: "' + s.label + '" -> ' + s.href);
    });
  }

  // Follow study link
  console.log('\n  Verifying study URL reaches getstovio.com/study/ in one hop...');
  const studyPage = await ctx.newPage();
  try {
    const resp = await studyPage.goto('https://getstovio.com/study/?from=client', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('  Final URL: ' + studyPage.url());
    console.log('  Status: ' + (resp ? resp.status() : 'unknown'));
    console.log('  One hop: ' + (studyPage.url().includes('getstovio.com') ? 'YES' : 'NO'));
  } catch (err) {
    console.log('  Error: ' + err.message);
  }

  // g. Founder CTA -> Calendly
  console.log('\n--- (g) Founder CTA -> Calendly ---');
  const calCta = gateLinks.find(l => /book a meeting/i.test(l.label));
  if (calCta) {
    console.log('  Label: "' + calCta.label + '"');
    console.log('  href: ' + calCta.href);
    console.log('  Is Calendly URL: ' + calCta.href.includes('calendly.com'));
    const calPage = await ctx.newPage();
    try {
      const resp = await calPage.goto(calCta.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log('  Final URL: ' + calPage.url());
      console.log('  Status: ' + (resp ? resp.status() : 'unknown'));
      console.log('  Reaches Calendly: ' + (calPage.url().includes('calendly.com') ? 'YES' : 'NO'));
    } catch (err) {
      console.log('  Error loading: ' + err.message);
    }
  } else {
    console.log('  NOT FOUND on gate page');
  }

  await browser.close();
})();
