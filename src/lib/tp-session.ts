'use client';

import { useEffect, useRef, useState } from 'react';
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:3010';

/**
 * Hook de session collaborative pour TPs (Phase 6).
 *
 * 2 élèves peuvent travailler ensemble sur un TP en partageant un code à
 * 6 chiffres. Synchro par polling REST 2s sur le gateway.
 *
 * Usage typique :
 *   const session = useTpSession();
 *
 *   // Élève 1 — créer une session
 *   const code = await session.create('molecule-eau-4eme', 'user-id', { step: 'intro' });
 *
 *   // Élève 2 — rejoindre via code
 *   await session.join('123456');
 *
 *   // Mettre à jour l'état partagé
 *   session.update({ step: 'explore' });
 */

export type SessionState = Record<string, unknown>;

export type TpSession = {
  code: string | null;
  state: SessionState | null;
  isHost: boolean;
  error: string | null;
  loading: boolean;
  /** Crée une nouvelle session, retourne le code à partager. */
  create: (slug: string, hostId: string, initialState?: SessionState) => Promise<string>;
  /** Rejoint une session existante via code. */
  join: (code: string) => Promise<void>;
  /** Met à jour l'état partagé (déclenche le polling pour les peers). */
  update: (patch: SessionState) => Promise<void>;
  /** Quitte la session (arrête le polling). */
  leave: () => void;
};

export function useTpSession(): TpSession {
  const [code, setCode] = useState<string | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<number | null>(null);

  function startPolling(c: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`${GATEWAY_URL}/sessions/${c}`);
        if (!res.ok) return;
        const data = await res.json();
        setState(data.state ?? null);
      } catch {
        /* network blip */
      }
    }, 2000);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function create(slug: string, hostId: string, initialState: SessionState = {}) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${GATEWAY_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, hostId, state: initialState }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: { code: string; state: SessionState } = await res.json();
      setCode(data.code);
      setState(data.state);
      setIsHost(true);
      startPolling(data.code);
      return data.code;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function join(c: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${GATEWAY_URL}/sessions/${c}`);
      if (!res.ok) throw new Error(`Session ${c} introuvable`);
      const data: { code: string; state: SessionState } = await res.json();
      setCode(data.code);
      setState(data.state);
      setIsHost(false);
      startPolling(data.code);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function update(patch: SessionState) {
    if (!code) return;
    try {
      await fetch(`${GATEWAY_URL}/sessions/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: patch }),
      });
      setState((prev) => ({ ...(prev ?? {}), ...patch }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function leave() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setCode(null);
    setState(null);
    setIsHost(false);
  }

  return { code, state, isHost, error, loading, create, join, update, leave };
}
