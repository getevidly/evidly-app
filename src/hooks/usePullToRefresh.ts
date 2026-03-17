import { useRef, useCallback, useState } from 'react';

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const startY = useRef(0);
  const isPulling = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(async (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - startY.current;
    if (deltaY > 80 && window.scrollY === 0 && !isPulling.current) {
      isPulling.current = true;
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
      isPulling.current = false;
    }
  }, [onRefresh]);

  return { onTouchStart, onTouchEnd, refreshing };
}
