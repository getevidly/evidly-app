/**
 * Avatar — deterministic colored initials circle.
 * Shared primitive. Import from 'src/components/ui/Avatar'.
 */

const PALETTE = [
  '#1E2D4D', '#059669', '#D97706', '#DC2626',
  '#A08C5A', '#2563EB', '#7C3AED', '#0891B2',
] as const;

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AvatarProps {
  name: string;
  size?: number;
  userId?: string;
}

export function Avatar({ name, size = 22, userId }: AvatarProps) {
  const seed = userId ?? name;
  const color = PALETTE[hashCode(seed) % PALETTE.length];
  const initials = getInitials(name);
  const fontSize = Math.max(8, Math.round(size * 0.45));

  return (
    <div
      className="inline-flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        color: '#FAF7F0',
        fontSize,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}
      title={name}
    >
      {initials}
    </div>
  );
}
