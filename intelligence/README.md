# EvidLY Intelligence — Separate Supabase Project

## Purpose

Standalone intelligence platform that monitors external regulatory, safety,
and industry data relevant to EvidLY clients. **Never directly connected to
the live app database.** Data flows to the main app exclusively via webhooks.

## Architecture

```
External Sources (FDA, CDC, Health Depts, NFPA, CalOSHA, Weather, News)
        │
        ▼
┌──────────────────────────────────┐
│  EvidLY Intelligence (Supabase)  │
│  - Edge Functions (crawl/parse)  │
│  - PostgreSQL (17 tables)        │
│  - pg_cron (5 schedules)         │
└──────────────┬───────────────────┘
               │ webhook POST
               ▼
┌──────────────────────────────────┐
│  EvidLY Main App (Supabase)      │
│  - intelligence-bridge-receive   │
│  - Stores relevant alerts only   │
└──────────────────────────────────┘
```

## Data Flow

1. **Crawl** — Edge functions fetch external sources on cron schedule
2. **Analyze** — Raw events are parsed, deduplicated, scored for relevance
3. **Match** — Events matched to client subscriptions (by jurisdiction, type)
4. **Digest** — Weekly intelligence digests compiled per client
5. **Bridge** — Matched insights POSTed to main app via webhook

## Key Constraints

- All live-app references stored as **text IDs**, never foreign keys
- No direct DB connections between projects
- Service-role policies only (no end-user auth in this project)
- Sources are health departments, regulatory bodies, and public data only

## Tables (17)

| Table                      | Purpose                                      |
|----------------------------|----------------------------------------------|
| intelligence_clients       | Client orgs subscribed to intelligence        |
| intelligence_sources       | External data sources (FDA, CDC, etc.)        |
| intelligence_events        | Raw events crawled from sources               |
| intelligence_insights      | Analyzed, scored insights from events         |
| recall_alerts              | FDA/USDA food recall alerts                   |
| outbreak_alerts            | CDC/CDPH outbreak notifications               |
| inspector_patterns         | Health dept inspector behavior patterns        |
| legislative_items          | Pending/enacted food safety legislation        |
| weather_risk_events        | Weather events affecting food safety           |
| competitor_events          | Competitor compliance events (public record)   |
| market_intelligence        | Industry trends and market data                |
| executive_snapshots        | Point-in-time executive briefing snapshots     |
| intelligence_correlations  | Cross-source event correlations                |
| client_subscriptions       | Per-client source/jurisdiction subscriptions   |
| insight_deliveries         | Delivery log (webhook POST attempts)           |
| intelligence_digests       | Weekly compiled digests per client              |
| source_health_log          | Source availability/health monitoring           |

## Cron Schedules (5)

| Schedule            | Function              | Frequency              |
|---------------------|-----------------------|------------------------|
| Main crawl          | intelligence-crawl    | Daily 10:00 UTC        |
| Recall monitor      | recall-monitor        | Daily 13:00 UTC        |
| Outbreak monitor    | outbreak-monitor      | Daily 13:30 UTC        |
| Legislative tracker | legislative-tracker   | Weekly Monday 15:00 UTC|
| Intelligence digest | intelligence-digest   | Weekly Sunday 14:00 UTC|

## Setup

```bash
cd intelligence
cp .env.example .env          # Fill in your Supabase keys
npx supabase db reset          # Apply all migrations
npx supabase functions deploy  # Deploy edge functions
```

## Environment Variables

See `.env.example` for required configuration.
