# html-to-org

Convert HTML to [Org-mode](https://orgmode.org/) format.

There are plenty of HTML-to-Markdown converters in the JS ecosystem. There are zero HTML-to-Org converters. This library fills that gap.

## Install

```bash
npm install html-to-org
```

## Usage

```typescript
import { htmlToOrg } from 'html-to-org';

const org = htmlToOrg('<h1>Hello</h1><p>This is <strong>bold</strong> text.</p>');
// * Hello
//
// This is *bold* text.
```

Pass a base URL as the second argument to resolve relative links:

```typescript
htmlToOrg('<a href="/about">About</a>', 'https://example.com');
// [[https://example.com/about][About]]
```

## What it converts

| HTML | Org-mode |
|------|----------|
| `<h1>` ... `<h6>` | `*` ... `******` headings |
| `<strong>`, `<b>` | `*bold*` |
| `<em>`, `<i>` | `/italic/` |
| `<u>` | `_underline_` |
| `<s>`, `<del>` | `+strikethrough+` |
| `<code>` | `=verbatim=` |
| `<mark>` | `=highlighted=` |
| `<sup>` | `^{superscript}` |
| `<sub>` | `_{subscript}` |
| `<a href="url">text</a>` | `[[url][text]]` |
| `<img src="url">` | `[[url]]` |
| `<ul>`, `<ol>` | `- item` / `1. item` (nested supported) |
| `<pre><code class="language-js">` | `#+BEGIN_SRC js` ... `#+END_SRC` |
| `<pre>` | `#+BEGIN_EXAMPLE` ... `#+END_EXAMPLE` |
| `<blockquote>` | `#+BEGIN_QUOTE` ... `#+END_QUOTE` |
| `<table>` | `\| col1 \| col2 \|` with alignment and header separator |
| `<hr>` | `-----` |
| `<br>` | newline |

## Example

Input:

```html
<h1>My Article</h1>
<p>This is the <strong>introduction</strong> with a <a href="https://example.com">link</a>.</p>
<h2>Section One</h2>
<p>Some content with <code>inline code</code>.</p>
<pre><code class="language-js">console.log("hello");</code></pre>
<ul>
  <li>Item A</li>
  <li>Item B</li>
</ul>
```

Output:

```org
* My Article

This is the *introduction* with a [[https://example.com][link]].

** Section One

Some content with =inline code=.

#+BEGIN_SRC js
console.log("hello");
#+END_SRC

- Item A
- Item B
```

## How it works

1. Parses HTML into a DOM tree using [linkedom](https://github.com/WebReflection/linkedom) (no browser required)
2. Walks the tree recursively, converting each node to org syntax
3. Collapses whitespace and normalizes blank lines

No intermediate Markdown step. HTML goes directly to Org.

## Edge cases handled

- Strips `<script>`, `<style>`, `<noscript>` tags
- Decodes HTML entities (`&amp;` ... `&`)
- Collapses excessive whitespace
- Skips whitespace-only text nodes between block elements
- Resolves relative URLs against a base URL
- Detects code language from `class="language-xxx"` or `class="hljs language-xxx"`
- Aligns table columns with padding
- Handles nested lists with proper indentation (2-space for `- `, 3-space for `1. `)
- Works with CJK text and emoji

## API

### `htmlToOrg(html: string, baseUrl?: string): string`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `html` | `string` | (required) | HTML string to convert |
| `baseUrl` | `string` | `''` | Base URL for resolving relative links and images |

Returns an Org-mode formatted string. Returns `''` for empty or whitespace-only input.

## Development

```bash
pnpm install
pnpm test          # run tests
pnpm test:watch    # watch mode
pnpm build         # build for publishing
```

58 tests covering all supported elements, nesting, edge cases, and a full-document integration test.

## License

MIT
