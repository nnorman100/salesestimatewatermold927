/**
 * Alert Disaster Restoration — Offline Storage & Dead-Zone Sync Engine
 * Uses IndexedDB (idb) for subgrade basements and crawlspaces with zero cell signal.
 */

import { openDB, IDBPDatabase } from 'idb';
import { JobState } from '../types/estimator';

const DB_NAME = 'AlertRestorationDB';
const DB_VERSION = 1;

export interface QueuedTurn {
  id: string;
  timestamp: string;
  technicianSpeech: string;
  photoBase64?: string;
  currentRoom: string;
  buildYear: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser client.'));
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('jobState')) {
          db.createObjectStore('jobState', { keyPath: 'lossId' });
        }
        if (!db.objectStoreNames.contains('offlineQueue')) {
          db.createObjectStore('offlineQueue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('photoCache')) {
          db.createObjectStore('photoCache', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Persists live job state to browser IndexedDB
 */
export async function saveOfflineJobState(state: JobState): Promise<void> {
  try {
    const db = await getDB();
    await db.put('jobState', state);
  } catch (error) {
    console.warn('Failed to save state to IndexedDB:', error);
  }
}

/**
 * Loads cached job state for crash recovery
 */
export async function loadOfflineJobState(lossId?: string): Promise<JobState | null> {
  try {
    const db = await getDB();
    if (lossId) {
      return (await db.get('jobState', lossId)) || null;
    }
    const all = await db.getAll('jobState');
    return all.length > 0 ? all[all.length - 1] : null;
  } catch (error) {
    console.warn('Failed to read state from IndexedDB:', error);
    return null;
  }
}

/**
 * Queues an inspection turn when device is offline
 */
export async function enqueueOfflineTurn(turn: QueuedTurn): Promise<void> {
  try {
    const db = await getDB();
    await db.put('offlineQueue', turn);
  } catch (error) {
    console.warn('Failed to enqueue offline turn:', error);
  }
}

/**
 * Retrieves all offline queued turns for sync flushing
 */
export async function getOfflineQueue(): Promise<QueuedTurn[]> {
  try {
    const db = await getDB();
    return await db.getAll('offlineQueue');
  } catch (error) {
    console.warn('Failed to get offline queue:', error);
    return [];
  }
}

/**
 * Removes a single processed turn from the offline queue upon successful sync
 */
export async function removeOfflineTurn(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('offlineQueue', id);
  } catch (error) {
    console.warn('Failed to remove turn from offline queue:', error);
  }
}

/**
 * Clears the offline queue after successful sync to Antigravity backend
 */
export async function clearOfflineQueue(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('offlineQueue');
  } catch (error) {
    console.warn('Failed to clear offline queue:', error);
  }
}
