const NAVY = '#1E2D4D';

interface DeficiencyInspectorWriteupProps {
  description: string;
  foundBy: string;
  foundDate: string;
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DeficiencyInspectorWriteup({
  description,
  foundBy,
  foundDate,
}: DeficiencyInspectorWriteupProps) {
  if (!description) return null;

  return (
    <div className="bg-white rounded-xl border border-[#E2DDD4] p-5">
      <h3 className="text-sm font-bold mb-3" style={{ color: NAVY }}>
        Inspector write-up
      </h3>
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: '#fdfaf4',
          borderLeft: `3px solid ${NAVY}`,
        }}
      >
        <p
          className="text-[13px] italic leading-relaxed"
          style={{ color: NAVY, lineHeight: 1.6 }}
        >
          {description}
        </p>
      </div>
      <p className="text-[11px] text-[#8A93A6] mt-2">
        — {foundBy} · {formatDate(foundDate)}
      </p>
    </div>
  );
}
