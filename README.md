# remark-marginnotes

[![npm version](https://img.shields.io/npm/v/remark-marginnotes.svg)](https://www.npmjs.com/package/remark-marginnotes)
<!-- Add other badges like build status, license later -->

A [Remark](https://github.com/remarkjs/remark) plugin to parse inline footnote definitions and references, transforming them into nodes suitable for creating accessible margin notes, often styled like Tufte sidenotes. Includes Rehype handlers for HTML conversion.

Currently only works with multi-word definitions

```markdown
this works:
[+note]: margin note here

this does not:
[+note]: something
```

## Content

*   [What this is](#what-this-is)
*   [Install](#install)
*   [Use](#use)
*   [Syntax](#syntax)
*   [Example HTML Output](#example-html-output)
*   [Styling](#styling)
*   [Compatibility](#compatibility)
*   [Security](#security)
*   [Contribute](#contribute)
*   [License](#license)

## What this is

This package provides a [unified](https://github.com/unifiedjs/unified) (Remark) plugin that finds footnote definitions written *inline* immediately following their first reference. Standard Markdown footnotes require definitions to be placed at the bottom of the document. This plugin allows a syntax like:

```
Some text with a reference [+note1].
[+note1]: This is the definition for the first note. It appears right here in the source.

Some more text, maybe referencing the same note again [+note1] or a new one [+note2].
[+note2]: This is the second note.
```

It transforms these into custom MDAST nodes (asideFootnoteReference, asideFootnoteDefinition). When used with remark-rehype and the included handlers, it generates HTML suitable for styling as inline tooltips, sidenotes, or margin notes.

## Install

`npm install remark-marginnotes`

## Use

```js
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkMarginnotesPlugin, marginnoteHandlers } from 'remark-marginnotes';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { VFile } from 'vfile';

const markdown = `
# Example Document

This document demonstrates the inline aside footnotes. Here's the first reference [+note1].

[+note1]: This is the definition for the first note. It can contain *Markdown* like emphasis and `code`.

Here's a second, different reference [+ref-abc].

[+ref-abc]: This definition belongs to the second reference.

We can still have normal[^fn] footnotes.
[^fn]: By normal, we mean gfm style footnotes

And there you go!
`;

async function processMarkdown() {
    try {
        // Read the example Markdown file
        const file = await read(path.join(__dirname, 'example.md'));
        console.log('--- Input Markdown ---');
        console.log(String(file));

        // Process the file
        const result = await unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkMarginnotesPlugin)
            .use(remarkRehype, {
                handlers: marginnoteHandlers
            })
            .use(rehypeStringify)
            .process(file);

        console.log('\n--- Output HTML ---');
        console.log(String(result));

    } catch (error) {
        console.error("Error processing Markdown:", error);
    }
}

processMarkdown();
```

## Syntax

- Reference: `[+identifier]`
  - identifier consists of letters, numbers, underscores (_), or hyphens (-). Example: `[+note-1]`, `[+figure_a]`.
- Definition: `[+identifier]: Definition text...`
  - Must start at the beginning of a paragraph.
  - Must match an identifier used in a reference before or in the same paragraph.
  - The definition text starts after the colon (`:`), optionally separated by whitespace.
  - The definition includes all content in the paragraph after the colon, including inline Markdown (like emphasis or code).

## Example HTML Output

Given the Markdown in the Use section, the approximate HTML output would be:

```html
<h1>Example Document</h1>
<p>This document demonstrates the inline aside footnotes. Here's the first reference <sup class="aside-footnote-ref-wrapper"><a href="#aside-fn-def-1" id="aside-fn-ref-1-1" class="aside-footnote-ref" role="doc-noteref" aria-describedby="aside-footnote-label-1" data-footnote-identifier="note1" data-footnote-instance="1">[1]</a></sup><span id="aside-fn-def-1" class="aside-footnote-def" role="note" data-footnote-identifier="note1"><span id="aside-footnote-label-1" class="hidden">Footnote 1</span><span class="aside-footnote-number">1. </span>This is the definition for the first note. It can contain <em>Markdown</em> like emphasis and <code>code</code>. <a href="#aside-fn-ref-1-1" class="aside-footnote-backref" role="doc-backlink" aria-label="Back to first 
reference for footnote 1">↩</a></span>.</p>
<p>Here's a second, different reference <sup class="aside-footnote-ref-wrapper"><a href="#aside-fn-def-2" id="aside-fn-ref-2-1" class="aside-footnote-ref" role="doc-noteref" aria-describedby="aside-footnote-label-2" data-footnote-identifier="ref-abc" data-footnote-instance="1">[2]</a></sup><span id="aside-fn-def-2" class="aside-footnote-def" role="note" data-footnote-identifier="ref-abc"><span id="aside-footnote-label-2" class="hidden">Footnote 2</span><span class="aside-footnote-number">2. </span>This 
definition belongs to the second reference. <a href="#aside-fn-ref-2-1" class="aside-footnote-backref" role="doc-backlink" aria-label="Back to first reference for footnote 2">↩</a></span>.</p>
<p>We can still have normal<sup><a href="#user-content-fn-fn" id="user-content-fnref-fn" data-footnote-ref aria-describedby="footnote-label">1</a></sup> footnotes.</p>
<p>And there you go!</p>
<section data-footnotes class="footnotes"><h2 class="sr-only" id="footnote-label">Footnotes</h2>
<ol>
<li id="user-content-fn-fn">
<p>By normal, we mean gfm style footnotes <a href="#user-content-fnref-fn" data-footnote-backref="" aria-label="Back to reference 1" class="data-footnote-backref">↩</a></p>
</li>
</ol>
</section>
```

## Styling

This plugin outputs semantic HTML with specific classes and ARIA attributes, but provides no CSS. You need to style it yourself.

- `.aside-footnote-ref-wrapper`: The `<sup>` wrapping the reference link.
- `.aside-footnote-ref`: The `<a>` link for the reference number (e.g., `[1]`).
- `.aside-footnote-def`: The `<span>` containing the definition.
- `.aside-footnote-number`: The `<span>` containing the number within the definition (e.g., `1.`).
- `.aside-footnote-backref`: The `<a>` link (`↩`) inside the definition pointing back to the first reference.
- `.hidden`: Class for the accessible label inside the definition span. You should hide this visually (e.g., using common sr-only CSS techniques).