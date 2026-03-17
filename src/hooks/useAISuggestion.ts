/**
 * AI-FORMS-SUPER-01 — Shared hook for context-aware AI suggestions on form fields.
 *
 * Wraps generateFieldText() with state management, generation lifecycle,
 * and haptic feedback. Used by GhostInput, SuggestionPill, TapToFillButton.
 */

import { useState, useCallback } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { generateFieldText } from '../lib/aiTextAssist';

export type AIEntityType =
  | 'temperature' | 'checklist' | 'service' | 'vendor' | 'haccp'
  | 'corrective_action' | 'incident' | 'calendar' | 'training'
  | 'document' | 'onboarding' | 'location' | 'general';

interface UseAISuggestionOptions {
  fieldLabel: string;
  fieldType: 'text' | 'textarea';
  formContext: Record<string, any>;
  entityType: AIEntityType;
  userRole?: string;
  mode?: 'ghost' | 'full';
}

interface UseAISuggestionReturn {
  suggestion: string | null;
  isGenerating: boolean;
  isAIGenerated: boolean;
  generate: () => Promise<void>;
  accept: (onAccept: (text: string) => void) => void;
  dismiss: () => void;
  clearAIFlag: () => void;
}

export function useAISuggestion(options: UseAISuggestionOptions): UseAISuggestionReturn {
  const { fieldLabel, formContext, entityType, userRole, mode = 'full' } = options;
  const { isDemoMode } = useDemo();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAIGenerated, setIsAIGenerated] = useState(false);

  const generate = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const context = { ...formContext, entityType, userRole, mode };
      const text = await generateFieldText(fieldLabel, context, isDemoMode);
      setSuggestion(text);
    } catch {
      setSuggestion(null);
    } finally {
      setIsGenerating(false);
    }
  }, [fieldLabel, formContext, entityType, userRole, mode, isGenerating, isDemoMode]);

  const accept = useCallback((onAccept: (text: string) => void) => {
    if (suggestion) {
      onAccept(suggestion);
      setIsAIGenerated(true);
      setSuggestion(null);
      navigator.vibrate?.(30);
    }
  }, [suggestion]);

  const dismiss = useCallback(() => {
    setSuggestion(null);
  }, []);

  const clearAIFlag = useCallback(() => {
    setIsAIGenerated(false);
  }, []);

  return { suggestion, isGenerating, isAIGenerated, generate, accept, dismiss, clearAIFlag };
}
