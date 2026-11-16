/**
 * Shared pieces for the Estimate Proof pages (/proof/:token, /proof/:token/insurance,
 * /company-proof/:token). Colors follow the approved mock, November 16, 2026.
 */
import { Helmet } from 'react-helmet-async';
import { supabase } from '../../lib/supabase';

export const C = {
  bar: '#141B24',
  barSub: '#B9C7D8',
  navy: '#0F2A3F',
  ink: '#1D2831',
  ink2: '#41505E',
  muted: '#5F6F80',
  line: '#DCE3EA',
  bg: '#F4F6F8',
  orange: '#A9552C',
  blue: '#1F5FAD',
  blueBg: '#E8F0FA',
  green: '#17694A',
  greenBg: '#E7F4EE',
  amber: '#8A5A12',
  amberBg: '#FDF3E1',
  red: '#B42318',
};

/** Calls an Estimate Proof edge function. Returns { data } or { error }. */
export async function callProof(fn, body) {
  try {
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) {
      let message = null;
      try {
        const ctx = await error.context?.json?.();
        message = ctx?.error || null;
      } catch {
        /* no body */
      }
      return { error: message || 'Something went wrong. Please try again.' };
    }
    return { data };
  } catch {
    return { error: 'Something went wrong. Please try again.' };
  }
}

/** Reads a File as { content_type, base64 } for upload. */
export function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve({ content_type: file.type || 'application/octet-stream', base64: result.slice(result.indexOf(',') + 1) });
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export const ACCEPT_FILES = 'application/pdf,image/jpeg,image/png,image/heic,image/webp';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function Page({ title, children }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px 16px', fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>
      <Helmet>
        <title>{title}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div style={{
        maxWidth: 900, margin: '0 auto', background: '#fff', border: `1px solid ${C.line}`,
        borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 30px rgba(15,42,63,0.08)',
      }}>
        {children}
      </div>
    </div>
  );
}

export function Bar({ companyName, subtitle, right }) {
  return (
    <div style={{
      background: C.bar, color: '#fff', padding: '14px 24px', display: 'flex',
      justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 18 }}>{companyName}</div>
        <div style={{ color: C.barSub, fontSize: 12 }}>{subtitle}</div>
      </div>
      {right && <div style={{ color: C.barSub, fontSize: 12 }}>{right}</div>}
    </div>
  );
}

export function Pill({ tone = 'green', children }) {
  const tones = {
    green: [C.greenBg, C.green],
    amber: [C.amberBg, C.amber],
    blue: [C.blueBg, C.blue],
    red: ['#FDECEC', C.red],
  };
  const [bg, fg] = tones[tone] || tones.green;
  return (
    <span style={{
      height: 24, padding: '0 10px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', background: bg, color: fg,
    }}>
      {children}
    </span>
  );
}

export function StatusPill({ status }) {
  return status === 'current' ? <Pill tone="green">Current</Pill> : <Pill tone="red">Expired</Pill>;
}

export function Button({ kind = 'plain', disabled, onClick, children, type = 'button', style }) {
  const kinds = {
    plain: { background: '#fff', color: C.ink, border: `1px solid ${C.line}` },
    dark: { background: C.bar, color: '#fff', border: `1px solid ${C.bar}` },
    orange: { background: C.orange, color: '#fff', border: `1px solid ${C.orange}` },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: 40, padding: '0 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.65 : 1, ...kinds[kind], ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Row({ children }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: `1px solid ${C.line}`, flexWrap: 'wrap',
    }}>
      {children}
    </div>
  );
}

export function Small({ children, style }) {
  return <div style={{ fontSize: 12, color: C.muted, ...style }}>{children}</div>;
}

export function Loading({ label }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: C.orange,
          borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto',
        }} />
        <p style={{ marginTop: 14, color: C.muted, fontSize: 14 }}>{label}</p>
        <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      </div>
    </div>
  );
}

export function MessageCard({ title, message, children }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Helmet>
        <title>{title}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div style={{
        background: '#fff', borderRadius: 14, padding: '40px 32px', maxWidth: 460, textAlign: 'center',
        border: `1px solid ${C.line}`, boxShadow: '0 8px 30px rgba(15,42,63,0.08)',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: C.navy, margin: '0 0 8px' }}>{title}</h1>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: 0 }}>{message}</p>
        {children}
      </div>
    </div>
  );
}

export const LINK_NOT_FOUND = {
  title: 'Link Not Found',
  message: 'This link does not match an estimate. Check the link, or ask the company that sent it for a new one.',
};

/** A signed storage URL is a file, not an app route. */
export function openFile(url) {
  window.location.assign(url);
}
