/**
 * @import {Event, Exiter, Extension, Resolver, State, Token, TokenizeContext, Tokenizer} from 'micromark-util-types'
 */

import { ok as assert } from 'devlop'
import { blankLine } from 'micromark-core-commonmark'
import { factorySpace } from 'micromark-factory-space'
import { markdownLineEndingOrSpace } from 'micromark-util-character'
import { normalizeIdentifier } from 'micromark-util-normalize-identifier'
import { codes, constants, types } from 'micromark-util-symbol'

const indent = { tokenize: tokenizeIndent, partial: true }

// To do: micromark should support a `_hiddenGfmMarginnoteSupport`, which only
// affects label start (image).
// That will let us drop `tokenizePotentialGfmMarginnote*`.
// It currently has a `_hiddenMarginnoteSupport`, which affects that and more.
// That can be removed when `micromark-extension-marginnote` is archived.

/**
 * Create an extension for `micromark` to enable GFM marginnote syntax.
 *
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions` to
 *   enable GFM marginnote syntax.
 */
export function gfmMarginnote() {
    /** @type {Extension} */
    return {
        document: {
            [codes.leftSquareBracket]: {
                name: 'gfmMarginnoteDefinition',
                tokenize: tokenizeDefinitionStart,
                continuation: { tokenize: tokenizeDefinitionContinuation },
                exit: gfmMarginnoteDefinitionEnd
            }
        },
        text: {
            [codes.leftSquareBracket]: {
                name: 'gfmMarginnoteCall',
                tokenize: tokenizeGfmMarginnoteCall
            },
            [codes.rightSquareBracket]: {
                name: 'gfmPotentialMarginnoteCall',
                add: 'after',
                tokenize: tokenizePotentialGfmMarginnoteCall,
                resolveTo: resolveToPotentialGfmMarginnoteCall
            }
        }
    }
}

// To do: remove after micromark update.
/**
 * @this {TokenizeContext}
 * @type {Tokenizer}
 */
function tokenizePotentialGfmMarginnoteCall(effects, ok, nok) {
    const self = this
    let index = self.events.length
    const defined = self.parser.gfmMarginnotes || (self.parser.gfmMarginnotes = [])
    /** @type {Token} */
    let labelStart

    // Find an opening.
    while (index--) {
        const token = self.events[index][1]

        if (token.type === types.labelImage) {
            labelStart = token
            break
        }

        // Exit if we’ve walked far enough.
        if (
            token.type === 'gfmMarginnoteCall' ||
            token.type === types.labelLink ||
            token.type === types.label ||
            token.type === types.image ||
            token.type === types.link
        ) {
            break
        }
    }

    return start

    /**
     * @type {State}
     */
    function start(code) {
        assert(code === codes.rightSquareBracket, 'expected `]`')

        if (!labelStart || !labelStart._balanced) {
            return nok(code)
        }

        const id = normalizeIdentifier(
            self.sliceSerialize({ start: labelStart.end, end: self.now() })
        )

        if (id.codePointAt(0) !== codes.plusSign || !defined.includes(id.slice(1))) {
            return nok(code)
        }

        effects.enter('gfmMarginnoteCallLabelMarker')
        effects.consume(code)
        effects.exit('gfmMarginnoteCallLabelMarker')
        return ok(code)
    }
}

// To do: remove after micromark update.
/** @type {Resolver} */
function resolveToPotentialGfmMarginnoteCall(events, context) {
    let index = events.length
    /** @type {Token | undefined} */
    let labelStart

    // Find an opening.
    while (index--) {
        if (
            events[index][1].type === types.labelImage &&
            events[index][0] === 'enter'
        ) {
            labelStart = events[index][1]
            break
        }
    }

    assert(labelStart, 'expected `labelStart` to resolve')

    // Change the `labelImageMarker` to a `data`.
    events[index + 1][1].type = types.data
    events[index + 3][1].type = 'gfmMarginnoteCallLabelMarker'

    // The whole (without `!`):
    /** @type {Token} */
    const call = {
        type: 'gfmMarginnoteCall',
        start: Object.assign({}, events[index + 3][1].start),
        end: Object.assign({}, events[events.length - 1][1].end)
    }
    // The `^` marker
    /** @type {Token} */
    const marker = {
        type: 'gfmMarginnoteCallMarker',
        start: Object.assign({}, events[index + 3][1].end),
        end: Object.assign({}, events[index + 3][1].end)
    }
    // Increment the end 1 character.
    marker.end.column++
    marker.end.offset++
    marker.end._bufferIndex++
    /** @type {Token} */
    const string = {
        type: 'gfmMarginnoteCallString',
        start: Object.assign({}, marker.end),
        end: Object.assign({}, events[events.length - 1][1].start)
    }
    /** @type {Token} */
    const chunk = {
        type: types.chunkString,
        contentType: 'string',
        start: Object.assign({}, string.start),
        end: Object.assign({}, string.end)
    }

    /** @type {Array<Event>} */
    const replacement = [
        // Take the `labelImageMarker` (now `data`, the `!`)
        events[index + 1],
        events[index + 2],
        ['enter', call, context],
        // The `[`
        events[index + 3],
        events[index + 4],
        // The `^`.
        ['enter', marker, context],
        ['exit', marker, context],
        // Everything in between.
        ['enter', string, context],
        ['enter', chunk, context],
        ['exit', chunk, context],
        ['exit', string, context],
        // The ending (`]`, properly parsed and labelled).
        events[events.length - 2],
        events[events.length - 1],
        ['exit', call, context]
    ]

    events.splice(index, events.length - index + 1, ...replacement)

    return events
}

/**
 * @this {TokenizeContext}
 * @type {Tokenizer}
 */
function tokenizeGfmMarginnoteCall(effects, ok, nok) {
    const self = this
    const defined = self.parser.gfmMarginnotes || (self.parser.gfmMarginnotes = [])
    let size = 0
    /** @type {boolean} */
    let data

    // Note: the implementation of `markdown-rs` is different, because it houses
    // core *and* extensions in one project.
    // Therefore, it can include marginnote logic inside `label-end`.
    // We can’t do that, but luckily, we can parse marginnotes in a simpler way than
    // needed for labels.
    return start

    /**
     * Start of marginnote label.
     *
     * ```markdown
     * > | a [^b] c
     *       ^
     * ```
     *
     * @type {State}
     */
    function start(code) {
        assert(code === codes.leftSquareBracket, 'expected `[`')
        effects.enter('gfmMarginnoteCall')
        effects.enter('gfmMarginnoteCallLabelMarker')
        effects.consume(code)
        effects.exit('gfmMarginnoteCallLabelMarker')
        return callStart
    }

    /**
     * After `[`, at `^`.
     *
     * ```markdown
     * > | a [^b] c
     *        ^
     * ```
     *
     * @type {State}
     */
    function callStart(code) {
        if (code !== codes.plusSign) return nok(code)

        effects.enter('gfmMarginnoteCallMarker')
        effects.consume(code)
        effects.exit('gfmMarginnoteCallMarker')
        effects.enter('gfmMarginnoteCallString')
        effects.enter('chunkString').contentType = 'string'
        return callData
    }

    /**
     * In label.
     *
     * ```markdown
     * > | a [^b] c
     *         ^
     * ```
     *
     * @type {State}
     */
    function callData(code) {
        if (
            // Too long.
            size > constants.linkReferenceSizeMax ||
            // Closing brace with nothing.
            (code === codes.rightSquareBracket && !data) ||
            // Space or tab is not supported by GFM for some reason.
            // `\n` and `[` not being supported makes sense.
            code === codes.eof ||
            code === codes.leftSquareBracket ||
            markdownLineEndingOrSpace(code)
        ) {
            return nok(code)
        }

        if (code === codes.rightSquareBracket) {
            effects.exit('chunkString')
            const token = effects.exit('gfmMarginnoteCallString')

            if (!defined.includes(normalizeIdentifier(self.sliceSerialize(token)))) {
                return nok(code)
            }

            effects.enter('gfmMarginnoteCallLabelMarker')
            effects.consume(code)
            effects.exit('gfmMarginnoteCallLabelMarker')
            effects.exit('gfmMarginnoteCall')
            return ok
        }

        if (!markdownLineEndingOrSpace(code)) {
            data = true
        }

        size++
        effects.consume(code)
        return code === codes.backslash ? callEscape : callData
    }

    /**
     * On character after escape.
     *
     * ```markdown
     * > | a [^b\c] d
     *           ^
     * ```
     *
     * @type {State}
     */
    function callEscape(code) {
        if (
            code === codes.leftSquareBracket ||
            code === codes.backslash ||
            code === codes.rightSquareBracket
        ) {
            effects.consume(code)
            size++
            return callData
        }

        return callData(code)
    }
}

/**
 * @this {TokenizeContext}
 * @type {Tokenizer}
 */
function tokenizeDefinitionStart(effects, ok, nok) {
    const self = this
    const defined = self.parser.gfmMarginnotes || (self.parser.gfmMarginnotes = [])
    /** @type {string} */
    let identifier
    let size = 0
    /** @type {boolean | undefined} */
    let data

    return start

    /**
     * Start of GFM marginnote definition.
     *
     * ```markdown
     * > | [^a]: b
     *     ^
     * ```
     *
     * @type {State}
     */
    function start(code) {
        assert(code === codes.leftSquareBracket, 'expected `[`')
        effects.enter('gfmMarginnoteDefinition')._container = true
        effects.enter('gfmMarginnoteDefinitionLabel')
        effects.enter('gfmMarginnoteDefinitionLabelMarker')
        effects.consume(code)
        effects.exit('gfmMarginnoteDefinitionLabelMarker')
        return labelAtMarker
    }

    /**
     * In label, at plusSign.
     *
     * ```markdown
     * > | [^a]: b
     *      ^
     * ```
     *
     * @type {State}
     */
    function labelAtMarker(code) {
        if (code === codes.plusSign) {
            effects.enter('gfmMarginnoteDefinitionMarker')
            effects.consume(code)
            effects.exit('gfmMarginnoteDefinitionMarker')
            effects.enter('gfmMarginnoteDefinitionLabelString')
            effects.enter('chunkString').contentType = 'string'
            return labelInside
        }

        return nok(code)
    }

    /**
     * In label.
     *
     * > 👉 **Note**: `cmark-gfm` prevents whitespace from occurring in marginnote
     * > definition labels.
     *
     * ```markdown
     * > | [^a]: b
     *       ^
     * ```
     *
     * @type {State}
     */
    function labelInside(code) {
        if (
            // Too long.
            size > constants.linkReferenceSizeMax ||
            // Closing brace with nothing.
            (code === codes.rightSquareBracket && !data) ||
            // Space or tab is not supported by GFM for some reason.
            // `\n` and `[` not being supported makes sense.
            code === codes.eof ||
            code === codes.leftSquareBracket ||
            markdownLineEndingOrSpace(code)
        ) {
            return nok(code)
        }

        if (code === codes.rightSquareBracket) {
            effects.exit('chunkString')
            const token = effects.exit('gfmMarginnoteDefinitionLabelString')
            identifier = normalizeIdentifier(self.sliceSerialize(token))
            effects.enter('gfmMarginnoteDefinitionLabelMarker')
            effects.consume(code)
            effects.exit('gfmMarginnoteDefinitionLabelMarker')
            effects.exit('gfmMarginnoteDefinitionLabel')
            return labelAfter
        }

        if (!markdownLineEndingOrSpace(code)) {
            data = true
        }

        size++
        effects.consume(code)
        return code === codes.backslash ? labelEscape : labelInside
    }

    /**
     * After `\`, at a special character.
     *
     * > 👉 **Note**: `cmark-gfm` currently does not support escaped brackets:
     * > <https://github.com/github/cmark-gfm/issues/240>
     *
     * ```markdown
     * > | [^a\*b]: c
     *         ^
     * ```
     *
     * @type {State}
     */
    function labelEscape(code) {
        if (
            code === codes.leftSquareBracket ||
            code === codes.backslash ||
            code === codes.rightSquareBracket
        ) {
            effects.consume(code)
            size++
            return labelInside
        }

        return labelInside(code)
    }

    /**
     * After definition label.
     *
     * ```markdown
     * > | [^a]: b
     *         ^
     * ```
     *
     * @type {State}
     */
    function labelAfter(code) {
        if (code === codes.colon) {
            effects.enter('definitionMarker')
            effects.consume(code)
            effects.exit('definitionMarker')

            if (!defined.includes(identifier)) {
                defined.push(identifier)
            }

            // Any whitespace after the marker is eaten, forming indented code
            // is not possible.
            // No space is also fine, just like a block quote marker.
            return factorySpace(
                effects,
                whitespaceAfter,
                'gfmMarginnoteDefinitionWhitespace'
            )
        }

        return nok(code)
    }

    /**
     * After definition prefix.
     *
     * ```markdown
     * > | [^a]: b
     *           ^
     * ```
     *
     * @type {State}
     */
    function whitespaceAfter(code) {
        // `markdown-rs` has a wrapping token for the prefix that is closed here.
        return ok(code)
    }
}

/**
 * @this {TokenizeContext}
 * @type {Tokenizer}
 */
function tokenizeDefinitionContinuation(effects, ok, nok) {
    /// Start of marginnote definition continuation.
    ///
    /// ```markdown
    ///   | [^a]: b
    /// > |     c
    ///     ^
    /// ```
    //
    // Either a blank line, which is okay, or an indented thing.
    return effects.check(blankLine, ok, effects.attempt(indent, ok, nok))
}

/** @type {Exiter} */
function gfmMarginnoteDefinitionEnd(effects) {
    effects.exit('gfmMarginnoteDefinition')
}

/**
 * @this {TokenizeContext}
 * @type {Tokenizer}
 */
function tokenizeIndent(effects, ok, nok) {
    const self = this

    return factorySpace(
        effects,
        afterPrefix,
        'gfmMarginnoteDefinitionIndent',
        constants.tabSize + 1
    )

    /**
     * @type {State}
     */
    function afterPrefix(code) {
        const tail = self.events[self.events.length - 1]
        return tail &&
            tail[1].type === 'gfmMarginnoteDefinitionIndent' &&
            tail[2].sliceSerialize(tail[1], true).length === constants.tabSize
            ? ok(code)
            : nok(code)
    }
}