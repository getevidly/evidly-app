import { useState } from 'react';
import { Snowflake, Play, AlertTriangle, Loader2 } from 'lucide-react';
import { useCooldownEvents, type CooldownEventWithState } from '../../hooks/temperatures/useCooldownEvents';
import { colors } from '../../lib/designSystem';
import { Modal } from '../ui/Modal';
import { StartCooldownForm } from './StartCooldownForm';
import { CooldownCard } from './CooldownCard';
import { LogCoolingCheckModal } from './LogCoolingCheckModal';
import { LogDispositionModal } from './LogDispositionModal';

export function CooldownActiveList() {
  const [showStartForm, setShowStartForm] = useState(false);
  const [checkTarget, setCheckTarget] = useState<CooldownEventWithState | null>(null);
  const [dispoTarget, setDispoTarget] = useState<CooldownEventWithState | null>(null);

  const { data: events, isLoading, error, refetch } = useCooldownEvents();

  let content;

  if (isLoading) {
    content = (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: colors.textMuted }} />
      </div>
    );
  } else if (error) {
    content = (
      <div
        className="rounded-xl border p-6 text-center"
        style={{ borderColor: colors.danger, backgroundColor: colors.dangerSoft }}
      >
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" style={{ color: colors.danger }} />
        <p className="text-sm font-medium" style={{ color: colors.danger }}>
          Failed to load cooldown data
        </p>
        <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
          {error.message}
        </p>
      </div>
    );
  } else if (events.length === 0) {
    content = (
      <div
        className="rounded-xl flex flex-col items-center justify-center text-center py-16 px-6"
        style={{ backgroundColor: '#FAF7F0', border: '2px dashed #E2DDD4' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: '#EFF6FF' }}
        >
          <Snowflake className="h-7 w-7" style={{ color: '#2563EB' }} />
        </div>
        <h4 className="text-base font-bold mb-2" style={{ color: '#1E2D4D' }}>
          No active cooldowns
        </h4>
        <p className="text-sm mb-6 max-w-sm" style={{ color: '#6B7F96' }}>
          Start a cooldown when cooked food begins cooling. EvidLY tracks the two-stage clock, alerts you when deadlines approach, and documents the outcome for your HACCP records.
        </p>
        <button
          onClick={() => setShowStartForm(true)}
          className="px-5 py-3 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5"
          style={{ backgroundColor: '#1E2D4D', color: 'white', minHeight: '44px' }}
        >
          <Play className="h-4 w-4" />
          Start a Cooldown
        </button>
      </div>
    );
  } else {
    content = (
      <div className="space-y-4">
        {/* Cooldown cards */}
        {events.map(ev => (
          <CooldownCard
            key={ev.id}
            event={ev}
            onLogCheck={setCheckTarget}
            onLogDisposition={setDispoTarget}
          />
        ))}

        {/* Start new cooldown button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setShowStartForm(true)}
            className="px-6 py-3 rounded-xl font-medium transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] min-h-[44px] flex items-center gap-2"
            style={{ backgroundColor: colors.navy, color: colors.white }}
          >
            <Play className="h-4 w-4" />
            Start a New Cooldown
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      <Modal isOpen={showStartForm} onClose={() => setShowStartForm(false)} size="lg">
        <StartCooldownForm
          onClose={() => setShowStartForm(false)}
          onSuccess={() => refetch()}
        />
      </Modal>
      <Modal isOpen={!!checkTarget} onClose={() => setCheckTarget(null)} size="lg">
        {checkTarget && (
          <LogCoolingCheckModal
            event={checkTarget}
            onClose={() => setCheckTarget(null)}
            onSuccess={() => refetch()}
          />
        )}
      </Modal>
      <Modal isOpen={!!dispoTarget} onClose={() => setDispoTarget(null)} size="lg">
        {dispoTarget && (
          <LogDispositionModal
            event={dispoTarget}
            onClose={() => setDispoTarget(null)}
            onSuccess={() => refetch()}
          />
        )}
      </Modal>
    </>
  );
}
