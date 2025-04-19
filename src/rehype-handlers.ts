import { h } from 'hastscript'; // Helper for creating HAST (HTML AST) nodes
import type { State } from 'mdast-util-to-hast'; // Import the State type
import type { Element } from 'hast'; // HAST element type
import { MarginnoteDefinition, MarginnoteReference } from './types.js';


declare module 'mdast' {
    interface RootContentMap {
        asideFootnoteDefinition: MarginnoteDefinition;
    }
}

const marginnoteHandlers = {
    // Handler for the reference: [%note] -> <sup><a href="#aside-fn-def-1" id="aside-fn-ref-1-1">[1]</a></sup>
    // (No changes needed for the reference handler)
    marginnoteReference: (state: State, node: MarginnoteReference): Element => {
        const number = node.number ?? 'ERR';
        const identifier = node.identifier;
        const referenceInstance = node.referenceInstance ?? 1;

        const defId = `aside-fn-def-${number}`; // Use span ID now
        const refId = `aside-fn-ref-${number}-${referenceInstance}`;

        // Optional: Add a class to the sup wrapper if needed for styling interactions
        return h('sup', { className: 'aside-footnote-ref-wrapper' }, [
            h('a', {
                href: `#${defId}`, // Points to the definition span ID
                id: refId,
                className: ['aside-footnote-ref'],
                role: 'doc-noteref',
                'aria-describedby': 'aside-footnote-label-' + number, // Points to label within the definition span
                'data-footnote-identifier': identifier,
                'data-footnote-instance': referenceInstance,
            }, `[${number}]`)
        ]);
    },

    // Handler for the definition: (inserted inline) -> <span id="aside-fn-def-1" class="aside-footnote-def">...</span>
    marginnoteDefinition: (state: State, node: MarginnoteDefinition): Element => {
        const number = node.number ?? 'ERR';
        const identifier = node.identifier;
        const defId = `aside-fn-def-${number}`; // ID for this definition span
        const firstRefId = `aside-fn-ref-${number}-1`; // ID of the first reference

        // Process the content of the footnote definition
        const content = state.all(node);

        // Create the visually hidden label for aria-describedby
        const label = h('span', { id: `aside-footnote-label-${number}`, className: 'hidden' }, `Footnote ${number}`);

        // Back-reference link
        const backReference = h('a', {
            href: `#${firstRefId}`,
            className: ['aside-footnote-backref'],
            role: 'doc-backlink',
            'aria-label': `Back to first reference for footnote ${number}`,
        }, '↩');

        // Assemble children for the span
        const childrenToRender = [
            label,
            h('span', { className: 'aside-footnote-number' }, `${number}. `),
            ...content,
            ' ',
            backReference
        ];

        return h('span', {
            id: defId,
            className: ['aside-footnote-def'],
            role: 'note',
            'data-footnote-identifier': identifier,
        }, childrenToRender);
    },
};

export default marginnoteHandlers;