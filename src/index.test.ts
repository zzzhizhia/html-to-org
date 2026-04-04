import { describe, test, expect } from 'vitest';
import { htmlToOrg } from './index';

// ---------------------------------------------------------------------------
// Basic text
// ---------------------------------------------------------------------------

describe('basic text', () => {
  test('converts plain paragraph', () => {
    expect(htmlToOrg('<p>Hello world</p>')).toBe('Hello world');
  });

  test('converts multiple paragraphs with blank line between', () => {
    expect(htmlToOrg('<p>First</p><p>Second</p>')).toBe('First\n\nSecond');
  });

  test('trims whitespace in paragraphs', () => {
    expect(htmlToOrg('<p>  spaced  </p>')).toBe('spaced');
  });

  test('returns empty string for empty input', () => {
    expect(htmlToOrg('')).toBe('');
  });

  test('returns empty string for whitespace-only input', () => {
    expect(htmlToOrg('   ')).toBe('');
  });

  test('handles bare text without wrapper', () => {
    expect(htmlToOrg('bare text')).toBe('bare text');
  });
});

// ---------------------------------------------------------------------------
// Headings
// ---------------------------------------------------------------------------

describe('headings', () => {
  test('converts h1 to single star', () => {
    expect(htmlToOrg('<h1>Title</h1>')).toBe('* Title');
  });

  test('converts h2 to double star', () => {
    expect(htmlToOrg('<h2>Section</h2>')).toBe('** Section');
  });

  test('converts h3 to triple star', () => {
    expect(htmlToOrg('<h3>Subsection</h3>')).toBe('*** Subsection');
  });

  test('converts h4 to four stars', () => {
    expect(htmlToOrg('<h4>Sub-subsection</h4>')).toBe('**** Sub-subsection');
  });

  test('converts h5 to five stars', () => {
    expect(htmlToOrg('<h5>Deep</h5>')).toBe('***** Deep');
  });

  test('converts h6 to six stars', () => {
    expect(htmlToOrg('<h6>Deepest</h6>')).toBe('****** Deepest');
  });

  test('heading followed by paragraph', () => {
    expect(htmlToOrg('<h1>Title</h1><p>Content</p>')).toBe('* Title\n\nContent');
  });
});

// ---------------------------------------------------------------------------
// Inline formatting
// ---------------------------------------------------------------------------

describe('inline formatting', () => {
  test('converts <strong> to org bold', () => {
    expect(htmlToOrg('<p>This is <strong>bold</strong> text</p>')).toBe('This is *bold* text');
  });

  test('converts <b> to org bold', () => {
    expect(htmlToOrg('<p>This is <b>bold</b> text</p>')).toBe('This is *bold* text');
  });

  test('converts <em> to org italic', () => {
    expect(htmlToOrg('<p>This is <em>italic</em> text</p>')).toBe('This is /italic/ text');
  });

  test('converts <i> to org italic', () => {
    expect(htmlToOrg('<p>This is <i>italic</i> text</p>')).toBe('This is /italic/ text');
  });

  test('converts <u> to org underline', () => {
    expect(htmlToOrg('<p>This is <u>underlined</u> text</p>')).toBe('This is _underlined_ text');
  });

  test('converts <s> to org strikethrough', () => {
    expect(htmlToOrg('<p>This is <s>deleted</s> text</p>')).toBe('This is +deleted+ text');
  });

  test('converts <del> to org strikethrough', () => {
    expect(htmlToOrg('<p>This is <del>deleted</del> text</p>')).toBe('This is +deleted+ text');
  });

  test('converts <code> to org verbatim', () => {
    expect(htmlToOrg('<p>Use <code>console.log</code> here</p>')).toBe('Use =console.log= here');
  });

  test('converts <mark> to org verbatim', () => {
    expect(htmlToOrg('<p>This is <mark>highlighted</mark> text</p>')).toBe('This is =highlighted= text');
  });

  test('converts <sup> to superscript', () => {
    expect(htmlToOrg('<p>E=mc<sup>2</sup></p>')).toBe('E=mc^{2}');
  });

  test('converts <sub> to subscript', () => {
    expect(htmlToOrg('<p>H<sub>2</sub>O</p>')).toBe('H_{2}O');
  });
});

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

describe('links', () => {
  test('converts link with text', () => {
    expect(htmlToOrg('<a href="https://example.com">Example</a>'))
      .toBe('[[https://example.com][Example]]');
  });

  test('converts link without text (uses URL as text)', () => {
    expect(htmlToOrg('<a href="https://example.com"></a>'))
      .toBe('[[https://example.com]]');
  });

  test('resolves relative links against base URL', () => {
    expect(htmlToOrg('<a href="/page">Page</a>', 'https://example.com'))
      .toBe('[[https://example.com/page][Page]]');
  });

  test('preserves absolute links regardless of base URL', () => {
    expect(htmlToOrg('<a href="https://other.com/page">Page</a>', 'https://example.com'))
      .toBe('[[https://other.com/page][Page]]');
  });

  test('link with same text as URL omits description', () => {
    expect(htmlToOrg('<a href="https://example.com">https://example.com</a>'))
      .toBe('[[https://example.com]]');
  });
});

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

describe('images', () => {
  test('converts image to org link', () => {
    expect(htmlToOrg('<img src="https://example.com/img.png" alt="A photo">'))
      .toBe('[[https://example.com/img.png]]');
  });

  test('resolves relative image src against base URL', () => {
    expect(htmlToOrg('<img src="/img.png">', 'https://example.com'))
      .toBe('[[https://example.com/img.png]]');
  });
});

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

describe('unordered lists', () => {
  test('converts simple unordered list', () => {
    expect(htmlToOrg('<ul><li>One</li><li>Two</li><li>Three</li></ul>'))
      .toBe('- One\n- Two\n- Three');
  });

  test('converts nested unordered list', () => {
    const html = '<ul><li>A<ul><li>A1</li><li>A2</li></ul></li><li>B</li></ul>';
    expect(htmlToOrg(html)).toBe('- A\n  - A1\n  - A2\n- B');
  });
});

describe('ordered lists', () => {
  test('converts simple ordered list', () => {
    expect(htmlToOrg('<ol><li>First</li><li>Second</li><li>Third</li></ol>'))
      .toBe('1. First\n2. Second\n3. Third');
  });

  test('converts nested ordered list', () => {
    const html = '<ol><li>A<ol><li>A1</li><li>A2</li></ol></li><li>B</li></ol>';
    expect(htmlToOrg(html)).toBe('1. A\n   1. A1\n   2. A2\n2. B');
  });
});

describe('mixed lists', () => {
  test('converts unordered inside ordered', () => {
    const html = '<ol><li>Item<ul><li>Sub</li></ul></li></ol>';
    expect(htmlToOrg(html)).toBe('1. Item\n   - Sub');
  });
});

// ---------------------------------------------------------------------------
// Code blocks
// ---------------------------------------------------------------------------

describe('code blocks', () => {
  test('converts pre>code to org source block', () => {
    expect(htmlToOrg('<pre><code>const x = 1;</code></pre>'))
      .toBe('#+BEGIN_SRC\nconst x = 1;\n#+END_SRC');
  });

  test('converts pre>code with language class', () => {
    expect(htmlToOrg('<pre><code class="language-javascript">const x = 1;</code></pre>'))
      .toBe('#+BEGIN_SRC javascript\nconst x = 1;\n#+END_SRC');
  });

  test('converts pre>code with hljs language class', () => {
    expect(htmlToOrg('<pre><code class="hljs language-python">print("hi")</code></pre>'))
      .toBe('#+BEGIN_SRC python\nprint("hi")\n#+END_SRC');
  });

  test('preserves multiline code', () => {
    const html = '<pre><code>line1\nline2\nline3</code></pre>';
    expect(htmlToOrg(html)).toBe('#+BEGIN_SRC\nline1\nline2\nline3\n#+END_SRC');
  });

  test('converts standalone pre without code child', () => {
    expect(htmlToOrg('<pre>preformatted text</pre>'))
      .toBe('#+BEGIN_EXAMPLE\npreformatted text\n#+END_EXAMPLE');
  });
});

// ---------------------------------------------------------------------------
// Blockquotes
// ---------------------------------------------------------------------------

describe('blockquotes', () => {
  test('converts simple blockquote', () => {
    expect(htmlToOrg('<blockquote><p>A wise quote</p></blockquote>'))
      .toBe('#+BEGIN_QUOTE\nA wise quote\n#+END_QUOTE');
  });

  test('converts blockquote with multiple paragraphs', () => {
    expect(htmlToOrg('<blockquote><p>Line 1</p><p>Line 2</p></blockquote>'))
      .toBe('#+BEGIN_QUOTE\nLine 1\n\nLine 2\n#+END_QUOTE');
  });
});

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

describe('tables', () => {
  test('converts simple table', () => {
    const html = '<table><tr><td>A</td><td>B</td></tr><tr><td>1</td><td>2</td></tr></table>';
    expect(htmlToOrg(html)).toBe('| A | B |\n| 1 | 2 |');
  });

  test('converts table with header row', () => {
    const html = '<table><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>Alice</td><td>30</td></tr></tbody></table>';
    expect(htmlToOrg(html)).toBe('| Name  | Age |\n|-------+-----|\n| Alice | 30  |');
  });

  test('pads columns for alignment', () => {
    const html = '<table><tr><td>Short</td><td>A</td></tr><tr><td>X</td><td>Longer</td></tr></table>';
    expect(htmlToOrg(html)).toBe('| Short | A      |\n| X     | Longer |');
  });
});

// ---------------------------------------------------------------------------
// Horizontal rule
// ---------------------------------------------------------------------------

describe('horizontal rule', () => {
  test('converts hr to org separator', () => {
    expect(htmlToOrg('<p>Before</p><hr><p>After</p>'))
      .toBe('Before\n\n-----\n\nAfter');
  });
});

// ---------------------------------------------------------------------------
// Line breaks
// ---------------------------------------------------------------------------

describe('line breaks', () => {
  test('converts br to newline', () => {
    expect(htmlToOrg('<p>Line 1<br>Line 2</p>'))
      .toBe('Line 1\nLine 2');
  });
});

// ---------------------------------------------------------------------------
// Nested inline formatting
// ---------------------------------------------------------------------------

describe('nested formatting', () => {
  test('bold inside italic', () => {
    expect(htmlToOrg('<p><em>italic and <strong>bold</strong></em></p>'))
      .toBe('/italic and *bold*/');
  });

  test('link inside bold', () => {
    expect(htmlToOrg('<p><strong><a href="https://example.com">link</a></strong></p>'))
      .toBe('*[[https://example.com][link]]*');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  test('handles HTML entities', () => {
    expect(htmlToOrg('<p>&amp; &lt; &gt; &quot;</p>')).toBe('& < > "');
  });

  test('strips script tags', () => {
    expect(htmlToOrg('<p>text</p><script>alert("xss")</script>')).toBe('text');
  });

  test('strips style tags', () => {
    expect(htmlToOrg('<p>text</p><style>body{color:red}</style>')).toBe('text');
  });

  test('handles deeply nested divs by extracting content', () => {
    expect(htmlToOrg('<div><div><div><p>Deep</p></div></div></div>')).toBe('Deep');
  });

  test('handles CJK text', () => {
    expect(htmlToOrg('<p>你好世界</p>')).toBe('你好世界');
  });

  test('handles emoji', () => {
    expect(htmlToOrg('<p>Hello 🌍</p>')).toBe('Hello 🌍');
  });

  test('collapses excessive whitespace', () => {
    expect(htmlToOrg('<p>  too   many   spaces  </p>')).toBe('too many spaces');
  });
});

// ---------------------------------------------------------------------------
// Complex document
// ---------------------------------------------------------------------------

describe('complex document', () => {
  test('converts a realistic article fragment', () => {
    const html = `
      <h1>My Article</h1>
      <p>This is the <strong>introduction</strong> with a <a href="https://example.com">link</a>.</p>
      <h2>Section One</h2>
      <p>Some content with <code>inline code</code>.</p>
      <pre><code class="language-js">console.log("hello");</code></pre>
      <ul>
        <li>Item A</li>
        <li>Item B</li>
      </ul>
    `;
    const expected = [
      '* My Article',
      '',
      'This is the *introduction* with a [[https://example.com][link]].',
      '',
      '** Section One',
      '',
      'Some content with =inline code=.',
      '',
      '#+BEGIN_SRC js',
      'console.log("hello");',
      '#+END_SRC',
      '',
      '- Item A',
      '- Item B',
    ].join('\n');

    expect(htmlToOrg(html)).toBe(expected);
  });
});
