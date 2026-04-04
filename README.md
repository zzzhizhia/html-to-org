# html-to-org

Convert HTML to [Org-mode](https://orgmode.org/) format.

Plenty of HTML-to-Markdown converters exist. Zero HTML-to-Org converters. This fills that gap.

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

Pass a base URL to resolve relative links:

```typescript
htmlToOrg('<a href="/about">About</a>', 'https://example.com');
// [[https://example.com/about][About]]
```

## Conversion Table

| HTML | Org-mode |
|------|----------|
| `<h1>` – `<h6>` | `*` – `******` headings |
| `<strong>`, `<b>` | `*bold*` |
| `<em>`, `<i>` | `/italic/` |
| `<u>` | `_underline_` |
| `<s>`, `<del>` | `+strikethrough+` |
| `<code>` | `=verbatim=` |
| `<sup>` | `^{superscript}` |
| `<sub>` | `_{subscript}` |
| `<a href="url">text</a>` | `[[url][text]]` |
| `<img src="url">` | `[[url]]` |
| `<ul>`, `<ol>` | `- item` / `1. item` (nested) |
| `<pre><code class="language-js">` | `#+BEGIN_SRC js` … `#+END_SRC` |
| `<pre>` | `#+BEGIN_EXAMPLE` … `#+END_EXAMPLE` |
| `<blockquote>` | `#+BEGIN_QUOTE` … `#+END_QUOTE` |
| `<table>` | `\| col1 \| col2 \|` with header separator |
| `<hr>` | `-----` |
| `<br>` | newline |

## Example

```html
<h1>My Article</h1>
<p>This is the <strong>introduction</strong> with a <a href="https://example.com">link</a>.</p>
<h2>Section One</h2>
<pre><code class="language-js">console.log("hello");</code></pre>
<ul>
  <li>Item A</li>
  <li>Item B</li>
</ul>
```

```org
* My Article

This is the *introduction* with a [[https://example.com][link]].

** Section One

#+BEGIN_SRC js
console.log("hello");
#+END_SRC

- Item A
- Item B
```

## API

### `htmlToOrg(html: string, baseUrl?: string): string`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `html` | `string` | (required) | HTML string to convert |
| `baseUrl` | `string` | `''` | Base URL for resolving relative links and images |

Returns an Org-mode formatted string. Returns `''` for empty input.

## How It Works

Parses HTML into a DOM tree via [linkedom](https://github.com/WebReflection/linkedom) (no browser required), walks it recursively converting each node to Org syntax, then normalizes whitespace. No intermediate Markdown step.

Handles: HTML entities, `<script>`/`<style>` stripping, nested lists with proper indentation, code language detection from `class="language-xxx"`, table column alignment, relative URL resolution, CJK text and emoji.

## License

MIT
