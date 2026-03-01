import { describe, it, expect } from 'vitest';
import { YamlFactStore } from '../../../src/lib/facts/yaml-store.js';

describe('YamlFactStore', () => {
  const testData = {
    alice: { role: 'admin', org_unit: 'default' },
    bob: { role: 'project_lead', org_unit: 'cornerstone_aec' },
    charlie: { role: 'analyst', org_unit: 'idem' },
  };

  it('returns role bindings for a known user', async () => {
    const store = new YamlFactStore(testData);
    const roles = await store.getRoles('alice');
    expect(roles).toHaveLength(1);
    expect(roles[0]).toEqual({
      userId: 'alice',
      role: 'admin',
      orgUnit: 'default',
      config: undefined,
    });
  });

  it('returns empty array for unknown user', async () => {
    const store = new YamlFactStore(testData);
    const roles = await store.getRoles('unknown');
    expect(roles).toHaveLength(0);
  });

  it('returns all role bindings', async () => {
    const store = new YamlFactStore(testData);
    const all = await store.getAllRoleBindings();
    expect(all).toHaveLength(3);
    expect(all.map((b) => b.userId).sort()).toEqual(['alice', 'bob', 'charlie']);
  });

  it('defaults orgUnit to "default" when not specified', async () => {
    const store = new YamlFactStore({ dave: { role: 'analyst' } });
    const roles = await store.getRoles('dave');
    expect(roles[0]?.orgUnit).toBe('default');
  });

  it('returns empty relations (not supported by YAML store)', async () => {
    const store = new YamlFactStore(testData);
    const relations = await store.getRelations('alice', 'member_of');
    expect(relations).toEqual([]);
  });
});
