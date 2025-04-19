# remark-marginnotes

[![npm version](https://img.shields.io/npm/v/remark-marginnotes.svg)](https://www.npmjs.com/package/remark-marginnotes)
<!-- Add other badges like build status, license later -->

A [Remark](https://github.com/remarkjs/remark) plugin to parse inline footnote definitions and references, transforming them into nodes suitable for creating accessible margin notes, often styled like Tufte sidenotes. Includes Rehype handlers for HTML conversion.

## Content

*   [What this is](#what-this-is)
*   [When to use this](#when-to-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`unified().use(remarkInlineAsideFootnotes)`](#unifieduseremarkinlineasidefootnotes)
    *   [`rehypeInlineAsideFootnoteHandlers`](#rehypeinlineasidefootnotehandlers)
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
import remarkMarginnotes, { rehypeMarginnotesHandlers } from 'remark-marginnotes';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { VFile } from 'vfile';

const markdown = `
This is some text with a reference[+ref1].
[+ref1]: This is the definition for the first reference.

Here is another reference [+ref2].
[+ref2]: And its definition. Note that this is the *first* appearance.

You can reference the first one again [+ref1].
`;

async function processMarkdown() {
  const file = await unified()
    .use(remarkParse)
    .use(remarkMarginnotes) // Use the remark plugin
    .use(remarkRehype, {
      // Pass the handlers to remark-rehype
      handlers: rehypeMarginnotesHandlers
    })
    .use(rehypeStringify)
    .process(new VFile({ path: 'input.md', value: markdown }));

  console.log(String(file));
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
<p>This is some text with a reference</p>
```

## Styling

This plugin outputs semantic HTML with specific classes and ARIA attributes, but provides no CSS. You need to style it yourself.

- `.aside-footnote-ref-wrapper`: The `<sup>` wrapping the reference link.
- `.aside-footnote-ref`: The `<a>` link for the reference number (e.g., `[1]`).
- `.aside-footnote-def`: The `<span>` containing the definition.
- `.aside-footnote-number`: The `<span>` containing the number within the definition (e.g., `1.`).
- `.aside-footnote-backref`: The `<a>` link (`↩`) inside the definition pointing back to the first reference.
- `.hidden`: Class for the accessible label inside the definition span. You should hide this visually (e.g., using common sr-only CSS techniques).