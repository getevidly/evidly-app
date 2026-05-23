import { useMemo } from 'react';
import { FileText, ExternalLink, Bot, Check, Loader2 } from 'lucide-react';
import { ExtractedItemCard } from './ExtractedItemCard';
import type { ExtractedItem, DeficiencyUploadRecord } from '../../hooks/deficiencies/useDeficiencyUpload';

interface ExtractedItemsReviewProps {
  upload: DeficiencyUploadRecord;
  items: ExtractedItem[];
  storageUrl: string | null;
  accepting: boolean;
  acceptedCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  onToggleItem: (itemId: string) => void;
  onToggleAll: (accepted: boolean) => void;
  onSelectHighOnly: () => void;
  onUpdateItem: (itemId: string, updates: Partial<ExtractedItem>) => void;
  onDiscardItem: (itemId: string) => void;
  onAccept: () => void;
  onCancel: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

export function ExtractedItemsReview({
  upload,
  items,
  storageUrl,
  accepting,
  acceptedCount,
  highCount,
  mediumCount,
  lowCount,
  onToggleItem,
  onToggleAll,
  onSelectHighOnly,
  onUpdateItem,
  onDiscardItem,
  onAccept,
  onCancel,
}: ExtractedItemsReviewProps) {
  const allChecked = items.every(i => i.accepted);
  const someChecked = items.some(i => i.accepted);

  const highItems = useMemo(() => items.filter(i => i.confidence >= 0.9), [items]);
  const medItems = useMemo(() => items.filter(i => i.confidence >= 0.7 && i.confidence < 0.9), [items]);
  const lowItems = useMemo(() => items.filter(i => i.confidence < 0.7), [items]);

  const TILE_DATA = [
    { label: 'Total', count: items.length, color: '#1E2D4D', bg: '#EEF1F7' },
    { label: 'High', count: highCount, color: '#059669', bg: '#d1fae5' },
    { label: 'Needs review', count: mediumCount, color: '#c2731a', bg: '#fef3c7' },
    { label: 'Low', count: lowCount, color: '#b3261e', bg: '#fee2e2' },
  ];

  return (
    <div className="space-y-5">
      {/* Source card */}
      <div
        className="rounded-xl border p-4 flex items-center gap-3"
        style={{ borderColor: '#E2DDD4', backgroundColor: '#FFFFFF' }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: upload.file_type === 'application/pdf' ? '#fee2e2' : '#EEF1F7' }}
        >
          <FileText className="w-5 h-5" style={{ color: upload.file_type === 'application/pdf' ? '#dc2626' : '#3D5068' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#1E2D4D' }}>{upload.file_name}</p>
          <p className="text-xs" style={{ color: '#6B7F96' }}>
            {formatFileSize(upload.file_size)} · {items.length} items extracted
            {upload.extraction_latency_ms ? ` · ${(upload.extraction_latency_ms / 1000).toFixed(1)}s` : ''}
          </p>
        </div>
        {storageUrl && (
          <a
            href={storageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium hover:underline flex-shrink-0"
            style={{ color: '#1E2D4D' }}
          >
            View original <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TILE_DATA.map(tile => (
          <div
            key={tile.label}
            className="rounded-xl p-3 text-center"
            style={{ backgroundColor: tile.bg }}
          >
            <p className="text-2xl font-bold" style={{ color: tile.color }}>{tile.count}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: tile.color }}>{tile.label}</p>
          </div>
        ))}
      </div>

      {/* AI disclaimer */}
      <div
        className="rounded-xl p-3 flex items-start gap-2"
        style={{ border: '1px solid #A08C5A', backgroundColor: '#fdfaf4' }}
      >
        <Bot className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#A08C5A' }} />
        <p className="text-xs" style={{ color: '#6B7F96' }}>
          AI-extracted items require human review. Verify each item against the original report before
          accepting. This is compliance guidance only — not legal advice.
        </p>
      </div>

      {/* Bulk action bar */}
      <div
        className="rounded-xl border p-3 flex flex-wrap items-center gap-3"
        style={{ borderColor: '#E2DDD4', backgroundColor: '#FAFAFA' }}
      >
        <button
          onClick={() => onToggleAll(!allChecked)}
          className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0"
          style={{
            borderColor: allChecked ? '#1E2D4D' : someChecked ? '#6B7F96' : '#D1D5DB',
            backgroundColor: allChecked ? '#1E2D4D' : 'transparent',
          }}
        >
          {allChecked && <Check className="w-3 h-3 text-white" />}
          {!allChecked && someChecked && <div className="w-2 h-0.5 rounded" style={{ backgroundColor: '#6B7F96' }} />}
        </button>
        <span className="text-sm" style={{ color: '#6B7F96' }}>
          {acceptedCount} of {items.length} selected
        </span>
        <button
          onClick={onSelectHighOnly}
          className="ml-auto px-3 py-1 rounded-lg text-xs font-medium border transition-colors hover:bg-[#FAF7F0]"
          style={{ borderColor: '#E2DDD4', color: '#3D5068' }}
        >
          Select high confidence only
        </button>
      </div>

      {/* Confidence sections */}
      {highItems.length > 0 && (
        <Section title="High confidence" count={highItems.length} color="#059669">
          {highItems.map(item => (
            <ExtractedItemCard
              key={item.id}
              item={item}
              checked={item.accepted}
              onToggle={() => onToggleItem(item.id)}
              onDiscard={() => onDiscardItem(item.id)}
              onUpdate={(updates) => onUpdateItem(item.id, updates)}
            />
          ))}
        </Section>
      )}

      {medItems.length > 0 && (
        <Section title="Needs review" count={medItems.length} color="#c2731a">
          {medItems.map(item => (
            <ExtractedItemCard
              key={item.id}
              item={item}
              checked={item.accepted}
              onToggle={() => onToggleItem(item.id)}
              onDiscard={() => onDiscardItem(item.id)}
              onUpdate={(updates) => onUpdateItem(item.id, updates)}
            />
          ))}
        </Section>
      )}

      {lowItems.length > 0 && (
        <Section title="Low confidence" count={lowItems.length} color="#b3261e">
          {lowItems.map(item => (
            <ExtractedItemCard
              key={item.id}
              item={item}
              checked={item.accepted}
              onToggle={() => onToggleItem(item.id)}
              onDiscard={() => onDiscardItem(item.id)}
              onUpdate={(updates) => onUpdateItem(item.id, updates)}
            />
          ))}
        </Section>
      )}

      {/* Footer action bar */}
      <div
        className="sticky bottom-0 rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3"
        style={{ borderColor: '#E2DDD4', backgroundColor: '#FFFFFF', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }}
      >
        <p className="text-sm" style={{ color: '#6B7F96' }}>
          {acceptedCount} {acceptedCount === 1 ? 'deficiency' : 'deficiencies'} will be created
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-[#FAF7F0]"
            style={{ borderColor: '#E2DDD4', color: '#3D5068' }}
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            disabled={acceptedCount === 0 || accepting}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: '#1E2D4D' }}
          >
            {accepting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              `Create ${acceptedCount} ${acceptedCount === 1 ? 'deficiency' : 'deficiencies'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, count, color, children }: { title: string; count: number; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
          {title}
        </h3>
        <span className="text-xs font-medium" style={{ color: '#6B7F96' }}>
          ({count})
        </span>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}
