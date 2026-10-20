/*
 * table-list across question text lengths, option label lengths and option counts, for
 * select_one and select_multiple, on desktop and phone widths, in both themes.
 *
 * Each case is measured with the fix and without it; the assertions apply to the fixed
 * layout and the unfixed measurements are reported for comparison.
 */
import { loadTheme, unloadTheme, setFix, mount, unmount, measureTable } from '../helpers/layout';
import { tableList, QUESTION_TEXTS, OPTION_SETS } from '../helpers/layout-fixtures';

const THEMES = [ 'theme-smap', 'theme-grid' ];
const WIDTHS = [ 900, 360 ];
const TYPES = { select_one: 'radio', select_multiple: 'checkbox' };
const report = rec => console.log( `LAYOUT|${JSON.stringify( rec )}` );

THEMES.forEach( theme => {
    WIDTHS.forEach( width => {

        describe( `table-list ${theme} ${width}px:`, () => {

            // Narrow forms put the label above the choices
            const placement = width <= 600 ? 'above' : 'beside';

            beforeAll( done => {
                loadTheme( theme ).then( () => done(), done.fail );
            } );

            afterAll( () => {
                setFix( true );
                unloadTheme();
            } );

            Object.entries( TYPES ).forEach( ( [ qType, inputType ] ) => {
                Object.entries( QUESTION_TEXTS ).forEach( ( [ textKey, rows ] ) => {
                    Object.entries( OPTION_SETS ).forEach( ( [ optKey, options ] ) => {

                        it( `${qType}, ${textKey} question text, ${optKey} options`, () => {
                            const c = mount( tableList( { name: '/d/t', type: inputType, options, rows } ), { width } );
                            const on = measureTable( c, { expect: placement } );
                            setFix( false );
                            const off = measureTable( c, { expect: placement } );
                            setFix( true );
                            unmount( c );

                            report( { suite: 'matrix', theme, width, qType, text: textKey, options: optKey, on: on.checks, off: off.checks, metricsOn: on.metrics, metricsOff: off.metrics, heightOn: on.height, heightOff: off.height, rowHeightsOn: on.rowHeights } );

                            Object.entries( on.checks ).forEach( ( [ name, ok ] ) => {
                                expect( ok ).withContext( name ).toBe( true );
                            } );
                        } );
                    } );
                } );
            } );
        } );
    } );
} );
