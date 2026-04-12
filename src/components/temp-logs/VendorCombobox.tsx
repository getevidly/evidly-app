// ---------------------------------------------------------------------------
// VendorCombobox — Searchable vendor dropdown for Receiving Temperature logs.
// ---------------------------------------------------------------------------
// - Type-to-filter across seed vendors + custom vendors
// - Custom vendors appear at the top, sorted by most recently used
// - "Add Custom Vendor" option at the bottom
// - Saves custom vendors to Supabase (location_custom_vendors) in live mode
// - In demo mode, custom vendors persist in sessionStorage for the session
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect } from 'react';
import { Search, Plus, X, ChevronDown } from 'lucide-react';
import { SEED_VENDOR_NAMES, findSeedVendor, type VendorCategory } from '../../data/receivingVendors';
import { useDemo } from '../../contexts/DemoContext';
import { useCustomVendors } from '../../hooks/useCustomVendors';

interface Props {
  value: string;
  onChange: (vendorName: string) => void;
  locationId?: string;
  className?: string;
}

const CATEGORY_ORDER: VendorCategory[] = ['broadline', 'produce', 'dairy', 'beverage', 'protein'];
const CATEGORY_LABELS: Record<VendorCategory, string> = {
  broadline: 'Broadline Distributors',
  produce: 'Produce',
  dairy: 'Dairy',
  beverage: 'Beverage',
  protein: 'Protein',
};

export function VendorCombobox({ value, onChange, locationId, className }: Props) {
  const { isDemoMode } = useDemo();
  const { customVendors, saveCustomVendor, updateLastUsed } = useCustomVendors(locationId, isDemoMode);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowAddForm(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Build the display list
  const lowerSearch = search.toLowerCase();

  // Custom vendors first (sorted by most recently used — already in order)
  const filteredCustom = customVendors.filter(v =>
    v.name.toLowerCase().includes(lowerSearch)
  );

  // Seed vendors grouped by category
  const filteredSeedByCategory = CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      vendors: SEED_VENDOR_NAMES
        .filter(name => {
          const entry = findSeedVendor(name);
          return entry?.category === cat && name.toLowerCase().includes(lowerSearch);
        }),
    }))
    .filter(group => group.vendors.length > 0);

  const hasResults = filteredCustom.length > 0 || filteredSeedByCategory.length > 0;

  const handleSelect = (name: string) => {
    onChange(name);
    updateLastUsed(name);
    setIsOpen(false);
    setSearch('');
    setShowAddForm(false);
  };

  const handleAddCustom = () => {
    const trimmed = newVendorName.trim();
    if (!trimmed) return;
    // Don't add if it already exists in seed or custom
    const exists = SEED_VENDOR_NAMES.includes(trimmed) || customVendors.some(v => v.name === trimmed);
    if (exists) {
      handleSelect(trimmed);
      setNewVendorName('');
      return;
    }
    saveCustomVendor(trimmed);
    onChange(trimmed);
    setNewVendorName('');
    setShowAddForm(false);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full flex items-center justify-between px-4 py-3 border border-[#1E2D4D]/15 rounded-lg bg-white text-left focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37] hover:border-gray-400 transition-colors"
      >
        <span className={value ? 'text-gray-900' : 'text-[#1E2D4D]/30'}>
          {value || 'Select vendor...'}
        </span>
        <ChevronDown className={`h-4 w-4 text-[#1E2D4D]/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-white border border-[#1E2D4D]/10 rounded-xl shadow-lg overflow-hidden"
          style={{ maxHeight: '340px' }}
        >
          {/* Search input */}
          <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1E2D4D]/30" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendors..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-[#1E2D4D]/10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37] focus:border-transparent"
                onKeyDown={e => {
                  if (e.key === 'Escape') { setIsOpen(false); setSearch(''); }
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#1E2D4D]/30 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable list */}
          <div className="overflow-y-auto" style={{ maxHeight: '260px' }}>
            {/* Custom vendors section */}
            {filteredCustom.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1E2D4D]/30 bg-[#FAF7F0] border-b border-gray-100">
                  Recent / Custom
                </div>
                {filteredCustom.map(v => (
                  <button
                    key={`custom-${v.name}`}
                    type="button"
                    onClick={() => handleSelect(v.name)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#eef4f8] transition-colors flex items-center justify-between ${
                      value === v.name ? 'bg-[#eef4f8] font-semibold text-[#1E2D4D]' : 'text-[#1E2D4D]/80'
                    }`}
                  >
                    {v.name}
                    {value === v.name && <span className="text-[#1E2D4D] text-xs">&#10003;</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Seed vendors by category */}
            {filteredSeedByCategory.map(group => (
              <div key={group.category}>
                <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1E2D4D]/30 bg-[#FAF7F0] border-b border-gray-100">
                  {group.label}
                </div>
                {group.vendors.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelect(name)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#eef4f8] transition-colors flex items-center justify-between ${
                      value === name ? 'bg-[#eef4f8] font-semibold text-[#1E2D4D]' : 'text-[#1E2D4D]/80'
                    }`}
                  >
                    {name}
                    {value === name && <span className="text-[#1E2D4D] text-xs">&#10003;</span>}
                  </button>
                ))}
              </div>
            ))}

            {/* No results */}
            {!hasResults && search && (
              <div className="px-4 py-6 text-center text-sm text-[#1E2D4D]/50">
                No vendors match "{search}"
              </div>
            )}
          </div>

          {/* Add Custom Vendor — always at bottom */}
          <div className="sticky bottom-0 bg-white border-t border-[#1E2D4D]/10">
            {showAddForm ? (
              <div className="p-2 flex items-center gap-2">
                <input
                  type="text"
                  value={newVendorName}
                  onChange={e => setNewVendorName(e.target.value)}
                  placeholder="Enter vendor name..."
                  className="flex-1 px-3 py-2 text-sm border border-[#1E2D4D]/15 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus:ring-[#d4af37]"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddCustom(); }
                    if (e.key === 'Escape') { setShowAddForm(false); setNewVendorName(''); }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCustom}
                  disabled={!newVendorName.trim()}
                  className="px-3 py-2 text-sm font-semibold text-white bg-[#1E2D4D] rounded-lg hover:bg-[#162340] transition-colors disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setNewVendorName(''); }}
                  className="p-2 text-[#1E2D4D]/30 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-[#1E2D4D] hover:bg-[#eef4f8] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Custom Vendor
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
