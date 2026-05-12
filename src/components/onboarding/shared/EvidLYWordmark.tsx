/**
 * EvidLY wordmark: Montserrat 800
 * E = gold, vid = cream, LY = gold
 */
export function EvidLYWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-[Montserrat] font-extrabold tracking-tight ${className}`}>
      <span style={{ color: '#A08C5A' }}>E</span>
      <span style={{ color: '#FAF7F0' }}>vid</span>
      <span style={{ color: '#A08C5A' }}>LY</span>
    </span>
  );
}
