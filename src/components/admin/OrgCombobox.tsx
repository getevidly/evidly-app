/**
 * OrgCombobox — Type-ahead combobox for searching existing orgs or creating new ones.
 * Used in UserProvisioning and GuidedTours Setup form.
 */
import { useState, useRef, useEffect } from 'react';

export interface OrgOption {
  id: string;
  name: string;
  isNew: boolean;
}

interface OrgComboboxProps {
  /** Pre-loaded org list from Supabase */
  orgs: { id: string; name: string }[];
  /** Currently selected org (null = nothing selected) */
  value: OrgOption | null;
  /** Called when user selects an existing org or types a new name */
  onChange: (org: OrgOption | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Optional label */
  label?: string;
  /** Style overrides for the input */
  inputStyle?: React.CSSProperties;
}

export default function OrgCombobox({
  orgs,
  value,
  onChange,
  placeholder = 'Search or create organization...',
  label,
  inputStyle: externalInputStyle,
}: OrgComboboxProps) {
  const [query, setQuery] = useState(value?.name || '');
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync query when external value changes
  useEffect(() => {
    setQuery(value?.name || '');
  }, [value?.id, value?.name]);

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

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? orgs.filter(o => o.name.toLowerCase().includes(trimmed))
    : orgs;

  const exactMatch = orgs.some(o => o.name.toLowerCase() === trimmed);
  const showCreateOption = trimmed.length > 0 && !exactMatch;

  // Total items in dropdown
  const totalItems = filtered.length + (showCreateOption ? 1 : 0);

  const selectOrg = (org: { id: string; name: string }) => {
    const option: OrgOption = { id: org.id, name: org.name, isNew: false };
    onChange(option);
    setQuery(org.name);
    setOpen(false);
    setFocusIdx(-1);
  };

  const createNew = () => {
    const name = query.trim();
    if (!name) return;
    const option: OrgOption = { id: '', name, isNew: true };
    onChange(option);
    setOpen(false);
    setFocusIdx(-1);
  };

  const clear = () => {
    setQuery('');
    onChange(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      e.preventDefault();
      return;
    }

    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(prev => Math.min(prev + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusIdx >= 0 && focusIdx < filtered.length) {
        selectOrg(filtered[focusIdx]);
      } else if (focusIdx === filtered.length && showCreateOption) {
        createNew();
      } else if (showCreateOption && totalItems === 1) {
        createNew();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setFocusIdx(-1);
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusIdx >= 0 && listRef.current) {
      const el = listRef.current.children[focusIdx] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusIdx]);

  const baseInputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB',
    borderRadius: 8, fontSize: 13, color: '#1E2D4D', background: '#fff',
    outline: 'none', ...externalInputStyle,
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {label && (
        <label style={{ fontSize: 11, color: '#6B7F96', display: 'block', marginBottom: 4 }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
            setFocusIdx(-1);
            // If they clear the input, clear the selection
            if (!e.target.value.trim()) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={baseInputStyle}
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9CA3AF', fontSize: 16, lineHeight: 1, padding: 0,
            }}
          >
            {'\u00D7'}
          </button>
        )}
      </div>

      {open && totalItems > 0 && (
        <div
          ref={listRef}
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            marginTop: 4, background: '#fff', border: '1px solid #D1D5DB',
            borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxHeight: 240, overflowY: 'auto', zIndex: 50,
          }}
        >
          {filtered.map((org, i) => (
            <div
              key={org.id}
              onClick={() => selectOrg(org)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                color: '#1E2D4D',
                background: focusIdx === i ? '#F3F4F6' : (value?.id === org.id ? '#FAF7F2' : 'transparent'),
              }}
              onMouseEnter={() => setFocusIdx(i)}
            >
              {org.name}
              {value?.id === org.id && (
                <span style={{ marginLeft: 8, fontSize: 10, color: '#A08C5A', fontWeight: 600 }}>Selected</span>
              )}
            </div>
          ))}
          {showCreateOption && (
            <div
              onClick={createNew}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                color: '#A08C5A', fontWeight: 600,
                background: focusIdx === filtered.length ? '#FAF7F2' : 'transparent',
                borderTop: filtered.length > 0 ? '1px solid #E5E7EB' : 'none',
              }}
              onMouseEnter={() => setFocusIdx(filtered.length)}
            >
              + Create "{query.trim()}"
            </div>
          )}
        </div>
      )}

      {/* Status indicator */}
      {value && (
        <div style={{ marginTop: 4, fontSize: 10 }}>
          {value.isNew ? (
            <span style={{ color: '#D97706', fontWeight: 600 }}>New org — will be created on submit</span>
          ) : (
            <span style={{ color: '#059669', fontWeight: 600 }}>Linked to existing org</span>
          )}
        </div>
      )}
    </div>
  );
}
