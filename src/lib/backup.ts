import { VaultItem } from '../types';
import { loadEncryptedVaultItems } from './storage';
import { VAULTS } from './vaults';

export type ExportScope = string | 'all';

export interface ScopedVaultItem extends VaultItem {
  sourceVaultId: string;
}

/**
 * Shape written to backup files: a plain VaultItem plus which vault it came from,
 * so restoring a multi-vault export can put each item back where it belongs.
 * Optional so older exports (pre-multi-vault) still import correctly.
 */
export interface ExportedVaultItem extends VaultItem {
  vaultId?: string;
}

/**
 * Loads and decrypts the items for the requested export scope (a single vault id,
 * or 'all' to combine every vault). Reuses the already-decrypted items for the
 * currently active vault instead of re-decrypting them from storage.
 */
export async function loadItemsForScope(
  scope: ExportScope,
  masterKey: CryptoKey,
  activeVaultId: string,
  currentItems: VaultItem[]
): Promise<ScopedVaultItem[]> {
  const vaultIds = scope === 'all' ? VAULTS.map(v => v.id) : [scope];

  const results = await Promise.all(
    vaultIds.map(async vaultId => {
      const vaultItems =
        vaultId === activeVaultId ? currentItems : await loadEncryptedVaultItems(masterKey, vaultId);
      return vaultItems.map(item => ({ ...item, sourceVaultId: vaultId }));
    })
  );

  return results.flat();
}

/** Tags each item with its source vault so the exported file can restore the split. */
export function toExportedItems(items: ScopedVaultItem[]): ExportedVaultItem[] {
  return items.map(({ sourceVaultId, ...item }) => ({ ...item, vaultId: sourceVaultId }));
}

/**
 * Splits an imported file's items back into per-vault groups. Items without a
 * vaultId tag (older exports, or plaintext files edited by hand) fall back to
 * the given vault instead of being dropped.
 */
export function groupItemsByVault(
  items: ExportedVaultItem[],
  fallbackVaultId: string
): Record<string, VaultItem[]> {
  const groups: Record<string, VaultItem[]> = {};
  for (const { vaultId, ...item } of items) {
    const targetId = vaultId || fallbackVaultId;
    if (!groups[targetId]) groups[targetId] = [];
    groups[targetId].push(item as VaultItem);
  }
  return groups;
}

/** Merges imported items into an existing list, keeping the existing entry on id collision. */
export function mergeItemsById(existing: VaultItem[], incoming: VaultItem[]): VaultItem[] {
  const existingIds = new Set(existing.map(i => i.id));
  const merged = [...existing];
  incoming.forEach(item => {
    if (!existingIds.has(item.id)) merged.push(item);
  });
  return merged;
}
