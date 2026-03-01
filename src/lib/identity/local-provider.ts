import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import type { IdentityProvider, ResolvedIdentity } from './provider.js';

interface UserEntry {
  role: string;
  org_unit?: string;
}

export class LocalIdentityProvider implements IdentityProvider {
  name = 'local';
  private users: Record<string, UserEntry>;

  constructor(usersFilePath: string) {
    const raw = readFileSync(usersFilePath, 'utf-8');
    this.users = parseYaml(raw) as Record<string, UserEntry>;
  }

  async resolve(): Promise<ResolvedIdentity | null> {
    // Try to determine the current system username
    const username = process.env.USER || process.env.USERNAME;
    if (!username) return null;

    const entry = this.users[username];
    if (!entry) return null;

    return {
      userId: username,
      role: entry.role,
      orgUnit: entry.org_unit ?? 'default',
      source: 'local',
    };
  }
}
