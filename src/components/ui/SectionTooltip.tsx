import { useState, useId } from 'react';
import { Info } from 'lucide-react';

interface SectionTooltipProps {
  content: string;
}

export function SectionTooltip({ content }: SectionTooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  if (!content) return null;

  return (
    <span className="relative inline-flex items-center ml-1.5">
      <span
        aria-describedby={visible ? tooltipId : undefined}
        className="cursor-help inline-flex items-center"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        <Info
          size={11}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        />
      </span>
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 rounded-md px-3 py-2 text-xs leading-relaxed shadow-lg pointer-events-none"
          style={{
            width: 280,
            backgroundColor: '#1e3a5f',
            border: '1px solid #2d4a6e',
            color: '#e2e8f0',
          }}
        >
          {content}
          {/* Arrow */}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #2d4a6e',
            }}
          />
        </span>
      )}
    </span>
  );
}
