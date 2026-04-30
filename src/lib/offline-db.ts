import Dexie, { type Table } from 'dexie';

/**
 * File locale d'opérations à synchroniser avec le serveur quand la connexion revient.
 * Chaque entrée représente une action "start" ou "complete" sur une tentative.
 *
 * Flow :
 *  - offline : l'app persiste l'opération ici → UI optimiste
 *  - online  : SyncManager itère la file, POST au serveur, marque synced ou incrémente lastError
 */
export type PendingStart = {
  id?: number;
  kind: 'start';
  localAttemptId: string;
  simulationId: string;
  token: string;
  createdAt: number;
  status: 'pending' | 'synced' | 'error';
  serverAttemptId?: string;
  lastError?: string;
};

export type PendingComplete = {
  id?: number;
  kind: 'complete';
  localAttemptId: string;
  score: number;
  dataJson: Record<string, unknown>;
  token: string;
  createdAt: number;
  status: 'pending' | 'synced' | 'error';
  lastError?: string;
};

export type PendingOp = PendingStart | PendingComplete;

export class OfflineDb extends Dexie {
  queue!: Table<PendingOp, number>;

  constructor() {
    super('senlabvisa-offline');
    this.version(1).stores({
      queue: '++id, status, kind, localAttemptId, createdAt',
    });
  }
}

let _db: OfflineDb | null = null;

export function getDb(): OfflineDb {
  if (typeof window === 'undefined') {
    throw new Error('offline-db is only usable in the browser');
  }
  if (!_db) _db = new OfflineDb();
  return _db;
}

export function generateLocalAttemptId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
