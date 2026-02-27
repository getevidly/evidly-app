import { useEffect, useState, useCallback } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { DemoUpgradePrompt } from './DemoUpgradePrompt';

// Words that indicate a write/destructive action
const WRITE_WORDS =
  /\b(save|create|add|delete|remove|edit|update|upload|download|export|print|invite|submit|send|assign|approve|reject|archive|restore|import|generate|schedule|complete|mark|confirm|apply|publish|transfer|revoke|reset|enable|disable|connect|disconnect|start|stop|run|execute|deploy|activate|deactivate|unlink|merge|split|clone|duplicate|checkout|purchase|subscribe|upgrade|renew|cancel subscription|pay|dismiss|acknowledge|close case|resolve|escalate|flag|unflag|sign|countersign|enroll|unenroll|register|unregister|log temp|record|new)\b/i;

// Words/patterns that indicate safe navigation/view actions — checked FIRST
const SAFE_WORDS =
  /\b(continue demo|close|back|cancel|view|filter|search|sort|collapse|expand|toggle|show|hide|select|clear|copy|previous|next|go to|navigate|open|learn more|details|see all|see more|more info|dismiss|got it|ok|okay|yes|no|retry|refresh|reload|try again)\b/i;

// Always-safe class patterns (navigation, tabs, pagination, accordion)
const SAFE_CLASSES =
  /\b(tab|tabs|pagination|paginate|breadcrumb|nav-|accordion|carousel|slider|toggle-view|view-mode|sort-btn|filter-btn|switcher)\b/i;

export function DemoButtonGuard() {
  const { isDemoMode, presenterMode } = useDemo();
  const { session, loading: authLoading } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeAction, setUpgradeAction] = useState('');

  const handleClose = useCallback(() => setShowUpgrade(false), []);

  useEffect(() => {
    // Only active in demo mode, not presenter mode, not authenticated
    if (!isDemoMode || presenterMode || authLoading || session?.user) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Find the closest button or anchor acting as a button
      const btn = target.closest<HTMLElement>(
        'button, [role="button"], a[role="button"], input[type="submit"], input[type="button"]'
      );
      if (!btn) return;

      // Skip elements with data-demo-allow
      if (btn.hasAttribute('data-demo-allow') || btn.closest('[data-demo-allow]')) return;

      // Skip the DemoUpgradePrompt's own buttons
      if (btn.closest('[class*="z-[99999]"]')) return;

      // Skip sidebar, topbar, mobile tab bar navigation
      if (btn.closest('[data-sidebar]') || btn.closest('[data-topbar]') || btn.closest('[data-mobiletab]') || btn.closest('nav')) return;

      // Get the visible text of the button
      const text = (btn.textContent || '').trim();

      // type="submit" is always a write action
      const isSubmit =
        btn.tagName === 'INPUT'
          ? (btn as HTMLInputElement).type === 'submit'
          : (btn as HTMLButtonElement).type === 'submit';

      // Check safe patterns first — these always pass through
      if (!isSubmit) {
        if (SAFE_WORDS.test(text)) return;
        if (SAFE_CLASSES.test(btn.className)) return;

        // Icon-only buttons with no text (likely close/toggle buttons) — let through
        if (text.length === 0 || text.length <= 2) return;

        // Buttons that only contain a lucide icon (SVG) — let through
        if (btn.querySelector('svg') && text.replace(/\s/g, '').length <= 2) return;
      }

      // Check if the button text contains a write-action word OR is a submit button
      if (isSubmit || WRITE_WORDS.test(text)) {
        e.preventDefault();
        e.stopImmediatePropagation();

        // Extract a clean action name from the button text
        const actionName = text.length > 40 ? text.slice(0, 40) + '...' : text || 'This action';
        setUpgradeAction(actionName);
        setShowUpgrade(true);
      }
    }

    // Capture phase fires BEFORE React synthetic event handlers
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [isDemoMode, presenterMode, session, authLoading]);

  // Auto-dismiss if demo mode is turned off
  useEffect(() => {
    if (!isDemoMode && showUpgrade) {
      setShowUpgrade(false);
    }
  }, [isDemoMode, showUpgrade]);

  if (!showUpgrade) return null;

  return (
    <DemoUpgradePrompt
      action={upgradeAction}
      featureName=""
      onClose={handleClose}
    />
  );
}
