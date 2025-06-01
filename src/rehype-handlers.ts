import { h } from 'hastscript';
import type {Handlers, State} from 'mdast-util-to-hast';
import type { Element } from 'hast';
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
    label: 'text' | 'numbers' | 'shapes' | 'letters' | 'custom';
    charList?: string[];
}

const shapeList = [
    '●',  // Black Circle4
    '◆',  // Black Diamond
    '▲',  // Black Up-Pointing Triangle
    '■',  // Black Square
    '◉',  // Fisheye
    '❖',  // Black Diamond Minus White X
];

const letterList = 'abcdefghijklmnopqrstuvwxyz'.split('');


const marginnoteHandlers = (options: Options = {label: 'text'}): Handlers => {

    if(!options.label || !['numbers', 'shapes', 'letters', 'custom'].includes(options.label)) {
        options.label = 'text';
    }

    if(options.label === 'custom') {
        if (!options.charList || options.charList.length === 0) {
            throw new Error("Custom label option requires a non-empty charList array.");
        }
    }

    const useTextLabel = options.label === 'text';

    const getLabel = (node: MarginnoteReference | MarginnoteDefinition): string => {
        if(options.label === 'numbers') {
            return node.number.toString();
        } else if (options.label === 'shapes') {
            return shapeList[(node.number-1) % shapeList.length] as string;
        } else if (options.label === 'letters') {
            return letterList[(node.number-1) % letterList.length] as string;
        } else if (options.label === 'custom') {
            // @ts-ignore
            return options.charList[(node.number-1) % options.charList.length] as string;
        }
        throw new Error(`Invalid label option: ${options.label}`);
    };

    return {
        // Handler for the reference: [+note] -> <sup><a href="#marginnote-def-1" id="marginnote-ref-1-1">1</a></sup>
        marginnoteReference: (state: State, node: MarginnoteReference): Element => {

            const marginState = state as MarginState;

            const identifier = node.identifier;

            if (marginState.marginnoteCounts === undefined || marginState.marginnoteOrder === undefined) {
                marginState.marginnoteCounts = new Map<string, number>();
                marginState.marginnoteOrder = [];
            }

            let reuseCounter = marginState.marginnoteCounts.get(identifier)
            if (reuseCounter === undefined) {
                reuseCounter = 0
                marginState.marginnoteOrder.push(identifier)
            }
            reuseCounter += 1
            marginState.marginnoteCounts.set(identifier, reuseCounter)

            const referenceInstance = node.referenceInstance ?? 1;

            const safeId = normalizeUri(identifier.toLowerCase());
            const label = useTextLabel ? safeId : getLabel(node);

            const defId = `marginnote-def-${safeId}`; // Use span ID now
            const refId = `marginnote-ref-${safeId}-${referenceInstance}`;

            return h('sup', {className: 'marginnote-ref-wrapper'}, [
                h('a', {
                    href: `#${defId}`,
                    id: refId,
                    className: ['marginnote-ref'],
                    role: 'doc-noteref',
                    'aria-describedby': 'marginnote-label-' + safeId,
                    'data-marginnote-identifier': identifier,
                    'data-marginnote-instance': referenceInstance,
                }, `${label}`)
            ]);
        },

        // Handler for the definition: (inserted inline) -> <span id="marginnote-def-1" class="marginnote-def">...</span>
        marginnoteDefinition: (state: State, node: MarginnoteDefinition): Element => {

            const identifier = node.identifier;

            const safeId = normalizeUri(identifier.toLowerCase());
            const label = useTextLabel ? safeId : getLabel(node);

            const defId = `marginnote-def-${safeId}`;
            const firstRefId = `marginnote-ref-${safeId}-1`;

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
                h('span', {className: 'marginnote-number'}, `${label}`),
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
