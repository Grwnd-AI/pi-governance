import type { AuditSink } from './sink.js';

/**
 * Sends audit records to Sentry as breadcrumbs/events via the Sentry envelope
 * endpoint (DSN-based ingestion).
 */
export class SentryAuditSink implements AuditSink {
  private readonly dsn: string;
  private readonly envelopeUrl: string;
  private readonly publicKey: string;
  private buffer: Record<string, unknown>[] = [];
  private readonly flushThreshold = 10;

  constructor(dsn: string) {
    this.dsn = dsn;
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/\//g, '');
    this.publicKey = parsed.username;
    this.envelopeUrl = `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/`;
  }

  async write(record: Record<string, unknown>): Promise<void> {
    this.buffer.push(record);
    if (this.buffer.length >= this.flushThreshold) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const records = [...this.buffer];
    this.buffer = [];

    try {
      await this.send(records);
    } catch {
      // Retry once
      try {
        await this.send(records);
      } catch {
        // Drop records after second failure
      }
    }
  }

  private async send(records: Record<string, unknown>[]): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    // Build a Sentry envelope: header line + item header + item payload
    const envelopeHeader = JSON.stringify({
      dsn: this.dsn,
      sent_at: new Date().toISOString(),
    });

    const eventPayload = JSON.stringify({
      level: 'info',
      logger: 'pi-governance.audit',
      message: `audit batch: ${records.length} record(s)`,
      extra: { records },
      breadcrumbs: records.map((r) => ({
        type: 'default',
        category: 'audit',
        level: 'info',
        message: String(r['event'] ?? 'audit_event'),
        data: r,
        timestamp: r['timestamp'] ?? new Date().toISOString(),
      })),
    });

    const itemHeader = JSON.stringify({
      type: 'event',
      length: new TextEncoder().encode(eventPayload).byteLength,
    });

    const body = `${envelopeHeader}\n${itemHeader}\n${eventPayload}`;

    try {
      const response = await fetch(this.envelopeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': `Sentry sentry_key=${this.publicKey}, sentry_version=7`,
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Sentry returned ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
