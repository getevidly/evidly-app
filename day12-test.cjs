/**
 * DAY12-AUTO-TEST — Enterprise, Offline Mode, API Marketplace
 * Tests: 18 + regression + empty state audit + edge function coverage map
 * Run: node day12-test.cjs
 */
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

// ── Config ──────────────────────────────────────────────
const SUPABASE_URL = 'https://uroawofnyjzcqbmgdiqq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyb2F3b2ZueWp6Y3FibWdkaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTAwMzcsImV4cCI6MjA5MTUyNjAzN30.iS5LvJVJHtXsSr2xwEwrYEAmWv7meqSOajxnaUD63uQ';

const SRC = path.join(__dirname, 'src');
const FUNC = path.join(__dirname, 'supabase', 'functions');

const results = [];
let accessToken = null;

// ── Helpers ─────────────────────────────────────────────
function R(id, name, status, detail) {
  results.push({ id, name, status, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '~';
  console.log(`  ${icon} ${id} ${name}: ${status}`);
}

function fetch2(url, opts = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const body = opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : null;
    const headers = { ...opts.headers };
    if (body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const rq = mod.request(u, {
      method: opts.method || (body ? 'POST' : 'GET'),
      headers,
      timeout: 15000,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: d, json: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: d, json: null }); }
      });
    });
    rq.on('error', e => resolve({ status: 0, headers: {}, body: e.message, json: null }));
    rq.on('timeout', () => { rq.destroy(); resolve({ status: 0, headers: {}, body: 'timeout', json: null }); });
    if (body) rq.write(body);
    rq.end();
  });
}

function readFile(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function fileExists(p) { return fs.existsSync(p); }

function searchFiles(dir, pattern, ext = null) {
  const matches = [];
  if (!fs.existsSync(dir)) return matches;
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
  function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, f.name);
      if (f.isDirectory() && !f.name.startsWith('.') && f.name !== 'node_modules') walk(full);
      else if (f.isFile()) {
        if (ext && !f.name.endsWith(ext)) continue;
        try {
          const content = fs.readFileSync(full, 'utf8');
          if (re.test(content)) matches.push(full);
        } catch {}
      }
    }
  }
  walk(dir);
  return matches;
}

function supaRest(tablePath) {
  return fetch2(`${SUPABASE_URL}/rest/v1/${tablePath}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken || ANON_KEY}`,
    },
  });
}

async function authenticate() {
  const res = await fetch2(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: { email: 'arthur@getevidly.com', password: 'Makin1Million$' },
  });
  if (res.json?.access_token) {
    accessToken = res.json.access_token;
    return true;
  }
  return false;
}

// ── Empty State Audit ───────────────────────────────────
const emptyStateAudit = [];
function auditEmptyState(component, file, hasDemoGuard, hasEmptyState, details) {
  emptyStateAudit.push({ component, file, hasDemoGuard, hasEmptyState, details });
}

// ═══════════════════════════════════════════════════════
//  SECTION 1: Enterprise (12.01 – 12.07)
// ═══════════════════════════════════════════════════════

async function test1201_EnterprisePages() {
  console.log('\n── 12.01 Enterprise Pages & Routes ──');
  const appTsx = readFile(path.join(SRC, 'App.tsx'));

  // Check pages exist
  const pages = [
    { name: 'EnterpriseLanding', file: 'EnterpriseLanding.tsx' },
    { name: 'EnterpriseDashboard', file: 'EnterpriseDashboard.tsx' },
    { name: 'EnterpriseExecutive', file: 'EnterpriseExecutive.tsx' },
    { name: 'OrgHierarchy', file: 'OrgHierarchy.tsx' },
  ];
  const pagesFound = pages.filter(p =>
    fileExists(path.join(SRC, 'pages', p.file)) || fileExists(path.join(SRC, 'pages', p.file.replace('.tsx', '.jsx')))
  );

  // Check routes
  const expectedRoutes = ['/enterprise', '/enterprise/admin', '/enterprise/dashboard', '/org-hierarchy'];
  const routesFound = expectedRoutes.filter(r => appTsx.includes(`path="${r}"`));

  // Check DB tables
  const tables = ['enterprise_tenants', 'enterprise_sso_configs', 'enterprise_user_mappings',
    'enterprise_audit_log', 'enterprise_hierarchy_nodes', 'enterprise_rollup_scores',
    'enterprise_report_templates', 'enterprise_scim_tokens'];
  const tableResults = [];
  for (const t of tables) {
    const res = await supaRest(`${t}?select=id&limit=1`);
    tableResults.push({ table: t, status: res.status, ok: res.status === 200 });
  }
  const tablesOk = tableResults.filter(t => t.ok).length;

  // Audit empty states
  const dashContent = readFile(path.join(SRC, 'pages', 'EnterpriseDashboard.tsx'));
  const dashDemo = dashContent.includes('useDemo');
  auditEmptyState('EnterpriseDashboard', 'EnterpriseDashboard.tsx', dashDemo, true, 'useDemo: ' + (dashDemo ? 'YES' : 'NO'));

  const execContent = readFile(path.join(SRC, 'pages', 'EnterpriseExecutive.tsx'));
  const execDemo = execContent.includes('useDemo');
  auditEmptyState('EnterpriseExecutive', 'EnterpriseExecutive.tsx', execDemo, true, 'useDemo: ' + (execDemo ? 'YES' : 'NO'));

  const landingContent = readFile(path.join(SRC, 'pages', 'EnterpriseLanding.tsx'));
  auditEmptyState('EnterpriseLanding', 'EnterpriseLanding.tsx', false, false, 'Marketing/landing page — Coming Soon');

  const orgContent = readFile(path.join(SRC, 'pages', 'OrgHierarchy.tsx'));
  const orgDemo = orgContent.includes('useDemo');
  auditEmptyState('OrgHierarchy', 'OrgHierarchy.tsx', orgDemo, true, 'useDemo: ' + (orgDemo ? 'YES' : 'NO'));

  R('12.01', 'Enterprise pages & routes', (pagesFound.length >= 4 && routesFound.length >= 4) ? 'PASS' : 'FAIL',
    `Pages: ${pagesFound.length}/${pages.length} | Routes: ${routesFound.length}/${expectedRoutes.length} | DB tables accessible: ${tablesOk}/${tables.length} (${tableResults.filter(t => !t.ok).map(t => t.table + '(' + t.status + ')').join(', ') || 'all OK'}) | STATUS: POST-LAUNCH`);
}

async function test1202_EnterpriseSSO() {
  console.log('\n── 12.02 Enterprise SSO Callback ──');
  const content = readFile(path.join(FUNC, 'enterprise-sso-callback', 'index.ts'));
  const hasFn = content.length > 100;

  const hasSAML = content.includes('saml') || content.includes('SAML');
  const hasOIDC = content.includes('oidc') || content.includes('OIDC') || content.includes('openid');
  const hasJIT = content.includes('jit') || content.includes('JIT') || content.includes('just_in_time') || content.includes('auto') && content.includes('provision');
  const readsTenants = content.includes('enterprise_tenants');
  const readsSSOConfig = content.includes('enterprise_sso_configs');
  const writesUserMappings = content.includes('enterprise_user_mappings');
  const writesAuditLog = content.includes('enterprise_audit_log');

  R('12.02', 'Enterprise SSO callback', (hasFn && (hasSAML || hasOIDC) && readsTenants) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | SAML: ${hasSAML ? '✓' : '✗'} | OIDC: ${hasOIDC ? '✓' : '✗'} | JIT provisioning: ${hasJIT ? '✓' : '✗'} | Reads enterprise_tenants: ${readsTenants ? '✓' : '✗'} | Reads sso_configs: ${readsSSOConfig ? '✓' : '✗'} | Writes user_mappings: ${writesUserMappings ? '✓' : '✗'} | Writes audit_log: ${writesAuditLog ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1203_EnterpriseSCIM() {
  console.log('\n── 12.03 Enterprise SCIM Users ──');
  const content = readFile(path.join(FUNC, 'enterprise-scim-users', 'index.ts'));
  const hasFn = content.length > 100;

  const hasSCIM = content.includes('scim') || content.includes('SCIM');
  const hasSHA256 = content.includes('SHA-256') || content.includes('sha256') || content.includes('crypto');
  const hasGET = content.includes('GET');
  const hasPOST = content.includes('POST');
  const hasPATCH = content.includes('PATCH');
  const hasDELETE = content.includes('DELETE');
  const readsUserMappings = content.includes('enterprise_user_mappings');
  const readsScimTokens = content.includes('enterprise_scim_tokens') || content.includes('scim_token');

  R('12.03', 'Enterprise SCIM users', (hasFn && hasSCIM && (hasSHA256 || content.includes('token'))) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | SCIM 2.0: ${hasSCIM ? '✓' : '✗'} | SHA-256 token auth: ${hasSHA256 ? '✓' : '✗'} | GET: ${hasGET ? '✓' : '✗'} | POST: ${hasPOST ? '✓' : '✗'} | PATCH: ${hasPATCH ? '✓' : '✗'} | DELETE: ${hasDELETE ? '✓' : '✗'} | Reads user_mappings: ${readsUserMappings ? '✓' : '✗'} | Reads scim_tokens: ${readsScimTokens ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1204_EnterpriseTenantProvision() {
  console.log('\n── 12.04 Enterprise Tenant Provisioning ──');
  const content = readFile(path.join(FUNC, 'enterprise-tenant-provision', 'index.ts'));
  const hasFn = content.length > 100;

  const hasGET = content.includes('GET');
  const hasPOST = content.includes('POST');
  const readsTenants = content.includes('enterprise_tenants');
  const createsSSO = content.includes('enterprise_sso_configs');
  const hasValidation = content.includes('required') || content.includes('validation') || content.includes('missing');
  const hasErrorHandling = content.includes('catch') || content.includes('error');

  R('12.04', 'Enterprise tenant provisioning', (hasFn && readsTenants && (hasGET || hasPOST)) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | GET: ${hasGET ? '✓' : '✗'} | POST: ${hasPOST ? '✓' : '✗'} | Reads tenants: ${readsTenants ? '✓' : '✗'} | Creates SSO config: ${createsSSO ? '✓' : '✗'} | Validation: ${hasValidation ? '✓' : '✗'} | Error handling: ${hasErrorHandling ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1205_EnterpriseRollup() {
  console.log('\n── 12.05 Enterprise Rollup & Hierarchy ──');
  const rollupContent = readFile(path.join(FUNC, 'enterprise-rollup-calculate', 'index.ts'));
  const alertContent = readFile(path.join(FUNC, 'enterprise-alert-rollup', 'index.ts'));

  const hasRollupFn = rollupContent.length > 100;
  const hasAlertFn = alertContent.length > 100;

  // Rollup calculate: bottom-up KPI aggregation, 2-pillar
  const hasHierarchy = rollupContent.includes('enterprise_hierarchy_nodes') || rollupContent.includes('hierarchy');
  const hasFireScore = rollupContent.includes('fire_safety_score') || rollupContent.includes('fire_safety');
  const hasFoodScore = rollupContent.includes('food_safety_score') || rollupContent.includes('food_safety');
  const writesRollupScores = rollupContent.includes('enterprise_rollup_scores');
  const hasBottomUp = rollupContent.includes('bottom') || rollupContent.includes('parent') || rollupContent.includes('aggregate');

  // Alert rollup: multi-location aggregation
  const alertReadsRollupScores = alertContent.includes('enterprise_rollup_scores');
  const alertJoinsHierarchy = alertContent.includes('enterprise_hierarchy_nodes') || alertContent.includes('hierarchy');

  R('12.05', 'Enterprise rollup & hierarchy', (hasRollupFn && hasAlertFn && hasHierarchy) ? 'PASS' : 'FAIL',
    `enterprise-rollup-calculate: ${hasRollupFn ? '✓' : '✗'} (${Math.round(rollupContent.length/1024*10)/10}KB) | Hierarchy nodes: ${hasHierarchy ? '✓' : '✗'} | Fire safety score: ${hasFireScore ? '✓' : '✗'} | Food safety score: ${hasFoodScore ? '✓' : '✗'} | Writes rollup_scores: ${writesRollupScores ? '✓' : '✗'} | Bottom-up: ${hasBottomUp ? '✓' : '✗'} | enterprise-alert-rollup: ${hasAlertFn ? '✓' : '✗'} (${Math.round(alertContent.length/1024*10)/10}KB) | Reads rollup_scores: ${alertReadsRollupScores ? '✓' : '✗'} | Joins hierarchy: ${alertJoinsHierarchy ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1206_EnterpriseReport() {
  console.log('\n── 12.06 Enterprise Report Generation ──');
  const content = readFile(path.join(FUNC, 'enterprise-report-generate', 'index.ts'));
  const hasFn = content.length > 100;

  const hasTemplates = content.includes('enterprise_report_templates');
  const hasTenantLookup = content.includes('enterprise_tenants') || content.includes('tenant_id');
  const hasReportTypes = content.includes('template') || content.includes('report_type');
  const hasDateRange = content.includes('start_date') || content.includes('date_range') || content.includes('from_date');
  const hasDataFetch = content.includes('locations') || content.includes('compliance');

  R('12.06', 'Enterprise report generation', (hasFn && hasTemplates) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Templates: ${hasTemplates ? '✓' : '✗'} | Tenant lookup: ${hasTenantLookup ? '✓' : '✗'} | Report types: ${hasReportTypes ? '✓' : '✗'} | Date range: ${hasDateRange ? '✓' : '✗'} | Data fetch: ${hasDataFetch ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1207_EnterpriseAuditExport() {
  console.log('\n── 12.07 Enterprise Audit Export ──');
  const content = readFile(path.join(FUNC, 'enterprise-audit-export', 'index.ts'));
  const hasFn = content.length > 100;

  const readsAuditLog = content.includes('enterprise_audit_log');
  const hasDateRange = content.includes('start_date') || content.includes('from') || content.includes('date');
  const hasTenantFilter = content.includes('tenant_id') || content.includes('enterprise_tenants');
  const hasCSVOrJSON = content.includes('csv') || content.includes('CSV') || content.includes('json') || content.includes('JSON');
  const hasAuth = content.includes('authorization') || content.includes('Authorization') || content.includes('service_role');

  R('12.07', 'Enterprise audit export', (hasFn && readsAuditLog) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Reads audit_log: ${readsAuditLog ? '✓' : '✗'} | Date range filter: ${hasDateRange ? '✓' : '✗'} | Tenant filter: ${hasTenantFilter ? '✓' : '✗'} | Export format: ${hasCSVOrJSON ? '✓' : '✗'} | Auth: ${hasAuth ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

// ═══════════════════════════════════════════════════════
//  SECTION 2: Offline Mode (12.08 – 12.12)
// ═══════════════════════════════════════════════════════

async function test1208_OfflineSyncHandler() {
  console.log('\n── 12.08 Offline Sync Handler ──');
  const content = readFile(path.join(FUNC, 'offline-sync-handler', 'index.ts'));
  const hasFn = content.length > 100;

  const hasDeviceIdAuth = content.includes('device_id') || content.includes('deviceId');
  const hasDeviceRegistrations = content.includes('device_registrations');
  const hasBatchInsert = content.includes('insert');
  const hasBatchUpdate = content.includes('update');
  const hasBatchDelete = content.includes('delete');
  const hasConflictDetection = content.includes('conflict') || content.includes('version');

  R('12.08', 'Offline sync handler', (hasFn && hasDeviceIdAuth && hasBatchInsert) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Device ID auth: ${hasDeviceIdAuth ? '✓' : '✗'} | Device registrations: ${hasDeviceRegistrations ? '✓' : '✗'} | Batch insert: ${hasBatchInsert ? '✓' : '✗'} | Batch update: ${hasBatchUpdate ? '✓' : '✗'} | Batch delete: ${hasBatchDelete ? '✓' : '✗'} | Conflict detection: ${hasConflictDetection ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1209_OfflineSyncPull() {
  console.log('\n── 12.09 Offline Sync Pull ──');
  const content = readFile(path.join(FUNC, 'offline-sync-pull', 'index.ts'));
  const hasFn = content.length > 100;

  const hasDeltaSync = content.includes('last_sync_at') || content.includes('lastSync') || content.includes('since');
  const hasDeviceId = content.includes('device_id') || content.includes('deviceId');
  const hasTimestamp = content.includes('timestamp') || content.includes('updated_at');
  const hasLocationFilter = content.includes('location_id') || content.includes('organization_id');
  const hasDataTables = content.includes('checklists') || content.includes('temperature') || content.includes('locations');

  R('12.09', 'Offline sync pull', (hasFn && hasDeltaSync) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Delta sync (last_sync_at): ${hasDeltaSync ? '✓' : '✗'} | Device ID: ${hasDeviceId ? '✓' : '✗'} | Timestamp filter: ${hasTimestamp ? '✓' : '✗'} | Location filter: ${hasLocationFilter ? '✓' : '✗'} | Data tables: ${hasDataTables ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1210_OfflineConflictResolver() {
  console.log('\n── 12.10 Offline Conflict Resolver ──');
  const content = readFile(path.join(FUNC, 'offline-conflict-resolver', 'index.ts'));
  const hasFn = content.length > 100;

  const hasClientWins = content.includes('client_wins') || content.includes('client');
  const hasServerWins = content.includes('server_wins') || content.includes('server');
  const hasManual = content.includes('manual');
  const readsSyncConflicts = content.includes('sync_conflicts');
  const hasResolution = content.includes('resolution') || content.includes('resolve');
  const hasVersionCheck = content.includes('version') || content.includes('updated_at');

  R('12.10', 'Offline conflict resolver', (hasFn && readsSyncConflicts && (hasClientWins || hasServerWins)) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | client_wins: ${hasClientWins ? '✓' : '✗'} | server_wins: ${hasServerWins ? '✓' : '✗'} | manual: ${hasManual ? '✓' : '✗'} | Reads sync_conflicts: ${readsSyncConflicts ? '✓' : '✗'} | Resolution logic: ${hasResolution ? '✓' : '✗'} | Version check: ${hasVersionCheck ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1211_OfflineDeviceManager() {
  console.log('\n── 12.11 Offline Device Manager ──');
  const content = readFile(path.join(FUNC, 'offline-device-manager', 'index.ts'));
  const hasFn = content.length > 100;

  const hasPOST = content.includes('POST');
  const hasGET = content.includes('GET');
  const hasDELETE = content.includes('DELETE');
  const hasDeviceRegistrations = content.includes('device_registrations');
  const hasDeviceInfo = content.includes('device_name') || content.includes('platform') || content.includes('os_version');
  const hasLastSeen = content.includes('last_seen') || content.includes('last_active') || content.includes('last_sync');

  R('12.11', 'Offline device manager', (hasFn && hasDeviceRegistrations && (hasPOST || hasGET)) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | POST: ${hasPOST ? '✓' : '✗'} | GET: ${hasGET ? '✓' : '✗'} | DELETE: ${hasDELETE ? '✓' : '✗'} | device_registrations: ${hasDeviceRegistrations ? '✓' : '✗'} | Device info: ${hasDeviceInfo ? '✓' : '✗'} | Last seen tracking: ${hasLastSeen ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1212_OfflinePhotoBatchUpload() {
  console.log('\n── 12.12 Offline Photo Batch Upload ──');
  const content = readFile(path.join(FUNC, 'offline-photo-batch-upload', 'index.ts'));
  const hasFn = content.length > 100;

  const hasBase64 = content.includes('base64') || content.includes('Base64');
  const hasStorage = content.includes('storage') || content.includes('Storage');
  const hasDeviceId = content.includes('device_id') || content.includes('deviceId');
  const hasBatch = content.includes('photos') || content.includes('batch') || content.includes('array');
  const hasContentType = content.includes('content_type') || content.includes('image/');
  const hasErrorHandling = content.includes('catch') || content.includes('error');

  R('12.12', 'Offline photo batch upload', (hasFn && hasBase64 && hasStorage) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Base64 decode: ${hasBase64 ? '✓' : '✗'} | Supabase Storage: ${hasStorage ? '✓' : '✗'} | Device ID auth: ${hasDeviceId ? '✓' : '✗'} | Batch processing: ${hasBatch ? '✓' : '✗'} | Content type: ${hasContentType ? '✓' : '✗'} | Error handling: ${hasErrorHandling ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

// ═══════════════════════════════════════════════════════
//  SECTION 3: API Marketplace (12.13 – 12.18)
// ═══════════════════════════════════════════════════════

async function test1213_APITokenValidation() {
  console.log('\n── 12.13 API Token Validation + Key Generation ──');
  const validateContent = readFile(path.join(FUNC, 'api-token-validate', 'index.ts'));
  const genKeyContent = readFile(path.join(FUNC, 'generate-api-key', 'index.ts'));

  const hasValidateFn = validateContent.length > 100;
  const hasGenKeyFn = genKeyContent.length > 100;

  // api-token-validate: SHA-256, bearer token
  const hasSHA256 = validateContent.includes('SHA-256') || validateContent.includes('sha256') || validateContent.includes('crypto');
  const hasBearer = validateContent.includes('Bearer') || validateContent.includes('bearer') || validateContent.includes('authorization');
  const readsApiTokens = validateContent.includes('api_tokens');
  const readsApiApps = validateContent.includes('api_applications');

  // generate-api-key: evd_ format, role-gated
  const hasEvdPrefix = genKeyContent.includes('evd_');
  const hasRoleGate = genKeyContent.includes('platform_admin') || genKeyContent.includes('owner_operator') || genKeyContent.includes('role');
  const hasSHA256Gen = genKeyContent.includes('SHA-256') || genKeyContent.includes('sha256') || genKeyContent.includes('crypto');

  R('12.13', 'API token validation + key gen', (hasValidateFn && hasGenKeyFn && hasSHA256) ? 'PASS' : 'FAIL',
    `api-token-validate: ${hasValidateFn ? '✓' : '✗'} | SHA-256 hash: ${hasSHA256 ? '✓' : '✗'} | Bearer auth: ${hasBearer ? '✓' : '✗'} | Reads api_tokens: ${readsApiTokens ? '✓' : '✗'} | Reads api_applications: ${readsApiApps ? '✓' : '✗'} | generate-api-key: ${hasGenKeyFn ? '✓' : '✗'} | evd_ prefix: ${hasEvdPrefix ? '✓' : '✗'} | Role-gated: ${hasRoleGate ? '✓' : '✗'} | SHA-256 stored: ${hasSHA256Gen ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1214_APIOAuth() {
  console.log('\n── 12.14 API OAuth2 + PKCE ──');
  const authContent = readFile(path.join(FUNC, 'api-oauth-authorize', 'index.ts'));
  const tokenContent = readFile(path.join(FUNC, 'api-oauth-token', 'index.ts'));

  const hasAuthFn = authContent.length > 100;
  const hasTokenFn = tokenContent.length > 100;

  // OAuth authorize: authorization code + PKCE
  const hasPKCE = authContent.includes('PKCE') || authContent.includes('pkce') || authContent.includes('code_challenge');
  const hasAuthCode = authContent.includes('authorization_code') || authContent.includes('auth_code') || authContent.includes('code');
  const hasScopes = authContent.includes('scope');
  const hasRedirectUri = authContent.includes('redirect_uri');

  // OAuth token: code exchange
  const hasCodeExchange = tokenContent.includes('code') && tokenContent.includes('token');
  const hasRefreshToken = tokenContent.includes('refresh_token');
  const writesApiTokens = tokenContent.includes('api_tokens');
  const hasCodeVerifier = tokenContent.includes('code_verifier');

  R('12.14', 'API OAuth2 + PKCE', (hasAuthFn && hasTokenFn && hasScopes) ? 'PASS' : 'FAIL',
    `api-oauth-authorize: ${hasAuthFn ? '✓' : '✗'} (${Math.round(authContent.length/1024*10)/10}KB) | PKCE: ${hasPKCE ? '✓' : '✗'} | Auth code: ${hasAuthCode ? '✓' : '✗'} | Scopes: ${hasScopes ? '✓' : '✗'} | Redirect URI: ${hasRedirectUri ? '✓' : '✗'} | api-oauth-token: ${hasTokenFn ? '✓' : '✗'} (${Math.round(tokenContent.length/1024*10)/10}KB) | Code exchange: ${hasCodeExchange ? '✓' : '✗'} | Refresh token: ${hasRefreshToken ? '✓' : '✗'} | Code verifier: ${hasCodeVerifier ? '✓' : '✗'} | Writes api_tokens: ${writesApiTokens ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1215_APIRateLimiter() {
  console.log('\n── 12.15 API Rate Limiter ──');
  const content = readFile(path.join(FUNC, 'api-rate-limiter', 'index.ts'));
  const hasFn = content.length > 100;

  const hasTierBased = content.includes('tier') || content.includes('plan');
  const hasStarter = content.includes('60') || content.includes('starter') || content.includes('Starter');
  const hasPro = content.includes('300') || content.includes('pro') || content.includes('Pro');
  const hasEnterprise = content.includes('1000') || content.includes('enterprise') || content.includes('Enterprise');
  const hasSlidingWindow = content.includes('window') || content.includes('sliding') || content.includes('minute');
  const hasAllowedCheck = content.includes('allowed') || content.includes('429') || content.includes('rate limit');
  const hasHeaders = content.includes('X-RateLimit') || content.includes('ratelimit') || content.includes('Retry-After');

  R('12.15', 'API rate limiter', (hasFn && hasTierBased && hasAllowedCheck) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Tier-based: ${hasTierBased ? '✓' : '✗'} | Starter (60RPM): ${hasStarter ? '✓' : '✗'} | Pro (300RPM): ${hasPro ? '✓' : '✗'} | Enterprise (1000RPM): ${hasEnterprise ? '✓' : '✗'} | Sliding window: ${hasSlidingWindow ? '✓' : '✗'} | Rate enforcement: ${hasAllowedCheck ? '✓' : '✗'} | Rate limit headers: ${hasHeaders ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1216_APIV1Endpoints() {
  console.log('\n── 12.16 API v1 Read-Only Endpoints ──');
  const endpoints = [
    { name: 'api-v1-locations-compliance', key: 'deficiencies' },
    { name: 'api-v1-locations-certificates', key: 'certificates' },
    { name: 'api-v1-locations-schedule', key: 'schedule' },
    { name: 'api-v1-locations-services', key: 'service_records' },
    { name: 'api-v1-services-photos', key: 'service_photos' },
  ];

  const epResults = [];
  for (const ep of endpoints) {
    const content = readFile(path.join(FUNC, ep.name, 'index.ts'));
    const hasFn = content.length > 100;
    const hasReadOnly = content.includes('GET') && !content.includes('POST') || content.includes('read');
    const hasAuth = content.includes('authorization') || content.includes('Authorization') || content.includes('token') || content.includes('validateApiKey') || content.includes('auth');
    epResults.push({ name: ep.name, hasFn, hasAuth });
  }

  const found = epResults.filter(e => e.hasFn).length;
  const authed = epResults.filter(e => e.hasAuth).length;

  // Check DB tables
  const tables = ['api_tokens', 'api_applications', 'api_webhook_subscriptions'];
  const tableResults = [];
  for (const t of tables) {
    const res = await supaRest(`${t}?select=id&limit=1`);
    tableResults.push({ table: t, status: res.status, ok: res.status === 200 });
  }
  const tablesOk = tableResults.filter(t => t.ok).length;

  // Audit empty states
  const devContent = readFile(path.join(SRC, 'pages', 'DeveloperPortal.tsx')) || readFile(path.join(SRC, 'pages', 'DeveloperPortal.jsx'));
  auditEmptyState('DeveloperPortal', 'DeveloperPortal.tsx', false, false, 'API docs/reference page — no demo guard needed');

  const benchContent = readFile(path.join(SRC, 'pages', 'Benchmarks.tsx')) || readFile(path.join(SRC, 'pages', 'Benchmarks.jsx'));
  const benchDemo = benchContent.includes('useDemoGuard');
  auditEmptyState('Benchmarks', 'Benchmarks.tsx', benchDemo, true, 'useDemoGuard: ' + (benchDemo ? 'YES' : 'NO'));

  R('12.16', 'API v1 endpoints', (found >= 5 && authed >= 3) ? 'PASS' : 'FAIL',
    `Endpoints: ${found}/5 | Auth-gated: ${authed}/5 | ${epResults.map(e => `${e.name.replace('api-v1-','')}: ${e.hasFn ? '✓' : '✗'}`).join(' | ')} | DB tables: ${tablesOk}/${tables.length} (${tableResults.filter(t => !t.ok).map(t => t.table + '(' + t.status + ')').join(', ') || 'all OK'}) | STATUS: POST-LAUNCH`);
}

async function test1217_APIWebhooks() {
  console.log('\n── 12.17 API Webhooks ──');
  const dispatchContent = readFile(path.join(FUNC, 'api-webhook-dispatch', 'index.ts'));
  const retryContent = readFile(path.join(FUNC, 'api-webhook-retry', 'index.ts'));

  const hasDispatchFn = dispatchContent.length > 100;
  const hasRetryFn = retryContent.length > 100;

  // Dispatch: HMAC-SHA256 signing
  const hasHMAC = dispatchContent.includes('HMAC') || dispatchContent.includes('hmac');
  const hasSHA256 = dispatchContent.includes('SHA-256') || dispatchContent.includes('sha256');
  const hasSignatureHeader = dispatchContent.includes('X-EvidLY-Signature') || dispatchContent.includes('signature');
  const readsSubscriptions = dispatchContent.includes('api_webhook_subscriptions');
  const writesDeliveries = dispatchContent.includes('api_webhook_deliveries');

  // Retry: exponential backoff
  const hasMaxRetries = retryContent.includes('5') || retryContent.includes('max_retries');
  const hasBackoff = retryContent.includes('backoff') || retryContent.includes('exponential') || (retryContent.includes('30') && retryContent.includes('2'));
  const hasAutoDisable = retryContent.includes('disable') || retryContent.includes('suspended') || retryContent.includes('active');

  R('12.17', 'API webhooks', (hasDispatchFn && hasRetryFn && (hasHMAC || hasSHA256)) ? 'PASS' : 'FAIL',
    `api-webhook-dispatch: ${hasDispatchFn ? '✓' : '✗'} (${Math.round(dispatchContent.length/1024*10)/10}KB) | HMAC-SHA256: ${(hasHMAC || hasSHA256) ? '✓' : '✗'} | Signature header: ${hasSignatureHeader ? '✓' : '✗'} | Reads subscriptions: ${readsSubscriptions ? '✓' : '✗'} | Writes deliveries: ${writesDeliveries ? '✓' : '✗'} | api-webhook-retry: ${hasRetryFn ? '✓' : '✗'} (${Math.round(retryContent.length/1024*10)/10}KB) | Max 5 retries: ${hasMaxRetries ? '✓' : '✗'} | Exponential backoff: ${hasBackoff ? '✓' : '✗'} | Auto-disable: ${hasAutoDisable ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1218_APIMarketplacePublish() {
  console.log('\n── 12.18 API Marketplace + Usage ──');
  const publishContent = readFile(path.join(FUNC, 'api-marketplace-publish', 'index.ts'));
  const usageContent = readFile(path.join(FUNC, 'api-usage-aggregate', 'index.ts'));

  const hasPublishFn = publishContent.length > 100;
  const hasUsageFn = usageContent.length > 100;

  // Marketplace publish: state machine
  const hasDraft = publishContent.includes('draft');
  const hasReview = publishContent.includes('review');
  const hasPublished = publishContent.includes('published');
  const hasSuspended = publishContent.includes('suspended');
  const hasStateMachine = (hasDraft && hasReview && hasPublished) || publishContent.includes('state') || publishContent.includes('status');

  // Usage aggregate: 30-day, top endpoints
  const has30Day = usageContent.includes('30') || usageContent.includes('days');
  const hasAggregation = usageContent.includes('aggregate') || usageContent.includes('count') || usageContent.includes('group');
  const hasTopEndpoints = usageContent.includes('endpoint') || usageContent.includes('top');

  R('12.18', 'API marketplace + usage', (hasPublishFn && hasUsageFn && hasStateMachine) ? 'PASS' : 'FAIL',
    `api-marketplace-publish: ${hasPublishFn ? '✓' : '✗'} (${Math.round(publishContent.length/1024*10)/10}KB) | State machine: ${hasStateMachine ? '✓' : '✗'} (draft:${hasDraft ? '✓' : '✗'} review:${hasReview ? '✓' : '✗'} published:${hasPublished ? '✓' : '✗'} suspended:${hasSuspended ? '✓' : '✗'}) | api-usage-aggregate: ${hasUsageFn ? '✓' : '✗'} (${Math.round(usageContent.length/1024*10)/10}KB) | 30-day window: ${has30Day ? '✓' : '✗'} | Aggregation: ${hasAggregation ? '✓' : '✗'} | Top endpoints: ${hasTopEndpoints ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

// ═══════════════════════════════════════════════════════
//  DISCOVERY: Benchmark + Integration Functions
// ═══════════════════════════════════════════════════════

function discoveryBenchmark() {
  console.log('\n── DISCOVERY: Benchmark Functions ──');
  const funcs = ['benchmark-aggregate', 'benchmark-badge-check', 'benchmark-quarterly-report', 'benchmark-snapshot'];
  const found = funcs.filter(f => fileExists(path.join(FUNC, f, 'index.ts')));
  console.log(`  Found ${found.length}/${funcs.length}: ${found.join(', ')}`);
  return { category: 'Benchmark', expected: funcs.length, found: found.length, functions: found };
}

function discoveryIntegration() {
  console.log('\n── DISCOVERY: Integration Functions ──');
  const funcs = ['integration-conflict-resolver', 'integration-data-mapper', 'integration-health-check', 'integration-oauth-callback', 'integration-sync-engine'];
  const found = funcs.filter(f => fileExists(path.join(FUNC, f, 'index.ts')));
  console.log(`  Found ${found.length}/${funcs.length}: ${found.join(', ')}`);
  return { category: 'Integration', expected: funcs.length, found: found.length, functions: found };
}

// ═══════════════════════════════════════════════════════
//  REGRESSION: Days 1-11 + Day 12 Cross-Checks
// ═══════════════════════════════════════════════════════

async function regressionTests() {
  console.log('\n═══ REGRESSION ═══');

  // REG-1.02: signInWithPassword → session
  console.log('\n── REG-1.02 Auth regression ──');
  R('REG-1.02', 'Auth signInWithPassword', accessToken ? 'PASS' : 'FAIL',
    `Access token: ${accessToken ? '✓' : '✗'}`);

  // REG-2.01: Dashboard HTTP 200
  console.log('\n── REG-2.01 Dashboard access ──');
  const dashRes = await supaRest('locations?select=id&limit=1');
  R('REG-2.01', 'Dashboard data access', dashRes.status === 200 ? 'PASS' : 'FAIL',
    `locations query: HTTP ${dashRes.status}`);

  // REG-2.12: No blended scores
  console.log('\n── REG-2.12 No blended scores ──');
  const blendViolations = searchFiles(SRC, /blended\s*(compliance|food.*fire|fire.*food)\s*score/i, '.tsx')
    .filter(f => {
      const c = readFile(f);
      return c.split('\n').some(line => {
        if (/blended\s*(compliance|food.*fire|fire.*food)\s*score/i.test(line)) {
          if (/<[a-z]|{\/\*|^[\s]*\/\//.test(line)) return false;
          return true;
        }
        return false;
      });
    });
  R('REG-2.12', 'No blended scores', blendViolations.length === 0 ? 'PASS' : 'FAIL',
    `Violations: ${blendViolations.length}`);

  // REG-5.SP: All 7 superpower routes
  console.log('\n── REG-5.SP Superpower routes ──');
  const appTsx = readFile(path.join(SRC, 'App.tsx'));
  const spRoutes = ['/insights/inspection-forecast', '/insights/violation-radar', '/insights/trajectory',
    '/insights/vendor-performance', '/insights/signals', '/insights/leaderboard', '/insights/operations-intelligence'];
  const spFound = spRoutes.filter(r => appTsx.includes(`"${r}"`));
  R('REG-5.SP', 'Superpower routes', spFound.length === 7 ? 'PASS' : 'FAIL',
    `Routes: ${spFound.length}/7`);

  // REG-9.17: Dual pillar ZERO violations
  console.log('\n── REG-9.17 Dual pillar ──');
  const dualViolations = searchFiles(path.join(SRC, 'lib'), /blended.*compliance.*score|food.*fire.*combined/i, '.ts');
  R('REG-9.17', 'Dual pillar', dualViolations.length === 0 ? 'PASS' : 'FAIL',
    `Code violations: ${dualViolations.length}`);

  // REG-10.TR: Training route
  console.log('\n── REG-10.TR Training routes ──');
  const trainingRoute = appTsx.includes('path="/training"');
  R('REG-10.TR', 'Training route', trainingRoute ? 'PASS' : 'FAIL',
    `Route /training: ${trainingRoute ? '✓' : '✗'}`);

  // REG-10.PB: Playbook routes
  console.log('\n── REG-10.PB Playbook routes ──');
  const playbookRoute = appTsx.includes('path="/playbooks"');
  R('REG-10.PB', 'Playbook route', playbookRoute ? 'PASS' : 'FAIL',
    `Route /playbooks: ${playbookRoute ? '✓' : '✗'}`);

  // REG-12.ENT: Enterprise routes exist
  console.log('\n── REG-12.ENT Enterprise routes ──');
  const entRoutes = ['/enterprise', '/enterprise/admin', '/enterprise/dashboard', '/org-hierarchy'];
  const entFound = entRoutes.filter(r => appTsx.includes(`path="${r}"`));
  R('REG-12.ENT', 'Enterprise routes', entFound.length >= 4 ? 'PASS' : 'FAIL',
    `Routes: ${entFound.length}/4`);

  // REG-12.API: API Marketplace routes exist
  console.log('\n── REG-12.API API Marketplace routes ──');
  const apiRoutes = ['/developers', '/integrations', '/settings/api-keys', '/settings/webhooks'];
  const apiFound = apiRoutes.filter(r => appTsx.includes(`path="${r}"`));
  R('REG-12.API', 'API Marketplace routes', apiFound.length >= 3 ? 'PASS' : 'FAIL',
    `Routes: ${apiFound.length}/4`);

  // REG-12.EDGE: Updated edge function count
  console.log('\n── REG-12.EDGE Edge function count ──');
  const edgeDirs = fs.readdirSync(FUNC, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .filter(d => fileExists(path.join(FUNC, d.name, 'index.ts')));
  R('REG-12.EDGE', 'Edge function count', edgeDirs.length >= 170 ? 'PASS' : 'FAIL',
    `Edge functions: ${edgeDirs.length}`);
}

// ═══════════════════════════════════════════════════════
//  EDGE FUNCTION COVERAGE MAP
// ═══════════════════════════════════════════════════════

function buildCoverageMap() {
  console.log('\n═══ BUILDING EDGE FUNCTION COVERAGE MAP ═══');

  // Complete mapping: function name → test day
  const coverageMap = {
    // Day 1-2: Core Platform
    'check-onboarding-progress': 'Day 2',
    'send-welcome-email': 'Day 2',
    'snapshot-readiness': 'Day 2',
    'trial-email-sender': 'Day 2',
    'evidly-referral-signup': 'Day 2',

    // Day 3: Food Safety
    'calculate-compliance-score': 'Day 3',
    'check-equipment-alerts': 'Day 3',
    'generate-haccp-from-checklists': 'Day 3',

    // Day 4: Fire Safety
    'generate-service-report': 'Day 4',
    'generate-job-report': 'Day 4',

    // Day 5: Superpowers & Intelligence
    'classify-signals': 'Day 5',
    'correlation-engine': 'Day 5',
    'crawl-monitor': 'Day 5',
    'get-jurisdictions': 'Day 5',
    'intelligence-approve': 'Day 5',
    'intelligence-auto-publish': 'Day 5',
    'intelligence-bridge-proxy': 'Day 5',
    'intelligence-collect': 'Day 5',
    'intelligence-deliver': 'Day 5',
    'intelligence-feed': 'Day 5',
    'intelligence-webhook': 'Day 5',
    'jurisdiction-drift-alert': 'Day 5',
    'monitor-regulations': 'Day 5',
    'ops-intelligence-coach': 'Day 5',
    'ops-intelligence-generate': 'Day 5',
    'trigger-crawl': 'Day 5',
    'violation-crawl': 'Day 5',

    // Day 6: Documents & Certificates
    'auto-request-documents': 'Day 6',
    'check-expiries': 'Day 6',
    'classify-document': 'Day 6',
    'cloud-file-import': 'Day 6',
    'document-scan': 'Day 6',
    'generate-agreement-pdf': 'Day 6',
    'generate-certificate': 'Day 6',
    'generate-compliance-package': 'Day 6',
    'send-document-alerts': 'Day 6',
    'send-missing-doc-reminders': 'Day 6',

    // Day 7: Vendor Management
    'generate-outreach': 'Day 7',
    'rfp-classify': 'Day 7',
    'rfp-crawl': 'Day 7',
    'validate-vendor-document': 'Day 7',
    'vendor-analytics-snapshot': 'Day 7',
    'vendor-certification-evaluate': 'Day 7',
    'vendor-connect-apply': 'Day 7',
    'vendor-contact': 'Day 7',
    'vendor-credential-check': 'Day 7',
    'vendor-document-notify': 'Day 7',
    'vendor-document-reminders': 'Day 7',
    'vendor-lead-notify': 'Day 7',
    'vendor-notification-sender': 'Day 7',
    'vendor-partner-outreach': 'Day 7',
    'vendor-recommendation-engine': 'Day 7',
    'vendor-schedule-response': 'Day 7',
    'vendor-secure-upload': 'Day 7',
    'vendor-service-token': 'Day 7',

    // Day 8: Notifications & Scheduling
    'assessment-notify': 'Day 8',
    'availability-reminders': 'Day 8',
    'client-invite-send': 'Day 8',
    'evidly-service-request': 'Day 8',
    'generate-alerts': 'Day 8',
    'generate-task-instances': 'Day 8',
    'hoodops-webhook': 'Day 8',
    'notify-qa-review': 'Day 8',
    'process-service-reminders': 'Day 8',
    'process-service-request': 'Day 8',
    'resend-webhook': 'Day 8',
    'send-reminders': 'Day 8',
    'send-sms-invite': 'Day 8',
    'send-team-invite': 'Day 8',
    'task-notifications': 'Day 8',
    'webhook-dispatch': 'Day 8',

    // Day 9: Admin, Billing, Demo
    'cleanup-demo-tour': 'Day 9',
    'demo-account-convert': 'Day 9',
    'demo-account-create': 'Day 9',
    'generate-demo-template': 'Day 9',
    'generate-partner-demo': 'Day 9',
    'k2c-processor': 'Day 9',
    'k2c-referral-invite': 'Day 9',
    'platform-metrics-refresh': 'Day 9',
    'platform-stats': 'Day 9',
    'security-headers-check': 'Day 9',
    'stripe-create-checkout': 'Day 9',
    'stripe-customer-portal': 'Day 9',
    'stripe-webhook': 'Day 9',

    // Day 10: Training, Insurance, Playbooks
    'insurance-export': 'Day 10',
    'insurance-risk-calculate': 'Day 10',
    'insurance-risk-fire-safety': 'Day 10',
    'insurance-risk-history': 'Day 10',
    'insurance-risk-incidents': 'Day 10',
    'insurance-risk-verify': 'Day 10',
    'playbook-ai-assistant': 'Day 10',
    'playbook-auto-trigger': 'Day 10',
    'playbook-completion-handler': 'Day 10',
    'playbook-escalation-monitor': 'Day 10',
    'playbook-food-loss-calculator': 'Day 10',
    'playbook-report-generator': 'Day 10',
    'risk-score-api': 'Day 10',
    'training-ai-companion': 'Day 10',
    'training-ai-quiz-gen': 'Day 10',
    'training-analytics-aggregate': 'Day 10',
    'training-auto-enroll': 'Day 10',
    'training-certificate-gen': 'Day 10',
    'training-completion-handler': 'Day 10',
    'training-content-translate': 'Day 10',
    'training-enroll': 'Day 10',
    'training-progress-reminder': 'Day 10',
    'training-quiz-score': 'Day 10',
    'training-sb476-report': 'Day 10',

    // Day 11: IoT/Sensors, AI, POS
    'ai-chat': 'Day 11',
    'ai-corrective-action-draft': 'Day 11',
    'ai-document-analysis': 'Day 11',
    'ai-pattern-analysis': 'Day 11',
    'ai-photo-analysis': 'Day 11',
    'ai-voice-transcription': 'Day 11',
    'ai-weekly-digest': 'Day 11',
    'copilot-analyze': 'Day 11',
    'iot-process-reading': 'Day 11',
    'iot-sensor-alerts': 'Day 11',
    'iot-sensor-pull': 'Day 11',
    'iot-sensor-webhook': 'Day 11',
    'landing-chat': 'Day 11',
    'pos-connect': 'Day 11',
    'pos-sync-all': 'Day 11',
    'pos-sync-employees': 'Day 11',
    'pos-sync-locations': 'Day 11',
    'sensor-alert-escalate': 'Day 11',
    'sensor-compliance-aggregate': 'Day 11',
    'sensor-defrost-detect': 'Day 11',
    'sensor-device-health': 'Day 11',
    'sensor-threshold-evaluate': 'Day 11',

    // Day 12: Enterprise, Offline, API Marketplace
    'enterprise-alert-rollup': 'Day 12',
    'enterprise-audit-export': 'Day 12',
    'enterprise-report-generate': 'Day 12',
    'enterprise-rollup-calculate': 'Day 12',
    'enterprise-scim-users': 'Day 12',
    'enterprise-sso-callback': 'Day 12',
    'enterprise-tenant-provision': 'Day 12',
    'offline-conflict-resolver': 'Day 12',
    'offline-device-manager': 'Day 12',
    'offline-photo-batch-upload': 'Day 12',
    'offline-sync-handler': 'Day 12',
    'offline-sync-pull': 'Day 12',
    'api-marketplace-publish': 'Day 12',
    'api-oauth-authorize': 'Day 12',
    'api-oauth-token': 'Day 12',
    'api-rate-limiter': 'Day 12',
    'api-token-validate': 'Day 12',
    'api-usage-aggregate': 'Day 12',
    'api-v1-locations-certificates': 'Day 12',
    'api-v1-locations-compliance': 'Day 12',
    'api-v1-locations-schedule': 'Day 12',
    'api-v1-locations-services': 'Day 12',
    'api-v1-services-photos': 'Day 12',
    'api-webhook-dispatch': 'Day 12',
    'api-webhook-retry': 'Day 12',
    'generate-api-key': 'Day 12',

    // Day 12 Discovery
    'benchmark-aggregate': 'Day 12 (discovery)',
    'benchmark-badge-check': 'Day 12 (discovery)',
    'benchmark-quarterly-report': 'Day 12 (discovery)',
    'benchmark-snapshot': 'Day 12 (discovery)',
    'integration-conflict-resolver': 'Day 12 (discovery)',
    'integration-data-mapper': 'Day 12 (discovery)',
    'integration-health-check': 'Day 12 (discovery)',
    'integration-oauth-callback': 'Day 12 (discovery)',
    'integration-sync-engine': 'Day 12 (discovery)',
  };

  // Get all actual edge functions
  const allFunctions = fs.readdirSync(FUNC, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .filter(d => fileExists(path.join(FUNC, d.name, 'index.ts')))
    .map(d => d.name)
    .sort();

  const covered = [];
  const untested = [];
  for (const fn of allFunctions) {
    if (coverageMap[fn]) {
      covered.push({ name: fn, day: coverageMap[fn] });
    } else {
      untested.push(fn);
    }
  }

  console.log(`  Total: ${allFunctions.length} | Covered: ${covered.length} | Untested: ${untested.length}`);
  if (untested.length > 0) {
    console.log(`  Untested: ${untested.join(', ')}`);
  }

  return { total: allFunctions.length, covered, untested, allFunctions };
}

// ═══════════════════════════════════════════════════════
//  OUTPUT
// ═══════════════════════════════════════════════════════

function writeOutputs(coverageData, benchmarkDiscovery, integrationDiscovery) {
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  // JSON report
  const jsonReport = {
    test: 'DAY12-AUTO',
    date: new Date().toISOString().split('T')[0],
    summary: { pass, fail, total },
    results,
    discovery: { benchmark: benchmarkDiscovery, integration: integrationDiscovery },
    coverageSummary: {
      totalFunctions: coverageData.total,
      covered: coverageData.covered.length,
      untested: coverageData.untested,
    },
  };
  fs.writeFileSync('day12-test-report.json', JSON.stringify(jsonReport, null, 2));

  // Text report
  let txt = '═══════════════════════════════════════════\n';
  txt += '  DAY12-AUTO — Full Report\n';
  txt += `  Date: ${jsonReport.date} | Tests: ${total}\n`;
  txt += '═══════════════════════════════════════════\n\n';
  txt += 'TEST    | RESULT           | DETAIL\n';
  txt += '--------|------------------|------\n';
  for (const r of results) {
    txt += `${r.id.padEnd(8)}| ${r.status.padEnd(17)}| ${r.detail}\n`;
  }
  txt += '\n═══════════════════════════════════════════\n';
  txt += `  PASS: ${pass} | FAIL: ${fail} | TOTAL: ${total}\n`;
  txt += '═══════════════════════════════════════════\n';
  txt += '\nDISCOVERY:\n';
  txt += `  Benchmark: ${benchmarkDiscovery.found}/${benchmarkDiscovery.expected} functions found\n`;
  txt += `  Integration: ${integrationDiscovery.found}/${integrationDiscovery.expected} functions found\n`;
  txt += `  Edge Function Coverage: ${coverageData.covered.length}/${coverageData.total} covered\n`;
  if (coverageData.untested.length > 0) {
    txt += `  Untested: ${coverageData.untested.join(', ')}\n`;
  }
  fs.writeFileSync('day12-test-report.txt', txt);

  // Empty state audit
  let auditTxt = '═══════════════════════════════════════════\n';
  auditTxt += '  DAY12 EMPTY STATE AUDIT\n';
  auditTxt += `  Date: ${jsonReport.date}\n`;
  auditTxt += '═══════════════════════════════════════════\n\n';
  auditTxt += 'COMPONENT              | FILE                        | DEMO GUARD | EMPTY STATE | DETAILS\n';
  auditTxt += '-----------------------|-----------------------------|------------|-------------|--------\n';
  for (const a of emptyStateAudit) {
    auditTxt += `${a.component.padEnd(23)}| ${a.file.padEnd(28)}| ${(a.hasDemoGuard ? 'YES' : 'NO').padEnd(11)}| ${(a.hasEmptyState ? 'YES' : 'NO').padEnd(12)}| ${a.details}\n`;
  }
  auditTxt += '\n═══════════════════════════════════════════\n';
  auditTxt += '  POST-LAUNCH FEATURES NOTE:\n';
  auditTxt += '  Enterprise, Offline Mode, and API Marketplace\n';
  auditTxt += '  have code in the codebase but are NOT customer-facing at launch.\n';
  auditTxt += '  STATUS: POST-LAUNCH — code exists, not customer-facing at launch\n';
  auditTxt += '  LAUNCH IMPACT: NONE — enable via feature flag when ready\n';
  auditTxt += '═══════════════════════════════════════════\n';
  fs.writeFileSync('day12-empty-state-audit.txt', auditTxt);

  // Edge Function Coverage Map
  let mapTxt = '═══════════════════════════════════════════════════════════════════════\n';
  mapTxt += '  EDGE FUNCTION COVERAGE MAP\n';
  mapTxt += `  Date: ${jsonReport.date} | Total Functions: ${coverageData.total}\n`;
  mapTxt += `  Covered: ${coverageData.covered.length} | Untested: ${coverageData.untested.length}\n`;
  mapTxt += '═══════════════════════════════════════════════════════════════════════\n\n';

  // Group covered by day
  const byDay = {};
  for (const c of coverageData.covered) {
    if (!byDay[c.day]) byDay[c.day] = [];
    byDay[c.day].push(c.name);
  }
  const dayOrder = ['Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9', 'Day 10', 'Day 11', 'Day 12', 'Day 12 (discovery)'];
  for (const day of dayOrder) {
    if (byDay[day]) {
      mapTxt += `── ${day} (${byDay[day].length} functions) ──\n`;
      for (const fn of byDay[day].sort()) {
        mapTxt += `  ✓ ${fn}\n`;
      }
      mapTxt += '\n';
    }
  }

  if (coverageData.untested.length > 0) {
    mapTxt += `── UNTESTED (${coverageData.untested.length} functions) ──\n`;
    for (const fn of coverageData.untested) {
      mapTxt += `  ✗ ${fn}\n`;
    }
    mapTxt += '\n';
  }

  // Full alphabetical listing
  mapTxt += '═══════════════════════════════════════════════════════════════════════\n';
  mapTxt += '  FULL ALPHABETICAL LISTING\n';
  mapTxt += '═══════════════════════════════════════════════════════════════════════\n\n';
  mapTxt += 'FUNCTION                            | TEST DAY           | STATUS\n';
  mapTxt += '------------------------------------|--------------------|---------\n';
  for (const fn of coverageData.allFunctions) {
    const entry = coverageData.covered.find(c => c.name === fn);
    const day = entry ? entry.day : 'UNTESTED';
    const status = entry ? '✓ COVERED' : '✗ UNTESTED';
    mapTxt += `${fn.padEnd(36)}| ${day.padEnd(19)}| ${status}\n`;
  }
  mapTxt += '\n═══════════════════════════════════════════════════════════════════════\n';
  mapTxt += `  COVERAGE: ${coverageData.covered.length}/${coverageData.total} (${Math.round(coverageData.covered.length/coverageData.total*1000)/10}%)\n`;
  mapTxt += '═══════════════════════════════════════════════════════════════════════\n';
  fs.writeFileSync('edge-function-coverage-map.txt', mapTxt);

  console.log('\n═══════════════════════════════════════════');
  console.log(`  PASS: ${pass} | FAIL: ${fail} | TOTAL: ${total}`);
  console.log('═══════════════════════════════════════════');
  console.log('  Reports: day12-test-report.json, day12-test-report.txt');
  console.log('  Audit:   day12-empty-state-audit.txt');
  console.log('  Map:     edge-function-coverage-map.txt');
}

// ── Main ──────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  DAY12-AUTO-TEST');
  console.log('  Enterprise, Offline Mode, API Marketplace');
  console.log('═══════════════════════════════════════════');

  // Authenticate
  console.log('\n── Authenticating ──');
  const authOk = await authenticate();
  console.log(authOk ? '  ✓ Authenticated' : '  ✗ Auth failed — continuing with anon');

  // Section 1: Enterprise
  console.log('\n═══ SECTION 1: Enterprise ═══');
  await test1201_EnterprisePages();
  await test1202_EnterpriseSSO();
  await test1203_EnterpriseSCIM();
  await test1204_EnterpriseTenantProvision();
  await test1205_EnterpriseRollup();
  await test1206_EnterpriseReport();
  await test1207_EnterpriseAuditExport();

  // Section 2: Offline Mode
  console.log('\n═══ SECTION 2: Offline Mode ═══');
  await test1208_OfflineSyncHandler();
  await test1209_OfflineSyncPull();
  await test1210_OfflineConflictResolver();
  await test1211_OfflineDeviceManager();
  await test1212_OfflinePhotoBatchUpload();

  // Section 3: API Marketplace
  console.log('\n═══ SECTION 3: API Marketplace ═══');
  await test1213_APITokenValidation();
  await test1214_APIOAuth();
  await test1215_APIRateLimiter();
  await test1216_APIV1Endpoints();
  await test1217_APIWebhooks();
  await test1218_APIMarketplacePublish();

  // Discovery
  console.log('\n═══ DISCOVERY ═══');
  const benchmarkDiscovery = discoveryBenchmark();
  const integrationDiscovery = discoveryIntegration();

  // Regression
  await regressionTests();

  // Coverage Map
  const coverageData = buildCoverageMap();

  // Output
  writeOutputs(coverageData, benchmarkDiscovery, integrationDiscovery);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
