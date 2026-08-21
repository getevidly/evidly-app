/**
 * AI-FORMS-SUPER-01 — Mobile-only full-width "AI suggest" button.
 * Hidden on md+ breakpoints. Tap generates + fills in one action.
 */

import { useState } from 'react';
import { useAISuggestion } from '../../hooks/useAISuggestion';

export function TapToFillButton({
  onAccept,
  fieldLabel,
  formContext = {},
  entityType = 'general',
  userRole,
}) {
  const { suggestion, isGenerating, generate, accept } = useAISuggestion({
    fieldLabel,
    fieldType: 'text',
    formContext,
    entityType,
    userRole,
  });
  const [applied, setApplied] = useState(false);

  async function handleTap() {
    if (suggestion) {
      accept(onAccept);
      setApplied(true);
      return;
    }
    await generate();
  }

  // After generation completes, auto-accept
  if (suggestion && !applied) {
    accept(onAccept);
    setApplied(true);
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      disabled={isGenerating}
      className="md:hidden w-full mt-1 py-3 flex items-center justify-center gap-2
                 rounded-lg text-sm active:scale-95 transition-transform disabled:opacity-50"
      style={{ border: '1px solid rgba(178,74,46, 0.4)', color: '#B24A2E' }}
    >
      {isGenerating ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <span className="text-[13px]">&#10024;</span>
          AI suggest
        </>
      )}
    </button>
  );
}
