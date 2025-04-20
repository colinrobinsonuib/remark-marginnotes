import { h } from 'hastscript'; // Helper for creating HAST (HTML AST) nodes
import type { State } from 'mdast-util-to-hast'; // Import the State type
import type { Element } from 'hast'; // HAST element type
import { MarginnoteDefinition, MarginnoteReference } from './types.js';
import { normalizeUri } from 'micromark-util-sanitize-uri'

interface MarginState extends State {
    marginnoteCounts: Map<string, number>;
    marginnoteOrder: string[];
}

declare module 'mdast' {
    interface RootContentMap {
        asideFootnoteDefinition: MarginnoteDefinition;
    }
}

const marginnoteHandlers = {
    // Handler for the reference: [%note] -> <sup><a href="#marginnote-def-1" id="marginnote-ref-1-1">[1]</a></sup>
    // (No changes needed for the reference handler)
    marginnoteReference: (state: MarginState, node: MarginnoteReference): Element => {

        const identifier = node.identifier;
        const safeId = normalizeUri(identifier.toLowerCase())

        if (state.marginnoteCounts === undefined || state.marginnoteOrder === undefined) {
            state.marginnoteCounts = new Map<string, number>();
            state.marginnoteOrder = [];
        }


        const index = state.marginnoteOrder.indexOf(identifier)

        let counter: number;
        let reuseCounter = state.marginnoteCounts.get(identifier)
        if (reuseCounter === undefined) {
            reuseCounter = 0
            state.footnoteOrder.push(identifier)
            counter = state.footnoteOrder.length
        } else {
            counter = index + 1
        }
        reuseCounter += 1
        state.footnoteCounts.set(identifier, reuseCounter)


        const referenceInstance = node.referenceInstance ?? 1;

        const defId = `marginnote-def-${safeId}`; // Use span ID now
        const refId = `marginnote-ref-${safeId}-${referenceInstance}`;

        // Optional: Add a class to the sup wrapper if needed for styling interactions
        return h('sup', { className: 'marginnote-ref-wrapper' }, [
            h('a', {
                href: `#${defId}`, // Points to the definition span ID
                id: refId,
                className: ['marginnote-ref'],
                role: 'doc-noteref',
                'aria-describedby': 'marginnote-label-' + safeId, // Points to label within the definition span
                'data-footnote-identifier': identifier,
                'data-footnote-instance': referenceInstance,
            }, `[${safeId}]`)
        ]);
    },

    // Handler for the definition: (inserted inline) -> <span id="marginnote-def-1" class="marginnote-def">...</span>
    marginnoteDefinition: (state: MarginState, node: MarginnoteDefinition): Element => {
        const identifier = node.identifier;
        const safeId = normalizeUri(identifier.toLowerCase())

        const defId = `marginnote-def-${safeId}`; // ID for this definition span
        const firstRefId = `marginnote-ref-${safeId}-1`; // ID of the first reference

        // Process the content of the footnote definition
        const content = state.all(node);

        // Create the visually hidden label for aria-describedby
        const label = h('span', { id: `marginnote-label-${safeId}`, className: 'hidden' }, `Marginnote ${safeId}`);

        // Back-reference link
        const backReference = h('a', {
            href: `#${firstRefId}`,
            className: ['marginnote-backref'],
            role: 'doc-backlink',
            'aria-label': `Back to first reference for marginnote ${safeId}`,
        }, '↩');

        // Assemble children for the span
        const childrenToRender = [
            label,
            h('span', { className: 'marginnote-number' }, `${safeId}. `),
            ...content,
            ' ',
            backReference
        ];

        return h('span', {
            id: defId,
            className: ['marginnote-def'],
            role: 'note',
            'data-footnote-identifier': identifier,
        }, childrenToRender);
    },
};

export default marginnoteHandlers;