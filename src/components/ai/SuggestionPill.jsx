/**
 * AI-FORMS-SUPER-01 — Suggestion chip below textarea fields.
 * "AI suggest" trigger → suggestion pill → Apply / dismiss.
 */

import { useAISuggestion } from '../../hooks/useAISuggestion';

export function SuggestionPill({
  onAccept,
  fieldLabel,
  formContext = {},
  entityType = 'general',
  userRole,
}) {
  const { suggestion, isGenerating, isAIGenerated, generate, accept, dismiss } =
    useAISuggestion({ fieldLabel, fieldType: 'textarea', formContext, entityType, userRole });

  return (
    <div className="mt-1">
      {!suggestion && !isGenerating && !isAIGenerated && (
        <button
          type="button"
          onClick={generate}
          className="inline-flex items-center gap-1 text-xs py-1 min-h-[44px] md:min-h-0"
          style={{ color: '#A08C5A' }}
        >
          <span style={{ fontSize: '11px' }}>&#10024;</span>
          AI suggest
        </button>
      )}

      {isGenerating && (
        <div className="flex items-center gap-1.5 text-xs text-[#1E2D4D]/30 mt-1">
          <span
            className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"
            style={{ color: '#A08C5A' }}
          />
          Thinking...
        </div>
      )}

      {suggestion && !isGenerating && (
        <div
          className="flex items-start gap-2 mt-1.5 p-2.5 rounded-lg text-xs text-[#1E2D4D]/80 max-w-full"
          style={{ backgroundColor: '#FAF7F0', border: '1px solid rgba(160, 140, 90, 0.3)' }}
        >
          <span className="mt-0.5 shrink-0 text-xs" style={{ color: '#A08C5A' }}>&#10024;</span>
          <span className="flex-1 italic">{suggestion}</span>
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => accept(onAccept)}
              className="px-2 py-1 text-white rounded text-xs min-w-[44px] min-h-[44px] md:min-h-0 md:min-w-0"
              style={{ backgroundColor: '#A08C5A' }}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="px-2 py-1 text-[#1E2D4D]/30 hover:text-gray-600 rounded min-w-[44px] min-h-[44px] md:min-h-0 md:min-w-0"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {isAIGenerated && !suggestion && (
        <span className="text-xs mt-0.5 inline-block" style={{ color: '#A08C5A' }}>
          &#10024; AI assisted
        </span>
      )}
    </div>
  );
}
