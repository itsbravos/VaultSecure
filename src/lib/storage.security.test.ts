import { describe, it, expect, beforeEach } from 'vitest';

class MemoryStorage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { return this.data.has(k) ? this.data.get(k)! : null; }
  setItem(k: string, v: string) { this.data.set(k, String(v)); }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
}
(globalThis as any).localStorage = new MemoryStorage();

// Imported after localStorage exists
const storage = await import('./storage');
const crypto = await import('./crypto');

const PASSWORD = 'senha-mestra-forte-123';
const DURESS = 'senha-de-coacao-456';
const plainDump = () => JSON.stringify(Object.fromEntries([...Array(localStorage.length)].map((_, i) => [localStorage.key(i), localStorage.getItem(localStorage.key(i)!)])));

beforeEach(() => {
  localStorage.clear();
  storage.deactivateSettingsKey();
});

describe('encrypted settings', () => {
  it('keeps 2FA seed, backup codes and certificate keys out of plain storage', async () => {
    const { masterKey, salt } = await storage.initializeNewVault(PASSWORD, {
      require2FA: true,
      totpSecret: 'JBSWY3DPEHPK3PXP',
      backupCodes: ['AAAAA-BBBBB'],
      digitalCertificates: [{ privateKeyPem: '-----BEGIN PRIVATE KEY-----SEGREDO' } as any],
    });

    const dump = plainDump();
    expect(dump).not.toContain('JBSWY3DPEHPK3PXP');
    expect(dump).not.toContain('AAAAA-BBBBB');
    expect(dump).not.toContain('SEGREDO');
    expect(storage.loadVaultSettings().require2FA).toBe(false);

    const { settings } = await storage.decryptVaultSettings(masterKey, salt);
    expect(settings.require2FA).toBe(true);
    expect(settings.totpSecret).toBe('JBSWY3DPEHPK3PXP');
    expect(settings.backupCodes).toEqual(['AAAAA-BBBBB']);
  });

  it('does not touch the encrypted part while locked', async () => {
    const { masterKey, salt } = await storage.initializeNewVault(PASSWORD, { totpSecret: 'SECRETO' });
    await storage.saveVaultSettings({ ...storage.loadVaultSettings(), theme: 'light' });

    const { settings } = await storage.decryptVaultSettings(masterKey, salt);
    expect(settings.totpSecret).toBe('SECRETO');
    expect(settings.theme).toBe('light');
  });
});

describe('legacy vault migration', () => {
  it('upgrades to 600k iterations and moves plaintext secrets into the encrypted blob', async () => {
    // A vault as older versions wrote it: 250k iterations, secrets in plain JSON
    const salt = crypto.getRandomBytes(16);
    const oldKey = await crypto.deriveMasterKey(PASSWORD, salt, crypto.LEGACY_KDF_ITERATIONS);
    const strip = (p: any) => ({ ...p, kdfIterations: undefined });
    localStorage.setItem('vaultsecure_master_salt', storage.saltToBase64(salt));
    localStorage.setItem('vaultsecure_pass_verifier', JSON.stringify(strip(await crypto.encryptVaultData({ check: 'VAULT_VERIFIED_OK' }, oldKey, salt))));
    localStorage.setItem('vaultsecure_items_encrypted', JSON.stringify(strip(await crypto.encryptVaultData([{ id: 'a', title: 'Banco' }], oldKey, salt))));
    localStorage.setItem('vaultsecure_settings', JSON.stringify({ require2FA: true, totpSecret: 'LEGADO', duressEnabled: true, duressPasswordHash: 'abc' }));
    localStorage.setItem('vaultsecure_is_initialized', 'true');

    const res = await storage.verifyMasterPassword(PASSWORD);
    expect(res.valid).toBe(true);
    expect(res.legacyKey).toBeDefined();
    expect(crypto.iterationsOfKey(res.masterKey!)).toBe(crypto.KDF_ITERATIONS);
    expect(storage.getStoredKdfIterations()).toBe(crypto.KDF_ITERATIONS);

    const items = await storage.loadEncryptedVaultItems(res.masterKey!);
    expect(items[0].title).toBe('Banco');

    const { settings, duressNeedsReset } = await storage.decryptVaultSettings(res.masterKey!, res.salt!);
    expect(settings.totpSecret).toBe('LEGADO');
    expect(settings.duressEnabled).toBe(false);
    expect(duressNeedsReset).toBe(true);
    expect(plainDump()).not.toContain('LEGADO');
    expect(plainDump()).not.toContain('duressPasswordHash');

    // Second unlock: already upgraded, no legacy key
    const again = await storage.verifyMasterPassword(PASSWORD);
    expect(again.valid).toBe(true);
    expect(again.legacyKey).toBeUndefined();
  });
});

describe('duress password', () => {
  it('opens the decoy, and its verifier exists (as noise) even when duress is off', async () => {
    const { masterKey, salt } = await storage.initializeNewVault(PASSWORD);
    const decoyBefore = localStorage.getItem('vaultsecure_duress_verifier');
    expect(decoyBefore).toBeTruthy();
    expect((await storage.verifyMasterPassword(DURESS)).valid).toBe(false);

    const { settings } = await storage.decryptVaultSettings(masterKey, salt);
    await storage.saveDecryptedSettings({ ...settings, duressEnabled: true, duressPassword: DURESS }, masterKey, salt);
    expect(plainDump()).not.toContain(DURESS);

    const duress = await storage.verifyMasterPassword(DURESS);
    expect(duress).toMatchObject({ valid: true, isDuress: true });
    expect((await storage.verifyMasterPassword(PASSWORD)).isDuress).toBe(false);
  });

  it('keeps working after the master password changes', async () => {
    const { masterKey, salt } = await storage.initializeNewVault(PASSWORD, { totpSecret: 'X2FA' });
    const { settings } = await storage.decryptVaultSettings(masterKey, salt);
    await storage.saveDecryptedSettings({ ...settings, duressEnabled: true, duressPassword: DURESS }, masterKey, salt);

    const changed = await storage.changeMasterPassword(PASSWORD, 'nova-senha-mestra-789', [], salt);
    expect((await storage.verifyMasterPassword(PASSWORD)).valid).toBe(false);
    expect((await storage.verifyMasterPassword(DURESS)).isDuress).toBe(true);

    const after = await storage.decryptVaultSettings(changed.masterKey, changed.salt);
    expect(after.settings.totpSecret).toBe('X2FA');
  });
});

describe('failed attempts', () => {
  it('survive a reload', () => {
    storage.saveFailedAttempts(3);
    expect(storage.loadFailedAttempts()).toBe(3);
    storage.saveFailedAttempts(0);
    expect(storage.loadFailedAttempts()).toBe(0);
  });
});

describe('random helpers', () => {
  it('randomInt stays in range and randomString uses the alphabet', () => {
    for (let i = 0; i < 500; i++) {
      const n = crypto.randomInt(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
    }
    expect(crypto.randomString(32, 'AB')).toMatch(/^[AB]{32}$/);
  });
});

describe('sync across the iteration upgrade', () => {
  it('reads a file written with the old key and asks for a link when it has no matching key', async () => {
    const engine = await import('./syncEngine');
    const { masterKey, salt } = await storage.initializeNewVault(PASSWORD);
    const oldKey = await crypto.deriveMasterKey(PASSWORD, salt, crypto.LEGACY_KDF_ITERATIONS);
    const remote = { id: 'r', title: 'De outro aparelho', category: 'login', tags: [], favorite: false, customFields: [], createdAt: 1, updatedAt: 1 };
    const file = await engine.buildSnapshotPayload(
      { pessoal: [remote], trabalho: [], compartilhado: [] } as any,
      { pessoal: {}, trabalho: {}, compartilhado: {} } as any,
      oldKey,
      salt
    );
    expect(file.kdfIterations).toBe(crypto.LEGACY_KDF_ITERATIONS);

    engine.setLegacySyncKey(null);
    await expect(engine.syncWithPayloads([file], masterKey, salt)).rejects.toBeInstanceOf(engine.SyncNeedsLinkError);

    engine.setLegacySyncKey(oldKey);
    const outcome = await engine.syncWithPayloads([file], masterKey, salt);
    expect(outcome.vaults.pessoal.map(i => i.id)).toContain('r');
    expect(outcome.payload.kdfIterations).toBe(crypto.KDF_ITERATIONS); // rewritten with the strong key
    engine.setLegacySyncKey(null);
  });
});
