// examples/basic-usage.js
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMarginnotesPlugin, remarkMarginNotes, marginnoteHandlers } from '../dist/index.js'; // Import from compiled output
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import { read } from 'to-vfile';
import path from 'path';
import { fileURLToPath } from 'url';

import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFootnoteFromMarkdown } from 'mdast-util-gfm-footnote'
import { gfmFootnote } from 'micromark-extension-gfm-footnote'

// Helper to get directory name in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processMarkdown() {
    try {
        // Read the example Markdown file
        const file = await read(path.join(__dirname, 'example.md'));
        // console.log('--- Input Markdown ---');
        // console.log(String(file));

        /*const tree = fromMarkdown(String(file), {
            extensions: [gfmFootnote()],
            mdastExtensions: [gfmFootnoteFromMarkdown()]
        })

        console.log(JSON.stringify(tree, null, 4));*/


        // Process the file
        const result = await unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkMarginnotesPlugin)
            // .use(remarkMarginNotes)
            .use(remarkRehype, { handlers: marginnoteHandlers })
            .use(rehypeStringify)
            .process(file);

        console.log('\n--- Output HTML ---');
        console.log(String(result));

    } catch (error) {
        console.error("Error processing Markdown:", error);
    }
}

processMarkdown();