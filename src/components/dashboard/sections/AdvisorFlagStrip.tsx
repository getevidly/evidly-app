import { useAdvisorBriefings } from '../../../hooks/useAdvisorBriefings';
import type { OpenItem } from '../../../hooks/useAdvisorBriefings';
import { FlagCard } from './FlagCard';

const URGENCY_RANK: Record<string, number> = { urgent: 0, pulling: 1 };

function pickTopItem(items: OpenItem[], pillar: 'food_safety' | 'fire_safety'): OpenItem | null {
  const filtered = items
    .filter(i => i.pillar === pillar && (i.urgency === 'urgent' || i.urgency === 'pulling'))
    .sort((a, b) => {
      const urgDiff = (URGENCY_RANK[a.urgency] ?? 2) - (URGENCY_RANK[b.urgency] ?? 2);
      if (urgDiff !== 0) return urgDiff;
      return a.detected_at.localeCompare(b.detected_at);
    });
  return filtered[0] || null;
}

export function AdvisorFlagStrip() {
  const { food_safety, fire_safety, loading } = useAdvisorBriefings();

  if (loading) return null;

  const allItems: OpenItem[] = [
    ...(food_safety?.open_items || []),
    ...(fire_safety?.open_items || []),
  ];

  const foodFlag = pickTopItem(allItems, 'food_safety');
  const fireFlag = pickTopItem(allItems, 'fire_safety');

  if (!foodFlag && !fireFlag) return null;

  return (
    <div className="flagstrip">
      {foodFlag && <FlagCard pillar="food_safety" title={foodFlag.title} />}
      {fireFlag && <FlagCard pillar="fire_safety" title={fireFlag.title} />}
    </div>
  );
}
