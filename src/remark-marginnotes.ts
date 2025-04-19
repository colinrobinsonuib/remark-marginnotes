import { visit, SKIP, CONTINUE } from 'unist-util-visit';
import { remove } from 'unist-util-remove';
import type { Node, Parent } from 'unist';
import type { Root, Text } from 'mdast'
import { MarginnoteDefinition, MarginnoteReference } from './types.js';

const C_PLUS = 43; // '+'
const C_BRACKET_OPEN = 91; // '['
const C_BRACKET_CLOSE = 93; // ']'
const C_COLON = 58; // ':'

const identifierRegex = /^[a-zA-Z0-9_-]+$/;
const referenceRegex = /\[\+(.*?)\]/g; // Changed % to +

function remarkMarginnotes() {
    return (tree: Root) => {
        const definitions: Record<string, { identifier: string; children: Node[] }> = {}; // Store definition content
        const definitionNodesToRemove: Node[] = []; // Store original definition nodes to remove later
        const identifierToNumber: Record<string, number> = {}; // Map identifier to its assigned sequential number
        const identifierFirstReferenceNode: Record<string, { parent: Node; index: number }> = {}; // Map identifier to the node where the definition should be inserted after
        const referenceCounts: Record<string, number> = {}; // Map identifier to how many times it has been referenced
        let footnoteCounter = 0; // Counter for assigning numbers

        // --- Pass 1: Find Definitions ---
        visit(tree, 'paragraph', (node: Parent, index: number | undefined, parent: Parent | undefined) => {
            if (
                !parent ||
                index === null || index === undefined ||
                node.children.length < 1 ||
                node.children[0] === undefined ||
                node.children[0].type !== 'text'
            ) {
                return;
            }

            const firstChild = node.children[0] as Text;
            const text = firstChild.value;

            if (
                text.charCodeAt(0) === C_BRACKET_OPEN &&
                text.charCodeAt(1) === C_PLUS
            ) {
                const closeBracketIndex = text.indexOf(']');
                if (closeBracketIndex > 2 && text.charCodeAt(closeBracketIndex + 1) === C_COLON) {
                    const identifier = text.slice(2, closeBracketIndex);

                    if (identifierRegex.test(identifier) && !definitions[identifier]) {
                        // Valid definition found
                        const definitionContentPrefix = text.slice(closeBracketIndex + 2).trimStart();
                        let definitionChildren = node.children.slice(1);

                        // Update or replace the first child's text node for content
                        if (definitionContentPrefix) {
                            firstChild.value = definitionContentPrefix;
                            definitionChildren = [firstChild, ...definitionChildren]; // Prepend the modified first child
                        } else {
                            // Definition content starts on the next node, do nothing here yet
                            // The original children array already excludes the first child
                        }

                        // Remove empty first text node if prefix was empty and it was the only content node
                        if (!definitionContentPrefix && node.children.length > 0) {
                            definitionChildren = node.children.slice(1);
                        } else if (definitionContentPrefix) {
                            (node.children[0] as Text).value = definitionContentPrefix;
                            definitionChildren = node.children;
                        } else {
                            definitionChildren = []; // Should not happen if paragraph has content
                        }


                        definitions[identifier] = {
                            identifier: identifier,
                            children: definitionChildren, // Store the content nodes
                        };

                        // Mark the original definition node for removal later
                        definitionNodesToRemove.push(node);
                        return SKIP; // Don't visit children
                    }
                }
            }
        });

        // --- Pass 2: Find References and Insert Nodes ---
        visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
            if (!parent || index === null || index === undefined || node.type !== 'text') return;

            referenceRegex.lastIndex = 0; // Reset regex state
            let match;
            let lastIndex = 0;
            const newChildren = [];
            let nodesAdded = 0; // Track how many nodes we add to adjust visitor index

            while ((match = referenceRegex.exec(node.value)) !== null) {

                const identifier = match[1];
                if (identifier) {
                    const definitionData = definitions[identifier];
                    // Only process if a valid definition exists
                    if (definitionData) {
                        // Add text before the match
                        if (match.index > lastIndex) {
                            newChildren.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
                        }

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

                        const referenceInstance = referenceCounts[identifier]!; // e.g., 1st, 2nd ref

                        // --- Create Reference Node ---
                        const referenceNode: MarginnoteReference = {
                            type: 'marginnoteReference',
                            identifier: identifier,
                            number: number,
                            referenceInstance: referenceInstance,
                        };
                        newChildren.push(referenceNode);
                        nodesAdded++;

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

                        lastIndex = match.index + match[0].length;
                    }
                }

                // Keep searching if identifier not found or regex needs to continue
                referenceRegex.lastIndex = match.index + 1; // Avoid infinite loop on empty match? Should not happen here. Reset if needed.
                if (lastIndex === match.index) { // Safety break for potential zero-length matches (unlikely here)
                    referenceRegex.lastIndex++;
                }

            } // End while loop

            // --- Replace Original Text Node if Matches Found ---
            if (newChildren.length > 0) {
                // Add any remaining text after the last match
                if (lastIndex < node.value.length) {
                    newChildren.push({ type: 'text', value: node.value.slice(lastIndex) });
                }

                // Replace the current text node with the new nodes
                parent.children.splice(index, 1, ...newChildren);

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