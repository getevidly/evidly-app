/**
 * JurisdictionIdentityCard — Agency contact card for Food (EHD) and Fire (AHJ) pillars.
 *
 * Pure presentation component. Accepts props, no data fetching.
 * Mobile-first: 375x812 baseline.
 *
 * Design tokens:
 *   Navy   #1E2D4D  — card header (both pillars), text
 *   Cream  #FAF7F0  — card background
 *
 * Handles NULL fields: renders em-dash inline or skips row entirely.
 *
 * @param {object} props
 * @param {'food'|'fire'} [props.pillar='food'] — Pillar selector. Controls header label.
 * @param {string|null} [props.agencyName] — Agency display name for header.
 *   Food: jurisdiction.agency_name
 *   Fire: jurisdiction.fire_jurisdiction_config?.agency_name (B1: fire_ahj_name column does not exist)
 * @param {string|null} [props.pocName] — Point-of-contact name.
 * @param {string|null} [props.pocTitle] — Point-of-contact title.
 * @param {string|null} [props.email] — Agency email address.
 * @param {string|null} [props.phone] — Agency phone number.
 * @param {string|null} [props.fax] — Agency fax number.
 * @param {string|null} [props.address] — Agency street address.
 * @param {string|null} [props.website] — Agency website URL (with or without protocol).
 * @param {string|null} [props.dataSource] — One of: 'verified', 'manual_phase2b',
 *   'manual_jurisdiction_change_2020', 'firecrawl_pending_review', 'jsonb_existing', 'unverified'.
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

const HUMAN_VERIFIED_SOURCES = [
  'verified',
  'manual_phase2b',
  'manual_jurisdiction_change_2020',
];

function DataSourceBadge({ source }) {
  if (!source) return null;

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

  return null;
}

function safeParseWebsite(website) {
  if (!website) return null;
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const display = new URL(url).hostname.replace('www.', '');
    return { display, href: url };
  } catch {
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
  const pillarColor = COLORS.navy;

  const hasAnyContact = pocName || email || phone || fax || address || website;
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
