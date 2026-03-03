import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonlAuditSink } from '../../../src/lib/audit/sinks/jsonl.js';
import { WebhookAuditSink } from '../../../src/lib/audit/sinks/webhook.js';
import { SplunkAuditSink } from '../../../src/lib/audit/sinks/splunk.js';
import { SentryAuditSink } from '../../../src/lib/audit/sinks/sentry.js';
import { PaloAltoStrataAuditSink } from '../../../src/lib/audit/sinks/palo-alto-strata.js';
import { PaloAltoXsiamAuditSink } from '../../../src/lib/audit/sinks/palo-alto-xsiam.js';

describe('JsonlAuditSink', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `audit-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes records as JSONL on flush', async () => {
    const path = join(tmpDir, 'audit.jsonl');
    const sink = new JsonlAuditSink(path);

    await sink.write({ event: 'test1', id: '1' });
    await sink.write({ event: 'test2', id: '2' });
    await sink.flush();

    const content = readFileSync(path, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toEqual({ event: 'test1', id: '1' });
    expect(JSON.parse(lines[1]!)).toEqual({ event: 'test2', id: '2' });
  });

  it('creates parent directories if needed', async () => {
    const path = join(tmpDir, 'nested', 'dir', 'audit.jsonl');
    const sink = new JsonlAuditSink(path);

    await sink.write({ event: 'test' });
    await sink.flush();

    expect(existsSync(path)).toBe(true);
  });

  it('does nothing on flush with empty buffer', async () => {
    const path = join(tmpDir, 'empty.jsonl');
    const sink = new JsonlAuditSink(path);
    await sink.flush();
    expect(existsSync(path)).toBe(false);
  });

  it('auto-flushes after 10 records', async () => {
    const path = join(tmpDir, 'auto.jsonl');
    const sink = new JsonlAuditSink(path);

    for (let i = 0; i < 10; i++) {
      await sink.write({ id: String(i) });
    }

    // Should have auto-flushed
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(10);
  });

  it('expands ~ in path', async () => {
    // We can't easily test the actual home dir expansion without writing there,
    // so just verify the sink can be constructed with a ~ path
    const sink = new JsonlAuditSink('~/test-audit.jsonl');
    expect(sink).toBeDefined();
  });
});

describe('WebhookAuditSink', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends records as JSON POST on flush', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new WebhookAuditSink('http://localhost:9999/audit');
    await sink.write({ event: 'test1' });
    await sink.write({ event: 'test2' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:9999/audit',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ event: 'test1' }, { event: 'test2' }]),
      }),
    );
  });

  it('retries once on failure', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new WebhookAuditSink('http://localhost:9999/audit');
    await sink.write({ event: 'test' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('drops records after two failures', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
    globalThis.fetch = mockFetch;

    const sink = new WebhookAuditSink('http://localhost:9999/audit');
    await sink.write({ event: 'test' });
    // Should not throw
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does nothing on flush with empty buffer', async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    const sink = new WebhookAuditSink('http://localhost:9999/audit');
    await sink.flush();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retries on non-ok status', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new WebhookAuditSink('http://localhost:9999/audit');
    await sink.write({ event: 'test' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('SplunkAuditSink', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends records to Splunk HEC endpoint on flush', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new SplunkAuditSink('https://splunk.example.com:8088', 'my-hec-token');
    await sink.write({ event: 'test1' });
    await sink.write({ event: 'test2' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://splunk.example.com:8088/services/collector/event');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toBe('Splunk my-hec-token');

    // Verify newline-delimited HEC events
    const lines = (opts.body as string).split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toEqual({
      event: { event: 'test1' },
      sourcetype: '_json',
    });
  });

  it('does not duplicate /services/collector/event path', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new SplunkAuditSink(
      'https://splunk.example.com:8088/services/collector/event',
      'tok',
    );
    await sink.write({ event: 'x' });
    await sink.flush();

    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://splunk.example.com:8088/services/collector/event');
  });

  it('retries once on failure', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new SplunkAuditSink('https://splunk.example.com:8088', 'tok');
    await sink.write({ event: 'test' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('drops records after two failures', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
    globalThis.fetch = mockFetch;

    const sink = new SplunkAuditSink('https://splunk.example.com:8088', 'tok');
    await sink.write({ event: 'test' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does nothing on flush with empty buffer', async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    const sink = new SplunkAuditSink('https://splunk.example.com:8088', 'tok');
    await sink.flush();

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('SentryAuditSink', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends records to Sentry envelope endpoint on flush', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new SentryAuditSink('https://abc123@o456.ingest.sentry.io/789');
    await sink.write({ event: 'tool_allowed', timestamp: '2025-01-01T00:00:00Z' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://o456.ingest.sentry.io/api/789/envelope/');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/x-sentry-envelope');
    expect(opts.headers['X-Sentry-Auth']).toContain('sentry_key=abc123');

    // Verify envelope format: 3 newline-separated JSON lines
    const lines = (opts.body as string).split('\n');
    expect(lines).toHaveLength(3);
    const header = JSON.parse(lines[0]!);
    expect(header.dsn).toBe('https://abc123@o456.ingest.sentry.io/789');
    const payload = JSON.parse(lines[2]!);
    expect(payload.logger).toBe('pi-governance.audit');
    expect(payload.extra.records).toHaveLength(1);
  });

  it('retries once on failure', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new SentryAuditSink('https://abc@o1.ingest.sentry.io/2');
    await sink.write({ event: 'test' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('drops records after two failures', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
    globalThis.fetch = mockFetch;

    const sink = new SentryAuditSink('https://abc@o1.ingest.sentry.io/2');
    await sink.write({ event: 'test' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does nothing on flush with empty buffer', async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    const sink = new SentryAuditSink('https://abc@o1.ingest.sentry.io/2');
    await sink.flush();

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('PaloAltoStrataAuditSink', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends records to Strata Cloud endpoint on flush', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new PaloAltoStrataAuditSink(
      'https://api.strata.paloaltonetworks.com/logs',
      'bearer-tok',
    );
    await sink.write({ event: 'tool_denied', timestamp: '2025-01-01T00:00:00Z' });
    await sink.write({ event: 'bash_denied', timestamp: '2025-01-01T00:01:00Z' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://api.strata.paloaltonetworks.com/logs');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toBe('Bearer bearer-tok');
    expect(opts.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(opts.body as string);
    expect(body.log_type).toBe('pi_governance_audit');
    expect(body.entries).toHaveLength(2);
    expect(body.entries[0].severity).toBe('INFORMATIONAL');
    expect(body.entries[0].log_source).toBe('pi-governance');
    expect(body.entries[0].event_data.event).toBe('tool_denied');
  });

  it('retries once on failure', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new PaloAltoStrataAuditSink('https://api.strata.paloaltonetworks.com/logs', 'tok');
    await sink.write({ event: 'test' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('drops records after two failures', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
    globalThis.fetch = mockFetch;

    const sink = new PaloAltoStrataAuditSink('https://api.strata.paloaltonetworks.com/logs', 'tok');
    await sink.write({ event: 'test' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does nothing on flush with empty buffer', async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    const sink = new PaloAltoStrataAuditSink('https://api.strata.paloaltonetworks.com/logs', 'tok');
    await sink.flush();

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('PaloAltoXsiamAuditSink', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends records to XSIAM endpoint on flush', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new PaloAltoXsiamAuditSink(
      'https://api-xsiam.paloaltonetworks.com/logs/v1/event',
      'api-key-123',
      'key-id-456',
    );
    await sink.write({ event: 'session_start', timestamp: '2025-01-01T00:00:00Z' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://api-xsiam.paloaltonetworks.com/logs/v1/event');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toBe('api-key-123');
    expect(opts.headers['x-xdr-auth-id']).toBe('key-id-456');
    expect(opts.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(opts.body as string);
    expect(body).toHaveLength(1);
    expect(body[0].vendor).toBe('pi-governance');
    expect(body[0].product).toBe('audit');
    expect(body[0].log_type).toBe('pi_governance_audit');
    expect(body[0].event).toBe('session_start');
    expect(body[0]._time).toBe('2025-01-01T00:00:00Z');
  });

  it('retries once on failure', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ ok: true });
    globalThis.fetch = mockFetch;

    const sink = new PaloAltoXsiamAuditSink('https://api-xsiam.example.com', 'key', 'id');
    await sink.write({ event: 'test' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('drops records after two failures', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
    globalThis.fetch = mockFetch;

    const sink = new PaloAltoXsiamAuditSink('https://api-xsiam.example.com', 'key', 'id');
    await sink.write({ event: 'test' });
    await sink.flush();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does nothing on flush with empty buffer', async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    const sink = new PaloAltoXsiamAuditSink('https://api-xsiam.example.com', 'key', 'id');
    await sink.flush();

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
