import { VaultItem } from '../types';
import { loadEncryptedVaultItems } from './storage';
import { VAULTS } from './vaults';

export type ExportScope = string | 'all';

export interface ScopedVaultItem extends VaultItem {
  sourceVaultId: string;
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

/** Strips the export-only sourceVaultId tag so the file stays a plain VaultItem[]. */
export function stripScopeMetadata(items: ScopedVaultItem[]): VaultItem[] {
  return items.map(({ sourceVaultId, ...item }) => item);
}
