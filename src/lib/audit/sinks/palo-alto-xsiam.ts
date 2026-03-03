import type { AuditSink } from './sink.js';

/**
 * Sends audit records to Palo Alto Cortex XSIAM via the HTTPS log-collector
 * ingestion API.
 */
export class PaloAltoXsiamAuditSink implements AuditSink {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly apiKeyId: string;
  private buffer: Record<string, unknown>[] = [];
  private readonly flushThreshold = 10;

  constructor(url: string, apiKey: string, apiKeyId: string) {
    this.url = url.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.apiKeyId = apiKeyId;
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

    const payload = records.map((r) => ({
      _time: (r['timestamp'] as string) ?? new Date().toISOString(),
      vendor: 'pi-governance',
      product: 'audit',
      log_type: 'pi_governance_audit',
      ...r,
    }));

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          Authorization: `${this.apiKey}`,
          'x-xdr-auth-id': this.apiKeyId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Palo Alto XSIAM returned ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
