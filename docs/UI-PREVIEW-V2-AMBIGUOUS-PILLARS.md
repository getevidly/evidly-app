# UI-PREVIEW-V2-AMBIGUOUS-PILLARS

> **Date:** 2026-05-10
> **Purpose:** Enumerate all 7 items reassigned from `general` pillar when the `general` enum value was deleted in VS Preview v2.
> **Locked decision:** hood cleaning / fire suppression / fire alarm / sprinkler → `fire_safety`. Anything food-related → `food_safety`. Ambiguous → `food_safety` default + flag.

---

## Reassignment Table

| # | Location | Service ID | Service Type | Original Pillar | New Pillar | Rationale |
|---|---|---|---|---|---|---|
| 1 | INDUSTRY_TEMPLATES.Restaurant | (template) | Refrigeration PM | `general` | `food_safety` | Cold chain / food temperature compliance. Manufacturer warranty drives frequency. Not fire-related (no NFPA, no suppression). Healthcare template explicitly labels it "food safety critical". |
| 2 | INDUSTRY_TEMPLATES.Healthcare | (template) | Refrigeration PM | `general` | `food_safety` | Same as above. Compliance text: "Manufacturer warranty · monthly (food safety critical)". |
| 3 | L1 — Main Kitchen | svc5 | Refrigeration PM | `general` | `food_safety` | Walk-in coolers, reach-in refrigerators, prep coolers. Failure = food temp violation = health department finding. |
| 4 | L2 — North Branch | svc11 | Refrigeration PM | `general` | `food_safety` | Same rationale as svc5. Quarterly per manufacturer warranty. |
| 5 | L3 — Downtown Cafe | svc16 | Refrigeration PM | `general` | `food_safety` | Same rationale as svc5. Light volume location, same equipment class. |
| 6 | L4 — Riverpark Patio | svc21 | Refrigeration PM | `general` | `food_safety` | Same rationale as svc5. Moderate volume location. |
| 7 | L6 — Hospital Cafeteria | svc26 | Refrigeration PM | `general` | `food_safety` | Healthcare food safety critical. Monthly frequency driven by Joint Commission food safety requirements. |

---

## Decision Summary

All 7 items are the same service type: **Refrigeration PM** (preventive maintenance on refrigeration equipment).

**Why `food_safety` and not `fire_safety`:**
- Refrigeration equipment has zero relationship to fire safety standards (NFPA 96, NFPA 17A, etc.)
- Refrigeration failure directly causes food temperature violations — a food safety concern
- Health departments (EHD) cite refrigeration failures under food safety codes (CalCode, FDA Food Code)
- The Healthcare template explicitly marks Refrigeration PM as "food safety critical"
- The locked decision rule: "Anything food-related → food_safety" applies unambiguously

**No items flagged as ambiguous.** All 7 share the same clear rationale.

---

## Change Impact

No changes required to `EvidLY_Vendor_Services_Preview_v2.jsx`. All 7 reassignments are confirmed correct as `food_safety`.

The change log in VS Preview v2 accurately describes the reassignment.

---

*End of UI-PREVIEW-V2-AMBIGUOUS-PILLARS.md*
