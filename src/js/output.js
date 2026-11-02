/**
 * @module output
 */

import $ from 'jquery';
import DOMPurify from 'dompurify';

/**
 * Outputs can hold markup (smap), but their values can come from answers in a loaded record,
 * so strip anything that can run script, and form controls that could fake an input
 */
const OUTPUT_PURIFY = {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [ 'style', 'form', 'input', 'button', 'textarea', 'select' ]
};

/**
 * Every output is updated whenever a value it may depend on changes, so the same values come back
 * again and again.  Sanitised values are kept, and the value each output shows, so that it is only
 * written when it changes.
 */
const purified = new Map();
const PURIFIED_MAX = 1000;
const shown = new WeakMap();

/**
 * @param {string} val - The output's value
 * @return {string} The value with anything that can run script removed
 */
function safeHtml( val ) {
    // Without a < there are no elements, entities such as &lt; only become text
    if ( val.indexOf( '<' ) === -1 ) {
        return val;
    }
    let safe = purified.get( val );
    if ( safe === undefined ) {
        safe = DOMPurify.sanitize( val, OUTPUT_PURIFY );
        if ( purified.size >= PURIFIED_MAX ) {
            purified.clear();
        }
        purified.set( val, safe );
    }

    return safe;
}

export default {
    /**
     * Updates output values, optionally filtered by those values that contain a changed node name
     *
     * @param {UpdatedDataNodes} [updated] - The object containing info on updated data nodes.
     */
    update( updated ) {
        const outputCache = {};
        let val = '';
        const that = this;

        if ( !this.form ) {
            throw new Error( 'Output module not correctly instantiated with form property.' );
        }

        const $nodes = this.form.getRelatedNodes( 'data-value', '.or-output', updated );

        const clonedRepeatsPresent = this.form.repeatsPresent && this.form.view.html.querySelector( '.or-repeat.clone' );

        $nodes.each( function() {
            const $output = $( this );
            const output = this;

            // nodes are in document order, so we discard any nodes in questions/groups that have a disabled parent
            if ( $output.closest( '.or-branch' ).parent().closest( '.disabled' ).length ) {
                return;
            }

            const expr = output.dataset.value;
            /*
             * Note that in XForms input is the parent of label and in HTML the other way around so an output inside a label
             * should look at the HTML input to determine the context.
             * So, context is either the input name attribute (if output is inside input label),
             * or the parent with a name attribute
             * or the whole document
             */
            let context = output.closest( '.question, .or-group' );


            if ( !context.matches( '.or-group' ) ) {
                context = context.querySelector( '[name]' );
            }

            let contextPath = that.form.input.getName( context );

            /*
             * If the output is part of a group label and that group contains repeats with the same name,
             * but currently has 0 repeats, the context will not be available. See issue 502.
             * This same logic is applied in branch.js.
             */
            if ( $( context ).children( `.or-repeat-info[data-name="${contextPath}"]` ).length && !$( context ).children( `.or-repeat[name="${contextPath}"]` ).length ) {
                contextPath = null;
            }

            const insideRepeat = ( clonedRepeatsPresent && $output.parentsUntil( '.or', '.or-repeat' ).length > 0 );
            const insideRepeatClone = ( insideRepeat && $output.parentsUntil( '.or', '.or-repeat.clone' ).length > 0 );
            const index = ( insideRepeatClone && contextPath ) ? that.form.input.getIndex( context ) : 0;

            if ( typeof outputCache[ expr ] !== 'undefined' ) {
                val = outputCache[ expr ];
            } else {
                val = that.form.model.evaluate( expr, 'string', contextPath, index, true );
                if ( !insideRepeat ) {
                    outputCache[ expr ] = val;
                }
            }
            val = String( val );
            if ( shown.get( output ) !== val ) {
                shown.set( output, val );
                $output.html( safeHtml( val ) );     // smap text to html
            }
        } );
    }
};
