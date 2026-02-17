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
