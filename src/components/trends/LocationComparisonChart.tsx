// LocationComparisonChart — placeholder (manufactured score trends removed)

interface Props {
  locationData: Record<string, unknown[]>;
}

export function LocationComparisonChart({ locationData }: Props) {
  const hasData = Object.keys(locationData).length > 0 &&
    Object.values(locationData).some((arr) => arr.length > 0);

  return (
    <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D]">Location Comparison</h3>
        <p className="text-sm text-[#1E2D4D]/50">Compare compliance trajectories across locations</p>
      </div>

      <div
        className="flex items-center justify-center rounded-lg border border-[#1E2D4D]/10 bg-[#F8FAFC] mt-4"
        style={{ height: 300 }}
      >
        <p className="text-sm text-[#1E2D4D]/50">
          {hasData
            ? 'Location comparison is being updated to show operational metrics.'
            : 'No location trend data available.'}
        </p>
      </div>
    </div>
  );
}
