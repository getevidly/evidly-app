# EvidLY System Audit

Purpose lens: EvidLY is PROACTIVE Compliance & Operations Intelligence for
commercial kitchens — it predicts and prevents cost before issues hit, rather
than reacting after. Every feature is judged against that purpose.

## Rules of this audit
- Every feature record MUST carry EVIDENCE: a row count, a file:line reference,
  or an actual query result. A claim with no evidence is status = UNVERIFIED.
- "Looks wired" is NOT "works." Status is assigned only from evidence.
- No prose verdicts. Records only.
- status enum (use exactly one): LIVE-WORKING | LIVE-STUBBED | BROKEN | DEAD | UNVERIFIED
- Every Supabase .select() in a feature gets a COLUMN CHECK against
  information_schema.columns; any column not present = phantom = flagged.

## Record schema (every feature uses this exact format)
### FEATURE: <real name>
- does:
- proactive?: PROACTIVE | REACTIVE | NEUTRAL — evidence:
- affects:
- scope: org-scoped | cross-tenant | system — RLS column:
- reads:
- writes:
- related_to:
- status:
- EVIDENCE:
- COLUMN CHECK:

## Clusters (audited in this order; each appended below as completed)
1. Intelligence engine  — [ ] not started
2. Evidence / Prove      — [ ] not started
3. Operations            — [ ] not started
4. Comms                 — [ ] not started
5. Admin / Onboarding    — [ ] not started
6. Billing               — [ ] not started

## Cross-cluster synthesis (filled after all clusters)
- INTERCONNECT MAP:
- PROACTIVE GAP (ranked punch list):
- SYSTEM VERDICT:
