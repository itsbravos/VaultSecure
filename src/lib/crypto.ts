/**
 * Web Crypto API implementation for End-to-End Encryption (E2EE)
 * Algorithm: PBKDF2 with SHA-256 (250,000 iterations) + AES-256-GCM (12-byte IV)
 */

import { EncryptedVaultPayload } from '../types';

const PBKDF2_ITERATIONS = 250000;

/**
 * Generate cryptographically secure random bytes
 */
export function getRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return array;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 */
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive AES-256-GCM CryptoKey from Master Password using PBKDF2
 */
export async function deriveMasterKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  // Import raw password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive AES-GCM Key
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // Non-extractable for memory protection
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt arbitrary JSON serializable object using AES-256-GCM
 */
export async function encryptVaultData<T>(
  data: T,
  masterKey: CryptoKey,
  salt: Uint8Array
): Promise<EncryptedVaultPayload> {
  const encoder = new TextEncoder();
  const jsonString = JSON.stringify(data);
  const plaintextBytes = encoder.encode(jsonString);

  // 12-byte random IV for GCM
  const iv = getRandomBytes(12);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    masterKey,
    plaintextBytes
  );

  return {
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertextBuffer),
    salt: bufferToBase64(salt),
    version: 1,
  };
}

/**
 * Decrypt AES-256-GCM encrypted payload back into typed data object
 */
export async function decryptVaultData<T>(
  payload: EncryptedVaultPayload,
  masterKey: CryptoKey
): Promise<T> {
  const iv = base64ToBuffer(payload.iv);
  const ciphertext = base64ToBuffer(payload.ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    masterKey,
    ciphertext
  );

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonString) as T;
}

/**
 * Hash string using SHA-256 (for verifying passwords or fingerprints without exposing raw data)
 */
export async function hashSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Options for Password Generation
 */
export interface PasswordGeneratorOptions {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
  avoidAmbiguous: boolean; // e.g. 1, l, I, 0, O
  passphraseMode: boolean;
  wordCount: number;
  wordSeparator: string;
}

const UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const UPPERCASE_ALL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE_CHARS = 'abcdefghijkmnopqrstuvwxyz';
const LOWERCASE_ALL = 'abcdefghijklmnopqrstuvwxyz';
const NUMBER_CHARS = '23456789';
const NUMBER_ALL = '0123456789';
const SYMBOL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

const PASSPHRASE_WORDS = [
  'alfa', 'bravo', 'caveira', 'diamante', 'esmeralda', 'falcao', 'guardiao',
  'horizonte', 'impulsos', 'jardim', 'kilo', 'laguna', 'misterio', 'nebulosa',
  'orion', 'prisma', 'quartzo', 'radar', 'safira', 'tempestade', 'universo',
  'vanguarda', 'zenite', 'ancora', 'bussola', 'cascata', 'dragao', 'eclipse',
  'fortaleza', 'galaxia', 'helio', 'impacto', 'jupiter', 'kronos', 'lumens'
];

/**
 * Secure password generator using window.crypto
 */
export function generatePassword(options: PasswordGeneratorOptions): string {
  if (options.passphraseMode) {
    const selectedWords: string[] = [];
    const randomArray = new Uint32Array(options.wordCount);
    window.crypto.getRandomValues(randomArray);
    for (let i = 0; i < options.wordCount; i++) {
      const index = randomArray[i] % PASSPHRASE_WORDS.length;
      selectedWords.push(PASSPHRASE_WORDS[index]);
    }
    return selectedWords.join(options.wordSeparator || '-');
  }

  let charset = '';
  if (options.useUppercase) {
    charset += options.avoidAmbiguous ? UPPERCASE_CHARS : UPPERCASE_ALL;
  }
  if (options.useLowercase) {
    charset += options.avoidAmbiguous ? LOWERCASE_CHARS : LOWERCASE_ALL;
  }
  if (options.useNumbers) {
    charset += options.avoidAmbiguous ? NUMBER_CHARS : NUMBER_ALL;
  }
  if (options.useSymbols) {
    charset += SYMBOL_CHARS;
  }

  if (!charset) {
    charset = LOWERCASE_ALL + NUMBER_ALL;
  }

  const randomValues = new Uint32Array(options.length);
  window.crypto.getRandomValues(randomValues);

  let result = '';
  for (let i = 0; i < options.length; i++) {
    result += charset[randomValues[i] % charset.length];
  }

  return result;
}

/**
 * Calculate Password Entropy and Strength
 */
export function calculatePasswordStrength(password: string): {
  score: number; // 0 to 100
  label: 'Muito Fraca' | 'Fraca' | 'Média' | 'Forte' | 'Excelente';
  color: string;
  entropy: number; // bits
  crackTime: string;
} {
  if (!password) {
    return { score: 0, label: 'Muito Fraca', color: 'text-red-500', entropy: 0, crackTime: 'Instantâneo' };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

  if (poolSize === 0) poolSize = 26;

  // Shannon Entropy: E = L * log2(R)
  const entropy = Math.round(password.length * Math.log2(poolSize));

  let score = Math.min(100, Math.round((entropy / 90) * 100));

  // Deductions for repetitive or obvious patterns
  if (/^[0-9]+$/.test(password) || /^[a-zA-Z]+$/.test(password)) {
    score = Math.max(10, score - 20);
  }

  let label: 'Muito Fraca' | 'Fraca' | 'Média' | 'Forte' | 'Excelente' = 'Muito Fraca';
  let color = 'bg-red-500 text-red-500';
  let crackTime = 'Instantâneo';

  if (entropy < 28) {
    label = 'Muito Fraca';
    color = 'text-red-500 bg-red-500';
    crackTime = 'Poucos segundos';
  } else if (entropy < 45) {
    label = 'Fraca';
    color = 'text-orange-500 bg-orange-500';
    crackTime = 'Alguns minutos';
  } else if (entropy < 65) {
    label = 'Média';
    color = 'text-yellow-500 bg-yellow-500';
    crackTime = 'Algumas semanas';
  } else if (entropy < 85) {
    label = 'Forte';
    color = 'text-emerald-500 bg-emerald-500';
    crackTime = 'Vários anos';
  } else {
    label = 'Excelente';
    color = 'text-emerald-400 bg-emerald-400';
    crackTime = 'Milhares de anos';
  }

  return { score, label, color, entropy, crackTime };
}

/**
 * Common known leaked passwords list (Local dictionary check)
 */
export const COMMON_LEAKED_PASSWORDS = new Set([
  '123456', '123456789', 'qwerty', 'password', '12345678', '12345', '1234567',
  '1234567890', 'admin', 'welcome', 'p@ssword', 'senha123', 'senha', 'mudar123',
  'brasil', '123456a', 'iloveyou', 'sunshine', 'princess', 'dragon', '000000',
  '111111', '123321', '666666', '888888', '123123', 'password123', 'abc123456',
  'admin123', 'letmein', 'charlie', 'monkey', 'football', 'shadow', 'master',
  'superman', 'jordan', 'michael', 'trustno1', '1234567890a', 'senha1234',
  'mudar1234', 'trocar123', 'empresa123', 'aluno123', 'teste123', 'acesso123'
]);

/**
 * Check if password is in common local leaked list
 */
export function isLocalLeakedPassword(password: string): boolean {
  if (!password) return false;
  const clean = password.trim().toLowerCase();
  if (COMMON_LEAKED_PASSWORDS.has(clean)) return true;
  return false;
}

// In-memory cache for API breach checks
const breachCache = new Map<string, boolean>();

/**
 * Check if password exists in online breach database (HaveIBeenPwned k-Anonymity API)
 * Zero knowledge: Only sends first 5 characters of SHA-1 hash to preserve privacy.
 */
export async function checkPasswordBreachOnline(password: string): Promise<boolean> {
  if (!password) return false;
  
  if (isLocalLeakedPassword(password)) {
    return true;
  }

  if (breachCache.has(password)) {
    return breachCache.get(password)!;
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha1Hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = sha1Hex.substring(0, 5);
    const suffix = sha1Hex.substring(5);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      breachCache.set(password, false);
      return false;
    }

    const text = await response.text();
    const lines = text.split('\n');
    const isLeaked = lines.some(line => line.startsWith(suffix));

    breachCache.set(password, isLeaked);
    return isLeaked;
  } catch (err) {
    // If offline or network error, fallback to local check result
    const localCheck = isLocalLeakedPassword(password);
    breachCache.set(password, localCheck);
    return localCheck;
  }
}

