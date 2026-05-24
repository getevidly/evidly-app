/**
 * Combobox — generic type-ahead select with sections, free-text, and prefix adornments.
 * Shared primitive. Import from 'src/components/ui/Combobox'.
 */

import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { colors } from '../../lib/designSystem';

// ── Types ───────────────────────────────────────────────────

export interface ComboboxSection<T> {
  title: string;
  filter: (item: T) => boolean;
}

export interface ComboboxProps<T> {
  value: string;
  onChange: (text: string) => void;
  onSelect: (item: T | string) => void;
  items: T[];
  getItemLabel: (item: T) => string;
  getItemMeta?: (item: T) => string | undefined;
  getItemPrefix?: (item: T) => ReactNode;
  placeholder?: string;
  helper?: string;
  sections?: ComboboxSection<T>[];
  allowFreeText?: boolean;
  freeTextLabel?: (text: string) => string;
  emptyMessage?: string;
}

// ── Component ───────────────────────────────────────────────

export function Combobox<T>({
  value,
  onChange,
  onSelect,
  items,
  getItemLabel,
  getItemMeta,
  getItemPrefix,
  placeholder,
  helper,
  sections,
  allowFreeText = true,
  freeTextLabel,
  emptyMessage = 'No matches',
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter items by input text
  const query = value.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return items;
    return items.filter(item => getItemLabel(item).toLowerCase().includes(query));
  }, [items, query, getItemLabel]);

  // Build flat list of renderable entries (section headers + items + free text)
  type Entry = { type: 'section'; title: string } | { type: 'item'; item: T; flatIdx: number } | { type: 'free'; text: string; flatIdx: number };

  const { entries, selectableCount } = useMemo(() => {
    const result: Entry[] = [];
    let idx = 0;

    if (sections && sections.length > 0) {
      for (const section of sections) {
        const sectionItems = filtered.filter(section.filter);
        if (sectionItems.length === 0) continue;
        result.push({ type: 'section', title: section.title });
        for (const item of sectionItems) {
          result.push({ type: 'item', item, flatIdx: idx++ });
        }
      }
    } else {
      for (const item of filtered) {
        result.push({ type: 'item', item, flatIdx: idx++ });
      }
    }

    // Free text option at bottom
    if (allowFreeText && value.trim().length > 0) {
      result.push({ type: 'free', text: value.trim(), flatIdx: idx++ });
    }

    return { entries: result, selectableCount: idx };
  }, [filtered, sections, allowFreeText, value]);

  // Get the T item or free text at a given selectable index
  const getSelectableAt = (idx: number): Entry | undefined => {
    return entries.find(e => (e.type === 'item' || e.type === 'free') && e.flatIdx === idx);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll focused item into view
  useEffect(() => {
    if (focusIdx >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-combobox-idx="${focusIdx}"]`) as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusIdx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(prev => Math.min(prev + 1, selectableCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = getSelectableAt(focusIdx);
      if (entry?.type === 'item') {
        onSelect(entry.item);
        onChange(getItemLabel(entry.item));
        setOpen(false);
        setFocusIdx(-1);
      } else if (entry?.type === 'free') {
        onSelect(entry.text);
        setOpen(false);
        setFocusIdx(-1);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setFocusIdx(-1);
    }
  };

  const handleSelectItem = (item: T) => {
    onSelect(item);
    onChange(getItemLabel(item));
    setOpen(false);
    setFocusIdx(-1);
  };

  const handleSelectFreeText = (text: string) => {
    onSelect(text);
    setOpen(false);
    setFocusIdx(-1);
  };

  const freeLabel = freeTextLabel
    ? freeTextLabel(value.trim())
    : `+ Use as typed: "${value.trim()}"`;

  return (
    <div ref={wrapperRef} className="relative">
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setOpen(true);
            setFocusIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pr-9 px-3 py-2.5 border rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          style={{
            borderColor: colors.border,
            color: colors.textPrimary,
            backgroundColor: colors.white,
          }}
        />
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
          style={{ color: colors.textMuted }}
        />
      </div>

      {/* Helper text */}
      {helper && (
        <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
          {helper}
        </p>
      )}

      {/* Dropdown */}
      {open && entries.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 border rounded-lg overflow-hidden"
          style={{
            backgroundColor: colors.white,
            borderColor: colors.border,
            boxShadow: '0 4px 12px rgba(30,45,77,0.1)',
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {entries.map((entry, i) => {
            if (entry.type === 'section') {
              return (
                <div
                  key={`section-${i}`}
                  className="px-3 py-1.5 text-[9px] uppercase font-semibold"
                  style={{
                    color: colors.textMuted,
                    backgroundColor: '#F5F2EB',
                    letterSpacing: '0.06em',
                  }}
                >
                  {entry.title}
                </div>
              );
            }

            if (entry.type === 'item') {
              const label = getItemLabel(entry.item);
              const meta = getItemMeta?.(entry.item);
              const prefix = getItemPrefix?.(entry.item);
              const isFocused = focusIdx === entry.flatIdx;

              return (
                <div
                  key={`item-${entry.flatIdx}`}
                  data-combobox-idx={entry.flatIdx}
                  onClick={() => handleSelectItem(entry.item)}
                  onMouseEnter={() => setFocusIdx(entry.flatIdx)}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm border-b last:border-b-0"
                  style={{
                    borderColor: colors.borderLight,
                    backgroundColor: isFocused ? colors.cream : 'transparent',
                    color: colors.textPrimary,
                  }}
                >
                  {prefix}
                  <span className="flex-1 min-w-0 truncate">{label}</span>
                  {meta && (
                    <span className="text-[10px] flex-shrink-0" style={{ color: colors.textMuted }}>
                      {meta}
                    </span>
                  )}
                </div>
              );
            }

            if (entry.type === 'free') {
              const isFocused = focusIdx === entry.flatIdx;
              return (
                <div
                  key="free-text"
                  data-combobox-idx={entry.flatIdx}
                  onClick={() => handleSelectFreeText(entry.text)}
                  onMouseEnter={() => setFocusIdx(entry.flatIdx)}
                  className="px-3 py-2 cursor-pointer text-sm border-t"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: isFocused ? colors.cream : '#FDFCF9',
                    color: colors.gold,
                    fontWeight: 600,
                  }}
                >
                  {freeLabel}
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* Empty state */}
      {open && value.trim().length > 0 && filtered.length === 0 && !allowFreeText && (
        <div
          className="absolute z-50 w-full mt-1 border rounded-lg px-3 py-3 text-sm"
          style={{
            backgroundColor: colors.white,
            borderColor: colors.border,
            boxShadow: '0 4px 12px rgba(30,45,77,0.1)',
            color: colors.textMuted,
          }}
        >
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
