/**
 * QRScanLandingPage — Public page shown when customers scan equipment QR codes.
 * Route: /equipment/scan/:equipmentId (no auth required)
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { QrCode, Wrench, Calendar, AlertTriangle, MessageSquare, Loader2 } from 'lucide-react';
import { useEquipmentItem } from '../../hooks/api/useEquipment';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const BORDER = '#D1D9E6';

const CONDITION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  clean: { label: 'Clean', color: '#059669', bg: '#F0FFF4' },
  light: { label: 'Light Build-Up', color: '#10B981', bg: '#ECFDF5' },
  moderate: { label: 'Moderate Build-Up', color: '#D97706', bg: '#FFFBEB' },
  heavy: { label: 'Heavy Build-Up', color: '#B45309', bg: '#FEF3C7' },
  deficient: { label: 'Deficient', color: '#DC2626', bg: '#FEF2F2' },
};

export function QRScanLandingPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const { data: equipment, isLoading } = useEquipmentItem(equipmentId);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1E2D4D' }} />
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <QrCode className="w-16 h-16 mx-auto mb-4" style={{ color: TEXT_SEC }} />
          <h1 className="text-lg font-bold" style={{ color: NAVY }}>Equipment Not Found</h1>
          <p className="text-sm mt-2" style={{ color: TEXT_SEC }}>
            This QR code may be outdated or the equipment has been removed from the system.
          </p>
          <p className="text-xs mt-4" style={{ color: TEXT_SEC }}>Powered by HoodOps</p>
        </div>
      </div>
    );
  }

  const cond = CONDITION_LABELS[equipment.condition] || CONDITION_LABELS.clean;
  const daysUntilDue = equipment.nextDueDate
    ? Math.ceil((new Date(equipment.nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 text-center" style={{ background: NAVY }}>
          <p className="text-xs font-semibold tracking-wider mb-1" style={{ color: GOLD }}>HOODOPS</p>
          <h1 className="text-lg font-bold text-white">{equipment.name}</h1>
          <p className="text-sm text-gray-300 mt-1">{equipment.locationName}</p>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          {/* Condition */}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: TEXT_SEC }}>Condition</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: cond.bg, color: cond.color }}>
              {cond.label}
            </span>
          </div>

          {/* Last Service */}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: TEXT_SEC }}>Last Service</span>
            <span className="text-sm font-medium" style={{ color: NAVY }}>
              {equipment.lastServiceDate ? new Date(equipment.lastServiceDate).toLocaleDateString() : 'Not yet serviced'}
            </span>
          </div>

          {/* Next Due */}
          {equipment.nextDueDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: TEXT_SEC }}>Next Due</span>
              <span className="text-sm font-medium" style={{
                color: daysUntilDue !== null && daysUntilDue < 0 ? '#DC2626' : daysUntilDue !== null && daysUntilDue < 14 ? '#D97706' : NAVY,
              }}>
                {new Date(equipment.nextDueDate).toLocaleDateString()}
                {daysUntilDue !== null && daysUntilDue < 0 && ' (Overdue)'}
              </span>
            </div>
          )}

          {/* Equipment type */}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: TEXT_SEC }}>Type</span>
            <span className="text-sm font-medium capitalize" style={{ color: NAVY }}>{equipment.equipmentType}</span>
          </div>

          {/* Open deficiencies */}
          {equipment.deficiencyCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-800">
                {equipment.deficiencyCount} open {equipment.deficiencyCount === 1 ? 'deficiency' : 'deficiencies'}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          {!showIssueForm && !submitted && (
            <>
              <button
                onClick={() => setShowIssueForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: '#DC2626' }}
              >
                <AlertTriangle className="w-4 h-4" /> Report Issue
              </button>
              <button
                onClick={() => alert('Service request submitted (demo)')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-colors"
                style={{ borderColor: BORDER, color: NAVY }}
              >
                <Wrench className="w-4 h-4" /> Request Service
              </button>
            </>
          )}

          {showIssueForm && !submitted && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold" style={{ color: NAVY }}>Describe the Issue</label>
              <textarea
                value={issueDescription}
                onChange={e => setIssueDescription(e.target.value)}
                rows={3}
                placeholder="What's wrong with this equipment?"
                className="w-full px-3 py-2 text-sm rounded-lg border resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2/30"
                style={{ borderColor: BORDER, color: NAVY }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowIssueForm(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border"
                  style={{ borderColor: BORDER, color: TEXT_SEC }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setSubmitted(true); setShowIssueForm(false); }}
                  disabled={!issueDescription.trim()}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: issueDescription.trim() ? '#DC2626' : '#9CA3AF' }}
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {submitted && (
            <div className="text-center py-4 rounded-xl" style={{ background: '#F0FFF4', border: '1px solid #BBF7D0' }}>
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-semibold text-green-800">Issue Reported</p>
              <p className="text-xs text-green-700 mt-1">The service team has been notified.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 text-center" style={{ background: '#F9FAFB', borderTop: `1px solid ${BORDER}` }}>
          <p className="text-xs" style={{ color: TEXT_SEC }}>
            Equipment ID: {equipment.id}
          </p>
          <p className="text-xs mt-1" style={{ color: TEXT_SEC }}>
            Powered by <span style={{ color: GOLD, fontWeight: 700 }}>HoodOps</span>
          </p>
        </div>
      </div>
    </div>
  );
}
