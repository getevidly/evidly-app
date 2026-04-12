/**
 * InventoryItemPage — Single inventory item detail with info cards and transaction history.
 * Route: /inventory/:id
 */
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Package, Layers, Settings, Plus, RotateCcw } from 'lucide-react';
import { useInventoryItem, useInventoryTransactions } from '../../hooks/api/useInventory';

const NAVY = '#163a5f';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#D1D9E6';
const CARD_SHADOW = '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)';
const TEXT_TERTIARY = '#6B7F96';

const TXN_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  use:        { label: 'Usage',      color: '#D97706' },
  restock:    { label: 'Restock',    color: '#059669' },
  adjustment: { label: 'Adjustment', color: '#6366F1' },
  transfer:   { label: 'Transfer',   color: '#0891B2' },
  damage:     { label: 'Damage',     color: '#DC2626' },
  loss:       { label: 'Loss',       color: '#DC2626' },
};

export function InventoryItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading: itemLoading } = useInventoryItem(id || '');
  const { data: transactions, isLoading: txnLoading } = useInventoryTransactions(id);

  if (itemLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: NAVY }} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-20">
        <Package className="w-10 h-10 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
        <p className="text-base font-semibold" style={{ color: NAVY }}>
          Item not found
        </p>
        <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>
          This inventory item may have been removed.
        </p>
        <button
          onClick={() => navigate('/inventory')}
          className="mt-4 text-sm hover:underline"
          style={{ color: NAVY }}
        >
          Back to Inventory
        </button>
      </div>
    );
  }

  const formatCurrency = (val: number | null) =>
    val != null ? `$${val.toFixed(2)}` : '\u2014';

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-2 text-sm" style={{ color: TEXT_TERTIARY }}>
        <button
          onClick={() => navigate('/inventory')}
          className="hover:text-[#163a5f] flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Inventory
        </button>
        <span>/</span>
        <span style={{ color: NAVY, fontWeight: 600 }}>{item.name}</span>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: '#eef4f8', color: NAVY }}
          >
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: NAVY }}>
              {item.name}
            </h1>
            <p className="text-sm mt-0.5 capitalize" style={{ color: TEXT_TERTIARY }}>
              {item.category} &middot; {item.sku || 'No SKU'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Log Usage (not yet implemented)')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: CARD_BORDER, color: NAVY }}
          >
            <Plus className="w-4 h-4" /> Log Usage
          </button>
          <button
            onClick={() => alert('Restock (not yet implemented)')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors hover:opacity-90"
            style={{ background: NAVY }}
          >
            <RotateCcw className="w-4 h-4" /> Restock
          </button>
        </div>
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Item Info */}
        <div
          className="rounded-xl p-5"
          style={{
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            boxShadow: CARD_SHADOW,
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4" style={{ color: NAVY }} />
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>
              Item Info
            </h2>
          </div>
          <div className="space-y-3 text-sm">
            <InfoRow label="Name" value={item.name} />
            <InfoRow label="SKU" value={item.sku || '\u2014'} />
            <InfoRow label="Category" value={item.category} capitalize />
            <InfoRow label="Unit" value={item.unit} />
            <InfoRow label="Unit Cost" value={formatCurrency(item.unitCost)} />
          </div>
        </div>

        {/* Stock Levels */}
        <div
          className="rounded-xl p-5"
          style={{
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            boxShadow: CARD_SHADOW,
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4" style={{ color: NAVY }} />
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>
              Stock Levels
            </h2>
          </div>
          <div className="space-y-3 text-sm">
            <InfoRow label="Current Quantity" value={String(item.currentQuantity)} />
            <InfoRow label="Reorder Point" value={String(item.reorderPoint)} />
            <InfoRow label="Location" value={item.location || '\u2014'} />
          </div>
        </div>

        {/* Reorder Settings */}
        <div
          className="rounded-xl p-5"
          style={{
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            boxShadow: CARD_SHADOW,
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4" style={{ color: NAVY }} />
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>
              Reorder Settings
            </h2>
          </div>
          <div className="space-y-3 text-sm">
            <InfoRow label="Reorder Point" value={String(item.reorderPoint)} />
            <InfoRow label="Reorder Quantity" value={String(item.reorderQuantity)} />
            <InfoRow label="Unit Cost" value={formatCurrency(item.unitCost)} />
            <InfoRow
              label="Est. Reorder Cost"
              value={
                item.unitCost != null
                  ? formatCurrency(item.unitCost * item.reorderQuantity)
                  : '\u2014'
              }
            />
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: CARD_BG,
          border: `1px solid ${CARD_BORDER}`,
          boxShadow: CARD_SHADOW,
        }}
      >
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
          <h2 className="text-sm font-semibold" style={{ color: NAVY }}>
            Transaction History
          </h2>
        </div>

        {txnLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
          </div>
        )}

        {!txnLoading && transactions.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
              No transactions recorded yet.
            </p>
          </div>
        )}

        {!txnLoading && transactions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                  {['Date', 'Type', 'Quantity', 'Employee', 'Job', 'Notes'].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: TEXT_TERTIARY }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map(txn => {
                  const typeInfo = TXN_TYPE_LABELS[txn.transactionType] || {
                    label: txn.transactionType,
                    color: TEXT_TERTIARY,
                  };
                  return (
                    <tr
                      key={txn.id}
                      style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
                    >
                      <td className="px-4 py-3" style={{ color: NAVY }}>
                        {formatDate(txn.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: typeInfo.color, background: `${typeInfo.color}14` }}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>
                        {txn.quantity}
                      </td>
                      <td className="px-4 py-3" style={{ color: TEXT_TERTIARY }}>
                        {txn.employeeName || txn.employeeId}
                      </td>
                      <td className="px-4 py-3" style={{ color: TEXT_TERTIARY }}>
                        {txn.jobId || '\u2014'}
                      </td>
                      <td className="px-4 py-3" style={{ color: TEXT_TERTIARY }}>
                        {txn.notes || '\u2014'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: TEXT_TERTIARY }}>{label}</span>
      <span
        className={`font-medium ${capitalize ? 'capitalize' : ''}`}
        style={{ color: NAVY }}
      >
        {value}
      </span>
    </div>
  );
}
