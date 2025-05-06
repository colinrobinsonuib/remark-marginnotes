import { h } from 'hastscript'; // Helper for creating HAST (HTML AST) nodes
import type {Handlers, State} from 'mdast-util-to-hast'; // Import the State type
import type { Element } from 'hast'; // HAST element type
import { MarginnoteDefinition, MarginnoteReference } from './types.js';
import { normalizeUri } from 'micromark-util-sanitize-uri'

interface MarginState extends State {
    marginnoteCounts: Map<string, number>;
    marginnoteOrder: string[];
}

declare module 'mdast' {
    interface RootContentMap {
        asideMarginnoteDefinition: MarginnoteDefinition;
        asideMarginnoteReference: MarginnoteReference;
    }
}

type Options = {
    useNumbers?: boolean;
    useShapes?: boolean;
}

const shapeList = [
    '▲',  // Black Up-Pointing Triangle
    '■',  // Black Square
    '●',  // Black Circle
    '◆',  // Black Diamond
    '★',  // Black Star
    '♥',  // Black Heart Suit
    '❖',  // Black Diamond Minus White X
    '◉',  // Fisheye
];


const marginnoteHandlers = (options: Options): Handlers => {

    if(options.useShapes){
        options.useNumbers = true;
    }

    return {
        // Handler for the reference: [+note] -> <sup><a href="#marginnote-def-1" id="marginnote-ref-1-1">[1]</a></sup>
        // (No changes needed for the reference handler)
        marginnoteReference: (state: State, node: MarginnoteReference): Element => {

            const marginState = state as MarginState;

            const identifier = node.identifier;

            if (marginState.marginnoteCounts === undefined || marginState.marginnoteOrder === undefined) {
                marginState.marginnoteCounts = new Map<string, number>();
                marginState.marginnoteOrder = [];
            }

            const index = marginState.marginnoteOrder.indexOf(identifier)

            let reuseCounter = marginState.marginnoteCounts.get(identifier)
            if (reuseCounter === undefined) {
                reuseCounter = 0
                marginState.marginnoteOrder.push(identifier)
            }
            reuseCounter += 1
            marginState.marginnoteCounts.set(identifier, reuseCounter)

            const referenceInstance = node.referenceInstance ?? 1;

            const safeId = options.useNumbers ? node.number : normalizeUri(identifier.toLowerCase())
            const label = options.useShapes ? shapeList[node.number % shapeList.length] : safeId;

            const defId = `marginnote-def-${safeId}`; // Use span ID now
            const refId = `marginnote-ref-${safeId}-${referenceInstance}`;

            // Optional: Add a class to the sup wrapper if needed for styling interactions
            return h('sup', {className: 'marginnote-ref-wrapper'}, [
                h('a', {
                    href: `#${defId}`, // Points to the definition span ID
                    id: refId,
                    className: ['marginnote-ref'],
                    role: 'doc-noteref',
                    'aria-describedby': 'marginnote-label-' + safeId, // Points to label within the definition span
                    'data-marginnote-identifier': identifier,
                    'data-marginnote-instance': referenceInstance,
                }, `[${label}]`)
            ]);
        },

        // Handler for the definition: (inserted inline) -> <span id="marginnote-def-1" class="marginnote-def">...</span>
        marginnoteDefinition: (state: State, node: MarginnoteDefinition): Element => {

            const identifier = node.identifier;

            const safeId = options.useNumbers ? node.number : normalizeUri(identifier.toLowerCase())
            const label = options.useShapes ? shapeList[node.number % shapeList.length] : safeId;

            const defId = `marginnote-def-${safeId}`; // ID for this definition span
            const firstRefId = `marginnote-ref-${safeId}-1`; // ID of the first reference

            // Process the content of the marginnote definition
            const content = state.all(node);

            // Create the visually hidden label for aria-describedby
            const arialabel = h('span', {id: `marginnote-label-${safeId}`, className: 'hidden'}, `Marginnote ${safeId}`);

            // Back-reference link
            const backReference = h('a', {
                href: `#${firstRefId}`,
                className: ['marginnote-backref'],
                role: 'doc-backlink',
                'aria-label': `Back to first reference for marginnote ${safeId}`,
            }, '↩');

            // Assemble children for the span
            const childrenToRender = [
                arialabel,
                h('span', {className: 'marginnote-number'}, `${label} `),
                ...content,
                ' ',
                backReference
            ];

            return h('span', {
                id: defId,
                className: ['marginnote-def'],
                role: 'note',
                'data-marginnote-identifier': identifier,
            }, childrenToRender);
        },
    };
};

export default marginnoteHandlers;