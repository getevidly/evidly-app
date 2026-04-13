import { useEffect } from 'react';

/**
 * Sets document.title to "EvidLY | {title}" on mount.
 * Resets to "EvidLY" on unmount.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `EvidLY | ${title}` : 'EvidLY';
    return () => {
      document.title = 'EvidLY';
    };
  }, [title]);
}
