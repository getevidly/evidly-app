import { StatCard } from './StatCard';
import type { StatCardProps } from './StatCard';

interface StatCardRowProps {
  cards: StatCardProps[];
}

export function StatCardRow({ cards }: StatCardRowProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 16,
      width: '100%',
    }}>
      {cards.map((card, i) => (
        <StatCard key={card.label + i} {...card} />
      ))}
    </div>
  );
}
