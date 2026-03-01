import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalIdentityProvider } from '../../../src/lib/identity/local-provider.js';
import * as fs from 'fs';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

const mockReadFileSync = vi.mocked(fs.readFileSync);

describe('LocalIdentityProvider', () => {
  const savedUser = process.env.USER;
  const savedUsername = process.env.USERNAME;

  const usersYaml = `
alice:
  role: admin
  org_unit: platform
bob:
  role: developer
charlie:
  role: analyst
  org_unit: security
`;

  beforeEach(() => {
    mockReadFileSync.mockReturnValue(usersYaml);
  });

  afterEach(() => {
    // Restore env
    if (savedUser === undefined) {
      delete process.env.USER;
    } else {
      process.env.USER = savedUser;
    }
    if (savedUsername === undefined) {
      delete process.env.USERNAME;
    } else {
      process.env.USERNAME = savedUsername;
    }
    vi.restoreAllMocks();
  });

  it('resolves identity for a known user', async () => {
    process.env.USER = 'alice';
    const provider = new LocalIdentityProvider('/fake/users.yaml');
    const identity = await provider.resolve();

    expect(identity).toEqual({
      userId: 'alice',
      role: 'admin',
      orgUnit: 'platform',
      source: 'local',
    });
  });

  it('defaults orgUnit to "default" when not specified in user entry', async () => {
    process.env.USER = 'bob';
    const provider = new LocalIdentityProvider('/fake/users.yaml');
    const identity = await provider.resolve();

    expect(identity).not.toBeNull();
    expect(identity!.orgUnit).toBe('default');
    expect(identity!.role).toBe('developer');
  });

  it('returns null for an unknown user', async () => {
    process.env.USER = 'unknown-person';
    const provider = new LocalIdentityProvider('/fake/users.yaml');
    const identity = await provider.resolve();

    expect(identity).toBeNull();
  });

  it('returns null when USER and USERNAME env vars are not set', async () => {
    delete process.env.USER;
    delete process.env.USERNAME;
    const provider = new LocalIdentityProvider('/fake/users.yaml');
    const identity = await provider.resolve();

    expect(identity).toBeNull();
  });

  it('throws when the users file does not exist', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });

    expect(() => new LocalIdentityProvider('/nonexistent/users.yaml')).toThrow('ENOENT');
  });
});
