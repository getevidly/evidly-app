interface FlagCardProps {
  pillar: 'food_safety' | 'fire_safety';
  title: string;
}

const PILLAR_CONFIG = {
  food_safety: { cls: 'food', icon: 'ti-chef-hat', label: 'Food Safety' },
  fire_safety: { cls: 'fire', icon: 'ti-flame', label: 'Fire Safety' },
};

export function FlagCard({ pillar, title }: FlagCardProps) {
  const cfg = PILLAR_CONFIG[pillar];
  return (
    <div className={`flag ${cfg.cls}`}>
      <p className="flag-eye"><i className={`ti ${cfg.icon}`} />{cfg.label}</p>
      <p className="flag-msg">{title}</p>
    </div>
  );
}
