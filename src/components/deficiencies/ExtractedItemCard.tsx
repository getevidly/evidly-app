import { useState } from 'react';
import { Check, X, Pencil, AlertTriangle } from 'lucide-react';
import type { ExtractedItem } from '../../hooks/deficiencies/useDeficiencyUpload';

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: '#b3261e', bg: '#fee2e2', label: 'Critical' },
  major: { color: '#c2731a', bg: '#fef3c7', label: 'Major' },
  minor: { color: '#2563eb', bg: '#eff6ff', label: 'Minor' },
  advisory: { color: '#6B7F96', bg: '#EEF1F7', label: 'Advisory' },
};

const CATEGORY_LABELS: Record<string, string> = {
  food_safety: 'Food Safety',
  fire_safety: 'Fire Safety',
  facility_services: 'Facility Services',
};

const TIMELINE_LABELS: Record<string, string> = {
  immediate: 'Immediate',
  '30_days': '30 days',
  '90_days': '90 days',
  next_service: 'Next service',
};

interface ExtractedItemCardProps {
  item: ExtractedItem;
  checked: boolean;
  onToggle: () => void;
  onDiscard: () => void;
  onUpdate: (updates: Partial<ExtractedItem>) => void;
}

function confidenceColor(c: number): string {
  if (c >= 0.9) return '#059669';
  if (c >= 0.7) return '#c2731a';
  return '#b3261e';
}

function confidenceBorderColor(c: number): string {
  if (c >= 0.9) return '#059669';
  if (c >= 0.7) return '#c2731a';
  return '#b3261e';
}

function confidenceLabel(c: number): string {
  if (c >= 0.9) return 'High';
  if (c >= 0.7) return 'Needs review';
  return 'Low';
}

export function ExtractedItemCard({ item, checked, onToggle, onDiscard, onUpdate }: ExtractedItemCardProps) {
  const [editing, setEditing] = useState(false);
  const [editState, setEditState] = useState({
    code: item.code,
    title: item.title,
    severity: item.severity,
    category: item.category,
    timeline_requirement: item.timeline_requirement,
    description: item.description,
    location_description: item.location_description,
  });

  const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.minor;
  const isDiscarded = !item.accepted;

  const handleSave = () => {
    onUpdate(editState);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditState({
      code: item.code,
      title: item.title,
      severity: item.severity,
      category: item.category,
      timeline_requirement: item.timeline_requirement,
      description: item.description,
      location_description: item.location_description,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: '#A08C5A', backgroundColor: '#fdfaf4' }}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium" style={{ color: '#6B7F96' }}>Code citation</label>
              <input
                type="text"
                value={editState.code}
                onChange={e => setEditState(s => ({ ...s, code: e.target.value }))}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border text-sm"
                style={{ borderColor: '#E2DDD4', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: '#6B7F96' }}>Title</label>
              <input
                type="text"
                value={editState.title}
                onChange={e => setEditState(s => ({ ...s, title: e.target.value }))}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border text-sm"
                style={{ borderColor: '#E2DDD4' }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium" style={{ color: '#6B7F96' }}>Severity</label>
              <select
                value={editState.severity}
                onChange={e => setEditState(s => ({ ...s, severity: e.target.value as ExtractedItem['severity'] }))}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border text-sm"
                style={{ borderColor: '#E2DDD4' }}
              >
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="advisory">Advisory</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: '#6B7F96' }}>Category</label>
              <select
                value={editState.category}
                onChange={e => setEditState(s => ({ ...s, category: e.target.value as ExtractedItem['category'] }))}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border text-sm"
                style={{ borderColor: '#E2DDD4' }}
              >
                <option value="food_safety">Food Safety</option>
                <option value="fire_safety">Fire Safety</option>
                <option value="facility_services">Facility Services</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: '#6B7F96' }}>Correction timeline</label>
              <select
                value={editState.timeline_requirement}
                onChange={e => setEditState(s => ({ ...s, timeline_requirement: e.target.value as ExtractedItem['timeline_requirement'] }))}
                className="w-full mt-1 px-3 py-1.5 rounded-lg border text-sm"
                style={{ borderColor: '#E2DDD4' }}
              >
                <option value="immediate">Immediate</option>
                <option value="30_days">30 days</option>
                <option value="90_days">90 days</option>
                <option value="next_service">Next service</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: '#6B7F96' }}>Description</label>
            <textarea
              value={editState.description}
              onChange={e => setEditState(s => ({ ...s, description: e.target.value }))}
              rows={2}
              className="w-full mt-1 px-3 py-1.5 rounded-lg border text-sm resize-none"
              style={{ borderColor: '#E2DDD4' }}
            />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: '#6B7F96' }}>Location</label>
            <input
              type="text"
              value={editState.location_description}
              onChange={e => setEditState(s => ({ ...s, location_description: e.target.value }))}
              className="w-full mt-1 px-3 py-1.5 rounded-lg border text-sm"
              style={{ borderColor: '#E2DDD4' }}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border"
              style={{ borderColor: '#E2DDD4', color: '#6B7F96' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: '#1E2D4D' }}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 transition-opacity ${isDiscarded ? 'opacity-40' : ''}`}
      style={{
        borderColor: '#E2DDD4',
        borderLeft: `4px solid ${confidenceBorderColor(item.confidence)}`,
        backgroundColor: '#FFFFFF',
      }}
    >
      <div className="flex gap-3">
        {/* Checkbox */}
        <div className="flex-shrink-0 pt-0.5">
          <button
            onClick={onToggle}
            className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
            style={{
              borderColor: checked ? '#1E2D4D' : '#D1D5DB',
              backgroundColor: checked ? '#1E2D4D' : 'transparent',
            }}
          >
            {checked && <Check className="w-3 h-3 text-white" />}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Row 1: code + title + confidence */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded text-xs font-bold"
              style={{ backgroundColor: '#EEF1F7', color: '#1E2D4D', fontFamily: 'monospace' }}
            >
              {item.code}
            </span>
            <span className="text-sm font-medium" style={{ color: '#1E2D4D' }}>
              {item.title}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold ml-auto"
              style={{
                color: confidenceColor(item.confidence),
                backgroundColor: confidenceColor(item.confidence) + '15',
              }}
            >
              {confidenceLabel(item.confidence)} {Math.round(item.confidence * 100)}%
            </span>
          </div>

          {/* Row 2: severity + category */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className="px-2 py-0.5 rounded text-xs font-semibold"
              style={{ color: sev.color, backgroundColor: sev.bg }}
            >
              {sev.label}
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: '#EEF1F7', color: '#3D5068' }}
            >
              {CATEGORY_LABELS[item.category] || item.category}
            </span>
          </div>

          {/* Meta line: correction timeline */}
          <p className="text-xs mb-2" style={{ color: '#6B7F96' }}>
            Correct by: {TIMELINE_LABELS[item.timeline_requirement] || item.timeline_requirement}
          </p>

          {/* Warning callout for medium confidence */}
          {item.confidence >= 0.7 && item.confidence < 0.9 && item.confidence_reason && (
            <div
              className="flex items-start gap-2 p-2 rounded-lg mb-2"
              style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#c2731a' }} />
              <p className="text-xs" style={{ color: '#92400e' }}>
                {item.confidence_reason}
              </p>
            </div>
          )}

          {/* Source quote */}
          {item.source_quote && (
            <div
              className="p-2.5 rounded-lg mt-2"
              style={{
                backgroundColor: '#FAF7F0',
                borderLeft: '3px solid #D1D5DB',
              }}
            >
              <p className="text-xs italic" style={{ color: '#3D5068' }}>
                &ldquo;{item.source_quote}&rdquo;
              </p>
              {item.source_page && (
                <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                  Page {item.source_page}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right column: action buttons */}
        <div className="flex-shrink-0 flex flex-col gap-1">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg border transition-colors hover:bg-[#FAF7F0]"
            style={{ borderColor: '#E2DDD4' }}
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" style={{ color: '#6B7F96' }} />
          </button>
          <button
            onClick={onDiscard}
            className="p-1.5 rounded-lg border transition-colors hover:bg-red-50"
            style={{ borderColor: '#E2DDD4' }}
            title={isDiscarded ? 'Restore' : 'Discard'}
          >
            <X className="w-3.5 h-3.5" style={{ color: isDiscarded ? '#059669' : '#b3261e' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
