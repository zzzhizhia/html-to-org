import { parseHTML } from 'linkedom';

/**
 * Convert HTML to Org-mode format.
 *
 * @param html - HTML string to convert
 * @param baseUrl - Base URL for resolving relative links
 * @returns Org-mode formatted string
 */
export function htmlToOrg(html: string, baseUrl: string = ''): string {
  if (!html || !html.trim()) return '';

  const { document } = parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`);
  const body = document.body;

  const ctx: ConvertContext = { baseUrl, listDepth: 0, orderedIndex: [], indentWidth: 0 };
  const raw = convertNode(body, ctx);

  // Normalize output: collapse 3+ newlines to 2, trim
  return raw.replace(/\n{3,}/g, '\n\n').trim();
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ConvertContext {
  baseUrl: string;
  listDepth: number;
  orderedIndex: number[]; // stack of current ordered list counters
  indentWidth: number; // accumulated indent width in spaces for nested lists
}

// ---------------------------------------------------------------------------
// Node conversion
// ---------------------------------------------------------------------------

function convertNode(node: any, ctx: ConvertContext): string {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    return collapseWhitespace(node.textContent || '');
  }

  if (node.nodeType !== 1 /* ELEMENT_NODE */) return '';

  const tag = (node.tagName || '').toLowerCase();

  // Skip invisible / dangerous elements
  if (tag === 'script' || tag === 'style' || tag === 'noscript') return '';

  switch (tag) {
    case 'h1': case 'h2': case 'h3':
    case 'h4': case 'h5': case 'h6':
      return convertHeading(node, tag, ctx);
    case 'p':
      return convertParagraph(node, ctx);
    case 'strong': case 'b':
      return wrapInline('*', node, ctx);
    case 'em': case 'i':
      return wrapInline('/', node, ctx);
    case 'u': case 'ins':
      return wrapInline('_', node, ctx);
    case 's': case 'del': case 'strike':
      return wrapInline('+', node, ctx);
    case 'code':
      // Only inline code here; pre>code is handled by 'pre'
      return wrapInline('=', node, ctx);
    case 'mark':
      return wrapInline('=', node, ctx);
    case 'sup':
      return `^{${convertChildren(node, ctx)}}`;
    case 'sub':
      return `_{${convertChildren(node, ctx)}}`;
    case 'a':
      return convertLink(node, ctx);
    case 'img':
      return convertImage(node, ctx);
    case 'ul':
      return convertList(node, false, ctx);
    case 'ol':
      return convertList(node, true, ctx);
    case 'li':
      return convertChildren(node, ctx);
    case 'pre':
      return convertPre(node, ctx);
    case 'blockquote':
      return convertBlockquote(node, ctx);
    case 'table':
      return convertTable(node, ctx);
    case 'hr':
      return '\n\n-----\n\n';
    case 'br':
      return '\n';
    // Transparent wrappers — just recurse
    case 'div': case 'section': case 'article': case 'main':
    case 'header': case 'footer': case 'nav': case 'aside':
    case 'figure': case 'figcaption': case 'details': case 'summary':
    case 'span': case 'small': case 'time': case 'abbr':
    case 'thead': case 'tbody': case 'tfoot':
    case 'html': case 'body':
      return convertChildren(node, ctx);
    default:
      return convertChildren(node, ctx);
  }
}

function convertChildren(node: any, ctx: ConvertContext): string {
  let out = '';
  for (const child of node.childNodes) {
    // Skip whitespace-only text nodes between block elements
    if (child.nodeType === 3 /* TEXT_NODE */) {
      const text = child.textContent || '';
      if (!text.trim()) {
        // Check if surrounded by block elements — skip inter-block whitespace
        const prev = child.previousSibling;
        const next = child.nextSibling;
        if (isBlockElement(prev) || isBlockElement(next)) {
          continue;
        }
      }
    }
    out += convertNode(child, ctx);
  }
  return out;
}

const BLOCK_TAGS = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'pre', 'blockquote', 'table', 'hr',
  'section', 'article', 'main', 'header', 'footer', 'nav', 'aside',
  'figure', 'figcaption', 'details', 'summary',
]);

function isBlockElement(node: any): boolean {
  if (!node || node.nodeType !== 1) return false;
  return BLOCK_TAGS.has((node.tagName || '').toLowerCase());
}

// ---------------------------------------------------------------------------
// Block elements
// ---------------------------------------------------------------------------

function convertHeading(node: any, tag: string, ctx: ConvertContext): string {
  const level = parseInt(tag[1], 10);
  const stars = '*'.repeat(level);
  const text = convertChildren(node, ctx).trim();
  return `\n\n${stars} ${text}\n\n`;
}

function convertParagraph(node: any, ctx: ConvertContext): string {
  const text = convertChildren(node, ctx).trim();
  if (!text) return '';
  return `\n\n${text}\n\n`;
}

function convertBlockquote(node: any, ctx: ConvertContext): string {
  const inner = convertChildren(node, ctx).trim();
  return `\n\n#+BEGIN_QUOTE\n${inner}\n#+END_QUOTE\n\n`;
}

function convertPre(node: any, _ctx: ConvertContext): string {
  // Check for <pre><code>...</code></pre> pattern
  const codeChild = node.querySelector?.('code');
  if (codeChild) {
    const lang = detectLanguage(codeChild);
    const code = (codeChild.textContent || '').replace(/\n$/, '');
    const langSuffix = lang ? ` ${lang}` : '';
    return `\n\n#+BEGIN_SRC${langSuffix}\n${code}\n#+END_SRC\n\n`;
  }
  // Plain <pre> without <code>
  const text = (node.textContent || '').replace(/\n$/, '');
  return `\n\n#+BEGIN_EXAMPLE\n${text}\n#+END_EXAMPLE\n\n`;
}

function detectLanguage(codeNode: any): string {
  const cls = codeNode.getAttribute?.('class') || '';
  // Match class="language-xxx" or class="hljs language-xxx"
  const match = cls.match(/(?:^|\s)language-(\S+)/);
  return match ? match[1] : '';
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

function convertList(node: any, ordered: boolean, ctx: ConvertContext): string {
  const items: string[] = [];
  let counter = 1;

  // Calculate indent: for nested lists, align with parent item's content
  // "- " is 2 chars, "N. " is 3 chars
  const indent = ctx.listDepth > 0
    ? ' '.repeat(ctx.indentWidth || 2)
    : '';
  const prefixWidth = ordered ? 3 : 2; // width of "N. " or "- "

  for (const child of node.childNodes) {
    if (child.nodeType !== 1 || (child.tagName || '').toLowerCase() !== 'li') continue;

    const currentPrefix = ordered ? `${counter}. ` : '- ';

    // Convert li children, handling nested lists specially
    let textParts: string[] = [];
    let nestedLists: string[] = [];

    for (const liChild of child.childNodes) {
      const liChildTag = (liChild.tagName || '').toLowerCase();
      if (liChildTag === 'ul' || liChildTag === 'ol') {
        const nestedCtx = {
          ...ctx,
          listDepth: ctx.listDepth + 1,
          indentWidth: (ctx.indentWidth || 0) + prefixWidth,
        };
        nestedLists.push(convertList(liChild, liChildTag === 'ol', nestedCtx));
      } else {
        textParts.push(convertNode(liChild, ctx));
      }
    }

    const text = textParts.join('').trim();
    let item = `${indent}${currentPrefix}${text}`;
    if (nestedLists.length > 0) {
      item += '\n' + nestedLists.join('\n');
    }
    items.push(item);
    counter++;
  }

  const result = items.join('\n');
  // Only add surrounding newlines for top-level lists
  return ctx.listDepth === 0 ? `\n\n${result}\n\n` : result;
}

// ---------------------------------------------------------------------------
// Inline elements
// ---------------------------------------------------------------------------

function wrapInline(marker: string, node: any, ctx: ConvertContext): string {
  const inner = convertChildren(node, ctx);
  if (!inner.trim()) return inner;
  return `${marker}${inner}${marker}`;
}

function convertLink(node: any, ctx: ConvertContext): string {
  const href = resolveUrl(node.getAttribute?.('href') || '', ctx.baseUrl);
  const text = convertChildren(node, ctx).trim();

  if (!href) return text;
  if (!text || text === href) return `[[${href}]]`;
  return `[[${href}][${text}]]`;
}

function convertImage(node: any, ctx: ConvertContext): string {
  const src = resolveUrl(node.getAttribute?.('src') || '', ctx.baseUrl);
  if (!src) return '';
  return `[[${src}]]`;
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

function convertTable(node: any, ctx: ConvertContext): string {
  const rows: string[][] = [];
  let headerRowCount = 0;

  // Collect header rows from <thead>
  const thead = node.querySelector?.('thead');
  if (thead) {
    for (const tr of thead.querySelectorAll?.('tr') || []) {
      const cells = extractRowCells(tr, ctx);
      rows.push(cells);
      headerRowCount++;
    }
  }

  // Collect body rows from <tbody> or direct <tr>
  const tbody = node.querySelector?.('tbody');
  const bodyContainer = tbody || node;
  for (const tr of bodyContainer.querySelectorAll?.('tr') || []) {
    // Skip rows already captured from thead
    if (thead && tr.parentNode === thead) continue;
    const cells = extractRowCells(tr, ctx);
    rows.push(cells);
  }

  if (rows.length === 0) return '';

  // Calculate column widths
  const colCount = Math.max(...rows.map(r => r.length));
  const colWidths = new Array(colCount).fill(0);
  for (const row of rows) {
    for (let i = 0; i < colCount; i++) {
      colWidths[i] = Math.max(colWidths[i], (row[i] || '').length);
    }
  }

  // Format rows
  const formatRow = (row: string[]): string => {
    const cells = [];
    for (let i = 0; i < colCount; i++) {
      cells.push((row[i] || '').padEnd(colWidths[i]));
    }
    return '| ' + cells.join(' | ') + ' |';
  };

  const sepParts = colWidths.map(w => '-'.repeat(w));
  const separatorRow = '|' + sepParts.map(s => `-${s}-`).join('+') + '|';

  const lines: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    lines.push(formatRow(rows[i]));
    if (i === headerRowCount - 1 && headerRowCount > 0) {
      lines.push(separatorRow);
    }
  }

  return '\n\n' + lines.join('\n') + '\n\n';
}

function extractRowCells(tr: any, ctx: ConvertContext): string[] {
  const cells: string[] = [];
  for (const cell of tr.childNodes) {
    const cellTag = (cell.tagName || '').toLowerCase();
    if (cellTag === 'td' || cellTag === 'th') {
      cells.push(convertChildren(cell, ctx).trim());
    }
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ');
}

function resolveUrl(url: string, baseUrl: string): string {
  if (!url) return '';
  if (/^https?:\/\//.test(url) || url.startsWith('mailto:')) return url;
  if (!baseUrl) return url;
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}
