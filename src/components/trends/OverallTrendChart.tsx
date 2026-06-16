// OverallTrendChart — placeholder (manufactured score trends removed)

/** Generic data point accepted by this chart. */
export interface OperationalTrendDataPoint {
  date: string;
  dateDisplay: string;
  [key: string]: string | number;
}

interface Props {
  data: OperationalTrendDataPoint[];
}

export function OverallTrendChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-[#1E2D4D]/10 bg-[#F8FAFC]"
        style={{ height: 300 }}
      >
        <p className="text-sm text-[#1E2D4D]/50">
          Trend chart is being updated to show operational metrics.
        </p>
      </div>
    );
  }

  // Future: render operational metric chart here
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-[#1E2D4D]/10 bg-[#F8FAFC]"
      style={{ height: 300 }}
    >
      <p className="text-sm text-[#1E2D4D]/50">
        Trend chart is being updated to show operational metrics.
      </p>
    </div>
  );
}
