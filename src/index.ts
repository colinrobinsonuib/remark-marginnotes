import remarkMarginnotesPlugin from './remark-marginnotes.js';
import marginnoteHandlers from './rehype-handlers.js';

import { gfmMarginnoteFromMarkdown, gfmMarginnoteToMarkdown } from './mdast-util-marginnote.js';
import { gfmMarginnote } from './micromark-extension-marginnote.js';

export { remarkMarginnotesPlugin, marginnoteHandlers, remarkMarginNotes };

function remarkMarginNotes() {
    // @ts-expect-error: TS is wrong about `this`.
    // eslint-disable-next-line unicorn/no-this-assignment
    const self = /** @type {Processor<Root>} */ (this)
    const data = self.data()

    const micromarkExtensions =
        data.micromarkExtensions || (data.micromarkExtensions = [])
    const fromMarkdownExtensions =
        data.fromMarkdownExtensions || (data.fromMarkdownExtensions = [])
    const toMarkdownExtensions =
        data.toMarkdownExtensions || (data.toMarkdownExtensions = [])

    micromarkExtensions.push(gfmMarginnote())
    fromMarkdownExtensions.push(gfmMarginnoteFromMarkdown())
    toMarkdownExtensions.push(gfmMarginnoteToMarkdown())
}

export type * from './types.js';