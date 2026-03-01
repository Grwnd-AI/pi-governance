import { describe, it, expect } from 'vitest';
import { render } from '../../../src/lib/templates/renderer.js';

describe('render', () => {
  it('substitutes string variables in {{variable}} placeholders', () => {
    const template = 'Hello, {{name}}! You are a {{role}}.';
    const result = render(template, { name: 'Alice', role: 'admin' });

    expect(result).toBe('Hello, Alice! You are a admin.');
  });

  it('joins array values with newlines', () => {
    const template = 'Allowed paths:\n{{allowed_paths}}';
    const result = render(template, {
      allowed_paths: ['/src', '/test', '/docs'],
    });

    expect(result).toBe('Allowed paths:\n/src\n/test\n/docs');
  });

  it('leaves unresolved variables as-is when no matching key exists', () => {
    const template = 'Role: {{role_name}}, Unit: {{org_unit}}';
    const result = render(template, { role_name: 'analyst' });

    expect(result).toBe('Role: analyst, Unit: {{org_unit}}');
  });

  it('returns the template unchanged when no variables are provided', () => {
    const template = 'No variables here, just plain text.';
    const result = render(template, {});

    expect(result).toBe('No variables here, just plain text.');
  });

  it('handles a template with no placeholders', () => {
    const template = 'Static content with no {{}} patterns removed.';
    const result = render(template, { unused: 'value' });

    expect(result).toBe('Static content with no {{}} patterns removed.');
  });

  it('substitutes multiple occurrences of the same variable', () => {
    const template = '{{name}} said hello. {{name}} said goodbye.';
    const result = render(template, { name: 'Bob' });

    expect(result).toBe('Bob said hello. Bob said goodbye.');
  });

  it('handles empty string values', () => {
    const template = 'Value: [{{value}}]';
    const result = render(template, { value: '' });

    expect(result).toBe('Value: []');
  });

  it('handles empty array values', () => {
    const template = 'Paths: {{paths}}';
    const result = render(template, { paths: [] });

    expect(result).toBe('Paths: ');
  });
});
