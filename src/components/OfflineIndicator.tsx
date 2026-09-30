import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, Bookmark, Users, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  onNavigate?: (route: string) => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onNavigate }) => {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (showReconnected && isOnline) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white shadow-xl text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-300">
        <Wifi className="w-4 h-4 text-emerald-100" />
        <span>You are back online! Directory & posts synchronized.</span>
      </div>
    );
  }

  if (isOnline) {
    return null;
  }

  return (
    <aside aria-label="Offline Mode Notification" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto sm:max-w-md z-50 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 text-white border border-amber-500/50 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <WifiOff className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-black tracking-wide text-amber-400 flex items-center gap-1.5">
            <span>Offline Mode Active</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <p className="text-[11px] text-slate-300">
            Viewing cached alumni directory & saved posts.
          </p>
        </div>
      </div>

      {onNavigate && (
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => onNavigate('saved-posts')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-slate-200 transition-colors cursor-pointer"
          >
            <Bookmark className="w-3 h-3 text-amber-400" />
            <span>Saved Posts</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('directory')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-[11px] font-bold text-white transition-colors cursor-pointer"
          >
            <Users className="w-3 h-3" />
            <span>Directory</span>
          </button>
        </div>
      )}
    </aside>
  );
};
