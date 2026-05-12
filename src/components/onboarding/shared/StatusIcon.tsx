import { CheckCircle2, Circle, MinusCircle, CircleDot } from 'lucide-react';

export type StatusIconState = 'done' | 'skipped' | 'in_progress' | 'pending';

interface StatusIconProps {
  state: StatusIconState;
  size?: number;
}

export function StatusIcon({ state, size = 18 }: StatusIconProps) {
  switch (state) {
    case 'done':
      return <CheckCircle2 size={size} className="text-[#1E2D4D] fill-[#1E2D4D]/10" />;
    case 'skipped':
      return <MinusCircle size={size} className="text-amber-600" />;
    case 'in_progress':
      return <CircleDot size={size} className="text-[#1E2D4D]" />;
    case 'pending':
      return <Circle size={size} className="text-[#8A93A6]" />;
  }
}
