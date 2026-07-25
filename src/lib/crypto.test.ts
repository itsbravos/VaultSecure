import { describe, expect, it } from 'vitest';
import {
  bufferToBase64,
  base64ToBuffer,
  calculatePasswordStrength,
  decryptVaultData,
  deriveMasterKey,
  encryptVaultData,
  generatePassword,
  getRandomBytes,
  isLocalLeakedPassword,
} from './crypto';

describe('getRandomBytes', () => {
  it('returns the requested length', () => {
    expect(getRandomBytes(16)).toHaveLength(16);
  });

  it('does not produce the same bytes twice', () => {
    const a = getRandomBytes(32);
    const b = getRandomBytes(32);
    expect(a).not.toEqual(b);
  });
});

describe('base64 round trip', () => {
  it('recovers the original bytes', () => {
    const original = getRandomBytes(24);
    const restored = base64ToBuffer(bufferToBase64(original));
    expect(restored).toEqual(original);
  });
});

describe('deriveMasterKey', () => {
  it('derives a non-extractable AES-GCM key', async () => {
    const salt = getRandomBytes(16);
    const key = await deriveMasterKey('correct horse battery staple', salt);
    expect(key.algorithm.name).toBe('AES-GCM');
    expect(key.extractable).toBe(false);
  });

  it('is deterministic for the same password and salt', async () => {
    const salt = getRandomBytes(16);
    const keyA = await deriveMasterKey('same-password', salt);
    const keyB = await deriveMasterKey('same-password', salt);

    // Keys are non-extractable, so compare by using them to encrypt the same
    // plaintext with the same IV and checking the ciphertext matches.
    const iv = getRandomBytes(12);
    const plaintext = new TextEncoder().encode('vaultsecure-test');
    const cipherA = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyA, plaintext);
    const cipherB = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyB, plaintext);
    expect(bufferToBase64(cipherA)).toBe(bufferToBase64(cipherB));
  });

  it('produces a different key for a different salt', async () => {
    const saltA = getRandomBytes(16);
    const saltB = getRandomBytes(16);
    const keyA = await deriveMasterKey('same-password', saltA);
    const keyB = await deriveMasterKey('same-password', saltB);

    const iv = getRandomBytes(12);
    const plaintext = new TextEncoder().encode('vaultsecure-test');
    const cipherA = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyA, plaintext);
    const cipherB = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyB, plaintext);
    expect(bufferToBase64(cipherA)).not.toBe(bufferToBase64(cipherB));
  });
});

describe('encryptVaultData / decryptVaultData', () => {
  it('round-trips arbitrary JSON data', async () => {
    const salt = getRandomBytes(16);
    const masterKey = await deriveMasterKey('my-master-password', salt);
    const data = { hello: 'world', items: [1, 2, 3] };

    const payload = await encryptVaultData(data, masterKey, salt);
    const decrypted = await decryptVaultData<typeof data>(payload, masterKey);

    expect(decrypted).toEqual(data);
  });

  it('uses a fresh random IV on every call', async () => {
    const salt = getRandomBytes(16);
    const masterKey = await deriveMasterKey('my-master-password', salt);
    const data = { hello: 'world' };

    const payloadA = await encryptVaultData(data, masterKey, salt);
    const payloadB = await encryptVaultData(data, masterKey, salt);

    expect(payloadA.iv).not.toBe(payloadB.iv);
    expect(payloadA.ciphertext).not.toBe(payloadB.ciphertext);
  });

  it('fails to decrypt with the wrong master password', async () => {
    const salt = getRandomBytes(16);
    const correctKey = await deriveMasterKey('correct-password', salt);
    const wrongKey = await deriveMasterKey('wrong-password', salt);

    const payload = await encryptVaultData({ secret: 'value' }, correctKey, salt);

    await expect(decryptVaultData(payload, wrongKey)).rejects.toThrow();
  });
});

describe('generatePassword', () => {
  it('generates a password of the requested length', () => {
    const password = generatePassword({
      length: 20,
      useUppercase: true,
      useLowercase: true,
      useNumbers: true,
      useSymbols: true,
      avoidAmbiguous: false,
      passphraseMode: false,
      wordCount: 0,
      wordSeparator: '-',
    });
    expect(password).toHaveLength(20);
  });

  it('generates a passphrase with the requested word count', () => {
    const passphrase = generatePassword({
      length: 0,
      useUppercase: false,
      useLowercase: false,
      useNumbers: false,
      useSymbols: false,
      avoidAmbiguous: false,
      passphraseMode: true,
      wordCount: 4,
      wordSeparator: '-',
    });
    expect(passphrase.split('-')).toHaveLength(4);
  });
});

describe('calculatePasswordStrength', () => {
  it('rates an empty password as the weakest possible', () => {
    expect(calculatePasswordStrength('').label).toBe('Muito Fraca');
  });

  it('rates a long mixed-character password higher than a short numeric one', () => {
    const weak = calculatePasswordStrength('123456');
    const strong = calculatePasswordStrength('C0rrect-H0rse!Battery#Staple99');
    expect(strong.entropy).toBeGreaterThan(weak.entropy);
  });
});

describe('isLocalLeakedPassword', () => {
  it('flags known common passwords regardless of case', () => {
    expect(isLocalLeakedPassword('PASSWORD')).toBe(true);
    expect(isLocalLeakedPassword('123456')).toBe(true);
  });

  it('does not flag a strong random password', () => {
    expect(isLocalLeakedPassword('Xk9$mQ2!vL7pZ4nR')).toBe(false);
  });
});
