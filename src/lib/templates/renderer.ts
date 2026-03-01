/**
 * Render a template string by substituting {{variable}} placeholders
 * with the corresponding values from the variables map.
 *
 * - String values replace the placeholder directly.
 * - Array values are joined with newlines.
 * - Unresolved variables (no matching key) are left as-is.
 */
export function render(
  templateContent: string,
  variables: Record<string, string | string[]>,
): string {
  return templateContent.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key];
    if (value === undefined) return match;
    if (Array.isArray(value)) return value.join('\n');
    return value;
  });
}
