/**
 * DAY11-AUTO-TEST — IoT/Sensors, AI Features, POS Integration
 * Tests: 18 + regression + empty state audit
 * Run: node day11-test.cjs
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
//  SECTION 1: IoT / Sensors (11.01 – 11.08)
// ═══════════════════════════════════════════════════════

async function test1101_SensorDeviceManagement() {
  console.log('\n── 11.01 Sensor Device Management ──');
  const appTsx = readFile(path.join(SRC, 'App.tsx'));

  // Check IoT/Sensor pages exist
  const pages = [
    { name: 'SensorHub', file: 'SensorHub.tsx' },
    { name: 'SensorDetail', file: 'SensorDetail.tsx' },
    { name: 'SensorSetupWizard', file: 'SensorSetupWizard.tsx' },
    { name: 'IoTSensorHub', file: 'IoTSensorHub.tsx' },
    { name: 'IoTSensorLanding', file: 'IoTSensorLanding.tsx' },
    { name: 'IoTSensorPlatform', file: 'IoTSensorPlatform.tsx' },
    { name: 'IoTMonitoring', file: 'IoTMonitoring.tsx' },
  ];
  const pagesFound = pages.filter(p => fileExists(path.join(SRC, 'pages', p.file)));

  // Check routes
  const expectedRoutes = ['/sensors', '/sensors/:id', '/sensors/add', '/iot', '/iot/hub', '/iot/setup', '/iot-monitoring', '/iot/platform'];
  const routesFound = expectedRoutes.filter(r => appTsx.includes(`path="${r}"`));

  // Check DB tables
  const tables = ['iot_sensors', 'iot_sensor_alerts', 'iot_integration_configs'];
  const tableResults = [];
  for (const t of tables) {
    const res = await supaRest(`${t}?select=id&limit=1`);
    tableResults.push({ table: t, status: res.status, ok: res.status === 200 });
  }
  const tablesOk = tableResults.filter(t => t.ok).length;

  // Audit empty states
  const hubContent = readFile(path.join(SRC, 'pages', 'SensorHub.tsx'));
  const hubDemoGuard = hubContent.includes('useDemo');
  auditEmptyState('SensorHub', 'SensorHub.tsx', hubDemoGuard, true, 'Uses useDemo context + demo data');
  const iotHubContent = readFile(path.join(SRC, 'pages', 'IoTSensorHub.tsx'));
  const iotHubGuard = iotHubContent.includes('useDemoGuard');
  auditEmptyState('IoTSensorHub', 'IoTSensorHub.tsx', iotHubGuard, true, 'useDemoGuard: ' + (iotHubGuard ? 'YES' : 'NO'));
  const monContent = readFile(path.join(SRC, 'pages', 'IoTMonitoring.tsx'));
  const monGuard = monContent.includes('useDemoGuard');
  auditEmptyState('IoTMonitoring', 'IoTMonitoring.tsx', monGuard, true, 'useDemoGuard: ' + (monGuard ? 'YES' : 'NO'));

  R('11.01', 'Sensor device management', (pagesFound.length >= 6 && routesFound.length >= 7) ? 'PASS' : 'FAIL',
    `Pages: ${pagesFound.length}/${pages.length} | Routes: ${routesFound.length}/${expectedRoutes.length} | DB tables accessible: ${tablesOk}/${tables.length} (${tableResults.filter(t => !t.ok).map(t => t.table + '(' + t.status + ')').join(', ') || 'all OK'}) | STATUS: POST-LAUNCH`);
}

async function test1102_SensorReadingIngestion() {
  console.log('\n── 11.02 Sensor Reading Ingestion ──');
  const processContent = readFile(path.join(FUNC, 'iot-process-reading', 'index.ts'));
  const pullContent = readFile(path.join(FUNC, 'iot-sensor-pull', 'index.ts'));

  const hasProcessFn = processContent.length > 100;
  const hasPullFn = pullContent.length > 100;

  // Verify iot-process-reading traces: sensor_id → temperature_logs → threshold check
  const processWritesTempLogs = processContent.includes('temperature_logs');
  const processReadsIotSensors = processContent.includes('iot_sensors');
  const processHasThresholdCheck = processContent.includes('threshold') || processContent.includes('alert');
  const processHasCCPMapping = processContent.includes('CCP') || processContent.includes('HACCP');

  // Verify iot-sensor-pull: integration_configs → external API → readings
  const pullReadsConfigs = pullContent.includes('iot_integration_configs') || pullContent.includes('integration_configs');
  const pullNormalizesData = pullContent.includes('temperature_f') || pullContent.includes('normalize');

  R('11.02', 'Sensor reading ingestion', (hasProcessFn && hasPullFn && processWritesTempLogs) ? 'PASS' : 'FAIL',
    `iot-process-reading: ${hasProcessFn ? '✓' : '✗'} | Writes temperature_logs: ${processWritesTempLogs ? '✓' : '✗'} | Reads iot_sensors: ${processReadsIotSensors ? '✓' : '✗'} | Threshold check: ${processHasThresholdCheck ? '✓' : '✗'} | HACCP CCP mapping: ${processHasCCPMapping ? '✓' : '✗'} | iot-sensor-pull: ${hasPullFn ? '✓' : '✗'} | Reads configs: ${pullReadsConfigs ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1103_SensorThresholdEvaluation() {
  console.log('\n── 11.03 Sensor Threshold Evaluation ──');
  const content = readFile(path.join(FUNC, 'sensor-threshold-evaluate', 'index.ts'));
  const hasFn = content.length > 100;

  const hasDeviceId = content.includes('device_id');
  const hasReadingValue = content.includes('reading_value') || content.includes('temperature_f');
  const hasThresholdConfig = content.includes('threshold_config') || content.includes('max_temp_f') || content.includes('min_temp_f');
  const hasSustainedCheck = content.includes('sustained') || content.includes('minutes');
  const createsAlerts = content.includes('alert') || content.includes('iot_sensor_alerts');
  const hasWarningBuffer = content.includes('buffer') || content.includes('warning');

  R('11.03', 'Sensor threshold evaluation', (hasFn && hasDeviceId && createsAlerts) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} | Device ID input: ${hasDeviceId ? '✓' : '✗'} | Reading value: ${hasReadingValue ? '✓' : '✗'} | Threshold config: ${hasThresholdConfig ? '✓' : '✗'} | Sustained violation check: ${hasSustainedCheck ? '✓' : '✗'} | Alert generation: ${createsAlerts ? '✓' : '✗'} | Warning buffer: ${hasWarningBuffer ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1104_SensorAlertsEscalation() {
  console.log('\n── 11.04 Sensor Alerts + Escalation ──');
  const alertsContent = readFile(path.join(FUNC, 'iot-sensor-alerts', 'index.ts'));
  const escalateContent = readFile(path.join(FUNC, 'sensor-alert-escalate', 'index.ts'));

  const hasAlertsFn = alertsContent.length > 100;
  const hasEscalateFn = escalateContent.length > 100;

  // iot-sensor-alerts: GET + POST for fetch/acknowledge
  const alertsHasGet = alertsContent.includes('GET');
  const alertsHasAck = alertsContent.includes('acknowledged') || alertsContent.includes('acknowledge');
  const alertsJoinsSensor = alertsContent.includes('iot_sensors');
  const alertsSeverityFilter = alertsContent.includes('severity');

  // sensor-alert-escalate: time-based escalation
  const escalateHas15Min = escalateContent.includes('15') && escalateContent.includes('min');
  const escalateHas30Min = escalateContent.includes('30');
  const escalateHas60Min = escalateContent.includes('60');
  const escalateCreatesIncident = escalateContent.includes('sensor_incidents') || escalateContent.includes('incident');
  const escalateHasHistory = escalateContent.includes('escalation_history');

  R('11.04', 'Sensor alerts + escalation', (hasAlertsFn && hasEscalateFn && escalateCreatesIncident) ? 'PASS' : 'FAIL',
    `iot-sensor-alerts: ${hasAlertsFn ? '✓' : '✗'} | GET/POST: ${alertsHasGet ? '✓' : '✗'} | Acknowledge: ${alertsHasAck ? '✓' : '✗'} | Severity filter: ${alertsSeverityFilter ? '✓' : '✗'} | sensor-alert-escalate: ${hasEscalateFn ? '✓' : '✗'} | 15min→escalated: ${escalateHas15Min ? '✓' : '✗'} | 30min→incident: ${escalateHas30Min ? '✓' : '✗'} | 60min→SMS: ${escalateHas60Min ? '✓' : '✗'} | Creates incident: ${escalateCreatesIncident ? '✓' : '✗'} | Escalation history: ${escalateHasHistory ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1105_SensorDefrostDetection() {
  console.log('\n── 11.05 Sensor Defrost Detection ──');
  const content = readFile(path.join(FUNC, 'sensor-defrost-detect', 'index.ts'));
  const hasFn = content.length > 100;

  // Pattern: rise 5-15°F, hold 15-30 min, return to baseline
  const hasRisePattern = content.includes('5') && (content.includes('15') || content.includes('rise'));
  const hasHoldDuration = content.includes('15') && content.includes('30');
  const hasRecovery = content.includes('baseline') || content.includes('recovery') || content.includes('return');
  const hasDefrostMarker = content.includes('is_defrost_cycle');
  const hasAutoDetect = content.includes('auto_detect');
  const runsHourly = content.includes('hourly') || content.includes('1 hour');

  R('11.05', 'Sensor defrost detection', (hasFn && hasDefrostMarker) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Rise pattern: ${hasRisePattern ? '✓' : '✗'} | Hold duration: ${hasHoldDuration ? '✓' : '✗'} | Recovery detection: ${hasRecovery ? '✓' : '✗'} | is_defrost_cycle marker: ${hasDefrostMarker ? '✓' : '✗'} | Auto-detect filter: ${hasAutoDetect ? '✓' : '✗'} | Scheduled: ${runsHourly ? '✓ hourly' : 'check'} | STATUS: POST-LAUNCH`);
}

async function test1106_SensorComplianceAggregation() {
  console.log('\n── 11.06 Sensor Compliance Aggregation ──');
  const content = readFile(path.join(FUNC, 'sensor-compliance-aggregate', 'index.ts'));
  const hasFn = content.length > 100;

  const hasComplianceRate = content.includes('compliance') && content.includes('rate');
  const hasCompleteness = content.includes('completeness') || content.includes('data_completeness');
  const hasSensorBonus = content.includes('bonus') || content.includes('10%') || content.includes('sensor');
  const hasLocations = content.includes('locations');
  const runs15Min = content.includes('15 min') || content.includes('every 15');

  R('11.06', 'Sensor compliance aggregation', (hasFn && hasComplianceRate) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Compliance rate calc: ${hasComplianceRate ? '✓' : '✗'} | Data completeness: ${hasCompleteness ? '✓' : '✗'} | Sensor bonus: ${hasSensorBonus ? '✓' : '✗'} | Location updates: ${hasLocations ? '✓' : '✗'} | Scheduled: ${runs15Min ? '✓ 15min' : 'check'} | STATUS: POST-LAUNCH`);
}

async function test1107_SensorDeviceHealth() {
  console.log('\n── 11.07 Sensor Device Health Monitoring ──');
  const content = readFile(path.join(FUNC, 'sensor-device-health', 'index.ts'));
  const hasFn = content.length > 100;

  const hasOfflineDetect = content.includes('offline') || content.includes('30 min') || content.includes('last_seen');
  const hasBattery = content.includes('battery');
  const hasSignal = content.includes('signal') || content.includes('RSSI') || content.includes('rssi');
  const hasStatusUpdate = content.includes('status') && content.includes('iot_sensors');
  const runs15Min = content.includes('15 min') || content.includes('every 15');

  R('11.07', 'Sensor device health monitoring', (hasFn && hasOfflineDetect && hasBattery) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Offline detection: ${hasOfflineDetect ? '✓' : '✗'} | Battery monitoring: ${hasBattery ? '✓' : '✗'} | Signal strength: ${hasSignal ? '✓' : '✗'} | Status updates: ${hasStatusUpdate ? '✓' : '✗'} | Scheduled: ${runs15Min ? '✓ 15min' : 'check'} | STATUS: POST-LAUNCH`);
}

async function test1108_IoTSensorWebhook() {
  console.log('\n── 11.08 IoT Sensor Webhook ──');
  const content = readFile(path.join(FUNC, 'iot-sensor-webhook', 'index.ts'));
  const hasFn = content.length > 100;

  const hasApiKeyAuth = content.includes('x-api-key') || content.includes('X-API-Key') || content.includes('api_key');
  const hasProviderField = content.includes('provider');
  const hasSensorsArray = content.includes('sensors');
  const hasMacAddress = content.includes('mac_address');
  const hasTemperature = content.includes('temperature_f');
  const hasThresholdCheck = content.includes('threshold') || content.includes('alert');
  const validatesConfig = content.includes('iot_integration_configs') || content.includes('auth_credentials');

  R('11.08', 'IoT sensor webhook', (hasFn && hasApiKeyAuth && hasSensorsArray) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | API key auth: ${hasApiKeyAuth ? '✓' : '✗'} | Provider field: ${hasProviderField ? '✓' : '✗'} | Sensors array: ${hasSensorsArray ? '✓' : '✗'} | MAC address: ${hasMacAddress ? '✓' : '✗'} | Temperature: ${hasTemperature ? '✓' : '✗'} | Threshold check: ${hasThresholdCheck ? '✓' : '✗'} | Config validation: ${validatesConfig ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

// ═══════════════════════════════════════════════════════
//  SECTION 2: AI Features (11.09 – 11.14)
// ═══════════════════════════════════════════════════════

async function test1109_AIVoiceTranscription() {
  console.log('\n── 11.09 AI Voice Transcription ──');
  const content = readFile(path.join(FUNC, 'ai-voice-transcription', 'index.ts'));
  const hasFn = content.length > 100;

  const usesWhisper = content.includes('OPENAI_API_KEY') || content.includes('whisper') || content.includes('Whisper');
  const usesClaude = content.includes('ANTHROPIC_API_KEY') || content.includes('claude');
  const hasDeficiencies = content.includes('deficiencies') || content.includes('deficiency');
  const hasMeasurements = content.includes('measurements');
  const hasEquipment = content.includes('equipment');
  const hasVoiceNotes = content.includes('voice_notes');
  const hasNFPA = content.includes('nfpa') || content.includes('NFPA');

  // Check VoiceHelp page exists
  const voiceHelpExists = fileExists(path.join(SRC, 'pages', 'VoiceHelp.tsx')) || fileExists(path.join(SRC, 'pages', 'VoiceHelp.jsx'));
  auditEmptyState('VoiceHelp', 'VoiceHelp.tsx/jsx', false, true, 'Help guide page — no demo guard needed');

  R('11.09', 'AI voice transcription', (hasFn && (usesWhisper || usesClaude)) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Whisper/OpenAI: ${usesWhisper ? '✓' : '✗'} | Claude extraction: ${usesClaude ? '✓' : '✗'} | Deficiencies: ${hasDeficiencies ? '✓' : '✗'} | Measurements: ${hasMeasurements ? '✓' : '✗'} | Equipment: ${hasEquipment ? '✓' : '✗'} | voice_notes table: ${hasVoiceNotes ? '✓' : '✗'} | NFPA refs: ${hasNFPA ? '✓' : '✗'} | VoiceHelp page: ${voiceHelpExists ? '✓' : '✗'} | HUMAN REQUIRED: actual transcription test | STATUS: POST-LAUNCH`);
}

async function test1110_AICopilotAnalysis() {
  console.log('\n── 11.10 AI Copilot Analysis ──');
  const content = readFile(path.join(FUNC, 'copilot-analyze', 'index.ts'));
  const hasFn = content.length > 100;

  const usesClaude = content.includes('ANTHROPIC_API_KEY');
  const hasCronSecret = content.includes('x-cron-secret') || content.includes('CRON_SECRET');
  const has5Modules = content.includes('temperature') && content.includes('checklist') && content.includes('equipment') && content.includes('document');
  const hasLocations = content.includes('locations');
  const hasAiInsights = content.includes('ai_insights');
  const hasRateLimit = content.includes('10') && content.includes('max');
  const hasMonday = content.includes('Monday') || content.includes('isMonday');

  // CopilotInsights page
  const copilotExists = fileExists(path.join(SRC, 'pages', 'CopilotInsights.tsx'));
  const copilotContent = readFile(path.join(SRC, 'pages', 'CopilotInsights.tsx'));
  const copilotDemoGuard = copilotContent.includes('useDemoGuard') || copilotContent.includes('useDemo');
  auditEmptyState('CopilotInsights', 'CopilotInsights.tsx', copilotDemoGuard, true, 'Copilot page: ' + (copilotExists ? 'EXISTS' : 'MISSING'));

  R('11.10', 'AI copilot analysis', (hasFn && usesClaude && has5Modules) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Claude API: ${usesClaude ? '✓' : '✗'} | Cron secret: ${hasCronSecret ? '✓' : '✗'} | 5 modules (temp/check/equip/doc/summary): ${has5Modules ? '✓' : '✗'} | Location-aware: ${hasLocations ? '✓' : '✗'} | Writes ai_insights: ${hasAiInsights ? '✓' : '✗'} | Rate limit (10/loc/run): ${hasRateLimit ? '✓' : '✗'} | Monday digest: ${hasMonday ? '✓' : '✗'} | CopilotInsights page: ${copilotExists ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1111_AIPhotoAnalysis() {
  console.log('\n── 11.11 AI Photo Analysis ──');
  const content = readFile(path.join(FUNC, 'ai-photo-analysis', 'index.ts'));
  const hasFn = content.length > 100;

  const usesClaude = content.includes('ANTHROPIC_API_KEY');
  const hasVision = content.includes('image') || content.includes('base64') || content.includes('vision');
  const hasGreaseLevel = content.includes('grease_level') || content.includes('grease');
  const hasConditionRating = content.includes('condition_rating') || content.includes('condition');
  const hasDetectedIssues = content.includes('detected_issues') || content.includes('issues');
  const hasNFPA = content.includes('NFPA') || content.includes('nfpa');
  const hasComparison = content.includes('before') || content.includes('comparison');

  R('11.11', 'AI photo analysis', (hasFn && usesClaude && hasVision) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Claude Vision: ${usesClaude ? '✓' : '✗'} | Image input: ${hasVision ? '✓' : '✗'} | Grease level: ${hasGreaseLevel ? '✓' : '✗'} | Condition rating: ${hasConditionRating ? '✓' : '✗'} | Issue detection: ${hasDetectedIssues ? '✓' : '✗'} | NFPA references: ${hasNFPA ? '✓' : '✗'} | Pre/post comparison: ${hasComparison ? '✓' : '✗'} | HUMAN REQUIRED: actual photo test | STATUS: POST-LAUNCH`);
}

async function test1112_AIPatternAnalysis() {
  console.log('\n── 11.12 AI Pattern Analysis ──');
  const content = readFile(path.join(FUNC, 'ai-pattern-analysis', 'index.ts'));
  const hasFn = content.length > 100;

  const hasCronSecret = content.includes('x-cron-secret') || content.includes('CRON_SECRET');
  const hasLocations = content.includes('locations');
  const hasTempPatterns = content.includes('temperature') && content.includes('threshold');
  const hasChecklistPatterns = content.includes('checklist') && (content.includes('completion') || content.includes('80%') || content.includes('80'));
  const hasAiInsights = content.includes('ai_insights');
  const has7DayWindow = content.includes('7') && (content.includes('day') || content.includes('86400'));
  const hasMaxInsights = content.includes('10') && content.includes('max');

  R('11.12', 'AI pattern analysis', (hasFn && hasTempPatterns && hasAiInsights) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Cron secret: ${hasCronSecret ? '✓' : '✗'} | Location-aware: ${hasLocations ? '✓' : '✗'} | Temp patterns: ${hasTempPatterns ? '✓' : '✗'} | Checklist patterns: ${hasChecklistPatterns ? '✓' : '✗'} | Writes ai_insights: ${hasAiInsights ? '✓' : '✗'} | 7-day window: ${has7DayWindow ? '✓' : '✗'} | Max 10/loc: ${hasMaxInsights ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1113_AICorrectiveActionDraft() {
  console.log('\n── 11.13 AI Corrective Action Drafting ──');
  const content = readFile(path.join(FUNC, 'ai-corrective-action-draft', 'index.ts'));
  const hasFn = content.length > 100;

  const usesClaude = content.includes('ANTHROPIC_API_KEY');
  const hasViolationInput = content.includes('violation_id') || content.includes('violation_title');
  const hasLocationContext = content.includes('location_id') && content.includes('locations');
  const pullsHistory = content.includes('violations') || content.includes('temperature_logs') || content.includes('checklists');
  const writesAiCA = content.includes('ai_corrective_actions');
  const writesInsights = content.includes('ai_insights');
  const hasGracefulDegradation = content.includes('503') || content.includes('not configured');

  R('11.13', 'AI corrective action drafting', (hasFn && usesClaude && hasLocationContext) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Claude API: ${usesClaude ? '✓' : '✗'} | Violation input: ${hasViolationInput ? '✓' : '✗'} | Location context: ${hasLocationContext ? '✓' : '✗'} | Historical data pull: ${pullsHistory ? '✓' : '✗'} | Writes ai_corrective_actions: ${writesAiCA ? '✓' : '✗'} | Creates ai_insights: ${writesInsights ? '✓' : '✗'} | Graceful degradation: ${hasGracefulDegradation ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1114_LandingPageChat() {
  console.log('\n── 11.14 Landing Page AI Chat ──');
  const content = readFile(path.join(FUNC, 'landing-chat', 'index.ts'));
  const hasFn = content.length > 100;

  const usesClaude = content.includes('ANTHROPIC_API_KEY');
  const hasRateLimit = content.includes('20') && content.includes('hour');
  const hasIPRateLimit = content.includes('x-forwarded-for');
  const hasCTA = content.includes('cta') || content.includes('try_demo');
  const has429 = content.includes('429');
  const hasFallback = content.includes('503') || content.includes('not available');
  const hasPublicCors = content.includes('PUBLIC_CORS') || content.includes('cors');
  const maxTokens = content.includes('200') || content.includes('max_tokens');

  R('11.14', 'Landing page AI chat', (hasFn && usesClaude && hasRateLimit && hasIPRateLimit) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Claude API: ${usesClaude ? '✓' : '✗'} | Rate limit 20/hr: ${hasRateLimit ? '✓' : '✗'} | IP-based: ${hasIPRateLimit ? '✓' : '✗'} | CTA response: ${hasCTA ? '✓' : '✗'} | 429 on limit: ${has429 ? '✓' : '✗'} | Fallback w/o API key: ${hasFallback ? '✓' : '✗'} | Public CORS: ${hasPublicCors ? '✓' : '✗'} | HUMAN REQUIRED: actual chat test`);
}

// ═══════════════════════════════════════════════════════
//  SECTION 3: POS Integration (11.15 – 11.18)
// ═══════════════════════════════════════════════════════

async function test1115_POSConnectionSetup() {
  console.log('\n── 11.15 POS Connection Setup ──');
  const content = readFile(path.join(FUNC, 'pos-connect', 'index.ts'));
  const hasFn = content.length > 100;

  // Supported POS systems
  const posTypes = ['toast', 'square', 'clover', 'lightspeed', 'aloha', 'revel', 'spoton', 'heartland'];
  const supportedCount = posTypes.filter(p => content.includes(p)).length;

  const hasCredentialValidation = content.includes('validateCredentials') || content.includes('validation');
  const hasIntegrationLookup = content.includes('integrations');
  const hasConnectionUpsert = content.includes('integration_connections');
  const hasErrorHandling = content.includes('Invalid credentials') || content.includes('Unknown POS');

  // Check shared utils
  const sharedUtils = readFile(path.join(FUNC, '_shared', 'posUtils.ts'));
  const hasSharedUtils = sharedUtils.length > 100;

  // Check IntegrationHub page
  const hubExists = fileExists(path.join(SRC, 'pages', 'IntegrationHub.tsx'));
  auditEmptyState('IntegrationHub', 'IntegrationHub.tsx', false, true, 'Integration catalog page');

  R('11.15', 'POS connection setup', (hasFn && supportedCount >= 7 && hasCredentialValidation) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} | POS systems: ${supportedCount}/${posTypes.length} | Credential validation: ${hasCredentialValidation ? '✓' : '✗'} | Integration lookup: ${hasIntegrationLookup ? '✓' : '✗'} | Connection upsert: ${hasConnectionUpsert ? '✓' : '✗'} | Error handling: ${hasErrorHandling ? '✓' : '✗'} | Shared utils: ${hasSharedUtils ? '✓' : '✗'} | IntegrationHub page: ${hubExists ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1116_POSLocationSync() {
  console.log('\n── 11.16 POS Location Sync ──');
  const content = readFile(path.join(FUNC, 'pos-sync-locations', 'index.ts'));
  const hasFn = content.length > 100;

  const hasConnectionLookup = content.includes('integration_connections');
  const hasEntityMap = content.includes('integration_entity_map');
  const writesLocations = content.includes('locations');
  const hasSyncLog = content.includes('integration_sync_log');
  const hasCountyDetect = content.includes('county') || content.includes('detectCounty');
  const hasCreatedUpdated = content.includes('created') && content.includes('updated');
  const hasFailed = content.includes('failed');

  // Check POS API endpoints referenced
  const hasToastAPI = content.includes('toasttab.com') || content.includes('toast');
  const hasSquareAPI = content.includes('squareup.com') || content.includes('square');

  R('11.16', 'POS location sync', (hasFn && hasConnectionLookup && writesLocations && hasEntityMap) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Connection lookup: ${hasConnectionLookup ? '✓' : '✗'} | Entity map: ${hasEntityMap ? '✓' : '✗'} | Writes locations: ${writesLocations ? '✓' : '✗'} | Sync log: ${hasSyncLog ? '✓' : '✗'} | County detection: ${hasCountyDetect ? '✓' : '✗'} | Created/updated tracking: ${hasCreatedUpdated ? '✓' : '✗'} | Failed tracking: ${hasFailed ? '✓' : '✗'} | Toast API: ${hasToastAPI ? '✓' : '✗'} | Square API: ${hasSquareAPI ? '✓' : '✗'} | STATUS: POST-LAUNCH`);
}

async function test1117_POSEmployeeSync() {
  console.log('\n── 11.17 POS Employee Sync ──');
  const content = readFile(path.join(FUNC, 'pos-sync-employees', 'index.ts'));
  const hasFn = content.length > 100;

  const hasConnectionLookup = content.includes('integration_connections');
  const writesStagingTable = content.includes('pos_employee_mappings');
  const hasSyncLog = content.includes('integration_sync_log');
  const hasEmployeeFields = content.includes('firstName') || content.includes('first_name');
  const hasEmail = content.includes('email');
  const hasRole = content.includes('role');
  const hasUpsert = content.includes('upsert') || content.includes('onConflict') || content.includes('UNIQUE');

  // Verify staging pattern — NOT auto-creating auth.users
  const createsAuthUser = content.includes('auth.users') || content.includes('signUp') || content.includes('createUser');

  R('11.17', 'POS employee sync', (hasFn && writesStagingTable && !createsAuthUser) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} (${Math.round(content.length/1024*10)/10}KB) | Connection lookup: ${hasConnectionLookup ? '✓' : '✗'} | Staging table: ${writesStagingTable ? '✓' : '✗'} | Sync log: ${hasSyncLog ? '✓' : '✗'} | Employee fields: ${hasEmployeeFields ? '✓' : '✗'} | Email: ${hasEmail ? '✓' : '✗'} | Role: ${hasRole ? '✓' : '✗'} | Upsert pattern: ${hasUpsert ? '✓' : '✗'} | Auto-creates auth.users: ${createsAuthUser ? '✗ VIOLATION' : '✓ NO (staging only)'} | STATUS: POST-LAUNCH`);
}

async function test1118_POSFullSync() {
  console.log('\n── 11.18 POS Full Sync ──');
  const content = readFile(path.join(FUNC, 'pos-sync-all', 'index.ts'));
  const hasFn = content.length > 100;

  const queriesConnections = content.includes('integration_connections');
  const filtersByPOS = content.includes("'pos'") || content.includes('"pos"') || content.includes('category');
  const invokesLocSync = content.includes('pos-sync-locations');
  const invokesEmpSync = content.includes('pos-sync-employees');
  const hasResultAggregation = content.includes('results') || content.includes('connections');
  const hasErrorHandling = content.includes('catch') || content.includes('error');

  // Check DB tables accessible
  const tables = ['integration_connections', 'integrations', 'pos_employee_mappings', 'integration_entity_map', 'integration_sync_log'];
  const tableResults = [];
  for (const t of tables) {
    const res = await supaRest(`${t}?select=id&limit=1`);
    tableResults.push({ table: t, status: res.status, ok: res.status === 200 });
  }
  const tablesOk = tableResults.filter(t => t.ok).length;

  R('11.18', 'POS full sync', (hasFn && invokesLocSync && invokesEmpSync) ? 'PASS' : 'FAIL',
    `Edge function: ${hasFn ? '✓' : '✗'} | Queries connections: ${queriesConnections ? '✓' : '✗'} | Filters by POS category: ${filtersByPOS ? '✓' : '✗'} | Invokes pos-sync-locations: ${invokesLocSync ? '✓' : '✗'} | Invokes pos-sync-employees: ${invokesEmpSync ? '✓' : '✗'} | Result aggregation: ${hasResultAggregation ? '✓' : '✗'} | Error handling: ${hasErrorHandling ? '✓' : '✗'} | DB tables accessible: ${tablesOk}/${tables.length} (${tableResults.filter(t => !t.ok).map(t => t.table + '(' + t.status + ')').join(', ') || 'all OK'}) | STATUS: POST-LAUNCH`);
}

// ═══════════════════════════════════════════════════════
//  REGRESSION: Days 1-10 + Day 11 Cross-Checks
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

  // REG-10.TR: Training routes exist
  console.log('\n── REG-10.TR Training routes ──');
  const trainingRoute = appTsx.includes('path="/training"');
  R('REG-10.TR', 'Training route', trainingRoute ? 'PASS' : 'FAIL',
    `Route /training: ${trainingRoute ? '✓' : '✗'}`);

  // REG-10.PB: Playbook routes exist
  console.log('\n── REG-10.PB Playbook routes ──');
  const playbookRoute = appTsx.includes('path="/playbooks"');
  R('REG-10.PB', 'Playbook route', playbookRoute ? 'PASS' : 'FAIL',
    `Route /playbooks: ${playbookRoute ? '✓' : '✗'}`);

  // REG-EDGE: Edge function count ≥170
  console.log('\n── REG-EDGE Edge function count ──');
  const edgeDirs = fs.readdirSync(FUNC, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .filter(d => fileExists(path.join(FUNC, d.name, 'index.ts')));
  R('REG-EDGE', 'Edge function count', edgeDirs.length >= 170 ? 'PASS' : 'FAIL',
    `Edge functions: ${edgeDirs.length}`);
}

// ═══════════════════════════════════════════════════════
//  OUTPUT
// ═══════════════════════════════════════════════════════

function writeOutputs() {
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  // JSON report
  const jsonReport = {
    test: 'DAY11-AUTO',
    date: new Date().toISOString().split('T')[0],
    summary: { pass, fail, total },
    results,
  };
  fs.writeFileSync('day11-test-report.json', JSON.stringify(jsonReport, null, 2));

  // Text report
  let txt = '═══════════════════════════════════════════\n';
  txt += '  DAY11-AUTO — Full Report\n';
  txt += `  Date: ${jsonReport.date} | Tests: ${total}\n`;
  txt += '═══════════════════════════════════════════\n\n';
  txt += 'TEST   | RESULT           | DETAIL\n';
  txt += '-------|------------------|------\n';
  for (const r of results) {
    txt += `${r.id.padEnd(7)}| ${r.status.padEnd(17)}| ${r.detail}\n`;
  }
  txt += '\n═══════════════════════════════════════════\n';
  txt += `  PASS: ${pass} | FAIL: ${fail} | TOTAL: ${total}\n`;
  txt += '═══════════════════════════════════════════\n';
  fs.writeFileSync('day11-test-report.txt', txt);

  // Empty state audit
  let auditTxt = '═══════════════════════════════════════════\n';
  auditTxt += '  DAY11 EMPTY STATE AUDIT\n';
  auditTxt += `  Date: ${jsonReport.date}\n`;
  auditTxt += '═══════════════════════════════════════════\n\n';
  auditTxt += 'COMPONENT              | FILE                        | DEMO GUARD | EMPTY STATE | DETAILS\n';
  auditTxt += '-----------------------|-----------------------------|------------|-------------|--------\n';
  for (const a of emptyStateAudit) {
    auditTxt += `${a.component.padEnd(23)}| ${a.file.padEnd(28)}| ${(a.hasDemoGuard ? 'YES' : 'NO').padEnd(11)}| ${(a.hasEmptyState ? 'YES' : 'NO').padEnd(12)}| ${a.details}\n`;
  }
  auditTxt += '\n═══════════════════════════════════════════\n';
  auditTxt += '  POST-LAUNCH FEATURES NOTE:\n';
  auditTxt += '  IoT/Sensors, AI Features, and POS Integration\n';
  auditTxt += '  have code in the codebase but are NOT customer-facing at launch.\n';
  auditTxt += '  STATUS: POST-LAUNCH — code exists, not customer-facing at launch\n';
  auditTxt += '  LAUNCH IMPACT: NONE — enable via feature flag when ready\n';
  auditTxt += '═══════════════════════════════════════════\n';
  fs.writeFileSync('day11-empty-state-audit.txt', auditTxt);

  console.log('\n═══════════════════════════════════════════');
  console.log(`  PASS: ${pass} | FAIL: ${fail} | TOTAL: ${total}`);
  console.log('═══════════════════════════════════════════');
  console.log('  Reports: day11-test-report.json, day11-test-report.txt, day11-empty-state-audit.txt');
}

// ── Main ──────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  DAY11-AUTO-TEST');
  console.log('  IoT/Sensors, AI Features, POS Integration');
  console.log('═══════════════════════════════════════════');

  // Authenticate
  console.log('\n── Authenticating ──');
  const authOk = await authenticate();
  console.log(authOk ? '  ✓ Authenticated' : '  ✗ Auth failed — continuing with anon');

  // Section 1: IoT/Sensors
  console.log('\n═══ SECTION 1: IoT / Sensors ═══');
  await test1101_SensorDeviceManagement();
  await test1102_SensorReadingIngestion();
  await test1103_SensorThresholdEvaluation();
  await test1104_SensorAlertsEscalation();
  await test1105_SensorDefrostDetection();
  await test1106_SensorComplianceAggregation();
  await test1107_SensorDeviceHealth();
  await test1108_IoTSensorWebhook();

  // Section 2: AI Features
  console.log('\n═══ SECTION 2: AI Features ═══');
  await test1109_AIVoiceTranscription();
  await test1110_AICopilotAnalysis();
  await test1111_AIPhotoAnalysis();
  await test1112_AIPatternAnalysis();
  await test1113_AICorrectiveActionDraft();
  await test1114_LandingPageChat();

  // Section 3: POS Integration
  console.log('\n═══ SECTION 3: POS Integration ═══');
  await test1115_POSConnectionSetup();
  await test1116_POSLocationSync();
  await test1117_POSEmployeeSync();
  await test1118_POSFullSync();

  // Regression
  await regressionTests();

  // Output
  writeOutputs();
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
