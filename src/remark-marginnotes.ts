import { visit, SKIP, CONTINUE } from 'unist-util-visit';
import { remove } from 'unist-util-remove';
import type { Node, Parent } from 'unist';
import type { Paragraph, Root, Text } from 'mdast'
import { MarginnoteDefinition, MarginnoteReference } from './types.js';
import { gfmMarginnote } from './micromark-extension-marginnote.js';
import { gfmMarginnoteFromMarkdown } from './mdast-util-marginnote.js';

const C_PLUS = 43; // '+'
const C_BRACKET_OPEN = 91; // '['
const C_BRACKET_CLOSE = 93; // ']'
const C_COLON = 58; // ':'

const identifierRegex = /^[a-zA-Z0-9_-]+$/;
const referenceRegex = /\[\+(.*?)\]/g; // Changed % to +

function remarkMarginnotes() {
    // @ts-expect-error: TS is wrong about `this`.
    // eslint-disable-next-line unicorn/no-this-assignment
    const self = /** @type {Processor<Root>} */ (this)
    const data = self.data()
    const micromarkExtensions = data.micromarkExtensions || (data.micromarkExtensions = [])
    const fromMarkdownExtensions = data.fromMarkdownExtensions || (data.fromMarkdownExtensions = [])
    micromarkExtensions.push(gfmMarginnote())
    fromMarkdownExtensions.push(gfmMarginnoteFromMarkdown())

    return (tree: Root) => {
        const definitions: Record<string, { identifier: string; children: Node[] }> = {}; // Store definition content
        const definitionNodesToRemove: Node[] = []; // Store original definition nodes to remove later
        const identifierToNumber: Record<string, number> = {}; // Map identifier to its assigned sequential number
        const identifierFirstReferenceNode: Record<string, { parent: Node; index: number }> = {}; // Map identifier to the node where the definition should be inserted after
        const referenceCounts: Record<string, number> = {}; // Map identifier to how many times it has been referenced
        let footnoteCounter = 0; // Counter for assigning numbers

        // --- Pass 1: Find Definitions ---
        visit(tree, 'marginnoteDefinition', (node: MarginnoteDefinition, index: number | undefined, parent: Parent | undefined) => {
            if (
                !parent ||
                index === null || index === undefined ||
                node.children.length < 1 ||
                node.children[0] === undefined ||
                node.children[0].type !== 'paragraph'
            ) {
                return;
            }

            const identifier = node.identifier;
            definitions[identifier] = {
                identifier: identifier,
                children: node.children[0].children, // Store the children of the paragraph node
            };

            // Mark the original definition node for removal later
            definitionNodesToRemove.push(node);
            return SKIP; // Don't visit children
        });

        // --- Pass 2: Find References and Insert Nodes ---
        visit(tree, 'marginnoteReference', (node: MarginnoteReference, index: number | undefined, parent: Parent | undefined) => {
            if (!parent || index === null || index === undefined || node.type !== 'marginnoteReference') return;

            referenceRegex.lastIndex = 0; // Reset regex state
            let match;
            let lastIndex = 0;
            const newChildren = [];
            let nodesAdded = 0; // Track how many nodes we add to adjust visitor index


            const identifier = node.identifier;
            if (identifier) {
                const definitionData = definitions[identifier];
                // Only process if a valid definition exists
                if (definitionData) {
                    // Add text before the match
                    // if (match.index > lastIndex) {
                    // newChildren.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
                    // }

                    // --- Assign Number and Handle First/Subsequent Reference ---
                    let number;
                    let isFirstReference = false;
                    if (identifierToNumber[identifier] === undefined) {
                        // First time encountering this identifier
                        isFirstReference = true;
                        footnoteCounter++;
                        number = footnoteCounter;
                        identifierToNumber[identifier] = number;
                        referenceCounts[identifier] = 1;
                    } else {
                        // Subsequent reference
                        number = identifierToNumber[identifier];
                        referenceCounts[identifier]!++;
                    }


                    // --- Create and Add Definition Node (ONLY on first reference) ---
                    if (isFirstReference) {
                        const definitionNode: MarginnoteDefinition = {
                            type: 'marginnoteDefinition',
                            identifier: identifier,
                            number: number,
                            children: definitionData.children,
                        };
                        newChildren.push(definitionNode);
                        nodesAdded++;
                        // Store a reference to the parent/index where the first definition was inserted
                        // (though maybe not strictly needed now we insert directly)
                        identifierFirstReferenceNode[identifier] = { parent, index };
                    }

                    // lastIndex = match.index + match[0].length;
                }
            }

            // Keep searching if identifier not found or regex needs to continue
            // referenceRegex.lastIndex = match.index + 1; // Avoid infinite loop on empty match? Should not happen here. Reset if needed.
            // if (lastIndex === match.index) { // Safety break for potential zero-length matches (unlikely here)
            // referenceRegex.lastIndex++;
            // }


            // --- Replace Original Text Node if Matches Found ---
            if (newChildren.length > 0) {
                // Add any remaining text after the last match
                // if (lastIndex < node.value.length) {
                // newChildren.push({ type: 'text', value: node.value.slice(lastIndex) });
                // }

                // Replace the current text node with the new nodes
                parent.children.splice(index + 1, 0, ...newChildren);

                // Adjust visit index because we replaced 1 node with potentially multiple nodes
                return index + nodesAdded;
            }

            // No matches in this text node, continue normally
            return CONTINUE;
        });


        // --- Pass 3: Remove Original Definition Paragraphs ---
        // Do this last to ensure definition content was correctly captured
        if (definitionNodesToRemove.length > 0) {
            remove(tree, (node) => definitionNodesToRemove.includes(node));
        }

    };
}

export default remarkMarginnotes;