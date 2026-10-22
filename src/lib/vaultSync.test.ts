import { describe, it, expect } from 'vitest';
import { mergeVault, describeStats } from './vaultSync';
import { VaultItem } from '../types';

const item = (id: string, updatedAt: number, password = 'p'): VaultItem => ({
  id,
  title: id,
  category: 'login',
  password,
  tags: [],
  favorite: false,
  customFields: [],
  createdAt: 1,
  updatedAt,
});

describe('mergeVault', () => {
  it('adds items that exist only on the other device', () => {
    const r = mergeVault([item('a', 10)], {}, [item('a', 10), item('b', 20)], {});
    expect(r.items.map(i => i.id)).toEqual(['a', 'b']);
    expect(r.stats).toEqual({ added: 1, updated: 0, removed: 0 });
  });

  it('keeps the newer edit of the same item', () => {
    const r = mergeVault([item('a', 10, 'old')], {}, [item('a', 20, 'new')], {});
    expect(r.items[0].password).toBe('new');
    expect(r.stats.updated).toBe(1);
  });

  it('keeps the local edit when it is newer', () => {
    const r = mergeVault([item('a', 30, 'mine')], {}, [item('a', 20, 'theirs')], {});
    expect(r.items[0].password).toBe('mine');
    expect(r.stats).toEqual({ added: 0, updated: 0, removed: 0 });
  });

  it('applies deletions made on the other device', () => {
    const r = mergeVault([item('a', 10), item('b', 10)], {}, [item('b', 10)], { a: 50 });
    expect(r.items.map(i => i.id)).toEqual(['b']);
    expect(r.stats.removed).toBe(1);
    expect(r.tombstones.a).toBe(50);
  });

  it('does not resurrect an item deleted here', () => {
    const r = mergeVault([], { a: 50 }, [item('a', 10)], {});
    expect(r.items).toEqual([]);
    expect(r.stats).toEqual({ added: 0, updated: 0, removed: 0 });
  });

  it('lets an edit made after the deletion win', () => {
    const r = mergeVault([], { a: 50 }, [item('a', 60, 'edited later')], {});
    expect(r.items[0].password).toBe('edited later');
    expect(r.tombstones.a).toBeUndefined();
  });

  it('is symmetric: both devices converge to the same set', () => {
    const A = [item('a', 10), item('b', 40, 'A')];
    const B = [item('b', 30, 'B'), item('c', 5)];
    const fromA = mergeVault(A, { c: 99 }, B, {});
    const fromB = mergeVault(B, {}, A, { c: 99 });
    const ids = (r: typeof fromA) => r.items.map(i => `${i.id}:${i.password}`).sort();
    expect(ids(fromA)).toEqual(ids(fromB));
    expect(ids(fromA)).toEqual(['a:p', 'b:A']);
  });
});

describe('describeStats', () => {
  it('writes a short summary', () => {
    expect(describeStats({ added: 2, updated: 1, removed: 0 })).toBe('2 novos, 1 atualizado');
    expect(describeStats({ added: 0, updated: 0, removed: 0 })).toBe('nenhuma mudança');
  });
});
