"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { getOfflineQueue } from "@/lib/offlineStorage";

export function OfflineIndicator({ onSync }: { onSync?: () => void }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const checkQueue = async () => {
      const queue = await getOfflineQueue();
      setQueuedCount(queue.length);
    };
    checkQueue();

    const handleOnline = () => {
      setIsOnline(true);
      checkQueue();
      if (onSync) onSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkQueue();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const interval = setInterval(checkQueue, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [onSync]);

  if (isOnline && queuedCount === 0) {
    return null;
  }

  return (
    <div
      className={`w-full py-2 px-4 text-xs font-semibold flex items-center justify-between transition-colors ${
        !isOnline
          ? "bg-amber-500 text-amber-950 border-b border-amber-600 shadow-sm"
          : "bg-blue-600 text-white border-b border-blue-700 shadow-sm"
      }`}
    >
      <div className="flex items-center space-x-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 animate-pulse text-amber-950" />
            <span>
              <strong>Dead-Zone Offline Active:</strong> Crawlspace / Basement mode. Readings saving to device IndexedDB.
            </span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4 text-white" />
            <span>Connection restored. {queuedCount} offline turns pending cloud synchronization.</span>
          </>
        )}
      </div>

      {queuedCount > 0 && isOnline && (
        <button
          onClick={async () => {
            setIsSyncing(true);
            if (onSync) await onSync();
            setIsSyncing(false);
          }}
          disabled={isSyncing}
          className="flex items-center space-x-1 bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded text-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          <span>Sync Now ({queuedCount})</span>
        </button>
      )}
    </div>
  );
}
