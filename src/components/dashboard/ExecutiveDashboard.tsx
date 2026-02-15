import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Bell, Users, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  getDemoScores,
  calculateOrgReadiness,
} from '../../utils/inspectionReadiness';
import InspectionReadiness from './InspectionReadiness';
import PillarCard from './PillarCard';
import LocationCard from './LocationCard';
import { DEMO_ATTENTION_ITEMS, sortAttentionItems } from './NeedsAttention';

// --------------- Demo Data ---------------

const DEMO_TREND = [
  { day: 'Mon', score: 88 },
  { day: 'Tue', score: 89 },
  { day: 'Wed', score: 89 },
  { day: 'Thu', score: 90 },
  { day: 'Fri', score: 91 },
  { day: 'Sat', score: 90 },
  { day: 'Sun', score: 91 },
];

// --------------- Helpers ---------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-lg p-4 ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif' }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-xs font-semibold uppercase mb-3"
      style={{ letterSpacing: '0.1em', color: '#6b7280', fontFamily: 'Inter, sans-serif' }}
    >
      {children}
    </h3>
  );
}

// ===============================================
// EXECUTIVE DASHBOARD
// ===============================================

export default function ExecutiveDashboard() {
  const navigate = useNavigate();

  const demoLocationScores = useMemo(() => getDemoScores(), []);
  const orgResult = useMemo(() => calculateOrgReadiness(demoLocationScores), [demoLocationScores]);

  // Get the single most critical item
  const sorted = sortAttentionItems(DEMO_ATTENTION_ITEMS);
  const topItem = sorted[0];

  const userName = 'James Wilson';
  const locationCount = demoLocationScores.length;

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Greeting */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {getGreeting()}, {userName}.
        </h2>
        <p className="text-sm text-gray-500">{locationCount} locations</p>
      </div>

      {/* Inspection Readiness */}
      <Card>
        <InspectionReadiness
          score={orgResult.overall}
          jurisdiction="California Health Code + NFPA 96 2024"
          trend="up"
        />
      </Card>

      {/* Pillar Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PillarCard
          pillar="food_safety"
          score={orgResult.foodSafety.score}
          opsScore={orgResult.foodSafety.ops}
          docsScore={orgResult.foodSafety.docs}
        />
        <PillarCard
          pillar="fire_safety"
          score={orgResult.fireSafety.score}
          opsScore={orgResult.fireSafety.ops}
          docsScore={orgResult.fireSafety.docs}
        />
      </div>

      {/* Needs Your Attention — single most critical item */}
      <Card>
        <SectionHeader>Needs Your Attention</SectionHeader>
        {topItem ? (
          <div
            className="flex items-start gap-3 p-3 rounded-lg"
            style={{
              borderLeft: `4px solid ${topItem.severity === 'critical' ? '#dc2626' : '#d4af37'}`,
              backgroundColor: topItem.severity === 'critical' ? '#fef2f2' : '#fffbeb',
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {topItem.locationName}: {topItem.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{topItem.detail}</p>
            </div>
            <button
              onClick={() => navigate(topItem.actionRoute)}
              className="text-xs font-medium shrink-0 px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1e4d6b' }}
            >
              {topItem.actionLabel} →
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-4 justify-center rounded-lg" style={{ backgroundColor: '#f0fdf4' }}>
            <span className="text-green-600 font-medium text-sm">All locations on track &#x2705;</span>
          </div>
        )}
      </Card>

      {/* Location Cards */}
      <div>
        <SectionHeader>Locations</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {demoLocationScores.map((loc) => (
            <LocationCard
              key={loc.locationId}
              locationId={loc.locationId}
              locationName={loc.locationName}
              score={loc.score.overall}
              onClick={() => navigate(`/dashboard?location=${loc.locationId}`)}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Click any location to drill down</p>
      </div>

      {/* Trend + Strategic Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trend Chart */}
        <Card>
          <SectionHeader>This Week's Trend</SectionHeader>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DEMO_TREND} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="execScoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e4d6b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1e4d6b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[85, 95]}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                  formatter={(value: number) => [`${value}%`, 'Score']}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#1e4d6b"
                  strokeWidth={2}
                  fill="url(#execScoreGradient)"
                  dot={{ r: 3, fill: '#1e4d6b' }}
                  activeDot={{ r: 5, fill: '#1e4d6b' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Strategic Actions */}
        <Card>
          <SectionHeader>Actions</SectionHeader>
          <div className="space-y-1">
            {([
              { icon: BarChart3, label: 'Generate Org Report', route: '/reports' },
              { icon: Bell, label: 'View All Alerts', route: '/alerts' },
              { icon: Users, label: 'Team Activity', route: '/team' },
              { icon: TrendingUp, label: 'Benchmarks', route: '/benchmarks' },
            ] as const).map((action) => (
              <button
                key={action.route}
                onClick={() => navigate(action.route)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-gray-50 transition-colors"
              >
                <action.icon size={20} style={{ color: '#1e4d6b' }} />
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
                <span className="ml-auto text-gray-400 text-xs">&rarr;</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
