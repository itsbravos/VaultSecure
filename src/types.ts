export type ItemCategory = 'login' | 'card' | 'note' | 'certificate' | 'api_key' | string;

export interface CustomCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface PasswordHistoryEntry {
  id: string;
  password: string;
  updatedAt: number;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'password' | 'hidden';
}

export interface VaultAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string; // Base64 data URL encrypted inside payload
  createdAt: number;
}

export interface VaultItem {
  id: string;
  title: string;
  category: ItemCategory;
  username?: string;
  email?: string;
  password?: string;
  passwordHistory?: PasswordHistoryEntry[]; // Version history for password
  url?: string;
  notes?: string;
  tags: string[];
  favorite: boolean;
  totpSecret?: string; // Optional TOTP secret for the specific account
  customFields: CustomField[];
  attachments?: VaultAttachment[]; // Encrypted file attachments (PDFs, RG photos, notes)
  createdAt: number;
  updatedAt: number;
  // Card specific
  cardNumber?: string;
  cardExpiry?: string;
  cardCvc?: string;
  cardHolder?: string;
  // Certificate specific
  certIssuer?: string;
  certSubject?: string;
  certValidUntil?: string;
  certFingerprint?: string;
}

export interface DigitalCertConfig {
  id: string;
  name: string;
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  thumbprint: string;
  publicKeyPem: string;
  privateKeyPem?: string; // Stored encrypted inside setting if generated locally
  keyType: 'RSA-2048' | 'ECDSA-P256';
  isDefault: boolean;
}

export interface VaultSettings {
  userName?: string;
  require2FA: boolean;
  totpSecret: string; // Base32 TOTP secret for Master 2FA
  totpVerified: boolean;
  backupCodes: string[];
  
  requireDigitalCert: boolean;
  digitalCertificates: DigitalCertConfig[];
  
  autoLockMinutes: number; // 0 = never, 1, 5, 15, 30
  clipboardClearSeconds: number; // 10, 20, 30, 60
  selfDestructAttempts: number; // 0 = disabled, 3, 5, 10
  theme: 'dark' | 'slate' | 'beige' | 'light';
  accentColor?: 'emerald' | 'cyan' | 'blue' | 'purple' | 'amber' | 'red';

  customCategories?: CustomCategory[];
  managedTags?: string[];
  quickActionIds?: string[];
  tourCompleted?: boolean; // first-run guided tour was finished or skipped
  language?: 'pt' | 'en'; // unset = English
  languageChosen?: boolean; // asked once, right after the first unlock

  // Auto-Fill Desktop Companion & Form Listener Settings
  autoFillAutoSubmit?: boolean;

  // Privacy & Network Settings
  enableOnlineFavicons?: boolean;

  // Duress & Multi-Vault Settings
  duressEnabled?: boolean;
  duressPassword?: string; // only ever stored inside the encrypted settings, to rebuild the duress verifier on re-key
  duressPasswordHash?: string; // legacy SHA-256, dropped on the next unlock
  activeVaultId?: string; // 'pessoal' | 'trabalho' | 'compartilhado'
}

export interface EncryptedVaultPayload {
  iv: string; // Base64
  ciphertext: string; // Base64
  salt: string; // Base64
  version: number;
  kdfIterations?: number; // PBKDF2 iterations of the key; absent = 250,000 (older files)
}

export interface AuthSession {
  isVaultInitialized: boolean;
  isUnlocked: boolean;
  isDuressMode?: boolean; // True if unlocked via Duress Coercion password
  masterKey: CryptoKey | null;
  salt: Uint8Array | null;
  lastActivity: number;
  step: 'master_pass' | 'totp_2fa' | 'digital_cert' | 'unlocked';
  passedMasterPass: boolean;
  passedTotp: boolean;
  passedCert: boolean;
  failedAttempts: number;
}

export interface SecurityReport {
  score: number; // 0-100
  total: number;
  weakCount: number;
  reusedCount: number;
  leakedCount: number;
  oldCount: number;
  missing2faCount: number;
  weakItems: VaultItem[];
  reusedItems: VaultItem[];
  leakedItems: VaultItem[];
  oldItems: VaultItem[];
}
