/**
 * Warm outreach step 2 — the certificate email.
 *
 * Returns a COMPLETE HTML document. It is NOT passed through buildEmailHtml:
 * it carries its own header and footer, and wrapping would render both twice.
 */

export interface CertificateEmailParams {
  orgName: string;
  county: string;
  certNumber: string;
  servicedLabel: string;
  nextDueLabel: string;
  daysOut: number;
  shortHash: string;
  portalUrl: string;
  joinUrl: string;
  verifyUrl: string;
  unsubUrl: string;
  certThumbUrl?: string | null;
}

export const CERTIFICATE_EMAIL_SUBJECT =
  'Your hood cleaning certificate is on file and sealed';

const SANS =
  "'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'IBM Plex Mono',Consolas,Menlo,monospace";

function esc(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Fire 5 · Food 13 · Business 6 · Vendor 15 = 39. Every count, name and
 * citation below is fixed copy, not data: nothing is queried to build this
 * block, and the only record on file is the certificate this email is about. */
const TOTAL_RECORDS = 39;

interface RecordRow { name: string; citation: string; onFile?: boolean }

interface RecordSection {
  chip: string;
  heading: string;
  color: string;
  total: number;
  onFile: number;
  rows: RecordRow[];
  more: string;
}

const SECTIONS: RecordSection[] = [
  {
    chip: 'Fire', heading: 'Fire Safety', color: '#B24A2E', total: 5, onFile: 1,
    rows: [
      { name: 'Kitchen Exhaust Cleaning', citation: 'NFPA 96-2024 &middot; CFC 609', onFile: true },
      { name: 'Fire Suppression Service', citation: '19 CCR &sect;904(a)(2) &middot; NFPA 17A-2024' },
      { name: 'Fire Sprinkler Inspection', citation: 'NFPA 25 (2013 CA ed.) &middot; CFC 901' },
    ],
    more: 'Fire Alarm Inspection, Fire Extinguisher Inspection &middot; 2 more',
  },
  {
    chip: 'Food', heading: 'Food Safety', color: '#3E6B8A', total: 13, onFile: 0,
    rows: [
      { name: 'Health Permit', citation: '&sect;114381 &middot; &sect;114387' },
      { name: 'Food Protection Manager Certificate', citation: '&sect;113947.1(g)' },
      { name: 'Food Handler Cards', citation: '&sect;113948(g)' },
    ],
    more: 'Temperature Logs, Pest Control, Warewash &middot; 10 more',
  },
  {
    chip: 'Business', heading: 'Kitchen Business Records', color: '#D8A93A', total: 6, onFile: 0,
    rows: [
      { name: 'General Liability Insurance', citation: 'Carrier certificate' },
      { name: 'Workers&rsquo; Compensation Insurance', citation: 'Carrier certificate' },
    ],
    more: 'Business Licence, Seller&rsquo;s Permit, and 2 more',
  },
  {
    chip: 'Vendor', heading: 'Vendor Business Records', color: '#7C8EA3', total: 15, onFile: 0,
    rows: [
      { name: 'General Liability COI', citation: 'Per service company' },
      { name: 'Professional Licence', citation: 'State issued &middot; e.g. C-16' },
    ],
    more: 'Workers&rsquo; Comp COI, Business Licence, W-9 &middot; &times; 3 service companies',
  },
];

/** The three steps in the navy panel. */
const PROCESS_STEPS: { title: string; body: string }[] = [
  {
    title: 'We ask your vendors, not you',
    body: 'Your fire, food and service companies send their records straight to us.',
  },
  {
    title: 'Every record is sealed and dated',
    body: 'Filed the way your certificate is &mdash; tamper-evident, provable to anyone who asks.',
  },
  {
    title: 'You hear before something runs out',
    body: 'While it is still small and easier to manage, not after it has cost you.',
  },
];

/** One pill: the section dot, its count, and how many are on file. */
function buildChip(sec: RecordSection): string {
  const onFileStyle = sec.onFile > 0
    ? 'color:#2E7D32;font-weight:700;'
    : 'color:#9AA3AE;';
  return `<td width="50%" valign="top" style="width:50%;padding:0 6px 6px 0;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #E5E0D8;border-radius:999px;padding:6px 12px;font-family:${MONO};font-size:10.5px;line-height:16px;color:#1E2D4D;white-space:nowrap;">` +
    `<span style="color:${sec.color};">&#9679;</span> ${sec.chip} ${sec.total} &middot; <span style="${onFileStyle}">${sec.onFile} on file</span>` +
    `</td></tr></table></td>`;
}

/** One record: what it is, what requires it, and whether we hold it. */
function buildRecordRow(row: RecordRow): string {
  const border = row.onFile ? '#BFE3D0' : '#E5E0D8';
  const state = row.onFile
    ? `<span style="color:#2E7D32;font-weight:700;">&#10003; On file</span>`
    : `<span style="color:#9AA3AE;">&#9711; Required</span>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="margin-top:6px;background:#FFFFFF;border:1px solid ${border};border-radius:6px;"><tr>` +
    `<td valign="top" style="padding:10px 14px;">` +
    `<div style="font-family:${SANS};font-size:13.5px;line-height:19px;color:#1E2D4D;">${row.name}</div>` +
    `<div style="font-family:${MONO};font-size:10px;line-height:15px;color:#A7AEB8;">${row.citation}</div>` +
    `</td>` +
    `<td valign="top" align="right" style="padding:10px 14px 10px 8px;font-family:${SANS};font-size:12px;white-space:nowrap;">${state}</td>` +
    `</tr></table>`;
}

/** The dashed row that stands for everything not listed. */
function buildMoreRow(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAF7F0" style="margin-top:6px;background:#FAF7F0;border:1px dashed #DDD6C8;border-radius:6px;"><tr>` +
    `<td valign="top" style="padding:9px 14px;font-family:${SANS};font-size:13px;line-height:19px;color:#9AA3AE;">${text}</td>` +
    `<td valign="top" align="right" style="padding:9px 14px 9px 8px;font-family:${MONO};font-size:10.5px;color:#A7AEB8;white-space:nowrap;">See All &rarr;</td>` +
    `</tr></table>`;
}

/** One numbered step in the navy panel. */
function buildProcessStep(n: number, title: string, body: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:13px;"><tr>` +
    `<td width="21" valign="top" style="width:21px;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td width="21" height="21" align="center" bgcolor="#B24A2E" style="width:21px;height:21px;background:#B24A2E;border-radius:11px;font-family:${SANS};font-weight:700;font-size:11px;line-height:21px;color:#FFFFFF;text-align:center;">${n}</td>` +
    `</tr></table></td>` +
    `<td valign="top" style="padding-left:11px;">` +
    `<div style="font-family:${SANS};font-size:14px;line-height:20px;font-weight:700;color:#FFFFFF;">${title}</div>` +
    `<div style="font-family:${SANS};font-size:13px;line-height:19px;color:#C9D3E3;">${body}</div>` +
    `</td></tr></table>`;
}

/**
 * The whole records block: the count, the four chips, a teaser checklist per
 * section, and the panel explaining who actually gathers the other 38.
 *
 * Returned as a complete <tr> so the document below reads as one list of rows.
 */
function buildRecordsBlock(): string {
  const chipRows =
    `<tr>${buildChip(SECTIONS[0])}${buildChip(SECTIONS[1])}</tr>` +
    `<tr>${buildChip(SECTIONS[2])}${buildChip(SECTIONS[3])}</tr>`;

  const sectionsHtml = SECTIONS.map((sec) => {
    const header =
      `<div style="margin-top:20px;font-family:${MONO};font-size:10px;line-height:16px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#B24A2E;">` +
      `${sec.heading} &middot; ${sec.onFile} of ${sec.total} on file</div>`;
    return header + sec.rows.map(buildRecordRow).join('') + buildMoreRow(sec.more);
  }).join('');

  const steps = PROCESS_STEPS
    .map((st, i) => buildProcessStep(i + 1, st.title, st.body))
    .join('');

  return `  <tr>
    <td class="pad" bgcolor="#FAF7F0" style="background:#FAF7F0;padding:28px 32px 26px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="top" style="padding-right:14px;font-family:'Montserrat','Arial Black',Arial,sans-serif;font-weight:800;font-size:44px;line-height:46px;color:#B24A2E;">${TOTAL_RECORDS}</td>
        <td valign="top" style="font-family:${SANS};font-size:16px;line-height:22px;font-weight:700;color:#1E2D4D;">Records to keep current,<br>at all times</td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">${chipRows}</table>
      <div style="margin-top:8px;font-family:${SANS};font-size:12.5px;line-height:19px;color:#6B7F96;">That&rsquo;s one kitchen with three service companies. Six more apply only to some kitchens and are not counted in the ${TOTAL_RECORDS}.</div>
      ${sectionsHtml}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1E2D4D" style="margin-top:26px;background:#1E2D4D;border-radius:8px;"><tr>
        <td bgcolor="#1E2D4D" style="background:#1E2D4D;border-radius:8px;padding:20px 20px 22px 20px;">
          <div style="font-family:${MONO};font-size:10px;line-height:16px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#A8B4C8;">How the Other 38 Get on File</div>
          <div style="margin-top:6px;font-family:${SANS};font-size:16px;line-height:23px;font-weight:700;color:#FFFFFF;">You do not collect them. We do.</div>
          ${steps}
        </td>
      </tr></table>
    </td>
  </tr>`;
}

export function buildCertificateEmail(p: CertificateEmailParams): string {
  const orgName = esc(p.orgName);
  const county = esc(p.county);
  const certNumber = esc(p.certNumber);

  const { servicedLabel, nextDueLabel, daysOut, shortHash, portalUrl, joinUrl, verifyUrl, unsubUrl } = p;

  const recordsBlock = buildRecordsBlock();

  const thumbCell = p.certThumbUrl
    ? `<td width="120" valign="top" align="right" style="width:120px;padding-left:14px;"><a href="${portalUrl}"><img src="${p.certThumbUrl}" width="120" height="93" alt="Your sealed certificate" style="display:block;border:0;border-radius:3px;"></a></td>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${CERTIFICATE_EMAIL_SUBJECT}</title>
<style>
:root{color-scheme:light only}
@media (max-width:620px){
  .col{display:block!important;width:100%!important;padding:14px 0 0 0!important}
  .pad{padding-left:22px!important;padding-right:22px!important}
  .h1{font-size:23px!important;line-height:29px!important}
}
</style>
</head>
<body bgcolor="#FAF7F0" style="margin:0;padding:0;background:#FAF7F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAF7F0" style="background:#FAF7F0;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;" bgcolor="#FFFFFF">
  <!-- Header -->
  <tr>
    <td class="pad" bgcolor="#1E2D4D" style="background:#1E2D4D;padding:22px 32px 20px 32px;">
      <div style="font-family:'Montserrat','Arial Black',Arial,sans-serif;font-weight:800;font-size:24px;line-height:28px;">
        <span style="color:#B24A2E;">E</span><span style="color:#FFFFFF;">vid</span><span style="color:#B24A2E;">LY</span>
      </div>
      <div style="margin-top:6px;font-family:${MONO};font-size:10.5px;line-height:16px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#A8B4C8;">Commercial Kitchen Risk Management</div>
    </td>
  </tr>
  <!-- Intro -->
  <tr>
    <td class="pad" bgcolor="#FFFFFF" style="background:#FFFFFF;padding:28px 32px 0 32px;">
      <div style="font-family:${MONO};font-size:10.5px;line-height:16px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#B24A2E;">${orgName} &middot; ${county} County</div>
      <div class="h1" style="margin-top:10px;font-family:${SANS};font-size:26px;line-height:32px;font-weight:700;color:#1E2D4D;">Your hood cleaning certificate is on file and sealed.</div>
    </td>
  </tr>
  <!-- Cert card -->
  <tr>
    <td class="pad" bgcolor="#FFFFFF" style="background:#FFFFFF;padding:22px 32px 0 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1E2D4D" style="background:#1E2D4D;border-radius:8px;">
        <tr>
          <td bgcolor="#1E2D4D" style="background:#1E2D4D;border-radius:8px;padding:24px 24px 22px 24px;">
            <div style="font-family:${MONO};font-size:10.5px;line-height:16px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#5DCAA5;">&#128274;&nbsp; On file and sealed</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
              <tr>
                <td valign="top">
                  <div style="font-family:${SANS};font-size:19px;line-height:25px;font-weight:700;color:#FFFFFF;">Kitchen Exhaust Cleaning Certificate of Service</div>
                  <div style="margin-top:2px;font-family:${SANS};font-size:12.5px;line-height:18px;color:#A8B4C8;">NFPA 96 (2024) &middot; ${certNumber}</div>
                </td>
                ${thumbCell}
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;border-top:1px solid #34456A;">
              <tr>
                <td class="col" width="30%" valign="top" style="padding:16px 8px 0 0;">
                  <div style="font-family:${MONO};font-size:9.5px;line-height:14px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#8494AC;">Serviced</div>
                  <div style="margin-top:4px;font-family:${SANS};font-size:14px;line-height:20px;font-weight:600;color:#FFFFFF;">${servicedLabel}</div>
                </td>
                <td class="col" width="35%" valign="top" style="padding:16px 8px 0 0;">
                  <div style="font-family:${MONO};font-size:9.5px;line-height:14px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#8494AC;">Next Service Due</div>
                  <div style="margin-top:4px;font-family:${SANS};font-size:14px;line-height:20px;font-weight:600;color:#EF9F27;">${nextDueLabel}</div>
                </td>
                <td class="col" width="35%" valign="top" style="padding:16px 0 0 0;">
                  <div style="font-family:${MONO};font-size:9.5px;line-height:14px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#8494AC;">EvidLY Is Tracking It</div>
                  <div style="margin-top:4px;font-family:${SANS};font-size:14px;line-height:20px;font-weight:600;color:#5DCAA5;">${daysOut} days out</div>
                </td>
              </tr>
            </table>
            <div style="margin-top:16px;font-family:${MONO};font-size:11px;line-height:16px;color:#8494AC;">Tamper-evident &middot; ${shortHash} &middot; <a href="${verifyUrl}" style="color:#5DCAA5;text-decoration:underline;">Verify it yourself</a></div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
              <tr>
                <td bgcolor="#B24A2E" style="background:#B24A2E;border-radius:6px;">
                  <a href="${portalUrl}?share=1" style="display:inline-block;padding:12px 18px;font-family:${SANS};font-size:14px;line-height:18px;font-weight:700;color:#FFFFFF;text-decoration:none;">Send to a Third Party</a>
                </td>
                <td width="10" style="width:10px;font-size:0;line-height:0;">&nbsp;</td>
                <td bgcolor="#1E2D4D" style="background:#1E2D4D;border:1px solid #6F7E99;border-radius:6px;">
                  <a href="${portalUrl}" style="display:inline-block;padding:11px 18px;font-family:${SANS};font-size:14px;line-height:18px;font-weight:700;color:#FFFFFF;text-decoration:none;">Download</a>
                </td>
              </tr>
            </table>
            <div style="margin-top:14px;font-family:${SANS};font-size:12.5px;line-height:19px;color:#A8B4C8;">Send the sealed record straight to your insurer, landlord, or fire marshal &mdash; they can verify it hasn&rsquo;t been altered.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- The 39 records -->
${recordsBlock}
  <!-- Close + single CTA -->
  <tr>
    <td class="pad" bgcolor="#FFFFFF" style="background:#FFFFFF;padding:26px 32px 32px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="border-top:3px solid #B24A2E;font-size:0;line-height:0;height:0;">&nbsp;</td></tr>
      </table>
      <div style="margin-top:20px;font-family:${SANS};font-size:17px;line-height:24px;font-weight:700;color:#1E2D4D;">Having them and having them available are not the same thing.</div>
      <div style="margin-top:6px;font-family:${SANS};font-size:14px;line-height:21px;color:#6B7F96;">See what all 39 look like on the EvidLY dashboard.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
        <tr>
          <td bgcolor="#B24A2E" style="background:#B24A2E;border-radius:6px;">
            <a href="${joinUrl}" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:14px;line-height:18px;font-weight:700;color:#FFFFFF;text-decoration:none;">See the Dashboard</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- Footer -->
  <tr>
    <td class="pad" bgcolor="#FAF7F0" align="center" style="background:#FAF7F0;padding:20px 32px 24px 32px;border-top:1px solid #E5E0D8;">
      <div style="font-family:${SANS};font-size:11px;line-height:18px;color:#8A8F99;">
        Powered by EvidLY, a Cleaning Pros Plus, LLC company.<br>
        Cleaning Pros Plus, LLC &middot; 2324 M Street #2711 &middot; Merced, CA 95344<br>
        <a href="${unsubUrl}" style="color:#8A8F99;text-decoration:underline;">Unsubscribe</a>
      </div>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
