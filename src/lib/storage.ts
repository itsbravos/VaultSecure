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
  theme: 'dark',
  accentColor: 'emerald',
  quickActionIds: ['generate_pass', 'add_login', 'add_card', 'autofill_sim', 'audit_view', 'cert_view', 'backup_view'],
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
  initialSettings: Partial<VaultSettings> = {}
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

  // Default seed items for first time user
  const initialItems: VaultItem[] = [
    {
      id: 'welcome-item-1',
      title: 'Minha Conta de Email Principal',
      category: 'login',
      username: 'usuario@exemplo.com.br',
      password: 'm9$Xk#2!pL9vQ1aZ',
      url: 'https://mail.google.com',
      notes: 'Senha do e-mail com autenticação de 2 fatores ativada.',
      tags: ['Email', 'Pessoal', 'Prioritário'],
      favorite: true,
      customFields: [],
      createdAt: Date.now() - 86400000 * 10,
      updatedAt: Date.now() - 86400000 * 10,
    },
    {
      id: 'welcome-item-2',
      title: 'Cartão de Crédito Corporativo',
      category: 'card',
      cardHolder: 'USUARIO SILVA',
      cardNumber: '4532 •••• •••• 8812',
      cardExpiry: '11/28',
      cardCvc: '892',
      notes: 'Cartão da empresa para serviços em nuvem.',
      tags: ['Finanças', 'Trabalho'],
      favorite: true,
      customFields: [
        { id: 'f1', label: 'Limite', value: 'R$ 15.000', type: 'text' },
      ],
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'welcome-item-3',
      title: 'Chave do Servidor SSH Prod',
      category: 'api_key',
      username: 'root',
      password: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC8...',
      url: 'https://cloud.provedor.com',
      notes: 'Acesso root ao servidor de produção.',
      tags: ['Servidores', 'Infra'],
      favorite: false,
      customFields: [],
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
    },
  ];

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
export function generateSecurityAuditReport(items: VaultItem[]): SecurityReport {
  let totalScoreSum = 0;
  const weakItems: VaultItem[] = [];
  const leakedItems: VaultItem[] = [];
  const oldItems: VaultItem[] = [];
  const passwordCounts: Record<string, VaultItem[]> = {};

  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

  items.forEach(item => {
    if (item.password) {
      const strength = calculatePasswordStrength(item.password);
      totalScoreSum += strength.score;

      if (strength.score < 50) {
        weakItems.push(item);
      }

      if (isLocalLeakedPassword(item.password)) {
        leakedItems.push(item);
      }

      // Track password reuse
      if (!passwordCounts[item.password]) {
        passwordCounts[item.password] = [];
      }
      passwordCounts[item.password].push(item);
    } else {
      totalScoreSum += 80; // Card or note without direct password
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
  const avgScore = total > 0 ? Math.round(totalScoreSum / total) : 100;

  // Deduct for weak, leaked, or reused passwords
  let finalScore = avgScore;
  if (weakItems.length > 0) finalScore -= Math.min(25, weakItems.length * 8);
  if (reusedItems.length > 0) finalScore -= Math.min(25, reusedItems.length * 8);
  if (leakedItems.length > 0) finalScore -= Math.min(30, leakedItems.length * 15);

  finalScore = Math.max(0, Math.min(100, finalScore));

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
  currentItems: VaultItem[],
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

  // 2. Generate new salt & derive new masterKey
  const newSalt = getRandomBytes(16);
  let binary = '';
  for (let i = 0; i < newSalt.length; i++) {
    binary += String.fromCharCode(newSalt[i]);
  }
  localStorage.setItem(STORAGE_KEYS.VAULT_SALT, btoa(binary));

  const newMasterKey = await deriveMasterKey(newPassword, newSalt);

  // 3. Save new verifier
  const newVerifier = await encryptVaultData({ check: 'VAULT_VERIFIED_OK' }, newMasterKey, newSalt);
  localStorage.setItem(STORAGE_KEYS.VAULT_SALT_VERIFIER, JSON.stringify(newVerifier));

  // 4. Re-encrypt current vault items with new key
  await saveEncryptedVaultItems(currentItems, newMasterKey, newSalt);

  return { masterKey: newMasterKey, salt: newSalt };
}

/**
 * Self-destruct: Clear all local storage data completely
 */
export function clearAllVaultData(): void {
  localStorage.removeItem(STORAGE_KEYS.VAULT_ENCRYPTED);
  localStorage.removeItem(STORAGE_KEYS.VAULT_SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.VAULT_SALT);
  localStorage.removeItem(STORAGE_KEYS.VAULT_SALT_VERIFIER);
  localStorage.removeItem(STORAGE_KEYS.IS_INITIALIZED);
}
