'use client';

import { useState } from 'react';
import { Copy, Users, X } from 'lucide-react';
import { useTpSession } from '@/lib/tp-session';

/**
 * <CollabPanel> — Panneau collaboratif pour les TPs (Phase 6).
 *
 * Permet à 2 élèves de travailler ensemble en partageant un code à 6 chiffres.
 * Le 1er crée une session, le 2nd la rejoint via le code. Synchro polling 2s.
 *
 * Affiché en flottant en bas-droite des pages TP. Repliable.
 */

export type CollabPanelProps = {
  slug: string;
  hostId: string;
};

export function CollabPanel({ slug, hostId }: CollabPanelProps) {
  const { code, state, isHost, loading, error, create, join, leave } = useTpSession();
  const [open, setOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    try {
      await create(slug, hostId, { startedAt: Date.now() });
      setOpen(true);
    } catch {
      /* error shown */
    }
  }

  async function handleJoin() {
    const c = joinCode.trim();
    if (!c) return;
    try {
      await join(c);
      setOpen(true);
    } catch {
      /* error shown */
    }
  }

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Bouton replié (pas en session)
  if (!code && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-card hover:bg-violet-700"
      >
        <Users className="h-3.5 w-3.5" />
        Inviter un binôme
      </button>
    );
  }

  // Modal de création / rejoindre (pas encore en session)
  if (!code && open) {
    return (
      <div className="fixed bottom-4 right-4 z-40 w-80 rounded-2xl bg-white p-4 shadow-card ring-1 ring-violet-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-bold text-violet-700">
            <Users className="inline h-4 w-4" /> Mode binôme
          </h3>
          <button onClick={() => setOpen(false)} className="text-ink/40 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-ink/60">
          Faites le TP à deux ! Le premier crée une session, le second la rejoint.
        </p>
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          className="mb-3 w-full rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? 'Création…' : '✨ Créer une session'}
        </button>
        <div className="border-t border-ink/10 pt-3">
          <p className="mb-1.5 text-xs text-ink/60">Ou rejoindre via code :</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="flex-1 rounded-lg border border-ink/15 px-3 py-1.5 font-mono text-sm tracking-wider focus:border-violet-500 focus:outline-none"
              maxLength={6}
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={joinCode.length !== 6 || loading}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-30"
            >
              Rejoindre
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-700">⚠ {error}</p>}
      </div>
    );
  }

  // En session
  return (
    <div className="fixed bottom-4 right-4 z-40 w-72 rounded-2xl bg-white p-4 shadow-card ring-2 ring-emerald-300">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-emerald-500" />
          Session {isHost ? '(Hôte)' : '(Invité)'}
        </span>
        <button onClick={leave} className="text-ink/40 hover:text-red-600 text-xs underline">
          Quitter
        </button>
      </div>
      <div className="mb-2 rounded-xl bg-violet-50 p-3 text-center">
        <div className="text-[10px] uppercase tracking-wider text-ink/50">Code à partager</div>
        <div className="mt-1 flex items-center justify-center gap-2">
          <span className="font-mono text-2xl font-bold tracking-widest text-violet-700">{code}</span>
          <button
            onClick={handleCopy}
            className="rounded-lg bg-violet-600 p-1.5 text-white hover:bg-violet-700"
            title="Copier"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        {copied && <p className="mt-1 text-[10px] text-emerald-700">✓ Copié</p>}
      </div>
      <p className="text-xs text-ink/60">
        {isHost
          ? `Ton binôme se connecte avec le code ci-dessus.`
          : `Tu es connecté à la session ${code}.`}
      </p>
      {state && Object.keys(state).length > 0 && (
        <p className="mt-2 text-[10px] text-ink/40">
          État synchronisé : {Object.keys(state).length} clé(s) · sync 2s
        </p>
      )}
    </div>
  );
}
