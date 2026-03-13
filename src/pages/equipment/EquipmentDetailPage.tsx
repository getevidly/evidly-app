/**
 * EquipmentDetailPage — Single equipment view with 4-tab interface.
 * Route: /equipment/:id
 */
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, MoreHorizontal, QrCode, Power, Trash2, Loader2 } from 'lucide-react';
import { useEquipmentItem } from '../../hooks/api/useEquipment';
import { EquipmentOverview } from '../../components/equipment/EquipmentOverview';
import { EquipmentServiceHistory } from '../../components/equipment/EquipmentServiceHistory';
import { EquipmentDeficiencies } from '../../components/equipment/EquipmentDeficiencies';
import { EquipmentDocuments } from '../../components/equipment/EquipmentDocuments';
import { EquipmentFormModal } from '../../components/equipment/EquipmentFormModal';
import { QRCodePrintModal } from '../../components/equipment/QRCodePrintModal';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY, MUTED } from '../../components/dashboard/shared/constants';
import type { EquipmentCondition, EquipmentStatus } from '../../hooks/api/useEquipment';

const TABS = ['Overview', 'Service History', 'Deficiencies', 'Documents'] as const;
type TabKey = typeof TABS[number];

const CONDITION_STYLES: Record<EquipmentCondition, { bg: string; text: string }> = {
  clean: { bg: '#F0FFF4', text: '#059669' },
  light: { bg: '#ECFDF5', text: '#10B981' },
  moderate: { bg: '#FFFBEB', text: '#D97706' },
  heavy: { bg: '#FEF3C7', text: '#B45309' },
  deficient: { bg: '#FEF2F2', text: '#DC2626' },
};

const STATUS_STYLES: Record<EquipmentStatus, { bg: string; text: string; label: string }> = {
  active: { bg: '#F0FFF4', text: '#059669', label: 'Active' },
  inactive: { bg: '#F3F4F6', text: '#6B7280', label: 'Inactive' },
  needs_service: { bg: '#FFFBEB', text: '#D97706', label: 'Needs Service' },
  overdue: { bg: '#FEF2F2', text: '#DC2626', label: 'Overdue' },
};

const EQUIPMENT_ICONS: Record<string, string> = {
  hood: 'square', duct: 'rectangle', fan: 'circle', filter: 'grid',
  suppression: 'flame', extinguisher: 'fire', ansul: 'shield',
};

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: equipment, isLoading } = useEquipmentItem(id);

  const [activeTab, setActiveTab] = useState<TabKey>('Overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRPrint, setShowQRPrint] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1e4d6b' }} />
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="text-center py-20">
        <p className="text-base font-semibold" style={{ color: NAVY }}>Equipment not found</p>
        <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>This equipment may have been removed.</p>
        <button onClick={() => navigate('/equipment')} className="mt-4 text-sm text-[#1e4d6b] hover:underline">
          Back to Equipment
        </button>
      </div>
    );
  }

  const condStyle = CONDITION_STYLES[equipment.condition] || CONDITION_STYLES.clean;
  const statStyle = STATUS_STYLES[equipment.status] || STATUS_STYLES.active;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: TEXT_TERTIARY }}>
        <Link to="/equipment" className="hover:text-[#1e4d6b] flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Equipment
        </Link>
        <span>/</span>
        <span style={{ color: NAVY, fontWeight: 600 }}>{equipment.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ background: '#eef4f8', color: '#1e4d6b' }}>
            <EquipmentIcon type={equipment.equipmentType} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: NAVY }}>{equipment.name}</h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>
              {equipment.customerName} &middot; {equipment.locationName}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: condStyle.bg, color: condStyle.text }}>
                {equipment.condition}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: statStyle.bg, color: statStyle.text }}>
                {statStyle.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: CARD_BORDER, color: NAVY }}
          >
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: CARD_BORDER, color: NAVY }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg border py-1 z-10"
              style={{ background: CARD_BG, borderColor: CARD_BORDER }}
            >
              <button onClick={() => { setShowQRPrint(true); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: NAVY }}>
                <QrCode className="w-4 h-4" /> Print QR Code
              </button>
              <button onClick={() => { alert('Equipment deactivated (demo)'); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: '#D97706' }}>
                <Power className="w-4 h-4" /> Deactivate
              </button>
              <button onClick={() => { alert('Equipment deleted (demo)'); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: '#DC2626' }}>
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: CARD_BORDER }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-medium transition-colors relative"
            style={{ color: activeTab === tab ? NAVY : TEXT_TERTIARY }}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: '#1e4d6b' }} />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && <EquipmentOverview equipment={equipment} onPrintQR={() => setShowQRPrint(true)} />}
      {activeTab === 'Service History' && <EquipmentServiceHistory equipmentId={equipment.id} />}
      {activeTab === 'Deficiencies' && <EquipmentDeficiencies equipmentId={equipment.id} />}
      {activeTab === 'Documents' && <EquipmentDocuments equipmentId={equipment.id} />}

      {/* Modals */}
      {showEditModal && <EquipmentFormModal equipment={equipment} onClose={() => setShowEditModal(false)} />}
      {showQRPrint && <QRCodePrintModal equipment={equipment} onClose={() => setShowQRPrint(false)} />}
    </div>
  );
}

function EquipmentIcon({ type }: { type: string }) {
  // Simple text-based icons based on equipment type
  const icons: Record<string, string> = {
    hood: '\u2B1C', duct: '\u25AD', fan: '\u2B58', filter: '\u2593',
    suppression: '\u2B06', extinguisher: '\u2B06', ansul: '\u26E8',
  };
  return <span>{icons[type] || '\u2699'}</span>;
}
