import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeAttemptOfflineFirst,
  countPending,
  drainQueue,
  listPending,
  startAttemptOfflineFirst,
} from './sync-queue';
import { getDb } from './offline-db';

type FetchCall = { url: string; init: RequestInit };
const calls: FetchCall[] = [];

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => body,
  } as Response;
}

let queueOfResponses: Response[] = [];

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

beforeEach(async () => {
  calls.length = 0;
  queueOfResponses = [];
  setOnline(true);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (queueOfResponses.length > 0) return queueOfResponses.shift()!;
      return mockResponse({ id: 'server-1', status: 'started' });
    }),
  );
  await getDb().queue.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('startAttemptOfflineFirst', () => {
  it('posts to server when online and returns server attempt', async () => {
    queueOfResponses = [
      mockResponse({
        id: 'server-xyz',
        studentId: 'stu1',
        simulationId: 'sim1',
        status: 'started',
        score: null,
        dataJson: {},
        createdAt: 'now',
        syncedAt: null,
      }),
    ];
    const res = await startAttemptOfflineFirst('tok', 'sim1');
    expect(res.local).toBe(false);
    expect(res.attempt.id).toBe('server-xyz');
    expect(await countPending()).toBe(0);
  });

  it('queues locally when offline and returns optimistic attempt', async () => {
    setOnline(false);
    const res = await startAttemptOfflineFirst('tok', 'sim1');
    expect(res.local).toBe(true);
    expect(res.attempt.id).toMatch(/^local-/);
    expect(await countPending()).toBe(1);
    const pending = await listPending();
    expect(pending[0].kind).toBe('start');
  });

  it('queues locally when fetch throws', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network'));
    const res = await startAttemptOfflineFirst('tok', 'sim1');
    expect(res.local).toBe(true);
    expect(await countPending()).toBe(1);
  });
});

describe('completeAttemptOfflineFirst', () => {
  it('posts complete when online with server ID', async () => {
    queueOfResponses = [
      mockResponse({
        id: 'server-1',
        studentId: 'stu1',
        simulationId: 'sim1',
        status: 'completed',
        score: 80,
        dataJson: {},
        createdAt: 'now',
        syncedAt: 'now',
      }),
    ];
    const res = await completeAttemptOfflineFirst('tok', 'server-1', false, 80, {});
    expect(res.local).toBe(false);
    expect(res.attempt.score).toBe(80);
    expect(await countPending()).toBe(0);
  });

  it('queues when isLocal=true even if online (start not yet synced)', async () => {
    const res = await completeAttemptOfflineFirst('tok', 'local-abc', true, 80, { x: 1 });
    expect(res.local).toBe(true);
    expect(await countPending()).toBe(1);
    const pending = await listPending();
    expect(pending[0].kind).toBe('complete');
  });

  it('queues when offline', async () => {
    setOnline(false);
    await completeAttemptOfflineFirst('tok', 'server-1', false, 80, {});
    expect(await countPending()).toBe(1);
  });
});

describe('drainQueue', () => {
  it('processes pending start then complete with correct server mapping', async () => {
    setOnline(false);
    const started = await startAttemptOfflineFirst('tok', 'sim1');
    await completeAttemptOfflineFirst('tok', started.localId, true, 90, { final: true });
    expect(await countPending()).toBe(2);

    setOnline(true);
    queueOfResponses = [
      mockResponse({
        id: 'server-real-1',
        studentId: 'stu1',
        simulationId: 'sim1',
        status: 'started',
        score: null,
        dataJson: {},
        createdAt: 'now',
        syncedAt: null,
      }),
      mockResponse({
        id: 'server-real-1',
        studentId: 'stu1',
        simulationId: 'sim1',
        status: 'completed',
        score: 90,
        dataJson: { final: true },
        createdAt: 'now',
        syncedAt: 'now',
      }),
    ];

    const result = await drainQueue();
    expect(result.synced).toBe(2);
    expect(result.failed).toBe(0);
    expect(await countPending()).toBe(0);
    // 2e POST doit cibler /attempts/server-real-1/complete
    const completeCall = calls.find((c) => c.url.includes('/complete'));
    expect(completeCall?.url).toContain('/attempts/server-real-1/complete');
  });

  it('marks an item as error and continues', async () => {
    setOnline(false);
    await startAttemptOfflineFirst('tok', 'sim1');
    setOnline(true);

    queueOfResponses = [mockResponse({ message: 'boom' }, false, 500)];
    const result = await drainQueue();
    expect(result.failed).toBe(1);
    expect(await countPending()).toBe(0); // l'item a changé de statut à 'error'
  });
});
