/**
 * AI-FORMS-SUPER-01 — Text input with inline ghost suggestion.
 * Shows faded text hint on focus when field is empty. Tab to accept.
 */

import { useAISuggestion } from '../../hooks/useAISuggestion';

export function GhostInput({
  value,
  onChange,
  placeholder,
  fieldLabel,
  formContext = {},
  entityType = 'general',
  userRole,
  className,
  ...props
}) {
  const { suggestion, isGenerating, generate, accept, dismiss } = useAISuggestion({
    fieldLabel,
    fieldType: 'text',
    formContext,
    entityType,
    userRole,
    mode: 'ghost',
  });

  function handleKeyDown(e) {
    if (e.key === 'Tab' && suggestion && !value) {
      e.preventDefault();
      accept((text) => onChange({ target: { value: text } }));
    }
    if (e.key === 'Escape' && suggestion) dismiss();
  }

  function handleFocus() {
    if (!value && !suggestion && !isGenerating) generate();
  }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e);
          if (suggestion) dismiss();
        }}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={suggestion || placeholder}
        className={`w-full px-3 py-2 border border-[#1E2D4D]/15 rounded-xl text-sm
                    focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A] focus:border-transparent
                    ${className ?? ''}`}
        {...props}
      />
      {suggestion && !value && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#1E2D4D]/30 pointer-events-none select-none">
          Tab ↹
        </span>
      )}
      {isGenerating && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <span
            className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"
            style={{ color: '#A08C5A' }}
          />
        </span>
      )}
    </div>
  );
}
