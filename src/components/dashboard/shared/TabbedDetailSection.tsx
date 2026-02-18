/**
 * DASHBOARD-8 v2 — Tabbed Detail Section
 *
 * Underline-style tabs for the bottom section of each dashboard.
 * Active tab: navy border-bottom + bold text.
 * Inactive: muted text.
 * Content switches on tab click; state is local (not URL).
 */

import { useState } from 'react';
import { FONT, BODY_TEXT, MUTED } from './constants';

export interface TabDef {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabbedDetailSectionProps {
  tabs: TabDef[];
  defaultTab?: string;
}

const ACTIVE_BORDER = '#1e4d6b';

export function TabbedDetailSection({ tabs, defaultTab }: TabbedDetailSectionProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');
  const activeContent = tabs.find(t => t.id === activeTab)?.content;

  if (tabs.length === 0) return null;

  return (
    <div style={FONT}>
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: '#e2e8f0' }}>
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer"
              style={{
                color: isActive ? BODY_TEXT : MUTED,
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {tab.label}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{ backgroundColor: ACTIVE_BORDER }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="pt-4">
        {activeContent}
      </div>
    </div>
  );
}
