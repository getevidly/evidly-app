import { useState, useEffect } from 'react';
import { LOADING_MESSAGES } from '../../config/emotionalCopy';

export function SkeletonBlock({ className }) {
  return <div className={`animate-pulse bg-[#1E2D4D]/8 rounded-lg ${className}`} />;
}

export function PageSkeleton({ role }) {
  const messages = (role && LOADING_MESSAGES[role]) || LOADING_MESSAGES.owner_operator;
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div className="space-y-4 p-4">
      {role && (
        <p className="text-xs text-[#1E2D4D]/50 text-center animate-pulse">
          {messages[msgIndex]}
        </p>
      )}
      <SkeletonBlock className="h-20 w-full" />
      <SkeletonBlock className="h-20 w-full" />
      <SkeletonBlock className="h-20 w-full" />
    </div>
  );
}
