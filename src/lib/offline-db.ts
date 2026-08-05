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

/**
 * Progression de l'élève dans l'atlas anatomique.
 *
 * Volontairement 100 % local : l'atlas est un outil de révision, pas une
 * évaluation. Rien n'est envoyé au serveur et l'enseignant n'y a pas accès —
 * un élève doit pouvoir rater un quiz d'entraînement sans que cela le suive.
 * La file `queue` reste le seul canal de synchronisation.
 */
export type ProgressionOrgane = {
  /** Clé primaire : l'identifiant de l'organe (`coeur`, `cerveau`…). */
  organeId: string;
  /** Dernière ouverture de la fiche. */
  vuLe: number;
  /** Meilleur score obtenu au quiz, jamais écrasé par un moins bon. */
  meilleurScore?: number;
  totalQuestions?: number;
  dernierQuizLe?: number;
  /** Marqué par l'élève comme « à revoir avant le contrôle ». */
  aRevoir?: boolean;
};

export class OfflineDb extends Dexie {
  queue!: Table<PendingOp, number>;
  atlas!: Table<ProgressionOrgane, string>;

  constructor() {
    super('senlabvisa-offline');
    this.version(1).stores({
      queue: '++id, status, kind, localAttemptId, createdAt',
    });
    // v2 : ajout de l'atlas. Dexie applique les migrations additives sans
    // toucher aux données existantes de `queue`.
    this.version(2).stores({
      queue: '++id, status, kind, localAttemptId, createdAt',
      atlas: '&organeId, vuLe, aRevoir',
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
