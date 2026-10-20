import Datetimepicker from '../../src/widget/datetime/datetimepicker-extended';
import { runAllCommonWidgetTests } from '../helpers/test-widget';
import { os, browser } from '../../src/js/sniffer';

const FORM =
    `<form class="or">
        <label class="question ">
            <input name="/data/dt" type="datetime-local" data-type-xml="dateTime" value="" />
        </label>
    </form>`;

// Arizona timezone and meridian preference.  The original input reads back without milliseconds:
// browsers store a datetime-local value in its shortest form, so 13:00:00.000 becomes 13:00.
// The widget builds its own value from the date and time boxes, and that keeps them.
runAllCommonWidgetTests( Datetimepicker, FORM, '2012-01-01T13:00:00-07:00', undefined, '2012-01-01T13:00:00.000-07:00' );

describe( 'datetimepicker widget', () => {

    function initForm( form ) {
        const fragment = document.createRange().createContextualFragment( form );
        const control = fragment.querySelector( 'input' );
        return new Datetimepicker( control );
    }

    describe( 'update on Safari for macOS', () => {

        it( 'shows the value in the date and time boxes', () => {
            spyOnProperty( os, 'macos' ).and.returnValue( true );
            spyOnProperty( browser, 'safari' ).and.returnValue( true );
            const datepicker = initForm( FORM );
            const question = datepicker.element.closest( '.question' );

            datepicker.element.value = '2012-01-01T13:05';
            datepicker.update();

            expect( question.querySelector( '.widget .date input' ).value ).toEqual( '2012-01-01' );
            expect( question.querySelector( '.widget .timepicker input' ).value ).toContain( '05' );
        } );

    } );

    describe( 'manual input without Enter', () => {

        it( 'is propagated correctly for datetime fields', () => {
            const datepicker = initForm( FORM );
            const input = datepicker.element;
            const fakeDateInput = datepicker.element.closest( '.question' ).querySelector( '.widget .date input' );
            const fakeTimeInput = datepicker.element.closest( '.question' ).querySelector( '.widget .timepicker input' );

            input.onchange = () => {};
            spyOn( input, 'onchange' );

            // add manual value to fake input
            fakeDateInput.value = '2012-01-01';
            fakeTimeInput.value = '01:01';
            fakeDateInput.dispatchEvent( new Event( 'change' ) );

            // timezone info will be added by engine, and the browser drops the zero seconds
            expect( input.value ).toEqual( '2012-01-01T01:01' );
            expect( input.onchange.calls.count() ).toEqual( 1 );

            // reset value in fake input manually
            fakeDateInput.value = '';
            fakeDateInput.dispatchEvent( new Event( 'change' ) );

            expect( input.value ).toEqual( '' );
            expect( input.onchange.calls.count() ).toEqual( 2 );
        } );

    } );

} );
