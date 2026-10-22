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
  KDF_ITERATIONS,
  LEGACY_KDF_ITERATIONS,
  calculatePasswordStrength,
  decryptVaultData,
  deriveMasterKey,
  encryptVaultData,
  generateRandomKey,
  getRandomBytes,
  isLocalLeakedPassword,
  iterationsOfKey,
} from './crypto';

const STORAGE_KEYS = {
  VAULT_ENCRYPTED: 'vaultsecure_items_encrypted',
  VAULT_SETTINGS: 'vaultsecure_settings',
  VAULT_SETTINGS_SECURE: 'vaultsecure_settings_secure',
  VAULT_SALT: 'vaultsecure_master_salt',
  VAULT_SALT_VERIFIER: 'vaultsecure_pass_verifier',
  DURESS_VERIFIER: 'vaultsecure_duress_verifier',
  KDF_ITERATIONS: 'vaultsecure_kdf_iterations',
  FAILED_ATTEMPTS: 'vaultsecure_failed_attempts',
  IS_INITIALIZED: 'vaultsecure_is_initialized',
};

const VAULT_CHECK = 'VAULT_VERIFIED_OK';
const DURESS_CHECK = 'VAULT_DURESS_OK';

/**
 * Settings that only ever live inside the encrypted blob. Everything else (theme,
 * language, auto-lock...) must be readable on the lock screen, so it stays plain.
 * The 2FA/certificate flags are here too: whoever opens the vault with the duress
 * password must not be able to tell they were ever turned on.
 */
const SECURE_SETTING_KEYS = [
  'require2FA',
  'totpSecret',
  'totpVerified',
  'backupCodes',
  'requireDigitalCert',
  'digitalCertificates',
  'duressEnabled',
  'duressPassword',
] as const;
type SecureSettings = Pick<VaultSettings, (typeof SECURE_SETTING_KEYS)[number]>;

const splitSettings = (settings: Partial<VaultSettings>) => {
  const plain: Partial<VaultSettings> = { ...settings };
  const secure: Partial<SecureSettings> = {};
  for (const k of SECURE_SETTING_KEYS) {
    if (k in plain) (secure as any)[k] = plain[k];
    delete plain[k];
  }
  delete plain.duressPasswordHash;
  return { plain, secure };
};

/** PBKDF2 iterations the local vault key is derived with */
export function getStoredKdfIterations(): number {
  return Number(localStorage.getItem(STORAGE_KEYS.KDF_ITERATIONS)) || LEGACY_KDF_ITERATIONS;
}

const checkVerifier = async (raw: string | null, key: CryptoKey, expected: string): Promise<boolean> => {
  if (!raw) return false;
  try {
    const data = await decryptVaultData<{ check: string }>(JSON.parse(raw), key);
    return data?.check === expected;
  } catch {
    return false;
  }
};

/**
 * The duress verifier always exists, built from a random key while duress is off,
 * so its presence alone says nothing. It is derived like the master key (same salt
 * and iterations), so unlocking still costs a single PBKDF2 run.
 */
async function buildDuressVerifier(
  duressPassword: string | undefined,
  salt: Uint8Array,
  iterations: number
): Promise<EncryptedVaultPayload> {
  const key = duressPassword ? await deriveMasterKey(duressPassword, salt, iterations) : await generateRandomKey();
  const payload = await encryptVaultData({ check: DURESS_CHECK }, key, salt);
  return { ...payload, kdfIterations: iterations };
}

/* ------------------------------------------------- encrypted settings state */

// Key the encrypted settings are written with while the real vault is open.
// Null when locked or in duress mode: then only the plain part is saved.
let settingsKey: { key: CryptoKey; salt: Uint8Array } | null = null;
let settingsWrites: Promise<void> = Promise.resolve();
let duressBuiltFrom: string | undefined | null = null; // null = unknown, rebuild on next save

export function activateSettingsKey(key: CryptoKey, salt: Uint8Array): void {
  settingsKey = { key, salt };
}

export function deactivateSettingsKey(): void {
  settingsKey = null;
  duressBuiltFrom = null;
}

async function readSecureSettings(key: CryptoKey): Promise<Partial<SecureSettings> | null> {
  const raw = localStorage.getItem(STORAGE_KEYS.VAULT_SETTINGS_SECURE);
  if (!raw) return null;
  return decryptVaultData<Partial<SecureSettings>>(JSON.parse(raw), key);
}

async function writeSettings(settings: VaultSettings, target: { key: CryptoKey; salt: Uint8Array }): Promise<void> {
  const { secure } = splitSettings(settings);
  const encrypted = await encryptVaultData(secure, target.key, target.salt);
  localStorage.setItem(STORAGE_KEYS.VAULT_SETTINGS_SECURE, JSON.stringify(encrypted));

  const duressPassword = secure.duressEnabled ? secure.duressPassword : undefined;
  if (duressPassword !== duressBuiltFrom || !localStorage.getItem(STORAGE_KEYS.DURESS_VERIFIER)) {
    const verifier = await buildDuressVerifier(duressPassword, target.salt, getStoredKdfIterations());
    localStorage.setItem(STORAGE_KEYS.DURESS_VERIFIER, JSON.stringify(verifier));
    duressBuiltFrom = duressPassword;
  }
}

/**
 * Full settings for an opened vault. Also moves secrets left in plain text by
 * older versions into the encrypted blob. A legacy duress hash can't be turned
 * back into a password, so duress is switched off and `duressNeedsReset` is set.
 */
export async function decryptVaultSettings(
  key: CryptoKey,
  salt: Uint8Array
): Promise<{ settings: VaultSettings; duressNeedsReset: boolean }> {
  await settingsWrites;
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT_SETTINGS) || '{}') as Partial<VaultSettings>;
  const stored = await readSecureSettings(key);
  const legacy = splitSettings(raw);
  const duressNeedsReset = !!raw.duressPasswordHash && !stored?.duressPassword;

  const secure: Partial<SecureSettings> = { ...legacy.secure, ...(stored || {}) };
  if (duressNeedsReset) {
    secure.duressEnabled = false;
    delete secure.duressPassword;
  }
  const settings: VaultSettings = { ...DEFAULT_SETTINGS, ...legacy.plain, ...secure };

  const hasPlainSecrets = Object.keys(legacy.secure).length > 0 || 'duressPasswordHash' in raw;
  if (!stored || hasPlainSecrets || !localStorage.getItem(STORAGE_KEYS.DURESS_VERIFIER)) {
    localStorage.setItem(STORAGE_KEYS.VAULT_SETTINGS, JSON.stringify(legacy.plain));
    await writeSettings(settings, { key, salt });
  }
  return { settings, duressNeedsReset };
}

/** Save full settings with an explicit key, before the vault is fully open (e.g. a used backup code) */
export function saveDecryptedSettings(settings: VaultSettings, key: CryptoKey, salt: Uint8Array): Promise<void> {
  settingsWrites = settingsWrites
    .then(() => writeSettings(settings, { key, salt }))
    .catch(err => console.error('Error saving encrypted settings:', err));
  return settingsWrites;
}

/* --------------------------------------------------------- failed attempts */
// Kept on disk so reloading the page doesn't reset the self-destruct counter.

export function loadFailedAttempts(): number {
  return Number(localStorage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS)) || 0;
}

export function saveFailedAttempts(count: number): void {
  if (count > 0) localStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, String(count));
  else localStorage.removeItem(STORAGE_KEYS.FAILED_ATTEMPTS);
}

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
  enableOnlineFavicons: false, // sends every saved domain to Google; opt-in
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
  localStorage.setItem(STORAGE_KEYS.KDF_ITERATIONS, String(KDF_ITERATIONS));
  saveFailedAttempts(0);

  const masterKey = await deriveMasterKey(masterPassword, salt);

  // Store verifier token to quickly validate password on unlock without decrypting full database
  const verifierToken = await encryptVaultData({ check: VAULT_CHECK }, masterKey, salt);
  localStorage.setItem(STORAGE_KEYS.VAULT_SALT_VERIFIER, JSON.stringify(verifierToken));

  const encryptedItems = await encryptVaultData(initialItems, masterKey, salt);
  localStorage.setItem(STORAGE_KEYS.VAULT_ENCRYPTED, JSON.stringify(encryptedItems));

  const settings: VaultSettings = { ...DEFAULT_SETTINGS, ...initialSettings };
  localStorage.setItem(STORAGE_KEYS.VAULT_SETTINGS, JSON.stringify(splitSettings(settings).plain));
  duressBuiltFrom = null;
  await writeSettings(settings, { key: masterKey, salt });

  localStorage.setItem(STORAGE_KEYS.IS_INITIALIZED, 'true');

  return { masterKey, salt };
}

/**
 * Verify the Master Password (or the duress password) with one key derivation.
 * A vault still on the old iteration count is re-keyed on the spot; the old key
 * comes back as `legacyKey` so sync files written before the upgrade stay readable.
 */
export async function verifyMasterPassword(password: string): Promise<{
  valid: boolean;
  isDuress?: boolean;
  masterKey: CryptoKey | null;
  salt: Uint8Array | null;
  legacyKey?: CryptoKey;
}> {
  const invalid = { valid: false, masterKey: null, salt: null };
  try {
    const verifierRaw = localStorage.getItem(STORAGE_KEYS.VAULT_SALT_VERIFIER);
    if (!verifierRaw) return invalid;

    const salt = getStoredMasterSalt();
    const iterations = getStoredKdfIterations();
    const key = await deriveMasterKey(password, salt, iterations);

    if (await checkVerifier(verifierRaw, key, VAULT_CHECK)) {
      if (iterations < KDF_ITERATIONS) {
        const upgraded = await deriveMasterKey(password, salt);
        await rekeyLocalVaults(key, upgraded, salt);
        return { valid: true, isDuress: false, masterKey: upgraded, salt, legacyKey: key };
      }
      return { valid: true, isDuress: false, masterKey: key, salt };
    }

    if (await checkVerifier(localStorage.getItem(STORAGE_KEYS.DURESS_VERIFIER), key, DURESS_CHECK)) {
      return { valid: true, isDuress: true, masterKey: key, salt };
    }
    return invalid;
  } catch (err) {
    return invalid;
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
 * Load the plain (lock-screen readable) settings. Secrets come from decryptVaultSettings.
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
 * Save settings: the plain part right away, the secrets encrypted in the
 * background — only while the real vault is open (see activateSettingsKey).
 */
export function saveVaultSettings(settings: VaultSettings): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.VAULT_SETTINGS, JSON.stringify(splitSettings(settings).plain));
  const target = settingsKey;
  if (!target) return settingsWrites;
  settingsWrites = settingsWrites
    .then(() => writeSettings(settings, target))
    .catch(err => console.error('Error saving encrypted settings:', err));
  return settingsWrites;
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
  const currentKey = await deriveMasterKey(currentPassword, currentSalt, getStoredKdfIterations());
  const verifierRaw = localStorage.getItem(STORAGE_KEYS.VAULT_SALT_VERIFIER);
  if (verifierRaw && !(await checkVerifier(verifierRaw, currentKey, VAULT_CHECK))) {
    throw new Error('Senha mestra atual incorreta.');
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
 * Re-encrypt everything on this device under a new key + salt: all vaults, the
 * encrypted settings and both verifiers. Everything is decrypted and re-encrypted
 * first and written in one synchronous pass, so a wrong old key (or a crash
 * mid-way) can't leave the vault half under each key.
 */
export async function rekeyLocalVaults(oldKey: CryptoKey, newKey: CryptoKey, newSalt: Uint8Array): Promise<void> {
  await settingsWrites;
  const vaults = await loadAllVaults(oldKey);
  const secure = await readSecureSettings(oldKey);
  const iterations = iterationsOfKey(newKey) ?? KDF_ITERATIONS;

  const writes: [string, string][] = [
    [STORAGE_KEYS.VAULT_SALT, saltToBase64(newSalt)],
    [STORAGE_KEYS.KDF_ITERATIONS, String(iterations)],
    [STORAGE_KEYS.VAULT_SALT_VERIFIER, JSON.stringify(await encryptVaultData({ check: VAULT_CHECK }, newKey, newSalt))],
  ];
  const duressPassword = secure?.duressEnabled ? secure.duressPassword : undefined;
  writes.push([STORAGE_KEYS.DURESS_VERIFIER, JSON.stringify(await buildDuressVerifier(duressPassword, newSalt, iterations))]);
  if (secure) {
    writes.push([STORAGE_KEYS.VAULT_SETTINGS_SECURE, JSON.stringify(await encryptVaultData(secure, newKey, newSalt))]);
  }
  for (const id of VAULT_IDS) {
    // Don't materialize vaults that never existed
    if (vaults[id].length > 0 || localStorage.getItem(vaultStorageKey(id))) {
      writes.push([vaultStorageKey(id), JSON.stringify(await encryptVaultData(vaults[id], newKey, newSalt))]);
    }
  }

  writes.forEach(([k, v]) => localStorage.setItem(k, v));
  duressBuiltFrom = duressPassword;
  if (settingsKey) settingsKey = { key: newKey, salt: newSalt };
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
  deactivateSettingsKey();
  Object.keys(localStorage)
    .filter(key => key.startsWith('vaultsecure_'))
    .forEach(key => localStorage.removeItem(key));
}
