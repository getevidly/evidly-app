import { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { featureExplanations } from '../data/helpDocs';

const SEEN_KEY = 'evidly_seen_explanations';

function getSeenPages(): string[] {
  try {
    const stored = localStorage.getItem(SEEN_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function markSeen(path: string) {
  try {
    const seen = getSeenPages();
    if (!seen.includes(path)) {
      seen.push(path);
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    }
  } catch {}
}

export function PageExplanation() {
  const location = useLocation();
  const path = location.pathname;
  const explanation = featureExplanations[path];
  const [show, setShow] = useState(false);
  const [autoShown, setAutoShown] = useState(false);

  useEffect(() => {
    if (!explanation) return;
    const seen = getSeenPages();
    if (!seen.includes(path)) {
      setShow(true);
      setAutoShown(true);
      markSeen(path);
    } else {
      setShow(false);
      setAutoShown(false);
    }
  }, [path, explanation]);

  if (!explanation) return null;

  return (
    <div className="mb-4">
      {!show && (
        <button
          onClick={() => setShow(true)}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          title="What is this page?"
        >
          <Info className="h-3.5 w-3.5" />
          <span>What is this?</span>
        </button>
      )}
      {show && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg max-w-2xl" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
          <Info className="h-4 w-4 text-[#1e4d6b] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700 flex-1">{explanation}</p>
          <button
            onClick={() => setShow(false)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
