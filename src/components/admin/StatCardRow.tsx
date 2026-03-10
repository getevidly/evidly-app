import { StatCard } from './StatCard';
import type { StatCardProps } from './StatCard';

interface StatCardRowProps {
  cards: StatCardProps[];
}

export function StatCardRow({ cards }: StatCardRowProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cards.length}, 1fr)`,
      gap: 12,
      alignItems: 'stretch',
    }}>
      {cards.map((card, i) => (
        <StatCard key={card.label + i} {...card} />
      ))}
    </div>
  );
}
