import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronRight, ChevronDown, Settings, AlertTriangle,
  Building2, Upload, MapPin, Plus,
} from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';
import { useOperatingHours } from '../contexts/OperatingHoursContext';
import { getAvailableCounties } from '../lib/jurisdictionScoring';
import { AddLocationModal, type NewLocationData } from '../components/locations/AddLocationModal';
import { colors, prp } from '../lib/designSystem';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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

// ── Status Pill ──────────────────────────────────────────────
// Unified rounded pill with semantic dot — Pass / Satisfactory / Fail.
// Maps canonical status strings to prp token colors.

const STATUS_PILL_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  Pass:              { bg: '#E1F5EE', color: prp.prove.text,   dot: prp.prove.accent },
  Compliant:         { bg: '#E1F5EE', color: prp.prove.text,   dot: prp.prove.accent },
  Good:              { bg: '#E1F5EE', color: prp.prove.text,   dot: prp.prove.accent },
  Satisfactory:      { bg: '#FAEEDA', color: prp.predict.text, dot: prp.predict.accent },
  Fail:              { bg: '#FCEBEB', color: '#791F1F',        dot: '#A32D2D' },
  'Action Required': { bg: '#FCEBEB', color: '#791F1F',        dot: '#A32D2D' },
  Unsatisfactory:    { bg: '#FCEBEB', color: '#791F1F',        dot: '#A32D2D' },
};

function StatusPill({ label }: { label: string }) {
  const s = STATUS_PILL_STYLES[label] || { bg: '#F4F6FA', color: colors.textSecondary, dot: colors.textMuted };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 999,
      backgroundColor: s.bg, fontSize: 11, fontWeight: 500, color: s.color, lineHeight: '16px',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: s.dot, flexShrink: 0 }} />
      {label}
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
  const isLocation = node.type === 'location';

  return (
    <div>
      <button
        onClick={() => { onSelect(node.id); if (hasChildren) setOpen(!open); }}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          alignItems: 'center',
          gap: 8,
          padding: '8px 6px',
          paddingLeft: depth === 1 ? 22 : depth >= 2 ? 38 : 6,
          borderRadius: 6,
          backgroundColor: isSelected ? '#E6F1FB' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left' as const,
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#FAF7F0'; }}
        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = isSelected ? '#E6F1FB' : 'transparent'; }}
      >
        {/* Col 1: chevron + name + code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {hasChildren ? (
            open
              ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: colors.textMuted }} />
              : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: colors.textMuted }} />
          ) : (
            <div style={{ width: 14, flexShrink: 0 }} />
          )}
          <span style={{
            fontSize: 13, fontWeight: 500, color: colors.textPrimary,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
          }}>
            {node.name}
          </span>
          <span style={{ fontSize: 11, color: colors.textMuted, fontFamily: 'monospace', flexShrink: 0 }}>
            {node.code}
          </span>
        </div>

        {/* Col 2: secondary count (regions only) */}
        <span style={{ fontSize: 11, color: colors.textSecondary }}>
          {!isLocation && node.locationCount != null ? `${node.locationCount} locations` : ''}
        </span>

        {/* Col 3: open-items count */}
        <span style={{ fontSize: 11, color: node.openItems > 0 ? '#791F1F' : colors.textSecondary }}>
          {node.openItems > 0 ? `${node.openItems} open` : '0 open'}
        </span>

        {/* Col 4: status pill (locations only) */}
        <span style={{ minWidth: 80, textAlign: 'right' as const }}>
          {isLocation && node.foodSafetyStatus ? <StatusPill label={node.foodSafetyStatus} /> : null}
        </span>
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

// ── Location Detail Panel ────────────────────────────────────
// Renders real data from the location node. Fields not yet in the data shape
// (Last Inspection date, Address, Vendor count, Equipment count) show "—".

function LocationDetail({ node }: { node: OrgTreeNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: colors.textPrimary, margin: 0 }}>{node.name}</h2>
          <p style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'monospace', margin: '4px 0 0' }}>
            {node.code} &middot; Location
          </p>
        </div>
        {node.foodSafetyStatus && <StatusPill label={node.foodSafetyStatus} />}
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div style={{ background: '#FAFAF9', border: '0.5px solid #E2DDD4', padding: 10, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, color: colors.textSecondary, marginBottom: 4 }}>
            Open Items
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: node.openItems > 0 ? '#791F1F' : colors.textPrimary }}>
            {node.openItems}
          </div>
        </div>
        <div style={{ background: '#FAFAF9', border: '0.5px solid #E2DDD4', padding: 10, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, color: colors.textSecondary, marginBottom: 4 }}>
            Fire Safety
          </div>
          <div>
            {node.facilitySafetyVerdict
              ? <StatusPill label={node.facilitySafetyVerdict} />
              : <span style={{ fontSize: 13, color: colors.textMuted }}>&mdash;</span>}
          </div>
        </div>
        <div style={{ background: '#FAFAF9', border: '0.5px solid #E2DDD4', padding: 10, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, color: colors.textSecondary, marginBottom: 4 }}>
            Last Inspection
          </div>
          <div style={{ fontSize: 13, color: colors.textMuted }}>
            &mdash;
          </div>
        </div>
      </div>

      {/* Jurisdiction */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, color: colors.textSecondary, marginBottom: 8 }}>
          Jurisdiction
        </div>
        {node.foodSafetyJurisdiction && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.borderLight}` }}>
            <span style={{ fontSize: 12, color: colors.textSecondary }}>Food Safety</span>
            <span style={{ fontSize: 12, color: colors.textPrimary }}>{node.foodSafetyJurisdiction}</span>
          </div>
        )}
        {node.facilitySafetyAhj && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.borderLight}` }}>
            <span style={{ fontSize: 12, color: colors.textSecondary }}>Fire Safety</span>
            <span style={{ fontSize: 12, color: colors.textPrimary }}>{node.facilitySafetyAhj}</span>
          </div>
        )}
      </div>

      {/* Key Facts */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, color: colors.textSecondary, marginBottom: 8 }}>
          Key Facts
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.borderLight}` }}>
          <span style={{ fontSize: 12, color: colors.textSecondary }}>Address</span>
          <span style={{ fontSize: 12, color: colors.textMuted }}>&mdash;</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.borderLight}` }}>
          <span style={{ fontSize: 12, color: colors.textSecondary }}>Vendors</span>
          <span style={{ fontSize: 12, color: colors.textMuted }}>&mdash;</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
          <span style={{ fontSize: 12, color: colors.textSecondary }}>Equipment</span>
          <span style={{ fontSize: 12, color: colors.textMuted }}>&mdash;</span>
        </div>
      </div>
    </div>
  );
}

// ── Region / Corporate Detail Panel ──────────────────────────

function RegionDetail({ node }: { node: OrgTreeNode }) {
  const locations = collectLocations(node);
  const foodSafeCount = locations.filter(l =>
    l.foodSafetyStatus === 'Compliant' || l.foodSafetyStatus === 'Good' || l.foodSafetyStatus === 'Pass'
  ).length;
  const fireSafeCount = locations.filter(l => l.facilitySafetyVerdict === 'Pass').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: colors.textPrimary, margin: 0 }}>{node.name}</h2>
        <p style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'monospace', margin: '4px 0 0' }}>
          {node.code} &middot; {node.type === 'corporate' ? 'Corporate' : 'Region'} &middot; {node.locationCount} location{node.locationCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Location list */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, color: colors.textSecondary, marginBottom: 8 }}>
          Locations
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {locations.map(loc => (
            <div key={loc.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', borderRadius: 6, backgroundColor: '#FAF7F0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 13, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{loc.name}</span>
                <span style={{ fontSize: 11, color: colors.textMuted, fontFamily: 'monospace' }}>{loc.code}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {loc.foodSafetyStatus && <StatusPill label={loc.foodSafetyStatus} />}
                {loc.openItems > 0 && (
                  <span style={{ fontSize: 11, color: '#791F1F' }}>{loc.openItems} open</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div style={{ fontSize: 13, color: colors.textSecondary }}>
        <span style={{ color: foodSafeCount === locations.length ? prp.prove.accent : prp.predict.accent }}>
          {foodSafeCount} of {locations.length}
        </span>
        {' '}locations food-safe &middot;{' '}
        <span style={{ color: fireSafeCount === locations.length ? prp.prove.accent : prp.predict.accent }}>
          {fireSafeCount} of {locations.length}
        </span>
        {' '}locations fire-safe
      </div>

      {/* Open Items */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <AlertTriangle className="h-4 w-4" style={{ color: prp.predict.accent }} />
        <span style={{ fontSize: 13, color: colors.textSecondary }}>
          {node.openItems} total items requiring attention across {node.locationCount} location{node.locationCount !== 1 ? 's' : ''}
        </span>
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

function collectCodes(node: OrgTreeNode): string[] {
  if (node.type === 'location') return [node.code];
  if (!node.children) return [];
  return node.children.flatMap(c => collectCodes(c));
}

// ── Main Page ────────────────────────────────────────────────

export function OrgHierarchy() {
  const navigate = useNavigate();
  const { companyName } = useDemo();
  const { locationHours, setLocationHours } = useOperatingHours();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [orgTreeState, setOrgTreeState] = useState<OrgTreeNode>({
    id: 'org-root',
    name: 'Your Organization',
    code: '',
    type: 'corporate',
    locationCount: 0,
    openItems: 0,
    children: [],
  });
  const [selectedId, setSelectedId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sync root org name with account's actual company name
  useEffect(() => {
    if (companyName) {
      setOrgTreeState(prev => ({ ...prev, name: companyName }));
    }
  }, [companyName]);

  // Load locations from Supabase
  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    supabase
      .from('locations')
      .select('id, name, city, state, status')
      .eq('organization_id', orgId)
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          console.error('Locations query failed:', error.message);
          setLoadError(error.message);
          setLoading(false);
          return;
        }

        const locationNodes: OrgTreeNode[] = (data || []).map(row => ({
          id: row.id,
          name: row.name,
          code: [row.city, row.state].filter(Boolean).join(', '),
          type: 'location' as const,
          openItems: 0,
        }));

        setOrgTreeState(prev => ({
          ...prev,
          children: locationNodes,
          locationCount: locationNodes.length,
        }));
        setLoading(false);
      });
  }, [orgId]);

  const selectedNode = selectedId ? findTreeNode(orgTreeState, selectedId) : null;
  const allLocations = collectLocations(orgTreeState);
  const isSingleLocation = allLocations.length === 1;
  const existingCodes = collectCodes(orgTreeState);

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleAddLocation = (data: NewLocationData) => {
    const newId = `loc-${Date.now()}`;
    const counties = getAvailableCounties();
    const county = counties.find(c => c.slug === data.jurisdictionSlug);

    const newNode: OrgTreeNode = {
      id: newId,
      name: data.name,
      code: data.code,
      type: 'location',
      openItems: 0,
      foodSafetyStatus: 'Compliant',
      foodSafetyJurisdiction: county?.name || 'Health Department',
      facilitySafetyVerdict: 'Pass',
      facilitySafetyAhj: 'Local Fire Department',
    };

    setOrgTreeState(prev => {
      const updated = { ...prev };
      if (updated.children && updated.children.length > 0) {
        const firstRegion = { ...updated.children[0] };
        firstRegion.children = [...(firstRegion.children || []), newNode];
        firstRegion.locationCount = (firstRegion.locationCount || 0) + 1;
        updated.children = [firstRegion, ...updated.children.slice(1)];
      } else {
        updated.children = [newNode];
      }
      updated.locationCount = (updated.locationCount || 0) + 1;
      return updated;
    });

    // Register operating hours
    setLocationHours([
      ...locationHours,
      {
        locationName: data.name,
        days: data.days,
        openTime: data.openTime,
        closeTime: data.closeTime,
      },
    ]);

    setSelectedId(newId);
    setShowAddModal(false);
    toast.success(`${data.name} added successfully`);
  };

  return (
    <div
      className="-mx-4 sm:-mx-6 lg:-mx-8 -my-6 px-4 sm:px-6 lg:px-8 py-6 min-h-screen"
      style={{ background: '#F4F6FA' }}
    >
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
        <div>
          <h1 className="text-[#1E2D4D] font-bold text-2xl tracking-tight">Locations</h1>
          <p className="text-[#1E2D4D]/50 text-sm mt-1">Compliance status across your locations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1E2D4D] text-sm font-medium text-white hover:bg-[#162340] transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Location
          </button>
          <button
            onClick={() => navigate('/import?type=locations')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{ backgroundColor: colors.borderLight, color: colors.navy, border: '1px solid transparent' }}
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={() => toast.info('Hierarchy configuration')}
            className="flex items-center gap-1.5 py-2 text-sm font-medium transition-colors cursor-pointer hover:bg-[#1E2D4D]/5 rounded-lg"
            style={{ padding: '8px 10px', color: colors.textSecondary, background: 'transparent', border: 'none' }}
          >
            <Settings className="h-4 w-4" />
            Hierarchy Config
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="rounded-xl border border-[#1E2D4D]/10 bg-white flex items-center justify-center" style={{ padding: '40px 16px', minHeight: 200, boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
          <p style={{ fontSize: 14, color: colors.textSecondary }}>Loading locations…</p>
        </div>

      ) : loadError ? (
        <div className="rounded-xl border border-[#1E2D4D]/10 bg-white flex flex-col items-center justify-center text-center" style={{ padding: '28px 16px 36px', boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
          <AlertTriangle className="w-6 h-6 mb-3" style={{ color: '#A32D2D' }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: colors.textPrimary, margin: '0 0 6px' }}>
            Unable to load locations
          </p>
          <p style={{ fontSize: 12, color: colors.textSecondary }}>
            {loadError}
          </p>
        </div>

      ) : allLocations.length === 0 ? (
        <div className="rounded-xl border border-[#1E2D4D]/10 bg-white flex flex-col items-center text-center" style={{ padding: '28px 16px 36px', boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
          {/* Icon circle */}
          <div
            className="flex items-center justify-center mb-4"
            style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: '#E6F1FB' }}
          >
            <MapPin className="w-6 h-6" style={{ color: '#185FA5' }} />
          </div>

          {/* Title */}
          <h3 style={{ fontSize: 17, fontWeight: 500, color: colors.textPrimary, margin: '0 0 8px' }}>
            No locations added yet
          </h3>

          {/* Body */}
          <p style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.6, maxWidth: 460, margin: '0 0 20px' }}>
            A location anchors every signal EvidLY tracks &mdash; jurisdiction, vendor cadence,
            inspection trail. Add your first location to start scoring.
          </p>

          {/* PRP three-card row */}
          <div
            className="grid grid-cols-3 w-full mb-5"
            style={{ gap: 10, maxWidth: 600 }}
          >
            {/* PREDICT */}
            <div
              className="bg-white text-left"
              style={{
                border: '0.5px solid #E2DDD4',
                borderTop: `3px solid ${prp.predict.accent}`,
                borderRadius: '0 0 8px 8px',
                padding: '12px 12px',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, color: prp.predict.text, marginBottom: 4 }}>
                Predict
              </div>
              <p style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 1.5, margin: 0 }}>
                Identifies when each location's jurisdiction inspections are coming due.
              </p>
            </div>

            {/* REDUCE */}
            <div
              className="bg-white text-left"
              style={{
                border: '0.5px solid #E2DDD4',
                borderTop: `3px solid ${prp.reduce.accent}`,
                borderRadius: '0 0 8px 8px',
                padding: '12px 12px',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, color: prp.reduce.text, marginBottom: 4 }}>
                Reduce
              </div>
              <p style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 1.5, margin: 0 }}>
                Compliance gaps surface per location &mdash; not buried in an org-wide aggregate.
              </p>
            </div>

            {/* PROVE */}
            <div
              className="bg-white text-left"
              style={{
                border: '0.5px solid #E2DDD4',
                borderTop: `3px solid ${prp.prove.accent}`,
                borderRadius: '0 0 8px 8px',
                padding: '12px 12px',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, color: prp.prove.text, marginBottom: 4 }}>
                Prove
              </div>
              <p style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 1.5, margin: 0 }}>
                Every inspection, document, and service visit carries the location and timestamp.
              </p>
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center font-medium cursor-pointer hover:bg-[#162340] transition-colors"
            style={{
              gap: 6, padding: '11px 22px', borderRadius: 8,
              backgroundColor: colors.navy, color: '#FFFFFF', fontSize: 13,
              border: 'none',
            }}
          >
            <Plus className="h-4 w-4" />
            Add Location
          </button>
        </div>

      ) : isSingleLocation ? (
        /* Single-location flat view — location IS the organization */
        <div className="max-w-2xl">
          <div className="rounded-xl border border-[#1E2D4D]/10 bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
            <LocationDetail node={allLocations[0]} />
          </div>
        </div>

      ) : (
      <>
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[40%_1px_1fr] gap-5 items-stretch">
        {/* Left column — Tree */}
        <div className="min-h-[400px]">
          <div className="rounded-xl border border-[#1E2D4D]/10 bg-white p-4 h-full" style={{ boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
            <h3 className="text-sm font-semibold text-[#1E2D4D] mb-3">Organization Tree</h3>
            <div className="space-y-0.5">
              <TreeNodeRow node={orgTreeState} selectedId={selectedId} onSelect={handleSelect} />
            </div>
          </div>
        </div>

        {/* Divider (desktop) */}
        <div className="hidden lg:block bg-[#1E2D4D]/8" />

        {/* Right column — Detail */}
        <div className="min-w-0 min-h-[400px]">
          <div className="rounded-xl border border-[#1E2D4D]/10 bg-white p-5 h-full" style={{ boxShadow: '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)' }}>
            {selectedNode ? (
              selectedNode.type === 'location'
                ? <LocationDetail node={selectedNode} />
                : <RegionDetail node={selectedNode} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center" style={{ padding: '40px 16px' }}>
                <div
                  className="flex items-center justify-center mb-4"
                  style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#E6F1FB' }}
                >
                  <Building2 className="w-[22px] h-[22px]" style={{ color: '#185FA5' }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 500, color: colors.textPrimary, margin: '0 0 6px' }}>
                  Select a location to view details
                </p>
                <p style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.5, maxWidth: 320, margin: 0 }}>
                  Open-items, jurisdiction, vendors, and inspection trail appear here once a location is selected.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {/* Add Location Modal */}
      <AddLocationModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddLocation}
        existingCodes={existingCodes}
      />
    </div>
  );
}
