# Temps Module — Phase 0 Inventory

> Generated: 2026-04-28
> HEAD: `802eb41` — `fix(temps): null guard inside Modal children blocks`
> Scope: READ-ONLY inventory. No analysis, no suggestions.

---

## 1. File Inventory

### Core page
| File | Lines |
|------|-------|
| `src/pages/TempLogs.tsx` | 3893 |
| `src/pages/TempLogScan.tsx` | 404 |

### Components (`src/components/temp-logs/`)
| File | Lines |
|------|-------|
| `AddCooldownReadingModal.tsx` | 259 |
| `AddCurrentReadingModal.tsx` | 143 |
| `AddHoldingReadingModal.tsx` | 186 |
| `AddReceivingReadingModal.tsx` | 173 |
| `QuickTempSheet.tsx` | 166 |
| `shared.tsx` | 146 |
| `VendorCombobox.tsx` | 258 |
| `HACCPDeviationReport.jsx` | 175 |
| `TempIntelligenceCard.jsx` | 87 |
| `TempPatternInsights.jsx` | 92 |
| `types.ts` | 41 |
| **Subtotal** | **1726** |

### Config & lib
| File | Lines |
|------|-------|
| `src/config/tempConfig.ts` | 33 |
| `src/lib/tempAnomalyEngine.ts` | 58 |
| `src/lib/tempSignalDispatch.ts` | 86 |
| **Subtotal** | **177** |

### Offline / connectivity
| File | Lines |
|------|-------|
| `src/lib/offlineDb.ts` | 173 |
| `src/hooks/useOfflineCache.ts` | 44 |
| `src/lib/connectivityManager.ts` | 105 |
| **Subtotal** | **322** |

### Design system
- `src/lib/designSystem.ts` — zero temp-related tokens (no colors, spacing, or typography for temps)

### Total lines across all temps-related files: **6,522**

---

## 2. TempLogs.tsx — Structural Inventory

### A. Imports (lines 1–35)
- React: `useState`, `useEffect`, `useCallback`, `Fragment`
- Router: `useNavigate`
- Toast: `sonner`
- Icons (lucide-react): `Plus`, `Thermometer`, `Check`, `X`, `Clock`, `Package`, `ChevronDown`, `ChevronUp`, `Download`, `TrendingUp`, `Play`, `StopCircle`, `AlertTriangle`, `Wifi`, `WifiOff`, `Radio`, `Pen`, `Battery`, `Signal`, `QrCode`, `Pencil`, `BarChart3`, `Camera`
- Charts (recharts): `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ResponsiveContainer`, `ReferenceLine`, `Area`, `AreaChart`, `PieChart`, `Pie`, `Cell`, `BarChart`, `Bar`
- Contexts: `useAuth`, `useDemo`, `useTranslation`
- Supabase client
- Date-fns: `format`, `subDays`, `startOfDay`, `endOfDay`, `formatDistanceToNow`
- Internal components: `Breadcrumb`, `PhotoEvidence`, `PhotoGallery`, `ErrorState`, `InfoTooltip`, `DemoUpgradePrompt`, `EmptyState`, `Modal`, `AIAssistButton`, `AIGeneratedIndicator`
- Temp-logs components: `AddCurrentReadingModal`, `AddReceivingReadingModal`, `AddHoldingReadingModal`, `AddCooldownReadingModal`, `VendorCombobox`, `TempIntelligenceCard`, `TempPatternInsights`, `HACCPDeviationReport`
- Config/lib: `getShift`, `getLogType`, `TEMP_CHECK_INTERVALS`, `dispatchTempViolationSignal`
- Demo data: `generateTempDemoHistory`, `equipmentColors`, `iotSensors`, `iotSensorReadings`, `iotSensorProviders`
- Design system: `colors`, `shadows`, `radius`, `typography`, `transitions`

### B. Interfaces (lines 37–125)
| Interface | Fields |
|-----------|--------|
| `TemperatureEquipment` | id, name, equipment_type, min_temp, max_temp, unit, location?, last_check? |
| `InputMethod` (type alias) | `'manual' \| 'qr_scan' \| 'iot_sensor'` |
| `TempCheckCompletion` | id, equipment_id, equipment_name, equipment_type, temperature_value, is_within_range, recorded_by_name, corrective_action, created_at, input_method?, shift?, ccp_number? |
| `User` | id, full_name |
| `BatchTempEntry` | equipment_id, equipment_name, temperature, skipped, min_temp, max_temp |
| `ReceivingItem` | itemDescription, temperature, isPass, category, maxTemp?, ccpDeviation? |
| `Cooldown` | id, itemName, startTemp, startTime, location, startedBy, checks[], status, completedAt? |
| `CooldownCheck` | temperature, time |

Note: `TemperatureEquipment`, `User`, `Cooldown`, `CooldownCheck` are also defined in `src/components/temp-logs/types.ts` (duplicate definitions).

### C. Constants (lines 114–137)
| Constant | Purpose |
|----------|---------|
| `CATEGORY_TEMP_CONFIG` | 9 food categories with maxTemp thresholds for receiving (e.g., refrigerated_meat_poultry → 41°F, frozen → 0°F) |
| `STORAGE_TYPES` | `['storage_cold', 'storage_frozen', 'cooler', 'freezer']` |
| `HOLDING_COLD_TYPES` | `['holding_cold', 'cold_holding']` |
| `HOLDING_HOT_TYPES` | `['holding_hot', 'hot_hold', 'hot_holding']` |
| `HOLDING_TYPES` | Spread of cold + hot |
| Helper functions | `isStorageEquipment()`, `isHoldingEquipment()`, `isHoldingCold()`, `isHoldingHot()`, `isFreezerType()` |

### D. State — 57 useState hooks (lines 146–247)

**Core data state:**
| State | Type | Default |
|-------|------|---------|
| `equipment` | `TemperatureEquipment[]` | `[]` |
| `users` | `User[]` | `[]` |
| `history` | `TempCheckCompletion[]` | `[]` |
| `loading` | `boolean` | `false` |
| `pageError` | `string \| null` | `null` |

**Log Temperature modal:**
| State | Type | Default |
|-------|------|---------|
| `showLogModal` | `boolean` | `false` |
| `selectedEquipment` | `TemperatureEquipment \| null` | `null` |
| `temperature` | `string` | `''` |
| `correctiveAction` | `string` | `''` |
| `selectedUser` | `string` | `''` |
| `tempPhotos` | `PhotoRecord[]` | `[]` |
| `aiFields` | `Set<string>` | `new Set()` |

**Batch modal:**
| State | Type | Default |
|-------|------|---------|
| `showBatchModal` | `boolean` | `false` |
| `batchEntries` | `BatchTempEntry[]` | `[]` |

**Toast state:**
| State | Type | Default |
|-------|------|---------|
| `showToast` | `boolean` | `false` |
| `toastMessage` | `string` | `''` |

**Active tab:**
| State | Type | Default |
|-------|------|---------|
| `activeTab` | `'equipment' \| 'receiving' \| 'history' \| 'cooldown' \| 'iot' \| 'holding' \| 'analytics'` | `'equipment'` |

**Equipment list controls:**
| State | Type | Default |
|-------|------|---------|
| `sortBy` | `'outOfRange' \| 'alphabetical' \| 'mostRecent'` | `'outOfRange'` |
| `locationFilter` | `string` | `'all'` |

**History tab filters:**
| State | Type | Default |
|-------|------|---------|
| `showHistoryDetails` | `boolean` | `false` |
| `historyDateRange` | `string` | `'today'` |
| `historyEquipment` | `string` | `'all'` |
| `historyStatus` | `string` | `'all'` |
| `historyMethod` | `'all' \| InputMethod` | `'all'` |
| `historyShift` | `'all' \| 'morning' \| 'afternoon' \| 'evening'` | `'all'` |
| `historyView` | `'table' \| 'chart'` | `'table'` |
| `customDateFrom` | `string` | `''` |
| `customDateTo` | `string` | `''` |
| `historySortField` | `'created_at' \| 'equipment_name' \| 'temperature_value' \| 'is_within_range'` | `'created_at'` |
| `historySortDirection` | `'asc' \| 'desc'` | `'desc'` |

**Receiving tab:**
| State | Type | Default |
|-------|------|---------|
| `foodCategory` | `string` | `''` |
| `vendorName` | `string` | `''` |
| `itemDescription` | `string` | `''` |
| `receivingTemp` | `string` | `''` |
| `receivingNotes` | `string` | `''` |
| `receivingItems` | `ReceivingItem[]` | `[]` |
| `receivedBy` | `string` | `''` |

**CCP deviation modal:**
| State | Type | Default |
|-------|------|---------|
| `showCcpModal` | `boolean` | `false` |
| `pendingFailItem` | `ReceivingItem \| null` | `null` |
| `ccpActionTaken` | `string` | `''` |
| `ccpNotes` | `string` | `''` |
| `ccpReMeasuredTemp` | `string` | `''` |

**Cooldown tab:**
| State | Type | Default |
|-------|------|---------|
| `cooldowns` | `Cooldown[]` | `[]` |
| `completedCooldowns` | `Cooldown[]` | `[]` |
| `showStartCooldown` | `boolean` | `false` |
| `cooldownForm` | `{ itemName, startTemp, location }` | `{ itemName: '', startTemp: '', location: '' }` |
| `selectedCooldown` | `Cooldown \| null` | `null` |
| `showCooldownCheckModal` | `boolean` | `false` |
| `cooldownCheckTemp` | `string` | `''` |
| `cooldownCheckTime` | `string` | `''` |

**Add-reading modals (new pattern):**
| State | Type | Default |
|-------|------|---------|
| `showAddCurrentModal` | `boolean` | `false` |
| `showAddReceivingModal` | `boolean` | `false` |
| `showAddHoldingModal` | `boolean` | `false` |
| `showAddCooldownModal` | `boolean` | `false` |

**HACCP report:**
| State | Type | Default |
|-------|------|---------|
| `showHACCPReport` | `boolean` | `false` |
| `haccpViolation` | `any` | `null` |

**Timer tick (cooldown countdown):**
| State | Type | Default |
|-------|------|---------|
| (unnamed via destructuring) | `number` | `0` |

### E. useEffect hooks (3 total)

1. **Main data loader** (line 225, deps: `[profile, isDemoMode]`)
   - Demo mode → `loadDemoData()`
   - Live mode with org → `fetchEquipment()`, `fetchUsers()`, `fetchHistory()`
   - Live mode no org → empty arrays

2. **Cooldown timer** (line 248, deps: `[cooldowns.length]`)
   - `setInterval` at 1000ms to force re-render for live countdown display

3. **Cooldown localStorage restore** (line 268, deps: `[]`)
   - Reads `evidly_active_cooldowns` from `localStorage` and restores active cooldowns on mount

### F. Data-fetching functions (4 total)

| Function | Line | Table(s) queried | Purpose |
|----------|------|-----------------|---------|
| `loadDemoData()` | 283 | none (in-memory) | Generates demo equipment, users, history |
| `fetchEquipment()` | 544 | `temperature_equipment`, `temperature_logs` | Loads equipment list + last reading per item (N+1 query pattern) |
| `fetchUsers()` | 584 | `user_profiles` | Loads org users for "recorded by" dropdowns |
| `fetchHistory()` | 598 | `temperature_logs` | Loads last 200 readings for history tab |

### G. Write operations (Supabase inserts)

| Line | Table | Trigger |
|------|-------|---------|
| 723 | `temperature_logs` | Single equipment temp log (Log Temperature modal) |
| 855 | `temperature_logs` | Batch temp log (Batch modal) |
| 1011 | `receiving_temp_logs` | Receiving log finalization |

Note: Cooldown writes go to `cooldown_logs` and `cooldown_temp_checks` but are handled via the AddCooldownReadingModal component, not directly in TempLogs.tsx.

### H. Tabs (7 total)

| Tab key | Label | Content |
|---------|-------|---------|
| `equipment` | Current Readings | Equipment cards with last reading, log button |
| `receiving` | Receiving | Vendor + item entry form with CCP deviation flow |
| `history` | History | Filterable table/chart of past readings |
| `cooldown` | Cooldown | Active cooldowns with live timer, FDA two-stage tracking |
| `iot` | IoT Sensors | Demo IoT sensor data display |
| `holding` | Holding | Hot/cold holding equipment subset |
| `analytics` | Analytics | Charts and pattern insights |

### I. Modals (11 total)

| Modal | State var | Null guard |
|-------|-----------|------------|
| Log Temperature | `showLogModal` | `{selectedEquipment && (...)}` (fixed in 802eb41) |
| Batch Entry | `showBatchModal` | N/A (no nullable data ref) |
| CCP-04 Deviation | `showCcpModal` | `{pendingFailItem && (...)}` (fixed in 802eb41) |
| Start Cooldown | `showStartCooldown` | N/A (form-only, no nullable ref) |
| Cooldown Check | `showCooldownCheckModal` | `{selectedCooldown && (...)}` (fixed in 802eb41) |
| Add Current Reading | `showAddCurrentModal` | Rendered via external component |
| Add Receiving Reading | `showAddReceivingModal` | Rendered via external component |
| Add Holding Reading | `showAddHoldingModal` | Rendered via external component |
| Add Cooldown Reading | `showAddCooldownModal` | Rendered via external component |
| HACCP Deviation Report | `showHACCPReport` | `{showHACCPReport && haccpViolation && (...)}` |
| Demo Upgrade Prompt | `showUpgrade` | Via `useDemoGuard()` |

### J. Known bugs

1. **Orphaned setter calls**: `setShowVendorOther(false)` at lines 985 and 1031 — this state variable is never declared with `useState`. Will cause `ReferenceError` if these code paths execute.
2. **Duplicate interface definitions**: `TemperatureEquipment`, `User`, `Cooldown`, `CooldownCheck` defined both in TempLogs.tsx (lines 37–112) and `src/components/temp-logs/types.ts`.
3. **N+1 query pattern**: `fetchEquipment()` (line 544) runs one query per equipment item to get last reading. With many items this produces N+1 queries.

---

## 3. Supabase Schema — Temperature-Related Tables

### 3a. Active tables (code writes to these)

**`temperature_equipment`** (migration: `20260205201922`)
```
id              uuid PK DEFAULT gen_random_uuid()
organization_id uuid NOT NULL FK → organizations(id) CASCADE
location_id     uuid NOT NULL FK → locations(id) CASCADE
name            text NOT NULL
equipment_type  varchar(50) NOT NULL
min_temp        numeric NOT NULL
max_temp        numeric NOT NULL
unit            varchar(10) DEFAULT 'F'
is_active       boolean DEFAULT true
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```
RLS: via `user_location_access`

**`temperature_logs`** (migration: `20260307000000`)
```
id                      uuid PK DEFAULT gen_random_uuid()
facility_id             uuid NOT NULL FK → locations(id) CASCADE
equipment_id            uuid NOT NULL FK → temperature_equipment(id) CASCADE
input_method            text NOT NULL CHECK ('manual', 'qr_scan', 'iot_sensor')
temperature             decimal NOT NULL
required_min            decimal NULL
required_max            decimal NULL
temp_pass               boolean NOT NULL
reading_time            timestamptz NOT NULL
shift                   text NULL CHECK ('morning', 'afternoon', 'evening')
log_type                text NOT NULL CHECK ('equipment_check', 'hot_holding', 'cold_holding', 'cooling', 'pre_shift', 'post_shift')
logged_by               uuid NULL
sensor_id               text NULL
qr_code_id              text NULL
notes                   text NULL
photo_url               text NULL
corrective_action       text NULL
corrective_action_by    uuid NULL
corrective_action_time  timestamptz NULL
haccp_ccp_log_id        uuid NULL
checklist_completion_id uuid NULL
created_at              timestamptz NOT NULL DEFAULT now()
```
Indexes: `facility_id`, `equipment_id`, `reading_time DESC`, `input_method`, `temp_pass`, `log_type`

**`receiving_temp_logs`** (migration: `20260205201922`, enhanced `20260205215132`)
```
id                uuid PK DEFAULT gen_random_uuid()
organization_id   uuid NOT NULL FK → organizations(id) CASCADE
location_id       uuid NOT NULL FK → locations(id) CASCADE
vendor_name       text NOT NULL
item_description  text NOT NULL
temperature_value numeric NOT NULL
is_pass           boolean NOT NULL
received_by       uuid NOT NULL FK → auth.users(id) CASCADE
notes             text
created_at        timestamptz DEFAULT now()
-- Added in 20260205215132:
item_category     text
pass_fail_status  text DEFAULT 'pass'
corrective_action text
photo_url         text
delivery_time     timestamptz DEFAULT now()
-- Added in 20260517000000:
input_method      text CHECK ('manual', 'qr_scan', 'iot_sensor', 'imported')
migrated_from     text DEFAULT NULL
```
RLS: via `user_location_access`

**`cooldown_logs`** (migration: `20260205215132`)
```
id                  uuid PK DEFAULT gen_random_uuid()
organization_id     uuid FK → organizations(id) CASCADE NOT NULL
location_id         uuid FK → locations(id) CASCADE
food_item_name      text NOT NULL
starting_temp       decimal NOT NULL
stage1_target_temp  decimal DEFAULT 70
stage2_target_temp  decimal DEFAULT 41
current_stage       integer DEFAULT 1
status              text DEFAULT 'active'
start_time          timestamptz DEFAULT now()
stage1_complete_time timestamptz
stage2_complete_time timestamptz
recorded_by         uuid FK → user_profiles(id)
notes               text
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
```
RLS: via `user_profiles`

**`cooldown_temp_checks`** (migration: `20260205215132`)
```
id              uuid PK DEFAULT gen_random_uuid()
cooldown_log_id uuid FK → cooldown_logs(id) CASCADE NOT NULL
temperature_value decimal NOT NULL
check_time      timestamptz DEFAULT now()
stage           integer NOT NULL
created_at      timestamptz DEFAULT now()
```
RLS: via parent `cooldown_logs` → `user_profiles`

### 3b. Legacy / overlapping tables (not used by current code)

**`temp_logs`** (migration: `20260205003451`)
```
id              uuid PK
organization_id uuid NOT NULL FK → organizations(id)
location_id     uuid NOT NULL FK → locations(id)
equipment_name  text NOT NULL
temperature     numeric NOT NULL
unit            varchar(10) DEFAULT 'F'
recorded_by     uuid FK → auth.users(id)
recorded_at     timestamptz DEFAULT now()
notes           text
status          varchar(50) DEFAULT 'normal'
created_at      timestamptz DEFAULT now()
```
Status: Superseded by `temperature_logs`. No code references to this table.

**`temp_check_completions`** (migration: `20260205201922`)
```
id              uuid PK
organization_id uuid NOT NULL FK → organizations(id)
location_id     uuid NOT NULL FK → locations(id)
equipment_id    uuid NOT NULL FK → temperature_equipment(id)
temperature_value numeric NOT NULL
is_within_range boolean NOT NULL
recorded_by     uuid NOT NULL FK → auth.users(id)
corrective_action text
photo_url       text
created_at      timestamptz DEFAULT now()
```
Status: Superseded by `temperature_logs`. Not written to by current code. The `TempCheckCompletion` interface in TempLogs.tsx is mapped from `temperature_logs` data, not this table.

### 3c. Signal dispatch table

**`intelligence_signals`** — written by `src/lib/tempSignalDispatch.ts` when a temperature violation occurs. Not a temp-specific table; shared across modules.

**`corrective_action_history`** — exists (migration `20260415000001`). Referenced by `tempSignalDispatch.ts`.

### 3d. IoT / sensor tables (18 total)

From migration `20260210200000`:
- `iot_sensor_providers`
- `iot_sensors`
- `iot_sensor_readings`
- `iot_sensor_alerts`
- `iot_integration_configs`
- `iot_ingestion_log`

From migration `20260215000000`:
- `sensor_integrations`
- `sensor_devices`
- `sensor_readings`
- `sensor_alerts`
- `sensor_incidents`
- `sensor_webhooks`
- `sensor_csv_imports`
- `sensor_calibration_log`
- `sensor_door_events`
- `sensor_defrost_schedules`
- `sensor_cooling_logs`

From migration `20260219000000`:
- `device_registrations`

Note: Two parallel IoT schema families exist (`iot_*` and `sensor_*`). The TempLogs.tsx IoT tab uses demo data from `src/data/demoData.ts` (`iotSensors`, `iotSensorReadings`, `iotSensorProviders`) — it does not query any of these tables.

---

## 4. Config: `src/config/tempConfig.ts` (33 lines)

```ts
TEMP_CHECK_INTERVALS = {
  HOT_HOLDING_OVERDUE_MINUTES: 240,     // 4 hours — FDA Food Code 3-501.16
  COLD_HOLDING_OVERDUE_MINUTES: 240,    // 4 hours
  EQUIPMENT_CHECK_OVERDUE_MINUTES: 480, // 8 hours (start of shift)
  RECEIVING_OVERDUE_HOURS: 24,          // Daily receiving log
}

getShift(): 'morning' | 'afternoon' | 'evening'  // based on current hour
getLogType(equipmentType, context?): string       // maps to temperature_logs.log_type
```

---

## 5. Routing & Sidebar

### Routes (from `src/App.tsx`)
| Path | Component | Guard |
|------|-----------|-------|
| `/temp-logs` | `<TempLogs />` | Inside `ProtectedLayout` (auth required) |
| `/temp-logs/scan` | `<TempLogScan />` | Wrapped in `<QRAuthGuard>` |

### Route guards
- `src/lib/routeGuards.ts` — no entry for `/temp-logs` (no role restriction at route level)

### Sidebar config (`src/config/sidebarConfig.ts`)
```ts
// Item registry
temperatures: {
  id: 'temperatures', label: 'Temperature Readings', path: '/temp-logs', icon: '🌡️',
  roles: [], description: 'Record temperatures manually, via QR Code scan, or from Internet of Things sensors — storage, receiving, and cooking.',
}
temperaturesViewOnly: {
  id: 'temperatures', label: 'Temperature Readings 👁', path: '/temp-logs', icon: '🌡️',
  // (view-only variant for executive role)
}
```

### Roles that see temperatures in sidebar
| Role | Item used |
|------|-----------|
| platform_admin | `I.temperatures` (via `I.foodSafetyOverview` section) |
| owner_operator | `I.temperatures` |
| compliance_manager | `I.temperatures` |
| chef | `I.temperatures` |
| kitchen_manager | `I.temperatures` |
| executive | `I.temperaturesViewOnly` |
| facilities_manager | `I.temperatures` |
| kitchen_staff | `I.temperatures` |

### Other navigation references
- `src/config/navConfig.ts` — `Thermometer` icon, label `'Temps'`, path `/temp-logs` (multiple role configs)
- `src/config/mobileProductionConfig.ts` — quick action `'Log Temp'` and tab `'Temps'` for multiple roles
- `src/components/layout/QuickActionsBar.tsx` — bottom bar `'Temps'` button, `'QR Scan'` button
- `src/components/layout/MobileTabBar.tsx` — `/temp-logs` → `Thermometer` icon
- `src/components/layout/AutoBreadcrumb.tsx` — `/temp-logs` → `{ label: 'Temperature Readings', parent: '/food-safety' }`

### Cross-module references to `/temp-logs`
- Dashboard components: `ChefDashboard.tsx`, `OwnerOperatorDashboard.tsx`, `KitchenManagerDashboard.tsx`, `KitchenStaffTaskList.tsx`, `DashboardToday.tsx`, `NeedsAttention.tsx`
- Hooks: `useDashboardData.ts`, `useMobileTasks.ts`, `useFeatureCriteriaProgress.ts`
- Pages: `Alerts.tsx`, `ImportData.tsx`, `InspectorMode.jsx`, `HelpSupport.tsx`
- Components: `OnboardingSummary.tsx`, `DemoTour.tsx`, `DemoTalkingPoints.tsx`, `LiveActivityFeed.tsx`, `NotificationDropdown.tsx`, `WelcomeModal.tsx`
- Migration components: `MigrationWizard.jsx`, `MigrationStatusCard.jsx`
- Admin: `DemoLauncher.tsx`, `FeatureBaselineTracker.jsx`, `RolePreview.jsx`

---

## 6. PWA / Offline

### PWA manifest
- `public/manifest.json` — `name: "EvidLY"`, `display: "standalone"`, `start_url: "/dashboard"`, 2 icons (192px, 512px)

### Service worker
- None. No `service-worker.js`, no `sw.js`, no Workbox config.

### IndexedDB (`src/lib/offlineDb.ts`, 173 lines)
- Uses `idb` npm package
- DB name: `evidly-offline`
- 3 object stores: `pendingActions`, `cachedData`, `offlinePhotos`
- In-memory fallback when IndexedDB unavailable
- API: `savePendingAction()`, `getPendingActions()`, `removePendingAction()`, `saveToCache()`, `getFromCache()`, `saveOfflinePhoto()`, `getOfflinePhotos()`

### Offline cache hook (`src/hooks/useOfflineCache.ts`, 44 lines)
- Primes cache with: `temp_logs`, `checklists`, `equipment`
- Filters by `org_id` (note: schema column is `organization_id` — possible mismatch)
- Runs for kitchen-facing roles: `chef`, `kitchen_manager`, `kitchen_staff`

### Connectivity manager (`src/lib/connectivityManager.ts`, 105 lines)
- Singleton pattern
- Detection: `navigator.onLine` + periodic heartbeat (30s interval)
- Heartbeat: `fetch('/manifest.json', { cache: 'no-store' })`
- Events: `online`, `offline` callback registration
- API: `isOnline()`, `onStatusChange()`, `startMonitoring()`, `stopMonitoring()`

---

## 7. Sensor / Bluetooth / IoT

### NPM packages
- No Bluetooth or BLE packages in `package.json`
- `Bluetooth` icon imported from `lucide-react` in other files (UI only, no hardware integration)

### IoT tab in TempLogs.tsx
- Tab key: `'iot'`
- Data source: demo arrays from `src/data/demoData.ts` (`iotSensors`, `iotSensorReadings`, `iotSensorProviders`)
- No Supabase queries for IoT data
- Icons used: `Wifi`, `WifiOff`, `Radio`, `Battery`, `Signal`

### IoT/sensor DB tables (18 total, listed in section 3d)
- Two parallel families: `iot_*` (6 tables) and `sensor_*` (12 tables)
- None are queried by TempLogs.tsx or any temp-logs component
- `device_registrations` for offline sync

---

## 8. Anomaly Engine & Signal Dispatch

### `src/lib/tempAnomalyEngine.ts` (58 lines)
- Z-score anomaly detection for equipment readings
- Trend analysis (rising/falling/stable)
- Exported: `detectAnomalies()`, `analyzeTrend()`

### `src/lib/tempSignalDispatch.ts` (86 lines)
- Called after temperature violations
- Writes to `intelligence_signals` table
- Auto-creates entries in `corrective_action_history`
- Exported: `dispatchTempViolationSignal()`

---

*End of inventory.*
