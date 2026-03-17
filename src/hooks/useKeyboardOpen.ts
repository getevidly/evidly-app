import { useState, useEffect } from 'react';

export function useKeyboardOpen() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      setIsKeyboardOpen(viewportHeight < window.innerHeight * 0.75);
    };
    window.visualViewport?.addEventListener('resize', handler);
    return () => window.visualViewport?.removeEventListener('resize', handler);
  }, []);

  return isKeyboardOpen;
}
