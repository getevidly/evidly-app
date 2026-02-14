# EvidLY Analytics Setup Guide

## Overview

EvidLY uses two tracking systems:
1. **Google Analytics 4 (GA4)** — page views, user journeys, demo engagement, conversion funnel, feature usage
2. **ZoomInfo WebSights** — identifies which companies visit the landing page (B2B intent data for outbound sales)

## Setup

### GA4 Measurement ID
1. Go to https://analytics.google.com
2. Create a new GA4 property for EvidLY
3. Get the Measurement ID (format: `G-XXXXXXXXXX`)
4. Replace `G-XXXXXXXXXX` in `index.html` with the actual ID

### ZoomInfo Pixel ID
1. Log in to https://www.zoominfo.com
2. Navigate to WebSights > Setup
3. Get the pixel ID
4. Replace `ZOOMINFO_PIXEL_ID` in `index.html` with the actual ID

## Conversion Funnel

```
STAGE                           EVENT NAME              TYPE
─────────────────────────────────────────────────────────────────
1. Landing page visit           page_view (/)           Automatic
2. Demo started                 demo_start              Custom
3. Demo engagement (2+ pages)   demo_page_view          Custom
4. Chat widget opened           chat_widget_open        Custom
5. CTA clicked                  cta_click               Custom
6. Signup started               signup_start            Custom
7. Signup completed             signup_complete         CONVERSION
8. First action in app          first_action            Custom
9. Subscription created         subscription_created    CONVERSION ($)
10. Referral shared             referral_shared         Custom
11. Referral converted          referral_converted      CONVERSION
```

## GA4 Recommended Conversions

Mark these events as conversions in the GA4 dashboard:
- `signup_complete`
- `subscription_created` (with $ value)
- `referral_converted`
- `calendly_click`

## Custom Events Tracked

### Landing Page
| Event | Parameters | Description |
|-------|-----------|-------------|
| `cta_click` | `cta`, `page` | Hero CTA, pricing CTA, demo CTA clicks |
| `pricing_view` | `section` | User scrolled to pricing section |
| `chat_widget_open` | `page` | AI chat widget opened |
| `chat_widget_message` | `message_number`, `page` | Message sent in chat widget |
| `calendly_click` | `source` | Calendly booking link clicked |

### Authentication
| Event | Parameters | Description |
|-------|-----------|-------------|
| `signup_start` | `method` | Signup form submitted |
| `signup_complete` | `method` | Signup confirmed |
| `login` | `method` | User logged in |

### Demo Mode
| Event | Parameters | Description |
|-------|-----------|-------------|
| `demo_start` | — | User entered demo mode |
| `demo_page_view` | `page` | Page visited in demo |
| `demo_feature_interaction` | `feature` | Feature used in demo |

### In-App (Authenticated)
| Event | Parameters | Description |
|-------|-----------|-------------|
| `temp_reading_logged` | `source` | Temperature reading recorded |
| `checklist_completed` | `checklist_type` | Checklist marked complete |
| `document_uploaded` | `pillar` | Document uploaded |
| `incident_created` | `severity` | Incident logged |
| `ai_copilot_used` | `query_type` | AI advisor queried |

## Key Metrics to Monitor

- **Landing → Demo** conversion rate
- **Demo → Signup** conversion rate
- **Signup → Subscription** conversion rate
- Average demo duration (pages visited)
- Most-viewed demo pages (which features attract)
- AI chat widget engagement rate
- Calendly booking rate
- Referral share rate

## User Properties

After login, these properties are set for segmentation:
- `is_demo` — whether user is in demo mode
- `tier` — subscription tier (founder, standard, enterprise)

## Cookie Consent

- Cookie consent banner appears on first visit
- **Accept**: GA4 and ZoomInfo track normally
- **Decline**: GA4 disabled via consent API, ZoomInfo does not load
- Consent stored in `localStorage` as `evidly-cookie-consent`

## ZoomInfo Placement Rules

- Fires on **public pages only**: `/`, `/login`, `/signup`, `/enterprise`, `/iot`, `/providers`, `/partners/*`
- Does NOT fire inside the authenticated app
- Does NOT fire in demo mode
- Conditional loading respects cookie consent

## Development Mode

All tracking is disabled when `import.meta.env.DEV` is `true` (local development).
No events fire, no page views are tracked, no pixels load.

## Architecture

```
index.html          → GA4 gtag script, ZoomInfo pixel (with consent check)
src/utils/analytics.ts   → trackPageView, trackEvent, trackConversion, setUserProperties
src/hooks/usePageTracking.ts → React Router page view tracking hook
src/components/CookieConsent.tsx → Cookie consent banner
```
