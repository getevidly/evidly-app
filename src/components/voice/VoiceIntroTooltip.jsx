import { useEffect } from 'react';

export function VoiceIntroTooltip({ onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-50 w-52">
      <div className="bg-[#A08C5A] text-white text-xs p-3 rounded-xl text-center shadow-lg">
        <div className="font-semibold mb-1">Hands-free mode</div>
        <div>Hold the mic &middot; speak a command &middot; EvidLY handles the rest</div>
      </div>
      <div className="flex justify-center">
        <div
          className="w-0 h-0"
          style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #A08C5A',
          }}
        />
      </div>
    </div>
  );
}
