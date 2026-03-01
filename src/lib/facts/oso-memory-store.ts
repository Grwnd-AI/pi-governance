import type { FactStore, RoleBinding, Relation } from './store.js';

export class OsoMemoryFactStore implements FactStore {
  private bindings: RoleBinding[] = [];
  private relations: Relation[] = [];

  addRoleBinding(binding: RoleBinding): void {
    this.bindings.push(binding);
  }

  addRelation(relation: Relation): void {
    this.relations.push(relation);
  }

  async getRoles(userId: string): Promise<RoleBinding[]> {
    return this.bindings.filter((b) => b.userId === userId);
  }

  async getAllRoleBindings(): Promise<RoleBinding[]> {
    return [...this.bindings];
  }

  async getRelations(subject: string, predicate: string): Promise<Relation[]> {
    return this.relations.filter((r) => r.subject === subject && r.predicate === predicate);
  }
}
