import { useState, useEffect } from 'react';
import { WifiOff, Loader2, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useOffline } from '../contexts/OfflineContext';

export function OfflineBanner() {
  const { isOnline, syncStatus, pendingCount, triggerSync } = useOffline();
  const [showSynced, setShowSynced] = useState(false);
  const [prevSyncStatus, setPrevSyncStatus] = useState(syncStatus);
  const [visible, setVisible] = useState(false);

  // Detect when sync completes — show green banner briefly
  useEffect(() => {
    if (prevSyncStatus === 'syncing' && syncStatus === 'idle') {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 3000);
      setPrevSyncStatus(syncStatus);
      return () => clearTimeout(timer);
    }
    setPrevSyncStatus(syncStatus);
  }, [syncStatus, prevSyncStatus]);

  // Determine visibility
  useEffect(() => {
    const shouldShow = !isOnline || syncStatus === 'syncing' || syncStatus === 'error' || showSynced;
    setVisible(shouldShow);
  }, [isOnline, syncStatus, showSynced]);

  if (!visible) return null;

  // Determine banner config
  let bgColor = '#dc2626';
  let Icon = WifiOff;
  let message = "You're offline — changes saved locally";
  let spinning = false;
  let showAction = false;

  if (showSynced && isOnline && syncStatus === 'idle') {
    bgColor = '#16a34a';
    Icon = CheckCircle;
    message = 'All changes synced';
  } else if (syncStatus === 'syncing') {
    bgColor = '#d4af37';
    Icon = Loader2;
    message = `Syncing ${pendingCount} change${pendingCount !== 1 ? 's' : ''}...`;
    spinning = true;
  } else if (syncStatus === 'error') {
    bgColor = '#ea580c';
    Icon = AlertTriangle;
    message = 'Sync failed — will retry automatically';
    showAction = true;
  } else if (!isOnline) {
    bgColor = '#dc2626';
    Icon = WifiOff;
    message = pendingCount > 0
      ? `You're offline — ${pendingCount} change${pendingCount !== 1 ? 's' : ''} saved locally`
      : "You're offline — changes will be saved locally";
  }

  return (
    <div
      style={{
        backgroundColor: bgColor,
        transition: 'all 0.3s ease-in-out',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
      }}
      className="w-full px-4 py-2 flex items-center justify-center gap-2 text-white text-sm font-medium z-40"
    >
      <Icon size={16} className={spinning ? 'animate-spin' : ''} />
      <span>{message}</span>
      {showAction && isOnline && (
        <button
          onClick={() => triggerSync()}
          className="ml-2 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      )}
      {pendingCount > 0 && !isOnline && (
        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white/20 text-xs font-bold">
          {pendingCount}
        </span>
      )}
    </div>
  );
}
