import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Thermometer,
  CheckSquare,
  Truck,
  Brain,
  Settings,
  BarChart3,
  X,
} from 'lucide-react';
import { locations, locationScores, getGrade } from '../data/demoData';

interface QuickItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  type: 'location' | 'page';
  score?: number;
  icon: typeof Search;
}

const pages: QuickItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', type: 'page', icon: LayoutDashboard },
  { id: 'documents', label: 'Fire Safety Docs', href: '/documents', type: 'page', icon: FileText },
  { id: 'temp-logs', label: 'Temperature Logs', href: '/temp-logs', type: 'page', icon: Thermometer },
  { id: 'checklists', label: 'Daily Checklists', href: '/checklists', type: 'page', icon: CheckSquare },
  { id: 'scoring', label: 'Compliance Score', href: '/scoring-breakdown', type: 'page', icon: ShieldCheck },
  { id: 'vendors', label: 'Vendor Management', href: '/vendors', type: 'page', icon: Truck },
  { id: 'analysis', label: 'Predictive Alerts', href: '/analysis', type: 'page', icon: Brain },
  { id: 'benchmarks', label: 'Benchmarks', href: '/benchmarks', type: 'page', icon: BarChart3 },
  { id: 'settings', label: 'Settings', href: '/settings', type: 'page', icon: Settings },
];

export function QuickSwitcher() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build location items from demo data
  const locationItems: QuickItem[] = useMemo(() =>
    locations.map(loc => ({
      id: `loc-${loc.urlId}`,
      label: loc.name,
      sublabel: loc.address,
      href: `/dashboard?location=${loc.urlId}`,
      type: 'location' as const,
      score: locationScores[loc.urlId]?.overall ?? 0,
      icon: MapPin,
    })),
  []);

  const allItems = useMemo(() => [...locationItems, ...pages], [locationItems]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(q))
    );
  }, [query, allItems]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Allow programmatic open via custom event (e.g. from TopBar search button)
  useEffect(() => {
    const handleOpen = () => { setOpen(true); setQuery(''); setSelectedIndex(0); };
    window.addEventListener('open-quick-switcher', handleOpen);
    return () => window.removeEventListener('open-quick-switcher', handleOpen);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      if (selected) selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = (item: QuickItem) => {
    navigate(item.href);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    }
  };

  if (!open) return null;

  const locationResults = filtered.filter(i => i.type === 'location');
  const pageResults = filtered.filter(i => i.type === 'page');

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Switcher panel */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <Search className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search locations, pages..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-2 ml-2">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">ESC</kbd>
            <button onClick={() => setOpen(false)} className="sm:hidden">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No results found</div>
          )}

          {locationResults.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Locations</div>
              {locationResults.map((item, i) => {
                const globalIndex = filtered.indexOf(item);
                const scoreGrade = item.score ? getGrade(item.score) : null;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`flex items-center px-4 py-2.5 cursor-pointer transition-colors ${
                      globalIndex === selectedIndex ? 'bg-[#eef4f8]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <MapPin className="h-4 w-4 mr-3 flex-shrink-0" style={{ color: '#1e4d6b' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{item.label}</div>
                      {item.sublabel && <div className="text-xs text-gray-400 truncate">{item.sublabel}</div>}
                    </div>
                    {scoreGrade && (
                      <span
                        className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: scoreGrade.hex,
                          backgroundColor: scoreGrade.hex + '18',
                          border: `1px solid ${scoreGrade.hex}40`,
                        }}
                      >
                        {item.score}
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {pageResults.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1">Pages</div>
              {pageResults.map((item) => {
                const globalIndex = filtered.indexOf(item);
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`flex items-center px-4 py-2.5 cursor-pointer transition-colors ${
                      globalIndex === selectedIndex ? 'bg-[#eef4f8]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 truncate">{item.label}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className="hidden sm:flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[9px]">&uarr;</kbd> <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[9px]">&darr;</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[9px]">Enter</kbd> Select</span>
          </div>
          <span><kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[9px]">Ctrl</kbd>+<kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[9px]">K</kbd> Toggle</span>
        </div>
      </div>
    </div>
  );
}
