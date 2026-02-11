import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Flame,
  UtensilsCrossed,
  FileCheck,
  Settings2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  Code,
  ExternalLink,
  Info,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { AiUpgradePrompt } from '../components/AiUpgradePrompt';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { getAiTier, isFeatureAvailable } from '../lib/aiTier';
import { locations, locationScores } from '../data/demoData';
import {
  calculateInsuranceRiskScore,
  calculateOrgInsuranceRiskScore,
  getInsuranceRiskTier,
  type InsuranceRiskCategory,
  type InsuranceRiskFactor,
  type InsuranceActionItem,
  type InsuranceRiskResult,
} from '../lib/insuranceRiskScore';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const CATEGORY_ICONS: Record<string, typeof Flame> = {
  fire: Flame,
  foodSafety: UtensilsCrossed,
  documentation: FileCheck,
  operational: Settings2,
};

const CATEGORY_COLORS: Record<string, string> = {
  fire: '#ef4444',
  foodSafety: '#3b82f6',
  documentation: '#8b5cf6',
  operational: '#06b6d4',
};

function StatusIcon({ status }: { status: InsuranceRiskFactor['status'] }) {
  switch (status) {
    case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Info className="h-4 w-4 text-gray-400" />;
  }
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(2, score)}%`, backgroundColor: color }} />
    </div>
  );
}

function PriorityBadge({ priority }: { priority: InsuranceActionItem['priority'] }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    high: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
    medium: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    low: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  };
  const s = styles[priority];
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, textTransform: 'uppercase' }}>
      {priority}
    </span>
  );
}

export function InsuranceRisk() {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const { isDemoMode } = useDemo();
  const aiTier = getAiTier(isDemoMode);

  const params = new URLSearchParams(window.location.search);
  const locationParam = params.get('location') || 'all';

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Calculate scores
  const riskResult: InsuranceRiskResult = locationParam === 'all'
    ? calculateOrgInsuranceRiskScore()
    : calculateInsuranceRiskScore(locationParam);

  const tierInfo = getInsuranceRiskTier(riskResult.overall);

  const handleLocationChange = (locId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('location', locId);
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
    navigate(`/insurance-risk?location=${locId}`, { replace: true });
  };

  return (
    <div className="max-w-6xl mx-auto" style={F}>
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Insurance Risk Score' }]} />

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
            <Shield className="h-6 w-6" style={{ color: '#1e4d6b' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Insurance Risk Score</h1>
            <p className="text-sm text-gray-500">Kitchen risk assessment designed to support insurance conversations</p>
          </div>
        </div>
      </div>

      {/* Location Selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => handleLocationChange('all')}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={locationParam === 'all'
            ? { backgroundColor: '#1e4d6b', color: 'white' }
            : { backgroundColor: '#f3f4f6', color: '#374151' }}
        >
          All Locations
        </button>
        {locations.map(loc => (
          <button
            key={loc.urlId}
            onClick={() => handleLocationChange(loc.urlId)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={locationParam === loc.urlId
              ? { backgroundColor: '#1e4d6b', color: 'white' }
              : { backgroundColor: '#f3f4f6', color: '#374151' }}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Overall Score Hero */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Score Circle */}
          <div className="flex-shrink-0 text-center">
            <div
              className="w-36 h-36 rounded-full flex items-center justify-center border-4"
              style={{ borderColor: tierInfo.color, backgroundColor: tierInfo.bg }}
            >
              <div>
                <div className="text-4xl font-bold" style={{ color: tierInfo.color }}>{riskResult.overall}</div>
                <div className="text-xs text-gray-500 font-medium">of 100</div>
              </div>
            </div>
            <div
              className="mt-3 inline-block px-4 py-1.5 rounded-full text-sm font-bold"
              style={{ backgroundColor: tierInfo.bg, color: tierInfo.color, border: `1px solid ${tierInfo.color}` }}
            >
              {riskResult.tier}
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {riskResult.overall >= 90
                ? 'Strong Risk Profile'
                : riskResult.overall >= 75
                ? 'Solid Risk Profile'
                : riskResult.overall >= 60
                ? 'Risk Profile Needs Improvement'
                : 'Significant Risk Factors Identified'}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {riskResult.overall >= 90
                ? 'This risk profile positions your operation favorably for insurance conversations. Continuous documentation through EvidLY is designed to support Protective Safeguard Endorsement compliance.'
                : riskResult.overall >= 75
                ? 'A solid foundation with some areas for improvement. Addressing the action items below is designed to strengthen your position for carrier conversations.'
                : riskResult.overall >= 60
                ? 'Several risk factors need attention. Prioritizing the critical items below can meaningfully improve your risk profile for insurance purposes.'
                : 'Multiple high-risk factors identified. Immediate action on fire safety and documentation gaps is essential for maintaining adequate coverage.'}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {riskResult.categories.map(cat => {
                const catTier = getInsuranceRiskTier(cat.score);
                return (
                  <div key={cat.key} className="text-center p-3 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                    <div className="text-xl font-bold" style={{ color: catTier.color }}>{cat.score}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{cat.name}</div>
                    <div className="text-[10px] text-gray-400">{Math.round(cat.weight * 100)}% weight</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-gray-400">
              <Info className="h-3 w-3" />
              <span>{riskResult.factorsEvaluated} factors evaluated across {riskResult.categories.length} categories</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {riskResult.categories.map(cat => {
          const Icon = CATEGORY_ICONS[cat.key] || Shield;
          const catColor = CATEGORY_COLORS[cat.key] || '#6b7280';
          const catTier = getInsuranceRiskTier(cat.score);
          const isExpanded = expandedCategory === cat.key;
          const passCount = cat.factors.filter(f => f.status === 'pass').length;
          const failCount = cat.factors.filter(f => f.status === 'fail').length;

          return (
            <div key={cat.key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Card Header */}
              <div
                className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: catColor + '15' }}>
                      <Icon className="h-5 w-5" style={{ color: catColor }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{cat.name}</div>
                      <div className="text-[11px] text-gray-400">{Math.round(cat.weight * 100)}% of total score</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xl font-bold" style={{ color: catTier.color }}>{cat.score}</div>
                    </div>
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-gray-400" />
                      : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
                <ScoreBar score={cat.score} color={catTier.color} />
                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> {passCount} passing</span>
                  {failCount > 0 && <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> {failCount} failing</span>}
                  <span>{cat.factors.length} factors</span>
                </div>
              </div>

              {/* Expanded Sub-factors */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-3">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                        <th className="text-left py-1.5 font-semibold">Factor</th>
                        <th className="text-center py-1.5 font-semibold w-12">Status</th>
                        <th className="text-right py-1.5 font-semibold w-14">Score</th>
                        <th className="text-right py-1.5 font-semibold w-16">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.factors.map((factor, fi) => (
                        <tr key={fi} className="border-t border-gray-50">
                          <td className="py-2.5">
                            <div className="text-xs font-medium text-gray-800">{factor.name}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">{factor.detail}</div>
                            <div className="text-[10px] text-gray-300 mt-0.5">Ref: {factor.reference}</div>
                          </td>
                          <td className="text-center py-2.5"><StatusIcon status={factor.status} /></td>
                          <td className="text-right py-2.5">
                            <span className="text-xs font-bold" style={{ color: getInsuranceRiskTier(factor.score).color }}>{factor.score}</span>
                          </td>
                          <td className="text-right py-2.5">
                            <span className="text-[11px] text-gray-400">{Math.round(factor.weight * 100)}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Location Comparison Table (when All selected) */}
      {locationParam === 'all' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Risk Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left py-2 font-semibold">Location</th>
                  <th className="text-center py-2 font-semibold">Overall</th>
                  <th className="text-center py-2 font-semibold">Fire Risk</th>
                  <th className="text-center py-2 font-semibold">Food Safety</th>
                  <th className="text-center py-2 font-semibold">Documentation</th>
                  <th className="text-center py-2 font-semibold">Operational</th>
                  <th className="text-center py-2 font-semibold">Tier</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(loc => {
                  const locResult = calculateInsuranceRiskScore(loc.urlId);
                  const locTier = getInsuranceRiskTier(locResult.overall);
                  return (
                    <tr key={loc.urlId} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => handleLocationChange(loc.urlId)}>
                      <td className="py-3">
                        <div className="text-sm font-medium text-gray-900">{loc.name}</div>
                        <div className="text-[11px] text-gray-400">Compliance: {locationScores[loc.urlId]?.overall || 0}</div>
                      </td>
                      <td className="text-center py-3">
                        <span className="text-sm font-bold" style={{ color: locTier.color }}>{locResult.overall}</span>
                      </td>
                      {locResult.categories.map(cat => {
                        const ct = getInsuranceRiskTier(cat.score);
                        return (
                          <td key={cat.key} className="text-center py-3">
                            <span className="text-sm font-medium" style={{ color: ct.color }}>{cat.score}</span>
                          </td>
                        );
                      })}
                      <td className="text-center py-3">
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{ backgroundColor: locTier.bg, color: locTier.color, border: `1px solid ${locTier.color}` }}
                        >
                          {locResult.tier}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* What Carriers See */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
            <ShieldAlert className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">What Insurance Carriers Evaluate</h3>
            <p className="text-xs text-gray-500">Understanding how your operations map to underwriting factors</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold text-gray-900">Property Insurance (Fire)</span>
            </div>
            <p className="text-xs text-gray-600 mb-2">Fire is the #1 underwriting concern for commercial kitchens. Carriers evaluate:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" /> ANSUL/UL 300 wet chemical systems installed and inspected</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" /> Hood and duct cleaning per NFPA 96 schedule</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" /> Fire suppression semi-annual inspection (NFPA 17A)</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" /> Fire extinguisher annual inspection (NFPA 10)</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-900">General Liability</span>
            </div>
            <p className="text-xs text-gray-600 mb-2">Carriers assess foodborne illness and premises liability risk:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" /> Food safety compliance and training documentation</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" /> Health department inspection scores and history</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" /> Claims history (frequency and severity)</li>
              <li className="flex items-start gap-1.5"><CheckCircle className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" /> Safety training programs documented</li>
            </ul>
          </div>
        </div>

        {/* PSE Explanation */}
        <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#fdf8e8', border: '1px solid #d4af37' }}>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4" style={{ color: '#d4af37' }} />
            <span className="text-sm font-semibold text-gray-900">Protective Safeguard Endorsement (PSE)</span>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            Most commercial kitchen policies include a Protective Safeguard Endorsement. This means: if you declared you have fire suppression, hood cleaning compliance, or other safety systems, and you fail to maintain them, the carrier <strong>can deny your claim</strong>. EvidLY's continuous documentation is designed to protect operators from this scenario by providing timestamped, verifiable records of system maintenance and compliance.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50">
          <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <strong>Important:</strong> This risk score is an internal assessment tool designed to support conversations with insurance carriers. It does not guarantee premium reductions, carrier acceptance, or specific underwriting outcomes. Insurance pricing decisions are made solely by carriers based on their proprietary models. EvidLY does not act as an insurance broker, agent, or advisor.
          </p>
        </div>
      </div>

      {/* Action Items */}
      {riskResult.actionItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Actions to Improve Your Score</h3>
              <p className="text-xs text-gray-500">Ranked by potential impact on your insurance risk score</p>
            </div>
          </div>
          <div className="space-y-3">
            {riskResult.actionItems.slice(0, 8).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(item.actionLink)}
              >
                <div className="flex-shrink-0">
                  <PriorityBadge priority={item.priority} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                  <div className="text-[11px] text-gray-400">{item.category} — {item.action}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold text-green-600">+{item.potentialGain} pts</div>
                  <div className="text-[10px] text-gray-400">potential gain</div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Access (Premium Gated) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
            <Code className="h-5 w-5" style={{ color: '#1e4d6b' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Carrier API Access</h3>
            <p className="text-xs text-gray-500">Provide insurance carriers direct access to your risk score data</p>
          </div>
        </div>

        {!isFeatureAvailable(aiTier, 'predictiveAlerts') ? (
          <AiUpgradePrompt
            feature="Insurance Risk Score API"
            description="Give your insurance carrier direct, authenticated API access to your real-time risk score data — designed to support evidence-based underwriting conversations."
          />
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50 font-mono text-xs">
              <div className="text-gray-500 mb-2">// API Endpoint</div>
              <div className="text-gray-900">GET /api/v1/risk-score</div>
              <div className="text-gray-500 mt-3 mb-1">// Authentication</div>
              <div className="text-gray-900">Header: X-API-Key: &lt;carrier_api_key&gt;</div>
              <div className="text-gray-500 mt-3 mb-1">// Sample Response</div>
              <pre className="text-gray-700 whitespace-pre-wrap">{JSON.stringify({
                organization_id: "org_abc123",
                scores: [{
                  location_id: "loc_001",
                  overall_score: riskResult.overall,
                  tier: riskResult.tier,
                  categories: {
                    fire_risk: riskResult.categories[0]?.score || 0,
                    food_safety: riskResult.categories[1]?.score || 0,
                    documentation: riskResult.categories[2]?.score || 0,
                    operational: riskResult.categories[3]?.score || 0,
                  },
                  factors_evaluated: riskResult.factorsEvaluated,
                  data_freshness: new Date().toISOString().split('T')[0],
                }],
                api_version: "1.0",
              }, null, 2)}</pre>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="h-3.5 w-3.5" />
              <span>Rate limits: 60 requests/minute, 1,000 requests/day per API key</span>
            </div>
          </div>
        )}
      </div>

      {/* Carrier Report Download (Premium Gated) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef4f8' }}>
              <Download className="h-5 w-5" style={{ color: '#1e4d6b' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Carrier-Ready Risk Report</h3>
              <p className="text-xs text-gray-500">PDF report formatted for insurance carrier review</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!isFeatureAvailable(aiTier, 'predictiveAlerts')) {
                setShowUpgradeModal(true);
              } else {
                alert('Carrier risk report PDF download — available in production');
              }
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
            style={{ backgroundColor: '#1e4d6b' }}
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Score Methodology */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Score Methodology</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Fire Risk', weight: '40%', desc: '9 factors mapped to NFPA standards', color: '#ef4444' },
            { label: 'Food Safety', weight: '30%', desc: '9 factors mapped to FDA Food Code', color: '#3b82f6' },
            { label: 'Documentation', weight: '20%', desc: '7 factors covering permits & certs', color: '#8b5cf6' },
            { label: 'Operational', weight: '10%', desc: '5 factors measuring consistency', color: '#06b6d4' },
          ].map(m => (
            <div key={m.label} className="p-3 rounded-lg bg-gray-50 text-center">
              <div className="text-lg font-bold" style={{ color: m.color }}>{m.weight}</div>
              <div className="text-xs font-semibold text-gray-900 mt-0.5">{m.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{m.desc}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">
          Higher scores indicate lower risk. Fire risk is weighted most heavily at 40% because fire is the #1 underwriting concern for commercial kitchens. All factors are derived from data EvidLY already collects through daily operations.
        </p>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <AiUpgradePrompt
          feature="Carrier-Ready Risk Report"
          description="Generate a formatted PDF risk report designed for sharing with your insurance carrier during renewal conversations."
          variant="modal"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}
