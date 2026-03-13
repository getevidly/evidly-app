/**
 * EquipmentOverview — Overview tab for equipment detail page.
 * Two-column layout: location/specs/compliance on left, QR/status/notes on right.
 */
import { useState } from 'react';
import { MapPin, Cpu, Shield, QrCode, Activity, StickyNote, Printer, Download, Calendar, AlertTriangle } from 'lucide-react';
import type { EquipmentItem } from '../../hooks/api/useEquipment';
import { QRCodeDisplay } from './QRCodeDisplay';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY, MUTED } from '../dashboard/shared/constants';

interface EquipmentOverviewProps {
  equipment: EquipmentItem;
  onPrintQR?: () => void;
}

export function EquipmentOverview({ equipment, onPrintQR }: EquipmentOverviewProps) {
  const [notes, setNotes] = useState(equipment.notes || '');
  const [editingNotes, setEditingNotes] = useState(false);

  const daysUntilDue = equipment.nextDueDate
    ? Math.ceil((new Date(equipment.nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column — 2/3 */}
      <div className="lg:col-span-2 space-y-5">
        {/* Location card */}
        <Card title="Location" icon={MapPin}>
          <InfoRow label="Customer" value={equipment.customerName} />
          <InfoRow label="Location" value={equipment.locationName} />
          <InfoRow label="Installed Area" value={equipment.installedArea || '—'} />
        </Card>

        {/* Specifications card */}
        <Card title="Specifications" icon={Cpu}>
          <InfoRow label="Equipment Type" value={equipment.equipmentType} capitalize />
          <InfoRow label="Manufacturer" value={equipment.manufacturer || '—'} />
          <InfoRow label="Model" value={equipment.model || '—'} />
          <InfoRow label="Serial Number" value={equipment.serialNumber || '—'} mono />
          <InfoRow label="Install Date" value={equipment.installDate ? new Date(equipment.installDate).toLocaleDateString() : '—'} />
          {/* Custom fields */}
          {Object.entries(equipment.customFields || {}).map(([key, val]) => (
            <InfoRow key={key} label={key.replace(/_/g, ' ')} value={String(val)} capitalize />
          ))}
        </Card>

        {/* Compliance card */}
        <Card title="Compliance" icon={Shield}>
          <InfoRow label="Service Frequency" value={equipment.serviceFrequencyDays ? `Every ${equipment.serviceFrequencyDays} days` : '—'} />
          <InfoRow label="Last Service" value={equipment.lastServiceDate ? new Date(equipment.lastServiceDate).toLocaleDateString() : 'Not yet serviced'} />
          <InfoRow label="Next Due" value={equipment.nextDueDate ? new Date(equipment.nextDueDate).toLocaleDateString() : '—'} />
          {daysUntilDue !== null && (
            <div className="flex items-center gap-2 mt-2 p-3 rounded-lg" style={{
              background: isOverdue ? '#FEF2F2' : daysUntilDue <= 14 ? '#FFFBEB' : '#F0FFF4',
              border: `1px solid ${isOverdue ? '#FECACA' : daysUntilDue <= 14 ? '#FDE68A' : '#BBF7D0'}`,
            }}>
              {isOverdue ? (
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              ) : (
                <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: daysUntilDue <= 14 ? '#D97706' : '#059669' }} />
              )}
              <p className="text-xs font-medium" style={{
                color: isOverdue ? '#991B1B' : daysUntilDue <= 14 ? '#92400E' : '#166534',
              }}>
                {isOverdue
                  ? `Overdue by ${Math.abs(daysUntilDue)} days`
                  : `${daysUntilDue} days until next service`}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Right column — 1/3 */}
      <div className="space-y-5">
        {/* QR Code card */}
        <Card title="QR Code" icon={QrCode}>
          <div className="flex justify-center mb-4">
            <QRCodeDisplay value={equipment.qrCodeId} size={160} />
          </div>
          <p className="text-xs text-center mb-3 font-mono" style={{ color: TEXT_TERTIARY }}>{equipment.qrCodeId}</p>
          <div className="flex gap-2">
            <button
              onClick={onPrintQR}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border hover:bg-gray-50 transition-colors"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={() => alert('QR download (demo)')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border hover:bg-gray-50 transition-colors"
              style={{ borderColor: CARD_BORDER, color: NAVY }}
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
          <p className="text-[10px] text-center mt-3" style={{ color: TEXT_TERTIARY }}>
            Scan this code to view equipment details and report issues.
          </p>
        </Card>

        {/* Current Status card */}
        <Card title="Current Status" icon={Activity}>
          <InfoRow label="Last Condition" value={equipment.condition} capitalize />
          <InfoRow label="Open Deficiencies" value={String(equipment.deficiencyCount)} />
          {equipment.deficiencyCount > 0 && (
            <p className="text-xs mt-2 text-[#1e4d6b] hover:underline cursor-pointer">View Deficiencies</p>
          )}
        </Card>

        {/* Notes card */}
        <Card title="Notes" icon={StickyNote}>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30"
                style={{ borderColor: CARD_BORDER, color: NAVY }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingNotes(false); alert('Notes saved (demo)'); }}
                  className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
                  style={{ background: '#1e4d6b' }}
                >
                  Save
                </button>
                <button
                  onClick={() => { setNotes(equipment.notes || ''); setEditingNotes(false); }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border"
                  style={{ borderColor: CARD_BORDER, color: TEXT_TERTIARY }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm" style={{ color: notes ? NAVY : TEXT_TERTIARY }}>
                {notes || 'No notes for this equipment.'}
              </p>
              <button onClick={() => setEditingNotes(true)} className="text-xs mt-2 text-[#1e4d6b] hover:underline">
                {notes ? 'Edit Notes' : 'Add Notes'}
              </button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4" style={{ color: '#1e4d6b' }} />
        <h3 className="text-sm font-bold" style={{ color: NAVY }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, capitalize, mono }: { label: string; value: string; capitalize?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${CARD_BORDER}20` }}>
      <span className="text-xs" style={{ color: TEXT_TERTIARY }}>{label}</span>
      <span className={`text-xs font-medium ${capitalize ? 'capitalize' : ''} ${mono ? 'font-mono' : ''}`} style={{ color: NAVY }}>
        {value}
      </span>
    </div>
  );
}
