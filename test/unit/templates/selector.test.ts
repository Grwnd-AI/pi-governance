import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { TemplateSelector } from '../../../src/lib/templates/selector.js';

const TMP_DIR = resolve(import.meta.dirname, '../../.tmp-templates');

describe('TemplateSelector', () => {
  beforeEach(() => {
    mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it('resolves a template from the user directory when it exists', () => {
    writeFileSync(join(TMP_DIR, 'custom.md'), '# Custom template');
    const selector = new TemplateSelector({ directory: TMP_DIR });

    const result = selector.resolve('custom');

    expect(result).toBe(join(TMP_DIR, 'custom.md'));
  });

  it('falls back to the bundled prompts/ directory when not found in user dir', () => {
    const selector = new TemplateSelector({ directory: TMP_DIR });

    const result = selector.resolve('analyst');

    expect(result).toContain('prompts');
    expect(result).toMatch(/analyst\.md$/);
  });

  it('prefers user directory over bundled directory', () => {
    writeFileSync(join(TMP_DIR, 'analyst.md'), '# User override');
    const selector = new TemplateSelector({ directory: TMP_DIR });

    const result = selector.resolve('analyst');

    expect(result).toBe(join(TMP_DIR, 'analyst.md'));
  });

  it('throws an error when template is not found in either directory', () => {
    const selector = new TemplateSelector({ directory: TMP_DIR });

    expect(() => selector.resolve('nonexistent')).toThrow(
      /Prompt template 'nonexistent' not found/,
    );
  });
});
