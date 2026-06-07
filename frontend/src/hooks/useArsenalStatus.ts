import { useCallback, useEffect, useState } from 'react';
import { fetchArsenalStatus } from '../lib/api';
import { loadStatusCache, saveStatusCache } from '../lib/offlineCache';
import type { ArsenalStatusResponse } from '../types';

export function useArsenalStatus(enabled: boolean) {
  const [status, setStatus] = useState<ArsenalStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchArsenalStatus();
      setStatus(data);
      setCachedAt(null);
      await saveStatusCache(data);
      setOffline(false);
    } catch (err) {
      const cached = await loadStatusCache();
      if (cached) {
        setStatus(cached);
        setCachedAt(cached.scannedAt);
        setOffline(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load status');
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    const goOffline = async () => {
      setOffline(true);
      const cached = await loadStatusCache();
      if (cached && !status) {
        setStatus(cached);
        setCachedAt(cached.scannedAt);
      }
    };
    const goOnline = () => {
      setOffline(false);
      if (enabled) refresh();
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [enabled, refresh, status]);

  return { status, loading, error, offline, cachedAt, refresh };
}
