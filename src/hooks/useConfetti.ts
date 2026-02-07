import { useCallback, useRef } from 'react';

export function useConfetti() {
  const hasTriggeredRef = useRef<Set<string>>(new Set());

  const createConfettiPiece = (color: string, startX: number, startY: number) => {
    const piece = document.createElement('div');
    piece.style.position = 'fixed';
    piece.style.width = '10px';
    piece.style.height = '10px';
    piece.style.backgroundColor = color;
    piece.style.left = `${startX}px`;
    piece.style.top = `${startY}px`;
    piece.style.pointerEvents = 'none';
    piece.style.zIndex = '9999';
    piece.style.borderRadius = '2px';

    document.body.appendChild(piece);

    const endX = startX + (Math.random() - 0.5) * 400;
    const endY = window.innerHeight + 100;
    const rotation = Math.random() * 720 - 360;

    piece.animate([
      {
        transform: 'translate(0, 0) rotate(0deg)',
        opacity: 1
      },
      {
        transform: `translate(${endX - startX}px, ${endY - startY}px) rotate(${rotation}deg)`,
        opacity: 0
      }
    ], {
      duration: 3000,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    });

    setTimeout(() => {
      piece.remove();
    }, 3000);
  };

  const triggerConfetti = useCallback((triggerKey?: string) => {
    if (triggerKey && hasTriggeredRef.current.has(triggerKey)) {
      return;
    }

    if (triggerKey) {
      hasTriggeredRef.current.add(triggerKey);
    }

    const colors = ['#1e4d6b', '#d4af37'];
    const pieceCount = 50;

    for (let i = 0; i < pieceCount; i++) {
      const color = colors[i % colors.length];
      const startX = Math.random() * window.innerWidth;
      const startY = -20;

      setTimeout(() => {
        createConfettiPiece(color, startX, startY);
      }, Math.random() * 200);
    }
  }, []);

  const resetTriggers = useCallback(() => {
    hasTriggeredRef.current.clear();
  }, []);

  return { triggerConfetti, resetTriggers };
}
