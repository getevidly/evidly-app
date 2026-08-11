import { chromium } from 'playwright';

const TOKEN = 'fdce0314-994f-4cb0-a07f-32c94eb996aa';
const URL = 'https://app.getevidly.com/gate/' + TOKEN;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ locale: 'en-US' });
  const page = await ctx.newPage();

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log('Resolved URL: ' + page.url());

  // 1. Does "See the gaps. Let's close them." appear twice?
  const headline = await page.evaluate(() => {
    let count = 0;
    document.querySelectorAll('h1,h2,h3,h4,p,div').forEach(el => {
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
      // Match the exact phrase, not as substring of a larger paragraph
      if (t === "See the gaps. Let\u2019s close them." || t === "See the gaps. Let's close them.") {
        count++;
      }
    });
    // Also check via innerHTML for rsquo variant
    const all = document.body.innerHTML;
    const matches = all.match(/See the gaps\.\s*(?:<br\s*\/?>)?\s*Let[\u2019']s close them\./g);
    return { exactElementCount: count, htmlMatches: matches ? matches.length : 0 };
  });
  console.log('\n--- "See the gaps. Let\'s close them." ---');
  console.log('  Element-level exact matches: ' + headline.exactElementCount);
  console.log('  HTML regex matches: ' + headline.htmlMatches);

  // 2. Pricing card CTA label and URL
  console.log('\n--- Pricing card CTA ---');
  const allLinks = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('a').forEach(a => {
      const text = (a.textContent || '').trim().replace(/\s+/g, ' ');
      if (text && text.length < 200) {
        results.push({ label: text, href: a.href, target: a.target || '' });
      }
    });
    return results;
  });
  const getStarted = allLinks.find(l => /get started/i.test(l.label));
  if (getStarted) {
    console.log('  Label: "' + getStarted.label + '"');
    console.log('  href: ' + getStarted.href);
  } else {
    console.log('  "Get started" NOT FOUND');
    console.log('  All links on page:');
    allLinks.forEach(l => console.log('    "' + l.label + '" -> ' + l.href));
  }

  // 3. Founder card and Calendly link
  console.log('\n--- Founder card ---');
  const bookMeeting = allLinks.find(l => /book a meeting/i.test(l.label));
  if (bookMeeting) {
    console.log('  Label: "' + bookMeeting.label + '"');
    console.log('  href: ' + bookMeeting.href);
    console.log('  Is Calendly: ' + bookMeeting.href.includes('calendly.com'));
  } else {
    console.log('  "Book a meeting" NOT FOUND');
  }

  // Also check for founder-related text
  const founderText = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('p, div, span').forEach(el => {
      const t = (el.textContent || '').trim();
      if (/meet the founder|arthur haggerty|founder.*evidly/i.test(t) && t.length < 100) {
        results.push(t);
      }
    });
    return results;
  });
  if (founderText.length > 0) {
    console.log('  Founder text found:');
    founderText.forEach(t => console.log('    "' + t + '"'));
  } else {
    console.log('  No founder text found on page');
  }

  await browser.close();
})();
