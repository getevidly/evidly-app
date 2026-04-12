import { useDemo } from '../contexts/DemoContext';

export function DemoWatermark() {
  const { isDemoMode, presenterMode } = useDemo();
  if (!isDemoMode || presenterMode) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden lg:pl-60">
      <div className="w-full h-full flex items-center justify-center">
        <span
          className="text-4xl font-bold text-[#1E2D4D]/30 select-none whitespace-nowrap"
          style={{ transform: 'rotate(-30deg)', opacity: 0.04 }}
        >
          DEMO — evidly.com
        </span>
      </div>
    </div>
  );
}
