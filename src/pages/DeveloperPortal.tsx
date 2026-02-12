import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Key, Code2, Webhook, FlaskConical,
  Terminal, Shield, DollarSign, Copy, ChevronRight,
  ChevronDown, ExternalLink, Check, Zap, Lock,
  Clock, Server, FileJson, Globe,
} from 'lucide-react';

type Section = 'getting-started' | 'authentication' | 'api-reference' | 'webhooks' | 'sandbox' | 'sdks' | 'rate-limits' | 'pricing';

const SECTIONS: { id: Section; label: string; icon: typeof BookOpen }[] = [
  { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
  { id: 'authentication', label: 'Authentication', icon: Key },
  { id: 'api-reference', label: 'API Reference', icon: Code2 },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'sandbox', label: 'Sandbox', icon: FlaskConical },
  { id: 'sdks', label: 'SDKs & Libraries', icon: Terminal },
  { id: 'rate-limits', label: 'Rate Limits', icon: Clock },
  { id: 'pricing', label: 'API Pricing', icon: DollarSign },
];

const API_ENDPOINTS = [
  { method: 'GET', path: '/v1/locations', desc: 'List all locations for the authenticated organization' },
  { method: 'GET', path: '/v1/locations/{id}', desc: 'Get a specific location by ID' },
  { method: 'GET', path: '/v1/locations/{id}/compliance', desc: 'Get compliance scores and breakdown' },
  { method: 'GET', path: '/v1/locations/{id}/temperatures', desc: 'Get temperature readings with time range filters' },
  { method: 'POST', path: '/v1/locations/{id}/temperatures', desc: 'Submit temperature readings from external devices' },
  { method: 'GET', path: '/v1/locations/{id}/scores', desc: 'Get compliance score history (daily, weekly, monthly)' },
  { method: 'GET', path: '/v1/locations/{id}/documents', desc: 'List compliance documents by type and status' },
  { method: 'POST', path: '/v1/locations/{id}/documents', desc: 'Upload or register a compliance document' },
  { method: 'GET', path: '/v1/locations/{id}/checklists', desc: 'Get checklist templates and completion history' },
  { method: 'POST', path: '/v1/locations/{id}/checklists/{cid}/complete', desc: 'Submit a completed checklist' },
  { method: 'GET', path: '/v1/locations/{id}/incidents', desc: 'List incidents for a location' },
  { method: 'POST', path: '/v1/locations/{id}/incidents', desc: 'Report a new incident' },
  { method: 'GET', path: '/v1/locations/{id}/vendors', desc: 'List vendor services for a location' },
  { method: 'GET', path: '/v1/locations/{id}/equipment', desc: 'List equipment and maintenance status' },
  { method: 'GET', path: '/v1/locations/{id}/sensors', desc: 'List IoT sensors and current readings' },
  { method: 'GET', path: '/v1/employees', desc: 'List employees and certification status' },
  { method: 'GET', path: '/v1/employees/{id}/certifications', desc: 'Get certification details for an employee' },
  { method: 'POST', path: '/v1/webhooks', desc: 'Create a webhook subscription' },
  { method: 'GET', path: '/v1/webhooks', desc: 'List active webhook subscriptions' },
  { method: 'DELETE', path: '/v1/webhooks/{id}', desc: 'Delete a webhook subscription' },
];

const WEBHOOK_EVENTS = [
  { event: 'compliance.score_changed', desc: 'Fired when a location compliance score changes by >=2 points' },
  { event: 'compliance.threshold_breach', desc: 'Fired when a score drops below configured threshold' },
  { event: 'temperature.violation', desc: 'Temperature reading exceeds FDA threshold' },
  { event: 'temperature.sustained_violation', desc: 'Temperature stays out of range for >15 minutes' },
  { event: 'checklist.completed', desc: 'A daily checklist is submitted' },
  { event: 'checklist.missed', desc: 'A checklist was not completed by deadline' },
  { event: 'document.expiring', desc: 'A document is expiring within 30/14/7/1 days' },
  { event: 'document.expired', desc: 'A document has expired' },
  { event: 'document.uploaded', desc: 'A new document was uploaded' },
  { event: 'incident.created', desc: 'A new incident was reported' },
  { event: 'incident.resolved', desc: 'An incident was marked resolved' },
  { event: 'vendor.service_completed', desc: 'A vendor service was completed and logged' },
  { event: 'sensor.alert_triggered', desc: 'An IoT sensor triggered a threshold alert' },
  { event: 'inspection.score_predicted', desc: 'AI predicted inspection readiness score' },
];

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
        <span className="text-[10px] text-gray-400 font-mono uppercase">{language}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white"
        >
          {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
      <pre className="px-4 py-3 text-xs text-green-300 font-mono overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

// ── Section Components ───────────────────────────────────────────────────────

function GettingStartedSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Getting Started with the EvidLY API</h2>
        <p className="text-sm text-gray-600">Build integrations that connect compliance data with your restaurant tech stack. The EvidLY API provides programmatic access to compliance scores, temperature logs, checklists, documents, and more.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Zap className="h-4 w-4 text-blue-600 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-blue-900">Quick Start</div>
            <ol className="text-xs text-blue-800 mt-1 space-y-1 list-decimal list-inside">
              <li>Create an API application in your Integration Hub</li>
              <li>Copy your sandbox API key for testing</li>
              <li>Make your first API call (see below)</li>
              <li>Set up webhook subscriptions for real-time events</li>
              <li>Switch to production key when ready</li>
            </ol>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Your First API Call</h3>
        <CodeBlock language="bash" code={`curl -X GET "https://api.evidly.com/v1/locations" \\
  -H "Authorization: Bearer evd_sandbox_sk_your_key_here" \\
  -H "Content-Type: application/json"`} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Example Response</h3>
        <CodeBlock language="json" code={`{
  "data": [
    {
      "id": "loc_abc123",
      "name": "Downtown Kitchen",
      "address": "123 Main St, Portland, OR",
      "compliance_score": 92,
      "status": "active",
      "sensor_count": 6,
      "employee_count": 18
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "per_page": 25
  }
}`} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Base URL</h3>
        <div className="flex items-center gap-3">
          <div className="bg-gray-50 rounded-lg px-4 py-2">
            <code className="text-sm font-mono text-gray-700">https://api.evidly.com/v1</code>
          </div>
          <span className="text-xs text-gray-400">(Production)</span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="bg-gray-50 rounded-lg px-4 py-2">
            <code className="text-sm font-mono text-gray-700">https://sandbox.evidly.com/v1</code>
          </div>
          <span className="text-xs text-gray-400">(Sandbox)</span>
        </div>
      </div>
    </div>
  );
}

function AuthenticationSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication</h2>
        <p className="text-sm text-gray-600">The EvidLY API uses OAuth 2.0 with support for both Authorization Code and Client Credentials flows.</p>
      </div>

      {/* Auth flows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-[#1e4d6b]" />
            <h3 className="font-semibold text-gray-900 text-sm">Authorization Code Flow</h3>
          </div>
          <p className="text-xs text-gray-600 mb-3">For applications that act on behalf of a user. Requires user consent via browser redirect.</p>
          <div className="space-y-1 text-[10px] text-gray-500">
            <div>1. Redirect user to <code className="font-mono bg-gray-50 px-1">/oauth/authorize</code></div>
            <div>2. User grants permission</div>
            <div>3. Exchange code for tokens at <code className="font-mono bg-gray-50 px-1">/oauth/token</code></div>
            <div>4. Use access token in API requests</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-4 w-4 text-[#1e4d6b]" />
            <h3 className="font-semibold text-gray-900 text-sm">Client Credentials Flow</h3>
          </div>
          <p className="text-xs text-gray-600 mb-3">For server-to-server integrations that don't require user context. Simplest flow.</p>
          <div className="space-y-1 text-[10px] text-gray-500">
            <div>1. POST client_id + client_secret to <code className="font-mono bg-gray-50 px-1">/oauth/token</code></div>
            <div>2. Receive access token</div>
            <div>3. Use token in API requests</div>
            <div>4. Tokens expire after 1 hour; auto-refresh</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Client Credentials Example</h3>
        <CodeBlock language="bash" code={`curl -X POST "https://api.evidly.com/oauth/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials" \\
  -d "client_id=your_client_id" \\
  -d "client_secret=your_client_secret" \\
  -d "scope=read:locations read:compliance"`} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Available Scopes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'read:locations', 'write:locations',
            'read:compliance', 'read:temperatures', 'write:temperatures',
            'read:checklists', 'write:checklists',
            'read:documents', 'write:documents',
            'read:incidents', 'write:incidents',
            'read:employees', 'read:sensors',
            'read:webhooks', 'write:webhooks',
          ].map(scope => (
            <div key={scope} className="flex items-center gap-2 text-xs">
              <code className="font-mono bg-gray-50 px-2 py-0.5 rounded text-gray-600">{scope}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApiReferenceSection() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const methodColors: Record<string, { bg: string; text: string }> = {
    GET: { bg: '#dbeafe', text: '#1d4ed8' },
    POST: { bg: '#dcfce7', text: '#15803d' },
    PUT: { bg: '#fef3c7', text: '#92400e' },
    DELETE: { bg: '#fee2e2', text: '#dc2626' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">API Reference</h2>
        <p className="text-sm text-gray-600">{API_ENDPOINTS.length} endpoints across compliance, temperature, document, and sensor domains. All responses use JSON.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {API_ENDPOINTS.map((ep, i) => {
          const mc = methodColors[ep.method];
          const isExpanded = expandedIdx === i;
          return (
            <div key={i} className="border-b border-gray-100 last:border-b-0">
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-[10px] font-bold px-2 py-0.5 rounded w-14 text-center" style={{ backgroundColor: mc.bg, color: mc.text }}>
                  {ep.method}
                </span>
                <code className="text-xs font-mono text-gray-700 flex-1 break-all sm:break-normal">{ep.path}</code>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              {isExpanded && (
                <div className="px-4 pb-3 bg-gray-50">
                  <p className="text-xs text-gray-600 mb-3">{ep.desc}</p>
                  <CodeBlock language="bash" code={`curl -X ${ep.method} "https://api.evidly.com${ep.path}" \\
  -H "Authorization: Bearer YOUR_TOKEN"`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WebhooksSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Webhooks</h2>
        <p className="text-sm text-gray-600">Receive real-time notifications when compliance events occur. All webhook payloads include HMAC-SHA256 signatures for verification.</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Signature Verification</h3>
        <CodeBlock language="javascript" code={`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Available Events ({WEBHOOK_EVENTS.length})</h3>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {WEBHOOK_EVENTS.map(we => (
            <div key={we.event} className="flex items-start gap-3 px-4 py-2.5 border-b border-gray-50 last:border-b-0 flex-wrap">
              <code className="text-[10px] font-mono bg-gray-50 px-2 py-0.5 rounded text-gray-700 break-all sm:whitespace-nowrap">{we.event}</code>
              <span className="text-xs text-gray-500">{we.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Example Payload</h3>
        <CodeBlock language="json" code={`{
  "id": "evt_abc123def456",
  "type": "temperature.violation",
  "created_at": "2026-02-10T14:32:00Z",
  "data": {
    "location_id": "loc_abc123",
    "location_name": "Downtown Kitchen",
    "sensor_id": "iot-s07",
    "sensor_name": "Walk-in Cooler A",
    "reading": 44.2,
    "threshold": 41.0,
    "severity": "warning",
    "duration_minutes": 3
  }
}`} />
      </div>
    </div>
  );
}

function SandboxSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sandbox Environment</h2>
        <p className="text-sm text-gray-600">Test your integrations against realistic demo data without affecting production. The sandbox mirrors the full production API.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-2">Sandbox Features</h3>
          <ul className="space-y-2 text-xs text-gray-600">
            {[
              '3 demo locations with full compliance data',
              '15+ IoT sensors with live-like readings',
              'Pre-populated checklists, documents, incidents',
              'Webhook testing with event simulation',
              'Rate limits match production (higher burst)',
              'Auto-resets every 24 hours',
            ].map(f => (
              <li key={f} className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />{f}</li>
            ))}
          </ul>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-2">Test Credentials</h3>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-gray-500 mb-1">Sandbox Base URL</div>
              <div className="bg-gray-50 rounded px-3 py-2">
                <code className="text-xs font-mono text-gray-700">https://sandbox.evidly.com/v1</code>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 mb-1">Test API Key</div>
              <div className="bg-gray-50 rounded px-3 py-2 flex items-center justify-between">
                <code className="text-xs font-mono text-gray-700">evd_sandbox_sk_test_••••••••</code>
                <button onClick={() => toast.info('Demo: Key copied')} className="text-gray-400 hover:text-gray-600"><Copy className="h-3 w-3" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Simulate Events</h3>
        <p className="text-xs text-gray-500 mb-3">Trigger test webhook events to verify your endpoint handling:</p>
        <CodeBlock language="bash" code={`curl -X POST "https://sandbox.evidly.com/v1/test/simulate-event" \\
  -H "Authorization: Bearer evd_sandbox_sk_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"event_type": "temperature.violation", "location_id": "loc_abc123"}'`} />
      </div>
    </div>
  );
}

function SdksSection() {
  const sdks = [
    { lang: 'JavaScript / TypeScript', icon: '🟨', install: 'npm install @evidly/sdk', status: 'stable' },
    { lang: 'Python', icon: '🐍', install: 'pip install evidly-sdk', status: 'stable' },
    { lang: 'Ruby', icon: '💎', install: 'gem install evidly', status: 'beta' },
    { lang: 'Go', icon: '🔵', install: 'go get github.com/evidly/go-sdk', status: 'beta' },
    { lang: 'PHP', icon: '🐘', install: 'composer require evidly/sdk', status: 'coming soon' },
    { lang: 'C# / .NET', icon: '🟣', install: 'dotnet add package Evidly.SDK', status: 'coming soon' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">SDKs & Libraries</h2>
        <p className="text-sm text-gray-600">Official client libraries for popular programming languages. All SDKs handle authentication, retries, and pagination automatically.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sdks.map(sdk => (
          <div key={sdk.lang} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{sdk.icon}</span>
                <span className="text-sm font-semibold text-gray-900">{sdk.lang}</span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sdk.status === 'stable' ? 'bg-green-50 text-green-700' : sdk.status === 'beta' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                {sdk.status}
              </span>
            </div>
            <div className="bg-gray-50 rounded px-3 py-2">
              <code className="text-[11px] font-mono text-gray-600">{sdk.install}</code>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">TypeScript Example</h3>
        <CodeBlock language="typescript" code={`import { EvidlyClient } from '@evidly/sdk';

const client = new EvidlyClient({
  apiKey: process.env.EVIDLY_API_KEY,
  environment: 'production', // or 'sandbox'
});

// Get compliance scores for all locations
const locations = await client.locations.list();
for (const loc of locations.data) {
  const scores = await client.compliance.getScores(loc.id);
  console.log(\`\${loc.name}: \${scores.overall}/100\`);
}`} />
      </div>
    </div>
  );
}

function RateLimitsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Rate Limits</h2>
        <p className="text-sm text-gray-600">Rate limits protect the API and ensure fair usage. Limits are applied per API key.</p>
      </div>

      <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
              <th className="text-left px-4 py-3 font-semibold">Plan</th>
              <th className="text-center px-4 py-3 font-semibold">Requests/min</th>
              <th className="text-center px-4 py-3 font-semibold">Requests/day</th>
              <th className="text-center px-4 py-3 font-semibold hidden sm:table-cell">Webhooks</th>
              <th className="text-center px-4 py-3 font-semibold hidden sm:table-cell">Burst</th>
            </tr>
          </thead>
          <tbody>
            {[
              { plan: 'Starter', rpm: '60', rpd: '10,000', wh: '5', burst: '10 req/sec' },
              { plan: 'Professional', rpm: '300', rpd: '100,000', wh: '25', burst: '50 req/sec' },
              { plan: 'Enterprise', rpm: '1,000', rpd: 'Unlimited', wh: 'Unlimited', burst: '200 req/sec' },
              { plan: 'Sandbox', rpm: '120', rpd: '50,000', wh: '10', burst: '20 req/sec' },
            ].map(r => (
              <tr key={r.plan} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{r.plan}</td>
                <td className="px-4 py-3 text-center text-gray-600">{r.rpm}</td>
                <td className="px-4 py-3 text-center text-gray-600">{r.rpd}</td>
                <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{r.wh}</td>
                <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{r.burst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Rate Limit Headers</h3>
        <CodeBlock language="http" code={`HTTP/1.1 200 OK
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 298
X-RateLimit-Reset: 1707580800
Retry-After: 60`} />
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="text-xs text-yellow-800">
          <strong>429 Too Many Requests:</strong> When rate limited, implement exponential backoff. The <code className="font-mono bg-yellow-100 px-1">Retry-After</code> header indicates seconds until the limit resets.
        </div>
      </div>
    </div>
  );
}

function PricingSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">API Pricing</h2>
        <p className="text-sm text-gray-600">API access is included with your EvidLY subscription. Higher tiers unlock more capacity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            name: 'Starter',
            price: '$0',
            note: 'Included with any plan',
            features: ['10,000 API calls/month', '5 webhook subscriptions', 'Sandbox access', 'Community support', 'JavaScript & Python SDKs'],
            highlight: false,
          },
          {
            name: 'Professional',
            price: '$99',
            note: '/month',
            features: ['100,000 API calls/month', '25 webhook subscriptions', 'Sandbox + production', 'Priority support', 'All SDKs', 'Custom integrations'],
            highlight: true,
          },
          {
            name: 'Enterprise',
            price: 'Custom',
            note: 'Contact sales',
            features: ['Unlimited API calls', 'Unlimited webhooks', 'Dedicated support', 'SLA guarantee (99.9%)', 'Custom OAuth scopes', 'White-label API', 'Dedicated infrastructure'],
            highlight: false,
          },
        ].map(tier => (
          <div key={tier.name} className={`rounded-xl p-4 sm:p-6 ${tier.highlight ? 'bg-[#1e4d6b] text-white border-2 border-[#d4af37]' : 'bg-white border border-gray-200'}`}>
            <div className="text-sm font-semibold mb-1">{tier.name}</div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-bold">{tier.price}</span>
              <span className={`text-xs ${tier.highlight ? 'text-white/70' : 'text-gray-500'}`}>{tier.note}</span>
            </div>
            <ul className="space-y-2 mt-4">
              {tier.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs">
                  <Check className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${tier.highlight ? 'text-[#d4af37]' : 'text-green-500'}`} />
                  <span className={tier.highlight ? 'text-white/90' : 'text-gray-600'}>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => toast.info(`Demo: ${tier.name} plan signup preview`)}
              className={`w-full mt-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${tier.highlight ? 'bg-[#d4af37] text-[#1e4d6b] hover:bg-[#c4a030]' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
            >
              {tier.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function DeveloperPortal() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>('getting-started');

  const renderSection = () => {
    switch (activeSection) {
      case 'getting-started': return <GettingStartedSection />;
      case 'authentication': return <AuthenticationSection />;
      case 'api-reference': return <ApiReferenceSection />;
      case 'webhooks': return <WebhooksSection />;
      case 'sandbox': return <SandboxSection />;
      case 'sdks': return <SdksSection />;
      case 'rate-limits': return <RateLimitsSection />;
      case 'pricing': return <PricingSection />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/integrations')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e4d6b] mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Integration Hub
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1e4d6b] rounded-lg">
            <Code2 className="h-5 w-5 text-[#d4af37]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Developer Portal</h1>
            <p className="text-sm text-gray-500">API documentation, SDKs, and integration guides</p>
          </div>
        </div>
      </div>

      {/* Layout: sidebar nav + content */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Section nav */}
        <div className="hidden md:block w-52 flex-shrink-0">
          <div className="sticky top-4 space-y-0.5">
            {SECTIONS.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeSection === sec.id
                    ? 'bg-[#1e4d6b] text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <sec.icon className="h-4 w-4" />
                {sec.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile section selector */}
        <div className="md:hidden w-full mb-4">
          <select
            value={activeSection}
            onChange={e => setActiveSection(e.target.value as Section)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
          >
            {SECTIONS.map(sec => <option key={sec.id} value={sec.id}>{sec.label}</option>)}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
