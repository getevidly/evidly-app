import { getReadinessColor } from '../../utils/inspectionReadiness';

interface LocationCardProps {
  locationId: string;
  locationName: string;
  score: number;
  onClick: () => void;
  isSelected?: boolean;
}

export default function LocationCard({ locationName, score, onClick, isSelected }: LocationCardProps) {
  const color = getReadinessColor(score);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center rounded-lg p-3 bg-white transition-all duration-200 hover:shadow-md"
      style={{
        fontFamily: 'Inter, sans-serif',
        width: 120,
        minHeight: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: isSelected ? '2px solid #1e4d6b' : '2px solid transparent',
        cursor: 'pointer',
      }}
      title={locationName}
    >
      <span
        className="text-xs font-medium text-gray-700 text-center leading-tight mb-2 w-full truncate"
      >
        {locationName}
      </span>
      <span className="text-xl font-bold" style={{ color }}>
        {score}
      </span>
      <span
        className="inline-block w-2.5 h-2.5 rounded-full mt-1.5"
        style={{ backgroundColor: color }}
      />
    </button>
  );
}
