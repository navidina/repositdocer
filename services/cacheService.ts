
import { openDB, IDBPDatabase } from 'idb';
import { FileMetadata } from '../types';

const DB_NAME = 'rayan-meta-db';
const STORE_NAME = 'file-metadata';
const API_URL = 'http://localhost:3000/api';

// --- SERVER-SIDE SESSION PERSISTENCE (Replaces localStorage) ---

/**
 * Saves the entire project session (docs, graph, stats) to the server.
 */
export const saveProjectSession = async (projectId: string, data: any): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/projects/${projectId}/docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, projectId })
    });
    if (!response.ok) {
        throw new Error(`Failed to save session: ${response.statusText}`);
    }
  } catch (e) {
    console.error('Error saving project session to server:', e);
    throw e;
  }
};

/**
 * Retrieves the project session from the server.
 */
export const getProjectSession = async (projectId: string): Promise<any | null> => {
  try {
    const response = await fetch(`${API_URL}/projects/${projectId}/docs`);
    if (response.status === 404) return null;
    if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`);
    }
    return await response.json();
  } catch (e) {
    console.warn('Error fetching project session from server:', e);
    return null;
  }
};


// --- CLIENT-SIDE CACHING (Incremental Parsing Optimization) ---

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'path' });
        }
      },
    });
  }
  return dbPromise;
};

export const getFileMetadata = async (path: string): Promise<FileMetadata | undefined> => {
  try {
      const db = await getDb();
      return await db.get(STORE_NAME, path);
  } catch (e) {
      console.warn('Error fetching metadata from IDB', e);
      return undefined;
  }
};

export const saveFileMetadata = async (metadata: FileMetadata): Promise<void> => {
  try {
      const db = await getDb();
      await db.put(STORE_NAME, metadata);
  } catch (e) {
      console.warn('Error saving metadata to IDB', e);
  }
};

export const clearMetadataCache = async (): Promise<void> => {
   const db = await getDb();
   await db.clear(STORE_NAME);
};
