import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('../../../src/lib/wizard/html.js', () => ({
  WIZARD_HTML: '<html><body>Test Wizard</body></html>',
}));

import { startWizardServer } from '../../../src/lib/wizard/server.js';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse as parseYaml } from 'yaml';

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'wizard-test-'));
}

function noopError(_err: Error): void {
  // swallow errors in tests
}

describe('wizard server', () => {
  let closeFn: (() => void) | undefined;
  let tmpDir: string | undefined;

  afterEach(() => {
    closeFn?.();
    closeFn = undefined;
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
      tmpDir = undefined;
    }
  });

  async function startServer(overrides: Partial<Parameters<typeof startWizardServer>[0]> = {}) {
    tmpDir = overrides.workingDirectory ?? makeTmpDir();
    const result = await startWizardServer({
      workingDirectory: tmpDir,
      onComplete: overrides.onComplete ?? (() => {}),
      onError: overrides.onError ?? noopError,
      ...overrides,
    });
    closeFn = result.close;
    return { port: result.port, close: result.close, dir: tmpDir };
  }

  it('starts on an ephemeral port and responds to GET /', async () => {
    const { port } = await startServer();
    const res = await fetch(`http://localhost:${port}/`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('Test Wizard');
  });

  it('GET / returns HTML with correct content-type', async () => {
    const { port } = await startServer();
    const res = await fetch(`http://localhost:${port}/`);
    expect(res.headers.get('content-type')).toBe('text/html');
  });

  it('GET /api/config returns JSON config', async () => {
    const { port } = await startServer();
    const res = await fetch(`http://localhost:${port}/api/config`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    const data = await res.json();
    expect(data).toHaveProperty('auth');
    expect(data).toHaveProperty('policy');
  });

  it('GET /api/config returns existingConfig when provided', async () => {
    const existing = { auth: { provider: 'local' as const } } as Parameters<
      typeof startWizardServer
    >[0]['existingConfig'];
    const { port } = await startServer({ existingConfig: existing });
    const res = await fetch(`http://localhost:${port}/api/config`);
    const data = await res.json();
    expect(data.auth.provider).toBe('local');
  });

  it('GET /api/defaults returns role definitions', async () => {
    const { port } = await startServer();
    const res = await fetch(`http://localhost:${port}/api/defaults`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('defaults');
    expect(data).toHaveProperty('roles');
    expect(data.roles).toHaveProperty('analyst');
    expect(data.roles).toHaveProperty('admin');
    expect(data.roles).toHaveProperty('project_lead');
    expect(data.roles).toHaveProperty('auditor');
  });

  it('POST /api/save with valid config writes YAML files', async () => {
    const dir = makeTmpDir();
    const { port } = await startServer({ workingDirectory: dir });
    const governance = { auth: { provider: 'env' }, policy: { engine: 'yaml' } };
    const res = await fetch(`http://localhost:${port}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ governance }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const yamlPath = join(dir, '.pi', 'governance.yaml');
    expect(existsSync(yamlPath)).toBe(true);
  });

  it('POST /api/save creates .pi/ directory if needed', async () => {
    const dir = makeTmpDir();
    const piDir = join(dir, '.pi');
    expect(existsSync(piDir)).toBe(false);

    const { port } = await startServer({ workingDirectory: dir });
    await fetch(`http://localhost:${port}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ governance: { auth: { provider: 'env' } } }),
    });

    expect(existsSync(piDir)).toBe(true);
  });

  it('POST /api/save calls onComplete callback with file paths', async () => {
    const dir = makeTmpDir();
    const onComplete = vi.fn();
    const { port } = await startServer({ workingDirectory: dir, onComplete });
    const governance = { auth: { provider: 'env' } };

    await fetch(`http://localhost:${port}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ governance }),
    });

    // Give the callback a tick to fire
    await new Promise((r) => setTimeout(r, 50));

    expect(onComplete).toHaveBeenCalledOnce();
    const files = onComplete.mock.calls[0][0];
    expect(files).toHaveLength(1);
    expect(files[0].path).toContain('governance.yaml');
    expect(typeof files[0].content).toBe('string');
  });

  it('POST /api/save with invalid JSON returns 400', async () => {
    const { port } = await startServer();
    const res = await fetch(`http://localhost:${port}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });

  it('POST /api/save without governance property returns 400', async () => {
    const { port } = await startServer();
    const res = await fetch(`http://localhost:${port}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notGovernance: true }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('governance');
  });

  it('server shuts down on POST /api/close', async () => {
    const { port } = await startServer();
    const res = await fetch(`http://localhost:${port}/api/close`, {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    // Wait for the delayed close (100ms in server code)
    await new Promise((r) => setTimeout(r, 200));

    // Server should be closed now — fetch should fail
    await expect(fetch(`http://localhost:${port}/`)).rejects.toThrow();
    // Prevent afterEach from double-closing
    closeFn = undefined;
  });

  it('handles multiple sequential requests without crashing', async () => {
    const { port } = await startServer();

    const res1 = await fetch(`http://localhost:${port}/`);
    expect(res1.status).toBe(200);

    const res2 = await fetch(`http://localhost:${port}/api/config`);
    expect(res2.status).toBe(200);

    const res3 = await fetch(`http://localhost:${port}/api/defaults`);
    expect(res3.status).toBe(200);

    const res4 = await fetch(`http://localhost:${port}/`, { method: 'GET' });
    expect(res4.status).toBe(200);
  });

  it('YAML output is valid and parseable', async () => {
    const dir = makeTmpDir();
    const governance = {
      auth: { provider: 'env', env: { user_var: 'MY_USER' } },
      policy: { engine: 'yaml' },
    };
    const { port } = await startServer({ workingDirectory: dir });

    await fetch(`http://localhost:${port}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ governance }),
    });

    const yamlPath = join(dir, '.pi', 'governance.yaml');
    const content = readFileSync(yamlPath, 'utf-8');
    const parsed = parseYaml(content);
    expect(parsed.auth.provider).toBe('env');
    expect(parsed.auth.env.user_var).toBe('MY_USER');
    expect(parsed.policy.engine).toBe('yaml');
  });

  it('POST /api/save also writes rules file when rules are provided', async () => {
    const dir = makeTmpDir();
    const onComplete = vi.fn();
    const governance = { auth: { provider: 'env' } };
    const rules = { roles: { analyst: { allowed_tools: ['read'] } } };
    const { port } = await startServer({ workingDirectory: dir, onComplete });

    const res = await fetch(`http://localhost:${port}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ governance, rules }),
    });
    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 50));

    const rulesPath = join(dir, 'governance-rules.yaml');
    expect(existsSync(rulesPath)).toBe(true);
    const parsed = parseYaml(readFileSync(rulesPath, 'utf-8'));
    expect(parsed.roles.analyst.allowed_tools).toContain('read');

    const files = onComplete.mock.calls[0][0];
    expect(files).toHaveLength(2);
  });

  it('returns 404 for unknown routes', async () => {
    const { port } = await startServer();
    const res = await fetch(`http://localhost:${port}/unknown`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Not found');
  });
});
