import { useState, useRef, useEffect, useId } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
}

export function InfoTooltip({ content }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  // Close on click outside (mobile dismiss)
  useEffect(() => {
    if (!visible) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [visible]);

  if (!content) return null;

  return (
    <span ref={wrapperRef} className="relative inline-flex items-center ml-1">
      <span
        aria-describedby={visible ? tooltipId : undefined}
        className="cursor-help inline-flex items-center"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={(e) => { e.stopPropagation(); setVisible(v => !v); }}
      >
        <Info
          size={14}
          style={{ color: '#9CA3AF' }}
          className="hover:text-gray-600 transition-colors"
        />
      </span>
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg pointer-events-none whitespace-normal"
          style={{
            maxWidth: 280,
            width: 'max-content',
            backgroundColor: '#111827',
            color: '#FFFFFF',
            zIndex: 9999,
          }}
        >
          {content}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #111827',
            }}
          />
        </span>
      )}
    </span>
  );
}
