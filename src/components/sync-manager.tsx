'use client';

import { useCallback, useEffect, useState } from 'react';
import { CloudOff, RefreshCw, Wifi } from 'lucide-react';
import { countPending, drainQueue } from '@/lib/sync-queue';

/**
 * Monte un listener online/offline global + drain la file au retour de connexion.
 * Affiche un petit badge en bas-à-droite uniquement si hors ligne ou file non vide.
 */
export function SyncManager() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      setPending(await countPending());
    } catch {
      /* IndexedDB pas dispo (ex: pendant SSR hydration) */
    }
  }, []);

  const runDrain = useCallback(async () => {
    setSyncing(true);
    try {
      await drainQueue();
    } finally {
      await refreshCount();
      setSyncing(false);
    }
  }, [refreshCount]);

  useEffect(() => {
    setOnline(navigator.onLine);
    refreshCount();

    const onOnline = () => {
      setOnline(true);
      runDrain();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Pas tick agressif : check la file toutes les 30s pour attraper les dérives.
    const t = setInterval(refreshCount, 30000);

    // Premier essai de sync au mount (cas : user recharge la page avec du pending)
    if (navigator.onLine) runDrain();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(t);
    };
  }, [refreshCount, runDrain]);

  if (online && pending === 0 && !syncing) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg"
    >
      {!online ? (
        <>
          <CloudOff className="h-4 w-4" />
          <span>Hors ligne</span>
          {pending > 0 ? (
            <span className="ml-1 rounded-full bg-alert px-2 text-xs text-ink">{pending}</span>
          ) : null}
        </>
      ) : syncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Synchronisation…</span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4" />
          <span>
            {pending} tentative{pending > 1 ? 's' : ''} à synchroniser
          </span>
          <button
            type="button"
            onClick={runDrain}
            className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20"
          >
            Réessayer
          </button>
        </>
      )}
    </div>
  );
}
