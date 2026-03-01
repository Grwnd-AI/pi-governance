import { watch, readFileSync, type FSWatcher } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { Value } from '@sinclair/typebox/value';
import { GovernanceConfigSchema, type GovernanceConfig } from './schema.js';

/**
 * Watches a governance config file for changes and triggers a validated reload.
 * Uses fs.watch() with a 500ms debounce to avoid rapid reloads.
 */
export class ConfigWatcher {
  private watcher: FSWatcher | undefined;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly configPath: string;
  private readonly onChange: (config: GovernanceConfig) => void;
  private readonly onError?: (error: Error) => void;

  constructor(
    configPath: string,
    onChange: (config: GovernanceConfig) => void,
    onError?: (error: Error) => void,
  ) {
    this.configPath = configPath;
    this.onChange = onChange;
    this.onError = onError;
  }

  start(): void {
    if (this.watcher) return;
    this.watcher = watch(this.configPath, () => this.handleChange());
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
  }

  private handleChange(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.reload(), 500);
  }

  private reload(): void {
    try {
      const raw = readFileSync(this.configPath, 'utf-8');
      const parsed = parseYaml(raw);
      const errors = [...Value.Errors(GovernanceConfigSchema, parsed)];
      if (errors.length > 0) {
        const msg = errors.map((e) => `${e.path}: ${e.message}`).join('; ');
        this.onError?.(new Error(`Config validation failed: ${msg}`));
        return;
      }
      const config = Value.Default(GovernanceConfigSchema, parsed) as GovernanceConfig;
      this.onChange(config);
    } catch (err) {
      this.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
