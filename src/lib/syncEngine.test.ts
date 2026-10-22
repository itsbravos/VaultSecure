import { describe, it, expect, beforeAll } from 'vitest';
import { EncryptedVaultPayload, VaultItem } from '../types';

// Two "devices" = two separate localStorage maps swapped in and out of globalThis.
class MemoryStorage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { return this.data.has(k) ? this.data.get(k)! : null; }
  setItem(k: string, v: string) { this.data.set(k, String(v)); }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
}
const deviceA = new MemoryStorage();
const deviceB = new MemoryStorage();
const use = (device: MemoryStorage) => {
  (globalThis as any).localStorage = device;
};

// Imported after localStorage exists
let storage: typeof import('./storage');
let engine: typeof import('./syncEngine');

const login = (id: string, title: string, password: string): VaultItem => ({
  id,
  title,
  category: 'login',
  password,
  tags: [],
  favorite: false,
  customFields: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

type Session = { key: CryptoKey; salt: Uint8Array };
const PASSWORD = 'mesma-senha-nos-dois';

const open = async (device: MemoryStorage): Promise<Session> => {
  use(device);
  const res = await storage.verifyMasterPassword(PASSWORD);
  expect(res.valid).toBe(true);
  return { key: res.masterKey!, salt: res.salt! };
};

beforeAll(async () => {
  use(deviceA);
  storage = await import('./storage');
  engine = await import('./syncEngine');
  // Each device creates its own vault, so each gets its own random salt.
  // New vaults start empty, so give each one a personal item of its own.
  use(deviceA);
  await storage.initializeNewVault(PASSWORD, { userName: 'A' }, [login('a-email', 'E-mail A', 'pa')]);
  use(deviceB);
  await storage.initializeNewVault(PASSWORD, { userName: 'B' }, [login('b-email', 'E-mail B', 'pb'), login('b-bank', 'Banco B', 'pbb')]);
});

describe('sync between two devices', () => {
  let file: EncryptedVaultPayload; // the shared file in the synced folder

  it('first device publishes its vaults', async () => {
    const a = await open(deviceA);
    await storage.saveEncryptedVaultItems([login('work-1', 'Jira', 'j1')], a.key, a.salt, 'trabalho');
    const out = await engine.syncWithPayloads([], a.key, a.salt);
    expect(out.remoteNeedsWrite).toBe(true);
    file = out.payload;
  });

  it('second device must be linked first (different salt)', async () => {
    const b = await open(deviceB);
    await expect(engine.syncWithPayloads([file], b.key, b.salt)).rejects.toBeInstanceOf(engine.SyncNeedsLinkError);
  });

  it('rejects linking with the wrong password and leaves the device untouched', async () => {
    const b = await open(deviceB);
    await expect(engine.linkToSyncFile(file, 'errada', b.key)).rejects.toThrow('Senha mestra incorreta');
    expect((await storage.verifyMasterPassword(PASSWORD)).valid).toBe(true);
  });

  it('links, keeps its own items, and receives the other device items', async () => {
    let b = await open(deviceB);
    const ownSeedCount = (await storage.loadEncryptedVaultItems(b.key, 'pessoal')).length;
    const linked = await engine.linkToSyncFile(file, PASSWORD, b.key);
    b = { key: linked.masterKey, salt: linked.salt };

    // The same password still unlocks the device after the salt switch
    expect((await storage.verifyMasterPassword(PASSWORD)).valid).toBe(true);

    const out = await engine.syncWithPayloads([file], b.key, b.salt);
    expect(out.vaults.trabalho.map(i => i.title)).toEqual(['Jira']);
    expect(out.vaults.pessoal.length).toBeGreaterThanOrEqual(ownSeedCount);
    file = out.payload;
  });

  it('propagates edits and deletions back to the first device', async () => {
    const b = await open(deviceB);
    // Edit Jira, delete one personal item, add a new one
    const work = await storage.loadEncryptedVaultItems(b.key, 'trabalho');
    work[0] = { ...work[0], password: 'j2', updatedAt: Date.now() + 1000 };
    await storage.saveEncryptedVaultItems(work, b.key, b.salt, 'trabalho');

    const personal = await storage.loadEncryptedVaultItems(b.key, 'pessoal');
    const removed = personal[0];
    await storage.saveEncryptedVaultItems(
      [...personal.slice(1), login('new-1', 'Netflix', 'n1')],
      b.key,
      b.salt,
      'pessoal'
    );
    storage.recordDeletion('pessoal', removed.id, Date.now() + 2000);

    file = (await engine.syncWithPayloads([file], b.key, b.salt)).payload;

    const a = await open(deviceA);
    const out = await engine.syncWithPayloads([file], a.key, a.salt);
    expect(out.vaults.trabalho[0].password).toBe('j2');
    expect(out.vaults.pessoal.some(i => i.id === removed.id)).toBe(false);
    expect(out.vaults.pessoal.some(i => i.title === 'Netflix')).toBe(true);
    expect(out.stats.added).toBeGreaterThan(0);
    // Jira, plus the shared seed items (same ids on both devices, B's copies are newer)
    expect(out.stats.updated).toBeGreaterThanOrEqual(1);

    // And it persisted: reopening A shows the same data
    const reopened = await storage.loadEncryptedVaultItems(a.key, 'trabalho');
    expect(reopened[0].password).toBe('j2');
  });

  it('merges conflict copies written by both devices at once', async () => {
    const a = await open(deviceA);
    await storage.saveEncryptedVaultItems(
      [...(await storage.loadEncryptedVaultItems(a.key, 'compartilhado')), login('a-only', 'Wifi', 'w')],
      a.key,
      a.salt,
      'compartilhado'
    );
    const fromA = (await engine.syncWithPayloads([file], a.key, a.salt)).payload;

    const b = await open(deviceB);
    await storage.saveEncryptedVaultItems(
      [...(await storage.loadEncryptedVaultItems(b.key, 'compartilhado')), login('b-only', 'Impressora', 'i')],
      b.key,
      b.salt,
      'compartilhado'
    );
    const fromB = (await engine.syncWithPayloads([file], b.key, b.salt)).payload;

    // Folder now holds both versions (main + "sync-conflict" copy); A merges both
    const out = await engine.syncWithPayloads([fromA, fromB], (await open(deviceA)).key, a.salt);
    expect(out.vaults.compartilhado.map(i => i.title).sort()).toEqual(['Impressora', 'Wifi']);
    expect(out.remoteNeedsWrite).toBe(true);
  });
});

describe('changeMasterPassword', () => {
  it('re-encrypts every vault, not just the open one', async () => {
    const a = await open(deviceA);
    const before = await storage.loadAllVaults(a.key);
    await storage.changeMasterPassword(PASSWORD, 'nova-senha', before.pessoal, a.salt);
    const res = await storage.verifyMasterPassword('nova-senha');
    expect(res.valid).toBe(true);
    const after = await storage.loadAllVaults(res.masterKey!);
    expect(after.trabalho.map(i => i.id)).toEqual(before.trabalho.map(i => i.id));
    expect(after.compartilhado.map(i => i.id)).toEqual(before.compartilhado.map(i => i.id));
    expect(after.pessoal.map(i => i.id)).toEqual(before.pessoal.map(i => i.id));
  });
});
