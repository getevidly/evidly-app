/**
 * INTEL-HUB-1 — Executive Snapshot Panel
 *
 * Renders the full ExecutiveSnapshot beautifully with 12 sections.
 * This is the crown jewel of the Intelligence Hub.
 */

import { useState } from 'react';
import {
  TrendingUp, TrendingDown, ArrowUp, ArrowDown,
  ChevronDown, ChevronUp, Shield, AlertTriangle, Target,
  DollarSign, Users, FileText, Download, Share2, Send,
  Copy, Printer, Brain, CheckCircle, Clock, Minus,
  BarChart3, Sparkles, MapPin,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, GOLD, NAVY, BODY_TEXT, MUTED,
  PAGE_BG, TEXT_TERTIARY, PANEL_BG, BORDER_SUBTLE, FONT, KEYFRAMES, stagger,
} from '../dashboard/shared/constants';
import type { ExecutiveSnapshot, StrategicRecommendation } from '../../data/demoIntelligenceData';
import { DEMO_CLIENT_PROFILE } from '../../lib/businessImpactContext';

interface Props {
  snapshot: ExecutiveSnapshot;
}

function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function TrendArrow({ value }: { value: number }) {
  if (Math.abs(value) < 0.1) return <span className="text-[11px] text-gray-400 flex items-center gap-0.5"><Minus className="h-3 w-3" /> 0.0</span>;
  if (value > 0) return <span className="text-[11px] text-green-600 flex items-center gap-0.5 font-semibold"><ArrowUp className="h-3 w-3" /> +{value.toFixed(1)}</span>;
  return <span className="text-[11px] text-red-500 flex items-center gap-0.5 font-semibold"><ArrowDown className="h-3 w-3" /> {value.toFixed(1)}</span>;
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: typeof Shield; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl mb-4 overflow-hidden" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        style={{ borderBottom: open ? `1px solid ${BORDER_SUBTLE}` : 'none' }}
      >
        <Icon className="h-4 w-4" style={{ color: GOLD }} />
        <span className="text-xs font-bold uppercase tracking-wider flex-1" style={{ color: MUTED }}>{title}</span>
        {open ? <ChevronUp className="h-4 w-4" style={{ color: TEXT_TERTIARY }} /> : <ChevronDown className="h-4 w-4" style={{ color: TEXT_TERTIARY }} />}
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '2000px' : '0', opacity: open ? 1 : 0 }}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function ExecutiveSnapshotPanel({ snapshot }: Props) {
  const statusColors = {
    good: { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
    warning: { bg: '#fffbeb', text: '#92400e', border: '#fcd34d' },
    critical: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  };
  const sc = statusColors[snapshot.overall_status];

  return (
    <div style={{ ...FONT }}>
      <style>{KEYFRAMES}</style>

      {/* ── 1. STATUS BANNER ──────────────────────────── */}
      <div
        className="rounded-xl p-4 mb-5"
        style={{ backgroundColor: sc.bg, border: `1px solid ${sc.border}`, ...stagger(0) }}
      >
        <p className="text-base font-bold leading-snug" style={{ color: sc.text }}>{snapshot.one_liner}</p>
      </div>

      {/* ── 2. KEY METRICS ROW ────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5" style={stagger(1)}>
        {[
          { label: 'Food Safety', value: String(snapshot.key_metrics.food_safety_score), trend: snapshot.key_metrics.food_safety_trend, color: '#16a34a' },
          { label: 'Fire Safety', value: String(snapshot.key_metrics.fire_safety_score), trend: snapshot.key_metrics.fire_safety_trend, color: snapshot.key_metrics.fire_safety_trend >= 0 ? '#16a34a' : '#dc2626' },
          { label: 'Open Risk Items', value: String(snapshot.key_metrics.open_risk_items), trend: 0, color: '#d97706' },
          { label: 'Intel Alerts (7d)', value: String(snapshot.key_metrics.intelligence_alerts_7d), trend: 0, color: '#1e4d6b' },
          { label: 'Reg. Pipeline', value: String(snapshot.key_metrics.regulatory_pipeline), trend: 0, color: '#7c3aed' },
          { label: 'Financial Exposure', value: `${formatCurrency(snapshot.key_metrics.financial_exposure.low)}-${formatCurrency(snapshot.key_metrics.financial_exposure.high)}`, trend: 0, color: '#dc2626' },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
            <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
            {m.trend !== 0 && <div className="flex justify-center mt-0.5"><TrendArrow value={m.trend} /></div>}
            <div className="text-[10px] mt-1 font-medium" style={{ color: TEXT_TERTIARY }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── 3. EXECUTIVE SUMMARY ──────────────────────── */}
      <CollapsibleSection title="Executive Summary" icon={FileText} defaultOpen={true}>
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>Board Ready</span>
          <button
            onClick={() => { navigator.clipboard.writeText(snapshot.executive_summary); alert('Copied to clipboard'); }}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded"
            style={{ backgroundColor: PANEL_BG, color: MUTED }}
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
        <div style={{ borderLeft: `4px solid ${GOLD}`, paddingLeft: '16px' }}>
          {snapshot.executive_summary.split('\n').map((para, i) => (
            <p key={i} className="text-sm leading-relaxed mb-2" style={{ color: BODY_TEXT }}>{para}</p>
          ))}
        </div>
      </CollapsibleSection>

      {/* ── 4. RISK HEATMAP ──────────────────────────── */}
      <CollapsibleSection title="Risk Heatmap" icon={Target}>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <RadarChart data={snapshot.risk_heatmap}>
              <PolarGrid stroke={BORDER_SUBTLE} />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: MUTED }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: TEXT_TERTIARY }} />
              <Radar name="Your Score" dataKey="score" stroke={GOLD} fill={GOLD} fillOpacity={0.25} strokeWidth={2} />
              <Radar name="Industry Avg" dataKey="industry_avg" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} strokeWidth={1} strokeDasharray="4 4" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CollapsibleSection>

      {/* ── 5. EXTERNAL INTELLIGENCE SUMMARY ──────────── */}
      <CollapsibleSection title="External Intelligence" icon={Brain}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Threats */}
          <div className="rounded-lg p-3" style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}>
            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#991b1b' }}>
              <AlertTriangle className="h-3 w-3 inline mr-1" />Threats
            </h4>
            <ul className="space-y-2">
              {snapshot.threats.map((t, i) => (
                <li key={i}>
                  <div className="text-xs font-semibold" style={{ color: '#991b1b' }}>{t.title}</div>
                  <div className="text-[11px]" style={{ color: '#7f1d1d' }}>{t.detail}</div>
                </li>
              ))}
            </ul>
          </div>
          {/* Opportunities */}
          <div className="rounded-lg p-3" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#166534' }}>
              <TrendingUp className="h-3 w-3 inline mr-1" />Opportunities
            </h4>
            <ul className="space-y-2">
              {snapshot.opportunities.map((o, i) => (
                <li key={i}>
                  <div className="text-xs font-semibold" style={{ color: '#166534' }}>{o.title}</div>
                  <div className="text-[11px]" style={{ color: '#14532d' }}>{o.detail}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── 6. CORRELATION ANALYSIS ──────────────────── */}
      <CollapsibleSection title="Correlation Analysis" icon={BarChart3}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: PANEL_BG }}>
                <th className="text-left px-3 py-2 font-semibold" style={{ color: MUTED }}>External Event</th>
                <th className="text-left px-3 py-2 font-semibold" style={{ color: MUTED }}>Impact on Your Operations</th>
                <th className="text-center px-3 py-2 font-semibold" style={{ color: MUTED }}>Strength</th>
                <th className="text-left px-3 py-2 font-semibold" style={{ color: MUTED }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.correlation_analysis.map((ca, i) => (
                <tr key={i} className="border-t" style={{ borderColor: BORDER_SUBTLE }}>
                  <td className="px-3 py-2" style={{ color: BODY_TEXT }}>{ca.external_event}</td>
                  <td className="px-3 py-2" style={{ color: BODY_TEXT }}>{ca.internal_impact}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                      style={{
                        backgroundColor: ca.strength === 'strong' ? '#fef2f2' : ca.strength === 'moderate' ? '#fffbeb' : '#f0fdf4',
                        color: ca.strength === 'strong' ? '#991b1b' : ca.strength === 'moderate' ? '#92400e' : '#166534',
                      }}
                    >
                      {ca.strength}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium" style={{ color: '#1e4d6b' }}>{ca.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Industry Context Callout */}
      <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: '#fefdf5', borderLeft: `4px solid ${GOLD}`, border: `1px solid #f3e8c0`, borderLeftWidth: '4px' }}>
        <div className="flex items-center gap-1.5 mb-1">
          <MapPin className="h-3 w-3" style={{ color: GOLD }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#92400e' }}>
            Industry Context: {DEMO_CLIENT_PROFILE.segment.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="text-[11px]" style={{ color: MUTED }}>
          {DEMO_CLIENT_PROFILE.dual_jurisdiction
            ? `Dual NPS + county jurisdiction creates compounding correlation effects. External events affecting ${DEMO_CLIENT_PROFILE.primary_counties.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')} counties trigger compliance requirements from both NPS and county authorities, doubling documentation burden during enforcement surges.`
            : `As a ${DEMO_CLIENT_PROFILE.segment.replace(/_/g, ' ')} operator across ${DEMO_CLIENT_PROFILE.total_locations} locations, external events in your coverage area have amplified impact due to the ${DEMO_CLIENT_PROFILE.industry_multiplier}x industry risk multiplier.`
          }
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {DEMO_CLIENT_PROFILE.locations.map(loc => (
            <span key={loc.id} className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              {loc.name} ({loc.county})
            </span>
          ))}
        </div>
      </div>

      {/* ── 7. COMPETITOR LANDSCAPE ──────────────────── */}
      <CollapsibleSection title="Competitor Landscape" icon={Users}>
        <div className="flex items-center gap-4 mb-3">
          <div className="rounded-lg p-3 text-center flex-1" style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}>
            <div className="text-xl font-bold" style={{ color: '#991b1b' }}>{snapshot.competitor_landscape.closures}</div>
            <div className="text-[10px]" style={{ color: '#991b1b' }}>Closures</div>
          </div>
          <div className="rounded-lg p-3 text-center flex-1" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
            <div className="text-xl font-bold" style={{ color: '#92400e' }}>{snapshot.competitor_landscape.failed_inspections}</div>
            <div className="text-[10px]" style={{ color: '#92400e' }}>Failed Inspections</div>
          </div>
          <div className="rounded-lg p-3 text-center flex-1" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
            <div className="text-sm font-bold capitalize" style={{ color: '#166534' }}>{snapshot.competitor_landscape.position}</div>
            <div className="text-[10px]" style={{ color: '#166534' }}>Your Position</div>
          </div>
        </div>
        <p className="text-xs" style={{ color: MUTED }}>{snapshot.competitor_landscape.summary}</p>
      </CollapsibleSection>

      {/* ── 8. REGULATORY FORECAST ───────────────────── */}
      <CollapsibleSection title="Regulatory Forecast" icon={Shield}>
        <div className="space-y-3">
          {snapshot.regulatory_forecast.map((rf, i) => (
            <div key={i} className="rounded-lg p-3" style={{ backgroundColor: PANEL_BG, border: `1px solid ${BORDER_SUBTLE}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold" style={{ color: BODY_TEXT }}>{rf.title}</span>
                <span className="text-[10px] font-medium" style={{ color: TEXT_TERTIARY }}>{rf.compliance_deadline}</span>
              </div>
              <p className="text-[11px] mb-2" style={{ color: MUTED }}>{rf.summary}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[9px] font-semibold" style={{ color: MUTED }}>Probability</span>
                    <span className="text-[9px] font-bold" style={{ color: rf.probability >= 0.7 ? '#16a34a' : '#d97706' }}>{Math.round(rf.probability * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: CARD_BG }}>
                    <div className="h-full rounded-full" style={{ width: `${rf.probability * 100}%`, backgroundColor: rf.probability >= 0.7 ? '#16a34a' : '#d97706' }} />
                  </div>
                </div>
                <span className="text-[10px] font-medium" style={{ color: MUTED }}>
                  {formatCurrency(rf.estimated_cost_per_location.low)}–{formatCurrency(rf.estimated_cost_per_location.high)}/loc
                </span>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* ── 9. FINANCIAL IMPACT ──────────────────────── */}
      <CollapsibleSection title="Financial Impact" icon={DollarSign}>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
            <div className="text-[10px] font-bold uppercase mb-1" style={{ color: '#92400e' }}>Risk Exposure</div>
            <div className="text-lg font-bold" style={{ color: '#d97706' }}>
              {formatCurrency(snapshot.financial_impact.risk_exposure.low)}–{formatCurrency(snapshot.financial_impact.risk_exposure.high)}
            </div>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
            <div className="text-[10px] font-bold uppercase mb-1" style={{ color: '#166534' }}>Compliance Savings</div>
            <div className="text-lg font-bold" style={{ color: '#16a34a' }}>{formatCurrency(snapshot.financial_impact.compliance_savings)}</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#fefdf5', border: `1px solid ${GOLD}` }}>
            <div className="text-[10px] font-bold uppercase mb-1" style={{ color: '#92400e' }}>ROI</div>
            <div className="text-lg font-bold" style={{ color: GOLD }}>{snapshot.financial_impact.roi_ratio}</div>
          </div>
        </div>
        {/* Cost drivers bar chart */}
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={snapshot.financial_impact.top_cost_drivers} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER_SUBTLE} />
              <XAxis type="number" tick={{ fontSize: 10, fill: TEXT_TERTIARY }} tickFormatter={(v: number) => formatCurrency(v)} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: MUTED }} width={180} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="amount" fill="#d97706" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CollapsibleSection>

      {/* ── 10. INSPECTOR INTELLIGENCE ────────────────── */}
      <CollapsibleSection title="Inspector Intelligence" icon={Shield}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {snapshot.inspector_intelligence.map(ip => (
            <div key={ip.id} className="rounded-lg p-3" style={{ backgroundColor: PANEL_BG, border: `1px solid ${BORDER_SUBTLE}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: BODY_TEXT }}>{ip.county} County</span>
                <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: ip.trend === 'increasing' ? '#dc2626' : ip.trend === 'decreasing' ? '#16a34a' : TEXT_TERTIARY }}>
                  {ip.trend === 'increasing' ? <ArrowUp className="h-3 w-3" /> : ip.trend === 'decreasing' ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {ip.trend}
                </span>
              </div>
              {/* Strictness gauge */}
              <div className="mb-2">
                <div className="flex justify-between text-[9px] mb-0.5" style={{ color: TEXT_TERTIARY }}>
                  <span>Strictness</span>
                  <span>{ip.strictness_percentile}th %ile</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: CARD_BG }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${ip.strictness_percentile}%`,
                      backgroundColor: ip.strictness_percentile >= 75 ? '#dc2626' : ip.strictness_percentile >= 50 ? '#d97706' : '#16a34a',
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {ip.focus_areas.map(fa => (
                  <span key={fa} className="px-1.5 py-0.5 rounded text-[9px]" style={{ backgroundColor: CARD_BG, color: MUTED }}>{fa}</span>
                ))}
              </div>
              <p className="text-[10px] leading-snug" style={{ color: MUTED }}>{ip.recommendation}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* ── 11. STRATEGIC RECOMMENDATIONS ─────────────── */}
      <CollapsibleSection title="Strategic Recommendations" icon={Sparkles}>
        {/* Location scope context */}
        <div className="rounded-lg p-2.5 mb-3" style={{ backgroundColor: PANEL_BG, border: `1px solid ${BORDER_SUBTLE}` }}>
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="h-3 w-3" style={{ color: GOLD }} />
            <span className="text-[10px] font-bold" style={{ color: MUTED }}>
              Recommendations scoped to {DEMO_CLIENT_PROFILE.organization_name} — {DEMO_CLIENT_PROFILE.total_locations} locations across {DEMO_CLIENT_PROFILE.primary_counties.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')} counties
            </span>
          </div>
          <p className="text-[10px]" style={{ color: TEXT_TERTIARY }}>
            Peak season: {DEMO_CLIENT_PROFILE.peak_season_months.map(m => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]).join(', ')} | Industry multiplier: {DEMO_CLIENT_PROFILE.industry_multiplier}x | Suppliers: {DEMO_CLIENT_PROFILE.key_suppliers.join(', ')}
          </p>
        </div>
        <ol className="space-y-3">
          {snapshot.strategic_recommendations.map((sr, i) => (
            <li key={i} className="rounded-lg p-3" style={{ backgroundColor: sr.immediate ? '#fef2f2' : PANEL_BG, border: `1px solid ${sr.immediate ? '#fca5a5' : BORDER_SUBTLE}` }}>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                  style={{ backgroundColor: sr.priority <= 2 ? '#dc2626' : sr.priority <= 3 ? '#d97706' : '#1e4d6b', color: '#fff' }}
                >
                  P{sr.priority}
                </span>
                {sr.immediate && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700">IMMEDIATE</span>
                )}
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: CARD_BG, color: MUTED }}>
                  <Clock className="h-3 w-3 inline mr-0.5" />{sr.timeframe}
                </span>
              </div>
              <p className="text-xs font-bold mb-1" style={{ color: BODY_TEXT }}>{sr.recommendation}</p>
              <p className="text-[11px] mb-1" style={{ color: MUTED }}>{sr.rationale}</p>
              <p className="text-[10px] font-medium" style={{ color: '#16a34a' }}>{sr.estimated_impact}</p>
            </li>
          ))}
        </ol>
      </CollapsibleSection>

      {/* ── 12. FULL NARRATIVE ────────────────────────── */}
      <CollapsibleSection title="Full Narrative" icon={FileText} defaultOpen={false}>
        <div className="rounded-lg p-4" style={{ backgroundColor: '#fafbfc', border: `1px solid ${BORDER_SUBTLE}` }}>
          {snapshot.full_narrative.split('\n').map((line, i) => {
            if (line.match(/^[A-Z ]{4,}$/)) {
              return <h4 key={i} className="text-xs font-bold uppercase tracking-wider mt-4 mb-2" style={{ color: MUTED }}>{line}</h4>;
            }
            if (line.startsWith('EVIDLY INTELLIGENCE') || line.startsWith('Pacific Coast')) {
              return <p key={i} className="text-sm font-bold mb-1" style={{ color: '#1e4d6b' }}>{line}</p>;
            }
            if (line.match(/^\d\./)) {
              return <p key={i} className="text-xs mb-1 font-medium" style={{ color: BODY_TEXT }}>{line}</p>;
            }
            return line.trim() ? <p key={i} className="text-xs mb-2 leading-relaxed" style={{ color: BODY_TEXT }}>{line}</p> : <br key={i} />;
          })}
        </div>
      </CollapsibleSection>

      {/* ── Footer ────────────────────────────────────── */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: PANEL_BG, border: `1px solid ${BORDER_SUBTLE}` }}>
        <p className="text-[10px] text-center" style={{ color: TEXT_TERTIARY }}>
          Generated by EvidLY Intelligence | {new Date(snapshot.generated_at).toLocaleString()} | Sourced from {snapshot.source_count} monitored sources
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => alert('PDF export generated (demo)')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: '#1e4d6b' }}>
          <Download className="h-3.5 w-3.5" /> Export PDF
        </button>
        <button onClick={() => alert('Shareable link created (demo)')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: PANEL_BG, color: MUTED, border: `1px solid ${CARD_BORDER}` }}>
          <Share2 className="h-3.5 w-3.5" /> Share with Board
        </button>
        <button onClick={() => alert('Presentation download started (demo)')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: PANEL_BG, color: MUTED, border: `1px solid ${CARD_BORDER}` }}>
          <Printer className="h-3.5 w-3.5" /> Download for Presentation
        </button>
        <button onClick={() => alert('Sent to team (demo)')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: PANEL_BG, color: MUTED, border: `1px solid ${CARD_BORDER}` }}>
          <Send className="h-3.5 w-3.5" /> Send to Team
        </button>
      </div>
    </div>
  );
}
