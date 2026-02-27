import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronRight, ChevronDown, Settings, AlertTriangle,
  Building2, Upload,
} from 'lucide-react';
import { LOCATION_JURISDICTION_STATUS } from '../data/demoData';

// ── Types ────────────────────────────────────────────────────

interface OrgTreeNode {
  id: string;
  name: string;
  code: string;
  type: 'corporate' | 'region' | 'location';
  locationCount?: number;
  openItems: number;
  foodSafetyStatus?: string;
  foodSafetyJurisdiction?: string;
  facilitySafetyVerdict?: 'Pass' | 'Fail';
  facilitySafetyAhj?: string;
  children?: OrgTreeNode[];
}

// ── Demo Data ────────────────────────────────────────────────

const orgTree: OrgTreeNode = {
  id: 'pcd',
  name: 'Pacific Coast Dining',
  code: 'PCD',
  type: 'corporate',
  locationCount: 3,
  openItems: 12,
  children: [
    {
      id: 'pcd-cv',
      name: 'Central Valley',
      code: 'PCD-CV',
      type: 'region',
      locationCount: 3,
      openItems: 12,
      children: [
        {
          id: 'downtown-kitchen',
          name: 'Downtown Kitchen',
          code: 'DK',
          type: 'location',
          foodSafetyStatus: LOCATION_JURISDICTION_STATUS.downtown.foodSafety.gradeDisplay,
          foodSafetyJurisdiction: LOCATION_JURISDICTION_STATUS.downtown.foodSafety.authority,
          facilitySafetyVerdict: LOCATION_JURISDICTION_STATUS.downtown.facilitySafety.gradeDisplay as 'Pass' | 'Fail',
          facilitySafetyAhj: 'City of Fresno Fire Department',
          openItems: 2,
        },
        {
          id: 'airport-cafe',
          name: 'Airport Cafe',
          code: 'AC',
          type: 'location',
          foodSafetyStatus: LOCATION_JURISDICTION_STATUS.airport.foodSafety.gradeDisplay,
          foodSafetyJurisdiction: LOCATION_JURISDICTION_STATUS.airport.foodSafety.authority,
          facilitySafetyVerdict: LOCATION_JURISDICTION_STATUS.airport.facilitySafety.gradeDisplay as 'Pass' | 'Fail',
          facilitySafetyAhj: 'City of Merced Fire Department',
          openItems: 4,
        },
        {
          id: 'university-dining',
          name: 'University Dining',
          code: 'UD',
          type: 'location',
          foodSafetyStatus: LOCATION_JURISDICTION_STATUS.university.foodSafety.gradeDisplay,
          foodSafetyJurisdiction: LOCATION_JURISDICTION_STATUS.university.foodSafety.authority,
          facilitySafetyVerdict: LOCATION_JURISDICTION_STATUS.university.facilitySafety.gradeDisplay as 'Pass' | 'Fail',
          facilitySafetyAhj: 'Modesto Fire Department, Fire Prevention Division',
          openItems: 6,
        },
      ],
    },
  ],
};

// Facility safety equipment data per location
const FIRE_EQUIPMENT: Record<string, { permit: boolean; hood: boolean; ext: boolean; ansul: boolean }> = {
  'downtown-kitchen': { permit: true, hood: true, ext: true, ansul: true },
  'airport-cafe':     { permit: true, hood: false, ext: true, ansul: false },
  'university-dining': { permit: false, hood: false, ext: true, ansul: false },
};

// Open item descriptions per location
const OPEN_ITEMS_LIST: Record<string, string[]> = {
  'downtown-kitchen': [
    'Pest control log missing for January',
    'Walk-in cooler door gasket showing wear',
  ],
  'airport-cafe': [
    'Hood cleaning certificate expired Feb 1',
    'Fire extinguisher monthly check overdue',
    'Walk-in Cooler #2 temp above 41°F (3 days)',
    'Opening checklist incomplete Feb 4',
  ],
  'university-dining': [
    'Health permit renewal overdue',
    'Multiple vendor COIs expired',
    'Ansul system inspection overdue',
    'Fire suppression hood cleaning past due',
    '8 missed temperature logs this week',
    'Closing checklist skip rate above 20%',
  ],
};

// ── Inline Components ────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'Compliant':       'bg-green-50 text-green-700 border-green-300',
    'Good':            'bg-green-50 text-green-700 border-green-300',
    'Satisfactory':    'bg-yellow-50 text-yellow-700 border-yellow-300',
    'Action Required': 'bg-red-50 text-red-700 border-red-300',
    'Unsatisfactory':  'bg-red-50 text-red-700 border-red-300',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${styles[status] ?? 'bg-gray-100 text-gray-600 border-gray-300'}`}>
      {status}
    </span>
  );
}

function FireVerdictBadge({ verdict }: { verdict: 'Pass' | 'Fail' }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
      verdict === 'Pass'
        ? 'bg-green-50 text-green-700 border-green-300'
        : 'bg-red-50 text-red-700 border-red-300'
    }`}>
      🔥 {verdict}
    </span>
  );
}

// ── Tree Node ────────────────────────────────────────────────

function TreeNodeRow({ node, depth = 0, selectedId, onSelect }: {
  node: OrgTreeNode; depth?: number; selectedId: string; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        onClick={() => { onSelect(node.id); if (hasChildren) setOpen(!open); }}
        className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left transition-colors cursor-pointer ${
          isSelected
            ? 'bg-[#EEF1F7] border-l-2 border-yellow-600'
            : 'hover:bg-gray-100'
        }`}
        style={{ marginLeft: depth * 20 }}
      >
        {hasChildren ? (
          open
            ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <div className="w-3.5 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{node.name}</span>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{node.code}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {node.type === 'location' ? (
            <>
              {node.foodSafetyStatus && <StatusBadge status={node.foodSafetyStatus} />}
              {node.facilitySafetyVerdict && <FireVerdictBadge verdict={node.facilitySafetyVerdict} />}
              {node.openItems > 0 && (
                <span className="text-xs text-amber-600">{node.openItems} open</span>
              )}
            </>
          ) : (
            <>
              <span className="text-xs text-gray-500">{node.locationCount} loc</span>
              <span className="text-xs text-gray-400">&middot;</span>
              <span className="text-xs text-amber-600">{node.openItems} open items</span>
            </>
          )}
        </div>
      </button>
      {open && hasChildren && (
        <div>
          {node.children!.map(child => (
            <TreeNodeRow key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fire Equipment Bar ───────────────────────────────────────

function FireEquipmentBar({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-14">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full ${pass ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: pass ? '100%' : '30%' }}
        />
      </div>
      <span className={`text-[10px] ${pass ? 'text-green-600' : 'text-red-600'}`}>
        {pass ? 'Current' : 'Overdue'}
      </span>
    </div>
  );
}

// ── Location Detail Panel ────────────────────────────────────

function LocationDetail({ node }: { node: OrgTreeNode }) {
  const equip = FIRE_EQUIPMENT[node.id] || { permit: false, hood: false, ext: false, ansul: false };
  const items = OPEN_ITEMS_LIST[node.id] || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-gray-900 font-bold text-xl">{node.name}</h2>
        <p className="text-gray-500 text-sm">{node.code} &middot; Location</p>
      </div>

      {/* Food Safety */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2" style={{ boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-gray-900">🍽 Food Safety</span>
        </div>
        <p className="text-gray-500 text-xs">{node.foodSafetyJurisdiction}</p>
        <div className="flex items-center gap-3">
          {node.foodSafetyStatus && <StatusBadge status={node.foodSafetyStatus} />}
          <span className="text-xs text-gray-600">
            {node.foodSafetyStatus === 'Compliant' && 'No critical violations on last inspection'}
            {node.foodSafetyStatus === 'Satisfactory' && 'Minor violations noted — corrective actions in progress'}
            {node.foodSafetyStatus === 'Action Required' && 'Critical violations require immediate correction'}
          </span>
        </div>
        {node.foodSafetyStatus === 'Compliant' && (
          <p className="text-gray-400 text-xs italic">Last inspected Jan 2026 — next due Jul 2026</p>
        )}
        {node.foodSafetyStatus === 'Satisfactory' && (
          <p className="text-gray-400 text-xs italic">Re-inspection scheduled within 60 days</p>
        )}
        {node.foodSafetyStatus === 'Action Required' && (
          <p className="text-gray-400 text-xs italic">Compliance deadline: 30 days from last inspection</p>
        )}
      </div>

      {/* Facility Safety */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3" style={{ boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-gray-900">🔥 Facility Safety</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-xs">{node.facilitySafetyAhj}</p>
          <p className="text-gray-400 text-[10px]">NFPA 96 (2024)</p>
        </div>
        <div className="space-y-2">
          <FireEquipmentBar label="Permit" pass={equip.permit} />
          <FireEquipmentBar label="Hood" pass={equip.hood} />
          <FireEquipmentBar label="Ext" pass={equip.ext} />
          <FireEquipmentBar label="Ansul" pass={equip.ansul} />
        </div>
        {node.facilitySafetyVerdict && <FireVerdictBadge verdict={node.facilitySafetyVerdict} />}
      </div>

      {/* Open Items */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2" style={{ boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-900">Open Items</span>
        </div>
        <p className="text-gray-500 text-xs">{node.openItems} item{node.openItems !== 1 ? 's' : ''} requiring attention</p>
        {items.length > 0 && (
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="text-amber-500 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Region / Corporate Detail Panel ──────────────────────────

function RegionDetail({ node }: { node: OrgTreeNode }) {
  const locations = collectLocations(node);
  const foodSafeCount = locations.filter(l =>
    l.foodSafetyStatus === 'Compliant' || l.foodSafetyStatus === 'Good'
  ).length;
  const fireSafeCount = locations.filter(l => l.facilitySafetyVerdict === 'Pass').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-gray-900 font-bold text-xl">{node.name}</h2>
        <p className="text-gray-500 text-sm">{node.code} &middot; {node.type === 'corporate' ? 'Corporate' : 'Region'} &middot; {node.locationCount} location{node.locationCount !== 1 ? 's' : ''}</p>
      </div>

      {/* Location list */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2" style={{ boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Locations</h3>
        <div className="space-y-2">
          {locations.map(loc => (
            <div key={loc.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-gray-900 truncate">{loc.name}</span>
                <span className="text-[10px] text-gray-400">{loc.code}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {loc.foodSafetyStatus && <StatusBadge status={loc.foodSafetyStatus} />}
                {loc.facilitySafetyVerdict && <FireVerdictBadge verdict={loc.facilitySafetyVerdict} />}
                {loc.openItems > 0 && (
                  <span className="text-xs text-amber-600">{loc.openItems} open</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-4" style={{ boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
        <p className="text-sm text-gray-700">
          <span className={foodSafeCount === locations.length ? 'text-green-600' : 'text-amber-600'}>
            {foodSafeCount} of {locations.length}
          </span>
          {' '}locations food-safe &middot;{' '}
          <span className={fireSafeCount === locations.length ? 'text-green-600' : 'text-amber-600'}>
            {fireSafeCount} of {locations.length}
          </span>
          {' '}locations fire-safe
        </p>
      </div>

      {/* Open Items */}
      <div className="rounded-lg border border-gray-200 bg-white p-4" style={{ boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-900">Open Items</span>
        </div>
        <p className="text-gray-500 text-xs">{node.openItems} total items requiring attention across {node.locationCount} location{node.locationCount !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function findTreeNode(tree: OrgTreeNode, id: string): OrgTreeNode | null {
  if (tree.id === id) return tree;
  if (tree.children) {
    for (const child of tree.children) {
      const found = findTreeNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

function collectLocations(node: OrgTreeNode): OrgTreeNode[] {
  if (node.type === 'location') return [node];
  if (!node.children) return [];
  return node.children.flatMap(c => collectLocations(c));
}

// ── Main Page ────────────────────────────────────────────────

export function OrgHierarchy() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState('');
  const selectedNode = selectedId ? findTreeNode(orgTree, selectedId) : null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  return (
    <div
      className="-mx-4 sm:-mx-6 lg:-mx-8 -my-6 px-4 sm:px-6 lg:px-8 py-6 min-h-screen"
      style={{ background: '#F4F6FA' }}
    >
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
        <div>
          <h1 className="text-gray-900 font-bold text-2xl">Locations</h1>
          <p className="text-gray-500 text-sm mt-1">Compliance status across your locations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/import?type=locations')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1e4d6b] text-sm font-medium text-[#1e4d6b] hover:bg-[#eef4f8] transition-colors cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={() => toast.info('Hierarchy Config (Demo)')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            Hierarchy Config
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[40%_1px_1fr] gap-5 items-stretch">
        {/* Left column — Tree */}
        <div className="min-h-[400px]">
          <div className="rounded-xl border border-gray-200 bg-white p-4 h-full" style={{ boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Organization Tree</h3>
            <div className="space-y-0.5">
              <TreeNodeRow node={orgTree} selectedId={selectedId} onSelect={handleSelect} />
            </div>
          </div>
        </div>

        {/* Divider (desktop) */}
        <div className="hidden lg:block bg-gray-200" />

        {/* Right column — Detail */}
        <div className="min-w-0 min-h-[400px]">
          <div className="rounded-xl border border-gray-200 bg-white p-5 h-full" style={{ boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
            {selectedNode ? (
              selectedNode.type === 'location'
                ? <LocationDetail node={selectedNode} />
                : <RegionDetail node={selectedNode} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Building2 className="h-10 w-10 text-gray-400 mb-3" />
                <p className="text-gray-500 text-sm">Select a location or region to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
