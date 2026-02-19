import { useState, useId } from 'react';
import { Info } from 'lucide-react';

interface SidebarTooltipProps {
  content: string;
}

/**
 * Tooltip for sidebar nav items — positioned to the right to avoid
 * overflowing the 240px sidebar. Dark-background aware.
 */
export function SidebarTooltip({ content }: SidebarTooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  if (!content) return null;

  return (
    <span className="relative inline-flex items-center ml-1">
      <span
        aria-describedby={visible ? tooltipId : undefined}
        className="cursor-help inline-flex items-center"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <Info
          size={12}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        />
      </span>
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[10000] rounded-md px-3 py-2 text-xs leading-relaxed shadow-lg pointer-events-none"
          style={{
            width: 260,
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
          }}
        >
          {content}
          {/* Arrow pointing left */}
          <span
            className="absolute top-1/2 -translate-y-1/2 right-full"
            style={{
              width: 0,
              height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderRight: '6px solid #334155',
            }}
          />
        </span>
      )}
    </span>
  );
}
