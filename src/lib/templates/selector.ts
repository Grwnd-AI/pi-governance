import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface TemplateSelectorConfig {
  directory?: string;
  default?: string;
}

function getBundledDir(): string {
  try {
    // ESM path
    return resolve(dirname(fileURLToPath(import.meta.url)), '../../../prompts');
  } catch {
    // CJS fallback
    return resolve(__dirname, '../../../prompts');
  }
}

export class TemplateSelector {
  private userDirectory: string;
  private bundledDirectory: string;

  constructor(config?: TemplateSelectorConfig) {
    this.userDirectory = config?.directory ?? './templates/';
    this.bundledDirectory = getBundledDir();
  }

  /**
   * Resolve a template name to an absolute file path.
   * User templates take precedence over bundled templates.
   */
  resolve(templateName: string): string {
    // Check user directory first
    const userPath = resolve(join(this.userDirectory, `${templateName}.md`));
    if (existsSync(userPath)) return userPath;

    // Fall back to bundled templates
    const bundledPath = resolve(join(this.bundledDirectory, `${templateName}.md`));
    if (existsSync(bundledPath)) return bundledPath;

    throw new Error(
      `Prompt template '${templateName}' not found. Searched: ${userPath}, ${bundledPath}`,
    );
  }
}
