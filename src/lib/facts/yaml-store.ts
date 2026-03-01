import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import type { FactStore, RoleBinding, Relation } from './store.js';

interface YamlUserEntry {
  role: string;
  org_unit?: string;
  config?: Record<string, unknown>;
}

type YamlUsersFile = Record<string, YamlUserEntry>;

export class YamlFactStore implements FactStore {
  private bindings: RoleBinding[];

  constructor(usersFilePath: string);
  constructor(data: YamlUsersFile);
  constructor(input: string | YamlUsersFile) {
    if (typeof input === 'string') {
      const raw = readFileSync(input, 'utf-8');
      const parsed = parseYaml(raw) as YamlUsersFile;
      this.bindings = this.parseUsers(parsed);
    } else {
      this.bindings = this.parseUsers(input);
    }
  }

  private parseUsers(users: YamlUsersFile): RoleBinding[] {
    return Object.entries(users).map(([userId, entry]) => ({
      userId,
      role: entry.role,
      orgUnit: entry.org_unit ?? 'default',
      config: entry.config,
    }));
  }

  async getRoles(userId: string): Promise<RoleBinding[]> {
    return this.bindings.filter((b) => b.userId === userId);
  }

  async getAllRoleBindings(): Promise<RoleBinding[]> {
    return [...this.bindings];
  }

  async getRelations(_subject: string, _predicate: string): Promise<Relation[]> {
    // YAML store does not support relations — return empty
    return [];
  }
}
