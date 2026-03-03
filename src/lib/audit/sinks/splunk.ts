import type { AuditSink } from './sink.js';

/**
 * Sends audit records to Splunk via the HTTP Event Collector (HEC) endpoint.
 */
export class SplunkAuditSink implements AuditSink {
  private readonly url: string;
  private readonly token: string;
  private buffer: Record<string, unknown>[] = [];
  private readonly flushThreshold = 10;

  constructor(url: string, token: string) {
    // Normalise URL to always target the HEC services/collector endpoint
    this.url = url.replace(/\/+$/, '');
    if (!this.url.endsWith('/services/collector/event')) {
      this.url += '/services/collector/event';
    }
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

    // Splunk HEC expects newline-delimited JSON events
    const body = records.map((r) => JSON.stringify({ event: r, sourcetype: '_json' })).join('\n');

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          Authorization: `Splunk ${this.token}`,
          'Content-Type': 'application/json',
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Splunk HEC returned ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
