import { parseHTML } from 'linkedom';
import { domToOrg } from './convert';

export { domToOrg } from './convert';

/**
 * Convert HTML to Org-mode format.
 *
 * Uses linkedom for parsing. In browser environments, import `domToOrg`
 * from `html-to-org/dom` to avoid bundling linkedom.
 *
 * @param html - HTML string to convert
 * @param baseUrl - Base URL for resolving relative links
 * @returns Org-mode formatted string
 */
export function htmlToOrg(html: string, baseUrl: string = ''): string {
  if (!html || !html.trim()) return '';

  const { document } = parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`);

  return domToOrg(document.body, baseUrl);
}
