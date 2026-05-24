import { Sparkles, RefreshCw } from 'lucide-react';
import { TemperatureAIInsufficient } from './TemperatureAIInsufficient';
import { TemperatureAIClean } from './TemperatureAIClean';
import { TemperaturePatternCard } from './TemperaturePatternCard';
import type { PatternAnalysisResult } from '../../hooks/temperatures/useTemperaturePatternAnalysis';

interface Props {
  analysis: PatternAnalysisResult;
  windowDays: number;
  onViewData?: (filters: Record<string, string>) => void;
}

export function TemperatureAIPatternInsights({ analysis, windowDays, onViewData }: Props) {
  const { loading, error, patterns, tier, readingsCount, aiDisclaimer, refresh } = analysis;

  const hasConcerning = patterns.some(p => p.prp === 'reduce' && p.confidence_pct >= 80);
  const borderColor = hasConcerning ? '#DC2626' : '#A08C5A';
  const bgGradient = hasConcerning
    ? 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)'
    : 'linear-gradient(135deg, #fdf8f0 0%, #fef6e8 100%)';

  const windowLabel = windowDays === 0 ? 'All time' : `${windowDays} days`;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${borderColor}30`,
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
        background: bgGradient,
      }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: borderColor }} />
            <span className="text-sm font-bold" style={{ color: '#1E2D4D' }}>
              {hasConcerning ? '\u26A0 AI Pattern Insights \u00b7 Action recommended' : 'AI Pattern Insights'}
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${borderColor}18`, color: borderColor }}
            >
              AI
            </span>
          </div>
          <span className="text-[10px]" style={{ color: '#6B7F96' }}>
            Window: {windowLabel} &middot; {readingsCount} readings
            {patterns.length > 0 && ` \u00b7 ${patterns.length} pattern${patterns.length !== 1 ? 's' : ''} identified`}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-5">
        {loading && (
          <div className="flex items-center gap-2 py-6 justify-center text-xs" style={{ color: '#6B7F96' }}>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Analyzing temperature patterns...
          </div>
        )}

        {error && !loading && (
          <div className="text-xs py-4 text-center" style={{ color: '#DC2626' }}>
            {error}
            <button
              type="button"
              onClick={refresh}
              className="ml-2 underline font-semibold"
              style={{ color: '#1E2D4D' }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && tier === 0 && (
          <TemperatureAIInsufficient
            readingsCount={readingsCount}
            tier={tier}
            windowDays={windowDays}
          />
        )}

        {!loading && !error && tier >= 1 && patterns.length === 0 && (
          <TemperatureAIClean readingsCount={readingsCount} windowDays={windowDays} />
        )}

        {!loading && !error && patterns.length > 0 && (
          <>
            {/* Patterns grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...patterns]
                .sort((a, b) => {
                  // Reduce first, then predict, then prove
                  const order: Record<string, number> = { reduce: 0, predict: 1, prove: 2 };
                  return (order[a.prp] ?? 9) - (order[b.prp] ?? 9);
                })
                .map((pattern, i) => (
                  <TemperaturePatternCard
                    key={`${pattern.detector}-${i}`}
                    pattern={pattern}
                    onViewData={onViewData}
                  />
                ))}
            </div>

            {/* Disclaimer */}
            <p
              className="text-[10px] leading-relaxed mt-4 px-3 py-2 rounded-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.6)', color: '#6B7F96' }}
            >
              {aiDisclaimer}
            </p>

            {/* Refresh */}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: '#1E2D4D10', color: '#1E2D4D' }}
              >
                <RefreshCw className="w-3 h-3" />
                Refresh analysis
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
