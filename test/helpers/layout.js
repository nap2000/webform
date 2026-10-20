/**
 * Real-browser layout checks for the theme CSS.
 *
 * Loads Bootstrap and a theme into the test page, mounts form markup at a fixed width,
 * and measures where things land.  The table-list fix (clear: none on the option wrapper,
 * the flex row on the question's inner fieldset, and the narrow, touch and wrapping rules
 * that follow it) can be switched off and back on through the CSSOM, so a spec can measure
 * the same markup with and without it against the very stylesheet that ships.
 */

import ColumnsWidget from '../../src/widget/columns/columns';

const CSS_BASE = '/base/build/css/';
const FIX_SELECTOR = /or-appearance-(list-nolabel|label) (legend \+ \.option-wrapper|> fieldset)/;
const isFixRule = rule => ( !!rule.selectorText && ( FIX_SELECTOR.test( rule.selectorText ) || ( rule.style && rule.style.containerName === 'tablelist' ) ) ) ||
    ( rule.constructor.name === 'CSSContainerRule' && rule.containerName === 'tablelist' ) ||
    ( rule instanceof CSSSupportsRule && rule.conditionText.includes( 'container-type' ) );

let links = [];

/**
 * @param {string} theme - e.g. 'theme-smap'
 * @return {Promise<void>} resolves once both sheets have loaded
 */
export function loadTheme( theme ) {
    unloadTheme();

    return Promise.all( [ 'bootstrap.min.css', `${theme}.css` ].map( file => new Promise( ( resolve, reject ) => {
        const link = document.createElement( 'link' );
        link.rel = 'stylesheet';
        link.href = CSS_BASE + file;
        link.onload = resolve;
        link.onerror = () => reject( new Error( `Could not load ${file}` ) );
        document.head.appendChild( link );
        links.push( link );
    } ) ) )
        // fonts.ready does not wait for faces nothing has used yet, so load them all now, or
        // the first measurements are taken in a fallback font
        .then( () => Promise.all( [ ...document.fonts ].map( f => f.load().catch( () => null ) ) ) );
}

export function unloadTheme() {
    links.forEach( l => l.remove() );
    links = [];
}

function themeSheet() {
    const link = links[ 1 ];

    return [ ...document.styleSheets ].find( s => s.ownerNode === link );
}

let removed = [];

/**
 * @return {boolean} whether the loaded theme contains the fix
 */
export function themeHasFix() {
    const sheet = themeSheet();

    return !!sheet && [ ...sheet.cssRules ].some( isFixRule );
}

/**
 * Remove or restore the fix rules in the loaded theme
 *
 * @param {boolean} on - true to restore
 */
export function setFix( on ) {
    const sheet = themeSheet();
    if ( !on && !removed.length ) {
        [ ...sheet.cssRules ].forEach( ( rule, idx ) => {
            if ( isFixRule( rule ) ) {
                removed.push( { idx, text: rule.cssText } );
            }
        } );
        if ( !removed.length ) {
            throw new Error( 'Fix rules not found in theme' );
        }
        // Highest index first so the earlier indexes stay valid
        [ ...removed ].reverse().forEach( r => sheet.deleteRule( r.idx ) );
    } else if ( on && removed.length ) {
        removed.forEach( r => sheet.insertRule( r.text, r.idx ) );
        removed = [];
    }
}

/**
 * @return {number} how many fix rules the loaded theme has
 */
export function fixRuleCount() {
    const sheet = themeSheet();

    return sheet ? [ ...sheet.cssRules ].filter( isFixRule ).length : 0;
}

/**
 * @param {string} html - form markup
 * @param {object} [opts] - options
 * @param {number} [opts.width] - container width in px
 * @param {string} [opts.dir] - 'rtl' for right to left
 * @param {boolean} [opts.touch] - put the touch class on the document, as support.js does on mobile
 * @param {string} [opts.widget] - 'columns' to instantiate ColumnsWidget on matching questions
 * @return {HTMLElement} the container, remove with unmount()
 */
export function mount( html, { width = 900, dir = 'ltr', touch = false, widget } = {} ) {
    const container = document.createElement( 'div' );
    container.className = 'layout-test-container';
    container.style.cssText = `width:${width}px;position:absolute;left:0;top:0;background:#fff;`;
    container.innerHTML = `<form class="or clearfix" dir="${dir}" autocomplete="off" novalidate="novalidate">${html}</form>`;
    document.body.appendChild( container );
    document.documentElement.classList.toggle( 'touch', touch );

    if ( widget === 'columns' ) {
        container.querySelectorAll( ColumnsWidget.selector ).forEach( el => new ColumnsWidget( el ) );
    }

    return container;
}

export function unmount( container ) {
    container.remove();
    document.documentElement.classList.remove( 'touch' );
}

const r = n => Math.round( n * 2 ) / 2;

/**
 * Position and size of every element in the container, relative to it
 *
 * @param {HTMLElement} container - mounted container
 * @return {Array<string>} one entry per element
 */
export function snapshot( container ) {
    const c = container.getBoundingClientRect();

    return [ ...container.querySelectorAll( '*' ) ].map( ( el, i ) => {
        const b = el.getBoundingClientRect();

        return `${i}:${el.tagName.toLowerCase()}.${el.className}@${r( b.left - c.left )},${r( b.top - c.top )} ${r( b.width )}x${r( b.height )}`;
    } );
}

function rect( el, origin ) {
    const b = el.getBoundingClientRect();

    return { left: b.left - origin.left, top: b.top - origin.top, right: b.right - origin.left, bottom: b.bottom - origin.top, width: b.width, height: b.height };
}

const visible = el => el.getClientRects().length > 0 && getComputedStyle( el ).visibility !== 'hidden';
const optionLabelsOf = wrapper => [ ...wrapper.children ].filter( el => el.tagName === 'LABEL' && !el.classList.contains( 'itemset-template' ) && visible( el ) );

/**
 * Width of the widest word in an element's text, in the element's own font
 *
 * @param {Element} el - element holding the text
 * @return {number} px
 */
function widestWord( el ) {
    const probe = document.createElement( 'span' );
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;';
    el.appendChild( probe );
    const widest = Math.max( 0, ...el.firstChild.textContent.split( /\s+/ ).filter( Boolean ).map( w => {
        probe.textContent = w;

        return probe.getBoundingClientRect().width;
    } ) );
    probe.remove();

    return widest;
}

/**
 * Measure a table-list group: the header, and for each row the label and its choices
 *
 * @param {HTMLElement} container - mounted container
 * @param {object} [opts] - options
 * @param {'beside'|'above'} [opts.expect] - where the label should be: beside the choices, or above them on narrow screens
 * @return {object} measurements and the checks derived from them
 */
export function measureTable( container, { expect = 'beside' } = {} ) {
    const origin = container.getBoundingClientRect();
    const ltr = getComputedStyle( container.querySelector( 'form' ) ).direction !== 'rtl';
    const header = container.querySelector( '.question.or-appearance-label' );
    const headerCells = optionLabelsOf( header.querySelector( '.option-wrapper' ) ).map( l => rect( l, origin ) );
    const headerWrapper = rect( header.querySelector( '.option-wrapper' ), origin );

    const rows = [ ...container.querySelectorAll( '.question.or-appearance-list-nolabel' ) ].map( q => {
        const legend = rect( q.querySelector( 'legend' ), origin );
        const label = q.querySelector( '.question-label' );
        const wrapperEl = q.querySelector( '.option-wrapper' );
        const choices = optionLabelsOf( wrapperEl ).map( l => {
            const input = l.querySelector( 'input' );

            return rect( input && input.getBoundingClientRect().width > 0 ? input : l, origin );
        } );

        return {
            legend,
            label: label ? rect( label, origin ) : legend,
            wrapper: rect( wrapperEl, origin ),
            choices,
            bottom: Math.max( legend.bottom, ...choices.map( c => c.bottom ) ),
            top: Math.min( legend.top, ...choices.map( c => c.top ) )
        };
    } );

    const tol = 1.5;
    const centre = b => ( b.left + b.right ) / 2;
    const width = container.getBoundingClientRect().width;

    // Every choice starts on the label's line, on the far side of it from the reading start
    const beside = rows.every( row => row.choices.every( c => c.top < row.label.bottom && ( ltr ? c.left >= row.label.right - tol : c.right <= row.label.left + tol ) ) );
    // Every choice is below the label, and the label and the choices each have the whole width
    const above = rows.every( row => row.choices.every( c => c.top >= row.label.bottom - tol ) && row.wrapper.width >= width * 0.9 && row.legend.width >= width * 0.9 );
    const headingLabels = [ ...header.querySelectorAll( '.option-wrapper > label:not(.itemset-template) > .option-label' ) ].filter( visible );

    const checks = {
        // The label is where it should be for this width
        placement: expect === 'beside' ? beside : above,
        // Each choice sits under its column heading
        alignedWithHeader: rows.every( row => row.choices.length === headerCells.length &&
            row.choices.every( ( c, i ) => Math.abs( centre( c ) - centre( headerCells[ i ] ) ) <= 2 ) ),
        // Header row lines up with the choice columns, not with the labels
        headerOverChoices: rows.every( row => Math.abs( row.wrapper.left - headerWrapper.left ) <= tol && Math.abs( row.wrapper.right - headerWrapper.right ) <= tol ),
        // Nothing spills out of the form
        noOverflow: headerWrapper.right <= width + tol && rows.every( row => row.wrapper.right <= width + tol && row.label.right <= width + tol &&
            row.choices.every( c => c.right <= width + tol && c.left >= -tol ) ),
        // Rows do not run into each other
        rowsSeparate: rows.every( ( row, i ) => i === 0 || row.top >= rows[ i - 1 ].bottom - tol ),
        // Column headings break between words, never inside one
        headingWordsWhole: headingLabels.every( l => l.getBoundingClientRect().width >= widestWord( l ) - tol ),
        // Column headings do not overlap each other
        headerCellsSeparate: headerCells.every( ( h, i ) => i === 0 || ( ltr ? h.left >= headerCells[ i - 1 ].right - tol : h.right <= headerCells[ i - 1 ].left + tol ) )
    };

    const rowHeights = rows.map( row => Math.round( row.bottom - row.top ) );
    const rightmost = Math.max( headerWrapper.right, ...headerCells.map( h => h.right ), ...rows.map( row => Math.max( row.wrapper.right, ...row.choices.map( c => c.right ) ) ) );
    const metrics = {
        overflowPx: Math.max( 0, Math.round( rightmost - width ) ),
        maxAlignErrorPx: Math.round( Math.max( 0, ...rows.map( row => Math.max( 0, ...row.choices.map( ( c, i ) => headerCells[ i ] ? Math.abs( centre( c ) - centre( headerCells[ i ] ) ) : 0 ) ) ) ) * 10 ) / 10
    };

    return { rows, headerCells, headerWrapper, checks, metrics, beside, above, height: Math.round( rows.length ? rows[ rows.length - 1 ].bottom - headerWrapper.top : 0 ), rowHeights };
}
