import { VaultItem } from '../types';
import type { Tombstones } from './storage';
import { tr } from './i18n';

// Sync works on a single encrypted file that every device reads, merges into its
// own copy and writes back. The file content is opaque ciphertext, so it can sit in
// any synced folder (Syncthing, OneDrive, Google Drive...) without exposing data.

export const SYNC_FILE_NAME = 'VaultSecure.sync.vault';
export const SYNC_FORMAT = 'vaultsecure-sync';

/** What goes inside the encrypted payload */
export interface SyncSnapshot {
  format: typeof SYNC_FORMAT;
  version: 1;
  writtenAt: number;
  deviceId: string;
  vaults: Record<string, { items: VaultItem[]; tombstones: Tombstones }>;
}

export interface MergeStats {
  added: number;
  updated: number;
  removed: number;
}

export interface MergeResult {
  items: VaultItem[];
  tombstones: Tombstones;
  stats: MergeStats; // changes applied to the *local* side
}

const stamp = (item: VaultItem) => item.updatedAt || item.createdAt || 0;

/**
 * Last-writer-wins per item, with deletions as tombstones.
 * - An item present on only one side is kept, unless the other side deleted it later.
 * - When both sides have it, the newer `updatedAt` wins (ties keep the local copy).
 * - A tombstone newer than the surviving version removes the item.
 */
export function mergeVault(
  local: VaultItem[],
  localTombs: Tombstones,
  remote: VaultItem[],
  remoteTombs: Tombstones
): MergeResult {
  const tombstones: Tombstones = { ...localTombs };
  Object.entries(remoteTombs).forEach(([id, t]) => {
    tombstones[id] = Math.max(tombstones[id] || 0, t);
  });

  const localById = new Map(local.map(i => [i.id, i]));
  const remoteById = new Map(remote.map(i => [i.id, i]));
  const stats: MergeStats = { added: 0, updated: 0, removed: 0 };
  const items: VaultItem[] = [];

  // Keep local order first so the UI doesn't reshuffle, then append remote-only items
  const ids = [...localById.keys(), ...[...remoteById.keys()].filter(id => !localById.has(id))];

  for (const id of ids) {
    const mine = localById.get(id);
    const theirs = remoteById.get(id);
    const winner = mine && theirs ? (stamp(theirs) > stamp(mine) ? theirs : mine) : (mine || theirs)!;

    const deletedAt = tombstones[id];
    if (deletedAt !== undefined && deletedAt >= stamp(winner)) {
      if (mine) stats.removed++;
      continue;
    }
    // Edited after it was deleted elsewhere: the edit wins, forget the tombstone
    if (deletedAt !== undefined) delete tombstones[id];

    if (!mine) stats.added++;
    else if (winner !== mine) stats.updated++;
    items.push(winner);
  }

  return { items, tombstones, stats };
}

export const hasChanges = (s: MergeStats) => s.added + s.updated + s.removed > 0;

export const sumStats = (all: MergeStats[]): MergeStats =>
  all.reduce((a, s) => ({ added: a.added + s.added, updated: a.updated + s.updated, removed: a.removed + s.removed }), {
    added: 0,
    updated: 0,
    removed: 0,
  });

export const describeStats = (s: MergeStats): string => {
  const parts: string[] = [];
  if (s.added) parts.push(tr(s.added === 1 ? '{n} novo' : '{n} novos', { n: s.added }));
  if (s.updated) parts.push(tr(s.updated === 1 ? '{n} atualizado' : '{n} atualizados', { n: s.updated }));
  if (s.removed) parts.push(tr(s.removed === 1 ? '{n} removido' : '{n} removidos', { n: s.removed }));
  return parts.length ? parts.join(', ') : tr('nenhuma mudança');
};

/** A stable random id per device, used only to tell which device wrote the file last. */
export const getDeviceId = (): string => {
  const KEY = 'vaultsecure_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
};

export const isSnapshot = (value: unknown): value is SyncSnapshot =>
  !!value && typeof value === 'object' && (value as SyncSnapshot).format === SYNC_FORMAT && typeof (value as SyncSnapshot).vaults === 'object';
