import { describe, it, expect, vi, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ConfigWatcher } from '../../../src/lib/config/watcher.js';
import type { GovernanceConfig } from '../../../src/lib/config/schema.js';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('ConfigWatcher', () => {
  const watchers: ConfigWatcher[] = [];

  afterEach(() => {
    for (const w of watchers) w.stop();
    watchers.length = 0;
  });

  it('calls onChange when config file changes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cw-'));
    const filePath = join(dir, 'governance.yaml');
    writeFileSync(filePath, '{}', 'utf-8');

    const onChange = vi.fn<(config: GovernanceConfig) => void>();
    const watcher = new ConfigWatcher(filePath, onChange);
    watchers.push(watcher);
    watcher.start();

    // Give fs.watch time to initialize before triggering a change
    await delay(100);
    writeFileSync(filePath, '# changed\n{}', 'utf-8');

    // Wait for debounce (500ms) + buffer
    await delay(1000);

    expect(onChange).toHaveBeenCalled();
  });

  it('does not call onChange for invalid config', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cw-'));
    const filePath = join(dir, 'governance.yaml');
    writeFileSync(filePath, '{}', 'utf-8');

    const onChange = vi.fn<(config: GovernanceConfig) => void>();
    const onError = vi.fn<(error: Error) => void>();
    const watcher = new ConfigWatcher(filePath, onChange, onError);
    watchers.push(watcher);
    watcher.start();

    await delay(100);
    writeFileSync(filePath, 'policy:\n  engine: invalid', 'utf-8');

    await delay(1000);

    expect(onChange).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('stop() cleans up the watcher', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cw-'));
    const filePath = join(dir, 'governance.yaml');
    writeFileSync(filePath, '{}', 'utf-8');

    const watcher = new ConfigWatcher(filePath, vi.fn());
    watcher.start();
    watcher.stop();
    // Calling stop again should be safe
    watcher.stop();
  });

  it('debounces rapid changes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cw-'));
    const filePath = join(dir, 'governance.yaml');
    writeFileSync(filePath, '{}', 'utf-8');

    const onChange = vi.fn<(config: GovernanceConfig) => void>();
    const watcher = new ConfigWatcher(filePath, onChange);
    watchers.push(watcher);
    watcher.start();

    await delay(100);

    // Rapid-fire changes
    for (let i = 0; i < 5; i++) {
      writeFileSync(filePath, `# change ${i}\n{}`, 'utf-8');
    }

    await delay(1000);

    // Debounced: should fire at most a couple of times
    expect(onChange.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
