import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import type { GovernanceConfig } from '../config/schema.js';
import { DEFAULTS } from '../config/defaults.js';
import { WIZARD_HTML } from './html.js';

export interface WizardServerOptions {
  workingDirectory: string;
  existingConfig?: GovernanceConfig;
  onComplete: (files: { path: string; content: string }[]) => void;
  onError: (error: Error) => void;
}

const AUTO_SHUTDOWN_MS = 10 * 60 * 1000;

const BUILTIN_ROLES = {
  analyst: {
    allowed_tools: ['read', 'grep', 'find', 'ls'],
    blocked_tools: ['bash', 'write', 'edit'],
    hitl_mode: 'dry_run' as const,
  },
  project_lead: {
    allowed_tools: ['read', 'write', 'edit', 'grep', 'find', 'ls', 'bash'],
    blocked_tools: [],
    hitl_mode: 'supervised' as const,
  },
  admin: {
    allowed_tools: ['read', 'write', 'edit', 'grep', 'find', 'ls', 'bash'],
    blocked_tools: [],
    hitl_mode: 'autonomous' as const,
  },
  auditor: {
    allowed_tools: ['read', 'grep', 'find', 'ls'],
    blocked_tools: ['bash', 'write', 'edit'],
    hitl_mode: 'dry_run' as const,
  },
};

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

export function startWizardServer(
  options: WizardServerOptions,
): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve, reject) => {
    let shutdownTimer: ReturnType<typeof setTimeout> | undefined;

    const server = createServer((req, res) => {
      setCorsHeaders(res);

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = req.url ?? '/';

      try {
        if (req.method === 'GET' && url === '/') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(WIZARD_HTML);
          return;
        }

        if (req.method === 'GET' && url === '/api/config') {
          sendJson(res, 200, options.existingConfig ?? DEFAULTS);
          return;
        }

        if (req.method === 'GET' && url === '/api/defaults') {
          sendJson(res, 200, { defaults: DEFAULTS, roles: BUILTIN_ROLES });
          return;
        }

        if (req.method === 'POST' && url === '/api/save') {
          readBody(req)
            .then((body) => {
              const parsed: unknown = JSON.parse(body);
              if (typeof parsed !== 'object' || parsed === null || !('governance' in parsed)) {
                sendJson(res, 400, { error: 'Request body must include "governance" property' });
                return;
              }

              const payload = parsed as { governance: GovernanceConfig; rules?: unknown };
              const governanceYaml = stringify(payload.governance);
              const piDir = join(options.workingDirectory, '.pi');
              const governancePath = join(piDir, 'governance.yaml');

              mkdirSync(piDir, { recursive: true });
              writeFileSync(governancePath, governanceYaml, 'utf-8');

              const files: { path: string; content: string }[] = [
                { path: governancePath, content: governanceYaml },
              ];

              if (payload.rules !== undefined) {
                const rulesYaml = stringify(payload.rules);
                const rulesPath = join(options.workingDirectory, 'governance-rules.yaml');
                writeFileSync(rulesPath, rulesYaml, 'utf-8');
                files.push({ path: rulesPath, content: rulesYaml });
              }

              sendJson(res, 200, { ok: true, files: files.map((f) => f.path) });
              options.onComplete(files);
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err);
              sendJson(res, 400, { error: `Invalid request body: ${message}` });
            });
          return;
        }

        if (req.method === 'POST' && url === '/api/close') {
          sendJson(res, 200, { ok: true });
          setTimeout(() => {
            closeServer();
          }, 100);
          return;
        }

        sendJson(res, 404, { error: 'Not found' });
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        options.onError(error);
        sendJson(res, 500, { error: 'Internal server error' });
      }
    });

    function closeServer(): void {
      if (shutdownTimer !== undefined) {
        clearTimeout(shutdownTimer);
        shutdownTimer = undefined;
      }
      server.close();
    }

    server.on('error', (err) => {
      options.onError(err);
      reject(err);
    });

    server.listen(0, () => {
      const addr = server.address();
      if (addr === null || typeof addr === 'string') {
        const err = new Error('Failed to get server address');
        options.onError(err);
        reject(err);
        return;
      }

      shutdownTimer = setTimeout(() => {
        closeServer();
      }, AUTO_SHUTDOWN_MS);

      resolve({ port: addr.port, close: closeServer });
    });
  });
}
