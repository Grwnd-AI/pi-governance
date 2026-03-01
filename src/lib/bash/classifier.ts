import { SAFE_PATTERNS, DANGEROUS_PATTERNS } from './patterns.js';
import type { BashOverrides } from '../policy/engine.js';

export type BashClassification = 'safe' | 'dangerous' | 'needs_review';

export class BashClassifier {
  private safePatterns: RegExp[];
  private dangerousPatterns: RegExp[];

  constructor(overrides?: BashOverrides) {
    this.safePatterns = [...SAFE_PATTERNS, ...(overrides?.additionalAllowed ?? [])];
    this.dangerousPatterns = [...DANGEROUS_PATTERNS, ...(overrides?.additionalBlocked ?? [])];
  }

  classify(command: string): BashClassification {
    const trimmed = command.trim();

    // Check dangerous patterns against the full unsplit command first.
    // This catches patterns like "curl ... | bash" that span pipe boundaries.
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(trimmed)) return 'dangerous';
    }

    // Multi-command detection: if the command contains pipes, semicolons,
    // or && / ||, classify each segment independently and return the
    // most restrictive classification
    const segments = this.splitCommand(trimmed);

    if (segments.length > 1) {
      const classifications = segments.map((s) => this.classifySingle(s));
      if (classifications.includes('dangerous')) return 'dangerous';
      if (classifications.includes('needs_review')) return 'needs_review';
      return 'safe';
    }

    return this.classifySingle(trimmed);
  }

  private classifySingle(command: string): BashClassification {
    const trimmed = command.trim();

    // Check dangerous first (takes precedence)
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(trimmed)) return 'dangerous';
    }

    // Check safe
    for (const pattern of this.safePatterns) {
      if (pattern.test(trimmed)) return 'safe';
    }

    // Default: needs review
    return 'needs_review';
  }

  private splitCommand(command: string): string[] {
    // Split on pipes, semicolons, && and || while respecting quotes
    // This is a simplified parser — not a full shell parser
    const segments: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escaped = false;

    for (let i = 0; i < command.length; i++) {
      const char = command[i]!;

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        current += char;
        continue;
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        current += char;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        current += char;
        continue;
      }

      if (!inSingleQuote && !inDoubleQuote) {
        if (char === '|' && command[i + 1] !== '|') {
          segments.push(current.trim());
          current = '';
          continue;
        }
        if (char === ';') {
          segments.push(current.trim());
          current = '';
          continue;
        }
        if (char === '&' && command[i + 1] === '&') {
          segments.push(current.trim());
          current = '';
          i++; // skip second &
          continue;
        }
        if (char === '|' && command[i + 1] === '|') {
          segments.push(current.trim());
          current = '';
          i++; // skip second |
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) segments.push(current.trim());
    return segments.filter((s) => s.length > 0);
  }
}
