import DrawWidget from '../../src/widget/draw/draw-widget';
import support from '../../src/js/support';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM1 =
    `<form class="or">
        <label class="question or-appearance-draw">
            <input name="/data/d" type="file" data-type-xml="binary" accept="image/*" />
        </label>
        <input />
    </form>`;
const FORM2 =
    `<form class="or">
        <label class="question or-appearance-signature">
            <input name="/data/s" type="file" data-type-xml="binary" accept="image/*" />
        </label>
        <input />
    </form>`;
const FORM3 =
    `<form class="or">
        <label class="question or-appearance-annotate">
            <input name="/data/a" type="file" data-type-xml="binary" accept="image/*" />
        </label>
        <input />
    </form>`;

[ FORM1, FORM2, FORM3 ].forEach( form => {
    runAllCommonWidgetTests( DrawWidget, form, '' );
} );

describe( 'draw widget', () => {

    it( 'does not instantiate for non image accept attributes', () => {
        const form = FORM1.replace( 'accept="image/*"', 'accept="something/else"' );
        const fragment = document.createRange().createContextualFragment( form );
        const control = fragment.querySelector( DrawWidget.selector );
        expect( control ).toEqual( null );
    } );

} );

describe( 'annotate widget image capture', () => {
    let touch;

    beforeEach( () => {
        touch = support.touch;
        support.touch = true;
    } );

    afterEach( () => {
        support.touch = touch;
    } );

    /**
     * @param {string} [appearance] - appearance of the question, defaults to annotate
     * @return {DrawWidget} the widget instance
     */
    const initWidget = ( appearance = 'annotate' ) => {
        const fragment = document.createRange().createContextualFragment(
            FORM3.replace( 'or-appearance-annotate', `or-appearance-annotate or-appearance-${appearance}` ) );

        return new DrawWidget( fragment.querySelector( DrawWidget.selector ) );
    };

    it( 'captures the image with buttons, above the canvas', () => {
        const widget = initWidget();
        const drawWidget = widget.question.querySelector( '.draw-widget' );
        const filePicker = drawWidget.querySelector( '.file-picker' );

        expect( filePicker.classList.contains( 'with-capture' ) ).toBe( true );
        expect( drawWidget.classList.contains( 'with-capture' ) ).toBe( true );
        expect( filePicker.querySelector( '.btn-capture .fa-camera' ) ).not.toBeNull();
        expect( filePicker.querySelector( '.btn-browse' ) ).not.toBeNull();
        // above the canvas, not in the 50px strip the file field lives in
        expect( filePicker.parentElement ).toBe( drawWidget );
        expect( filePicker.compareDocumentPosition( drawWidget.querySelector( '.draw-widget__body' ) ) &
            Node.DOCUMENT_POSITION_FOLLOWING ).toBeTruthy();
    } );

    it( 'requests the camera when the capture button is clicked', async() => {
        const widget = initWidget();
        const question = widget.question;
        const input = question.querySelector( 'input[type=file]' );
        const clicks = [];

        input.addEventListener( 'click', event => {
            clicks.push( input.getAttribute( 'capture' ) );
            event.preventDefault();
        } );

        // the buttons are enabled once the filemanager is ready
        await widget.initialize;
        await new Promise( resolve => setTimeout( resolve, 0 ) );

        question.querySelector( '.btn-capture' ).click();

        expect( clicks ).toEqual( [ 'environment' ] );
    } );

    it( 'does not offer existing images when the appearance forces a new one', () => {
        [ 'new', 'new-front', 'new-rear' ].forEach( appearance => {
            const question = initWidget( appearance ).question;

            expect( question.querySelector( '.btn-capture' ) ).not.toBeNull();
            expect( question.querySelector( '.btn-browse' ) ).toBeNull();
            expect( question.querySelector( 'input[type=file]' ).getAttribute( 'capture' ) )
                .toEqual( appearance === 'new-front' ? 'user' : 'environment' );
        } );
    } );

    it( 'opens the front camera for appearance "selfie", but still offers existing images', () => {
        const widget = initWidget( 'selfie' );
        const question = widget.question;

        expect( widget.props.captureFacing ).toEqual( 'user' );
        expect( question.querySelector( 'input[type=file]' ).hasAttribute( 'capture' ) ).toBe( false );
        expect( question.querySelector( '.btn-browse' ) ).not.toBeNull();
    } );

    it( 'hides the capture buttons once there is an image', () => {
        const widget = initWidget();
        const filePicker = widget.question.querySelector( '.file-picker' );

        widget._showFileName( 'annotation.png' );
        expect( filePicker.classList.contains( 'has-file' ) ).toBe( true );
        widget._showFileName( null );
        expect( filePicker.classList.contains( 'has-file' ) ).toBe( false );
    } );

    it( 'keeps the file field layout on a desktop browser', () => {
        support.touch = false;
        const drawWidget = initWidget().question.querySelector( '.draw-widget' );

        expect( drawWidget.querySelector( '.btn-capture' ) ).toBeNull();
        expect( drawWidget.querySelector( '.file-picker' ).parentElement.classList.contains( 'draw-widget__body' ) ).toBe( true );
    } );

} );
