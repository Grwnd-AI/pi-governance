import type { AuditSink } from './sink.js';

/**
 * Sends audit records to Palo Alto Strata Cloud (Cortex Data Lake) via the
 * HTTPS logging-service ingestion API.
 */
export class PaloAltoStrataAuditSink implements AuditSink {
  private readonly url: string;
  private readonly token: string;
  private buffer: Record<string, unknown>[] = [];
  private readonly flushThreshold = 10;

  constructor(url: string, token: string) {
    this.url = url.replace(/\/+$/, '');
    this.token = token;
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

    const payload = {
      log_type: 'pi_governance_audit',
      entries: records.map((r) => ({
        timestamp: (r['timestamp'] as string) ?? new Date().toISOString(),
        severity: 'INFORMATIONAL',
        log_source: 'pi-governance',
        event_data: r,
      })),
    };

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Palo Alto Strata returned ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
