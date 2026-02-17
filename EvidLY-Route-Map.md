# EvidLY Route Map

## Fire Safety & Equipment Routes (FS-1)

| Route | Component | Description |
|-------|-----------|-------------|
| `/fire-safety` | `FireSafety.tsx` | Fire Safety Checklist — Daily/Weekly/Monthly tabs, pass/fail, authority citations |
| `/equipment` | `Equipment.tsx` | Equipment Inventory — pillar filter (food/fire), badges, inline detail |
| `/equipment/:equipmentId` | `EquipmentDetail.tsx` | Equipment Detail — full-page view, tabs (Overview/Service History/Schedule/Lifecycle) |
| `/equipment/:equipmentId/service/new` | `ServiceRecordEntry.tsx` | Service Record Entry — form with validation, pass/fail, demo submit |

## Role Access

| Route | Roles |
|-------|-------|
| `/fire-safety` | All (executive, management, kitchen_manager, kitchen, facilities) |
| `/equipment` | executive, management, kitchen_manager, facilities |
| `/equipment/:equipmentId` | Same as `/equipment` |
| `/equipment/:equipmentId/service/new` | Same as `/equipment` |

## Quick Actions (QuickActionsBar)

- **Management:** Fire Check → `/fire-safety` (after Checklist)
- **Kitchen Manager:** Fire Check → `/fire-safety` (after Checklist)
- **Facilities:** Fire Check → `/fire-safety` (first item)

## Dashboard Widget

- **Fire Safety Widget** in OwnerOperatorDashboard: org score, per-location bars, equipment alerts

---

## Daily Checklists & HACCP (FS-2)

### Checklists Route

| Route | Component | Description |
|-------|-----------|-------------|
| `/checklists` | `Checklists.tsx` | Daily Checklists — Templates/Today/History tabs, CalCode authority citations, CCP auto-mapping |

**Features:**
- 4 checklist templates: Opening (9 items), Mid-Shift (6), Closing (8), Receiving (8)
- CalCode authority badges on every item (§113953, §113996, §114097, etc.)
- CCP tag pills (CCP-01 through CCP-04) on temperature-critical items
- Temperature auto-evaluation: real-time PASS/FAIL against min/max limits
- Required corrective action for failed CCP items (blocks submission until filled)
- CCP auto-mapping on submit: collects results, shows summary banner, creates notifications

**CCP Mapping:**
| CCP | Category | Items |
|-----|----------|-------|
| CCP-01 | Cold Storage | Walk-in cooler ≤41°F, walk-in freezer ≤0°F |
| CCP-02 | Hot/Cold Holding | Hot holding ≥135°F, cold holding ≤41°F |
| CCP-03 | Cooling | Cooling items completed to 41°F |
| CCP-04 | Receiving | Poultry, beef, seafood, frozen, dairy temps at delivery |

### HACCP Route

| Route | Component | Description |
|-------|-----------|-------------|
| `/haccp` | `HACCP.tsx` | HACCP Management — Plans/Monitoring/Corrective Actions/Template tabs, Inspector Package PDF |

**Features:**
- 6 HACCP plans with 8 CCPs (roll-up from temp logs + checklists)
- Real-time CCP monitoring grid with pass/fail status
- Corrective action workflow (Identified → Assigned → In Progress → Resolved)
- HACCP Plan Builder (7-section template form)
- **Inspector Package PDF export** (jsPDF): cover page, plans+CCPs, monitoring log, corrective actions, verification statement

### Role Access (FS-2)

| Route | Roles |
|-------|-------|
| `/checklists` | All (executive, management, kitchen_manager, kitchen, facilities) |
| `/haccp` | All (executive, management, kitchen_manager, kitchen, facilities) |
| Inspector Package export | management, executive, kitchen_manager only |
