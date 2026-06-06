import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Download } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────

type Cell = string | { text: string; result?: 'pass' | 'fail' | 'warn' };

interface TableData {
  cols: string[];
  rows: Cell[][];
}

interface ReportSection {
  act?: 'predict' | 'reduce' | 'prove';
  heading: string;
  body?: string;
  table?: TableData;
  citations?: string[];
  cross_refs?: string[];
}

interface PillarBlock {
  label: string;
  sections?: ReportSection[];
  table?: TableData;
}

interface ContentJson {
  executive_summary: string;
  sections?: ReportSection[];
  food_safety?: PillarBlock;
  fire_safety?: PillarBlock;
  documents?: TableData;
  generated_at: string;
  org_name?: string;
  org_subtitle?: string;
  pillar_label?: string;
  period_label?: string;
  report_subtitle?: string;
  share_url?: string;
}

interface ReportData {
  id: string;
  report_type: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  content_json: ContentJson;
  share_expires: string | null;
  org_name: string | null;
  created_at: string;
}

// ── Design tokens (from mockup) ──────────────────────────

const C = {
  navy: '#1E2D4D', cream: '#FAF7F0', ink: '#21242B', slate: '#5B6472',
  line: '#E3DDD0', gold: '#A08C5A',
  food: '#2F6F4F', foodBg: '#EAF3EE',
  fire: '#9E3B2F', fireBg: '#F8ECE9',
  white: '#FFFFFF', pass: '#2F6F4F', fail: '#9E3B2F', warn: '#8A6D1F',
};

const FONT = {
  display: "'Fraunces', Georgia, serif",
  body: "'Source Sans 3', 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

// ── Main component ────────────────────────────────────────

export function ReportViewer() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setError('No share token provided');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const res = await fetch(
          `${baseUrl}/functions/v1/generate-report?token=${encodeURIComponent(shareToken)}`,
          { method: 'GET' },
        );
        const json = await res.json();

        if (!res.ok) {
          if (res.status === 410) {
            setError('This share link has expired.');
          } else {
            setError(json.error || 'Report not found');
          }
          setLoading(false);
          return;
        }

        setReport(json.report as ReportData);
      } catch {
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, [shareToken]);

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `2px solid ${C.gold}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 16, fontFamily: FONT.body, fontSize: 14, color: `${C.navy}99` }}>Loading report...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !report) {
    return (
      <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.line}`, padding: 32, textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertTriangle size={24} color="#EF4444" />
          </div>
          <h2 style={{ fontFamily: FONT.display, color: C.navy, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {error === 'This share link has expired.' ? 'Link Expired' : 'Report Not Found'}
          </h2>
          <p style={{ fontFamily: FONT.body, color: C.slate, fontSize: 14 }}>
            {error || 'This report could not be loaded. The link may be invalid or the report may have been removed.'}
          </p>
        </div>
      </div>
    );
  }

  const content = report.content_json;
  const isInsurancePackage = report.report_type === 'client_executive';

  const periodLabel = content?.period_label || (
    report.period_start && report.period_end
      ? `${new Date(report.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(report.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : null
  );

  const pillarLabel = content?.pillar_label || (() => {
    if (report.report_type === 'client_compliance' || report.report_type === 'client_regulatory') return 'Food Safety · EHD';
    if (report.report_type === 'client_insurance') return 'Fire Safety · AHJ';
    if (report.report_type === 'client_executive') return 'Renewal Documentation';
    return '';
  })();

  const orgName = content?.org_name || report.org_name || '';
  const orgSubtitle = content?.org_subtitle || '';

  const generatedDate = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const pdfUrl = shareToken
    ? `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/generate-report?token=${encodeURIComponent(shareToken)}&format=pdf`
    : null;

  return (
    <div style={{ minHeight: '100vh', background: C.cream, padding: '26px 18px 70px' }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Source+Sans+3:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Document shell */}
      <div style={{
        background: C.white, border: `1px solid ${C.line}`, borderRadius: 12,
        maxWidth: 760, margin: '0 auto', overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(30,45,77,0.08)',
      }}>
        {/* Co-branded header */}
        <div style={{ background: C.navy, padding: '26px 36px 22px', borderBottom: `3px solid ${C.gold}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: FONT.display, fontSize: 22, color: C.cream, fontWeight: 600 }}>
                {orgName}
              </div>
              {orgSubtitle && (
                <div style={{ fontFamily: FONT.body, fontSize: 12.5, color: '#B9C2D4', marginTop: 3 }}>
                  {orgSubtitle}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.5, color: C.gold, textTransform: 'uppercase' }}>
                {pillarLabel}
              </div>
              {periodLabel && (
                <div style={{ fontFamily: FONT.mono, fontSize: 10.5, color: '#B9C2D4', marginTop: 4 }}>
                  {periodLabel}
                </div>
              )}
            </div>
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 27, color: C.cream, fontWeight: 600, marginTop: 18, lineHeight: 1.2 }}>
            {report.title}
          </div>
          {content?.report_subtitle && (
            <div style={{ fontFamily: FONT.body, fontSize: 13, color: '#B9C2D4', marginTop: 5 }}>
              {content.report_subtitle}
            </div>
          )}
        </div>

        {/* Content body */}
        <div style={{ padding: '30px 36px 26px' }}>
          {/* Executive Summary */}
          {content?.executive_summary && (
            <section style={{ marginBottom: 26 }}>
              <SectionHeadEl>Executive Summary</SectionHeadEl>
              <p style={{
                fontFamily: FONT.body, fontSize: 14.5, lineHeight: 1.75, color: C.ink, margin: 0,
                paddingLeft: 14, borderLeft: `2px solid ${C.gold}`,
              }}>
                {content.executive_summary}
              </p>
            </section>
          )}

          {/* Insurance Package: pillar blocks */}
          {isInsurancePackage && content?.food_safety && (
            <PillarBlockEl
              label={content.food_safety.label || 'Part I — Food Safety · County EHD'}
              color={C.food}
              bg={C.foodBg}
              block={content.food_safety}
            />
          )}
          {isInsurancePackage && content?.fire_safety && (
            <PillarBlockEl
              label={content.fire_safety.label || 'Part II — Fire Safety · Fire Authority'}
              color={C.fire}
              bg={C.fireBg}
              block={content.fire_safety}
            />
          )}

          {/* Insurance Package: documents table */}
          {isInsurancePackage && content?.documents && (
            <section style={{ marginBottom: 24 }}>
              <SectionHeadEl>Attached Documents</SectionHeadEl>
              <TblEl table={content.documents} />
            </section>
          )}

          {/* Non-insurance: pillar sections with three-act */}
          {!isInsurancePackage && content?.food_safety?.sections?.map((section, idx) => (
            <ActSectionEl key={`food-${idx}`} section={section} />
          ))}
          {!isInsurancePackage && content?.fire_safety?.sections?.map((section, idx) => (
            <ActSectionEl key={`fire-${idx}`} section={section} />
          ))}

          {/* Flat three-act sections */}
          {content?.sections?.map((section, idx) => (
            <ActSectionEl key={idx} section={section} />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: `1px solid ${C.line}`, padding: '12px 36px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ fontFamily: FONT.body, fontSize: 11, color: C.slate }}>
            Produced by Evid<span style={{ color: C.gold, fontWeight: 700 }}>LY</span> from {orgName} records
          </span>
          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.slate }}>
            Generated {generatedDate}
            {content?.share_url && ` · Live copy: ${content.share_url.replace(/^https?:\/\//, '').slice(0, 28)}…`}
          </span>
        </div>
      </div>

      {/* Download PDF button */}
      {pdfUrl && (
        <div style={{ maxWidth: 760, margin: '16px auto 0', textAlign: 'right' }}>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
              color: C.navy, background: C.white, border: `1px solid ${C.line}`,
              borderRadius: 8, padding: '8px 16px', textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Download PDF
          </a>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function SectionHeadEl({ children, act }: { children: React.ReactNode; act?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
      {act && (
        <span style={{
          fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1.6, textTransform: 'uppercase',
          color: C.gold,
        }}>{act}</span>
      )}
      <h3 style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 600, color: C.navy, margin: 0 }}>
        {children}
      </h3>
      <div style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );
}

function ResultEl({ value }: { value: string }) {
  const upper = value.toUpperCase();
  const color = (upper === 'PASS' || upper === 'CURRENT' || upper === 'CLOSED')
    ? C.pass
    : upper === 'FAIL'
      ? C.fail
      : C.warn;
  return <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 600, color }}>{upper}</span>;
}

function renderCell(cell: Cell) {
  if (typeof cell === 'string') return cell;
  if (cell.result) return <ResultEl value={cell.text} />;
  return cell.text;
}

function TblEl({ table }: { table: TableData }) {
  if (!table?.cols || !table?.rows) return null;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT.body, fontSize: 12.5 }}>
      <thead>
        <tr>
          {table.cols.map((col, i) => (
            <th key={i} style={{
              textAlign: 'left', padding: '7px 10px', fontFamily: FONT.mono, fontSize: 10,
              letterSpacing: 1.2, textTransform: 'uppercase', color: C.slate,
              borderBottom: `1.5px solid ${C.navy}22`,
            }}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: '8px 10px', color: C.ink, verticalAlign: 'top' }}>
                {renderCell(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CiteEl({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.slate, marginTop: 8 }}>
      {text}
    </div>
  );
}

function CrossRefEl({ text }: { text: string }) {
  return (
    <div style={{
      marginTop: 10, padding: '8px 12px', background: '#F6F3EB',
      border: `1px solid ${C.line}`, borderRadius: 6,
      fontFamily: FONT.body, fontSize: 12, color: C.slate,
    }}>
      ↪ {text}
    </div>
  );
}

function ActSectionEl({ section }: { section: ReportSection }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <SectionHeadEl act={section.act?.toUpperCase()}>{section.heading}</SectionHeadEl>

      {/* Table content */}
      {section.table && <TblEl table={section.table} />}

      {/* Prose fallback for sections without tables */}
      {!section.table && section.body && (
        <p style={{
          fontFamily: FONT.body, fontSize: 14, lineHeight: 1.7, color: C.ink,
          margin: 0, whiteSpace: 'pre-wrap',
        }}>
          {section.body}
        </p>
      )}

      {/* Citations */}
      {section.citations?.map((cite, i) => (
        <CiteEl key={i} text={cite} />
      ))}

      {/* Cross-references */}
      {section.cross_refs?.map((ref, i) => (
        <CrossRefEl key={i} text={ref} />
      ))}
    </section>
  );
}

function PillarBlockEl({ label, color, bg, block }: {
  label: string;
  color: string;
  bg: string;
  block: PillarBlock;
}) {
  return (
    <div style={{
      border: `1px solid ${color}33`, borderRadius: 10, padding: '18px 22px',
      marginBottom: 18, background: `${bg}55`,
    }}>
      <div style={{
        fontFamily: FONT.mono, fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase',
        color, marginBottom: 12,
      }}>{label}</div>

      {/* Summary table for insurance package */}
      {block.table && <TblEl table={block.table} />}

      {/* Three-act sections if present */}
      {block.sections?.map((section, idx) => (
        <ActSectionEl key={idx} section={section} />
      ))}
    </div>
  );
}

export default ReportViewer;
