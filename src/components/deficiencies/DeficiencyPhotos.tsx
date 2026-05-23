import { Camera, Plus } from 'lucide-react';

const NAVY = '#1E2D4D';

interface DeficiencyPhotosProps {
  photoIds: string[];
  resolutionPhotoIds: string[];
}

export function DeficiencyPhotos({
  photoIds,
  resolutionPhotoIds,
}: DeficiencyPhotosProps) {
  const allPhotos = [...photoIds, ...resolutionPhotoIds];
  if (allPhotos.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-[#E2DDD4] p-5">
      <h3 className="text-sm font-bold mb-3" style={{ color: NAVY }}>
        Inspection photos
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
        {allPhotos.map((id) => (
          <div
            key={id}
            className="aspect-square bg-[#1E2D4D]/5 rounded-lg flex items-center justify-center"
          >
            <Camera size={20} className="text-[#1E2D4D]/20" />
          </div>
        ))}
        <div className="aspect-square rounded-lg flex items-center justify-center border-2 border-dashed border-[#E2DDD4] cursor-pointer hover:border-[#1E2D4D]/20 transition-colors">
          <Plus size={20} className="text-[#1E2D4D]/20" />
        </div>
      </div>
    </div>
  );
}
