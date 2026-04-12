/**
 * ADMIN — Domain Security Policy
 *
 * Route: /admin/security-settings
 * Access: @getevidly.com users or isEvidlyAdmin flag
 *
 * 4 subsections:
 * A — HTTPS & Transport toggles
 * B — Security Headers (read-only table + copy vercel.json)
 * C — Allowed Domains / CORS
 * D — Domain Verification Status (calls security-headers-check edge function)
 */

import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import {
  Shield, Globe, Lock, Copy, CheckCircle, XCircle,
  AlertTriangle, RefreshCw, Loader2, Save, Info,
} from 'lucide-react';
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';
import { useDemoGuard } from '../../hooks/useDemoGuard';

const BRAND = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#3D5068';
const TEXT_TERT = '#6B7F96';

interface DomainSecurityConfig {
  enforce_https: boolean;
  hsts_enabled: boolean;
  hsts_max_age_seconds: number;
  hsts_include_subdomains: boolean;
  content_security_policy: string;
  x_frame_options: string;
  x_content_type_options: string;
  referrer_policy: string;
  allowed_domains: string[];
  cors_origins: string[];
  cookie_secure: boolean;
  cookie_samesite: string;
}

interface DomainCheckResult {
  domain: string;
  https: boolean;
  hsts: boolean;
  csp: boolean;
  xframe: boolean;
  xctype: boolean;
  referrer?: boolean;
  permissions?: boolean;
  error?: string;
  checked_at: string;
}

const DEFAULT_CONFIG: DomainSecurityConfig = {
  enforce_https: true,
  hsts_enabled: true,
  hsts_max_age_seconds: 31536000,
  hsts_include_subdomains: true,
  content_security_policy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
  x_frame_options: 'DENY',
  x_content_type_options: 'nosniff',
  referrer_policy: 'strict-origin-when-cross-origin',
  allowed_domains: ['getevidly.com', 'evidly-app.vercel.app', 'cleaningprosplus.com', 'filtafryer.com', 'scoretable.com'],
  cors_origins: ['https://getevidly.com', 'https://evidly-app.vercel.app'],
  cookie_secure: true,
  cookie_samesite: 'Strict',
};

const VERCEL_HEADERS_JSON = JSON.stringify({
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com;" },
      ],
    },
  ],
}, null, 2);

const SECURITY_HEADERS_TABLE = [
  { header: 'X-Frame-Options', value: 'DENY', desc: 'Prevents clickjacking by disabling iframe embedding' },
  { header: 'X-Content-Type-Options', value: 'nosniff', desc: 'Prevents MIME-type sniffing attacks' },
  { header: 'Referrer-Policy', value: 'strict-origin-when-cross-origin', desc: 'Controls referrer info sent to other origins' },
  { header: 'Content-Security-Policy', value: "default-src 'self'; ...", desc: 'Restricts resource loading to trusted sources' },
  { header: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains', desc: 'Forces HTTPS for 1 year' },
  { header: 'Permissions-Policy', value: 'camera=(), microphone=()', desc: 'Disables device API access' },
];

// ── Toggle Component ─────────────────────────────────────────
function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium" style={{ color: '#0B1628' }}>{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: TEXT_TERT }}>{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        style={{ backgroundColor: checked ? BRAND : '#D1D9E6' }}
      >
        <span
          className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
        />
      </button>
    </div>
  );
}

// ── Status Icon ──────────────────────────────────────────────
function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle size={16} className="text-green-600" />
    : <XCircle size={16} className="text-red-500" />;
}

// ── Main Component ───────────────────────────────────────────
export function SecuritySettings() {
  useDemoGuard();
  const { isEvidlyAdmin } = useAuth();
  const { isDemoMode } = useDemo();

  if (!isEvidlyAdmin && !isDemoMode) {
    return <Navigate to="/dashboard" replace />;
  }

  const [config, setConfig] = useState<DomainSecurityConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isDemoMode);
  const [verifying, setVerifying] = useState(false);
  const [verifyResults, setVerifyResults] = useState<DomainCheckResult[]>([]);
  const [copied, setCopied] = useState(false);

  // ── Load config ──────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return;
    (async () => {
      const { data } = await supabase
        .from('admin_security_config')
        .select('config_value')
        .eq('config_key', 'domain_security')
        .maybeSingle();
      if (data?.config_value) {
        setConfig({ ...DEFAULT_CONFIG, ...data.config_value });
      }
      setLoading(false);
    })();
  }, [isDemoMode]);

  // ── Save config ──────────────────────────────────────────
  const saveConfig = useCallback(async () => {
    if (isDemoMode) {
      toast.success('Demo mode — config saved locally');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('admin_security_config')
      .upsert({
        config_key: 'domain_security',
        config_value: config,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'config_key' });
    setSaving(false);
    if (error) toast.error(`Save failed: ${error.message}`);
    else toast.success('Domain security policy saved');
  }, [config, isDemoMode]);

  // ── Copy vercel.json headers ─────────────────────────────
  const copyHeaders = useCallback(() => {
    navigator.clipboard.writeText(VERCEL_HEADERS_JSON);
    setCopied(true);
    toast.success('Copied vercel.json headers to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // ── Verify domains ──────────────────────────────────────
  const verifyDomains = useCallback(async () => {
    setVerifying(true);
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1500));
        setVerifyResults(config.allowed_domains.map(domain => ({
          domain,
          https: true,
          hsts: domain.includes('evidly'),
          csp: domain.includes('evidly'),
          xframe: true,
          xctype: true,
          checked_at: new Date().toISOString(),
        })));
      } else {
        const { data, error } = await supabase.functions.invoke('security-headers-check', {
          body: { domains: config.allowed_domains },
        });
        if (error) throw error;
        setVerifyResults(data as DomainCheckResult[]);
      }
    } catch (err: any) {
      toast.error(`Verification failed: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  }, [config.allowed_domains, isDemoMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin" style={{ color: BRAND }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Security Settings' }]} />

      {isDemoMode && (
        <div className="rounded-lg px-4 py-2 text-sm font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
          Demo Mode — changes are not persisted
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: '#eef4f8' }}>
          <Shield size={24} style={{ color: BRAND }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND, fontFamily: 'DM Sans, sans-serif' }}>Domain Security Policy</h1>
          <p className="text-sm mt-0.5" style={{ color: TEXT_TERT }}>HTTPS enforcement, security headers, CORS, and domain verification</p>
        </div>
      </div>

      {/* ── Section A: HTTPS & Transport ───────────────────── */}
      <section className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: '#D1D9E6' }}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#0B1628', fontFamily: 'DM Sans, sans-serif' }}>
          <Lock size={16} className="inline mr-2" style={{ color: BRAND }} />
          HTTPS & Transport Security
        </h2>
        <p className="text-xs mb-4" style={{ color: TEXT_TERT }}>Controls how data is encrypted in transit</p>

        <div className="divide-y" style={{ borderColor: '#E8EDF5' }}>
          <Toggle
            checked={config.enforce_https}
            onChange={v => setConfig(c => ({ ...c, enforce_https: v }))}
            label="Enforce HTTPS"
            description="Redirect all HTTP requests to HTTPS"
          />
          <Toggle
            checked={config.hsts_enabled}
            onChange={v => setConfig(c => ({ ...c, hsts_enabled: v }))}
            label="HSTS Enabled"
            description="HTTP Strict Transport Security — browsers remember HTTPS-only"
          />
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium" style={{ color: '#0B1628' }}>HSTS Max Age</p>
              <p className="text-xs mt-0.5" style={{ color: TEXT_TERT }}>Duration in seconds (31536000 = 1 year, recommended)</p>
            </div>
            <input
              type="number"
              value={config.hsts_max_age_seconds}
              onChange={e => setConfig(c => ({ ...c, hsts_max_age_seconds: parseInt(e.target.value) || 0 }))}
              className="w-32 px-3 py-1.5 text-sm border rounded-lg text-right"
              style={{ borderColor: '#D1D9E6' }}
            />
          </div>
          <Toggle
            checked={config.hsts_include_subdomains}
            onChange={v => setConfig(c => ({ ...c, hsts_include_subdomains: v }))}
            label="Include Subdomains in HSTS"
            description="Apply HSTS to all subdomains (*.getevidly.com)"
          />
        </div>
      </section>

      {/* ── Section B: Security Headers ────────────────────── */}
      <section className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: '#D1D9E6' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#0B1628', fontFamily: 'DM Sans, sans-serif' }}>
              <Shield size={16} className="inline mr-2" style={{ color: BRAND }} />
              Security Headers
            </h2>
            <p className="text-xs mt-0.5" style={{ color: TEXT_TERT }}>Configured at the Vercel / edge level — read only</p>
          </div>
          <button
            onClick={copyHeaders}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: '#D1D9E6', color: copied ? '#16a34a' : TEXT_SEC }}
          >
            {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy vercel.json headers'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: '#E8EDF5' }}>
                <th className="text-left py-2 pr-4 font-medium" style={{ color: TEXT_SEC }}>Header</th>
                <th className="text-left py-2 pr-4 font-medium" style={{ color: TEXT_SEC }}>Value</th>
                <th className="text-center py-2 font-medium" style={{ color: TEXT_SEC }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {SECURITY_HEADERS_TABLE.map(row => (
                <tr key={row.header} className="border-b" style={{ borderColor: '#E8EDF5' }}>
                  <td className="py-2.5 pr-4">
                    <p className="font-mono text-xs font-medium" style={{ color: '#0B1628' }}>{row.header}</p>
                    <p className="text-xs mt-0.5" style={{ color: TEXT_TERT }}>{row.desc}</p>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs" style={{ color: TEXT_SEC }}>{row.value}</td>
                  <td className="py-2.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      <CheckCircle size={12} /> Set
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section C: Allowed Domains / CORS ──────────────── */}
      <section className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: '#D1D9E6' }}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#0B1628', fontFamily: 'DM Sans, sans-serif' }}>
          <Globe size={16} className="inline mr-2" style={{ color: BRAND }} />
          Allowed Domains & CORS
        </h2>
        <p className="text-xs mb-4" style={{ color: TEXT_TERT }}>Origins allowed to call the EvidLY API</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: TEXT_SEC }}>CORS Origins (one per line)</label>
            <textarea
              value={config.cors_origins.join('\n')}
              onChange={e => setConfig(c => ({ ...c, cors_origins: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) }))}
              rows={4}
              className="w-full px-3 py-2 text-sm border rounded-lg font-mono"
              style={{ borderColor: '#D1D9E6' }}
            />
          </div>

          {/* Cookie security is managed by Supabase Auth automatically.
              Supabase Dashboard → Authentication → Settings:
              - "Secure cookies" must be enabled
              - JWT expiry: 3600s (1 hour recommended)
              - Refresh token rotation: enabled
              These cannot be changed from the app — must be configured in Supabase Dashboard. */}
          <div className="flex items-start gap-3 py-3 px-4 rounded-lg" style={{ backgroundColor: '#F4F6FA', border: '1px solid #E8EDF5' }}>
            <Info size={16} className="mt-0.5 flex-shrink-0" style={{ color: BRAND }} />
            <div>
              <p className="text-sm font-medium" style={{ color: '#0B1628' }}>Session Cookies</p>
              <p className="text-xs mt-1" style={{ color: TEXT_TERT }}>
                Session cookies are managed by Supabase Auth with <strong>httpOnly</strong> and <strong>Secure</strong> flags enforced automatically.
                Cookie settings (JWT expiry, refresh token rotation, SameSite policy) are configured in the Supabase Dashboard under Authentication → Settings.
              </p>
            </div>
          </div>

          <button
            onClick={saveConfig}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: BRAND }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.backgroundColor = '#2A3F6B'; }}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = BRAND}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Domain Security Policy
          </button>
        </div>
      </section>

      {/* ── Section D: Domain Verification ─────────────────── */}
      <section className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: '#D1D9E6' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#0B1628', fontFamily: 'DM Sans, sans-serif' }}>
              <CheckCircle size={16} className="inline mr-2" style={{ color: BRAND }} />
              Domain Verification Status
            </h2>
            <p className="text-xs mt-0.5" style={{ color: TEXT_TERT }}>Checks that each domain returns expected security headers</p>
          </div>
          <button
            onClick={verifyDomains}
            disabled={verifying}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: BRAND }}
            onMouseEnter={e => { if (!verifying) e.currentTarget.style.backgroundColor = '#2A3F6B'; }}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = BRAND}
          >
            {verifying ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {verifying ? 'Verifying...' : 'Verify All'}
          </button>
        </div>

        {verifyResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: '#E8EDF5' }}>
                  <th className="text-left py-2 pr-4 font-medium" style={{ color: TEXT_SEC }}>Domain</th>
                  <th className="text-center py-2 px-2 font-medium" style={{ color: TEXT_SEC }}>HTTPS</th>
                  <th className="text-center py-2 px-2 font-medium" style={{ color: TEXT_SEC }}>HSTS</th>
                  <th className="text-center py-2 px-2 font-medium" style={{ color: TEXT_SEC }}>CSP</th>
                  <th className="text-center py-2 px-2 font-medium" style={{ color: TEXT_SEC }}>X-Frame</th>
                  <th className="text-left py-2 pl-4 font-medium" style={{ color: TEXT_SEC }}>Last Checked</th>
                </tr>
              </thead>
              <tbody>
                {verifyResults.map(r => (
                  <tr key={r.domain} className="border-b" style={{ borderColor: '#E8EDF5' }}>
                    <td className="py-2.5 pr-4 font-mono text-xs" style={{ color: '#0B1628' }}>{r.domain}</td>
                    <td className="py-2.5 px-2 text-center"><StatusIcon ok={r.https} /></td>
                    <td className="py-2.5 px-2 text-center"><StatusIcon ok={r.hsts} /></td>
                    <td className="py-2.5 px-2 text-center"><StatusIcon ok={r.csp} /></td>
                    <td className="py-2.5 px-2 text-center"><StatusIcon ok={r.xframe} /></td>
                    <td className="py-2.5 pl-4 text-xs" style={{ color: TEXT_TERT }}>
                      {r.checked_at ? new Date(r.checked_at).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-6 rounded-lg text-center" style={{ backgroundColor: '#F4F6FA' }}>
            <Info size={16} style={{ color: TEXT_TERT }} />
            <span className="text-sm" style={{ color: TEXT_SEC }}>
              Click "Verify All" to check security headers on your allowed domains
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
