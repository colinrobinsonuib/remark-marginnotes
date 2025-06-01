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
*   [Options](#options)

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

[+note1]: This is the definition for the first note. It can contain *Markdown* like emphasis and \`code\`.

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
<p>This document demonstrates the inline aside footnotes. Here's the first reference <sup class="marginnote-ref-wrapper"><a href="#marginnote-def-note1" id="marginnote-ref-note1-1" class="marginnote-ref" role="doc-noteref" aria-describedby="marginnote-label-note1" data-marginnote-identifier="note1" data-marginnote-instance="1">note1</a></sup><span id="marginnote-def-note1" class="marginnote-def" role="note" data-marginnote-identifier="note1"><span id="marginnote-label-note1" class="hidden">Marginnote note1</span><span class="marginnote-number">note1</span>This is the definition for the first note. It can contain <em>Markdown</em> like emphasis and <code>code</code>. <a href="#marginnote-ref-note1-1" class="marginnote-backref" role="doc-backlink" aria-label="Back to first reference for marginnote note1">↩</a></span>.</p>
<p>Here's a second, different reference <sup class="marginnote-ref-wrapper"><a href="#marginnote-def-ref-abc" id="marginnote-ref-ref-abc-1" class="marginnote-ref" role="doc-noteref" aria-describedby="marginnote-label-ref-abc" data-marginnote-identifier="ref-abc" data-marginnote-instance="1">ref-abc</a></sup><span id="marginnote-def-ref-abc" class="marginnote-def" role="note" data-marginnote-identifier="ref-abc"><span id="marginnote-label-ref-abc" class="hidden">Marginnote ref-abc</span><span class="marginnote-number">ref-abc</span>This definition belongs to the second reference. <a href="#marginnote-ref-ref-abc-1" class="marginnote-backref" role="doc-backlink" aria-label="Back to first reference for marginnote ref-abc">↩</a></span>.</p>
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

- `.marginnote-ref-wrapper`: The `<sup>` wrapping the reference link.
- `.marginnote-ref`: The `<a>` link for the reference number (e.g., `1`).
- `.marginnote-def`: The `<span>` containing the definition.
- `.marginnote-number`: The `<span>` containing the number within the definition (e.g., `1.`).
- `.marginnote-backref`: The `<a>` link (`↩`) inside the definition pointing back to the first reference.
- `.hidden`: Class for the accessible label inside the definition span. You should hide this visually (e.g., using common sr-only CSS techniques).

<details>
<summary>Example style</summary>

```css
article > * {
    width: 75%; /* Limit top level blocks to 75% because margin notes will take right 25% */
}

.marginnote-ref-wrapper {
    background: white;
}
.marginnote-ref-wrapper > a {
    color: black;
}

.marginnote-def {
  float: right;
  clear: right;
  margin-right: -30%;
  width: 25%;
  margin-top: 0.3rem;
  line-height: 1.3;
  vertical-align: baseline;
  position: relative;
  padding-bottom: 0.5em;
  font-size: 0.9em;
  border-bottom: 1px dotted #666;
  margin-bottom: 2em;
}

.marginnote-def::before {
  content: "";
  position: absolute;
  top: calc(29px);
  left: 0;
  width: 100%;
  height: 0;
  border-bottom: 1px dotted #666;
}

.marginnote-number {
  display: block;
  width: 30px;
  height: 30px;
  line-height: 30px;
  text-align: center;
  border: 1px dotted #666;
  border-bottom: 0;
  margin-bottom: 0.5em;
}

.marginnote-backref {
  margin-left: 0.5em;
  text-decoration: none;
}

.hidden {
    display: none;
}
```
</details>


## Options

```ts
type Options = {
    label: 'text' | 'numbers' | 'shapes' | 'letters' | 'custom';
    charList?: string[];
}
```

### Example Usage
```ts
const result = await unified()
.use(remarkParse)
.use(remarkGfm)
.use(remarkMarginnotesPlugin)
.use(remarkRehype, { handlers: marginnoteHandlers({
    label: 'custom',
    charList: ['†', '‡', '§']
  })
})
.use(rehypeStringify)
.process(file);
```

### label

- `text`: Use the definition text as the label.
- `numbers`: Use sequential numbers (1, 2, 3...).
- `shapes`: Use shapes like `●`, `◆`, `★`.
- `letters`: Use letters (a, b, c...).
- `custom`: Use a custom character list defined in `charList`.

### charList

If you choose `custom` for the `label` option, you can provide a `charList` array with your own characters. The characters will be used in the order they appear in the list, cycling through if there are more references than characters.