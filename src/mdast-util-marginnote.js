/**
 * @import {
 *   CompileContext,
 *   Extension as FromMarkdownExtension,
 *   Handle as FromMarkdownHandle
 * } from 'mdast-util-from-markdown'
 * @import {ToMarkdownOptions} from 'mdast-util-gfm-marginnote'
 * @import {
 *   Handle as ToMarkdownHandle,
 *   Map,
 *   Options as ToMarkdownExtension
 * } from 'mdast-util-to-markdown'
 * @import {MarginnoteDefinition, MarginnoteReference} from 'mdast'
 */

import { ok as assert } from 'devlop'
import { normalizeIdentifier } from 'micromark-util-normalize-identifier'

marginnoteReference.peek = marginnoteReferencePeek

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterMarginnoteCallString() {
    this.buffer()
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterMarginnoteCall(token) {
    this.enter({ type: 'marginnoteReference', identifier: '', label: '' }, token)
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterMarginnoteDefinitionLabelString() {
    this.buffer()
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterMarginnoteDefinition(token) {
    this.enter(
        { type: 'marginnoteDefinition', identifier: '', label: '', children: [] },
        token
    )
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitMarginnoteCallString(token) {
    const label = this.resume()
    const node = this.stack[this.stack.length - 1]
    assert(node.type === 'marginnoteReference')
    node.identifier = normalizeIdentifier(
        this.sliceSerialize(token)
    ).toLowerCase()
    node.label = label
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitMarginnoteCall(token) {
    this.exit(token)
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitMarginnoteDefinitionLabelString(token) {
    const label = this.resume()
    const node = this.stack[this.stack.length - 1]
    assert(node.type === 'marginnoteDefinition')
    node.identifier = normalizeIdentifier(
        this.sliceSerialize(token)
    ).toLowerCase()
    node.label = label
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitMarginnoteDefinition(token) {
    this.exit(token)
}

/** @type {ToMarkdownHandle} */
function marginnoteReferencePeek() {
    return '['
}

/**
 * @type {ToMarkdownHandle}
 * @param {MarginnoteReference} node
 */
function marginnoteReference(node, _, state, info) {
    const tracker = state.createTracker(info)
    let value = tracker.move('[+')
    const exit = state.enter('marginnoteReference')
    const subexit = state.enter('reference')
    value += tracker.move(
        state.safe(state.associationId(node), { after: ']', before: value })
    )
    subexit()
    exit()
    value += tracker.move(']')
    return value
}

/**
 * Create an extension for `mdast-util-from-markdown` to enable GFM marginnotes
 * in markdown.
 *
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown`.
 */
export function gfmMarginnoteFromMarkdown() {
    return {
        enter: {
            gfmMarginnoteCallString: enterMarginnoteCallString,
            gfmMarginnoteCall: enterMarginnoteCall,
            gfmMarginnoteDefinitionLabelString: enterMarginnoteDefinitionLabelString,
            gfmMarginnoteDefinition: enterMarginnoteDefinition
        },
        exit: {
            gfmMarginnoteCallString: exitMarginnoteCallString,
            gfmMarginnoteCall: exitMarginnoteCall,
            gfmMarginnoteDefinitionLabelString: exitMarginnoteDefinitionLabelString,
            gfmMarginnoteDefinition: exitMarginnoteDefinition
        }
    }
}

/**
 * Create an extension for `mdast-util-to-markdown` to enable GFM marginnotes
 * in markdown.
 *
 * @param {ToMarkdownOptions | null | undefined} [options]
 *   Configuration (optional).
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown`.
 */
export function gfmMarginnoteToMarkdown(options) {
    // To do: next major: change default.
    let firstLineBlank = false

    if (options && options.firstLineBlank) {
        firstLineBlank = true
    }

    return {
        handlers: { marginnoteDefinition, marginnoteReference },
        // This is on by default already.
        unsafe: [{ character: '[', inConstruct: ['label', 'phrasing', 'reference'] }]
    }

    /**
     * @type {ToMarkdownHandle}
     * @param {MarginnoteDefinition} node
     */
    function marginnoteDefinition(node, _, state, info) {
        const tracker = state.createTracker(info)
        let value = tracker.move('[+')
        const exit = state.enter('marginnoteDefinition')
        const subexit = state.enter('label')
        value += tracker.move(
            state.safe(state.associationId(node), { before: value, after: ']' })
        )
        subexit()

        value += tracker.move(']:')

        if (node.children && node.children.length > 0) {
            tracker.shift(4)

            value += tracker.move(
                (firstLineBlank ? '\n' : ' ') +
                state.indentLines(
                    state.containerFlow(node, tracker.current()),
                    firstLineBlank ? mapAll : mapExceptFirst
                )
            )
        }

        exit()

        return value
    }
}

/** @type {Map} */
function mapExceptFirst(line, index, blank) {
    return index === 0 ? line : mapAll(line, index, blank)
}

/** @type {Map} */
function mapAll(line, index, blank) {
    return (blank ? '' : '    ') + line
}