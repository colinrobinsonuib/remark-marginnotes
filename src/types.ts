import type { Node } from 'unist';

/**
 * Custom MDAST node representing an inline footnote reference marker.
 * Example: [+note1]
 */
export type MarginnoteReference = {
    type: 'marginnoteReference';
    identifier: string;
    /** The sequential number assigned to this marginnote. */
    number: number;
    /** Which instance of the reference this is (1st, 2nd, etc.). */
    referenceInstance: number;
}

/**
 * Custom MDAST node representing the content of an inline footnote definition.
 * Inserted after the first reference.
 * Example: [+note1]: This is the definition.
 */
export type MarginnoteDefinition = {
    type: 'marginnoteDefinition';
    identifier: string;
    /** The sequential number assigned to this marginnote. */
    number: number;
    /** The MDAST nodes representing the definition content. */
    children: Node[];
}
