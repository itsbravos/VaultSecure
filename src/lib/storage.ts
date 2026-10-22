/**
 * Encrypted LocalStorage Manager and Vault Persistence Engine
 */

import {
  AuthSession,
  EncryptedVaultPayload,
  SecurityReport,
  VaultItem,
  VaultSettings,
} from '../types';
import {
  calculatePasswordStrength,
  decryptVaultData,
  deriveMasterKey,
  encryptVaultData,
  getRandomBytes,
  isLocalLeakedPassword,
} from './crypto';

const STORAGE_KEYS = {
  VAULT_ENCRYPTED: 'vaultsecure_items_encrypted',
  VAULT_SETTINGS: 'vaultsecure_settings',
  VAULT_SALT: 'vaultsecure_master_salt',
  VAULT_SALT_VERIFIER: 'vaultsecure_pass_verifier',
  IS_INITIALIZED: 'vaultsecure_is_initialized',
};

export const DEFAULT_SETTINGS: VaultSettings = {
  userName: 'Seu Nome',
  require2FA: false,
  totpSecret: '',
  totpVerified: false,
  backupCodes: [],

  requireDigitalCert: false,
  digitalCertificates: [],

  autoLockMinutes: 5,
  clipboardClearSeconds: 20,
  selfDestructAttempts: 5,
  theme: 'beige',
  accentColor: 'amber',
  quickActionIds: ['generate_pass', 'add_login', 'add_card', 'browser_import', 'audit_view', 'cert_view', 'backup_view'],
  enableOnlineFavicons: true,
};

/**
 * Check if a vault has been created on this browser
 */
export function isVaultInitialized(): boolean {
  return localStorage.getItem(STORAGE_KEYS.IS_INITIALIZED) === 'true';
}

/**
 * Get or create the Master Salt (16 bytes base64)
 */
export function getStoredMasterSalt(): Uint8Array {
  const stored = localStorage.getItem(STORAGE_KEYS.VAULT_SALT);
  if (stored) {
    const binary = atob(stored);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const newSalt = getRandomBytes(16);
  let binary = '';
  for (let i = 0; i < newSalt.length; i++) {
    binary += String.fromCharCode(newSalt[i]);
  }
  localStorage.setItem(STORAGE_KEYS.VAULT_SALT, btoa(binary));
  return newSalt;
}

/**
 * Initialize new Vault with Master Password and optional initial items
 */
export async function initializeNewVault(
  masterPassword: string,
  initialSettings: Partial<VaultSettings> = {},
  initialItems: VaultItem[] = []
): Promise<{ masterKey: CryptoKey; salt: Uint8Array }> {
  const salt = getRandomBytes(16);

  // Store salt base64
  let binary = '';
  for (let i = 0; i < salt.length; i++) {
    binary += String.fromCharCode(salt[i]);
  }
  localStorage.setItem(STORAGE_KEYS.VAULT_SALT, btoa(binary));

  const masterKey = await deriveMasterKey(masterPassword, salt);

  // Store verifier token to quickly validate password on unlock without decrypting full database
  const verifierToken = await encryptVaultData({ check: 'VAULT_VERIFIED_OK' }, masterKey, salt);
  localStorage.setItem(STORAGE_KEYS.VAULT_SALT_VERIFIER, JSON.stringify(verifierToken));

  const encryptedItems = await encryptVaultData(initialItems, masterKey, salt);
  localStorage.setItem(STORAGE_KEYS.VAULT_ENCRYPTED, JSON.stringify(encryptedItems));

  const settings: VaultSettings = { ...DEFAULT_SETTINGS, ...initialSettings };
  localStorage.setItem(STORAGE_KEYS.VAULT_SETTINGS, JSON.stringify(settings));

  localStorage.setItem(STORAGE_KEYS.IS_INITIALIZED, 'true');

  return { masterKey, salt };
}

/**
 * Verify Master Password against verifier payload or Duress Password Hash
 */
export async function verifyMasterPassword(
  password: string
): Promise<{ valid: boolean; isDuress?: boolean; masterKey: CryptoKey | null; salt: Uint8Array | null }> {
  try {
    const salt = getStoredMasterSalt();
    const settings = loadVaultSettings();

    // Check if password matches Duress Coercion Password
    if (settings.duressEnabled && settings.duressPasswordHash) {
      const inputHash = await import('./crypto').then(m => m.hashSha256(password));
      if (inputHash === settings.duressPasswordHash) {
        // Generate a valid temporary key for duress session
        const duressKey = await deriveMasterKey(password, salt);
        return { valid: true, isDuress: true, masterKey: duressKey, salt };
      }
    }

    const verifierRaw = localStorage.getItem(STORAGE_KEYS.VAULT_SALT_VERIFIER);

    if (!verifierRaw) {
      return { valid: false, masterKey: null, salt: null };
    }

    const masterKey = await deriveMasterKey(password, salt);
    const verifierPayload: EncryptedVaultPayload = JSON.parse(verifierRaw);

    const decrypted = await decryptVaultData<{ check: string }>(verifierPayload, masterKey);

    if (decrypted && decrypted.check === 'VAULT_VERIFIED_OK') {
      return { valid: true, isDuress: false, masterKey, salt };
    }

    return { valid: false, masterKey: null, salt: null };
  } catch (err) {
    return { valid: false, masterKey: null, salt: null };
  }
}

/**
 * Dummy Decoy Vault Items for Duress Mode
 */
export const DECOY_DURESS_ITEMS: VaultItem[] = [
  {
    id: 'decoy-1',
    title: 'Conta Pessoal de E-mail',
    category: 'login',
    username: 'usuario.comum@email.com',
    password: 'Password123!',
    url: 'https://mail.com',
    notes: 'Conta secundária de e-mail.',
    tags: ['Pessoal'],
    favorite: true,
    customFields: [],
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'decoy-2',
    title: 'Cartão de Benefícios',
    category: 'card',
    cardHolder: 'NOME Fictício',
    cardNumber: '5120 •••• •••• 4421',
    cardExpiry: '08/27',
    cardCvc: '123',
    notes: 'Cartão de alimentação.',
    tags: ['Benefícios'],
    favorite: false,
    customFields: [],
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 15,
  },
];

/**
 * Load and Decrypt Vault Items from local storage for a specific vaultId
 */
export async function loadEncryptedVaultItems(masterKey: CryptoKey, vaultId?: string): Promise<VaultItem[]> {
  try {
    const key = vaultId && vaultId !== 'pessoal' ? `${STORAGE_KEYS.VAULT_ENCRYPTED}_${vaultId}` : STORAGE_KEYS.VAULT_ENCRYPTED;
    const encryptedRaw = localStorage.getItem(key);
    if (!encryptedRaw) return [];

    const payload: EncryptedVaultPayload = JSON.parse(encryptedRaw);
    return await decryptVaultData<VaultItem[]>(payload, masterKey);
  } catch (err) {
    console.error('Error decrypting vault items:', err);
    throw new Error('Falha ao descriptografar os dados do cofre. A chave pode estar incorreta.');
  }
}

/**
 * Encrypt and Save Vault Items to local storage for a specific vaultId
 */
export async function saveEncryptedVaultItems(
  items: VaultItem[],
  masterKey: CryptoKey,
  salt: Uint8Array,
  vaultId?: string
): Promise<void> {
  const key = vaultId && vaultId !== 'pessoal' ? `${STORAGE_KEYS.VAULT_ENCRYPTED}_${vaultId}` : STORAGE_KEYS.VAULT_ENCRYPTED;
  const encryptedPayload = await encryptVaultData(items, masterKey, salt);
  localStorage.setItem(key, JSON.stringify(encryptedPayload));
}

/**
 * Load Vault Settings from LocalStorage
 */
export function loadVaultSettings(): VaultSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VAULT_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save Vault Settings to LocalStorage
 */
export function saveVaultSettings(settings: VaultSettings): void {
  localStorage.setItem(STORAGE_KEYS.VAULT_SETTINGS, JSON.stringify(settings));
}

/**
 * Perform Security Audit on all items
 */
// Weight of each problem, per password. An item counts only its worst problem.
export const HEALTH_PENALTY = { leaked: 1, weak: 0.6, reused: 0.4 } as const;

/**
 * 100 minus the share of passwords with problems, weighted by severity.
 * Cards and notes have no password and don't affect the score, so a vault with
 * no problems is always 100. Any leaked password caps the score at 79, and any
 * weak/reused one at 89, so a problem is never shown as a "green" result.
 */
export function computeHealthScore(
  items: VaultItem[],
  issues: { weakItems: VaultItem[]; reusedItems: VaultItem[]; leakedItems: VaultItem[] }
): number {
  const withPassword = items.filter(i => i.password);
  if (withPassword.length === 0) return 100;

  const leaked = new Set(issues.leakedItems.map(i => i.id));
  const weak = new Set(issues.weakItems.map(i => i.id));
  const reused = new Set(issues.reusedItems.map(i => i.id));

  const penalty = withPassword.reduce((sum, i) => {
    if (leaked.has(i.id)) return sum + HEALTH_PENALTY.leaked;
    if (weak.has(i.id)) return sum + HEALTH_PENALTY.weak;
    if (reused.has(i.id)) return sum + HEALTH_PENALTY.reused;
    return sum;
  }, 0);

  let score = Math.round(100 - (100 * penalty) / withPassword.length);
  if (leaked.size > 0) score = Math.min(score, 79);
  else if (weak.size > 0 || reused.size > 0) score = Math.min(score, 89);
  return Math.max(0, score);
}

export function generateSecurityAuditReport(
  items: VaultItem[],
  onlineLeakedIds?: Set<string>
): SecurityReport {
  const weakItems: VaultItem[] = [];
  const leakedItems: VaultItem[] = [];
  const oldItems: VaultItem[] = [];
  const passwordCounts: Record<string, VaultItem[]> = {};

  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

  items.forEach(item => {
    if (item.password) {
      const strength = calculatePasswordStrength(item.password);

      if (strength.score < 50) {
        weakItems.push(item);
      }

      if (isLocalLeakedPassword(item.password) || onlineLeakedIds?.has(item.id)) {
        leakedItems.push(item);
      }

      // Track password reuse
      if (!passwordCounts[item.password]) {
        passwordCounts[item.password] = [];
      }
      passwordCounts[item.password].push(item);
    }

    if (item.updatedAt < ninetyDaysAgo) {
      oldItems.push(item);
    }
  });

  const reusedItems: VaultItem[] = [];
  Object.values(passwordCounts).forEach(group => {
    if (group.length > 1) {
      reusedItems.push(...group);
    }
  });

  const total = items.length;
  const finalScore = computeHealthScore(items, { weakItems, reusedItems, leakedItems });

  return {
    score: finalScore,
    total,
    weakCount: weakItems.length,
    reusedCount: reusedItems.length,
    leakedCount: leakedItems.length,
    oldCount: oldItems.length,
    missing2faCount: items.filter(i => i.category === 'login' && !i.totpSecret).length,
    weakItems,
    reusedItems,
    leakedItems,
    oldItems,
  };
}

/**
 * Change Master Password: verify current password, re-encrypt all items and verifier with new password
 */
export async function changeMasterPassword(
  currentPassword: string,
  newPassword: string,
  _currentItems: VaultItem[],
  currentSalt: Uint8Array
): Promise<{ masterKey: CryptoKey; salt: Uint8Array }> {
  // 1. Verify current password
  const currentKey = await deriveMasterKey(currentPassword, currentSalt);
  const verifierRaw = localStorage.getItem(STORAGE_KEYS.VAULT_SALT_VERIFIER);
  if (verifierRaw) {
    try {
      const verifierPayload: EncryptedVaultPayload = JSON.parse(verifierRaw);
      const test = await decryptVaultData<{ check: string }>(verifierPayload, currentKey);
      if (!test || test.check !== 'VAULT_VERIFIED_OK') {
        throw new Error('Senha mestra atual incorreta.');
      }
    } catch (e: any) {
      throw new Error(e.message || 'Senha mestra atual incorreta.');
    }
  }

  // 2. New salt + key, then re-encrypt every vault (not just the open one)
  const newSalt = getRandomBytes(16);
  const newMasterKey = await deriveMasterKey(newPassword, newSalt);
  await rekeyLocalVaults(currentKey, newMasterKey, newSalt);

  return { masterKey: newMasterKey, salt: newSalt };
}

/* ----------------------------------------------------- multi-vault helpers */

export const VAULT_IDS = ['pessoal', 'trabalho', 'compartilhado'] as const;
export type VaultId = (typeof VAULT_IDS)[number];

const vaultStorageKey = (vaultId: string) =>
  vaultId && vaultId !== 'pessoal' ? `${STORAGE_KEYS.VAULT_ENCRYPTED}_${vaultId}` : STORAGE_KEYS.VAULT_ENCRYPTED;

export const saltToBase64 = (salt: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < salt.length; i++) binary += String.fromCharCode(salt[i]);
  return btoa(binary);
};

/** Decrypt every vault on this device. Vaults that were never created come back empty. */
export async function loadAllVaults(masterKey: CryptoKey): Promise<Record<VaultId, VaultItem[]>> {
  const out = {} as Record<VaultId, VaultItem[]>;
  for (const id of VAULT_IDS) out[id] = await loadEncryptedVaultItems(masterKey, id);
  return out;
}

export async function saveAllVaults(
  vaults: Partial<Record<VaultId, VaultItem[]>>,
  masterKey: CryptoKey,
  salt: Uint8Array
): Promise<void> {
  for (const id of VAULT_IDS) {
    const items = vaults[id];
    if (items) await saveEncryptedVaultItems(items, masterKey, salt, id);
  }
}

/**
 * Re-encrypt everything on this device under a new key + salt: all vaults and the
 * password verifier. Everything is decrypted first, so a wrong old key aborts
 * before anything is overwritten.
 */
export async function rekeyLocalVaults(oldKey: CryptoKey, newKey: CryptoKey, newSalt: Uint8Array): Promise<void> {
  const vaults = await loadAllVaults(oldKey);
  const verifier = await encryptVaultData({ check: 'VAULT_VERIFIED_OK' }, newKey, newSalt);

  localStorage.setItem(STORAGE_KEYS.VAULT_SALT, saltToBase64(newSalt));
  localStorage.setItem(STORAGE_KEYS.VAULT_SALT_VERIFIER, JSON.stringify(verifier));
  for (const id of VAULT_IDS) {
    // Don't materialize vaults that never existed
    if (vaults[id].length > 0 || localStorage.getItem(vaultStorageKey(id))) {
      await saveEncryptedVaultItems(vaults[id], newKey, newSalt, id);
    }
  }
}

/* ------------------------------------------------------------ tombstones */
// Deleted item ids with the time of deletion, so a sync can tell "deleted here"
// apart from "never existed here". Ids are random UUIDs and reveal nothing.

export type Tombstones = Record<string, number>;
const TOMBSTONE_TTL_MS = 180 * 86_400_000;
const tombstoneKey = (vaultId: string) => `vaultsecure_tombstones_${vaultId || 'pessoal'}`;

export function loadTombstones(vaultId: string): Tombstones {
  try {
    const raw = JSON.parse(localStorage.getItem(tombstoneKey(vaultId)) || '{}') as Tombstones;
    const cutoff = Date.now() - TOMBSTONE_TTL_MS;
    return Object.fromEntries(Object.entries(raw).filter(([, t]) => t > cutoff));
  } catch {
    return {};
  }
}

export function saveTombstones(vaultId: string, tombstones: Tombstones): void {
  localStorage.setItem(tombstoneKey(vaultId), JSON.stringify(tombstones));
}

export function recordDeletion(vaultId: string, itemId: string, at = Date.now()): void {
  saveTombstones(vaultId, { ...loadTombstones(vaultId), [itemId]: at });
}

/**
 * Self-destruct: Clear all local storage data completely
 */
export function clearAllVaultData(): void {
  Object.keys(localStorage)
    .filter(key => key.startsWith('vaultsecure_'))
    .forEach(key => localStorage.removeItem(key));
}
