import { EncryptedVaultPayload } from '../types';
import { SYNC_FILE_NAME } from './vaultSync';

// Folder access through the File System Access API (Chrome / Edge on desktop).
// The directory handle is kept in IndexedDB so the user picks the folder once;
// the browser still asks to re-confirm access after a restart.

type Permission = 'granted' | 'prompt' | 'denied';

interface DirHandle extends FileSystemDirectoryHandle {
  queryPermission(opts: { mode: 'readwrite' }): Promise<Permission>;
  requestPermission(opts: { mode: 'readwrite' }): Promise<Permission>;
  values(): AsyncIterableIterator<FileSystemHandle>;
}

export const isFolderSyncSupported = (): boolean =>
  typeof window !== 'undefined' && 'showDirectoryPicker' in window && window.isSecureContext;

/* ---------------------------------------------------------- handle store */

const DB_NAME = 'vaultsecure-sync';
const STORE = 'handles';
const KEY = 'folder';

const withStore = <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => open.result.close();
    };
  });

export const loadSavedFolder = async (): Promise<DirHandle | null> => {
  try {
    return ((await withStore('readonly', s => s.get(KEY))) as DirHandle) || null;
  } catch {
    return null;
  }
};

export const forgetFolder = () => withStore('readwrite', s => s.delete(KEY)).catch(() => undefined);

export const pickFolder = async (): Promise<DirHandle> => {
  const handle = (await (window as any).showDirectoryPicker({ id: 'vaultsecure-sync', mode: 'readwrite' })) as DirHandle;
  await withStore('readwrite', s => s.put(handle, KEY));
  return handle;
};

export const folderPermission = async (handle: DirHandle, request = false): Promise<Permission> => {
  const opts = { mode: 'readwrite' as const };
  const state = await handle.queryPermission(opts);
  if (state === 'granted' || !request) return state;
  return handle.requestPermission(opts); // must run inside a click handler
};

/* ------------------------------------------------------------- the files */

export interface SyncFileRead {
  main: { payload: EncryptedVaultPayload; lastModified: number } | null;
  // Copies made by Syncthing/OneDrive/Drive when two devices wrote at once
  conflicts: { name: string; payload: EncryptedVaultPayload }[];
}

const readPayload = async (file: File): Promise<EncryptedVaultPayload | null> => {
  try {
    const parsed = JSON.parse(await file.text());
    return parsed && parsed.ciphertext && parsed.iv && parsed.salt ? parsed : null;
  } catch {
    return null;
  }
};

const BASE = SYNC_FILE_NAME.replace(/\.vault$/, '');

export const readSyncFolder = async (handle: DirHandle): Promise<SyncFileRead> => {
  const result: SyncFileRead = { main: null, conflicts: [] };
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file' || !entry.name.startsWith(BASE) || !entry.name.endsWith('.vault')) continue;
    const file = await (entry as FileSystemFileHandle).getFile();
    const payload = await readPayload(file);
    if (!payload) continue;
    if (entry.name === SYNC_FILE_NAME) result.main = { payload, lastModified: file.lastModified };
    else result.conflicts.push({ name: entry.name, payload });
  }
  return result;
};

export const syncFileLastModified = async (handle: DirHandle): Promise<number | null> => {
  try {
    const file = await (await handle.getFileHandle(SYNC_FILE_NAME)).getFile();
    return file.lastModified;
  } catch {
    return null;
  }
};

export const writeSyncFile = async (handle: DirHandle, payload: EncryptedVaultPayload): Promise<number> => {
  const fileHandle = await handle.getFileHandle(SYNC_FILE_NAME, { create: true });
  // createWritable writes to a swap file and replaces the original on close,
  // so a sync tool never picks up a half-written file
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(payload));
  await writable.close();
  return (await fileHandle.getFile()).lastModified;
};

export const removeFile = (handle: DirHandle, name: string) => handle.removeEntry(name).catch(() => undefined);

export type { DirHandle };
