import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import {
  Network, ChevronRight, ChevronDown, MapPin, Settings,
  ArrowUp, ArrowDown, Minus, Thermometer, ClipboardCheck,
  Wrench, FileWarning, Building2,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import {
  demoHierarchyConfig, demoHierarchyTree, demoHierarchyTreeThirtyDaysAgo,
  findNode, getAncestors, computeRollup,
  HIERARCHY_WEEKLY_HISTORY, HIERARCHY_COMMON_ISSUES, LEVEL_COLORS,
  type HierarchyNode as HNode, type HierarchyIssue,
} from '../data/hierarchyDemoData';

// ── Helpers ────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 90) return '#22c55e';
  if (s >= 75) return '#eab308';
  if (s >= 60) return '#f59e0b';
  return '#ef4444';
}

function ScoreCircle({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={3} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="central" className="transform rotate-90 origin-center" style={{ fontSize: size * 0.28, fontWeight: 700, fill: '#1f2937' }}>
        {score}
      </text>
    </svg>
  );
}

function TrendBadge({ value }: { value: number }) {
  if (Math.abs(value) < 1) return <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400"><Minus className="h-2.5 w-2.5" /> 0</span>;
  if (value > 0) return <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600"><ArrowUp className="h-2.5 w-2.5" /> +{value}</span>;
  return <span className="inline-flex items-center gap-0.5 text-[10px] text-red-500"><ArrowDown className="h-2.5 w-2.5" /> {value}</span>;
}

function getNodeTrend(nodeId: string): number {
  const current = findNode(demoHierarchyTree, nodeId);
  const prev = findNode(demoHierarchyTreeThirtyDaysAgo, nodeId);
  if (!current || !prev) return 0;
  return current.complianceScore - prev.complianceScore;
}

function getPillarTrend(nodeId: string, pillar: 'foodSafety' | 'fireSafety' | 'vendorCompliance'): number {
  const current = findNode(demoHierarchyTree, nodeId);
  const prev = findNode(demoHierarchyTreeThirtyDaysAgo, nodeId);
  if (!current || !prev) return 0;
  return current[pillar] - prev[pillar];
}

const ISSUE_ICONS = {
  thermometer: Thermometer,
  clipboard: ClipboardCheck,
  wrench: Wrench,
  'file-warning': FileWarning,
};

// ── Heat Map Cell ──────────────────────────────────────────────

function HeatMapCell({ score, label, onClick }: { score: number; label: string; onClick: () => void }) {
  const bg = score >= 90 ? '#dcfce7' : score >= 75 ? '#fef9c3' : score >= 60 ? '#fed7aa' : '#fecaca';
  const text = score >= 90 ? '#166534' : score >= 75 ? '#854d0e' : score >= 60 ? '#9a3412' : '#991b1b';
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-lg border border-gray-200 text-center hover:opacity-80 transition-opacity cursor-pointer"
      style={{ backgroundColor: bg }}
    >
      <p className="text-lg font-bold" style={{ color: text }}>{score}</p>
      <p className="text-[10px] truncate mt-0.5" style={{ color: text + 'cc' }}>{label}</p>
    </button>
  );
}

// ── Tree Node ──────────────────────────────────────────────────

function TreeNode({ node, depth = 0, selectedId, onSelect }: {
  node: HNode; depth?: number; selectedId: string; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const trend = getNodeTrend(node.id);

  return (
    <div>
      <button
        onClick={() => { onSelect(node.id); if (hasChildren) setOpen(!open); }}
        className={`w-full flex items-center gap-2 py-2.5 px-3 rounded-lg text-left transition-colors cursor-pointer ${
          isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
        }`}
        style={{ marginLeft: depth * 20 }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <div className="w-3.5 flex-shrink-0" />
        )}
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: LEVEL_COLORS[node.level] || '#6b7280' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">{node.name}</span>
            <span className="text-[10px] text-gray-400">{node.code}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <TrendBadge value={trend} />
          <span className="text-[10px] text-gray-500">{node.locationCount} loc</span>
          <ScoreCircle score={node.complianceScore} size={32} />
        </div>
      </button>
      {open && hasChildren && (
        <div>
          {node.children!.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export function OrgHierarchy() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentNodeId = searchParams.get('node') || 'pcd-corp';
  const [showConfig, setShowConfig] = useState(false);
  const [rollupMethod, setRollupMethod] = useState<'weighted' | 'equal'>(demoHierarchyConfig.rollupMethod);

  const selectedNode = findNode(demoHierarchyTree, currentNodeId) || demoHierarchyTree;
  const breadcrumb = getAncestors(demoHierarchyTree, currentNodeId);
  const weeklyHistory = HIERARCHY_WEEKLY_HISTORY[currentNodeId] || [];
  const issues = HIERARCHY_COMMON_ISSUES[selectedNode.level] || HIERARCHY_COMMON_ISSUES.location;

  const handleSelectNode = (id: string) => {
    setSearchParams({ node: id });
  };

  // Best/worst children
  const sortedChildren = useMemo(() => {
    if (!selectedNode.children || selectedNode.children.length < 2) return { best: null, worst: null };
    const sorted = [...selectedNode.children].sort((a, b) => b.complianceScore - a.complianceScore);
    return { best: sorted[0], worst: sorted[sorted.length - 1] };
  }, [selectedNode]);

  // Recompute scores if rollup method changes (demo only — toggle effect)
  const displayNode = useMemo(() => {
    if (rollupMethod === demoHierarchyConfig.rollupMethod) return selectedNode;
    if (!selectedNode.children || selectedNode.children.length === 0) return selectedNode;
    const recomputed = computeRollup(selectedNode.children, rollupMethod);
    return { ...selectedNode, complianceScore: recomputed.overall, foodSafety: recomputed.foodSafety, fireSafety: recomputed.fireSafety, vendorCompliance: recomputed.vendorCompliance };
  }, [selectedNode, rollupMethod]);

  const levelLabel = demoHierarchyConfig.levels.find(l => l.key === selectedNode.level)?.label || selectedNode.level;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Hierarchy</h1>
          <p className="text-sm text-gray-500 mt-1">Navigate your org structure and see compliance roll-ups at every level</p>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
            showConfig ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Settings className="h-4 w-4" />
          Hierarchy Config
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm bg-white rounded-lg border border-gray-200 px-4 py-2.5">
        <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
        {breadcrumb.map((node, i) => (
          <span key={node.id} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300" />}
            {i < breadcrumb.length - 1 ? (
              <button
                onClick={() => handleSelectNode(node.id)}
                className="font-medium hover:underline cursor-pointer"
                style={{ color: '#1e4d6b' }}
              >
                {node.name}
              </button>
            ) : (
              <span className="font-semibold text-gray-900">{node.name}</span>
            )}
          </span>
        ))}
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{
          backgroundColor: LEVEL_COLORS[selectedNode.level] + '20',
          color: LEVEL_COLORS[selectedNode.level],
          border: `1px solid ${LEVEL_COLORS[selectedNode.level]}40`,
        }}>
          {levelLabel}
        </span>
      </div>

      {/* Hierarchy Configuration Panel */}
      {showConfig && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Network className="h-4 w-4" style={{ color: '#1e4d6b' }} />
            <h3 className="text-sm font-semibold text-gray-900">Hierarchy Configuration — {demoHierarchyConfig.tenantName}</h3>
          </div>

          {/* Levels */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Hierarchy Levels ({demoHierarchyConfig.levels.length} of 6)</p>
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {demoHierarchyConfig.levels.map((h, i) => (
                <span key={h.key} className="flex items-center gap-1">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-white">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: LEVEL_COLORS[h.key] || '#6b7280' }} />
                    <span className="text-xs font-medium text-gray-900">{h.label}</span>
                    {h.canAttachLocations && (
                      <MapPin className="h-3 w-3 text-green-500" />
                    )}
                  </span>
                  {i < demoHierarchyConfig.levels.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-gray-400">
              <MapPin className="h-2.5 w-2.5 inline text-green-500" /> = locations can be attached at this level
            </p>
          </div>

          {/* Rollup Rules */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Score Rollup Method</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="rollup" checked={rollupMethod === 'weighted'} onChange={() => setRollupMethod('weighted')} className="accent-[#1e4d6b]" />
                <span className="text-xs text-gray-600">Weighted by location count</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="rollup" checked={rollupMethod === 'equal'} onChange={() => setRollupMethod('equal')} className="accent-[#1e4d6b]" />
                <span className="text-xs text-gray-600">Equal weight</span>
              </label>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {rollupMethod === 'weighted'
                ? 'Scores at each level = weighted average of children (weighted by number of locations underneath)'
                : 'Scores at each level = simple average of direct children scores'}
            </p>
          </div>

          {/* Rollup flow diagram */}
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Rollup Flow</p>
            <div className="flex items-center gap-1 flex-wrap">
              {[...demoHierarchyConfig.levels].reverse().map((h, i) => (
                <span key={h.key} className="flex items-center gap-1">
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded" style={{
                    backgroundColor: LEVEL_COLORS[h.key] + '20',
                    color: LEVEL_COLORS[h.key],
                    border: `1px solid ${LEVEL_COLORS[h.key]}40`,
                  }}>
                    {h.label} score{h.key === 'location' ? ' (actual)' : ` = ${rollupMethod === 'weighted' ? 'weighted' : 'simple'} avg`}
                  </span>
                  {i < demoHierarchyConfig.levels.length - 1 && <ArrowUp className="h-3 w-3 text-gray-400" />}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => toast.success('Hierarchy configuration saved')} className="px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer" style={{ backgroundColor: '#1e4d6b' }}>Save Config</button>
            <button onClick={() => toast.info('Add hierarchy level coming soon')} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">+ Add Level</button>
            <button onClick={() => toast.info('Remove hierarchy level coming soon')} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">- Remove Level</button>
          </div>
        </div>
      )}

      {/* Main Content: Tree + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Tree View */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Organization Tree</h3>
            <div className="flex items-center gap-3">
              {demoHierarchyConfig.levels.map(l => (
                <span key={l.key} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: LEVEL_COLORS[l.key] }} />
                  <span className="text-[9px] text-gray-400">{l.label}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-0.5">
            <TreeNode node={demoHierarchyTree} selectedId={currentNodeId} onSelect={handleSelectNode} />
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header + Score */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-4">
              <ScoreCircle score={displayNode.complianceScore} size={56} />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900">{selectedNode.name}</h3>
                <p className="text-[10px] text-gray-400">{selectedNode.code} · {levelLabel}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{selectedNode.locationCount} location{selectedNode.locationCount !== 1 ? 's' : ''}</span>
                  <TrendBadge value={getNodeTrend(selectedNode.id)} />
                  <span className="text-[10px] text-gray-400">vs 30 days ago</span>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-3 mb-4">
              <h4 className="text-xs font-semibold text-gray-700">Score Breakdown</h4>
              {([
                { label: 'Food Safety', value: displayNode.foodSafety, pillar: 'foodSafety' as const },
                { label: 'Fire Safety', value: displayNode.fireSafety, pillar: 'fireSafety' as const },
                { label: 'Vendor Compliance', value: displayNode.vendorCompliance, pillar: 'vendorCompliance' as const },
              ]).map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <TrendBadge value={getPillarTrend(selectedNode.id, item.pillar)} />
                      <span className="text-xs font-bold" style={{ color: scoreColor(item.value) }}>{item.value}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${item.value}%`, backgroundColor: scoreColor(item.value) }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Rollup explanation */}
            {selectedNode.children && selectedNode.children.length > 0 && (
              <div className="p-2.5 rounded-lg bg-gray-50 mb-4">
                <p className="text-[10px] text-gray-500">
                  <span className="font-semibold text-gray-700">{displayNode.complianceScore}%</span> = {rollupMethod === 'weighted' ? 'weighted' : 'simple'} average of {selectedNode.children.length} {
                    (() => {
                      const idx = demoHierarchyConfig.levels.findIndex(l => l.key === selectedNode.level);
                      return demoHierarchyConfig.levels[idx + 1]?.label?.toLowerCase() || 'sub-unit';
                    })()
                  }s
                  {rollupMethod === 'weighted' && ' (weighted by location count)'}
                </p>
              </div>
            )}

            {/* Best / Worst children */}
            {selectedNode.children && selectedNode.children.length > 1 && sortedChildren.best && sortedChildren.worst && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button onClick={() => handleSelectNode(sortedChildren.best!.id)} className="p-2.5 rounded-lg border border-green-200 bg-green-50/50 text-left cursor-pointer hover:bg-green-50 transition-colors">
                  <p className="text-[10px] font-semibold text-green-700 mb-1">Best Performing</p>
                  <p className="text-xs font-bold text-gray-900">{sortedChildren.best.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-sm font-bold text-green-700">{sortedChildren.best.complianceScore}%</span>
                    <TrendBadge value={getNodeTrend(sortedChildren.best.id)} />
                  </div>
                </button>
                <button onClick={() => handleSelectNode(sortedChildren.worst!.id)} className="p-2.5 rounded-lg border border-red-200 bg-red-50/50 text-left cursor-pointer hover:bg-red-50 transition-colors">
                  <p className="text-[10px] font-semibold text-red-700 mb-1">Needs Attention</p>
                  <p className="text-xs font-bold text-gray-900">{sortedChildren.worst.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-sm font-bold text-red-600">{sortedChildren.worst.complianceScore}%</span>
                    <TrendBadge value={getNodeTrend(sortedChildren.worst.id)} />
                  </div>
                </button>
              </div>
            )}

            {/* Children list */}
            {selectedNode.children && selectedNode.children.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">
                  {(() => {
                    const idx = demoHierarchyConfig.levels.findIndex(l => l.key === selectedNode.level);
                    return demoHierarchyConfig.levels[idx + 1]?.label || 'Sub-unit';
                  })()}s ({selectedNode.children.length})
                </h4>
                <div className="space-y-1.5">
                  {[...selectedNode.children].sort((a, b) => b.complianceScore - a.complianceScore).map(c => (
                    <button key={c.id} onClick={() => handleSelectNode(c.id)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-left">
                      <span className="text-xs text-gray-700">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <TrendBadge value={getNodeTrend(c.id)} />
                        <span className="text-[10px] text-gray-400">{c.locationCount} loc</span>
                        <span className="text-xs font-bold" style={{ color: scoreColor(c.complianceScore) }}>{c.complianceScore}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Common Issues */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Common Issues at {levelLabel} Level</h4>
              <div className="space-y-1.5">
                {issues.map((issue: HierarchyIssue, i: number) => {
                  const Icon = ISSUE_ICONS[issue.icon];
                  return (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                      <Icon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      <span className="text-xs text-gray-700 flex-1">{issue.label}</span>
                      <span className="text-[10px] font-medium text-amber-600">{issue.pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Heat Map */}
          {selectedNode.children && selectedNode.children.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Compliance Heat Map</h4>
              <div className={`grid gap-2 ${selectedNode.children.length <= 3 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {[...selectedNode.children].sort((a, b) => b.complianceScore - a.complianceScore).map(c => (
                  <HeatMapCell key={c.id} score={c.complianceScore} label={c.name} onClick={() => handleSelectNode(c.id)} />
                ))}
              </div>
              <div className="flex items-center justify-center gap-3 mt-3 pt-2 border-t border-gray-100">
                {[
                  { label: '90+', bg: '#dcfce7' },
                  { label: '75-89', bg: '#fef9c3' },
                  { label: '60-74', bg: '#fed7aa' },
                  { label: '<60', bg: '#fecaca' },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: l.bg, border: '1px solid #e5e7eb' }} />
                    <span className="text-[9px] text-gray-400">{l.label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Trend Chart */}
          {weeklyHistory.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Score Trend (12 Weeks)</h4>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" fontSize={10} />
                    <YAxis domain={[0, 100]} fontSize={10} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="overall" stroke="#1e4d6b" strokeWidth={2} dot={{ r: 2 }} name="Overall" />
                    <Line type="monotone" dataKey="foodSafety" stroke="#22c55e" strokeWidth={1} dot={false} strokeDasharray="4 2" name="Food Safety" />
                    <Line type="monotone" dataKey="fireSafety" stroke="#d4af37" strokeWidth={1} dot={false} strokeDasharray="4 2" name="Fire Safety" />
                    <Line type="monotone" dataKey="vendorCompliance" stroke="#6366f1" strokeWidth={1} dot={false} strokeDasharray="4 2" name="Vendor Compliance" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
