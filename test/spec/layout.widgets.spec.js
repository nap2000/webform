/*
 * The table-list fix (commit ea7d1940: clear: none on the option wrapper plus a flex row on
 * the question's inner fieldset) must only move table-list rows.  Every other widget that renders a legend before an option wrapper is measured
 * with the fix and without it, and must not move by even half a pixel.
 */
import { loadTheme, unloadTheme, themeHasFix, fixRuleCount, setFix, mount, unmount, snapshot, measureTable } from '../helpers/layout';
import { UNAFFECTED, AFFECTED, COMBINATIONS } from '../helpers/layout-fixtures';

const THEMES = [ 'theme-smap', 'theme-grid' ];
const WIDTHS = [ 900, 360 ];
const report = rec => console.log( `LAYOUT|${JSON.stringify( rec )}` );

THEMES.forEach( theme => {
    WIDTHS.forEach( width => {

        describe( `Layout ${theme} ${width}px:`, () => {

            // Narrow forms put the label above the choices
            const placement = width <= 600 ? 'above' : 'beside';

            beforeAll( done => {
                loadTheme( theme ).then( () => done(), done.fail );
            } );

            afterAll( () => {
                setFix( true );
                unloadTheme();
            } );

            it( 'the theme contains the table-list fix', () => {
                expect( themeHasFix() ).toBe( true );
                expect( fixRuleCount() ).toEqual( 13 );
            } );

            UNAFFECTED.forEach( f => {
                it( `${f.desc} is not moved by the fix`, () => {
                    const c = mount( f.html, { width, widget: f.widget } );
                    const matched = c.querySelectorAll( '.or-appearance-list-nolabel legend + .option-wrapper, .or-appearance-label legend + .option-wrapper, .or-appearance-list-nolabel > fieldset, .or-appearance-label > fieldset' ).length;
                    const withFix = snapshot( c );
                    setFix( false );
                    const without = snapshot( c );
                    setFix( true );
                    unmount( c );

                    const moved = withFix.filter( ( s, i ) => s !== without[ i ] );
                    report( { suite: 'unaffected', theme, width, id: f.id, desc: f.desc, elements: withFix.length, matched, moved: moved.length, sample: moved.slice( 0, 3 ) } );

                    expect( matched ).toEqual( 0 );
                    expect( moved ).toEqual( [] );
                } );
            } );

            AFFECTED.forEach( f => {
                it( `${f.desc} puts the label beside the choices`, () => {
                    const c = mount( f.html, { width, dir: f.dir, touch: f.touch } );
                    const on = measureTable( c, { expect: placement } );
                    setFix( false );
                    const off = measureTable( c, { expect: placement } );
                    setFix( true );
                    unmount( c );

                    report( { suite: 'affected', theme, width, id: f.id, desc: f.desc, on: on.checks, off: off.checks, metricsOn: on.metrics, metricsOff: off.metrics, heightOn: on.height, heightOff: off.height } );

                    // On desktop, without the fix the choices drop below the label - this is the bug.
                    // Not in right to left: the legend floats right there and Bootstrap only clears left.
                    if ( placement === 'beside' && f.dir !== 'rtl' ) {
                        expect( off.beside ).toBe( false );
                    }

                    Object.entries( on.checks ).forEach( ( [ name, ok ] ) => {
                        expect( ok ).withContext( name ).toBe( true );
                    } );
                } );
            } );

            COMBINATIONS.forEach( f => {
                it( `${f.desc} is no worse with the fix`, () => {
                    const c = mount( f.html, { width, widget: f.widget } );
                    const on = measureTable( c, { expect: placement } );
                    setFix( false );
                    const off = measureTable( c, { expect: placement } );
                    setFix( true );
                    unmount( c );

                    const passed = checks => Object.values( checks ).filter( Boolean ).length;
                    report( { suite: 'combination', theme, width, id: f.id, desc: f.desc, on: on.checks, off: off.checks, metricsOn: on.metrics, metricsOff: off.metrics, heightOn: on.height, heightOff: off.height } );

                    expect( passed( on.checks ) ).not.toBeLessThan( passed( off.checks ) );
                } );
            } );
        } );
    } );
} );
