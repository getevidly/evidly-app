import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Thermometer,
  ClipboardCheck,
  FileUp,
  AlertTriangle,
  CheckCircle2,
  Hammer,
  Clock,
  Radio,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import {
  getDemoScores,
  calculateOrgReadiness,
  calculateInspectionReadiness,
  DEMO_LOCATION_SCORES,
  getReadinessColor,
} from '../../utils/inspectionReadiness';
import type { InspectionReadinessScore } from '../../utils/inspectionReadiness';
import InspectionReadiness from './InspectionReadiness';
import PillarCard from './PillarCard';
import NeedsAttention, { DEMO_ATTENTION_ITEMS } from './NeedsAttention';
import LocationCard from './LocationCard';

// --------------- Demo Data ---------------

interface DemoChecklist {
  id: string;
  name: string;
  status: 'done' | 'in_progress' | 'not_started';
  assignee: string | null;
  completedAt?: string;
  items: number;
  completed: number;
}

interface DemoTemperature {
  id: string;
  name: string;
  temp: number | null;
  unit: string;
  status: 'normal' | 'alert' | 'needs_log';
  source: 'iot' | 'manual';
  lastReading: string;
}

interface DemoVendorSchedule {
  day: string;
  service: string;
  vendor: string;
  status: string;
}

const DEMO_CHECKLISTS: DemoChecklist[] = [
  { id: 'opening', name: 'Opening Checklist', status: 'done', assignee: 'Maria', completedAt: '6:15 AM', items: 12, completed: 12 },
  { id: 'midday', name: 'Midday Checklist', status: 'in_progress', assignee: 'Carlos', items: 8, completed: 4 },
  { id: 'closing', name: 'Closing Checklist', status: 'not_started', assignee: null, items: 10, completed: 0 },
];

const DEMO_TEMPERATURES: DemoTemperature[] = [
  { id: 'cooler-1', name: 'Walk-in Cooler #1', temp: 37.8, unit: '\u00B0F', status: 'normal', source: 'iot', lastReading: '2 min ago' },
  { id: 'cooler-2', name: 'Walk-in Cooler #2', temp: 39.5, unit: '\u00B0F', status: 'normal', source: 'iot', lastReading: '4 min ago' },
  { id: 'freezer-1', name: 'Walk-in Freezer', temp: -2, unit: '\u00B0F', status: 'normal', source: 'iot', lastReading: '6 min ago' },
  { id: 'prep-cooler', name: 'Prep Cooler', temp: null, unit: '\u00B0F', status: 'needs_log', source: 'manual', lastReading: '4 hours ago' },
];

const DEMO_VENDOR_SCHEDULE: DemoVendorSchedule[] = [
  { day: 'Mon', service: 'Pest Control', vendor: 'Western Pest', status: 'confirmed' },
  { day: 'Wed', service: 'Grease Trap', vendor: 'Valley Grease', status: 'confirmed' },
  { day: 'Fri', service: 'Hood Cleaning', vendor: 'Cleaning Pros Plus', status: 'confirmed' },
];

// --------------- Section Header ---------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-xs font-semibold uppercase mb-3"
      style={{ letterSpacing: '0.1em', color: '#9ca3af', fontFamily: 'Inter, sans-serif' }}
    >
      {children}
    </h3>
  );
}

// --------------- Card Wrapper ---------------

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

// --------------- Checklist Status Icon ---------------

function ChecklistIcon({ status }: { status: DemoChecklist['status'] }) {
  if (status === 'done') return <CheckCircle2 size={18} className="text-green-500" />;
  if (status === 'in_progress') return <Hammer size={18} style={{ color: '#d4af37' }} />;
  return <Clock size={18} className="text-gray-400" />;
}

// --------------- Temp Status Dot ---------------

function TempStatusDot({ status }: { status: DemoTemperature['status'] }) {
  if (status === 'normal') return <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />;
  if (status === 'alert') return <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />;
  return <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" />;
}

// --------------- Single Location View ---------------

function SingleLocationView({
  locationName,
  score,
  navigate,
}: {
  locationName: string;
  score: InspectionReadinessScore;
  navigate: (path: string) => void;
}) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={18} style={{ color: '#1e4d6b' }} />
          <h2 className="text-lg font-semibold text-gray-900">{locationName}</h2>
        </div>
        <span className="text-sm text-gray-400">{today}</span>
      </div>

      {/* Inspection Readiness Hero */}
      <Card>
        <InspectionReadiness
          score={score.overall}
          jurisdiction={score.jurisdiction}
          trend="up"
        />
      </Card>

      {/* Pillar Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PillarCard
          pillar="food_safety"
          score={score.foodSafety.score}
          opsScore={score.foodSafety.ops}
          docsScore={score.foodSafety.docs}
        />
        <PillarCard
          pillar="fire_safety"
          score={score.fireSafety.score}
          opsScore={score.fireSafety.ops}
          docsScore={score.fireSafety.docs}
        />
      </div>

      {/* Needs Attention (single location — no location prefix) */}
      <Card>
        <NeedsAttention
          items={DEMO_ATTENTION_ITEMS.filter(i => i.locationId === 'downtown')}
          showLocationPrefix={false}
        />
      </Card>

      {/* Checklists + Vendor Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Checklists */}
        <Card>
          <SectionHeader>Today's Checklists</SectionHeader>
          <div className="space-y-3">
            {DEMO_CHECKLISTS.map((cl) => (
              <button
                key={cl.id}
                type="button"
                onClick={() => navigate('/checklists')}
                className="w-full flex items-start gap-3 text-left hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
              >
                <ChecklistIcon status={cl.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{cl.name}</p>
                  <p className="text-xs text-gray-500">
                    {cl.status === 'done' && `${cl.assignee} \u00B7 ${cl.completedAt}`}
                    {cl.status === 'in_progress' && `${cl.completed} of ${cl.items} \u00B7 ${cl.assignee}`}
                    {cl.status === 'not_started' && 'Not started'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Upcoming This Week */}
        <Card>
          <SectionHeader>Upcoming This Week</SectionHeader>
          <div className="space-y-3">
            {DEMO_VENDOR_SCHEDULE.map((vs, i) => (
              <button
                key={i}
                type="button"
                onClick={() => navigate('/vendors')}
                className="w-full flex items-center gap-3 text-left hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
              >
                <CalendarDays size={16} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{vs.day}:</span> {vs.service}
                  </p>
                  <p className="text-xs text-gray-500">{vs.vendor}</p>
                </div>
              </button>
            ))}
            {DEMO_VENDOR_SCHEDULE.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No services scheduled this week</p>
            )}
          </div>
        </Card>
      </div>

      {/* Temperatures */}
      <Card>
        <SectionHeader>Temperatures</SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Equipment</th>
                <th className="text-right pb-2 font-medium">Temp</th>
                <th className="text-center pb-2 font-medium">Status</th>
                <th className="text-center pb-2 font-medium">Source</th>
                <th className="text-right pb-2 font-medium">Last</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {DEMO_TEMPERATURES.map((t) => (
                <tr key={t.id} className="group">
                  <td className="py-2.5 text-gray-900 font-medium">{t.name}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {t.temp !== null ? (
                      <span style={{ color: t.status === 'alert' ? '#dc2626' : '#374151' }}>
                        {t.temp}{t.unit}
                      </span>
                    ) : (
                      <span className="text-gray-300">&mdash;</span>
                    )}
                  </td>
                  <td className="py-2.5 text-center">
                    <TempStatusDot status={t.status} />
                  </td>
                  <td className="py-2.5 text-center">
                    {t.source === 'iot' ? (
                      <Radio size={14} className="inline text-blue-500" />
                    ) : (
                      <span className="text-xs text-gray-400">Manual</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-gray-500 text-xs">{t.lastReading}</td>
                  <td className="py-2.5 text-right">
                    {t.status === 'needs_log' && (
                      <button
                        type="button"
                        onClick={() => navigate('/temp-logs')}
                        className="text-xs font-medium px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                        style={{ color: '#1e4d6b' }}
                      >
                        Log Temp →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick Actions — desktop */}
      <div className="hidden sm:grid grid-cols-4 gap-3">
        <QuickActionButton icon={<Thermometer size={20} />} label="Log Temp" onClick={() => navigate('/temp-logs')} />
        <QuickActionButton icon={<ClipboardCheck size={20} />} label="Checklist" onClick={() => navigate('/checklists')} />
        <QuickActionButton icon={<FileUp size={20} />} label="Upload Doc" onClick={() => navigate('/documents')} />
        <QuickActionButton icon={<AlertTriangle size={20} />} label="Report Issue" onClick={() => navigate('/incidents')} />
      </div>

      {/* Quick Actions — mobile sticky bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40" style={{ height: 56 }}>
        <div className="grid grid-cols-4 h-full">
          <MobileQuickAction icon={<Thermometer size={18} />} label="Temp" onClick={() => navigate('/temp-logs')} />
          <MobileQuickAction icon={<ClipboardCheck size={18} />} label="Checklist" onClick={() => navigate('/checklists')} />
          <MobileQuickAction icon={<FileUp size={18} />} label="Upload" onClick={() => navigate('/documents')} />
          <MobileQuickAction icon={<AlertTriangle size={18} />} label="Report" onClick={() => navigate('/incidents')} />
        </div>
      </div>

      {/* Mobile bottom spacer */}
      <div className="sm:hidden h-16" />
    </div>
  );
}

// --------------- Quick Action Buttons ---------------

function QuickActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 bg-white rounded-lg py-3 text-sm font-medium text-gray-700 hover:shadow-md transition-shadow"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
    >
      <span style={{ color: '#1e4d6b' }}>{icon}</span>
      {label}
    </button>
  );
}

function MobileQuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 text-gray-600 active:bg-gray-50"
    >
      <span style={{ color: '#1e4d6b' }}>{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

// ===============================================
// MAIN COMPONENT
// ===============================================

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const { isDemoMode, companyName } = useDemo();

  // Compute all location scores
  const demoLocationScores = useMemo(() => getDemoScores(), []);
  const isMultiLocation = demoLocationScores.length > 1;

  // Default to first location
  const [selectedLocationId, setSelectedLocationId] = useState(demoLocationScores[0]?.locationId || '');

  // Selected location score
  const selectedEntry = demoLocationScores.find(l => l.locationId === selectedLocationId) || demoLocationScores[0];
  const selectedScore = selectedEntry?.score || calculateInspectionReadiness(90, 85, 80, 85, 'Mariposa County, California');
  const selectedName = selectedEntry?.locationName || 'My Location';

  // Org-level score (multi-location)
  const orgResult = useMemo(() => calculateOrgReadiness(demoLocationScores), [demoLocationScores]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Single-location view
  if (!isMultiLocation) {
    return (
      <SingleLocationView
        locationName={selectedName}
        score={selectedScore}
        navigate={navigate}
      />
    );
  }

  // --------------- Multi-Location View ---------------

  // For multi-location needs attention, use ALL items with location prefix
  const allAttentionItems = DEMO_ATTENTION_ITEMS;

  // Items for the selected single-location drill-down (filter by selected)
  const selectedAttentionItems = DEMO_ATTENTION_ITEMS.filter(
    i => i.locationId === selectedLocationId
  );

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Org Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isDemoMode ? companyName : 'My Organization'}
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({demoLocationScores.length} locations)
            </span>
          </h2>
        </div>
        <span className="text-sm text-gray-400">{today}</span>
      </div>

      {/* Org-Level Inspection Readiness */}
      <Card>
        <InspectionReadiness
          score={orgResult.overall}
          subtitle="Across all locations"
          trend="up"
        />
      </Card>

      {/* Location Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {demoLocationScores.map((loc) => (
          <LocationCard
            key={loc.locationId}
            locationId={loc.locationId}
            locationName={loc.locationName}
            score={loc.score.overall}
            onClick={() => setSelectedLocationId(loc.locationId)}
            isSelected={loc.locationId === selectedLocationId}
          />
        ))}
      </div>

      {/* Cross-Location Needs Attention */}
      <Card>
        <NeedsAttention
          items={allAttentionItems}
          showLocationPrefix={true}
        />
      </Card>

      {/* Divider — Currently Viewing */}
      <div className="flex items-center gap-3 pt-2">
        <MapPin size={16} style={{ color: '#1e4d6b' }} />
        <span className="text-sm font-medium text-gray-700">
          Currently viewing: {selectedName}
        </span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* Single-location drill-down for selected location */}
      <div className="space-y-6">
        {/* Pillar Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PillarCard
            pillar="food_safety"
            score={selectedScore.foodSafety.score}
            opsScore={selectedScore.foodSafety.ops}
            docsScore={selectedScore.foodSafety.docs}
          />
          <PillarCard
            pillar="fire_safety"
            score={selectedScore.fireSafety.score}
            opsScore={selectedScore.fireSafety.ops}
            docsScore={selectedScore.fireSafety.docs}
          />
        </div>

        {/* Location-specific Needs Attention */}
        {selectedAttentionItems.length > 0 && (
          <Card>
            <NeedsAttention
              items={selectedAttentionItems}
              showLocationPrefix={false}
            />
          </Card>
        )}

        {/* Checklists + Vendor Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <SectionHeader>Today's Checklists</SectionHeader>
            <div className="space-y-3">
              {DEMO_CHECKLISTS.map((cl) => (
                <button
                  key={cl.id}
                  type="button"
                  onClick={() => navigate('/checklists')}
                  className="w-full flex items-start gap-3 text-left hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                >
                  <ChecklistIcon status={cl.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{cl.name}</p>
                    <p className="text-xs text-gray-500">
                      {cl.status === 'done' && `${cl.assignee} \u00B7 ${cl.completedAt}`}
                      {cl.status === 'in_progress' && `${cl.completed} of ${cl.items} \u00B7 ${cl.assignee}`}
                      {cl.status === 'not_started' && 'Not started'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeader>Upcoming This Week</SectionHeader>
            <div className="space-y-3">
              {DEMO_VENDOR_SCHEDULE.map((vs, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => navigate('/vendors')}
                  className="w-full flex items-center gap-3 text-left hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                >
                  <CalendarDays size={16} className="text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{vs.day}:</span> {vs.service}
                    </p>
                    <p className="text-xs text-gray-500">{vs.vendor}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Temperatures */}
        <Card>
          <SectionHeader>Temperatures</SectionHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Equipment</th>
                  <th className="text-right pb-2 font-medium">Temp</th>
                  <th className="text-center pb-2 font-medium">Status</th>
                  <th className="text-center pb-2 font-medium">Source</th>
                  <th className="text-right pb-2 font-medium">Last</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {DEMO_TEMPERATURES.map((t) => (
                  <tr key={t.id} className="group">
                    <td className="py-2.5 text-gray-900 font-medium">{t.name}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {t.temp !== null ? (
                        <span style={{ color: t.status === 'alert' ? '#dc2626' : '#374151' }}>
                          {t.temp}{t.unit}
                        </span>
                      ) : (
                        <span className="text-gray-300">&mdash;</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      <TempStatusDot status={t.status} />
                    </td>
                    <td className="py-2.5 text-center">
                      {t.source === 'iot' ? (
                        <Radio size={14} className="inline text-blue-500" />
                      ) : (
                        <span className="text-xs text-gray-400">Manual</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-gray-500 text-xs">{t.lastReading}</td>
                    <td className="py-2.5 text-right">
                      {t.status === 'needs_log' && (
                        <button
                          type="button"
                          onClick={() => navigate('/temp-logs')}
                          className="text-xs font-medium px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                          style={{ color: '#1e4d6b' }}
                        >
                          Log Temp →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Quick Actions — desktop */}
        <div className="hidden sm:grid grid-cols-4 gap-3">
          <QuickActionButton icon={<Thermometer size={20} />} label="Log Temp" onClick={() => navigate('/temp-logs')} />
          <QuickActionButton icon={<ClipboardCheck size={20} />} label="Checklist" onClick={() => navigate('/checklists')} />
          <QuickActionButton icon={<FileUp size={20} />} label="Upload Doc" onClick={() => navigate('/documents')} />
          <QuickActionButton icon={<AlertTriangle size={20} />} label="Report Issue" onClick={() => navigate('/incidents')} />
        </div>

        {/* Quick Actions — mobile sticky bar */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40" style={{ height: 56 }}>
          <div className="grid grid-cols-4 h-full">
            <MobileQuickAction icon={<Thermometer size={18} />} label="Temp" onClick={() => navigate('/temp-logs')} />
            <MobileQuickAction icon={<ClipboardCheck size={18} />} label="Checklist" onClick={() => navigate('/checklists')} />
            <MobileQuickAction icon={<FileUp size={18} />} label="Upload" onClick={() => navigate('/documents')} />
            <MobileQuickAction icon={<AlertTriangle size={18} />} label="Report" onClick={() => navigate('/incidents')} />
          </div>
        </div>

        {/* Mobile bottom spacer */}
        <div className="sm:hidden h-16" />
      </div>
    </div>
  );
}
