/**
 * Phase 3 — Jurisdiction Identity Card Mockup (Rev 2)
 *
 * Pure presentation component. Accepts props, no data fetching.
 * Reusable for Food (EHD) and Fire (AHJ) pillars via `pillar` prop.
 * Mobile-first: 375x812 baseline.
 *
 * Design tokens:
 *   Navy   #1E2D4D  — card header (both pillars), text
 *   Cream  #FAF7F0  — card background
 *
 * Blocker fixes (Rev 2):
 *   B1: fire_ahj_name does not exist. Usage example updated to read
 *       from fire_jurisdiction_config JSONB. Caller is responsible for
 *       extracting agencyName before passing as prop. A future migration
 *       (fire_ahj_agency_name column) will make this symmetric with food.
 *   B2: Website URL parsing wrapped in try/catch. On malformed input,
 *       renders raw string with no href instead of crashing.
 *   B3: Fire pillarColor removed. Both pillars use navy header.
 *       Differentiated by pillarLabel text only. No invented brand colors.
 *   B4: DataSourceBadge now treats manual_phase2b and
 *       manual_jurisdiction_change_2020 as human-verified (gray check).
 *
 * Soft flag applied:
 *   Verified badge changed from gold to gray500 check + label.
 *   Gold reserved for wordmark accent letters and section dividers only.
 *
 * Handles NULL fields: renders dash inline or skips row entirely.
 * No emojis. No fake data.
 */

import React from 'react';

const COLORS = {
  navy: '#1E2D4D',
  cream: '#FAF7F0',
  gray100: '#F5F5F5',
  gray300: '#D1D5DB',
  gray500: '#6B7280',
  gray700: '#374151',
  white: '#FFFFFF',
};

// B4: Sources that count as human-verified
const HUMAN_VERIFIED_SOURCES = [
  'verified',
  'manual_phase2b',
  'manual_jurisdiction_change_2020',
];

function DataSourceBadge({ source }) {
  if (!source) return null;

  // B4 + soft flag: gray check for all verified/human-curated sources
  if (HUMAN_VERIFIED_SOURCES.includes(source)) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          color: COLORS.gray500,
          fontWeight: 500,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M10 3L4.5 8.5L2 6"
            stroke={COLORS.gray500}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Verified
      </span>
    );
  }

  if (source === 'firecrawl_pending_review') {
    return (
      <span
        style={{
          fontSize: '10px',
          color: COLORS.gray500,
          fontStyle: 'italic',
        }}
      >
        Pending verification
      </span>
    );
  }

  // 'unverified', 'jsonb_existing' — no badge
  return null;
}

// B2: Safe URL parser — returns { display, href } or { display, href: null }
function safeParseWebsite(website) {
  if (!website) return null;
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const display = new URL(url).hostname.replace('www.', '');
    return { display, href: url };
  } catch {
    // Malformed URL — show raw string, no link
    return { display: website, href: null };
  }
}

function ContactRow({ label, value, href }) {
  if (!value) return null;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '10px 0',
        borderBottom: `1px solid ${COLORS.gray100}`,
      }}
    >
      <span
        style={{
          fontSize: '12px',
          color: COLORS.gray500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600,
          minWidth: '72px',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '14px',
          color: COLORS.navy,
          textAlign: 'right',
          wordBreak: 'break-word',
          maxWidth: '220px',
        }}
      >
        {href ? (
          <a
            href={href}
            style={{ color: COLORS.navy, textDecoration: 'underline' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

export default function JurisdictionIdentityCard({
  pillar = 'food',
  agencyName,
  pocName,
  pocTitle,
  email,
  phone,
  fax,
  address,
  website,
  dataSource,
}) {
  const pillarLabel = pillar === 'food' ? 'Environmental Health' : 'Fire AHJ';

  // B3: Both pillars use navy. No invented fire-red color.
  const pillarColor = COLORS.navy;

  const hasAnyContact = pocName || email || phone || fax || address || website;

  // B2: Safe website parsing
  const websiteParsed = safeParseWebsite(website);

  return (
    <div
      style={{
        backgroundColor: COLORS.cream,
        borderRadius: '12px',
        border: `1px solid ${COLORS.gray300}`,
        overflow: 'hidden',
        maxWidth: '375px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: pillarColor,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.6)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '4px',
            }}
          >
            {pillarLabel}
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: COLORS.white,
              lineHeight: 1.3,
            }}
          >
            {agencyName || '\u2014'}
          </div>
        </div>
        <DataSourceBadge source={dataSource} />
      </div>

      {/* Contact rows */}
      <div style={{ padding: '4px 20px 16px' }}>
        {!hasAnyContact ? (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              color: COLORS.gray500,
              fontSize: '13px',
            }}
          >
            No contact information available
          </div>
        ) : (
          <>
            {pocName && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '10px 0',
                  borderBottom: `1px solid ${COLORS.gray100}`,
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    color: COLORS.gray500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                    minWidth: '72px',
                    flexShrink: 0,
                  }}
                >
                  Contact
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: COLORS.navy,
                    }}
                  >
                    {pocName}
                  </div>
                  {pocTitle && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: COLORS.gray500,
                        marginTop: '2px',
                      }}
                    >
                      {pocTitle}
                    </div>
                  )}
                </div>
              </div>
            )}

            <ContactRow label="Email" value={email} href={email ? `mailto:${email}` : undefined} />
            <ContactRow label="Phone" value={phone} href={phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : undefined} />
            <ContactRow label="Fax" value={fax} />
            <ContactRow label="Address" value={address} />
            <ContactRow
              label="Website"
              value={websiteParsed?.display}
              href={websiteParsed?.href}
            />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Usage examples (props only, no fake data):
 *
 * --- Food pillar (EHD) ---
 * <JurisdictionIdentityCard
 *   pillar="food"
 *   agencyName={jurisdiction.agency_name}
 *   pocName={jurisdiction.poc_name}
 *   pocTitle={jurisdiction.poc_title}
 *   email={jurisdiction.agency_email}
 *   phone={jurisdiction.agency_phone}
 *   fax={jurisdiction.agency_fax}
 *   address={jurisdiction.agency_address}
 *   website={jurisdiction.agency_website}
 *   dataSource={jurisdiction.contact_data_source}
 * />
 *
 * --- Fire pillar (AHJ) ---
 * B1: fire_ahj_name column does not exist. Extract from JSONB until
 * fire_ahj_agency_name column is promoted (future migration).
 *
 * <JurisdictionIdentityCard
 *   pillar="fire"
 *   agencyName={jurisdiction.fire_jurisdiction_config?.agency_name}
 *   pocName={jurisdiction.fire_ahj_poc_name}
 *   pocTitle={jurisdiction.fire_ahj_poc_title}
 *   email={jurisdiction.fire_ahj_email}
 *   phone={jurisdiction.fire_ahj_phone}
 *   fax={jurisdiction.fire_ahj_fax}
 *   address={jurisdiction.fire_ahj_address}
 *   website={jurisdiction.fire_ahj_website}
 *   dataSource={jurisdiction.fire_ahj_data_source}
 * />
 */
