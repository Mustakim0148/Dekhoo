import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600/95 backdrop-blur-md px-4 py-2.5 text-xs sm:text-sm font-medium text-white shadow-2xl border border-amber-400/40 animate-pulse"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline Mode — Live streaming requires an active internet connection.</span>
    </div>
  );
};
