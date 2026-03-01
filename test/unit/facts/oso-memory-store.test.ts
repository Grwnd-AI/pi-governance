import { describe, it, expect } from 'vitest';
import { OsoMemoryFactStore } from '../../../src/lib/facts/oso-memory-store.js';

describe('OsoMemoryFactStore', () => {
  it('stores and retrieves role bindings', async () => {
    const store = new OsoMemoryFactStore();
    store.addRoleBinding({ userId: 'alice', role: 'admin', orgUnit: 'default' });
    store.addRoleBinding({ userId: 'bob', role: 'analyst', orgUnit: 'idem' });

    const aliceRoles = await store.getRoles('alice');
    expect(aliceRoles).toHaveLength(1);
    expect(aliceRoles[0]?.role).toBe('admin');

    const all = await store.getAllRoleBindings();
    expect(all).toHaveLength(2);
  });

  it('returns empty array for unknown user', async () => {
    const store = new OsoMemoryFactStore();
    const roles = await store.getRoles('nobody');
    expect(roles).toHaveLength(0);
  });

  it('stores and retrieves relations', async () => {
    const store = new OsoMemoryFactStore();
    store.addRelation({ subject: 'alice', predicate: 'member_of', object: 'engineering' });
    store.addRelation({ subject: 'alice', predicate: 'owner_of', object: 'project-x' });
    store.addRelation({ subject: 'bob', predicate: 'member_of', object: 'engineering' });

    const memberOf = await store.getRelations('alice', 'member_of');
    expect(memberOf).toHaveLength(1);
    expect(memberOf[0]?.object).toBe('engineering');

    const ownerOf = await store.getRelations('alice', 'owner_of');
    expect(ownerOf).toHaveLength(1);
  });

  it('returns empty relations when no match', async () => {
    const store = new OsoMemoryFactStore();
    const relations = await store.getRelations('nobody', 'member_of');
    expect(relations).toEqual([]);
  });

  it('supports multiple role bindings per user', async () => {
    const store = new OsoMemoryFactStore();
    store.addRoleBinding({ userId: 'alice', role: 'admin', orgUnit: 'default' });
    store.addRoleBinding({ userId: 'alice', role: 'analyst', orgUnit: 'idem' });

    const roles = await store.getRoles('alice');
    expect(roles).toHaveLength(2);
    expect(roles.map((r) => r.role).sort()).toEqual(['admin', 'analyst']);
  });
});
