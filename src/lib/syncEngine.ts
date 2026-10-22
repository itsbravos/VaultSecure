import { EncryptedVaultPayload, VaultItem } from '../types';
import { decryptVaultData, deriveMasterKey, encryptVaultData, base64ToBuffer } from './crypto';
import {
  VAULT_IDS,
  VaultId,
  loadAllVaults,
  saveAllVaults,
  loadTombstones,
  saveTombstones,
  rekeyLocalVaults,
  saltToBase64,
  Tombstones,
} from './storage';
import { SyncSnapshot, SYNC_FORMAT, MergeStats, mergeVault, sumStats, hasChanges, getDeviceId, isSnapshot } from './vaultSync';
import { tr } from './i18n';

/** The file was encrypted on a device that uses a different salt: it must be linked first. */
export class SyncNeedsLinkError extends Error {
  constructor(public payload: EncryptedVaultPayload) {
    super(tr("Este arquivo foi criado em outro aparelho."));
  }
}

export class SyncFormatError extends Error {}

export interface SyncOutcome {
  vaults: Record<VaultId, VaultItem[]>;
  stats: MergeStats; // what changed on this device
  payload: EncryptedVaultPayload; // what the shared file should now contain
  remoteNeedsWrite: boolean; // this device has something the file doesn't
}

const decryptSnapshot = async (payload: EncryptedVaultPayload, key: CryptoKey): Promise<SyncSnapshot> => {
  let data: unknown;
  try {
    data = await decryptVaultData<unknown>(payload, key);
  } catch {
    throw new SyncFormatError(tr("Não foi possível abrir o arquivo de sincronização com a chave deste cofre."));
  }
  if (!isSnapshot(data)) throw new SyncFormatError(tr("O arquivo não é um arquivo de sincronização do VaultSecure."));
  return data;
};

export const buildSnapshotPayload = (
  vaults: Record<VaultId, VaultItem[]>,
  tombstones: Record<VaultId, Tombstones>,
  key: CryptoKey,
  salt: Uint8Array
): Promise<EncryptedVaultPayload> => {
  const snapshot: SyncSnapshot = {
    format: SYNC_FORMAT,
    version: 1,
    writtenAt: Date.now(),
    deviceId: getDeviceId(),
    vaults: Object.fromEntries(VAULT_IDS.map(id => [id, { items: vaults[id], tombstones: tombstones[id] }])),
  };
  return encryptVaultData(snapshot, key, salt);
};

/**
 * Merge one or more copies of the shared file into this device and produce the
 * payload to write back. Local storage is updated only when something changed.
 */
export async function syncWithPayloads(
  remotes: EncryptedVaultPayload[],
  key: CryptoKey,
  salt: Uint8Array
): Promise<SyncOutcome> {
  const localSalt = saltToBase64(salt);
  const mismatch = remotes.find(p => p.salt !== localSalt);
  if (mismatch) throw new SyncNeedsLinkError(mismatch);

  const snapshots = await Promise.all(remotes.map(p => decryptSnapshot(p, key)));

  const vaults = await loadAllVaults(key);
  const tombstones = Object.fromEntries(VAULT_IDS.map(id => [id, loadTombstones(id)])) as Record<VaultId, Tombstones>;
  const localStats: MergeStats[] = [];
  let remoteNeedsWrite = snapshots.length === 0;

  for (const id of VAULT_IDS) {
    let items = vaults[id];
    let tombs = tombstones[id];
    for (const snap of snapshots) {
      const remote = snap.vaults[id] || { items: [], tombstones: {} };
      // Seen from the file's side: does this device have anything it lacks?
      if (hasChanges(mergeVault(remote.items, remote.tombstones, items, tombs).stats)) remoteNeedsWrite = true;
      const merged = mergeVault(items, tombs, remote.items, remote.tombstones);
      localStats.push(merged.stats);
      items = merged.items;
      tombs = merged.tombstones;
    }
    vaults[id] = items;
    tombstones[id] = tombs;
  }
  // Several copies (conflict files) always need to be collapsed into one
  if (snapshots.length > 1) remoteNeedsWrite = true;

  const stats = sumStats(localStats);
  if (hasChanges(stats)) {
    await saveAllVaults(vaults, key, salt);
  }
  VAULT_IDS.forEach(id => saveTombstones(id, tombstones[id]));

  return { vaults, stats, remoteNeedsWrite, payload: await buildSnapshotPayload(vaults, tombstones, key, salt) };
}

/**
 * Adopt the salt of a file made on another device, so both derive the same key
 * from the same master password. Everything local is re-encrypted; nothing is
 * merged yet (the caller runs a normal sync right after).
 */
export async function linkToSyncFile(
  payload: EncryptedVaultPayload,
  password: string,
  currentKey: CryptoKey
): Promise<{ masterKey: CryptoKey; salt: Uint8Array }> {
  const salt = base64ToBuffer(payload.salt);
  const masterKey = await deriveMasterKey(password, salt);
  await decryptSnapshot(payload, masterKey).catch(() => {
    throw new SyncFormatError(tr("Senha mestra incorreta para este arquivo."));
  });
  await rekeyLocalVaults(currentKey, masterKey, salt);
  return { masterKey, salt };
}
