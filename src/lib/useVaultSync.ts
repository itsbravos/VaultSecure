import { useCallback, useEffect, useRef, useState } from 'react';
import { EncryptedVaultPayload, VaultItem } from '../types';
import {
  DirHandle,
  folderPermission,
  forgetFolder,
  isFolderSyncSupported,
  loadSavedFolder,
  pickFolder,
  readSyncFolder,
  removeFile,
  syncFileLastModified,
  writeSyncFile,
} from './syncFolder';
import { SyncNeedsLinkError, buildSnapshotPayload, linkToSyncFile, syncWithPayloads } from './syncEngine';
import { MergeStats, SYNC_FILE_NAME, hasChanges } from './vaultSync';
import { VAULT_IDS, VaultId, loadAllVaults, loadTombstones } from './storage';
import { tr } from './i18n';

export type SyncStatus =
  | 'off' // no folder chosen
  | 'needs-permission' // folder remembered, browser wants a click to allow access again
  | 'needs-link' // file in the folder came from a device with another salt
  | 'idle'
  | 'syncing'
  | 'error';

interface Options {
  masterKey: CryptoKey | null;
  salt: Uint8Array | null;
  enabled: boolean; // false while locked or in duress mode
  onVaultsChanged: (vaults: Record<VaultId, VaultItem[]>, stats: MergeStats) => void;
  onKeyChanged: (key: CryptoKey, salt: Uint8Array) => void;
}

const POLL_MS = 30_000;
const DEBOUNCE_MS = 1_500;

export function useVaultSync({ masterKey, salt, enabled, onVaultsChanged, onKeyChanged }: Options) {
  const supported = isFolderSyncSupported();
  const [status, setStatus] = useState<SyncStatus>('off');
  const [folderName, setFolderName] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [lastStats, setLastStats] = useState<MergeStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<EncryptedVaultPayload | null>(null);

  const handleRef = useRef<DirHandle | null>(null);
  const runningRef = useRef(false);
  const againRef = useRef(false);
  const lastSeenModifiedRef = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest values for callbacks fired from timers/listeners
  const live = useRef({ masterKey, salt, enabled, onVaultsChanged, onKeyChanged });
  live.current = { masterKey, salt, enabled, onVaultsChanged, onKeyChanged };

  const applyOutcome = (vaults: Record<VaultId, VaultItem[]>, stats: MergeStats) => {
    setLastStats(stats);
    setLastSyncAt(Date.now());
    if (hasChanges(stats)) live.current.onVaultsChanged(vaults, stats);
  };

  const runFolderSync = useCallback(async () => {
    const { masterKey: key, salt: s, enabled: on } = live.current;
    const handle = handleRef.current;
    if (!handle || !key || !s || !on) return;
    if (runningRef.current) {
      againRef.current = true;
      return;
    }
    runningRef.current = true;
    setStatus('syncing');
    try {
      if ((await folderPermission(handle)) !== 'granted') {
        setStatus('needs-permission');
        return;
      }
      const read = await readSyncFolder(handle);
      const remotes = [...(read.main ? [read.main.payload] : []), ...read.conflicts.map(c => c.payload)];
      const outcome = await syncWithPayloads(remotes, key, s);

      if (outcome.remoteNeedsWrite) {
        lastSeenModifiedRef.current = await writeSyncFile(handle, outcome.payload);
      } else {
        lastSeenModifiedRef.current = read.main?.lastModified ?? null;
      }
      // Conflict copies are now folded into the main file
      await Promise.all(read.conflicts.map(c => removeFile(handle, c.name)));

      applyOutcome(outcome.vaults, outcome.stats);
      setError(null);
      setPendingLink(null);
      setStatus('idle');
    } catch (err) {
      if (err instanceof SyncNeedsLinkError) {
        setPendingLink(err.payload);
        setStatus('needs-link');
      } else {
        console.error(err);
        setError(err instanceof Error ? err.message : tr("Falha ao sincronizar."));
        setStatus('error');
      }
    } finally {
      runningRef.current = false;
      if (againRef.current) {
        againRef.current = false;
        void runFolderSync();
      }
    }
  }, []);

  // Restore the remembered folder once per unlock
  useEffect(() => {
    if (!enabled || !supported) return;
    let cancelled = false;
    (async () => {
      const handle = await loadSavedFolder();
      if (cancelled || !handle) return;
      handleRef.current = handle;
      setFolderName(handle.name);
      if ((await folderPermission(handle)) === 'granted') void runFolderSync();
      else setStatus('needs-permission');
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, supported, runFolderSync]);

  // Pick up writes from other devices: poll the file's timestamp and re-check on focus
  useEffect(() => {
    if (!enabled || !handleRef.current) return;
    const check = async () => {
      const handle = handleRef.current;
      if (!handle || runningRef.current || (await folderPermission(handle)) !== 'granted') return;
      const modified = await syncFileLastModified(handle);
      if (modified !== lastSeenModifiedRef.current) void runFolderSync();
    };
    const interval = setInterval(check, POLL_MS);
    const onFocus = () => void check();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, folderName, runFolderSync]);

  /** Call after any local save; batches bursts of edits into one sync. */
  const notifyLocalChange = useCallback(() => {
    if (!handleRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runFolderSync(), DEBOUNCE_MS);
  }, [runFolderSync]);

  /* ---------------------------------------------------- user actions */

  const connectFolder = async () => {
    try {
      const handle = await pickFolder();
      handleRef.current = handle;
      setFolderName(handle.name);
      lastSeenModifiedRef.current = null;
      await runFolderSync();
    } catch (err) {
      // Closing the picker throws AbortError; that's not a failure
      if ((err as DOMException)?.name !== 'AbortError') {
        setError(tr("Não foi possível usar esta pasta."));
        setStatus('error');
      }
    }
  };

  const reconnect = async () => {
    const handle = handleRef.current;
    if (!handle) return;
    if ((await folderPermission(handle, true)) === 'granted') await runFolderSync();
  };

  const disconnect = async () => {
    await forgetFolder();
    handleRef.current = null;
    setFolderName(null);
    setStatus('off');
    setLastSyncAt(null);
    setLastStats(null);
    setPendingLink(null);
    setError(null);
  };

  /** Adopt the other device's salt (asks for that file's master password), then sync. */
  const link = async (password: string, payload: EncryptedVaultPayload | null = pendingLink) => {
    const { masterKey: key } = live.current;
    if (!key || !payload) return;
    const next = await linkToSyncFile(payload, password, key);
    live.current.onKeyChanged(next.masterKey, next.salt);
    live.current = { ...live.current, masterKey: next.masterKey, salt: next.salt };
    setPendingLink(null);
    if (handleRef.current) await runFolderSync();
  };

  /** Manual mode (phones, Firefox, Safari): merge a sync file picked by hand. */
  const mergeFile = async (file: File): Promise<MergeStats> => {
    const { masterKey: key, salt: s } = live.current;
    if (!key || !s) throw new Error(tr("Cofre bloqueado."));
    let payload: EncryptedVaultPayload;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      throw new Error(tr("Este arquivo não é um arquivo de sincronização do VaultSecure."));
    }
    const outcome = await syncWithPayloads([payload], key, s);
    applyOutcome(outcome.vaults, outcome.stats);
    return outcome.stats;
  };

  /** Manual mode: download this device's current state as the shared file. */
  const exportFile = async () => {
    const { masterKey: key, salt: s } = live.current;
    if (!key || !s) return;
    const vaults = await loadAllVaults(key);
    const tombstones = Object.fromEntries(VAULT_IDS.map(id => [id, loadTombstones(id)])) as Record<VaultId, Record<string, number>>;
    const payload = await buildSnapshotPayload(vaults, tombstones, key, s);
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload)], { type: 'application/octet-stream' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = SYNC_FILE_NAME;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * After this device changes its master password (new salt), overwrite the shared
   * file from here. Other devices will then ask once for the new password.
   */
  const republish = async (key: CryptoKey, s: Uint8Array) => {
    const handle = handleRef.current;
    if (!handle || (await folderPermission(handle)) !== 'granted') return;
    const vaults = await loadAllVaults(key);
    const tombstones = Object.fromEntries(VAULT_IDS.map(id => [id, loadTombstones(id)])) as Record<VaultId, Record<string, number>>;
    lastSeenModifiedRef.current = await writeSyncFile(handle, await buildSnapshotPayload(vaults, tombstones, key, s));
    setLastSyncAt(Date.now());
    setStatus('idle');
  };

  return {
    supported,
    republish,
    status,
    folderName,
    lastSyncAt,
    lastStats,
    error,
    needsLink: !!pendingLink,
    connectFolder,
    reconnect,
    disconnect,
    syncNow: runFolderSync,
    notifyLocalChange,
    link,
    mergeFile,
    exportFile,
  };
}

export type VaultSync = ReturnType<typeof useVaultSync>;
