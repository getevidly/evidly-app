/**
 * AI-ASSIST-1 — Universal AI Text Assistance Button
 *
 * Place next to any textarea label. Generates context-aware text
 * using filled form fields. Demo mode uses local templates;
 * production calls Claude Sonnet via edge function.
 */

import { useState, useCallback } from 'react';
import { useDemo } from '../../contexts/DemoContext';
import { generateFieldText } from '../../lib/aiTextAssist';

interface AIAssistProps {
  /** Human-readable label for the field (e.g. "Description", "Root Cause") */
  fieldLabel: string;
  /** All other form values for context-aware generation */
  context: Record<string, any>;
  /** Current value of the field — if non-empty, shows Replace/Append choice */
  currentValue?: string;
  /** Called with the generated text */
  onGenerated: (text: string) => void;
}

export function AIAssistButton({ fieldLabel, context, currentValue, onGenerated }: AIAssistProps) {
  const { isDemoMode } = useDemo();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showChoice, setShowChoice] = useState(false);

  const generate = useCallback(async (mode: 'replace' | 'append') => {
    setLoading(true);
    setError(false);
    setShowChoice(false);
    try {
      const text = await generateFieldText(fieldLabel, context, isDemoMode);
      if (mode === 'append' && currentValue) {
        onGenerated(currentValue.trimEnd() + '\n' + text);
      } else {
        onGenerated(text);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [fieldLabel, context, isDemoMode, currentValue, onGenerated]);

  const handleClick = useCallback(() => {
    if (currentValue && currentValue.trim().length > 0) {
      setShowChoice(true);
    } else {
      generate('replace');
    }
  }, [currentValue, generate]);

  if (error) {
    return (
      <span className="text-[11px] text-gray-400 italic">AI unavailable</span>
    );
  }

  return (
    <span className="relative inline-flex items-center">
      {loading ? (
        <span
          className="text-xs flex items-center gap-1 px-2 py-1 min-h-[28px]"
          style={{ color: '#A08C5A' }}
        >
          <span className="animate-spin inline-block w-3 h-3 border border-current border-t-transparent rounded-full" />
          Drafting...
        </span>
      ) : showChoice ? (
        <span className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => generate('replace')}
            className="px-2 py-1 rounded hover:bg-gray-100 transition min-h-[28px]"
            style={{ color: '#A08C5A' }}
          >
            Replace
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => generate('append')}
            className="px-2 py-1 rounded hover:bg-gray-100 transition min-h-[28px]"
            style={{ color: '#A08C5A' }}
          >
            Append
          </button>
          <button
            type="button"
            onClick={() => setShowChoice(false)}
            className="px-1 py-1 text-gray-400 hover:text-gray-600 min-h-[28px]"
          >
            &times;
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition min-h-[28px]"
          style={{ color: '#A08C5A' }}
          title={`AI will draft ${fieldLabel.toLowerCase()} based on the information you've entered`}
        >
          &#10024; AI Assist
        </button>
      )}
    </span>
  );
}

/** Indicator shown below a field after AI generation */
export function AIGeneratedIndicator() {
  return (
    <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
      &#10024; AI-generated &mdash; review and edit as needed
    </p>
  );
}
