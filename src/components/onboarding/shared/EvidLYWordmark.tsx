/**
 * EvidLY wordmark: Montserrat 800
 * E = ember, vid = cream, LY = ember
 */
export function EvidLYWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-[Montserrat] font-extrabold tracking-tight ${className}`}>
      <span style={{ color: '#B24A2E' }}>E</span>
      <span style={{ color: '#FAF7F0' }}>vid</span>
      <span style={{ color: '#B24A2E' }}>LY</span>
    </span>
  );
}
