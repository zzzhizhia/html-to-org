// Core DOM-to-Org conversion logic. No external dependencies.
// This module works with any DOM-compatible node (browser, linkedom, jsdom).

/**
 * Convert a DOM node to Org-mode format.
 *
 * @param node - A DOM node (Element, Document, or DocumentFragment)
 * @param baseUrl - Base URL for resolving relative links
 * @returns Org-mode formatted string
 */
export function domToOrg(node: any, baseUrl: string = ''): string {
  const ctx: ConvertContext = { baseUrl, listDepth: 0, orderedIndex: [], indentWidth: 0 };
  const raw = convertNode(node, ctx);
  return raw.replace(/\n{3,}/g, '\n\n').trim();
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ConvertContext {
  baseUrl: string;
  listDepth: number;
  orderedIndex: number[];
  indentWidth: number;
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
    default:
      return convertChildren(node, ctx);
  }
}

function convertChildren(node: any, ctx: ConvertContext): string {
  let out = '';
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      const text = child.textContent || '';
      if (!text.trim()) {
        const prev = child.previousSibling;
        const next = child.nextSibling;
        if (isBlockElement(prev) || isBlockElement(next)) continue;
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
  const text = convertChildren(node, ctx).trim();
  return `\n\n${'*'.repeat(level)} ${text}\n\n`;
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
  const codeChild = node.querySelector?.('code');
  if (codeChild) {
    const lang = detectLanguage(codeChild);
    const code = (codeChild.textContent || '').replace(/\n$/, '');
    const langSuffix = lang ? ` ${lang}` : '';
    return `\n\n#+BEGIN_SRC${langSuffix}\n${code}\n#+END_SRC\n\n`;
  }
  const text = (node.textContent || '').replace(/\n$/, '');
  return `\n\n#+BEGIN_EXAMPLE\n${text}\n#+END_EXAMPLE\n\n`;
}

function detectLanguage(codeNode: any): string {
  const cls = codeNode.getAttribute?.('class') || '';
  const match = cls.match(/(?:^|\s)language-(\S+)/);
  return match ? match[1] : '';
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

function convertList(node: any, ordered: boolean, ctx: ConvertContext): string {
  const items: string[] = [];
  let counter = 1;

  const indent = ctx.listDepth > 0 ? ' '.repeat(ctx.indentWidth || 2) : '';
  const prefixWidth = ordered ? 3 : 2;

  for (const child of node.childNodes) {
    if (child.nodeType !== 1 || (child.tagName || '').toLowerCase() !== 'li') continue;

    const currentPrefix = ordered ? `${counter}. ` : '- ';
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

  const thead = node.querySelector?.('thead');
  if (thead) {
    for (const tr of thead.querySelectorAll?.('tr') || []) {
      rows.push(extractRowCells(tr, ctx));
      headerRowCount++;
    }
  }

  const tbody = node.querySelector?.('tbody');
  const bodyContainer = tbody || node;
  for (const tr of bodyContainer.querySelectorAll?.('tr') || []) {
    if (thead && tr.parentNode === thead) continue;
    rows.push(extractRowCells(tr, ctx));
  }

  if (rows.length === 0) return '';

  const colCount = Math.max(...rows.map(r => r.length));
  const colWidths = new Array(colCount).fill(0);
  for (const row of rows) {
    for (let i = 0; i < colCount; i++) {
      colWidths[i] = Math.max(colWidths[i], (row[i] || '').length);
    }
  }

  const formatRow = (row: string[]): string => {
    const cells = [];
    for (let i = 0; i < colCount; i++) {
      cells.push((row[i] || '').padEnd(colWidths[i]));
    }
    return '| ' + cells.join(' | ') + ' |';
  };

  const separatorRow = '|' + colWidths.map(w => `-${'-'.repeat(w)}-`).join('+') + '|';

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
