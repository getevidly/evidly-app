# Policy Lens — Review & Release Screen (Design of Record)

`review-release-design.html` is the **APPROVED** layout and interaction spec for the admin review/release screen (`src/pages/admin/ExtractionDetail.jsx`). It is the design of record; the built screen must match it.

## Key principles

- **Real finding fields.** The screen renders grounded requirement language from `pl_standards_registry` and insured-facing `kitchen_payload`. The mockup governs **layout and interaction**, not content wording.

- **Edits are wording-only, reason-required, append-only.** The original is preserved; citation, coverage line, and policy source are locked.

- **Release requires two conditions:** every finding reviewed **and** a broker selected. On release the report posts to two destinations — the client's EvidLY account (insured, always) and the selected broker (agent) — both resolve by `intake_id`.

## Scope boundary

This admin screen is **distinct** from the customer reports:

- The **prospect "initial read"** (requirements, three-whats, no operational findings) is a separate artifact.
- The **bound "continuous reading"** (requirements vs. actuals, per-location) is a separate artifact.

Neither must be conflated with this admin review/release screen.
