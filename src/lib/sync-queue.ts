import type { AttemptDto } from '@senlabvisa/shared-types';
import { api } from '@/lib/api';
import {
  generateLocalAttemptId,
  getDb,
  type PendingComplete,
  type PendingOp,
  type PendingStart,
} from '@/lib/offline-db';

/**
 * Tente un POST /attempts/start. Si la requête réussit → retourne l'AttemptDto serveur.
 * Sinon (offline ou erreur réseau) → queue un PendingStart, retourne un AttemptDto "optimiste"
 * basé sur un ID local. Le serverAttemptId sera renseigné plus tard par drainQueue().
 */
export async function startAttemptOfflineFirst(
  token: string,
  simulationId: string,
): Promise<{ attempt: AttemptDto; local: boolean; localId: string }> {
  try {
    if (navigator.onLine) {
      const attempt = await api.attempts.start(token, { simulationId });
      return { attempt, local: false, localId: attempt.id };
    }
  } catch {
    // falls through to offline path
  }

  const localAttemptId = generateLocalAttemptId();
  const pending: PendingStart = {
    kind: 'start',
    localAttemptId,
    simulationId,
    token,
    createdAt: Date.now(),
    status: 'pending',
  };
  await getDb().queue.add(pending);

  const optimistic: AttemptDto = {
    id: localAttemptId,
    studentId: 'pending',
    simulationId,
    status: 'started',
    score: null,
    dataJson: {},
    createdAt: new Date().toISOString(),
    syncedAt: null,
  };
  return { attempt: optimistic, local: true, localId: localAttemptId };
}

/**
 * Tente POST /attempts/:id/complete. Si offline ou attempt encore local,
 * queue un PendingComplete référencant le même localAttemptId.
 */
export async function completeAttemptOfflineFirst(
  token: string,
  attemptIdOrLocal: string,
  isLocal: boolean,
  score: number,
  dataJson: Record<string, unknown>,
): Promise<{ attempt: AttemptDto; local: boolean }> {
  if (!isLocal && navigator.onLine) {
    try {
      const attempt = await api.attempts.complete(token, attemptIdOrLocal, { score, dataJson });
      return { attempt, local: false };
    } catch {
      // fall through, queue it
    }
  }

  const pending: PendingComplete = {
    kind: 'complete',
    localAttemptId: attemptIdOrLocal,
    score,
    dataJson,
    token,
    createdAt: Date.now(),
    status: 'pending',
  };
  await getDb().queue.add(pending);

  const optimistic: AttemptDto = {
    id: attemptIdOrLocal,
    studentId: 'pending',
    simulationId: 'pending',
    status: 'completed',
    score,
    dataJson,
    createdAt: new Date().toISOString(),
    syncedAt: null,
  };
  return { attempt: optimistic, local: true };
}

/**
 * Vide la file locale en appelant le serveur. Idempotent : une entrée marquée
 * `synced` est ignorée. Résout le mapping localAttemptId → serverAttemptId pour
 * que les PendingComplete qui suivent puissent poster sur le bon ID serveur.
 */
export async function drainQueue(): Promise<{ synced: number; failed: number }> {
  const db = getDb();
  const items = await db.queue.where('status').equals('pending').sortBy('createdAt');
  let synced = 0;
  let failed = 0;

  // localAttemptId → serverAttemptId mapping built au fur et à mesure
  const mapping = new Map<string, string>();
  const preMapped = await db.queue.where('status').equals('synced').toArray();
  for (const it of preMapped) {
    if (it.kind === 'start' && it.serverAttemptId) {
      mapping.set(it.localAttemptId, it.serverAttemptId);
    }
  }

  for (const item of items) {
    try {
      if (item.kind === 'start') {
        const res = await api.attempts.start(item.token, { simulationId: item.simulationId });
        mapping.set(item.localAttemptId, res.id);
        await db.queue.update(
          item.id!,
          { status: 'synced', serverAttemptId: res.id } as Partial<PendingStart>,
        );
        synced++;
      } else {
        const serverId = mapping.get(item.localAttemptId);
        if (!serverId) {
          // start n'a pas encore été synced (probablement prochaine itération)
          failed++;
          continue;
        }
        await api.attempts.complete(item.token, serverId, {
          score: item.score,
          dataJson: item.dataJson,
        });
        await db.queue.update(item.id!, { status: 'synced' });
        synced++;
      }
    } catch (e) {
      await db.queue.update(item.id!, {
        status: 'error',
        lastError: e instanceof Error ? e.message : String(e),
      });
      failed++;
    }
  }
  return { synced, failed };
}

export async function countPending(): Promise<number> {
  return getDb().queue.where('status').equals('pending').count();
}

export async function listPending(): Promise<PendingOp[]> {
  return getDb().queue.where('status').equals('pending').toArray();
}
